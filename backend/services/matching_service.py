import math
from bson import ObjectId
from config import Config
from database import get_db


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _buyer_need(buyer, crop):
    for d in buyer.get("demand_profile") or []:
        if d.get("crop") == crop:
            return float(d.get("avg_qty_needed") or 0)
    return 0.0


def match_listing(listing):
    db = get_db()
    crop = listing["crop"]
    remaining = float(listing["quantity"])
    dest = Config.DISTRICTS.get(listing.get("district"), Config.HUB_LOCATION)
    origin_lat, origin_lng = dest["lat"], dest["lng"]
    farmer = db.farmers.find_one({"_id": listing["farmer_id"]})
    if farmer and farmer.get("location"):
        origin_lat = farmer["location"]["lat"]
        origin_lng = farmer["location"]["lng"]

    candidates = []
    # Search all buyers, prioritize verified buyers with higher trust score
    all_buyers = list(db.buyers.find())
    for buyer in all_buyers:
        need = _buyer_need(buyer, crop)
        if need <= 0:
            continue
        bloc = buyer.get("location") or {}
        dist = haversine_km(
            origin_lat, origin_lng, float(bloc.get("lat", origin_lat)), float(bloc.get("lng", origin_lng))
        )
        if dist > Config.PROXIMITY_KM:
            continue

        # Fetch trust score and verification info
        verif = db.verifications.find_one({"user_id": buyer["_id"], "role": "buyer"}) or {}
        trust_score = verif.get("trust_score", 50 if buyer.get("verified") else 10)
        is_verified = bool(buyer.get("verified") or verif.get("forced_status") == "VERIFIED" or verif.get("phone_verified"))

        candidates.append({
            "buyer": buyer,
            "need": need,
            "distance_km": round(dist, 1),
            "trust_score": trust_score,
            "is_verified": is_verified,
            "verif_status": verif.get("forced_status") or ("VERIFIED" if is_verified else "PENDING"),
        })

    # Sort: verified first, then highest trust score, then closest distance
    candidates.sort(key=lambda c: (not c["is_verified"], -c["trust_score"], c["distance_km"]))

    allocated = {}
    matched = []
    for c in candidates:
        if remaining <= 0:
            break
        take = min(remaining, c["need"])
        bid = str(c["buyer"]["_id"])
        allocated[bid] = take
        remaining -= take
        matched.append(
            {
                "buyer_id": bid,
                "business_name": c["buyer"].get("business_name") or "Verified Buyer",
                "gstin": c["buyer"].get("gstin"),
                "phone": c["buyer"].get("phone"),
                "district": (c["buyer"].get("location") or {}).get("district", "N/A"),
                "distance_km": c["distance_km"],
                "allocated_qty": take,
                "verified": c["is_verified"],
                "trust_score": c["trust_score"],
                "verification_status": c["verif_status"],
            }
        )

    asking = float(listing.get("farmer_asking_price") or listing.get("recommended_price_min") or 0)
    allocated_total = float(listing["quantity"]) - remaining
    return {
        "listing_id": str(listing["_id"]),
        "crop": crop,
        "quantity": listing["quantity"],
        "unallocated_qty": remaining,
        "split": len(matched) > 1,
        "matched_buyers": matched,
        "allocated_quantities": allocated,
        "agreed_price": asking,
        "estimated_total": round(allocated_total * asking, 2),
    }


def persist_match(listing, plan, status="proposed"):
    db = get_db()
    buyer_ids = [ObjectId(b["buyer_id"]) for b in plan["matched_buyers"]]
    doc = {
        "listing_id": listing["_id"],
        "buyer_ids": buyer_ids,
        "allocated_quantities": plan["allocated_quantities"],
        "agreed_price": plan["agreed_price"],
        "status": status,
        "created_at": listing.get("created_at"),
    }
    result = db.matches.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc
