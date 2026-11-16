// Pharmacy dashboard: demo login, inventory, add / update / mark unavailable, shortage prediction.
let pharmacy = null;
let inventory = [];
const LOW_STOCK = 20;

const $ = id => document.getElementById(id);

// ---------- login ----------
async function init() {
  try {
    const me = await api("/api/me");
    if (me.logged_in) return showDashboard(me.pharmacy);
    const list = await api("/api/pharmacies/locations");
    $("login-pharmacy").innerHTML = list.pharmacies.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  } catch (err) { toast(err.message, true); }
  $("login-view").classList.remove("hidden");
}

$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  $("login-error").classList.add("hidden");
  try {
    const data = await api("/api/login", { method: "POST", body: JSON.stringify({
      pharmacy_id: Number($("login-pharmacy").value), password: $("login-password").value }) });
    showDashboard(data.pharmacy);
  } catch (err) {
    $("login-error").textContent = err.message;
    $("login-error").classList.remove("hidden");
  }
});

$("logout-btn").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  window.location.reload();
});

async function showDashboard(p) {
  pharmacy = p;
  $("login-view").classList.add("hidden");
  $("dash-view").classList.remove("hidden");
  $("dash-title").textContent = p.name;
  $("dash-sub").textContent = p.address || "Demo pharmacy account";
  try {
    const names = await api("/api/medicines/names");
    $("medicine-names").innerHTML = names.names.map(n => `<option value="${esc(n)}">`).join("");
  } catch (err) { console.error(err); }
  refresh();
}

async function refresh() {
  await Promise.all([loadInventory(), loadPredictions()]);
}

// ---------- inventory ----------
async function loadInventory() {
  try {
    inventory = (await api("/api/stock/inventory")).items;
    renderStats();
    renderInventory();
  } catch (err) { toast(err.message, true); }
}

function renderStats() {
  const inStock = inventory.filter(i => i.in_stock);
  $("s-total").textContent = inventory.length;
  $("s-in").textContent = inStock.length;
  $("s-low").textContent = inStock.filter(i => i.quantity < LOW_STOCK).length;
  $("s-out").textContent = inventory.length - inStock.length;
}

function renderInventory() {
  const text = $("inv-search").value.trim().toLowerCase();
  const filter = $("inv-filter").value;
  const rows = inventory.filter(i => {
    if (text && !(`${i.name} ${i.strength}`).toLowerCase().includes(text)) return false;
    if (filter === "in") return i.in_stock;
    if (filter === "out") return !i.in_stock;
    if (filter === "low") return i.in_stock && i.quantity < LOW_STOCK;
    return true;
  });
  if (!rows.length) {
    $("inventory").innerHTML = '<div class="notice">No medicines match. Add a medicine above or change the filter.</div>';
    return;
  }
  $("inventory").innerHTML = rows.map(i => `
    <div class="inv-row" data-id="${i.medicine_id}">
      <div class="inv-name"><strong>${esc(i.name)}</strong> <span class="muted">${esc(i.strength)}</span></div>
      <div>${statusBadge(i.in_stock)}${i.in_stock && i.quantity < LOW_STOCK ? ' <span class="badge low">Low</span>' : ""}</div>
      <div class="inv-actions">
        <input type="number" min="0" value="${i.quantity}" class="qty-input" aria-label="Quantity for ${esc(i.name)}">
        <button class="btn btn-outline btn-sm" data-action="update">Update stock</button>
        <button class="btn btn-ghost btn-sm" data-action="unavailable" ${i.in_stock ? "" : "disabled"}>Mark unavailable</button>
      </div>
    </div>`).join("");
}

$("inv-search").addEventListener("input", renderInventory);
$("inv-filter").addEventListener("change", renderInventory);

// One click handler for all Update / Mark unavailable buttons
$("inventory").addEventListener("click", async e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const row = btn.closest(".inv-row");
  const medicine_id = Number(row.dataset.id);
  try {
    if (btn.dataset.action === "update") {
      const quantity = row.querySelector(".qty-input").value;
      const res = await api("/api/stock/update", { method: "PUT", body: JSON.stringify({ medicine_id, quantity }) });
      toast(res.message);
    } else {
      const res = await api("/api/stock/unavailable", { method: "PUT", body: JSON.stringify({ medicine_id }) });
      toast(res.message);
    }
    refresh();
  } catch (err) { toast(err.message, true); }
});

// ---------- add medicine ----------
$("add-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const res = await api("/api/stock/add", { method: "POST", body: JSON.stringify({
      name: $("a-name").value, strength: $("a-strength").value, quantity: $("a-qty").value }) });
    toast(res.message);
    $("add-form").reset();
    $("a-qty").value = 0;
    refresh();
  } catch (err) { toast(err.message, true); }
});

// ---------- AI shortage prediction ----------
async function loadPredictions() {
  try {
    const list = (await api(`/api/stock/predict?pharmacy_id=${pharmacy.id}`)).predictions;
    $("predictions").innerHTML = list.length ? list.map(p => `
      <div class="pred-row">
        <div><strong>${esc(p.medicine)}</strong><div class="muted small">${p.quantity} left, about ${p.daily_use} used per day</div></div>
        <div class="pred-right"><span class="badge ${p.risk === "High" ? "out" : "low"}">${p.risk} risk</span>
        <div class="muted small">~${p.days_left} days left</div></div>
      </div>`).join("")
      : '<div class="notice">No shortages predicted for the next 7 days.</div>';
  } catch (err) { $("predictions").innerHTML = `<div class="notice error">${esc(err.message)}</div>`; }
}

init();
