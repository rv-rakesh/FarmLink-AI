from datetime import datetime, timedelta, timezone
from functools import wraps
import re
import jwt
from bson import ObjectId
from flask import Blueprint, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from config import Config
from database import get_db

bp = Blueprint("auth", __name__)


def serialize_user(doc, role):
    if not doc:
        return None
    base = {
        "id": str(doc["_id"]),
        "role": role,
        "name": doc.get("name") or doc.get("business_name"),
        "phone": doc.get("phone"),
        "district": doc.get("district") or (doc.get("location") or {}).get("district"),
    }

    # Attach verification info for farmers & buyers
    if role in ("farmer", "buyer"):
        try:
            from services.verification_service_v2 import (
                get_or_create_verif_doc,
                compute_verification_level,
                compute_overall_status,
            )
            verif = get_or_create_verif_doc(doc["_id"], role)
            level = compute_verification_level(verif, role)
            status = compute_overall_status(verif, role)
            base["verification_status"] = status
            base["verification_level"] = level
            base["trust_score"] = verif.get("trust_score", 0)
            base["phone_verified"] = bool(verif.get("phone_verified"))
            base["is_verified"] = (level == 4)
        except Exception:
            base["verification_status"] = "PENDING"
            base["verification_level"] = 0
            base["trust_score"] = 0
            base["phone_verified"] = False
            base["is_verified"] = False

    if role == "farmer":
        base.update(
            {
                "village": doc.get("village"),
                "language_preference": doc.get("language_preference"),
                "bank_account_ref": doc.get("bank_account_ref"),
            }
        )
    if role == "buyer":
        base.update(
            {
                "business_name": doc.get("business_name"),
                "gstin": doc.get("gstin"),
                "verified": base.get("is_verified", False),
                "demand_profile": doc.get("demand_profile") or [],
                "location": doc.get("location"),
            }
        )
    if role == "admin":
        base["verification_status"] = "VERIFIED"
        base["verification_level"] = 4
        base["trust_score"] = 100
        base["is_verified"] = True

    return base


def make_token(user_id, role):
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def current_user_required(roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Bearer "):
                return jsonify({"error": "Missing token"}), 401
            token = header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            except jwt.PyJWTError:
                return jsonify({"error": "Invalid token"}), 401
            role = payload.get("role")
            if roles and role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            db = get_db()
            oid = ObjectId(payload["sub"])
            if role == "farmer":
                doc = db.farmers.find_one({"_id": oid})
            elif role == "buyer":
                doc = db.buyers.find_one({"_id": oid})
            else:
                doc = db.admins.find_one({"_id": oid})
            if not doc:
                return jsonify({"error": "User not found"}), 401
            g.user = serialize_user(doc, role)
            g.user_doc = doc
            g.role = role
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def verified_only(min_level=4):
    """Decorator to require minimum verification level."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            level = (g.user or {}).get("verification_level", 0)
            if level < min_level and g.role != "admin":
                return jsonify({
                    "error": "Account verification required",
                    "required_level": min_level,
                    "current_level": level,
                    "message": "Please complete the required verification steps to access this feature.",
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


@bp.post("/signup")
def signup():
    data = request.get_json() or {}
    role = (data.get("role") or "farmer").lower()
    password = data.get("password") or ""
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    db = get_db()
    now = datetime.now(timezone.utc)
    if role == "farmer":
        phone = (data.get("phone") or "").strip()
        if not phone:
            return jsonify({"error": "Phone number must be provided"}), 400
        if db.farmers.find_one({"phone": phone}):
            return jsonify({"error": "Farmer already registered with this phone"}), 409
        district = data.get("district") or "Nashik"
        loc = Config.DISTRICTS.get(district, Config.DISTRICTS["Nashik"])
        result = db.farmers.insert_one(
            {
                "name": data.get("name") or "Farmer",
                "phone": phone,
                "village": data.get("village") or "",
                "district": district,
                "language_preference": data.get("language_preference") or "en",
                "password_hash": generate_password_hash(password),
                "bank_account_ref": data.get("bank_account_ref") or f"XXXX{phone[-4:]}",
                "location": {"lat": loc["lat"], "lng": loc["lng"]},
                "created_at": now,
            }
        )
        user = db.farmers.find_one({"_id": result.inserted_id})
    elif role == "buyer":
        gstin = (data.get("gstin") or "").strip().upper()
        phone = (data.get("phone") or "").strip()
        if not phone:
            return jsonify({"error": "Phone number is required"}), 400
        query_conditions = [{"phone": phone}]
        if gstin:
            query_conditions.append({"gstin": gstin})
        if db.buyers.find_one({"$or": query_conditions}):
            return jsonify({"error": "Buyer already registered"}), 409
        district = data.get("district") or "Pune"
        loc = Config.DISTRICTS.get(district, Config.DISTRICTS["Pune"])
        result = db.buyers.insert_one(
            {
                "business_name": data.get("business_name") or data.get("name") or "Buyer",
                "gstin": gstin,
                "phone": phone,
                "verified": False,
                "bank_account_ref": data.get("bank_account_ref") or "BANK0000",
                "location": {"lat": loc["lat"], "lng": loc["lng"], "district": district},
                "demand_profile": data.get("demand_profile") or [],
                "password_hash": generate_password_hash(password),
                "created_at": now,
            }
        )
        user = db.buyers.find_one({"_id": result.inserted_id})
    else:
        return jsonify({"error": "Role must be farmer or buyer"}), 400

    # Ensure a verification doc is initialized with PENDING
    from services.verification_service_v2 import get_or_create_verif_doc
    get_or_create_verif_doc(user["_id"], role)

    token = make_token(user["_id"], role)
    return jsonify({"token": token, "user": serialize_user(user, role)}), 201


@bp.post("/login")
def login():
    data = request.get_json() or {}
    role = (data.get("role") or "farmer").lower()
    password = data.get("password") or ""
    identifier = (data.get("phone") or data.get("gstin") or data.get("email") or "").strip()
    db = get_db()
    if role == "farmer":
        doc = db.farmers.find_one({"phone": identifier})
    elif role == "buyer":
        doc = db.buyers.find_one({"$or": [{"phone": identifier}, {"gstin": identifier.upper()}]})
    elif role == "admin":
        doc = db.admins.find_one({"$or": [{"phone": identifier}, {"email": identifier}]})
    else:
        return jsonify({"error": "Unknown role"}), 400
    if not doc or not check_password_hash(doc.get("password_hash", ""), password):
        return jsonify({"error": "Invalid credentials"}), 401
    token = make_token(doc["_id"], role)
    return jsonify({"token": token, "user": serialize_user(doc, role)})


@bp.get("/me")
@current_user_required()
def me():
    return jsonify({"user": g.user})
