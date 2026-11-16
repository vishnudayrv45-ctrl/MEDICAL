"""AI feature 2: predict which medicines may run out soon.

Idea (simple linear regression with scikit-learn):
  1. Take the past daily quantities of a medicine in a pharmacy (stock_history table).
  2. Fit a straight line: quantity = slope * day + intercept.
  3. A negative slope means stock is going down. daily_use = -slope.
  4. days_left = current quantity / daily_use.  If days_left <= 7 -> shortage warning.
"""
from collections import defaultdict

import numpy as np
from sklearn.linear_model import LinearRegression

from database.db import query


def predict_shortages(pharmacy_id=None, horizon_days=7):
    sql = """SELECT s.pharmacy_id, s.medicine_id, s.quantity,
                    m.name, m.strength, p.name AS pharmacy_name
             FROM stock s
             JOIN medicines m ON m.id = s.medicine_id
             JOIN pharmacies p ON p.id = s.pharmacy_id
             WHERE s.available = 1 AND s.quantity > 0"""
    params = []
    if pharmacy_id is not None:
        sql += " AND s.pharmacy_id = ?"
        params.append(pharmacy_id)
    items = query(sql, params)

    # load all history once and group it per (pharmacy, medicine)
    history = defaultdict(list)
    for h in query("SELECT pharmacy_id, medicine_id, day, quantity FROM stock_history ORDER BY day"):
        history[(h["pharmacy_id"], h["medicine_id"])].append((h["day"], h["quantity"]))

    warnings = []
    for item in items:
        points = history.get((item["pharmacy_id"], item["medicine_id"]), [])
        if len(points) < 5:                       # not enough data to learn from
            continue
        days = np.array([p[0] for p in points]).reshape(-1, 1)
        quantities = np.array([p[1] for p in points])

        model = LinearRegression().fit(days, quantities)
        daily_use = -float(model.coef_[0])        # units sold per day
        if daily_use <= 0.1:                      # stock is not dropping
            continue

        days_left = item["quantity"] / daily_use
        if days_left <= horizon_days:
            warnings.append({
                "pharmacy_id": item["pharmacy_id"],
                "pharmacy_name": item["pharmacy_name"],
                "medicine_id": item["medicine_id"],
                "medicine": f'{item["name"]} {item["strength"]}',
                "quantity": item["quantity"],
                "daily_use": round(daily_use, 1),
                "days_left": round(days_left, 1),
                "risk": "High" if days_left <= 3 else "Medium",
            })
    warnings.sort(key=lambda w: w["days_left"])
    return warnings
