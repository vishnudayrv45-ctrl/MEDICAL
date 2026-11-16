"""AI feature 1: suggest the closest medicine name when the user makes a spelling mistake.
Uses Python's difflib (string similarity) - lightweight, no paid API needed.
NOTE: this only fixes spelling. It never suggests alternative medicines.
"""
import difflib
from database.db import query


def suggest_medicine(text, limit=3, cutoff=0.6):
    """Return up to `limit` medicine names that look similar to `text`."""
    text = text.lower().strip()
    if not text:
        return []
    names = {row["name"].lower(): row["name"] for row in query("SELECT DISTINCT name FROM medicines")}
    # compare the whole text first, then just its first word (e.g. "paracetmol 500")
    matches = difflib.get_close_matches(text, list(names), n=limit, cutoff=cutoff)
    if not matches and " " in text:
        matches = difflib.get_close_matches(text.split()[0], list(names), n=limit, cutoff=cutoff)
    return [names[m] for m in matches]
