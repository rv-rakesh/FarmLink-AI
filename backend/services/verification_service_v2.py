"""
Full multi-step verification service for FarmLink AI.

Verification levels:
  0 - Registered (account created)
  1 - Mobile Verified (OTP confirmed)
  2 - Identity Verified (KYC sandbox)
  3 - Role Verified (agricultural/business evidence submitted & valid)
  4 - Fully Verified (all checks passed, no critical risk flags)

Verification statuses:
  PENDING, SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED, SUSPENDED
"""
import random
import re
import string
from datetime import datetime, timedelta, timezone

from config import Config
from database import get_db

# ── In-memory OTP store (replace with Redis/DB in production) ─────────────────
_otp_store: dict[str, dict] = {}

# ── Regex patterns ─────────────────────────────────────────────────────────────
GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
UDYAM_RE = re.compile(r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$", re.IGNORECASE)
PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

# Farmer registration reference pattern (e.g. PM-KISAN, State Agri Dept)
FARMER_REG_RE = re.compile(r"^[A-Z0-9]{6,20}$", re.IGNORECASE)


# ─────────────────────────────────────────────────────────────────────────────
# OTP
# ─────────────────────────────────────────────────────────────────────────────

def generate_otp(phone: str) -> dict:
    """
    Generate a 6-digit OTP for the given phone number.
    Returns session_id and (for sandbox) the OTP code itself.
    In production, send via MSG91/Twilio instead of returning the code.
    """
    otp = "".join(random.choices(string.digits, k=6))
    session_id = "OTP-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=12))
    expiry = datetime.now(timezone.utc) + timedelta(minutes=Config.OTP_EXPIRY_MINUTES)
    _otp_store[session_id] = {
        "phone": phone,
        "otp": otp,
        "expiry": expiry,
        "verified": False,
        "attempts": 0,
    }
    return {
        "session_id": session_id,
        "expires_in_minutes": Config.OTP_EXPIRY_MINUTES,
        "sandbox_otp": otp,  # Remove in production — send via SMS provider instead
        "message": f"OTP sent to +91-{'*' * 6}{phone[-4:]} (sandbox: check sandbox_otp field)",
    }


def verify_otp(session_id: str, otp: str) -> dict:
    """Verify an OTP. Returns ok=True and updates the verification doc."""
    session = _otp_store.get(session_id)
    if not session:
        return {"ok": False, "error": "Invalid or expired OTP session"}
    if session["verified"]:
        return {"ok": False, "error": "OTP already used"}
    if datetime.now(timezone.utc) > session["expiry"]:
        del _otp_store[session_id]
        return {"ok": False, "error": "OTP expired — please request a new one"}
    session["attempts"] += 1
    if session["attempts"] > 5:
        del _otp_store[session_id]
        return {"ok": False, "error": "Too many failed attempts — please request a new OTP"}
    if session["otp"] != str(otp).strip():
        return {"ok": False, "error": f"Incorrect OTP ({5 - session['attempts']} attempts remaining)"}
    session["verified"] = True
    return {"ok": True, "phone": session["phone"]}


# ─────────────────────────────────────────────────────────────────────────────
# Identity verification (KYC sandbox)
# ─────────────────────────────────────────────────────────────────────────────

def simulate_identity_verification(name: str, id_reference: str) -> dict:
    """
    Sandbox KYC identity verification.
    In production: call DigiLocker / Aadhaar eKYC / CKYC APIs.
    Stores only identity_verified flag + masked reference — never raw documents.
    """
    ref = (id_reference or "").strip().upper()
    if not ref or len(ref) < 8:
        return {
            "result": "FAILED",
            "identity_verified": False,
            "message": "Invalid identity reference — must be at least 8 characters",
        }
    # Sandbox: PAN-format → always SUCCESS; others → MANUAL_REVIEW
    if PAN_RE.match(ref):
        result = "SUCCESS"
        verified = True
        msg = "Identity verified via PAN (sandbox)"
    elif ref.startswith("TEST"):
        result = "MANUAL_REVIEW"
        verified = False
        msg = "Identity requires manual review"
    else:
        result = "SUCCESS"
        verified = True
        msg = "Identity verified (sandbox)"

    masked_ref = ref[:3] + "*" * (len(ref) - 6) + ref[-3:] if len(ref) > 6 else "***"
    return {
        "result": result,
        "identity_verified": verified,
        "identity_provider": "kyc_sandbox",
        "identity_reference": masked_ref,
        "identity_verified_at": datetime.now(timezone.utc).isoformat() if verified else None,
        "message": msg,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Agricultural evidence verification (Farmer)
# ─────────────────────────────────────────────────────────────────────────────

AGRI_EVIDENCE_TYPES = {
    "farmer_registration": "Farmer Registration Certificate",
    "land_record": "Land Record / Khatauni",
    "fpo_membership": "FPO / FPC Membership",
    "cooperative": "Cooperative Membership",
    "pm_kisan": "PM-KISAN Beneficiary",
    "other": "Other Agricultural Evidence",
}


def verify_agricultural_evidence(evidence_type: str, reference: str, district: str = "") -> dict:
    """
    Validates agricultural evidence reference format and submits for review.
    FPO / cooperative memberships get an automatic govt_source_match bonus.
    """
    ref = (reference or "").strip().upper()
    etype = (evidence_type or "other").lower()

    if etype not in AGRI_EVIDENCE_TYPES:
        etype = "other"

    if not ref or len(ref) < 4:
        return {
            "status": "rejected",
            "error": "Reference number too short",
            "agricultural_verified": False,
        }

    # Sandbox validation logic
    is_fpo = etype in ("fpo_membership", "cooperative")
    masked_ref = ref[:2] + "*" * max(len(ref) - 4, 0) + ref[-2:] if len(ref) > 4 else "**"

    return {
        "status": "submitted",
        "agricultural_verified": False,  # Requires admin review
        "type": etype,
        "type_label": AGRI_EVIDENCE_TYPES[etype],
        "reference": masked_ref,
        "is_fpo_cooperative": is_fpo,
        "govt_source_match": is_fpo,  # FPO/cooperative = government-registered source
        "district": district,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "message": "Agricultural evidence submitted — under review (24–48 hours)",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Business evidence verification (Buyer)
# ─────────────────────────────────────────────────────────────────────────────

BUSINESS_EVIDENCE_TYPES = {
    "gstin": "GST Registration",
    "udyam": "Udyam Registration",
    "company": "Company / LLP Registration",
    "trade_licence": "Trade / Business Licence",
    "cooperative": "Cooperative Registration",
    "other": "Other Business Evidence",
}


def verify_business_evidence(evidence_type: str, reference: str, business_name: str = "") -> dict:
    """
    Validates business registration evidence.
    GSTIN → format-checked. Udyam → format-checked.
    Others → submitted for manual review.
    """
    ref = (reference or "").strip().upper()
    etype = (evidence_type or "other").lower()

    if etype not in BUSINESS_EVIDENCE_TYPES:
        etype = "other"

    if not ref:
        return {"status": "rejected", "error": "Reference number is required", "business_verified": False}

    format_valid = True
    auto_verify = False
    message = "Business evidence submitted — under review"

    if etype == "gstin":
        format_valid = bool(GSTIN_RE.match(ref))
        if format_valid and not ref.startswith("00"):
            auto_verify = True
            message = "GSTIN format verified (sandbox lookup)"
        elif not format_valid:
            return {
                "status": "rejected",
                "error": "Invalid GSTIN format. Expected: 22AAAAA0000A1Z5",
                "business_verified": False,
            }
    elif etype == "udyam":
        format_valid = bool(UDYAM_RE.match(ref))
        if format_valid:
            auto_verify = True
            message = "Udyam registration format verified (sandbox)"
        else:
            return {
                "status": "rejected",
                "error": "Invalid Udyam format. Expected: UDYAM-MH-00-0000001",
                "business_verified": False,
            }

    masked_ref = ref[:4] + "*" * max(len(ref) - 7, 0) + ref[-3:] if len(ref) > 7 else "***"

    return {
        "status": "submitted" if not auto_verify else "verified",
        "business_verified": auto_verify,
        "type": etype,
        "type_label": BUSINESS_EVIDENCE_TYPES[etype],
        "reference": masked_ref,
        "format_valid": format_valid,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "message": message,
    }


def check_identity_business_match(identity_ref: str, business_ref: str, business_name: str) -> str:
    """
    Sandbox: compare identity reference to business registration.
    Returns: MATCH | PARTIAL_MATCH | MISMATCH | MANUAL_REVIEW
    """
    if not identity_ref or not business_ref:
        return "MANUAL_REVIEW"
    # Sandbox: if first chars overlap → MATCH
    if identity_ref[:3].upper() == business_ref[:3].upper():
        return "MATCH"
    if len(business_name) > 3 and identity_ref[:2].upper() == business_ref[:2].upper():
        return "PARTIAL_MATCH"
    return "MANUAL_REVIEW"


# ─────────────────────────────────────────────────────────────────────────────
# Trust Score
# ─────────────────────────────────────────────────────────────────────────────

def compute_trust_score(verif_doc: dict, role: str, completed_tx: int = 0) -> dict:
    """
    Compute trust score (0–100) from the verification document.
    Returns score + per-component breakdown.
    """
    weights = Config.TRUST_SCORE_WEIGHTS.get(role, {})
    score = 0
    breakdown = {}

    if verif_doc.get("phone_verified"):
        pts = weights.get("phone_verified", 0)
        score += pts
        breakdown["phone_verified"] = pts

    if verif_doc.get("identity_verified"):
        pts = weights.get("identity_verified", 0)
        score += pts
        breakdown["identity_verified"] = pts

    agri = verif_doc.get("agricultural_verification") or {}
    biz = verif_doc.get("business_verification") or {}

    if role == "farmer":
        if agri.get("status") == "verified":
            pts = weights.get("agricultural_verified", 0)
            score += pts
            breakdown["agricultural_verified"] = pts
        if agri.get("govt_source_match"):
            pts = weights.get("govt_source_match", 0)
            score += pts
            breakdown["govt_source_match"] = pts
        if agri.get("is_fpo_cooperative"):
            pts = weights.get("fpo_cooperative", 0)
            score += pts
            breakdown["fpo_cooperative"] = pts
    elif role == "buyer":
        if biz.get("status") == "verified":
            pts = weights.get("business_reg_verified", 0)
            score += pts
            breakdown["business_reg_verified"] = pts
        match = verif_doc.get("identity_business_match", "")
        if match in ("MATCH", "PARTIAL_MATCH"):
            pts = weights.get("identity_business_match", 0) if match == "MATCH" else weights.get("identity_business_match", 0) // 2
            score += pts
            breakdown["identity_business_match"] = pts

    # Transaction bonus (capped)
    tx_key = "completed_transactions" if role == "farmer" else "successful_transactions"
    tx_pts = min(weights.get(tx_key, 0), (completed_tx // 5) * (weights.get(tx_key, 10) // 2))
    if tx_pts:
        score += tx_pts
        breakdown[tx_key] = tx_pts

    return {"trust_score": min(100, score), "breakdown": breakdown}


# ─────────────────────────────────────────────────────────────────────────────
# Verification Level & Status
# ─────────────────────────────────────────────────────────────────────────────

def compute_verification_level(verif_doc: dict, role: str) -> int:
    """
    Returns integer verification level 0–4.
    Level 4 = fully verified (all mandatory checks, no critical risk flags).
    """
    if not verif_doc:
        return 0
    if not verif_doc.get("phone_verified"):
        return 0
    if not verif_doc.get("identity_verified"):
        return 1
    agri = verif_doc.get("agricultural_verification") or {}
    biz = verif_doc.get("business_verification") or {}
    role_verified = (
        agri.get("status") == "verified" if role == "farmer"
        else biz.get("status") == "verified"
    )
    if not role_verified:
        return 2
    # Level 3 → all checks passed
    risk_flags = verif_doc.get("risk_flags") or []
    critical = [f for f in risk_flags if f.get("severity") == "critical"]
    if critical:
        return 3  # checks passed but blocked by critical risk flag
    return 4


def compute_overall_status(verif_doc: dict, role: str) -> str:
    """
    Derives the overall PENDING/SUBMITTED/UNDER_REVIEW/VERIFIED/REJECTED/SUSPENDED
    status from the underlying check fields.
    Frontend must never override this — always re-fetch from backend.
    """
    if not verif_doc:
        return "PENDING"
    # Hard overrides from admin
    forced = verif_doc.get("forced_status")
    if forced in ("REJECTED", "SUSPENDED"):
        return forced

    level = compute_verification_level(verif_doc, role)
    if level == 4:
        return "VERIFIED"

    agri = verif_doc.get("agricultural_verification") or {}
    biz = verif_doc.get("business_verification") or {}
    role_submitted = (
        agri.get("status") in ("submitted", "verified") if role == "farmer"
        else biz.get("status") in ("submitted", "verified")
    )
    identity_done = verif_doc.get("identity_verified")
    phone_done = verif_doc.get("phone_verified")

    if role_submitted and identity_done:
        return "UNDER_REVIEW"
    if phone_done or identity_done or role_submitted:
        return "SUBMITTED"
    return "PENDING"


def get_next_step_message(verif_doc: dict, role: str) -> str:
    """Returns a human-readable message about the next verification step."""
    if not verif_doc or not verif_doc.get("phone_verified"):
        return "Complete mobile OTP verification to get started"
    if not verif_doc.get("identity_verified"):
        return "Submit your identity details (PAN / Aadhaar reference)"
    agri = verif_doc.get("agricultural_verification") or {}
    biz = verif_doc.get("business_verification") or {}
    if role == "farmer" and agri.get("status") not in ("submitted", "verified"):
        return "Submit agricultural evidence (farmer registration, FPO membership, etc.)"
    if role == "buyer" and biz.get("status") not in ("submitted", "verified"):
        return "Submit business registration evidence (GSTIN, Udyam, trade licence, etc.)"
    status = compute_overall_status(verif_doc, role)
    if status == "UNDER_REVIEW":
        return "Your documents are under review — typically 24–48 hours"
    if status == "VERIFIED":
        return "You are fully verified!"
    return "Complete all verification steps"


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_or_create_verif_doc(user_id, role: str) -> dict:
    """Fetch existing verification doc, or create a PENDING one."""
    db = get_db()
    from bson import ObjectId
    oid = ObjectId(user_id) if not hasattr(user_id, "binary") else user_id
    doc = db.verifications.find_one({"user_id": oid, "role": role})
    if doc:
        return doc
    now = datetime.now(timezone.utc)
    new_doc = {
        "user_id": oid,
        "role": role,
        "forced_status": None,
        "phone_verified": False,
        "phone_verified_at": None,
        "identity_verified": False,
        "identity_provider": None,
        "identity_reference": None,
        "identity_verified_at": None,
        "agricultural_verification": {"status": "none"},
        "business_verification": {"status": "none"},
        "location_verification": {"status": "none"},
        "identity_business_match": None,
        "trust_score": 0,
        "trust_score_breakdown": {},
        "risk_flags": [],
        "submitted_at": None,
        "reviewed_at": None,
        "reviewed_by": None,
        "admin_notes": None,
        "rejection_reason": None,
        "created_at": now,
        "updated_at": now,
    }
    result = db.verifications.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return new_doc


def update_verif_doc(user_id, role: str, updates: dict):
    """Update verification document and recompute trust score + status."""
    db = get_db()
    from bson import ObjectId
    oid = ObjectId(user_id) if not hasattr(user_id, "binary") else user_id
    doc = db.verifications.find_one({"user_id": oid, "role": role})
    if not doc:
        doc = get_or_create_verif_doc(oid, role)

    merged = {**doc, **updates}
    completed_tx = db.orders.count_documents(
        {"farmer_id" if role == "farmer" else "buyer_id": oid, "delivery_status": "delivered"}
    )
    ts = compute_trust_score(merged, role, completed_tx)
    updates["trust_score"] = ts["trust_score"]
    updates["trust_score_breakdown"] = ts["breakdown"]
    updates["updated_at"] = datetime.now(timezone.utc)

    db.verifications.update_one(
        {"user_id": oid, "role": role},
        {"$set": updates},
        upsert=True,
    )
    return db.verifications.find_one({"user_id": oid, "role": role})


def serialize_verif_status(doc: dict, role: str) -> dict:
    """Serialize a verification doc for API response."""
    if not doc:
        return {"status": "PENDING", "verification_level": 0, "trust_score": 0}
    level = compute_verification_level(doc, role)
    status = compute_overall_status(doc, role)
    agri = doc.get("agricultural_verification") or {}
    biz = doc.get("business_verification") or {}
    return {
        "status": status,
        "verification_level": level,
        "phone_verified": doc.get("phone_verified", False),
        "identity_verified": doc.get("identity_verified", False),
        "agricultural_verification": agri if role == "farmer" else None,
        "business_verification": biz if role == "buyer" else None,
        "location_verification": doc.get("location_verification"),
        "identity_business_match": doc.get("identity_business_match"),
        "trust_score": doc.get("trust_score", 0),
        "trust_score_breakdown": doc.get("trust_score_breakdown", {}),
        "risk_flags": [f for f in (doc.get("risk_flags") or []) if f.get("visible_to_user")],
        "rejection_reason": doc.get("rejection_reason") if status == "REJECTED" else None,
        "admin_notes": None,  # Never expose admin notes to user
        "submitted_at": doc.get("submitted_at").isoformat() if doc.get("submitted_at") else None,
        "reviewed_at": doc.get("reviewed_at").isoformat() if doc.get("reviewed_at") else None,
        "next_step": get_next_step_message(doc, role),
        "verified_on": doc.get("reviewed_at").strftime("%d/%m/%Y") if doc.get("reviewed_at") and status == "VERIFIED" else None,
    }
