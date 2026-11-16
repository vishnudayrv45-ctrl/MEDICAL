"""Creates the SQLite database and fills it with DEMONSTRATION data from /data/*.csv.
Run:  python database/init_db.py
"""
import csv
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)                      # so "from database.db import ..." works when run directly
from database.db import DB_PATH, get_connection

SCHEMA = """
DROP TABLE IF EXISTS stock_history;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS medicines;
DROP TABLE IF EXISTS pharmacies;

CREATE TABLE medicines (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, strength TEXT NOT NULL, UNIQUE (name, strength));

CREATE TABLE pharmacies (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, phone TEXT,
    latitude REAL NOT NULL, longitude REAL NOT NULL);

-- current stock of each medicine in each pharmacy
CREATE TABLE stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
    medicine_id INTEGER NOT NULL REFERENCES medicines(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    available INTEGER NOT NULL DEFAULT 1,       -- 1 = available, 0 = marked unavailable
    UNIQUE (pharmacy_id, medicine_id));

-- past daily quantities, used by the shortage prediction model
CREATE TABLE stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pharmacy_id INTEGER NOT NULL, medicine_id INTEGER NOT NULL,
    day INTEGER NOT NULL, quantity INTEGER NOT NULL);

CREATE INDEX idx_stock_medicine ON stock (medicine_id);
CREATE INDEX idx_history_item ON stock_history (pharmacy_id, medicine_id);
"""


def read_csv(filename):
    path = os.path.join(ROOT, "data", filename)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def init_db():
    conn = get_connection()
    conn.executescript(SCHEMA)
    conn.executemany("INSERT INTO medicines VALUES (?,?,?)",
        [(int(r["id"]), r["name"], r["strength"]) for r in read_csv("sample_medicines.csv")])
    conn.executemany("INSERT INTO pharmacies VALUES (?,?,?,?,?,?)",
        [(int(r["id"]), r["name"], r["address"], r["phone"], float(r["latitude"]), float(r["longitude"]))
         for r in read_csv("sample_pharmacies.csv")])
    conn.executemany("INSERT INTO stock (pharmacy_id, medicine_id, quantity, available) VALUES (?,?,?,?)",
        [(int(r["pharmacy_id"]), int(r["medicine_id"]), int(r["quantity"]), int(r["available"]))
         for r in read_csv("sample_stock.csv")])
    conn.executemany("INSERT INTO stock_history (pharmacy_id, medicine_id, day, quantity) VALUES (?,?,?,?)",
        [(int(r["pharmacy_id"]), int(r["medicine_id"]), int(r["day"]), int(r["quantity"]))
         for r in read_csv("sample_stock_history.csv")])
    conn.commit()
    for table in ("medicines", "pharmacies", "stock", "stock_history"):
        print(f"{table}: {conn.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]} rows")
    conn.close()
    print("Demo database ready at", DB_PATH)


if __name__ == "__main__":
    init_db()
