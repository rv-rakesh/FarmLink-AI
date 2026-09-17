from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from bson import ObjectId

from database import get_db, is_mock
from routes.auth import current_user_required
from services.verification_service_v2 import (
    compute_trust_score,
    compute_verification_level,
    compute_overall_status,
    serialize_verif_status,
)

bp = Blueprint("admin", __name__)


@bp.get("/overview")
@current_user_required(roles=["admin"])
def overview():
    db = get_db()
    listings = list(db.listings.find())
    orders = list(db.orders.find())
    buyers = list(db.buyers.find())
    farmers = list(db.farmers.find())
    flags = [o for o in orders if o.get("payment_status") == "escrow_held"]

    # Count verifications by status
    pending_count = db.verifications.count_documents({"$or": [{"forced_status": None}, {"forced_status": "UNDER_REVIEW"}]})
    flagged_listings = list(db.listings.find({"risk_flags": {"$exists": True, "$not": {"$size": 0}}}))

    gmv = sum(float(o.get("total_amount") or 0) for o in orders)
    released = sum(float(o.get("total_amount") or 0) for o in orders if o.get("payment_status") == "released")

    # Get recent verifications needing review
    recent_verifs = list(db.verifications.find().sort("updated_at", -1).limit(10))
    pending_verifications_list = []
    for v in recent_verifs:
        u_coll = db.farmers if v.get("role") == "farmer" else db.buyers
        u = u_coll.find_one({"_id": v.get("user_id")}) or {}
        st = compute_overall_status(v, v.get("role", "farmer"))
        pending_verifications_list.append({
            "id": str(v["_id"]),
            "user_id": str(v.get("user_id")),
            "role": v.get("role"),
            "name": u.get("name") or u.get("business_name"),
            "phone": u.get("phone"),
            "district": u.get("district") or (u.get("location") or {}).get("district"),
            "status": st,
            "trust_score": v.get("trust_score", 0),
        })

    return jsonify(
        {
            "using_mongomock": is_mock(),
            "counts": {
                "farmers": len(farmers),
                "buyers": len(buyers),
                "listings": len(listings),
                "orders": len(orders),
                "matches": db.matches.count_documents({}),
                "pending_verifications": pending_count,
                "risk_flags": len(flagged_listings),
            },
            "gmv": gmv,
            "escrow_held_value": sum(float(o.get("total_amount") or 0) for o in flags),
            "released_value": released,
            "listing_status": {
                s: len([x for x in listings if x.get("status") == s])
                for s in ["listed", "matched", "completed"]
            },
            "pending_verifications": pending_verifications_list,
            "escrow_flags": [
                {
                    "id": str(o["_id"]),
                    "total_amount": o.get("total_amount"),
                    "delivery_status": o.get("delivery_status"),
                    "payment_status": o.get("payment_status"),
                }
                for o in flags
            ],
        }
    )


# ─────────────────────────────────────────────────────────────────────────────
# Verification Management
# ─────────────────────────────────────────────────────────────────────────────

@bp.get("/verifications")
@current_user_required(roles=["admin"])
def list_verifications():
    """List all verifications with filtering by status and role."""
    db = get_db()
    status_filter = request.args.get("status")
    role_filter = request.args.get("role")

    query = {}
    if role_filter:
        query["role"] = role_filter

    docs = list(db.verifications.find(query).sort("updated_at", -1))
    results = []

    for doc in docs:
        role = doc.get("role", "farmer")
        computed_status = compute_overall_status(doc, role)
        if status_filter and computed_status.lower() != status_filter.lower():
            continue

        u_coll = db.farmers if role == "farmer" else db.buyers
        u = u_coll.find_one({"_id": doc.get("user_id")}) or {}

        results.append({
            "id": str(doc["_id"]),
            "user_id": str(doc.get("user_id")),
            "role": role,
            "name": u.get("name") or u.get("business_name") or "User",
            "phone": u.get("phone"),
            "district": u.get("district") or (u.get("location") or {}).get("district", "N/A"),
            "status": computed_status,
            "verification_level": compute_verification_level(doc, role),
            "trust_score": doc.get("trust_score", 0),
            "phone_verified": bool(doc.get("phone_verified")),
            "identity_verified": bool(doc.get("identity_verified")),
            "agricultural_verification": doc.get("agricultural_verification"),
            "business_verification": doc.get("business_verification"),
            "location_verification": doc.get("location_verification"),
            "risk_flags": doc.get("risk_flags", []),
            "risk_level": doc.get("risk_level", "none"),
            "submitted_at": doc.get("submitted_at").isoformat() if doc.get("submitted_at") else None,
            "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
        })

    return jsonify({"verifications": results, "total": len(results)})


@bp.get("/verifications/<verif_id>")
@current_user_required(roles=["admin"])
def get_verification_detail(verif_id):
    """Get full details of a single verification record."""
    db = get_db()
    try:
        oid = ObjectId(verif_id)
    except Exception:
        return jsonify({"error": "Invalid verification ID"}), 400

    doc = db.verifications.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Verification record not found"}), 404

    role = doc.get("role", "farmer")
    u_coll = db.farmers if role == "farmer" else db.buyers
    user = u_coll.find_one({"_id": doc.get("user_id")}) or {}

    data = serialize_verif_status(doc, role)
    data["id"] = str(doc["_id"])
    data["user_id"] = str(doc.get("user_id"))
    data["role"] = role
    data["name"] = user.get("name") or user.get("business_name")
    data["phone"] = user.get("phone")
    data["email"] = user.get("email")
    data["district"] = user.get("district") or (user.get("location") or {}).get("district")
    data["admin_notes"] = doc.get("admin_notes")
    data["all_risk_flags"] = doc.get("risk_flags", [])

    return jsonify(data)


@bp.post("/verifications/<verif_id>/approve")
@current_user_required(roles=["admin"])
def approve_verification(verif_id):
    """Approve a user's verification, awarding VERIFIED status and trust score."""
    db = get_db()
    try:
        oid = ObjectId(verif_id)
    except Exception:
        return jsonify({"error": "Invalid verification ID"}), 400

    doc = db.verifications.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Verification not found"}), 404

    role = doc.get("role", "farmer")
    data = request.get_json(silent=True) or {}
    notes = data.get("notes", "Approved by admin")
    now = datetime.now(timezone.utc)

    updates = {
        "phone_verified": True,
        "identity_verified": True,
        "forced_status": None,  # Computed will resolve to VERIFIED
        "reviewed_at": now,
        "reviewed_by": "admin",
        "admin_notes": notes,
        "updated_at": now,
    }

    if role == "farmer":
        agri = doc.get("agricultural_verification") or {}
        agri["status"] = "verified"
        agri["verified_at"] = now.isoformat()
        updates["agricultural_verification"] = agri
        # Sync to farmer doc
        db.farmers.update_one({"_id": doc["user_id"]}, {"$set": {"verified": True, "verification_status": "VERIFIED"}})
    else:
        biz = doc.get("business_verification") or {}
        biz["status"] = "verified"
        biz["verified_at"] = now.isoformat()
        updates["business_verification"] = biz
        # Sync to buyer doc
        db.buyers.update_one({"_id": doc["user_id"]}, {"$set": {"verified": True, "verification_status": "VERIFIED"}})

    # Compute updated trust score
    merged = {**doc, **updates}
    ts = compute_trust_score(merged, role, completed_tx=10)
    updates["trust_score"] = max(ts["trust_score"], 80)
    updates["trust_score_breakdown"] = ts["breakdown"]

    db.verifications.update_one({"_id": oid}, {"$set": updates})

    return jsonify({"success": True, "message": f"{role.capitalize()} approved successfully", "trust_score": updates["trust_score"]})


@bp.post("/verifications/<verif_id>/reject")
@current_user_required(roles=["admin"])
def reject_verification(verif_id):
    """Reject verification with a specific reason."""
    data = request.get_json(silent=True) or {}
    reason = data.get("reason") or "Evidence provided could not be validated."
    db = get_db()
    try:
        oid = ObjectId(verif_id)
    except Exception:
        return jsonify({"error": "Invalid verification ID"}), 400

    now = datetime.now(timezone.utc)
    db.verifications.update_one(
        {"_id": oid},
        {
            "$set": {
                "forced_status": "REJECTED",
                "rejection_reason": reason,
                "reviewed_at": now,
                "reviewed_by": "admin",
                "updated_at": now,
            }
        },
    )
    return jsonify({"success": True, "message": "Verification rejected", "reason": reason})


@bp.post("/verifications/<verif_id>/suspend")
@current_user_required(roles=["admin"])
def suspend_verification(verif_id):
    """Suspend an account for violations or high risk."""
    data = request.get_json(silent=True) or {}
    reason = data.get("reason") or "Account suspended for suspicious activity."
    db = get_db()
    try:
        oid = ObjectId(verif_id)
    except Exception:
        return jsonify({"error": "Invalid verification ID"}), 400

    now = datetime.now(timezone.utc)
    db.verifications.update_one(
        {"_id": oid},
        {
            "$set": {
                "forced_status": "SUSPENDED",
                "rejection_reason": reason,
                "reviewed_at": now,
                "reviewed_by": "admin",
                "updated_at": now,
            }
        },
    )
    return jsonify({"success": True, "message": "Account suspended", "reason": reason})


@bp.post("/verifications/<verif_id>/request-more-info")
@current_user_required(roles=["admin"])
def request_more_info(verif_id):
    """Request additional documentation from the user."""
    data = request.get_json(silent=True) or {}
    notes = data.get("notes") or "Please upload clearer evidence documents."
    db = get_db()
    try:
        oid = ObjectId(verif_id)
    except Exception:
        return jsonify({"error": "Invalid verification ID"}), 400

    now = datetime.now(timezone.utc)
    db.verifications.update_one(
        {"_id": oid},
        {
            "$set": {
                "admin_notes": notes,
                "updated_at": now,
            }
        },
    )
    return jsonify({"success": True, "message": "Information requested", "notes": notes})


@bp.get("/verifications/stats")
@current_user_required(roles=["admin"])
def verification_stats():
    """Returns counts of accounts by verification status and role."""
    db = get_db()
    all_verifs = list(db.verifications.find())
    stats = {
        "total": len(all_verifs),
        "by_status": {"PENDING": 0, "SUBMITTED": 0, "UNDER_REVIEW": 0, "VERIFIED": 0, "REJECTED": 0, "SUSPENDED": 0},
        "by_role": {"farmer": 0, "buyer": 0},
    }
    for v in all_verifs:
        role = v.get("role", "farmer")
        st = compute_overall_status(v, role)
        stats["by_status"][st] = stats["by_status"].get(st, 0) + 1
        stats["by_role"][role] = stats["by_role"].get(role, 0) + 1

    return jsonify(stats)


@bp.get("/risk-flags")
@current_user_required(roles=["admin"])
def get_risk_flags():
    """Retrieve all flagged listings and accounts."""
    db = get_db()
    flagged_listings = list(db.listings.find({"risk_flags": {"$exists": True, "$not": {"$size": 0}}}))
    flagged_accounts = list(db.verifications.find({"risk_flags": {"$exists": True, "$not": {"$size": 0}}}))

    return jsonify({
        "listings": [
            {
                "id": str(l["_id"]),
                "crop": l.get("crop"),
                "quantity": l.get("quantity_quintals"),
                "farmer_id": str(l.get("farmer_id")),
                "risk_flags": l.get("risk_flags", []),
            }
            for l in flagged_listings
        ],
        "accounts": [
            {
                "id": str(a["_id"]),
                "user_id": str(a.get("user_id")),
                "role": a.get("role"),
                "risk_flags": a.get("risk_flags", []),
                "risk_level": a.get("risk_level", "low"),
            }
            for a in flagged_accounts
        ],
    })


# Backward compatibility
@bp.post("/buyers/<buyer_id>/approve")
@current_user_required(roles=["admin"])
def approve_buyer(buyer_id):
    db = get_db()
    try:
        oid = ObjectId(buyer_id)
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    db.buyers.update_one({"_id": oid}, {"$set": {"verified": True}})
    # Also approve verification doc
    v = db.verifications.find_one({"user_id": oid, "role": "buyer"})
    if v:
        approve_verification(str(v["_id"]))
    return jsonify({"ok": True})


@bp.post("/orders/<order_id>/flag")
@current_user_required(roles=["admin"])
def flag_order(order_id):
    note = (request.get_json(silent=True) or {}).get("note") or "dispute"
    db = get_db()
    try:
        oid = ObjectId(order_id)
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    db.orders.update_one({"_id": oid}, {"$set": {"dispute_flag": note}})
    return jsonify({"ok": True, "note": note})
