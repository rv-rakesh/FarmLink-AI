from datetime import datetime, timezone
from flask import Blueprint, g, jsonify, request

from database import get_db
from routes.auth import current_user_required
from services.voice_service import next_ivr_step, prompt, BhashiniAdapterStub
from services.pricing_service import recommend_price

bp = Blueprint("voice", __name__)
_sessions = {}


@bp.post("/ingest")
@current_user_required(roles=["farmer"])
def ingest():
    data = request.get_json() or {}
    language = data.get("language") or g.user.get("language_preference") or "en"
    utterance = data.get("utterance") or data.get("text") or ""
    reset = data.get("reset")
    sid = str(g.user["id"])
    if reset or sid not in _sessions:
        _sessions[sid] = {"step": "welcome", "data": {}, "reply": prompt(language, "welcome")}
        if reset and not utterance:
            adapter = BhashiniAdapterStub()
            tts = adapter.synthesize(_sessions[sid]["reply"], language)
            return jsonify({**_sessions[sid], "tts": tts, "simulator": True})

    result = next_ivr_step(_sessions[sid], utterance, language)
    adapter = BhashiniAdapterStub()

    if result.get("ready_for_price"):
        d = result["data"]
        price = recommend_price(d["crop"], d["quantity"], d["quality"], d["district"])
        asking = price["target_price"]
        db = get_db()
        listing = {
            "farmer_id": g.user_doc["_id"],
            "crop": d["crop"],
            "quantity": d["quantity"],
            "quality_grade": d["quality"],
            "recommended_price_min": price["recommended_price_min"],
            "recommended_price_max": price["recommended_price_max"],
            "farmer_asking_price": asking,
            "status": "listed",
            "created_at": datetime.now(timezone.utc),
            "district": d["district"],
            "harvest_date": None,
            "basis_explanation": price["basis_explanation"],
            "channel": "voice_simulator",
        }
        listing["_id"] = db.listings.insert_one(listing).inserted_id
        reply = prompt(
            language,
            "price",
            min_p=price["recommended_price_min"],
            max_p=price["recommended_price_max"],
            explanation=price["basis_explanation"],
        )
        listed = prompt(language, "listed")
        full = f"{reply} {listed}"
        _sessions[sid] = {"step": "welcome", "data": {}}
        tts = adapter.synthesize(full, language)
        return jsonify(
            {
                "step": "done",
                "reply": full,
                "tts": tts,
                "price": price,
                "listing_id": str(listing["_id"]),
                "simulator": True,
                "badge": "Web Simulator (Production: Bhashini/Twilio).",
            }
        )

    _sessions[sid] = result
    tts = adapter.synthesize(result["reply"], language)
    return jsonify({**result, "tts": tts, "simulator": True, "badge": "Web Simulator (Production: Bhashini/Twilio)."})
