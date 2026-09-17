from flask import Blueprint, g, jsonify, request
from bson import ObjectId

from database import get_db
from routes.auth import current_user_required, serialize_user
from services.verification_service import verify_gstin_sandbox, verify_bank_sandbox
from services.matching_service import match_listing
from services.real_price_fetcher import get_latest_market_prices

bp = Blueprint("buyers", __name__)


@bp.post("/verify")
@current_user_required(roles=["buyer"])
def verify_buyer():
    data = request.get_json() or {}
    gstin = data.get("gstin") or g.user_doc.get("gstin")
    result = verify_gstin_sandbox(gstin, data.get("business_name") or g.user_doc.get("business_name"))
    bank = verify_bank_sandbox(data.get("bank_account_ref") or g.user_doc.get("bank_account_ref"))
    updates = {
        "gstin": result["gstin"],
        "verified": result["verified"] and bank["verified"],
        "bank_account_ref": data.get("bank_account_ref") or g.user_doc.get("bank_account_ref"),
    }
    if data.get("demand_profile"):
        updates["demand_profile"] = data["demand_profile"]
    if data.get("district"):
        loc = g.user_doc.get("location") or {}
        loc["district"] = data["district"]
        updates["location"] = loc
    get_db().buyers.update_one({"_id": g.user_doc["_id"]}, {"$set": updates})
    user = get_db().buyers.find_one({"_id": g.user_doc["_id"]})
    return jsonify(
        {
            "gstin": result,
            "bank": bank,
            "user": serialize_user(user, "buyer"),
        }
    )


@bp.get("/matches/<listing_id>")
@current_user_required()
def listing_matches(listing_id):
    try:
        oid = ObjectId(listing_id)
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    listing = get_db().listings.find_one({"_id": oid})
    if not listing:
        return jsonify({"error": "Listing not found"}), 404
    return jsonify(match_listing(listing))


@bp.get("/feed")
@current_user_required(roles=["buyer"])
def buyer_feed():
    db = get_db()
    crops = [d["crop"] for d in (g.user_doc.get("demand_profile") or [])]
    query = {"status": {"$in": ["listed", "active"]}}
    if crops:
        query["crop"] = {"$in": crops}
    listings = list(db.listings.find(query).sort("created_at", -1))

    # Check if this buyer has full verification (Level 4 or verified flag)
    buyer_verif_level = (g.user or {}).get("verification_level", 0)
    is_buyer_verified = bool(
        buyer_verif_level >= 4 or
        g.user.get("verified") or
        (g.user or {}).get("verification_status") == "VERIFIED"
    )

    out = []
    for listing in listings:
        plan = match_listing(listing)
        mine = next((b for b in plan["matched_buyers"] if b["buyer_id"] == str(g.user_doc["_id"])), None)

        # Farmer details
        farmer = db.farmers.find_one({"_id": listing.get("farmer_id")}) or {}
        farmer_verif = db.verifications.find_one({"user_id": listing.get("farmer_id"), "role": "farmer"}) or {}

        farmer_name = farmer.get("name", "Farmer")
        farmer_phone = farmer.get("phone", "")
        farmer_village = farmer.get("village", "")
        farmer_trust = farmer_verif.get("trust_score", 45)
        farmer_verified = bool(farmer_verif.get("forced_status") == "VERIFIED" or farmer_trust >= 60)

        # Privacy guard on phone
        if is_buyer_verified:
            revealed_phone = farmer_phone
            contact_revealed = True
        else:
            revealed_phone = f"******{farmer_phone[-4:]}" if len(farmer_phone) >= 4 else "Locked"
            contact_revealed = False

        out.append(
            {
                "listing": {
                    "id": str(listing["_id"]),
                    "farmer_id": str(listing.get("farmer_id")),
                    "farmer_name": farmer_name,
                    "farmer_phone": revealed_phone,
                    "farmer_village": farmer_village,
                    "farmer_district": listing.get("district") or farmer.get("district", "N/A"),
                    "farmer_verified": farmer_verified,
                    "farmer_trust_score": farmer_trust,
                    "contact_revealed": contact_revealed,
                    "crop": listing["crop"],
                    "quantity": listing["quantity"],
                    "quality_grade": listing.get("quality_grade"),
                    "district": listing.get("district"),
                    "farmer_asking_price": listing.get("farmer_asking_price"),
                    "recommended_price_min": listing.get("recommended_price_min"),
                    "status": listing.get("status"),
                    "created_at": listing.get("created_at").isoformat() if listing.get("created_at") else None,
                },
                "allocation_for_me": mine,
                "split": plan["split"],
            }
        )
    return jsonify(out)


@bp.post("/request-contact/<listing_id>")
@current_user_required(roles=["buyer"])
def request_contact(listing_id):
    """Direct contact access check for a specific listing."""
    buyer_verif_level = (g.user or {}).get("verification_level", 0)
    is_buyer_verified = bool(
        buyer_verif_level >= 4 or
        g.user.get("verified") or
        (g.user or {}).get("verification_status") == "VERIFIED"
    )

    if not is_buyer_verified:
        return jsonify({
            "error": "Verification required",
            "message": "Complete account verification to view farmer contact details and initiate direct transactions.",
            "verification_level": buyer_verif_level,
        }), 403

    db = get_db()
    try:
        oid = ObjectId(listing_id)
    except Exception:
        return jsonify({"error": "Invalid listing ID"}), 400

    listing = db.listings.find_one({"_id": oid})
    if not listing:
        return jsonify({"error": "Listing not found"}), 404

    farmer = db.farmers.find_one({"_id": listing.get("farmer_id")}) or {}
    return jsonify({
        "success": True,
        "farmer": {
            "name": farmer.get("name"),
            "phone": farmer.get("phone"),
            "district": farmer.get("district"),
            "village": farmer.get("village"),
        },
        "crop": listing.get("crop"),
        "quantity": listing.get("quantity"),
        "price": listing.get("farmer_asking_price"),
    })


@bp.get("/market-prices")
@current_user_required()
def buyer_market_prices():
    """Retrieve market and AI prices for buyer reference."""
    prices = get_latest_market_prices()
    return jsonify({"prices": prices})
