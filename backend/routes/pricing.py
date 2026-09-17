from flask import Blueprint, jsonify, request
from routes.auth import current_user_required
from services.pricing_service import recommend_price

bp = Blueprint("pricing", __name__)


@bp.post("/price-recommendation")
@current_user_required()
def price_recommendation():
    data = request.get_json() or {}
    crop = data.get("crop")
    district = data.get("district")
    if not crop or not district:
        return jsonify({"error": "crop and district are required"}), 400
    result = recommend_price(
        crop=crop,
        quantity=float(data.get("quantity") or 1),
        quality=data.get("quality") or data.get("quality_grade") or "B",
        district=district,
        date=data.get("date"),
    )
    return jsonify(result)


@bp.get("/pricing/market")
@bp.get("/market-prices")
def market_prices():
    """Return latest market prices per crop for landing ticker and buyer views."""
    from services.real_price_fetcher import get_latest_market_prices
    prices = get_latest_market_prices()
    return jsonify({"prices": prices, "count": len(prices)})
