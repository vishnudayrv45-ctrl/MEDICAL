// Search results page: calls the Flask API with fetch() and draws cards + map markers.
const params = new URLSearchParams(window.location.search);
const searchText = (params.get("q") || "").trim();
const searchStrength = params.get("strength") || "";
let userLocation = null;                       // set when the user clicks "Use my location"

const listEl = document.getElementById("results");
const summaryEl = document.getElementById("result-summary");
const noteEl = document.getElementById("f-note");

initMap("map");

async function runSearch() {
  if (!searchText) {
    listEl.innerHTML = '<div class="notice">Enter a medicine name above to see which pharmacies have it.</div>';
    return;
  }
  document.getElementById("result-title").textContent = `Results for “${searchText}”`;
  listEl.innerHTML = '<div class="notice">Searching...</div>';

  // build the query string from the search bar + filters
  const p = new URLSearchParams({ q: searchText, strength: searchStrength });
  if (document.getElementById("f-instock").checked) p.set("in_stock", "1");
  const radius = document.getElementById("f-radius").value;
  const origin = userLocation || (radius ? DEMO_CENTER : null);
  if (origin) { p.set("lat", origin.lat); p.set("lng", origin.lng); }
  if (radius) p.set("radius", radius);
  noteEl.textContent = radius && !userLocation ? "Measuring from the demo city centre. Click “Use my location” to change." : "";

  try {
    render(await api("/api/pharmacies/search?" + p.toString()));
  } catch (err) {
    listEl.innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
  }
}

function render(data) {
  summaryEl.textContent = "";
  // Case 1: medicine not found -> show spelling suggestions
  if (!data.found) {
    showMarkers([]);
    const links = (data.suggestions || []).map(s => `<a href="/search?q=${encodeURIComponent(s)}">${esc(s)}</a>`).join(", ");
    listEl.innerHTML = `<div class="notice">${esc(data.message)}${links ? `<br>Did you mean: <strong>${links}</strong>?` : "<br>Check the spelling and try again."}</div>`;
    return;
  }
  // Case 2: medicine exists but no pharmacy matches the filters
  if (!data.results.length) {
    showMarkers([]);
    listEl.innerHTML = '<div class="notice">No pharmacies match these filters. Try removing “In stock only” or choosing a larger distance.</div>';
    return;
  }
  // Case 3: show pharmacy cards
  summaryEl.textContent = `${data.count} pharmacies listed for ${[...new Set(data.medicines.map(m => m.name))].join(", ")}`;
  listEl.innerHTML = data.results.map(cardHtml).join("");
  showMarkers(data.results);
}

function cardHtml(p) {
  const items = p.items.map(i => `
    <li>
      <span>${esc(i.medicine)} <span class="muted">${esc(i.strength)}</span></span>
      ${statusBadge(i.in_stock)}
      <span class="qty">${i.in_stock ? i.quantity + " units" : "Unavailable"}</span>
    </li>`).join("");
  return `
    <article class="card pharmacy-card">
      <div class="card-head">
        <h3>${esc(p.name)}</h3>
        ${p.distance_km !== undefined ? `<span class="distance">${p.distance_km} km</span>` : ""}
      </div>
      <p class="muted">${esc(p.address)}</p>
      <p class="phone">Phone: <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></p>
      <ul class="med-list">${items}</ul>
      <div class="actions">
        <a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="${directionsUrl(p.latitude, p.longitude)}">Get directions</a>
        <button type="button" class="btn btn-outline btn-sm" data-map="${p.id}">View on map</button>
      </div>
    </article>`;
}

// "View on map" button -> open the marker popup
listEl.addEventListener("click", e => {
  const btn = e.target.closest("[data-map]");
  if (!btn) return;
  focusPharmacy(Number(btn.dataset.map));
  if (window.innerWidth < 900) document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "center" });
});

// Filters
document.getElementById("f-instock").addEventListener("change", runSearch);
document.getElementById("f-radius").addEventListener("change", runSearch);
document.getElementById("f-location").addEventListener("click", () => {
  if (!navigator.geolocation) return toast("Your browser does not support location.", true);
  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    showUserLocation(userLocation.lat, userLocation.lng);
    toast("Location found. Distances updated.");
    runSearch();
  }, () => toast("Could not get your location. Allow location access and try again.", true));
});

runSearch();
