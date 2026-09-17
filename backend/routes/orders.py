from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from database import get_db
from routes.auth import current_user_required
from services.payment_service import transition, razorpay_cashfree_sandbox_release
from services.logistics_service import build_route_for_order

bp = Blueprint("orders", __name__)


def serialize_order(doc):
    return {
        "id": str(doc["_id"]),
        "match_id": str(doc["match_id"]),
        "listing_id": str(doc.get("listing_id")) if doc.get("listing_id") else None,
        "farmer_id": str(doc.get("farmer_id")) if doc.get("farmer_id") else None,
        "route_group_id": str(doc.get("route_group_id")) if doc.get("route_group_id") else None,
        "pickup_time": doc.get("pickup_time"),
        "delivery_status": doc.get("delivery_status"),
        "payment_status": doc.get("payment_status"),
        "total_amount": doc.get("total_amount"),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "escrow": doc.get("escrow"),
        "release": doc.get("release"),
    }


@bp.get("")
@current_user_required()
def list_orders():
    db = get_db()
    query = {}
    if g.role == "farmer":
        query["farmer_id"] = g.user_doc["_id"]
    elif g.role == "buyer":
        matches = list(db.matches.find({"buyer_ids": g.user_doc["_id"]}))
        query["match_id"] = {"$in": [m["_id"] for m in matches]}
    docs = list(db.orders.find(query).sort("created_at", -1))
    return jsonify([serialize_order(d) for d in docs])


@bp.get("/<order_id>")
@current_user_required()
def get_order(order_id):
    try:
        oid = ObjectId(order_id)
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    doc = get_db().orders.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Not found"}), 404
    payload = serialize_order(doc)
    payload["route"] = build_route_for_order(doc)
    match = get_db().matches.find_one({"_id": doc["match_id"]})
    if match:
        payload["allocated_quantities"] = match.get("allocated_quantities")
        payload["agreed_price"] = match.get("agreed_price")
    return jsonify(payload)


@bp.post("/<order_id>/status")
@current_user_required()
def update_status(order_id):
    try:
        oid = ObjectId(order_id)
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    data = request.get_json() or {}
    nxt = data.get("delivery_status") or data.get("status")
    db = get_db()
    order = db.orders.find_one({"_id": oid})
    if not order:
        return jsonify({"error": "Not found"}), 404
    current = order.get("delivery_status") or "listed"
    ok, msg = transition(current, nxt)
    if not ok:
        return jsonify({"error": msg}), 400
    updates = {"delivery_status": nxt}
    if nxt == "matched":
        updates["payment_status"] = "escrow_held"
    if nxt == "payment_released":
        if g.role not in ("admin", "buyer"):
            return jsonify({"error": "Only buyer or admin can release escrow"}), 403
        rel = razorpay_cashfree_sandbox_release(order)
        updates["payment_status"] = "released"
        updates["release"] = rel
        listing_id = order.get("listing_id")
        if listing_id:
            db.listings.update_one({"_id": listing_id}, {"$set": {"status": "completed"}})
    db.orders.update_one({"_id": oid}, {"$set": updates})
    order = db.orders.find_one({"_id": oid})
    return jsonify(serialize_order(order))
