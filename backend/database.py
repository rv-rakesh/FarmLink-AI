from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
import mongomock
from config import Config

_db = None
_using_mock = False


def get_db():
    global _db, _using_mock
    if _db is not None:
        return _db

    try:
        client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=1200)
        client.admin.command("ping")
        db_name = Config.MONGO_URI.rsplit("/", 1)[-1] or "farmlink_ai"
        _db = client[db_name]
        _using_mock = False
    except (ServerSelectionTimeoutError, Exception):
        client = mongomock.MongoClient()
        _db = client["farmlink_ai"]
        _using_mock = True
    return _db


def is_mock():
    get_db()
    return _using_mock


def ensure_indexes():
    """Create essential indexes for performance and constraints."""
    db = get_db()
    try:
        # Verifications
        db.verifications.create_index([("user_id", 1), ("role", 1)], unique=True)
        db.verifications.create_index([("status", 1)])
        db.verifications.create_index([("role", 1)])
        # Price history
        db.price_history.create_index([("crop", 1), ("district", 1), ("date", -1)])
        db.price_history.create_index([("crop", 1), ("date", -1)])
        # Listings & Orders
        db.listings.create_index([("farmer_id", 1), ("status", 1)])
        db.orders.create_index([("farmer_id", 1)])
        db.orders.create_index([("buyer_id", 1)])
    except Exception:
        pass  # mongomock or transient issues
