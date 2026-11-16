"""Pharmacy APIs: search pharmacies by medicine, map locations, details, demo login."""
from math import asin, cos, radians, sin, sqrt

from flask import Blueprint, jsonify, request, session

from ai.medicine_matching import suggest_medicine
from database.db import query
from routes.medicine_routes import find_medicines

pharmacy_bp = Blueprint("pharmacy", __name__, url_prefix="/api/pharmacies")
auth_bp = Blueprint("auth", __name__, url_prefix="/api")

DEMO_PASSWORD = "demo123"          # simple demo login - NOT real security


def distance_km(lat1, lon1, lat2, lon2):
    """Haversine formula: straight-line distance between two coordinates."""
    p1, p2 = radians(lat1), radians(lat2)
    a = sin((p2 - p1) / 2) ** 2 + cos(p1) * cos(p2) * sin(radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


@pharmacy_bp.route("/search")
def search_pharmacies():
    text = " ".join(request.args.get("q", "").split())
    strength = request.args.get("strength", "").strip()
    in_stock_only = request.args.get("in_stock") == "1"
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    radius = request.args.get("radius", type=float)

    if not text:
        return jsonify(error="Please enter a medicine name."), 400

    medicines = find_medicines(text, strength)
    if not medicines:                                   # medicine not found
        return jsonify(found=False, results=[], suggestions=suggest_medicine(text),
                       message=f'No medicine found matching "{text}".')

    ids = [m["id"] for m in medicines]
    rows = query(f"""
        SELECT p.id, p.name, p.address, p.phone, p.latitude, p.longitude,
               m.id AS medicine_id, m.name AS medicine, m.strength, s.quantity, s.available
        FROM stock s
        JOIN pharmacies p ON p.id = s.pharmacy_id
        JOIN medicines m ON m.id = s.medicine_id
        WHERE s.medicine_id IN ({",".join("?" * len(ids))})""", ids)

    grouped = {}                                        # one card per pharmacy
    for r in rows:
        in_stock = bool(r["available"]) and r["quantity"] > 0
        if in_stock_only and not in_stock:
            continue
        pharmacy = grouped.setdefault(r["id"], {
            "id": r["id"], "name": r["name"], "address": r["address"], "phone": r["phone"],
            "latitude": r["latitude"], "longitude": r["longitude"], "items": []})
        pharmacy["items"].append({"medicine_id": r["medicine_id"], "medicine": r["medicine"],
                                  "strength": r["strength"], "quantity": r["quantity"], "in_stock": in_stock})

    results = list(grouped.values())
    for p in results:
        p["in_stock"] = any(i["in_stock"] for i in p["items"])
        if lat is not None and lng is not None:
            p["distance_km"] = round(distance_km(lat, lng, p["latitude"], p["longitude"]), 1)

    if radius and lat is not None and lng is not None:   # "nearby" filter
        results = [p for p in results if p["distance_km"] <= radius]

    results.sort(key=lambda p: (not p["in_stock"], p.get("distance_km", 0), p["name"]))
    return jsonify(found=True, medicines=medicines, results=results, count=len(results))


@pharmacy_bp.route("/locations")
def locations():
    """All pharmacies with coordinates (used by the map)."""
    rows = query("SELECT id, name, address, phone, latitude, longitude FROM pharmacies ORDER BY name")
    return jsonify(pharmacies=rows)


@pharmacy_bp.route("/<int:pharmacy_id>")
def pharmacy_details(pharmacy_id):
    pharmacy = query("SELECT * FROM pharmacies WHERE id = ?", (pharmacy_id,), one=True)
    if not pharmacy:
        return jsonify(error="Pharmacy not found."), 404
    pharmacy["inventory"] = query("""
        SELECT m.id AS medicine_id, m.name, m.strength, s.quantity,
               (s.available = 1 AND s.quantity > 0) AS in_stock
        FROM stock s JOIN medicines m ON m.id = s.medicine_id
        WHERE s.pharmacy_id = ? ORDER BY m.name""", (pharmacy_id,))
    return jsonify(pharmacy)


# ---------- demo login (session based) ----------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    pharmacy = query("SELECT id, name FROM pharmacies WHERE id = ?", (data.get("pharmacy_id"),), one=True)
    if not pharmacy or data.get("password") != DEMO_PASSWORD:
        return jsonify(error="Wrong pharmacy or password. Demo password is demo123."), 401
    session["pharmacy_id"] = pharmacy["id"]
    return jsonify(pharmacy=pharmacy)


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("pharmacy_id", None)
    return jsonify(message="Logged out.")


@auth_bp.route("/me")
def me():
    pid = session.get("pharmacy_id")
    pharmacy = query("SELECT id, name, address FROM pharmacies WHERE id = ?", (pid,), one=True) if pid else None
    return jsonify(logged_in=bool(pharmacy), pharmacy=pharmacy)
