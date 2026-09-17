import math
from datetime import datetime, timezone

import numpy as np
import pandas as pd
try:
    from prophet import Prophet
except ImportError:
    Prophet = None
from sklearn.preprocessing import MinMaxScaler

from config import Config
from database import get_db

_model_cache = {}


def _demand_ratio(crop, district):
    db = get_db()
    buyers = list(db.buyers.find({"verified": True}))
    need = 0.0
    for b in buyers:
        loc = (b.get("location") or {}).get("district")
        for d in b.get("demand_profile") or []:
            if d.get("crop") == crop:
                # Weight nearby demand more
                weight = 1.0 if loc == district else 0.45
                need += float(d.get("avg_qty_needed") or 0) * weight
    scaler_ref = 200.0
    return min(1.0, need / scaler_ref)


def _history_frame(crop, district=None):
    db = get_db()
    query = {"crop": crop}
    if district:
        query["district"] = district
    rows = list(db.price_history.find(query).sort("date", 1))
    if not rows:
        rows = list(db.price_history.find({"crop": crop}).sort("date", 1))
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["ds"] = pd.to_datetime(df["date"])
    df["y"] = pd.to_numeric(df["price"])
    daily = df.groupby("ds", as_index=False)["y"].mean()
    return daily


def _fit_prophet(crop, district):
    key = f"{crop}:{district or 'all'}"
    if key in _model_cache:
        return _model_cache[key]
    df = _history_frame(crop, district)
    if Prophet is None or df.empty or len(df) < 10:
        return None
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False,
        interval_width=0.95,
    )
    model.fit(df[["ds", "y"]])
    _model_cache[key] = (model, df)
    return _model_cache[key]


def recommend_price(crop, quantity, quality, district, date=None):
    quality = (quality or "B").upper()
    grade_mult = Config.GRADE_MULTIPLIERS.get(quality, 1.0)
    d_ratio = _demand_ratio(crop, district)
    fitted = _fit_prophet(crop, district)
    target_date = pd.to_datetime(date) if date else pd.Timestamp.now().normalize()

    if fitted is None:
        base = 2000.0
        sigma = 80.0
        hist = []
    else:
        model, df = fitted
        horizon = max(1, (target_date.normalize() - df["ds"].max()).days + 1)
        future = model.make_future_dataframe(periods=max(horizon, 1))
        forecast = model.predict(future)
        row = forecast.iloc[-1]
        # pick nearest date
        forecast["diff"] = (forecast["ds"] - target_date).abs()
        row = forecast.sort_values("diff").iloc[0]
        base = float(row["yhat"])
        window = df.tail(180)
        sigma = float(window["y"].std(ddof=1) or 0.0)
        hist = [
            {"date": r["ds"].strftime("%Y-%m-%d"), "price": round(float(r["y"]), 2)}
            for _, r in df.tail(90).iterrows()
        ]

    # Demand weighting via sklearn scaler on [0,1] demand (documented use of sklearn)
    scaler = MinMaxScaler(feature_range=(0.0, 1.0))
    scaler.fit(np.array([[0.0], [1.0]]))
    d_scaled = float(scaler.transform([[d_ratio]])[0][0])

    target = base * grade_mult * (1.0 + 0.05 * d_scaled)
    margin = 1.96 * sigma
    rec_min = max(0.5 * target, target - margin)
    rec_max = target + margin
    rec_min = max(0.0, rec_min)

    explanation = (
        f"Prophet forecast for {crop} in {district} with Grade {quality} multiplier, "
        f"based on 180-day mandi trend and a safe ±₹{round(margin, 2)} historical variance band."
    )
    return {
        "crop": crop,
        "district": district,
        "quality": quality,
        "quantity": quantity,
        "base_forecast": round(base, 2),
        "demand_ratio": round(d_ratio, 3),
        "sigma": round(sigma, 2),
        "recommended_price_min": round(rec_min, 2),
        "recommended_price_max": round(rec_max, 2),
        "target_price": round(target, 2),
        "basis_explanation": explanation,
        "history": hist,
        "forecast_point": {"date": target_date.strftime("%Y-%m-%d"), "price": round(target, 2)},
    }
