from datetime import datetime, timezone
from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from config import Config
from database import get_db
from routes.auth import current_user_required
from services.pricing_service import recommend_price
from services.matching_service import match_listing
from services.risk_service import flag_suspicious_listing, check_listing_volume_anomaly

bp = Blueprint("listings", __name__)


def _oid(value):
    try:
        return ObjectId(value)
    except Exception:
        return None


def serialize_listing(doc):
    if not doc:
        return None
    db = get_db()
    farmer_id = doc.get("farmer_id")
    farmer = db.farmers.find_one({"_id": farmer_id}) if farmer_id else None
    verif = db.verifications.find_one({"user_id": farmer_id, "role": "farmer"}) if farmer_id else None

    farmer_name = farmer.get("name") if farmer else "Farmer"
    farmer_verified = bool(verif and (verif.get("forced_status") == "VERIFIED" or verif.get("trust_score", 0) >= 60))
    farmer_trust = verif.get("trust_score", 40) if verif else 30
    farmer_verif_status = verif.get("forced_status") or ("VERIFIED" if farmer_verified else "PENDING") if verif else "PENDING"

    return {
        "id": str(doc["_id"]),
        "farmer_id": str(doc["farmer_id"]),
        "farmer_name": farmer_name,
        "farmer_verified": farmer_verified,
        "farmer_trust_score": farmer_trust,
        "farmer_verification_status": farmer_verif_status,
        "crop": doc.get("crop"),
        "quantity": doc.get("quantity"),
        "quality_grade": doc.get("quality_grade"),
        "recommended_price_min": doc.get("recommended_price_min"),
        "recommended_price_max": doc.get("recommended_price_max"),
        "farmer_asking_price": doc.get("farmer_asking_price"),
        "status": doc.get("status"),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "district": doc.get("district"),
        "harvest_date": doc.get("harvest_date"),
        "basis_explanation": doc.get("basis_explanation"),
        "risk_flags": doc.get("risk_flags", []),
        "risk_flagged": doc.get("risk_flagged", False),
    }


@bp.post("")
@current_user_required(roles=["farmer"])
def create_listing():
    user_verif_level = (g.user or {}).get("verification_level", 0)
    # Check minimum verification level
    if user_verif_level < Config.LISTING_MIN_VERIFICATION_LEVEL and not (g.user or {}).get("phone_verified"):
        return jsonify({
            "error": "Verification required",
            "message": "Please verify your mobile number before creating crop listings.",
            "verification_level": user_verif_level,
        }), 403

    data = request.get_json() or {}
    crop = data.get("crop")
    qty = data.get("quantity")
    grade = (data.get("quality") or data.get("quality_grade") or "B").upper()
    district = data.get("district") or g.user.get("district") or "Nashik"
    if not crop or not qty:
        return jsonify({"error": "crop and quantity are required"}), 400

    try:
        qty_float = float(qty)
    except ValueError:
        return jsonify({"error": "quantity must be a valid number"}), 400

    price = recommend_price(crop, qty_float, grade, district, data.get("date"))
    asking = float(data.get("farmer_asking_price") or price["target_price"])
    asking = min(max(asking, price["recommended_price_min"]), price["recommended_price_max"])

    db = get_db()
    farmer_oid = g.user_doc["_id"]

    # Risk checks
    temp_listing = {
        "farmer_id": farmer_oid,
        "quantity_quintals": qty_float,
        "crop": crop,
    }
    flags = flag_suspicious_listing(temp_listing, db=db)
    anomaly_flags = check_listing_volume_anomaly(farmer_oid, qty_float, db=db)
    all_flags = flags + anomaly_flags

    doc = {
        "farmer_id": farmer_oid,
        "crop": crop,
        "quantity": qty_float,
        "quality_grade": grade,
        "recommended_price_min": price["recommended_price_min"],
        "recommended_price_max": price["recommended_price_max"],
        "farmer_asking_price": asking,
        "status": "listed",
        "created_at": datetime.now(timezone.utc),
        "district": district,
        "harvest_date": data.get("harvest_date"),
        "basis_explanation": price["basis_explanation"],
        "risk_flags": all_flags,
        "risk_flagged": len(all_flags) > 0,
    }
    result = db.listings.insert_one(doc)
    doc["_id"] = result.inserted_id
    payload = serialize_listing(doc)
    payload["match_preview"] = match_listing(doc)
    payload["price"] = price
    return jsonify(payload), 201


@bp.get("")
@current_user_required()
def list_listings():
    db = get_db()
    query = {}
    if g.role == "farmer":
        query["farmer_id"] = g.user_doc["_id"]
    elif g.role == "buyer":
        query["status"] = {"$in": ["listed", "matched"]}
        crop = request.args.get("crop")
        if crop:
            query["crop"] = crop
    docs = list(db.listings.find(query).sort("created_at", -1))
    return jsonify([serialize_listing(d) for d in docs])


@bp.get("/<listing_id>")
@current_user_required()
def get_listing(listing_id):
    oid = _oid(listing_id)
    if not oid:
        return jsonify({"error": "Invalid id"}), 400
    doc = get_db().listings.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Not found"}), 404
    payload = serialize_listing(doc)
    payload["match_preview"] = match_listing(doc)
    return jsonify(payload)
