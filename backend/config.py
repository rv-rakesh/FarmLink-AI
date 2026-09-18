import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-me")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/farmlink_ai")
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    PROXIMITY_KM = 400.0
    PERISHABLE_CROPS = {"Tomato", "Potato"}
    WASTAGE_HOURS = 24
    GRADE_MULTIPLIERS = {"A": 1.15, "B": 1.00, "C": 0.85}
    CROPS = ["Wheat", "Rice", "Potato", "Tomato", "Cotton"]
    DISTRICTS = {
        "Nashik": {"lat": 19.9975, "lng": 73.7898},
        "Pune": {"lat": 18.5204, "lng": 73.8567},
        "Karnal": {"lat": 29.6857, "lng": 76.9905},
        "Ludhiana": {"lat": 30.9010, "lng": 75.8573},
        "Nagpur": {"lat": 21.1458, "lng": 79.0882},
        "Ahmedabad": {"lat": 23.0225, "lng": 72.5714},
        "Indore": {"lat": 22.7196, "lng": 75.8577},
        "Jaipur": {"lat": 26.9124, "lng": 75.7873},
        "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
        "Bengaluru": {"lat": 12.9716, "lng": 77.5946},
    }
    HUB_LOCATION = {"lat": 21.1458, "lng": 79.0882, "name": "FarmLink Hub"}

    # ── External Services ──────────────────────────────────────────────────────
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    # Public demo key for data.gov.in Agmarknet API (rate-limited)
    AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY", "")
    FARMLINK_SMS_NUMBER = os.getenv("FARMLINK_SMS_NUMBER", "+91-9000-346-276")

    # ── OTP ───────────────────────────────────────────────────────────────────
    OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))

    # ── Verification ──────────────────────────────────────────────────────────
    # Minimum verification level to create a listing (1 = mobile verified)
    LISTING_MIN_VERIFICATION_LEVEL = int(os.getenv("LISTING_MIN_VERIFICATION_LEVEL", "1"))
    # Minimum level before contact details are revealed (4 = fully verified)
    CONTACT_MIN_VERIFICATION_LEVEL = int(os.getenv("CONTACT_MIN_VERIFICATION_LEVEL", "4"))
    # Quantity that triggers auto risk-flag for unverified farmers
    SUSPICIOUS_QUANTITY_THRESHOLD = float(os.getenv("SUSPICIOUS_QUANTITY_THRESHOLD", "500"))

    # ── Trust Score Weights ────────────────────────────────────────────────────
    TRUST_SCORE_WEIGHTS = {
        "farmer": {
            "phone_verified": 10,
            "identity_verified": 20,
            "agricultural_verified": 30,
            "govt_source_match": 20,
            "fpo_cooperative": 10,
            "completed_transactions": 10,
        },
        "buyer": {
            "phone_verified": 10,
            "identity_verified": 20,
            "business_reg_verified": 30,
            "identity_business_match": 20,
            "successful_transactions": 10,
            "positive_transactions": 10,
        },
    }
