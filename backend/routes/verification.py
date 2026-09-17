"""
Verification routes for FarmLink AI.
Handles OTP generation/verification, identity verification (KYC sandbox),
agricultural & business evidence submission, and status queries.
"""
from flask import Blueprint, g, jsonify, request
from bson import ObjectId
from datetime import datetime, timezone

from database import get_db
from routes.auth import current_user_required
from services.verification_service_v2 import (
    generate_otp,
    verify_otp,
    simulate_identity_verification,
    verify_agricultural_evidence,
    verify_business_evidence,
    check_identity_business_match,
    get_or_create_verif_doc,
    update_verif_doc,
    serialize_verif_status,
)
from services.risk_service import evaluate_account_risk

bp = Blueprint("verification", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Mobile OTP
# ─────────────────────────────────────────────────────────────────────────────

@bp.post("/otp/send")
@current_user_required()
def send_otp():
    """Send OTP to user's phone for verification."""
    data = request.get_json() or {}
    phone = (data.get("phone") or g.user.get("phone") or "").strip()
    if not phone or len(phone) < 10:
        return jsonify({"error": "A valid 10-digit mobile number is required"}), 400

    result = generate_otp(phone)
    return jsonify(result)


@bp.post("/otp/verify")
@current_user_required()
def verify_phone_otp():
    """Verify submitted OTP code and update user verification record."""
    data = request.get_json() or {}
    session_id = data.get("session_id")
    otp = data.get("otp")

    if not session_id or not otp:
        return jsonify({"error": "session_id and otp are required"}), 400

    res = verify_otp(session_id, otp)
    if not res.get("ok"):
        return jsonify({"error": res.get("error", "Verification failed")}), 400

    # Update verification doc
    user_id = g.user_doc["_id"]
    role = g.role
    update_verif_doc(user_id, role, {
        "phone_verified": True,
        "phone_verified_at": datetime.now(timezone.utc),
    })

    # Also update phone on user document if different
    user_coll = get_db().farmers if role == "farmer" else get_db().buyers
    user_coll.update_one({"_id": user_id}, {"$set": {"phone_verified": True}})

    doc = get_or_create_verif_doc(user_id, role)
    return jsonify({
        "success": True,
        "message": "Mobile number verified successfully",
        "verification": serialize_verif_status(doc, role),
    })


# ─────────────────────────────────────────────────────────────────────────────
# Identity Sandbox Verification
# ─────────────────────────────────────────────────────────────────────────────

@bp.post("/identity/verify")
@current_user_required()
def verify_identity():
    """Verify identity document reference via sandbox KYC."""
    data = request.get_json() or {}
    name = (data.get("name") or g.user.get("name") or "").strip()
    id_ref = (data.get("id_reference") or "").strip()

    if not id_ref:
        return jsonify({"error": "Identity document reference (PAN / Aadhaar Ref) is required"}), 400

    res = simulate_identity_verification(name, id_ref)
    user_id = g.user_doc["_id"]
    role = g.role

    updates = {
        "identity_verified": res["identity_verified"],
        "identity_provider": res["identity_provider"],
        "identity_reference": res["identity_reference"],
        "identity_verified_at": res["identity_verified_at"],
    }
    doc = update_verif_doc(user_id, role, updates)

    return jsonify({
        "success": res["identity_verified"],
        "result": res["result"],
        "message": res["message"],
        "verification": serialize_verif_status(doc, role),
    })


# ─────────────────────────────────────────────────────────────────────────────
# Farmer Verification
# ─────────────────────────────────────────────────────────────────────────────

@bp.post("/farmer/submit")
@current_user_required(roles=["farmer"])
def submit_farmer_verification():
    """Submit complete or partial farmer verification information."""
    data = request.get_json() or {}
    user_id = g.user_doc["_id"]
    role = "farmer"

    updates = {}
    now = datetime.now(timezone.utc)

    # 1. Identity
    if data.get("id_reference"):
        id_res = simulate_identity_verification(g.user.get("name", ""), data["id_reference"])
        updates["identity_verified"] = id_res["identity_verified"]
        updates["identity_provider"] = id_res["identity_provider"]
        updates["identity_reference"] = id_res["identity_reference"]
        updates["identity_verified_at"] = id_res["identity_verified_at"]

    # 2. Agricultural Evidence
    evidence_type = data.get("evidence_type")
    evidence_ref = data.get("evidence_reference")
    if evidence_type and evidence_ref:
        agri_res = verify_agricultural_evidence(evidence_type, evidence_ref, data.get("district", ""))
        updates["agricultural_verification"] = agri_res

    # 3. Location confirmation
    if data.get("district") or data.get("village"):
        updates["location_verification"] = {
            "status": "verified",
            "state": data.get("state", "Maharashtra"),
            "district": data.get("district", g.user.get("district")),
            "village": data.get("village", g.user.get("village")),
            "validated": True,
            "verified_at": now.isoformat(),
        }

    updates["submitted_at"] = now
    updates["forced_status"] = None  # Clear any previous rejection if resubmitting

    doc = update_verif_doc(user_id, role, updates)

    # Run risk evaluation
    risk_info = evaluate_account_risk(user_id, role)
    if risk_info["flags"]:
        get_db().verifications.update_one(
            {"user_id": user_id, "role": role},
            {"$set": {"risk_flags": risk_info["flags"], "risk_level": risk_info["risk_level"]}},
        )
        doc = get_or_create_verif_doc(user_id, role)

    return jsonify({
        "success": True,
        "message": "Farmer verification details submitted successfully",
        "verification": serialize_verif_status(doc, role),
    })


@bp.get("/farmer/status")
@current_user_required(roles=["farmer"])
def get_farmer_status():
    """Retrieve full verification status for current farmer."""
    doc = get_or_create_verif_doc(g.user_doc["_id"], "farmer")
    return jsonify(serialize_verif_status(doc, "farmer"))


@bp.post("/farmer/resubmit")
@current_user_required(roles=["farmer"])
def resubmit_farmer():
    return submit_farmer_verification()


# ─────────────────────────────────────────────────────────────────────────────
# Buyer Verification
# ─────────────────────────────────────────────────────────────────────────────

@bp.post("/buyer/submit")
@current_user_required(roles=["buyer"])
def submit_buyer_verification():
    """Submit complete or partial buyer verification information."""
    data = request.get_json() or {}
    user_id = g.user_doc["_id"]
    role = "buyer"

    updates = {}
    now = datetime.now(timezone.utc)

    # 1. Identity
    if data.get("id_reference"):
        id_res = simulate_identity_verification(g.user.get("name", ""), data["id_reference"])
        updates["identity_verified"] = id_res["identity_verified"]
        updates["identity_provider"] = id_res["identity_provider"]
        updates["identity_reference"] = id_res["identity_reference"]
        updates["identity_verified_at"] = id_res["identity_verified_at"]

    # 2. Business Evidence
    evidence_type = data.get("evidence_type")
    evidence_ref = data.get("evidence_reference")
    business_name = data.get("business_name") or g.user.get("business_name", "")
    if evidence_type and evidence_ref:
        biz_res = verify_business_evidence(evidence_type, evidence_ref, business_name)
        updates["business_verification"] = biz_res

        # Check match between identity and business ref
        id_ref = updates.get("identity_reference") or (get_or_create_verif_doc(user_id, role).get("identity_reference") or "")
        match_res = check_identity_business_match(id_ref, evidence_ref, business_name)
        updates["identity_business_match"] = match_res

    # 3. Location/Address confirmation
    if data.get("district") or data.get("address"):
        updates["location_verification"] = {
            "status": "verified",
            "address": data.get("address", ""),
            "district": data.get("district", g.user.get("district")),
            "state": data.get("state", ""),
            "pincode": data.get("pincode", ""),
            "validated": True,
            "verified_at": now.isoformat(),
        }

    updates["submitted_at"] = now
    updates["forced_status"] = None

    doc = update_verif_doc(user_id, role, updates)

    # Run risk evaluation
    risk_info = evaluate_account_risk(user_id, role)
    if risk_info["flags"]:
        get_db().verifications.update_one(
            {"user_id": user_id, "role": role},
            {"$set": {"risk_flags": risk_info["flags"], "risk_level": risk_info["risk_level"]}},
        )
        doc = get_or_create_verif_doc(user_id, role)

    return jsonify({
        "success": True,
        "message": "Buyer verification details submitted successfully",
        "verification": serialize_verif_status(doc, role),
    })


@bp.get("/buyer/status")
@current_user_required(roles=["buyer"])
def get_buyer_status():
    """Retrieve full verification status for current buyer."""
    doc = get_or_create_verif_doc(g.user_doc["_id"], "buyer")
    return jsonify(serialize_verif_status(doc, "buyer"))


@bp.post("/buyer/resubmit")
@current_user_required(roles=["buyer"])
def resubmit_buyer():
    return submit_buyer_verification()


# ─────────────────────────────────────────────────────────────────────────────
# Generic Status for Current User
# ─────────────────────────────────────────────────────────────────────────────

@bp.get("/status")
@current_user_required()
def get_current_user_status():
    """Returns verification status for the authenticated user (farmer, buyer, or admin)."""
    if g.role == "admin":
        return jsonify({"status": "VERIFIED", "verification_level": 4, "trust_score": 100})
    doc = get_or_create_verif_doc(g.user_doc["_id"], g.role)
    return jsonify(serialize_verif_status(doc, g.role))
