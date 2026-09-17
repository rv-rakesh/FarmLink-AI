"""
Enhanced Natural Language SMS service for FarmLink AI.
Supports both Gemini NLU (when API key is present) and an intelligent
rule-based fallback parser that understands conversational Hindi/English queries.
"""
import json
import logging
import re
import urllib.request
from config import Config

logger = logging.getLogger(__name__)


class Msg91AdapterStub:
    """Production drop-in: send SMS via MSG91 without changing route handlers."""

    def send(self, to_phone, body):
        return {
            "provider": "msg91_stub",
            "to": to_phone,
            "body": body,
            "status": "simulated_sent",
        }


LIST_RE = re.compile(
    r"^\s*LIST\s+(\w+)\s+(\d+(?:\.\d+)?)\s+([ABC])\s+([A-Za-z]+)\s*$",
    re.IGNORECASE,
)

CROP_ALIASES = {
    "wheat": "Wheat", "gehun": "Wheat", "gehu": "Wheat", "गेहूं": "Wheat", "गहू": "Wheat",
    "rice": "Rice", "chawal": "Rice", "paddy": "Rice", "चावल": "Rice", "तांदूळ": "Rice",
    "potato": "Potato", "aloo": "Potato", "alu": "Potato", "आलू": "Potato", "बटाटा": "Potato",
    "tomato": "Tomato", "tamatar": "Tomato", "टमाटर": "Tomato", "टोमॅटो": "Tomato",
    "cotton": "Cotton", "kapas": "Cotton", "कपास": "Cotton", "कापूस": "Cotton",
}


def _try_gemini_nlu(text: str) -> dict | None:
    """Attempt natural language extraction via Gemini API."""
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        return None

    prompt = f"""You are FarmLink AI SMS assistant. Extract intent and parameters from this farmer SMS message:
"{text}"

Recognized crops: Wheat, Rice, Potato, Tomato, Cotton.
Recognized districts: Nashik, Pune, Karnal, Ludhiana, Nagpur, Ahmedabad, Indore, Jaipur, Hyderabad, Bengaluru.
Recognized intents: "LIST" (want to sell/list crops), "PRICE" (asking for crop price/rate), "HELP" (greeting or asking for info).

Return ONLY a strict JSON object (no markdown, no backticks) with:
{{
  "intent": "LIST" or "PRICE" or "HELP",
  "crop": "<Crop or null>",
  "quantity": <number or null>,
  "quality": "A" or "B" or "C" (default "B"),
  "district": "<District or null>"
}}"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode())
            raw_text = res["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Clean possible markdown fence
            raw_text = re.sub(r"^```json\s*", "", raw_text)
            raw_text = re.sub(r"```$", "", raw_text).strip()
            return json.loads(raw_text)
    except Exception as e:
        logger.debug(f"Gemini SMS NLU fallback: {e}")
        return None


def parse_sms_command(text: str) -> dict:
    raw = (text or "").strip()
    if not raw:
        return {"ok": False, "error": "Empty message. Send 'HELP' for instructions."}

    # 1. Check fixed LIST regex format first
    m = LIST_RE.match(raw)
    if m:
        crop_key, qty, grade, district = m.groups()
        crop = CROP_ALIASES.get(crop_key.lower()) or crop_key.capitalize()
        if crop not in Config.CROPS:
            return {"ok": False, "error": f"Unknown crop. Choose from: {', '.join(Config.CROPS)}"}
        dist_match = next((d for d in Config.DISTRICTS if d.lower() == district.lower()), district.title())
        return {
            "ok": True,
            "intent": "LIST",
            "command": "LIST",
            "crop": crop,
            "quantity": float(qty),
            "quality": grade.upper(),
            "district": dist_match,
        }

    # 2. Try Gemini API
    gemini_res = _try_gemini_nlu(raw)
    if gemini_res and gemini_res.get("intent"):
        intent = gemini_res.get("intent", "").upper()
        crop = gemini_res.get("crop")
        if crop and crop in Config.CROPS:
            if intent == "PRICE":
                return {
                    "ok": True,
                    "intent": "PRICE",
                    "crop": crop,
                    "district": gemini_res.get("district") or "Nashik",
                }
            elif intent == "LIST" and gemini_res.get("quantity"):
                return {
                    "ok": True,
                    "intent": "LIST",
                    "command": "LIST",
                    "crop": crop,
                    "quantity": float(gemini_res["quantity"]),
                    "quality": gemini_res.get("quality", "B"),
                    "district": gemini_res.get("district") or "Nashik",
                }

    # 3. Intelligent rule-based fallback
    lower = raw.lower()

    # Identify Crop
    matched_crop = None
    for alias, standard_crop in CROP_ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", lower):
            matched_crop = standard_crop
            break

    # Identify District
    matched_district = "Nashik"
    for d in Config.DISTRICTS:
        if d.lower() in lower:
            matched_district = d
            break

    # Price enquiry detection
    if any(w in lower for w in ["price", "rate", "bhav", "bhaw", "bhaav", "bhav kitna", "rate kya", "today"]):
        if matched_crop:
            return {
                "ok": True,
                "intent": "PRICE",
                "crop": matched_crop,
                "district": matched_district,
            }

    # Quantity detection (e.g. 50 quintal, 50q, 50 ton)
    qty_m = re.search(r"(\d+(?:\.\d+)?)\s*(?:quintals?|q|tons?|quintal|क्विंटल)?", lower)
    qty = float(qty_m.group(1)) if qty_m else None

    # Quality grade detection
    grade = "B"
    if "grade a" in lower or "quality a" in lower or " a grade" in lower:
        grade = "A"
    elif "grade c" in lower or "quality c" in lower:
        grade = "C"

    # If crop and quantity found -> list
    if matched_crop and qty and qty > 0:
        return {
            "ok": True,
            "intent": "LIST",
            "command": "LIST",
            "crop": matched_crop,
            "quantity": qty,
            "quality": grade,
            "district": matched_district,
        }

    # If only crop found -> assume price inquiry
    if matched_crop:
        return {
            "ok": True,
            "intent": "PRICE",
            "crop": matched_crop,
            "district": matched_district,
        }

    return {
        "ok": False,
        "error": "Could not understand. Examples:\n- 'Sell 50 quintal wheat in Nashik'\n- 'Today tomato price in Pune'\n- 'LIST WHEAT 50 A NASHIK'",
    }


def confirmation_sms(listing, price):
    return (
        f"FarmLink: {listing['crop']} {listing['quantity']}q listed! "
        f"AI Fair Band: ₹{price['recommended_price_min']} - ₹{price['recommended_price_max']}/q. "
        f"Listing ID #{str(listing['_id'])[-6:].upper()}."
    )


def price_enquiry_sms(crop, district, price_rec):
    return (
        f"FarmLink Mandi Rate: {crop} in {district} is currently trading at "
        f"₹{price_rec['target_price']}/q (Band ₹{price_rec['recommended_price_min']} - ₹{price_rec['recommended_price_max']}/q). "
        f"Call {Config.FARMLINK_SMS_NUMBER} to sell directly to verified buyers."
    )
