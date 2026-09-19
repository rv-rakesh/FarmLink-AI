"""IVR prompt + STT/TTS parser. Bhashini adapter is a stub for later drop-in."""
import re
from google import genai
from config import Config

CROPS = {c.lower(): c for c in Config.CROPS}
GRADE_WORDS = {"a": "A", "b": "B", "c": "C", "grade a": "A", "grade b": "B", "grade c": "C"}

PROMPTS = {
    "en": {
        "welcome": "Namaste. This is FarmLink AI. Which crop are you selling? Wheat, Rice, Potato, Tomato, or Cotton.",
        "qty": "How many quintals do you have?",
        "grade": "What is the quality grade? A, B, or C.",
        "district": "Which district are you in?",
        "confirm": "I heard {crop}, {qty} quintals, grade {grade}, in {district}. Shall I get a fair price?",
        "price": "Recommended price is rupees {min_p} to {max_p} per quintal. {explanation}",
        "listed": "Your listing is live. Buyers will be matched shortly.",
        "retry": "Sorry, I did not understand. Please try again.",
    },
    "hi": {
        "welcome": "नमस्ते, यह फार्मलिंक एआई है। आप कौन सी फसल बेच रहे हैं? गेहूं, चावल, आलू, टमाटर या कपास।",
        "qty": "आपके पास कितने क्विंटल हैं?",
        "grade": "गुणवत्ता ग्रेड क्या है? ए, बी या सी।",
        "district": "आप किस जिले में हैं?",
        "confirm": "मैंने सुना: {crop}, {qty} क्विंटल, ग्रेड {grade}, {district}। क्या मैं उचित भाव निकालूँ?",
        "price": "सुझाया गया भाव {min_p} से {max_p} रुपये प्रति क्विंटल है। {explanation}",
        "listed": "आपकी लिस्टिंग लाइव है। खरीदार जल्द जोड़े जाएंगे।",
        "retry": "माफ़ कीजिए, समझ नहीं आया। फिर कोशिश करें।",
    },
    "mr": {
        "welcome": "नमस्कार, हे फार्मलिंक एआय आहे. तुम्ही कोणते पीक विकत आहात? गहू, तांदूळ, बटाटा, टोमॅटो किंवा कापूस.",
        "qty": "तुमच्याकडे किती क्विंटल आहेत?",
        "grade": "गुणवत्ता ग्रेड काय आहे? ए, बी किंवा सी.",
        "district": "तुम्ही कोणत्या जिल्ह्यात आहात?",
        "confirm": "मी ऐकले: {crop}, {qty} क्विंटल, ग्रेड {grade}, {district}. योग्य भाव काढू का?",
        "price": "सुचवलेला भाव {min_p} ते {max_p} रुपये प्रति क्विंटल आहे. {explanation}",
        "listed": "तुमची लिस्टिंग लाइव्ह आहे. खरेदीदार लवकरच जुळतील.",
        "retry": "माफ करा, समजले नाही. पुन्हा प्रयत्न करा.",
    },
}

CROP_ALIASES = {
    "wheat": "Wheat",
    "gehun": "Wheat",
    "gehūn": "Wheat",
    "गेहूं": "Wheat",
    "गहू": "Wheat",
    "rice": "Rice",
    "chawal": "Rice",
    "चावल": "Rice",
    "तांदूळ": "Rice",
    "potato": "Potato",
    "aloo": "Potato",
    "आलू": "Potato",
    "बटाटा": "Potato",
    "tomato": "Tomato",
    "tamatar": "Tomato",
    "टमाटर": "Tomato",
    "टोमॅटो": "Tomato",
    "cotton": "Cotton",
    "kapas": "Cotton",
    "कपास": "Cotton",
    "कापूस": "Cotton",
}


class BhashiniAdapterStub:
    """Production drop-in: replace speak/listen with Bhashini/Twilio APIs."""

    def transcribe(self, audio_or_text, language="en"):
        return str(audio_or_text or "").strip()

    def synthesize(self, text, language="en"):
        return {"tts_text": text, "provider": "bhashini_stub", "language": language}


def parse_crop(text):
    t = (text or "").strip().lower()
    if t in CROP_ALIASES:
        return CROP_ALIASES[t]
    for alias, crop in CROP_ALIASES.items():
        if alias in t:
            return crop
    return None


def parse_qty(text):
    m = re.search(r"(\d+(?:\.\d+)?)", text or "")
    return float(m.group(1)) if m else None


def parse_grade(text):
    t = (text or "").strip().lower()
    if t in GRADE_WORDS:
        return GRADE_WORDS[t]
    m = re.search(r"\b([abc])\b", t)
    return m.group(1).upper() if m else None


def parse_district(text):
    t = (text or "").strip()
    for d in Config.DISTRICTS:
        if d.lower() == t.lower() or d.lower() in t.lower():
            return d
    return t.title() if t else None


def prompt(lang, key, **kwargs):
    pack = PROMPTS.get(lang, PROMPTS["en"])
    return pack[key].format(**kwargs) if kwargs else pack[key]


def next_ivr_step(session, utterance, language="en"):
    """
    Gemini-powered NLU for FarmLink voice flow.
    Gemini extracts crop, quantity, grade, district and confirmation intent.
    """

    adapter = BhashiniAdapterStub()
    heard = adapter.transcribe(utterance, language)

    step = session.get("step", "welcome")
    data = session.get("data") or {}

    try:
        client = genai.Client(api_key=Config.GEMINI_API_KEY)

        prompt_text = f"""
You are the voice assistant for FarmLink AI, an agricultural marketplace.

The farmer said:
"{heard}"

Current conversation step:
"{step}"

Existing data:
{data}

Extract the information relevant to the current step.

Return ONLY valid JSON in this exact format:
{{
  "crop": null,
  "quantity": null,
  "grade": null,
  "district": null,
  "confirmed": null
}}

Rules:
- crop must be one of: Wheat, Rice, Potato, Tomato, Cotton
- quantity must be a number in quintals
- grade must be A, B, or C
- district should be the Indian district name if mentioned
- confirmed should be true only if the farmer clearly agrees
- use null when information is not present
"""

        response = client.models.generate_content(
            model="gemini-3.6-flash",",
            contents=prompt_text,
        )

        import json

        raw = response.text.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        extracted = json.loads(raw)

        if extracted.get("crop"):
            data["crop"] = extracted["crop"]

        if extracted.get("quantity") is not None:
            data["quantity"] = float(extracted["quantity"])

        if extracted.get("grade"):
            data["quality"] = extracted["grade"]

        if extracted.get("district"):
            data["district"] = extracted["district"]

        if step == "welcome":
            if data.get("crop"):
                return {
                    "step": "qty",
                    "data": data,
                    "reply": prompt(language, "qty"),
                }

            return {
                **session,
                "step": "welcome",
                "data": data,
                "reply": prompt(language, "retry"),
            }

        if step == "qty":
            if data.get("quantity") is not None:
                return {
                    "step": "grade",
                    "data": data,
                    "reply": prompt(language, "grade"),
                }

            return {
                **session,
                "step": "qty",
                "data": data,
                "reply": prompt(language, "retry"),
            }

        if step == "grade":
            if data.get("quality"):
                return {
                    "step": "district",
                    "data": data,
                    "reply": prompt(language, "district"),
                }

            return {
                **session,
                "step": "grade",
                "data": data,
                "reply": prompt(language, "retry"),
            }

        if step == "district":
            if data.get("district"):
                return {
                    "step": "confirm",
                    "data": data,
                    "reply": prompt(
                        language,
                        "confirm",
                        crop=data.get("crop"),
                        qty=data.get("quantity"),
                        grade=data.get("quality"),
                        district=data.get("district"),
                    ),
                }

            return {
                **session,
                "step": "district",
                "data": data,
                "reply": prompt(language, "retry"),
            }

        if step == "confirm":
            if extracted.get("confirmed") is True:
                return {
                    "step": "price",
                    "data": data,
                    "reply": None,
                    "ready_for_price": True,
                }

            return {
                "step": "welcome",
                "data": {},
                "reply": prompt(language, "welcome"),
            }

    except Exception as e:
        print("Gemini NLU error:", e)

        return {
            **session,
            "step": step,
            "data": data,
            "reply": prompt(language, "retry"),
        }
