// Helper functions used on every page.

// Wrapper around fetch(): sends/receives JSON and throws a readable error message.
async function api(url, options = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

// Escape text before putting it in HTML (prevents broken markup / injection).
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Small message at the bottom of the screen.
let toastTimer;
function toast(message, isError = false) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function statusBadge(inStock) {
  return inStock ? '<span class="badge in">In Stock</span>' : '<span class="badge out">Out of Stock</span>';
}

// Fill the autocomplete list and strength dropdown of the search bar (if the page has one).
async function setupSearchBar() {
  const form = document.getElementById("search-form");
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  document.getElementById("q").value = params.get("q") || "";
  try {
    const [names, strengths] = await Promise.all([api("/api/medicines/names"), api("/api/medicines/strengths")]);
    document.getElementById("medicine-names").innerHTML = names.names.map(n => `<option value="${esc(n)}">`).join("");
    const select = document.getElementById("strength");
    strengths.strengths.forEach(s => select.insertAdjacentHTML("beforeend", `<option value="${esc(s)}">${esc(s)}</option>`));
    select.value = params.get("strength") || "";
  } catch (err) {
    console.error(err);
  }
}
document.addEventListener("DOMContentLoaded", setupSearchBar);
