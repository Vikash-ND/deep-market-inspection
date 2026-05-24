const AUTH_API = window.location.origin + "/api/v1/auth";

// ── Token helpers ──────────────────────────────────
function getToken()  { return localStorage.getItem("dmi_token"); }
function getUser()   { return JSON.parse(localStorage.getItem("dmi_user") || "null"); }
function setSession(token, user) {
  localStorage.setItem("dmi_token", token);
  localStorage.setItem("dmi_user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("dmi_token");
  localStorage.removeItem("dmi_user");
}

function authHeaders() {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` };
}

// ── UI state ───────────────────────────────────────
function updateAuthUI() {
  const user     = getUser();
  const loginBtn = document.getElementById("auth-login-btn");
  const userMenu = document.getElementById("auth-user-menu");
  const userName = document.getElementById("auth-username");
  if (!loginBtn) return;
  if (user) {
    loginBtn.style.display = "none";
    userMenu.style.display = "flex";
    userName.textContent   = user.username;
  } else {
    loginBtn.style.display = "block";
    userMenu.style.display = "none";
  }
}

function logout() {
  clearSession();
  updateAuthUI();
  closeModal();
  document.getElementById("user-panel").style.display = "none";
  showToast("Logged out successfully");
}

// ── Modal ──────────────────────────────────────────
function openModal(tab = "login") {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.style.display = "flex";
  switchTab(tab);
  clearAuthErrors();
}

function closeModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "none";
  clearAuthErrors();
}

function switchTab(tab) {
  document.getElementById("login-form").style.display  = tab === "login"  ? "block" : "none";
  document.getElementById("signup-form").style.display = tab === "signup" ? "block" : "none";
  document.querySelectorAll(".auth-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === tab)
  );
}

function clearAuthErrors() {
  document.querySelectorAll(".auth-error").forEach(el => el.textContent = "");
}

// ── Signup ─────────────────────────────────────────
async function handleSignup() {
  const username = document.getElementById("signup-username").value.trim();
  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const errEl    = document.getElementById("signup-error");

  if (!username || !email || !password) { errEl.textContent = "All fields are required"; return; }

  try {
    const res  = await fetch(`${AUTH_API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.detail; return; }
    setSession(data.token, { username: data.username, email: data.email });
    updateAuthUI();
    closeModal();
    showToast(`Welcome, ${data.username}! 🎉`);
    loadUserData();
  } catch {
    errEl.textContent = "Something went wrong. Try again.";
  }
}

// ── Login ──────────────────────────────────────────
async function handleLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");

  if (!email || !password) { errEl.textContent = "All fields are required"; return; }

  try {
    const res  = await fetch(`${AUTH_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.detail; return; }
    setSession(data.token, { username: data.username, email: data.email });
    updateAuthUI();
    closeModal();
    showToast(`Welcome back, ${data.username}! 👋`);
    loadUserData();
  } catch {
    errEl.textContent = "Something went wrong. Try again.";
  }
}

// ── Watchlist ──────────────────────────────────────
async function addToWatchlist(ticker, name) {
  if (!getToken()) { openModal("login"); return; }
  try {
    await fetch(`${AUTH_API}/watchlist`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ticker, name })
    });
    showToast(`${ticker} added to watchlist ⭐`);
    loadUserData();
  } catch { showToast("Failed to add to watchlist", true); }
}

async function removeFromWatchlist(ticker) {
  try {
    await fetch(`${AUTH_API}/watchlist/${ticker}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    showToast(`${ticker} removed`);
    loadUserData();
  } catch { showToast("Failed to remove", true); }
}

// ── Notes ──────────────────────────────────────────
async function saveNote(ticker, note) {
  if (!getToken()) { openModal("login"); return; }
  if (!note.trim()) { showToast("Note is empty", true); return; }
  try {
    await fetch(`${AUTH_API}/notes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ticker, note })
    });
    showToast("Note saved 📝");
    loadUserData();
  } catch { showToast("Failed to save note", true); }
}

// ── History ────────────────────────────────────────
async function saveHistory(ticker, period, summary) {
  if (!getToken()) return;
  try {
    await fetch(`${AUTH_API}/history`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ticker, period, summary })
    });
  } catch {}
}

// ── Load user dashboard data ───────────────────────
async function loadUserData() {
  if (!getToken()) return;
  try {
    const [wlRes, histRes, notesRes] = await Promise.all([
      fetch(`${AUTH_API}/watchlist`, { headers: authHeaders() }),
      fetch(`${AUTH_API}/history`,   { headers: authHeaders() }),
      fetch(`${AUTH_API}/notes`,     { headers: authHeaders() })
    ]);
    const watchlist = await wlRes.json();
    const history   = await histRes.json();
    const notes     = await notesRes.json();
    renderUserPanel(watchlist, history, notes);
  } catch {}
}

function renderUserPanel(watchlist, history, notes) {
  const panel = document.getElementById("user-panel");
  if (!panel) return;
  panel.style.display = "block";

  document.getElementById("watchlist-items").innerHTML = watchlist.length
    ? watchlist.map(w => `
        <div class="user-item">
          <span class="user-item-ticker" onclick="quickLoad('${w.ticker}','${w.name}')">${w.ticker}</span>
          <span class="user-item-name">${w.name}</span>
          <button class="user-item-remove" onclick="removeFromWatchlist('${w.ticker}')">✕</button>
        </div>`).join("")
    : `<p class="user-empty">No stocks in watchlist yet. Analyse a stock and click ⭐</p>`;

  document.getElementById("history-items").innerHTML = history.length
    ? history.slice(0,8).map(h => `
        <div class="user-item" onclick="quickLoad('${h.ticker}','')">
          <span class="user-item-ticker">${h.ticker}</span>
          <span class="user-item-name">${h.period}</span>
          <span class="signal-pill ${h.summary}">${h.summary}</span>
        </div>`).join("")
    : `<p class="user-empty">No analysis history yet</p>`;

  document.getElementById("notes-items").innerHTML = notes.length
    ? notes.map(n => `
        <div class="note-item">
          <span class="note-ticker">${n.ticker}</span>
          <p class="note-text">${n.note}</p>
        </div>`).join("")
    : `<p class="user-empty">No notes yet</p>`;
}

// ── Panel tab switcher ─────────────────────────────
function switchPanelTab(tab) {
  ["watchlist","history","notes"].forEach(t => {
    document.getElementById(`panel-${t}`).style.display = t === tab ? "block" : "none";
  });
  document.querySelectorAll(".upanel-tab").forEach((btn, i) => {
    btn.classList.toggle("active", ["watchlist","history","notes"][i] === tab);
  });
}

// ── Toast ──────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className   = "toast show" + (isError ? " error" : "");
  setTimeout(() => t.className = "toast", 3000);
}

// ── Init ───────────────────────────────────────────
function initAuth() {
  updateAuthUI();
  if (getToken()) loadUserData();

  const modal = document.getElementById("auth-modal");
  if (modal) {
    modal.addEventListener("click", e => {
      if (e.target.id === "auth-modal") closeModal();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}