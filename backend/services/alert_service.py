from datetime import datetime, timezone
from config import Config
from database import get_db
from services.matching_service import match_listing


def evaluate_wastage_for_farmer(farmer_id):
    db = get_db()
    now = datetime.now(timezone.utc)
    alerts = []
    listings = list(
        db.listings.find({"farmer_id": farmer_id, "status": "listed"})
    )
    for listing in listings:
        crop = listing.get("crop")
        if crop not in Config.PERISHABLE_CROPS:
            continue
        created = listing.get("created_at")
        if created is None:
            continue
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        hours = (now - created).total_seconds() / 3600
        if hours <= Config.WASTAGE_HOURS:
            continue
        plan = match_listing(listing)
        nearby = plan["matched_buyers"][:3]
        cut = round(float(listing.get("farmer_asking_price") or 0) * 0.92, 2)
        alerts.append(
            {
                "listing_id": str(listing["_id"]),
                "crop": crop,
                "hours_unmatched": round(hours, 1),
                "message": (
                    f"{crop} listing has been unmatched for over 24 hours. "
                    f"Consider reducing ask to ₹{cut}/q or contacting a nearby buyer."
                ),
                "suggested_price": cut,
                "nearby_buyers": nearby,
            }
        )
    return alerts
