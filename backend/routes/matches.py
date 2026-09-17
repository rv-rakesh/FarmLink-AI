from datetime import datetime, timedelta, timezone
from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from database import get_db
from routes.auth import current_user_required
from services.matching_service import match_listing, persist_match
from services.payment_service import razorpay_cashfree_sandbox_hold
from services.logistics_service import build_route_for_order

bp = Blueprint("matches", __name__)


@bp.post("/confirm")
@current_user_required()
def confirm_match():
    data = request.get_json() or {}
    listing_id = data.get("listing_id")
    try:
        oid = ObjectId(listing_id)
    except Exception:
        return jsonify({"error": "listing_id required"}), 400
    db = get_db()
    listing = db.listings.find_one({"_id": oid})
    if not listing:
        return jsonify({"error": "Listing not found"}), 404
    if g.role == "farmer" and listing["farmer_id"] != g.user_doc["_id"]:
        return jsonify({"error": "Not your listing"}), 403

    plan = match_listing(listing)
    if not plan["matched_buyers"]:
        return jsonify({"error": "No verified buyers in range"}), 400

    match = persist_match(listing, plan, status="confirmed")
    db.listings.update_one({"_id": oid}, {"$set": {"status": "matched"}})

    farmer = db.farmers.find_one({"_id": listing["farmer_id"]})
    total = plan["estimated_total"]
    route_group_id = ObjectId()
    order_doc = {
        "match_id": match["_id"],
        "listing_id": listing["_id"],
        "farmer_id": listing["farmer_id"],
        "route_group_id": route_group_id,
        "pickup_time": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat(),
        "delivery_status": "matched",
        "payment_status": "escrow_held",
        "total_amount": total,
        "farmer_bank_ref": (farmer or {}).get("bank_account_ref"),
        "created_at": datetime.now(timezone.utc),
    }
    ins = db.orders.insert_one(order_doc)
    order_doc["_id"] = ins.inserted_id
    hold = razorpay_cashfree_sandbox_hold(order_doc, total)
    db.orders.update_one({"_id": ins.inserted_id}, {"$set": {"escrow": hold}})
    route = build_route_for_order(order_doc)
    plan_out = {**plan, "listing_id": str(plan["listing_id"])}
    return jsonify(
        {
            "match": {
                "id": str(match["_id"]),
                **plan_out,
                "status": "confirmed",
            },
            "order": {
                "id": str(order_doc["_id"]),
                "delivery_status": "matched",
                "payment_status": "escrow_held",
                "total_amount": total,
                "route_group_id": str(route_group_id),
            },
            "escrow": hold,
            "route": route,
        }
    )
