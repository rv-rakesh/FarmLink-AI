from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from database import get_db, is_mock
from seed_data import seed_if_empty
from routes.auth import bp as auth_bp
from routes.listings import bp as listings_bp
from routes.pricing import bp as pricing_bp
from routes.buyers import bp as buyers_bp
from routes.matches import bp as matches_bp
from routes.orders import bp as orders_bp
from routes.voice import bp as voice_bp
from routes.sms import bp as sms_bp
from routes.logistics import bp as logistics_bp
from routes.admin import bp as admin_bp
from routes.verification import bp as verification_bp
from routes.auth import current_user_required
from services.alert_service import evaluate_wastage_for_farmer
from database import ensure_indexes
from flask import g


def create_app():
    app = Flask(__name__)
    CORS(
    app,
    resources={
        "/api/*": {
            "origins": [
                Config.FRONTEND_ORIGIN,
                "https://farmlink-ai-1.onrender.com",
            ]
        }
    },
    supports_credentials=True,
)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(listings_bp, url_prefix="/api/listings")
    app.register_blueprint(pricing_bp, url_prefix="/api")
    app.register_blueprint(buyers_bp, url_prefix="/api/buyers")
    app.register_blueprint(matches_bp, url_prefix="/api/matches")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(voice_bp, url_prefix="/api/voice")
    app.register_blueprint(sms_bp, url_prefix="/api/sms")
    app.register_blueprint(logistics_bp, url_prefix="/api/logistics")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(verification_bp, url_prefix="/api/verification")

    with app.app_context():
        ensure_indexes()

    @app.get("/api/health")
    def health():
        get_db()
        return jsonify({"ok": True, "db": "mongomock" if is_mock() else "mongodb"})

    @app.get("/api/meta")
    def meta():
        from config import Config as C

        return jsonify({"crops": C.CROPS, "districts": list(C.DISTRICTS.keys())})

    @app.get("/api/alerts/wastage")
    @current_user_required(roles=["farmer"])
    def wastage():
        return jsonify(evaluate_wastage_for_farmer(g.user_doc["_id"]))

    with app.app_context():
        seed_if_empty()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.FLASK_PORT, debug=True)
