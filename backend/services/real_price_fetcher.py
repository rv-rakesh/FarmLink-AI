"""
Fetches real mandi (agricultural market) prices from India's data.gov.in / Agmarknet API.
Falls back to enhanced simulated data when the API is unreachable.
"""
import math
import random
import logging
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

from config import Config
from database import get_db

logger = logging.getLogger(__name__)

# Agmarknet API endpoint (data.gov.in public dataset)
AGMARKNET_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# Map Agmarknet commodity names → FarmLink crop names
COMMODITY_MAP = {
    "Wheat": ["Wheat", "Gehun", "Gehu"],
    "Rice": ["Rice", "Paddy(Dpr)", "Paddy", "Rice (Common)", "Rice Fine"],
    "Potato": ["Potato", "Potato(Desi)", "Aloo"],
    "Tomato": ["Tomato", "Tomatoes"],
    "Cotton": ["Cotton", "Cotton(Ginned)", "Cotton Seed"],
}

# State-to-district mapping for filtering Agmarknet results
DISTRICT_STATE_MAP = {
    "Nashik": "Maharashtra",
    "Pune": "Maharashtra",
    "Nagpur": "Maharashtra",
    "Karnal": "Haryana",
    "Ludhiana": "Punjab",
    "Ahmedabad": "Gujarat",
    "Indore": "Madhya Pradesh",
    "Jaipur": "Rajasthan",
    "Hyderabad": "Telangana",
    "Bengaluru": "Karnataka",
}

# Fallback base prices aligned with current MSPs (₹/quintal, approx 2024-25)
FALLBACK_BASE_PRICES = {
    "Wheat": 2275,
    "Rice": 2300,
    "Potato": 1800,
    "Tomato": 2000,
    "Cotton": 7121,
}


def _fetch_agmarknet(crop: str, state: str, limit: int = 500) -> list[dict]:
    """Fetch price records from Agmarknet for a given crop and state."""
    commodity_aliases = COMMODITY_MAP.get(crop, [crop])
    records = []
    for alias in commodity_aliases[:2]:  # Try first 2 aliases to limit API calls
        try:
            params = {
                "api-key": Config.AGMARKNET_API_KEY,
                "format": "json",
                "filters[commodity]": alias,
                "filters[state]": state,
                "limit": str(limit),
                "offset": "0",
            }
            url = f"{AGMARKNET_URL}?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers={"User-Agent": "FarmLinkAI/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    records.extend(data.get("records", []))
                    if records:
                        break
        except Exception as exc:
            logger.warning("Agmarknet API error for %s/%s: %s", crop, state, exc)
    return records


def _parse_record(record: dict, crop: str) -> dict | None:
    """Parse a raw Agmarknet record into our price_history schema."""
    try:
        arrival_date = record.get("arrival_date") or record.get("date") or ""
        # Agmarknet dates are often DD/MM/YYYY
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
            try:
                dt = datetime.strptime(arrival_date.strip(), fmt)
                break
            except ValueError:
                continue
        else:
            return None

        modal_price = float(record.get("modal_price") or record.get("price") or 0)
        if modal_price <= 0:
            return None

        district = record.get("district") or record.get("market") or "Unknown"
        return {
            "crop": crop,
            "district": district,
            "date": dt.strftime("%Y-%m-%d"),
            "price": round(modal_price, 2),
            "demand_index": 0.7,  # Agmarknet doesn't provide demand index
            "source": "agmarknet_api",
        }
    except Exception:
        return None


def _generate_fallback(crop: str, days: int = 184) -> list[dict]:
    """
    Generate enhanced simulated prices when Agmarknet is unavailable.
    Uses MSP-aligned base prices with realistic seasonal and regional variance.
    """
    base = FALLBACK_BASE_PRICES.get(crop, 2000)
    districts = list(Config.DISTRICTS.keys())
    rng = random.Random(hash(crop) % 9999)
    start = datetime.now(timezone.utc).date() - timedelta(days=days)
    rows = []
    for i in range(days):
        d = start + timedelta(days=i)
        seasonal = 1 + 0.10 * math.sin(2 * math.pi * i / 90)
        trend = 1 + (i / days) * 0.05  # slight upward trend
        noise = rng.uniform(-0.03, 0.03)
        for district in districts:
            district_factor = 0.96 + (hash(district + crop) % 9) * 0.01
            price = round(base * seasonal * trend * district_factor * (1 + noise), 2)
            demand = round(0.55 + 0.4 * abs(math.sin(i / 14 + hash(crop) % 5)), 2)
            rows.append({
                "crop": crop,
                "district": district,
                "date": d.isoformat(),
                "price": price,
                "demand_index": min(1.0, demand),
                "source": "mandi_simulated",
            })
    return rows


def fetch_and_store(crops: list[str] | None = None, force_refresh: bool = False) -> dict:
    """
    Main entry point. Fetches real prices from Agmarknet for each crop/state
    combination and upserts into the price_history collection.
    Falls back to enhanced simulated data on API failure.
    Returns a summary dict.
    """
    db = get_db()
    crops = crops or Config.CROPS
    summary = {"crops": {}, "total_inserted": 0, "sources": set()}

    for crop in crops:
        if not force_refresh and db.price_history.count_documents(
            {"crop": crop, "source": "agmarknet_api"}, limit=1
        ):
            summary["crops"][crop] = {"skipped": True, "reason": "already_loaded"}
            continue

        all_docs = []
        api_success = False

        for district, state in DISTRICT_STATE_MAP.items():
            records = _fetch_agmarknet(crop, state, limit=300)
            for rec in records:
                doc = _parse_record(rec, crop)
                if doc:
                    all_docs.append(doc)
            if records:
                api_success = True

        if not all_docs:
            logger.info("Agmarknet returned no data for %s — using fallback", crop)
            all_docs = _generate_fallback(crop)

        # Upsert: delete old simulated, insert new
        if force_refresh:
            db.price_history.delete_many({"crop": crop})

        if all_docs:
            db.price_history.insert_many(all_docs)

        source = "agmarknet_api" if api_success and any(
            d["source"] == "agmarknet_api" for d in all_docs
        ) else "mandi_simulated"
        summary["crops"][crop] = {
            "inserted": len(all_docs),
            "source": source,
            "api_success": api_success,
        }
        summary["total_inserted"] += len(all_docs)
        summary["sources"].add(source)

    summary["sources"] = list(summary["sources"])
    return summary


def get_latest_market_prices() -> list[dict]:
    """
    Returns the latest available price for each crop across all districts.
    Used by the Landing Page market ticker and buyer 'best value' display.
    """
    db = get_db()
    result = []
    for crop in Config.CROPS:
        # Aggregate latest price per crop
        pipeline = [
            {"$match": {"crop": crop}},
            {"$sort": {"date": -1}},
            {"$limit": 100},
            {"$group": {
                "_id": "$crop",
                "avg_price": {"$avg": "$price"},
                "max_price": {"$max": "$price"},
                "min_price": {"$min": "$price"},
                "latest_date": {"$first": "$date"},
                "source": {"$first": "$source"},
            }},
        ]
        docs = list(db.price_history.aggregate(pipeline))
        if docs:
            d = docs[0]
            result.append({
                "crop": crop,
                "avg_price": round(d["avg_price"], 2),
                "min_price": round(d["min_price"], 2),
                "max_price": round(d["max_price"], 2),
                "latest_date": d["latest_date"],
                "source": d["source"],
            })
        else:
            result.append({
                "crop": crop,
                "avg_price": FALLBACK_BASE_PRICES.get(crop, 2000),
                "min_price": round(FALLBACK_BASE_PRICES.get(crop, 2000) * 0.9, 2),
                "max_price": round(FALLBACK_BASE_PRICES.get(crop, 2000) * 1.1, 2),
                "latest_date": None,
                "source": "default",
            })
    return result
