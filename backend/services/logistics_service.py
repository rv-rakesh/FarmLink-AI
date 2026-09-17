from datetime import datetime, timedelta, timezone
from bson import ObjectId
from config import Config
from database import get_db
from services.matching_service import haversine_km


def nearest_neighbor_order(points):
    """points: list of dicts with lat, lng, id. First point is hub start."""
    if not points:
        return []
    remaining = points[1:]
    path = [points[0]]
    current = points[0]
    while remaining:
        nxt = min(
            remaining,
            key=lambda p: haversine_km(current["lat"], current["lng"], p["lat"], p["lng"]),
        )
        path.append(nxt)
        remaining.remove(nxt)
        current = nxt
    return path


def build_route_for_order(order):
    db = get_db()
    match = db.matches.find_one({"_id": order["match_id"]})
    listing = db.listings.find_one({"_id": match["listing_id"] if match else order.get("listing_id")})
    farmer = db.farmers.find_one({"_id": listing["farmer_id"]}) if listing else None
    hub = Config.HUB_LOCATION
    points = [
        {"id": "hub", "label": hub.get("name", "Hub"), "kind": "hub", "lat": hub["lat"], "lng": hub["lng"]}
    ]
    if farmer:
        loc = farmer.get("location") or Config.DISTRICTS.get(farmer.get("district"), hub)
        points.append(
            {
                "id": str(farmer["_id"]),
                "label": f"Pickup · {farmer['name']}",
                "kind": "pickup",
                "lat": loc["lat"],
                "lng": loc["lng"],
                "village": farmer.get("village"),
                "district": farmer.get("district"),
            }
        )
    if match:
        for bid in match.get("buyer_ids") or []:
            buyer = db.buyers.find_one({"_id": bid})
            if not buyer:
                continue
            loc = buyer.get("location") or hub
            points.append(
                {
                    "id": str(buyer["_id"]),
                    "label": f"Buyer · {buyer['business_name']}",
                    "kind": "buyer",
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "district": loc.get("district"),
                }
            )

    ordered = nearest_neighbor_order(points)
    stops = []
    total_km = 0.0
    for i, p in enumerate(ordered):
        dist = 0.0
        if i > 0:
            prev = ordered[i - 1]
            dist = haversine_km(prev["lat"], prev["lng"], p["lat"], p["lng"])
            total_km += dist
        minutes = dist / 40 * 60
        stops.append(
            {
                **p,
                "stop_order": i + 1,
                "distance_from_prev_km": round(dist, 1),
                "eta_minutes": round(minutes),
                "status": "pending" if i > 0 else "hub",
            }
        )
    rgid = order.get("route_group_id")
    route = {
        "route_group_id": str(rgid) if rgid else None,
        "order_id": str(order["_id"]),
        "stops": stops,
        "total_km": round(total_km, 1),
        "estimated_hours": round(total_km / 40, 2),
        "pickup_time": order.get("pickup_time"),
    }
    db.routes.update_one(
        {"route_group_id": order.get("route_group_id")},
        {"$set": route},
        upsert=True,
    )
    return route


def cluster_same_district(listing):
    db = get_db()
    window_start = datetime.now(timezone.utc) - timedelta(days=1)
    peers = list(
        db.listings.find(
            {
                "district": listing.get("district"),
                "status": {"$in": ["listed", "matched"]},
                "created_at": {"$gte": window_start},
            }
        )
    )
    return [str(p["_id"]) for p in peers]
