"""Medicine search APIs."""
from flask import Blueprint, jsonify, request

from ai.medicine_matching import suggest_medicine
from database.db import query

medicine_bp = Blueprint("medicine", __name__, url_prefix="/api/medicines")


def find_medicines(text, strength=""):
    """Find medicines whose name (or 'name strength') contains the text."""
    like = f"%{text}%"
    sql = "SELECT id, name, strength FROM medicines WHERE (name LIKE ? OR (name || ' ' || strength) LIKE ?)"
    params = [like, like]
    if strength:
        sql += " AND strength = ?"
        params.append(strength)
    return query(sql + " ORDER BY name, strength", params)


@medicine_bp.route("/search")
def search_medicines():
    text = " ".join(request.args.get("q", "").split())
    strength = request.args.get("strength", "").strip()
    if not text:
        return jsonify(error="Please enter a medicine name."), 400
    medicines = find_medicines(text, strength)
    suggestions = [] if medicines else suggest_medicine(text)   # AI spelling help
    return jsonify(medicines=medicines, suggestions=suggestions)


@medicine_bp.route("/suggest")
def suggest():
    return jsonify(suggestions=suggest_medicine(request.args.get("q", "")))


@medicine_bp.route("/names")
def names():
    """Used for the search-box autocomplete list."""
    rows = query("SELECT DISTINCT name FROM medicines ORDER BY name")
    return jsonify(names=[r["name"] for r in rows])


@medicine_bp.route("/strengths")
def strengths():
    rows = query("SELECT DISTINCT strength FROM medicines ORDER BY strength")
    return jsonify(strengths=[r["strength"] for r in rows])
