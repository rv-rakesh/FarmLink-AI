"""Generate 6 months of daily mandi prices and seed demo users, listings, matches, orders."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import csv
import math
import random

from werkzeug.security import generate_password_hash
from bson import ObjectId

from config import Config
from database import get_db

BASE_PRICES = {
    "Wheat": 2600,
    "Rice": 3600,
    "Potato": 2400,
    "Tomato": 2200,
    "Cotton": 8700,
}

CSV_PATH = Path(__file__).parent / "data" / "mandi_prices.csv"


def _iso(dt):
    return dt.replace(tzinfo=timezone.utc).isoformat()


def generate_mandi_csv(days=184):
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    start = datetime.now(timezone.utc).date() - timedelta(days=days)
    districts = list(Config.DISTRICTS.keys())
    rng = random.Random(42)
    rows = []
    for crop, base in BASE_PRICES.items():
        for i in range(days):
            d = start + timedelta(days=i)
            seasonal = 1 + 0.08 * math.sin(2 * math.pi * i / 90)
            noise = rng.uniform(-0.04, 0.04)
            for district in districts:
                district_factor = 0.97 + (hash(district + crop) % 7) * 0.01
                price = round(base * seasonal * district_factor * (1 + noise), 2)
                demand = round(0.55 + 0.4 * abs(math.sin(i / 14 + hash(crop) % 5)), 2)
                rows.append(
                    {
                        "crop": crop,
                        "district": district,
                        "date": d.isoformat(),
                        "price": price,
                        "demand_index": min(1.0, demand),
                        "source": "mandi_simulated",
                    }
                )
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["crop", "district", "date", "price", "demand_index", "source"]
        )
        writer.writeheader()
        writer.writerows(rows)
    return rows


def load_price_rows():
    if not CSV_PATH.exists():
        return generate_mandi_csv()
    with CSV_PATH.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


FARMERS = [
    ("Ramesh Patil", "9876540001", "Sinnar", "Nashik", "mr"),
    ("Savitri Devi", "9876540002", "Karnal Rural", "Karnal", "hi"),
    ("Gurpreet Singh", "9876540003", "Khanna", "Ludhiana", "hi"),
    ("Lakshmi Bai", "9876540004", "Baramati", "Pune", "mr"),
    ("Anil Sharma", "9876540005", "Niphad", "Nashik", "hi"),
    ("Meena Joshi", "9876540006", "Haveli", "Pune", "mr"),
    ("Harinder Kaur", "9876540007", "Jagraon", "Ludhiana", "hi"),
    ("Vijay Kale", "9876540008", "Katol", "Nagpur", "mr"),
    ("Fatima Sheikh", "9876540009", "Daskroi", "Ahmedabad", "hi"),
    ("Raju Yadav", "9876540010", "Mhow", "Indore", "hi"),
    ("Kiran Pawar", "9876540011", "Dindori", "Nashik", "mr"),
    ("Sunita Rani", "9876540012", "Assandh", "Karnal", "hi"),
    ("Balwinder Singh", "9876540013", "Samrala", "Ludhiana", "hi"),
    ("Deepak More", "9876540014", "Shirur", "Pune", "mr"),
    ("Asha Gupta", "9876540015", "Chomu", "Jaipur", "hi"),
    ("Naveen Reddy", "9876540016", "Medchal", "Hyderabad", "en"),
    ("Priya Nair", "9876540017", "Devanahalli", "Bengaluru", "en"),
    ("Suresh Chavan", "9876540018", "Kamptee", "Nagpur", "mr"),
    ("Imran Khan", "9876540019", "Sanand", "Ahmedabad", "hi"),
    ("Pooja Verma", "9876540020", "Depalpur", "Indore", "hi"),
]

BUYERS = [
    {
        "business_name": "AgriBulk Traders",
        "gstin": "27AABCU9603R1ZM",
        "phone": "9000000001",
        "district": "Nashik",
        "verified": True,
        "demand_profile": [
            {"crop": "Wheat", "avg_qty_needed": 80},
            {"crop": "Tomato", "avg_qty_needed": 40},
        ],
    },
    {
        "business_name": "Deccan Grain Co-op",
        "gstin": "27AACCD1234P1Z5",
        "phone": "9000000002",
        "district": "Pune",
        "verified": True,
        "demand_profile": [
            {"crop": "Wheat", "avg_qty_needed": 60},
            {"crop": "Rice", "avg_qty_needed": 50},
        ],
    },
    {
        "business_name": "Haryana Mandi Link",
        "gstin": "06AABCH5678Q1Z2",
        "phone": "9000000003",
        "district": "Karnal",
        "verified": True,
        "demand_profile": [
            {"crop": "Wheat", "avg_qty_needed": 120},
            {"crop": "Rice", "avg_qty_needed": 70},
        ],
    },
    {
        "business_name": "Punjab Cotton Mills",
        "gstin": "03AABCP9012R1Z8",
        "phone": "9000000004",
        "district": "Ludhiana",
        "verified": True,
        "demand_profile": [{"crop": "Cotton", "avg_qty_needed": 90}],
    },
    {
        "business_name": "Vidarbha Fresh Produce",
        "gstin": "27AABCV3456S1Z1",
        "phone": "9000000005",
        "district": "Nagpur",
        "verified": True,
        "demand_profile": [
            {"crop": "Tomato", "avg_qty_needed": 35},
            {"crop": "Potato", "avg_qty_needed": 55},
        ],
    },
    {
        "business_name": "Gujarat Agri Export",
        "gstin": "24AABCG7890T1Z4",
        "phone": "9000000006",
        "district": "Ahmedabad",
        "verified": True,
        "demand_profile": [
            {"crop": "Cotton", "avg_qty_needed": 70},
            {"crop": "Wheat", "avg_qty_needed": 40},
        ],
    },
    {
        "business_name": "Malwa Potato Hub",
        "gstin": "23AABCM1122U1Z6",
        "phone": "9000000007",
        "district": "Indore",
        "verified": True,
        "demand_profile": [
            {"crop": "Potato", "avg_qty_needed": 80},
            {"crop": "Tomato", "avg_qty_needed": 25},
        ],
    },
    {
        "business_name": "Rajasthan Grain Exchange",
        "gstin": "08AABCR3344V1Z0",
        "phone": "9000000008",
        "district": "Jaipur",
        "verified": False,
        "demand_profile": [{"crop": "Wheat", "avg_qty_needed": 50}, {"crop": "Rice", "avg_qty_needed": 40}],
    },
    {
        "business_name": "Deccan Rice Traders",
        "gstin": "36AABCD5566W1Z3",
        "phone": "9000000009",
        "district": "Hyderabad",
        "verified": True,
        "demand_profile": [{"crop": "Rice", "avg_qty_needed": 100}],
    },
    {
        "business_name": "South Fresh Retail",
        "gstin": "29AABCS7788X1Z7",
        "phone": "9000000010",
        "district": "Bengaluru",
        "verified": True,
        "demand_profile": [
            {"crop": "Tomato", "avg_qty_needed": 30},
            {"crop": "Potato", "avg_qty_needed": 45},
        ],
    },
]


def seed_if_empty():
    db = get_db()
    if db.farmers.count_documents({}) > 0:
        return {"seeded": False, "reason": "already populated"}
    return seed_all(force=True)


def seed_all(force=False):
    db = get_db()
    if force:
        for name in (
            "farmers",
            "buyers",
            "admins",
            "listings",
            "matches",
            "orders",
            "price_history",
            "routes",
        ):
            db[name].delete_many({})

    now = datetime.now(timezone.utc)
    farmer_pw = generate_password_hash("Farm@123")
    farmer_ids = []
    for name, phone, village, district, lang in FARMERS:
        loc = Config.DISTRICTS[district]
        result = db.farmers.insert_one(
            {
                "name": name,
                "phone": phone,
                "village": village,
                "district": district,
                "language_preference": lang,
                "password_hash": farmer_pw,
                "bank_account_ref": f"XXXX{phone[-4:]}",
                "location": {"lat": loc["lat"] + 0.02, "lng": loc["lng"] + 0.01},
                "created_at": now,
            }
        )
        farmer_ids.append(result.inserted_id)

    buyer_pw = generate_password_hash("Buyer@123")
    buyer_ids = []
    for b in BUYERS:
        loc = Config.DISTRICTS[b["district"]]
        result = db.buyers.insert_one(
            {
                "business_name": b["business_name"],
                "gstin": b["gstin"],
                "phone": b["phone"],
                "verified": b["verified"],
                "bank_account_ref": f"BANK{b['gstin'][-4:]}",
                "location": {"lat": loc["lat"], "lng": loc["lng"], "district": b["district"]},
                "demand_profile": b["demand_profile"],
                "password_hash": buyer_pw,
                "created_at": now,
            }
        )
        buyer_ids.append(result.inserted_id)

    db.admins.insert_one(
        {
            "name": "FarmLink Admin",
            "phone": "9999999999",
            "email": "admin@farmlink.ai",
            "password_hash": generate_password_hash("Admin@123"),
            "role": "admin",
            "created_at": now,
        }
    )

    # Seed realistic multi-step verifications for farmers
    # Farmer 0: Ramesh Patil - Fully Verified
    db.verifications.insert_one({
        "user_id": farmer_ids[0],
        "role": "farmer",
        "forced_status": "VERIFIED",
        "phone_verified": True,
        "phone_verified_at": now - timedelta(days=30),
        "identity_verified": True,
        "identity_provider": "kyc_sandbox",
        "identity_reference": "ABCDE1234F",
        "identity_verified_at": (now - timedelta(days=29)).isoformat(),
        "agricultural_verification": {
            "status": "verified",
            "type": "fpo_membership",
            "type_label": "FPO / FPC Membership",
            "reference": "FPO-MH-8821",
            "is_fpo_cooperative": True,
            "govt_source_match": True,
            "verified_at": (now - timedelta(days=28)).isoformat(),
        },
        "location_verification": {
            "status": "verified",
            "district": "Nashik",
            "state": "Maharashtra",
            "validated": True,
        },
        "trust_score": 85,
        "trust_score_breakdown": {"phone_verified": 10, "identity_verified": 20, "agricultural_verified": 30, "govt_source_match": 20, "fpo_cooperative": 5},
        "risk_flags": [],
        "risk_level": "none",
        "submitted_at": now - timedelta(days=29),
        "reviewed_at": now - timedelta(days=28),
        "reviewed_by": "admin",
        "admin_notes": "Verified FPO member with active khatauni records.",
        "created_at": now - timedelta(days=30),
        "updated_at": now - timedelta(days=28),
    })

    # Farmer 1: Suresh Kumar - Under Review
    db.verifications.insert_one({
        "user_id": farmer_ids[1],
        "role": "farmer",
        "forced_status": None,
        "phone_verified": True,
        "phone_verified_at": now - timedelta(days=2),
        "identity_verified": True,
        "identity_provider": "kyc_sandbox",
        "identity_reference": "XYZPQ9876R",
        "identity_verified_at": (now - timedelta(days=2)).isoformat(),
        "agricultural_verification": {
            "status": "submitted",
            "type": "land_record",
            "type_label": "Land Record / Khatauni",
            "reference": "LR-HR-4410",
            "is_fpo_cooperative": False,
            "govt_source_match": False,
            "submitted_at": (now - timedelta(days=1)).isoformat(),
        },
        "location_verification": {
            "status": "verified",
            "district": "Karnal",
            "state": "Haryana",
            "validated": True,
        },
        "trust_score": 40,
        "trust_score_breakdown": {"phone_verified": 10, "identity_verified": 20, "location_verified": 10},
        "risk_flags": [],
        "risk_level": "none",
        "submitted_at": now - timedelta(days=1),
        "created_at": now - timedelta(days=2),
        "updated_at": now - timedelta(days=1),
    })

    # Other farmers - Pending/Partially verified
    for fid in farmer_ids[2:]:
        db.verifications.insert_one({
            "user_id": fid,
            "role": "farmer",
            "forced_status": None,
            "phone_verified": True,
            "identity_verified": False,
            "agricultural_verification": {"status": "none"},
            "business_verification": {"status": "none"},
            "trust_score": 10,
            "trust_score_breakdown": {"phone_verified": 10},
            "risk_flags": [],
            "risk_level": "none",
            "created_at": now,
            "updated_at": now,
        })

    # Seed verifications for Buyers
    # Buyer 0: AgroFresh Retail - Fully Verified
    db.verifications.insert_one({
        "user_id": buyer_ids[0],
        "role": "buyer",
        "forced_status": "VERIFIED",
        "phone_verified": True,
        "phone_verified_at": now - timedelta(days=40),
        "identity_verified": True,
        "identity_provider": "kyc_sandbox",
        "identity_reference": "AABCU9603R",
        "identity_verified_at": (now - timedelta(days=39)).isoformat(),
        "business_verification": {
            "status": "verified",
            "type": "gstin",
            "type_label": "GST Registration",
            "reference": "27AABCU9603R1ZM",
            "format_valid": True,
            "verified_at": (now - timedelta(days=38)).isoformat(),
        },
        "identity_business_match": "MATCH",
        "location_verification": {"status": "verified", "district": "Pune", "validated": True},
        "trust_score": 90,
        "trust_score_breakdown": {"phone_verified": 10, "identity_verified": 20, "business_reg_verified": 30, "identity_business_match": 20, "successful_transactions": 10},
        "risk_flags": [],
        "risk_level": "none",
        "submitted_at": now - timedelta(days=39),
        "reviewed_at": now - timedelta(days=38),
        "reviewed_by": "admin",
        "admin_notes": "Active GSTIN with matching PAN identity.",
        "created_at": now - timedelta(days=40),
        "updated_at": now - timedelta(days=38),
    })

    # Other buyers
    for bid in buyer_ids[1:]:
        db.verifications.insert_one({
            "user_id": bid,
            "role": "buyer",
            "forced_status": None,
            "phone_verified": True,
            "identity_verified": True,
            "business_verification": {"status": "submitted", "type": "gstin", "reference": "27TEST1234A1Z5"},
            "identity_business_match": "PARTIAL_MATCH",
            "trust_score": 45,
            "trust_score_breakdown": {"phone_verified": 10, "identity_verified": 20, "identity_business_match": 15},
            "risk_flags": [],
            "risk_level": "none",
            "created_at": now,
            "updated_at": now,
        })

    rows = load_price_rows()
    history_docs = []
    for row in rows:
        history_docs.append(
            {
                "crop": row["crop"],
                "district": row["district"],
                "date": row["date"],
                "price": float(row["price"]),
                "demand_index": float(row["demand_index"]),
                "source": row.get("source", "mandi_simulated"),
            }
        )
    if history_docs:
        db.price_history.insert_many(history_docs)

    try:
        from services.real_price_fetcher import fetch_and_store_all_crops
        fetch_and_store_all_crops(days=30)
    except Exception:
        pass

    # Demo listings so the product is usable without first-time data entry
    listing_specs = [
        (0, "Wheat", 50, "A", "Nashik", "listed", 0),
        (0, "Tomato", 28, "B", "Nashik", "listed", 30),
        (1, "Wheat", 70, "A", "Karnal", "matched", 2),
        (3, "Potato", 40, "B", "Pune", "listed", 40),
        (4, "Cotton", 55, "A", "Nashik", "listed", 1),
        (7, "Tomato", 22, "C", "Nagpur", "listed", 36),
    ]
    listing_ids = []
    for farmer_idx, crop, qty, grade, district, status, hours_ago in listing_specs:
        created = now - timedelta(hours=hours_ago)
        doc = {
            "farmer_id": farmer_ids[farmer_idx],
            "crop": crop,
            "quantity": qty,
            "quality_grade": grade,
            "recommended_price_min": BASE_PRICES[crop] * 0.92,
            "recommended_price_max": BASE_PRICES[crop] * 1.08,
            "farmer_asking_price": BASE_PRICES[crop],
            "status": status,
            "created_at": created,
            "district": district,
            "harvest_date": (created + timedelta(days=2)).date().isoformat(),
        }
        listing_ids.append(db.listings.insert_one(doc).inserted_id)

    # Pre-built match + order for walkthrough
    wheat_listing = listing_ids[2]
    match_id = db.matches.insert_one(
        {
            "listing_id": wheat_listing,
            "buyer_ids": [buyer_ids[2], buyer_ids[0]],
            "allocated_quantities": {
                str(buyer_ids[2]): 50,
                str(buyer_ids[0]): 20,
            },
            "agreed_price": 2300,
            "status": "confirmed",
            "created_at": now - timedelta(hours=1),
        }
    ).inserted_id

    route_group_id = ObjectId()
    db.orders.insert_one(
        {
            "match_id": match_id,
            "listing_id": wheat_listing,
            "farmer_id": farmer_ids[1],
            "route_group_id": route_group_id,
            "pickup_time": (now + timedelta(hours=8)).isoformat(),
            "delivery_status": "matched",
            "payment_status": "escrow_held",
            "total_amount": 70 * 2300,
            "created_at": now - timedelta(hours=1),
        }
    )

    return {
        "seeded": True,
        "farmers": len(farmer_ids),
        "buyers": len(buyer_ids),
        "price_rows": len(history_docs),
        "demo": {
            "farmer": {"phone": "9876540001", "password": "Farm@123"},
            "buyer": {"gstin": "27AABCU9603R1ZM", "phone": "9000000001", "password": "Buyer@123"},
            "admin": {"phone": "9999999999", "password": "Admin@123"},
        },
    }
