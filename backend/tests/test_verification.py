import pytest
from app import create_app
from database import get_db
from seed_data import seed_all


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


def test_market_prices_ticker(client):
    res = client.get("/api/pricing/market")
    assert res.status_code == 200
    data = res.get_json()
    assert "prices" in data
    assert len(data["prices"]) > 0
    assert any(p["crop"] == "Wheat" for p in data["prices"])


def test_otp_flow(client):
    headers = login(client, "farmer", "9876540002", "Farm@123")
    send_res = client.post("/api/verification/otp/send", json={"phone": "9876540002"}, headers=headers)
    assert send_res.status_code == 200
    body = send_res.get_json()
    assert "session_id" in body
    assert "sandbox_otp" in body

    # Verify OTP
    verify_res = client.post(
        "/api/verification/otp/verify",
        json={"session_id": body["session_id"], "otp": body["sandbox_otp"]},
        headers=headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.get_json()["verification"]["phone_verified"] is True


def test_farmer_verification_submit_and_status(client):
    headers = login(client, "farmer", "9876540002", "Farm@123")
    submit_res = client.post(
        "/api/verification/farmer/submit",
        json={
            "id_reference": "ABCDE1234F",
            "evidence_type": "fpo_membership",
            "evidence_reference": "FPO-MH-9999",
            "district": "Nashik",
            "village": "Dindori",
        },
        headers=headers,
    )
    assert submit_res.status_code == 200
    status_data = submit_res.get_json()["verification"]
    assert status_data["identity_verified"] is True
    assert status_data["agricultural_verification"]["status"] == "submitted"
    assert status_data["status"] == "UNDER_REVIEW"

    # Status check
    check_res = client.get("/api/verification/farmer/status", headers=headers)
    assert check_res.status_code == 200
    assert check_res.get_json()["status"] == "UNDER_REVIEW"


def test_admin_verification_flow(client):
    admin_headers = login(client, "admin", "9999999999", "Admin@123")

    # List verifications
    res = client.get("/api/admin/verifications", headers=admin_headers)
    assert res.status_code == 200
    items = res.get_json()["verifications"]
    assert len(items) > 0

    target = items[0]
    verif_id = target["id"]

    # Approve verification
    app_res = client.post(f"/api/admin/verifications/{verif_id}/approve", headers=admin_headers)
    assert app_res.status_code == 200
    assert app_res.get_json()["success"] is True


def test_buyer_feed_contact_privacy(client):
    # Buyer 1 (Sahyadri Wholesalers) is unverified initially
    unverified_buyer_headers = login(client, "buyer", "9000000002", "Buyer@123")
    res = client.get("/api/buyers/feed", headers=unverified_buyer_headers)
    assert res.status_code == 200
    feed = res.get_json()
    if feed:
        listing = feed[0]["listing"]
        assert listing["contact_revealed"] is False
        assert "******" in listing["farmer_phone"]

    # Buyer 0 (AgroFresh Retail) is seeded as verified
    verified_buyer_headers = login(client, "buyer", "9000000001", "Buyer@123")
    res2 = client.get("/api/buyers/feed", headers=verified_buyer_headers)
    assert res2.status_code == 200
    feed2 = res2.get_json()
    if feed2:
        listing2 = feed2[0]["listing"]
        assert listing2["contact_revealed"] is True


def test_sms_price_enquiry(client):
    headers = login(client, "farmer", "9876540001", "Farm@123")
    res = client.post("/api/sms/webhook", json={"text": "Today tomato rate in Nashik"}, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["intent"] == "PRICE"
    assert data["crop"] == "Tomato"
