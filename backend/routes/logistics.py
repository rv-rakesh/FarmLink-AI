from bson import ObjectId
from flask import Blueprint, jsonify

from database import get_db
from routes.auth import current_user_required
from services.logistics_service import build_route_for_order

bp = Blueprint("logistics", __name__)


@bp.get("/route/<route_group_id>")
@current_user_required()
def get_route(route_group_id):
    db = get_db()
    try:
        oid = ObjectId(route_group_id)
    except Exception:
        oid = None
    order = None
    if oid:
        order = db.orders.find_one({"route_group_id": oid})
    if not order:
        order = db.orders.find_one({"_id": ObjectId(route_group_id)}) if oid else None
    if not order:
        cached = db.routes.find_one({"route_group_id": oid}) if oid else None
        if cached:
            cached["_id"] = str(cached.get("_id"))
            cached["route_group_id"] = str(cached.get("route_group_id"))
            return jsonify(cached)
        return jsonify({"error": "Route not found"}), 404
    return jsonify(build_route_for_order(order))
