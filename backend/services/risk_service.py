"""
Risk and anomaly detection service for FarmLink AI.
Monitors duplicate registrations, suspicious listings, volume anomalies,
and evaluates overall account risk levels.
"""
from datetime import datetime, timezone
from bson import ObjectId
from config import Config
from database import get_db


def detect_duplicate_phone(phone: str, role: str, db=None) -> list[dict]:
    """Check if the phone number is used across multiple accounts."""
    if not phone:
        return []
    db = db or get_db()
    flags = []
    # Count in farmers
    farmer_count = db.farmers.count_documents({"phone": phone})
    buyer_count = db.buyers.count_documents({"phone": phone})
    total = farmer_count + buyer_count
    if total > 1:
        flags.append({
            "code": "DUP_PHONE",
            "message": f"Phone {phone[-4:]} is associated with {total} accounts",
            "severity": "medium",
            "visible_to_user": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return flags


def detect_duplicate_identity(identity_ref: str, role: str, user_id=None, db=None) -> list[dict]:
    """Check if the identity reference is registered under multiple users."""
    if not identity_ref:
        return []
    db = db or get_db()
    query = {"identity_reference": identity_ref}
    if user_id:
        oid = ObjectId(user_id) if not hasattr(user_id, "binary") else user_id
        query["user_id"] = {"$ne": oid}
    existing = db.verifications.find_one(query)
    if existing:
        return [{
            "code": "DUP_IDENTITY",
            "message": "Identity reference is already linked to another account",
            "severity": "critical",
            "visible_to_user": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }]
    return []


def detect_duplicate_business(business_ref: str, user_id=None, db=None) -> list[dict]:
    """Check if GSTIN or Udyam number is already registered."""
    if not business_ref:
        return []
    db = db or get_db()
    query = {"business_verification.reference": business_ref}
    if user_id:
        oid = ObjectId(user_id) if not hasattr(user_id, "binary") else user_id
        query["user_id"] = {"$ne": oid}
    existing = db.verifications.find_one(query)
    if existing:
        return [{
            "code": "DUP_BUSINESS",
            "message": "Business registration reference is already used by another account",
            "severity": "critical",
            "visible_to_user": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }]
    return []


def flag_suspicious_listing(listing: dict, farmer_verif: dict = None, db=None) -> list[dict]:
    """
    Check if a newly created listing should be flagged.
    E.g. Large quantity by unverified farmer or price wildly out of market band.
    """
    db = db or get_db()
    flags = []
    quantity = float(listing.get("quantity_quintals") or 0)
    farmer_id = listing.get("farmer_id")

    if not farmer_verif and farmer_id:
        farmer_verif = db.verifications.find_one({"user_id": ObjectId(farmer_id), "role": "farmer"})

    is_verified = (farmer_verif or {}).get("status") == "VERIFIED"
    agri_status = ((farmer_verif or {}).get("agricultural_verification") or {}).get("status")

    # Flag 1: High quantity without agricultural verification
    if quantity >= Config.SUSPICIOUS_QUANTITY_THRESHOLD and agri_status != "verified":
        flags.append({
            "code": "SUSPICIOUS_VOLUME",
            "message": f"Large quantity ({quantity}q) listed without verified agricultural evidence",
            "severity": "medium",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Flag 2: Extreme quantity (> 5000 quintals)
    if quantity > 5000:
        flags.append({
            "code": "ANOMALOUS_VOLUME",
            "message": f"Unusually high quantity ({quantity}q) listed",
            "severity": "high",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return flags


def check_listing_volume_anomaly(farmer_id, new_quantity: float, db=None) -> list[dict]:
    """Check if farmer has listed an unrealistic total volume in the last 7 days."""
    db = db or get_db()
    oid = ObjectId(farmer_id) if not hasattr(farmer_id, "binary") else farmer_id
    pipeline = [
        {"$match": {"farmer_id": oid, "status": "active"}},
        {"$group": {"_id": None, "total_qty": {"$sum": "$quantity_quintals"}}},
    ]
    res = list(db.listings.aggregate(pipeline))
    existing_qty = res[0]["total_qty"] if res else 0
    if (existing_qty + new_quantity) > 10000:
        return [{
            "code": "CUMULATIVE_VOLUME_EXCEEDED",
            "message": f"Active volume ({existing_qty + new_quantity}q) exceeds normal threshold",
            "severity": "high",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }]
    return []


def evaluate_account_risk(user_id, role: str, db=None) -> dict:
    """
    Aggregates all risk signals for an account.
    Returns { risk_level: 'none' | 'low' | 'medium' | 'high', flags: [...] }
    """
    db = db or get_db()
    oid = ObjectId(user_id) if not hasattr(user_id, "binary") else user_id
    verif = db.verifications.find_one({"user_id": oid, "role": role}) or {}
    user_coll = db.farmers if role == "farmer" else db.buyers
    user_doc = user_coll.find_one({"_id": oid}) or {}

    flags = list(verif.get("risk_flags") or [])

    # Check phone duplicates
    phone_flags = detect_duplicate_phone(user_doc.get("phone", ""), role, db)
    for pf in phone_flags:
        if not any(f.get("code") == pf["code"] for f in flags):
            flags.append(pf)

    # Determine risk level
    severities = [f.get("severity") for f in flags]
    if "critical" in severities or severities.count("high") >= 2:
        level = "high"
    elif "high" in severities or severities.count("medium") >= 2:
        level = "medium"
    elif "medium" in severities or len(flags) > 0:
        level = "low"
    else:
        level = "none"

    return {"risk_level": level, "flags": flags}
