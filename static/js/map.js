// Leaflet + OpenStreetMap helpers.
const DEMO_CENTER = { lat: 12.2958, lng: 76.6394 };   // demo city centre (Mysuru)
let map, markerLayer, userMarker;
const markers = {};                                   // pharmacy id -> marker

function initMap(elementId) {
  map = L.map(elementId).setView([DEMO_CENTER.lat, DEMO_CENTER.lng], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}

// Link that opens turn-by-turn directions to the pharmacy coordinates.
function directionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function pinIcon(inStock) {
  return L.divIcon({
    className: "",
    html: `<span class="pin ${inStock ? "pin-in" : "pin-out"}"></span>`,
    iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10]
  });
}

// HTML shown when a marker is clicked.
function popupHtml(p) {
  const items = (p.items || []).map(i =>
    `<li>${esc(i.medicine)} ${esc(i.strength)}: ${i.in_stock ? i.quantity + " in stock" : "Out of stock"}</li>`).join("");
  return `<div class="popup">
    <strong>${esc(p.name)}</strong>
    <div>${esc(p.address)}</div>
    <div>${esc(p.phone || "")}</div>
    ${items ? `<ul>${items}</ul>` : ""}
    <a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="${directionsUrl(p.latitude, p.longitude)}">Get directions</a>
  </div>`;
}

// Draw one marker per pharmacy and zoom the map to fit them.
function showMarkers(pharmacies) {
  markerLayer.clearLayers();
  Object.keys(markers).forEach(k => delete markers[k]);
  pharmacies.forEach(p => {
    const m = L.marker([p.latitude, p.longitude], { icon: pinIcon(p.in_stock !== false) })
      .bindPopup(popupHtml(p));
    m.addTo(markerLayer);
    markers[p.id] = m;
  });
  if (pharmacies.length) {
    map.fitBounds(L.latLngBounds(pharmacies.map(p => [p.latitude, p.longitude])), { padding: [40, 40], maxZoom: 15 });
  }
}

function focusPharmacy(id) {
  const m = markers[id];
  if (m) { map.setView(m.getLatLng(), 15); m.openPopup(); }
}

function showUserLocation(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat, lng], { radius: 8, color: "#14263b", fillColor: "#14263b", fillOpacity: 0.9 })
    .addTo(map).bindPopup("You are here");
}
