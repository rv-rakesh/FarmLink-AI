"""FarmLink AI multilingual voice NLU / IVR state machine."""
import json
import re
from google import genai
from google.genai import types
from config import Config

MODEL = "gemini-3.8-flash"
LANGS = {"en", "hi", "mr"}

PROMPTS = {
    "en": {
        "welcome": "Namaste. This is FarmLink AI. Which crop are you selling? Wheat, Rice, Potato, Tomato, or Cotton.",
        "qty": "How many quintals do you have?",
        "grade": "What is the quality grade? A, B, or C.",
        "district": "Which district are you in?",
        "confirm": "I heard {crop}, {qty} quintals, grade {grade}, in {district}. Shall I get a fair price?",
        "retry": "Sorry, I did not understand. Please say that again.",
        "retry_final": "I could not understand that after two tries. The call is ending. Please start a new call and try again.",
        "no": "Okay. Let us start again. Which crop are you selling?",
    },
    "hi": {
        "welcome": "नमस्ते, यह फार्मलिंक एआई है। आप कौन सी फसल बेच रहे हैं? गेहूं, चावल, आलू, टमाटर या कपास।",
        "qty": "आपके पास कितने क्विंटल हैं?",
        "grade": "गुणवत्ता ग्रेड क्या है? ए, बी या सी।",
        "district": "आप किस जिले में हैं?",
        "confirm": "मैंने सुना: {crop}, {qty} क्विंटल, ग्रेड {grade}, {district}। क्या मैं उचित भाव निकालूँ?",
        "retry": "माफ़ कीजिए, समझ नहीं आया। कृपया फिर से बोलें।",
        "retry_final": "दो कोशिशों के बाद भी आपकी बात समझ नहीं आई। कॉल समाप्त हो रही है। कृपया नई कॉल शुरू करके फिर कोशिश करें।",
        "no": "ठीक है। फिर से शुरू करते हैं। आप कौन सी फसल बेच रहे हैं?",
    },
    "mr": {
        "welcome": "नमस्कार, हे फार्मलिंक एआय आहे. तुम्ही कोणते पीक विकत आहात? गहू, तांदूळ, बटाटा, टोमॅटो किंवा कापूस.",
        "qty": "तुमच्याकडे किती क्विंटल आहेत?",
        "grade": "गुणवत्ता ग्रेड काय आहे? ए, बी किंवा सी.",
        "district": "तुम्ही कोणत्या जिल्ह्यात आहात?",
        "confirm": "मी ऐकले: {crop}, {qty} क्विंटल, ग्रेड {grade}, {district}. योग्य भाव काढू का?",
        "retry": "माफ करा, समजले नाही. कृपया पुन्हा बोला.",
        "retry_final": "दोन प्रयत्नांनंतरही तुमचे बोलणे समजले नाही. कॉल संपत आहे. कृपया नवीन कॉल सुरू करून पुन्हा प्रयत्न करा.",
        "no": "ठीक आहे. पुन्हा सुरू करूया. तुम्ही कोणते पीक विकत आहात?",
    },
}

CROP_ALIASES = {
    "wheat": "Wheat", "गेहूं": "Wheat", "गहू": "Wheat",
    "gehun": "Wheat", "rice": "Rice", "चावल": "Rice", "तांदूळ": "Rice",
    "chawal": "Rice", "potato": "Potato", "आलू": "Potato", "बटाटा": "Potato",
    "aloo": "Potato", "tomato": "Tomato", "टमाटर": "Tomato", "टोमॅटो": "Tomato",
    "tamatar": "Tomato", "cotton": "Cotton", "कपास": "Cotton", "कापूस": "Cotton",
    "kapas": "Cotton",
}

GRADE_ALIASES = {
    "a": "A", "b": "B", "c": "C", "grade a": "A", "grade b": "B",
    "grade c": "C", "ए": "A", "बी": "B", "सी": "C", "अ": "A", "ब": "B", "क": "C",
}

DISTRICT_ALIASES = {
    "nashik": "Nashik", "nasik": "Nashik", "नाशिक": "Nashik", "नासिक": "Nashik",
    "pune": "Pune", "पुणे": "Pune", "karnal": "Karnal", "करनाल": "Karnal",
    "ludhiana": "Ludhiana", "लुधियाना": "Ludhiana", "nagpur": "Nagpur",
    "नागपूर": "Nagpur", "नागपुर": "Nagpur", "ahmedabad": "Ahmedabad",
    "अहमदाबाद": "Ahmedabad", "indore": "Indore", "इंदौर": "Indore",
    "jaipur": "Jaipur", "जयपुर": "Jaipur", "hyderabad": "Hyderabad",
    "हैदराबाद": "Hyderabad", "bengaluru": "Bengaluru", "bangalore": "Bengaluru",
    "बेंगलुरु": "Bengaluru", "बंगलौर": "Bengaluru",
}

SCHEMA = {
    "type": "object",
    "properties": {
        "crop": {"type": ["string", "null"]},
        "quantity": {"type": ["number", "null"]},
        "quantity_unit": {"type": ["string", "null"], "enum": ["quintal", "kg", "ton", None]},
        "grade": {"type": ["string", "null"], "enum": ["A", "B", "C", None]},
        "district": {"type": ["string", "null"]},
        "confirmed": {"type": ["boolean", "null"]},
        "language": {"type": "string", "enum": ["en", "hi", "mr"]},
    },
    "required": ["crop", "quantity", "quantity_unit", "grade", "district", "confirmed", "language"],
    "additionalProperties": False,
}


def prompt(lang, key, **kwargs):
    return PROMPTS.get(lang, PROMPTS["en"])[key].format(**kwargs)


def normalize_crop(value):
    t = str(value or "").strip().lower()
    if t in CROP_ALIASES:
        return CROP_ALIASES[t]
    for alias, crop in CROP_ALIASES.items():
        if alias in t:
            return crop
    return None


def normalize_grade(value):
    t = str(value or "").strip().lower()
    if t in GRADE_ALIASES:
        return GRADE_ALIASES[t]
    m = re.search(r"\b([abc])\b", t)
    return m.group(1).upper() if m else None


def normalize_district(value):
    t = str(value or "").strip()
    low = t.lower()
    if not t:
        return None
    if low in DISTRICT_ALIASES:
        return DISTRICT_ALIASES[low]
    for alias, district in DISTRICT_ALIASES.items():
        if alias in low:
            return district
    for district in getattr(Config, "DISTRICTS", []):
        if district.lower() in low:
            return district
    return t


def normalize_language(value, requested):
    value = str(value or "").strip().lower()
    return value if value in LANGS else (requested if requested in LANGS else "en")


def normalize_quantity(value, unit):
    if value is None:
        return None
    try:
        qty = float(value)
    except (TypeError, ValueError):
        return None
    unit = str(unit or "quintal").lower()
    if unit == "kg":
        qty /= 100.0
    elif unit == "ton":
        qty *= 10.0
    return qty


def format_qty(value):
    if value is None:
        return ""
    return str(int(value)) if float(value).is_integer() else f"{value:.2f}".rstrip("0").rstrip(".")


def gemini_extract(heard, step, data, requested_language):
    api_key = str(getattr(Config, "GEMINI_API_KEY", "") or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
    contents = f"""
You are the natural-language understanding layer for FarmLink AI, a farmer voice assistant in India.

Farmer utterance:
{heard!r}

Current IVR step:
{step!r}

Already collected:
{json.dumps(data, ensure_ascii=False)}

Extract only what the farmer actually said. Do not invent missing values.
The farmer may speak Hindi, Marathi, Hinglish, English, transliterated Hindi/Marathi,
or mixed language.

Rules:
- Crop must be one of Wheat, Rice, Potato, Tomato, Cotton.
- Understand regional crop names such as टमाटर / टोमॅटो, गेहूं / गहू, आलू / बटाटा, कपास / कापूस.
- Understand number words such as पचास, पन्नास, पंचवीस, fifty, twenty five.
- quantity_unit must be quintal, kg, or ton. If no unit is spoken, use quintal.
- confirmed=true only for a clear yes (yes, हाँ, हो, होय, ठीक है).
- confirmed=false only for a clear no (no, नहीं, नको).
- language is the language actually spoken: English=en, Hindi/Hinglish=hi, Marathi=mr.
- Return canonical English district names when possible.
"""
    response = client.models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SCHEMA,
            temperature=0.0,
            max_output_tokens=300,
        ),
    )
    raw = (response.text or "").strip()
    if not raw:
        raise ValueError("Gemini returned an empty response")
    result = json.loads(raw)
    if not isinstance(result, dict):
        raise ValueError("Gemini returned invalid JSON")
    return result


def next_ivr_step(session, utterance, language="en"):
    """Advance the voice conversation using Gemini for NLU."""
    heard = str(utterance or "").strip()
    step = session.get("step", "welcome")
    data = dict(session.get("data") or {})
    retries = int(session.get("retries", 0) or 0)

    if not heard:
        return {
            **session,
            "step": step,
            "data": data,
            "retries": retries,
            "reply": prompt(language if language in LANGS else "en", "welcome" if step == "welcome" else "retry"),
        }

    try:
        extracted = gemini_extract(heard, step, data, language)
        lang = normalize_language(extracted.get("language"), language)

        crop = normalize_crop(extracted.get("crop"))
        if crop:
            data["crop"] = crop

        qty = normalize_quantity(extracted.get("quantity"), extracted.get("quantity_unit"))
        if qty is not None:
            data["quantity"] = qty

        grade = normalize_grade(extracted.get("grade"))
        if grade:
            data["quality"] = grade

        district = normalize_district(extracted.get("district"))
        if district:
            data["district"] = district

        retries = 0

        if step == "welcome" and data.get("crop"):
            return {"step": "qty", "data": data, "retries": 0, "reply": prompt(lang, "qty"), "language": lang}

        if step == "qty" and data.get("quantity") is not None and data["quantity"] > 0:
            return {"step": "grade", "data": data, "retries": 0, "reply": prompt(lang, "grade"), "language": lang}

        if step == "grade" and data.get("quality"):
            return {"step": "district", "data": data, "retries": 0, "reply": prompt(lang, "district"), "language": lang}

        if step == "district" and data.get("district"):
            return {
                "step": "confirm",
                "data": data,
                "retries": 0,
                "reply": prompt(lang, "confirm", crop=data["crop"], qty=format_qty(data["quantity"]),
                                grade=data["quality"], district=data["district"]),
                "language": lang,
            }

        if step == "confirm":
            if extracted.get("confirmed") is True:
                return {"step": "price", "data": data, "retries": 0, "reply": None,
                        "ready_for_price": True, "language": lang}
            if extracted.get("confirmed") is False:
                return {"step": "welcome", "data": {}, "retries": 0,
                        "reply": prompt(lang, "no"), "language": lang}

        retries += 1
        if retries >= 2:
            return {
                "step": "ended",
                "data": data,
                "retries": retries,
                "end_call": True,
                "reply": prompt(lang, "retry_final"),
                "language": lang,
            }

        return {"step": step, "data": data, "retries": retries,
                "reply": prompt(lang, "retry"), "language": lang}

    except Exception as exc:
        print("Gemini NLU error:", repr(exc))
        retries += 1
        reply_lang = language if language in LANGS else "en"

        if retries >= 2:
            return {
                "step": "ended",
                "data": data,
                "retries": retries,
                "end_call": True,
                "reply": prompt(reply_lang, "retry_final"),
                "language": reply_lang,
            }

        return {
            **session,
            "step": step,
            "data": data,
            "retries": retries,
            "reply": prompt(reply_lang, "retry"),
            "language": reply_lang,
        }
