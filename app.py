"""MediFind - Medicine Availability Finder (college demo project).
Run:  python app.py   then open http://127.0.0.1:5000
All pharmacy and stock data is FICTIONAL demonstration data.
"""
import os

from flask import Flask, jsonify, render_template, request

from database.db import DB_PATH
from database.init_db import init_db
from routes.medicine_routes import medicine_bp
from routes.pharmacy_routes import auth_bp, pharmacy_bp
from routes.stock_routes import stock_bp

app = Flask(__name__)
app.secret_key = "medifind-demo-secret-key"        # needed for login sessions (demo only)

for blueprint in (medicine_bp, pharmacy_bp, stock_bp, auth_bp):
    app.register_blueprint(blueprint)

# create + fill the database automatically the first time the app runs
if not os.path.exists(DB_PATH):
    init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search")
def search_results():
    return render_template("search_results.html")


@app.route("/dashboard")
def pharmacy_dashboard():
    return render_template("pharmacy_dashboard.html")


@app.errorhandler(404)
def not_found(_):
    if request.path.startswith("/api"):
        return jsonify(error="API endpoint not found."), 404
    return render_template("index.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
