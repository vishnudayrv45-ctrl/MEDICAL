"""Stock APIs: check stock, inventory, add / update / mark unavailable, prediction."""
from functools import wraps

from flask import Blueprint, jsonify, request, session

from ai.stock_prediction import predict_shortages
from database.db import execute, query

stock_bp = Blueprint("stock", __name__, url_prefix="/api/stock")


def login_required(view):
    """Only a logged-in pharmacy can change stock."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        if "pharmacy_id" not in session:
            return jsonify(error="Please log in as a pharmacy first."), 401
        return view(*args, **kwargs)
    return wrapper


def read_quantity(data):
    """Return a valid quantity (whole number >= 0) or None."""
    try:
        qty = int(data.get("quantity"))
    except (TypeError, ValueError):
        return None
    return qty if qty >= 0 else None


@stock_bp.route("/check")
def check_stock():
    row = query("""
        SELECT s.quantity, s.available, m.name, m.strength, p.name AS pharmacy
        FROM stock s JOIN medicines m ON m.id = s.medicine_id JOIN pharmacies p ON p.id = s.pharmacy_id
        WHERE s.pharmacy_id = ? AND s.medicine_id = ?""",
        (request.args.get("pharmacy_id", type=int), request.args.get("medicine_id", type=int)), one=True)
    if not row:
        return jsonify(error="This pharmacy does not list this medicine."), 404
    in_stock = bool(row["available"]) and row["quantity"] > 0
    row["status"] = "In Stock" if in_stock else "Out of Stock"
    return jsonify(row)


@stock_bp.route("/inventory")
@login_required
def inventory():
    items = query("""
        SELECT m.id AS medicine_id, m.name, m.strength, s.quantity,
               (s.available = 1 AND s.quantity > 0) AS in_stock
        FROM stock s JOIN medicines m ON m.id = s.medicine_id
        WHERE s.pharmacy_id = ? ORDER BY m.name, m.strength""", (session["pharmacy_id"],))
    for i in items:
        i["in_stock"] = bool(i["in_stock"])
    return jsonify(items=items)


@stock_bp.route("/add", methods=["POST"])
@login_required
def add_medicine():
    data = request.get_json(silent=True) or {}
    name = " ".join(str(data.get("name", "")).split())
    strength = " ".join(str(data.get("strength", "")).split())
    qty = read_quantity(data)
    if not name or not strength:
        return jsonify(error="Medicine name and strength are required."), 400
    if qty is None:
        return jsonify(error="Quantity must be a whole number (0 or more)."), 400

    # reuse the medicine if it already exists, otherwise create it
    med = query("SELECT id FROM medicines WHERE lower(name) = lower(?) AND lower(strength) = lower(?)",
                (name, strength), one=True)
    if med:
        medicine_id = med["id"]
    else:
        medicine_id, _ = execute("INSERT INTO medicines (name, strength) VALUES (?, ?)",
                                 (name[0].upper() + name[1:], strength))

    if query("SELECT id FROM stock WHERE pharmacy_id = ? AND medicine_id = ?",
             (session["pharmacy_id"], medicine_id), one=True):
        return jsonify(error="This medicine is already in your inventory. Update its quantity instead."), 409

    execute("INSERT INTO stock (pharmacy_id, medicine_id, quantity, available) VALUES (?,?,?,?)",
            (session["pharmacy_id"], medicine_id, qty, 1 if qty > 0 else 0))
    return jsonify(message=f"{name} {strength} added to your inventory."), 201


@stock_bp.route("/update", methods=["PUT"])
@login_required
def update_stock():
    data = request.get_json(silent=True) or {}
    qty = read_quantity(data)
    if qty is None:
        return jsonify(error="Quantity must be a whole number (0 or more)."), 400
    _, changed = execute("UPDATE stock SET quantity = ?, available = ? WHERE pharmacy_id = ? AND medicine_id = ?",
                         (qty, 1 if qty > 0 else 0, session["pharmacy_id"], data.get("medicine_id")))
    if not changed:
        return jsonify(error="Medicine not found in your inventory."), 404
    return jsonify(message="Stock updated.")


@stock_bp.route("/unavailable", methods=["PUT"])
@login_required
def mark_unavailable():
    data = request.get_json(silent=True) or {}
    _, changed = execute("UPDATE stock SET quantity = 0, available = 0 WHERE pharmacy_id = ? AND medicine_id = ?",
                         (session["pharmacy_id"], data.get("medicine_id")))
    if not changed:
        return jsonify(error="Medicine not found in your inventory."), 404
    return jsonify(message="Marked as unavailable.")


@stock_bp.route("/predict")
def predict():
    pharmacy_id = request.args.get("pharmacy_id", type=int)   # optional: leave empty for all pharmacies
    return jsonify(predictions=predict_shortages(pharmacy_id))
