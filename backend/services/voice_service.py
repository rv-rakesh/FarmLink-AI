"""FarmLink AI multilingual voice NLU / IVR state machine."""
import json
import re

from google import genai
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
        "end": "Thank you. The call is ending now.",
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
        "end": "धन्यवाद। कॉल अब समाप्त हो रही है।",
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
        "end": "धन्यवाद. कॉल आता समाप्त होत आहे.",
    },
}

CROP_ALIASES = {
    "wheat": "Wheat", "gehun": "Wheat", "gehūn": "Wheat", "गेहूं": "Wheat", "गहू": "Wheat",
    "rice": "Rice", "chawal": "Rice", "चावल": "Rice", "तांदूळ": "Rice",
    "potato": "Potato", "aloo": "Potato", "आलू": "Potato", "बटाटा": "Potato",
    "tomato": "Tomato", "tamatar": "Tomato", "टमाटर": "Tomato", "टोमॅटो": "Tomato",
    "cotton": "Cotton", "kapas": "Cotton", "कपास": "Cotton", "कापूस": "Cotton",
}

DISTRICT_ALIASES = {
    "nashik": "Nashik", "nasik": "Nashik", "नाशिक": "Nashik", "नासिक": "Nashik",
    "pune": "Pune", "पुणे": "Pune",
    "karnal": "Karnal", "करनाल": "Karnal",
    "ludhiana": "Ludhiana", "लुधियाना": "Ludhiana",
    "nagpur": "Nagpur", "नागपुर": "Nagpur", "नागपूर": "Nagpur",
    "ahmedabad": "Ahmedabad", "अहमदाबाद": "Ahmedabad",
    "indore": "Indore", "इंदौर": "Indore",
    "jaipur": "Jaipur", "जयपुर": "Jaipur",
    "hyderabad": "Hyderabad", "हैदराबाद": "Hyderabad",
    "bengaluru": "Bengaluru", "bangalore": "Bengaluru", "बेंगलुरु": "Bengaluru", "बंगलौर": "Bengaluru",
}

GRADE_ALIASES = {
    "a": "A", "grade a": "A", "ए": "A", "अ": "A",
    "b": "B", "grade b": "B", "बी": "B", "ब": "B",
    "c": "C", "grade c": "C", "सी": "C", "क": "C",
}

NUMBER_WORDS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "twenty five": 25, "twenty-five": 25,
    "fifty five": 55, "fifty-five": 55,
    "पाँच": 5, "पांच": 5, "दस": 10, "बीस": 20, "पच्चीस": 25,
    "तीस": 30, "चालीस": 40, "पचास": 50, "पचपन": 55,
    "पन्नास": 50, "पंचवीस": 25,
}

AFFIRMATIVE = {"yes", "yeah", "yep", "ok", "okay", "haan", "han", "हाँ", "हां", "हो", "होय", "ठीक", "ठीक है", "yes please"}
def normalize_confirmation(text):
    t = str(text or "").strip().lower()
    t = re.sub(r"[!?.,;:]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    if t in AFFIRMATIVE:
        return True
    if t in NEGATIVE:
        return False
    return None
NEGATIVE = {"no", "nope", "nah", "nahi", "नहीं", "नही", "नको", "नाही"}


class BhashiniAdapterStub:
    """Compatibility adapter retained for routes/voice.py imports."""

    def transcribe(self, audio_or_text, language="en"):
        return str(audio_or_text or "").strip()

    def synthesize(self, text, language="en"):
        return {"tts_text": text, "provider": "bhashini_stub", "language": language}


def prompt(lang, key, **kwargs):
    lang = lang if lang in LANGS else "en"
    return PROMPTS[lang][key].format(**kwargs)


def normalize_crop(value):
    t = str(value or "").strip().lower()
    if not t:
        return None
    if t in CROP_ALIASES:
        return CROP_ALIASES[t]
    for alias, crop in CROP_ALIASES.items():
        if alias in t:
            return crop
    return None


def normalize_grade(value):
    t = str(value or "").strip().lower()
    if not t:
        return None
    if t in GRADE_ALIASES:
        return GRADE_ALIASES[t]
    m = re.search(r"(?:grade\s*)?\b([abc])\b", t)
    return m.group(1).upper() if m else None


def normalize_district(value):
    t = str(value or "").strip()
    if not t:
        return None
    low = t.lower()
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
    if value in LANGS:
        return value
    return requested if requested in LANGS else "en"


def parse_quantity_locally(text):
    text = str(text or "").strip().lower()
    m = re.search(r"(\d+(?:\.\d+)?)", text)
    if m:
        value = float(m.group(1))
    else:
        value = None
        # Longest phrase first so "twenty five" beats "five".
        for phrase, number in sorted(NUMBER_WORDS.items(), key=lambda item: len(item[0]), reverse=True):
            if phrase in text:
                value = float(number)
                break
    if value is None:
        return None

    if re.search(r"\b(?:kg|kgs|kilogram|kilograms|किलो|किलोग्राम)\b", text):
        return value / 100.0
    if re.search(r"\b(?:ton|tons|tonne|tonnes|टन)\b", text):
        return value * 10.0
    return value


def extract_local(heard, language):
    text = str(heard or "").strip().lower()
    result = {
        "crop": normalize_crop(text),
        "quantity": parse_quantity_locally(text),
        "quantity_unit": "quintal",
        "grade": normalize_grade(text),
        "district": normalize_district(text),
        "confirmed": normalize_confirmation(text),
        "language": language if language in LANGS else "en",
    }
    if result["quantity"] is not None:
        if re.search(r"\b(?:kg|kgs|kilogram|kilograms|किलो|किलोग्राम)\b", text):
            result["quantity_unit"] = "kg"
        elif re.search(r"\b(?:ton|tons|tonne|tonnes|टन)\b", text):
            result["quantity_unit"] = "ton"
    return result


def parse_gemini_json(text):
    raw = str(text or "").strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            return json.loads(raw[start:end + 1])
        raise


def gemini_extract(heard, step, data, requested_language):
    api_key = str(getattr(Config, "GEMINI_API_KEY", "") or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)

    instructions = f"""
You are the real natural-language understanding (NLU) layer for FarmLink AI.
The farmer may speak English, Hindi, Marathi, Hinglish, transliterated Hindi/Marathi,
or use Devanagari. Extract entities from the farmer's utterance for a phone IVR.

Current step: {step}
Requested UI language: {requested_language}
Existing collected data: {json.dumps(data, ensure_ascii=False)}
Farmer utterance: {heard!r}

Return ONLY one JSON object with these keys:
crop, quantity, quantity_unit, grade, district, confirmed, language

Rules:
- crop: ONLY Wheat, Rice, Potato, Tomato, Cotton, otherwise null.
- Recognize regional words such as आलू/बटाटा, टमाटर/टोमॅटो, गेहूं/गहू, कपास/कापूस.
- quantity: numeric quantity. Understand spoken number words too. Otherwise null.
- quantity_unit: quintal, kg, or ton. If the farmer says only a number, use quintal.
- grade: A, B, or C, including ए/अ, बी/ब, सी/क.
- district: canonical Indian district name when mentioned, otherwise null.
- confirmed: true only for a clear yes such as yes, हाँ, हो, होय, ठीक है; false only for a clear no such as no, नहीं, नको, नाही; otherwise null.
- language: en for English, hi for Hindi/Hinglish, mr for Marathi.
- Never invent values that were not said.
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=instructions,
    )
    result = parse_gemini_json(response.text)
    if not isinstance(result, dict):
        raise ValueError("Gemini did not return an object")
    return result


def format_qty(value):
    if value is None:
        return ""
    f = float(value)
    return str(int(f)) if f.is_integer() else f"{f:.2f}".rstrip("0").rstrip(".")


DISPLAY_NAMES = {
    "mr": {
        "Wheat": "गहू", "Rice": "तांदूळ", "Potato": "बटाटा",
        "Tomato": "टोमॅटो", "Cotton": "कापूस",
        "A": "ए", "B": "बी", "C": "सी",
        "Vijayawada": "विजयवाडा",
    },
    "hi": {
        "Wheat": "गेहूं", "Rice": "चावल", "Potato": "आलू",
        "Tomato": "टमाटर", "Cotton": "कपास",
        "A": "ए", "B": "बी", "C": "सी",
        "Vijayawada": "विजयवाड़ा",
    },
}

def display_value(value, language):
    return DISPLAY_NAMES.get(language, {}).get(str(value), value)


def next_ivr_step(session, utterance, language="en"):
    """Advance the voice IVR one turn. Gemini is primary; deterministic parsing is only a recovery path."""
    session = session or {}
    step = session.get("step", "welcome")
    data = dict(session.get("data") or {})
    retries = int(session.get("retries", 0) or 0)
    requested_lang = language if language in LANGS else "en"
    heard = str(utterance or "").strip()

    if step == "ended":
        return {
            **session,
            "step": "ended",
            "end_call": True,
            "reply": prompt(requested_lang, "end"),
            "language": requested_lang,
        }

    if not heard:
        return {
            **session,
            "step": step,
            "data": data,
            "retries": retries,
            "reply": prompt(requested_lang, "welcome" if step == "welcome" else "retry"),
            "language": requested_lang,
        }

    try:
        extracted = gemini_extract(heard, step, data, requested_lang)
        # Always allow exact/local normalization to clean up Gemini's entity spelling.
        local = extract_local(heard, requested_lang)
        lang = normalize_language(extracted.get("language"), requested_lang)

        crop = normalize_crop(extracted.get("crop")) or local.get("crop")
        if crop:
            data["crop"] = crop

        raw_qty = extracted.get("quantity")
        unit = extracted.get("quantity_unit") or "quintal"
        try:
            qty = float(raw_qty) if raw_qty is not None else None
        except (TypeError, ValueError):
            qty = None
        if qty is not None:
            if unit == "kg":
                qty /= 100.0
            elif unit == "ton":
                qty *= 10.0
            data["quantity"] = qty
        elif local.get("quantity") is not None:
            data["quantity"] = local["quantity"]

        grade = normalize_grade(extracted.get("grade")) or local.get("grade")
        if grade:
            data["quality"] = grade

        district = normalize_district(extracted.get("district")) or local.get("district")
        if district:
            data["district"] = district

        retries = 0

        if step == "welcome":
            if data.get("crop"):
                return {"step": "qty", "data": data, "retries": 0, "reply": prompt(lang, "qty"), "language": lang}

        elif step == "qty":
            if data.get("quantity") is not None and data["quantity"] > 0:
                return {"step": "grade", "data": data, "retries": 0, "reply": prompt(lang, "grade"), "language": lang}

        elif step == "grade":
            if data.get("quality"):
                return {"step": "district", "data": data, "retries": 0, "reply": prompt(lang, "district"), "language": lang}

        elif step == "district":
            if data.get("district"):
                return {
                    "step": "confirm",
                    "data": data,
                    "retries": 0,
                    "reply": prompt(
                        lang,
                        "confirm",
                        crop=display_value(data.get("crop"), lang),
                        qty=format_qty(data.get("quantity")),
                        grade=display_value(data.get("quality"), lang),
                        district=display_value(data.get("district"), lang),
                    ),
                    "language": lang,
                }

        elif step == "confirm":
            # Keep the farmer's selected language. A reply such as "Yes" must
            # not switch the IVR to English.
            lang = requested_lang
            confirmed = normalize_confirmation(heard)
            if confirmed is None:
                confirmed = local.get("confirmed")
            if confirmed is None:
                confirmed = extracted.get("confirmed")

            if confirmed is True:
                return {
                    "step": "price",
                    "data": data,
                    "retries": 0,
                    "reply": None,
                    "ready_for_price": True,
                    "language": requested_lang,
                }
            if confirmed is False:
                return {
                    "step": "welcome",
                    "data": {},
                    "retries": 0,
                    "reply": prompt(requested_lang, "no"),
                    "language": requested_lang,
                }

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

        return {"step": step, "data": data, "retries": retries, "reply": prompt(lang, "retry"), "language": lang}

    except Exception as exc:
        # Keep the IVR usable if Gemini temporarily fails, while retaining Gemini as the primary NLU.
        print("Gemini NLU error:", repr(exc))
        local = extract_local(heard, requested_lang)

        if step == "welcome" and local.get("crop"):
            data["crop"] = local["crop"]
            return {"step": "qty", "data": data, "retries": 0, "reply": prompt(requested_lang, "qty"), "language": requested_lang}

        if step == "qty" and local.get("quantity") is not None and local["quantity"] > 0:
            data["quantity"] = local["quantity"]
            return {"step": "grade", "data": data, "retries": 0, "reply": prompt(requested_lang, "grade"), "language": requested_lang}

        if step == "grade" and local.get("grade"):
            data["quality"] = local["grade"]
            return {"step": "district", "data": data, "retries": 0, "reply": prompt(requested_lang, "district"), "language": requested_lang}

        if step == "district" and local.get("district"):
            data["district"] = local["district"]
            return {
                "step": "confirm",
                "data": data,
                "retries": 0,
                "reply": prompt(
                    requested_lang,
                    "confirm",
                    crop=display_value(data.get("crop"), requested_lang),
                    qty=format_qty(data.get("quantity")),
                    grade=display_value(data.get("quality"), requested_lang),
                    district=display_value(data.get("district"), requested_lang),
                ),
                "language": requested_lang,
            }

        retries += 1
        if retries >= 2:
            return {
                "step": "ended",
                "data": data,
                "retries": retries,
                "end_call": True,
                "reply": prompt(requested_lang, "retry_final"),
                "language": requested_lang,
            }

        return {
            "step": step,
            "data": data,
            "retries": retries,
            "reply": prompt(requested_lang, "retry"),
            "language": requested_lang,
        }
