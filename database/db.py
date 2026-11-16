"""Database helper: one place that talks to SQLite."""
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "medifind.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # lets us read columns by name
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def query(sql, params=(), one=False):
    """Run a SELECT. Returns a list of dicts (or a single dict if one=True)."""
    conn = get_connection()
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    conn.close()
    if one:
        return rows[0] if rows else None
    return rows


def execute(sql, params=()):
    """Run INSERT / UPDATE / DELETE. Returns (last_row_id, rows_changed)."""
    conn = get_connection()
    cur = conn.execute(sql, params)
    conn.commit()
    result = (cur.lastrowid, cur.rowcount)
    conn.close()
    return result
