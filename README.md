# MediFind – Medicine Availability Finder

A simple college demo project that helps people find which nearby pharmacies have a medicine in stock.

> **All pharmacies, addresses, phone numbers and stock levels are FICTIONAL demonstration data. This is not real-time pharmacy stock and it gives no medical advice.**

## Tech stack
- Frontend: HTML, CSS, JavaScript (fetch API)
- Backend: Python Flask
- Database: SQLite (no setup needed)
- AI: scikit-learn (stock prediction) and difflib (spelling suggestions)
- Maps: Leaflet.js + OpenStreetMap (needs internet for map tiles)
- 3D home page animation: Three.js (loaded from a CDN, needs internet)

## How to run
1. Install Python 3.9 or newer.
2. Open a terminal in the `medifind` folder.
3. (Optional) create a virtual environment:
   - Windows: `python -m venv venv` then `venv\Scripts\activate`
   - Mac/Linux: `python3 -m venv venv` then `source venv/bin/activate`
4. Install packages: `pip install -r requirements.txt`
5. (Optional) reset the demo data: `python database/init_db.py` (the app also does this automatically the first time).
6. Start the app: `python app.py`
7. Open **http://127.0.0.1:5000** in your browser.

## Demo walkthrough
1. **Home** – search "Paracetamol" (or misspell it: "paracetmol" to see the suggestion).
2. **Results** – compare pharmacies, use the *In stock only* and *Nearby* filters, click *View on map* and *Get directions*.
3. **Dashboard** (`/dashboard`) – log in with any pharmacy and the password `demo123`. Add a medicine, update a quantity, mark a medicine unavailable.
4. **Shortage prediction** – shown on the dashboard. Lower a quantity (for example to 5) and see the prediction list change.

Note: the *Nearby* filter measures from a demo city centre (Mysuru) unless you click *Use my location*. If you are far from Mysuru, use the demo centre.

## Folder structure
```
medifind/
├── app.py                  starts Flask and shows the pages
├── requirements.txt
├── database/
│   ├── db.py               SQLite connection helpers
│   └── init_db.py          creates tables and loads CSV demo data
├── routes/
│   ├── medicine_routes.py  medicine search, names, strengths
│   ├── pharmacy_routes.py  pharmacy search, map locations, details, demo login
│   └── stock_routes.py     stock check, add, update, mark unavailable, prediction
├── ai/
│   ├── medicine_matching.py  spelling suggestions
│   └── stock_prediction.py   linear regression shortage prediction
├── templates/              base, index, search_results, pharmacy_dashboard
├── static/css, js, images
└── data/                   sample CSV files (medicines, pharmacies, stock, stock history)
```

## API endpoints
- `GET  /api/medicines/search?q=&strength=` – search medicines (with suggestions)
- `GET  /api/pharmacies/search?q=&strength=&in_stock=1&lat=&lng=&radius=` – matching pharmacies
- `GET  /api/pharmacies/locations` – all pharmacy coordinates (map)
- `GET  /api/pharmacies/<id>` – pharmacy details and inventory
- `GET  /api/stock/check?pharmacy_id=&medicine_id=` – stock of one medicine
- `POST /api/stock/add` – add a medicine to inventory (login required)
- `PUT  /api/stock/update` – change quantity (login required)
- `PUT  /api/stock/unavailable` – mark unavailable (login required)
- `GET  /api/stock/predict?pharmacy_id=` – shortage predictions
- `POST /api/login`, `POST /api/logout`, `GET /api/me` – demo login

## 3D animation on the home page
`static/js/hero3d.js` draws a rotating capsule, location pin, medical cross and floating tablets with Three.js. It tilts with the mouse, pauses when scrolled out of view, and is hidden automatically if WebGL is unavailable. To change colours, edit the `TEAL`, `NAVY` and `WHITE` values at the top of the file.

## How the AI parts work
- **Spelling suggestion:** `difflib.get_close_matches` compares the typed text with all medicine names and returns the closest ones. It never suggests alternative medicines.
- **Shortage prediction:** for each medicine, a scikit-learn `LinearRegression` model is fitted on 14 days of sample stock history. The slope gives the daily usage, and `days_left = current quantity / daily usage`. If it is 7 days or less, the medicine is flagged (High risk: 3 days or less, Medium: 4 to 7 days).

## Limitations (demo project)
- Demo login uses one shared password and is not secure.
- Data is fictional and the history is sample data.
- Predictions use a simple straight-line model.
