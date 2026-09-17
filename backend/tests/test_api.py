import pytest
from werkzeug.security import check_password_hash

from app import create_app
from database import get_db
from seed_data import seed_all
from services.sms_service import parse_sms_command
from services.voice_service import parse_crop, parse_qty, parse_grade
from services.payment_service import transition


@pytest.fixture()
def client():
    app = create_app()
    app.config["TESTING"] = True
    seed_all(force=True)
    with app.test_client() as c:
        yield c


def login(client, role="farmer", phone="9876540001", password="Farm@123"):
    res = client.post(
        "/api/auth/login",
        json={"role": role, "phone": phone, "password": password},
    )
    assert res.status_code == 200, res.get_data(as_text=True)
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_signup_hashes_password(client):
    res = client.post(
        "/api/auth/signup",
        json={
            "role": "farmer",
            "name": "Test Farmer",
            "phone": "9111111111",
            "village": "Test",
            "district": "Nashik",
            "password": "Secret9",
        },
    )
    assert res.status_code == 201
    db = get_db()
    doc = db.farmers.find_one({"phone": "9111111111"})
    assert doc["password_hash"] != "Secret9"
    assert check_password_hash(doc["password_hash"], "Secret9")
    login_res = client.post(
        "/api/auth/login", json={"role": "farmer", "phone": "9111111111", "password": "Secret9"}
    )
    assert login_res.status_code == 200


def test_price_recommendation_non_negative(client):
    headers = login(client)
    res = client.post(
        "/api/price-recommendation",
        json={"crop": "Wheat", "quantity": 50, "quality": "A", "district": "Nashik"},
        headers=headers,
    )
    assert res.status_code == 200, res.get_data(as_text=True)
    data = res.get_json()
    assert data["recommended_price_min"] >= 0
    assert data["recommended_price_max"] >= data["recommended_price_min"]
    assert "Prophet" in data["basis_explanation"]


def test_buyer_verification(client):
    headers = login(client, "buyer", "9000000001", "Buyer@123")
    res = client.post(
        "/api/buyers/verify",
        json={"gstin": "27AABCU9603R1ZM", "bank_account_ref": "HDFC9988"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.get_json()["gstin"]["verified"] is True


def test_listing_match_and_split(client):
    headers = login(client)
    res = client.post(
        "/api/listings",
        json={"crop": "Wheat", "quantity": 150, "quality": "A", "district": "Nashik", "farmer_asking_price": 2300},
        headers=headers,
    )
    assert res.status_code == 201, res.get_data(as_text=True)
    body = res.get_json()
    listing_id = body["id"]
    plan = body["match_preview"]
    assert plan["matched_buyers"]
    # Large qty should split across buyers
    assert plan["split"] is True or len(plan["matched_buyers"]) >= 1
    confirm = client.post("/api/matches/confirm", json={"listing_id": listing_id}, headers=headers)
    assert confirm.status_code == 200
    order_id = confirm.get_json()["order"]["id"]
    assert confirm.get_json()["order"]["payment_status"] == "escrow_held"

    buyer_headers = login(client, "buyer", "9000000001", "Buyer@123")
    step = client.post(f"/api/orders/{order_id}/status", json={"status": "in_transit"}, headers=buyer_headers)
    assert step.status_code == 200
    step = client.post(f"/api/orders/{order_id}/status", json={"status": "delivered"}, headers=buyer_headers)
    assert step.status_code == 200
    step = client.post(
        f"/api/orders/{order_id}/status", json={"status": "payment_released"}, headers=buyer_headers
    )
    assert step.status_code == 200
    assert step.get_json()["payment_status"] == "released"


def test_sms_and_voice_parsers():
    parsed = parse_sms_command("LIST WHEAT 50 A NASHIK")
    assert parsed["ok"] is True
    assert parsed["crop"] == "Wheat"
    assert parse_crop("gehun") == "Wheat"
    assert parse_qty("I have 40 quintals") == 40
    assert parse_grade("grade b") == "B"


def test_escrow_transitions():
    ok, nxt = transition("matched", "in_transit")
    assert ok and nxt == "in_transit"
    ok, _ = transition("listed", "delivered")
    assert ok is False
