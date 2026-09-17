from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, g

from database import get_db
from routes.auth import current_user_required
from services.sms_service import parse_sms_command, confirmation_sms, price_enquiry_sms, Msg91AdapterStub
from services.pricing_service import recommend_price

bp = Blueprint("sms", __name__)


@bp.post("/webhook")
@current_user_required(roles=["farmer"])
def webhook():
    data = request.get_json() or {}
    text = data.get("text") or data.get("message") or ""
    parsed = parse_sms_command(text)
    adapter = Msg91AdapterStub()
    farmer_phone = data.get("from") or g.user.get("phone")

    if not parsed.get("ok"):
        sms = adapter.send(farmer_phone, parsed["error"])
        return jsonify({"ok": False, "error": parsed["error"], "sms": sms, "simulator": True}), 400

    intent = parsed.get("intent", "LIST")

    # Handle price enquiry intent
    if intent == "PRICE":
        crop = parsed["crop"]
        district = parsed.get("district", "Nashik")
        price = recommend_price(crop, 10, "B", district)
        body = price_enquiry_sms(crop, district, price)
        sms = adapter.send(farmer_phone, body)
        return jsonify({
            "ok": True,
            "intent": "PRICE",
            "crop": crop,
            "district": district,
            "price": price,
            "sms": sms,
            "parsed": parsed,
            "reply_text": body,
            "simulator": True,
        })

    # Handle listing intent
    price = recommend_price(parsed["crop"], parsed["quantity"], parsed.get("quality", "B"), parsed["district"])
    listing = {
        "farmer_id": g.user_doc["_id"],
        "crop": parsed["crop"],
        "quantity": parsed["quantity"],
        "quality_grade": parsed.get("quality", "B"),
        "recommended_price_min": price["recommended_price_min"],
        "recommended_price_max": price["recommended_price_max"],
        "farmer_asking_price": price["target_price"],
        "status": "listed",
        "created_at": datetime.now(timezone.utc),
        "district": parsed["district"],
        "harvest_date": None,
        "basis_explanation": price["basis_explanation"],
        "channel": "sms_simulator",
    }
    db = get_db()
    listing["_id"] = db.listings.insert_one(listing).inserted_id
    body = confirmation_sms(listing, price)
    sms = adapter.send(farmer_phone, body)

    return jsonify(
        {
            "ok": True,
            "intent": "LIST",
            "listing_id": str(listing["_id"]),
            "price": price,
            "sms": sms,
            "parsed": parsed,
            "reply_text": body,
            "simulator": True,
            "badge": "Web Simulator (Production: MSG91).",
        }
    )
