const API = window.location.origin + "/api/v1";
let selectedTicker = "";
let selectedName   = "";
let searchTimer    = null;

// ── Toast (standalone, no auth.js dependency) ──────
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className   = "toast show" + (isError ? " error" : "");
  setTimeout(() => t.className = "toast", 3000);
}

// ── Clock ──────────────────────────────────────────
function updateClock() {
  const el = document.getElementById("clock");
  if (el) el.textContent = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}
setInterval(updateClock, 1000);
updateClock();

// ── Candle background ──────────────────────────────
(function () {
  const canvas = document.getElementById("candle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let candles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  function makeCandle() {
    const up = Math.random() > 0.5;
    return {
      x: Math.random() * canvas.width, y: canvas.height + 100,
      bodyH: 20 + Math.random() * 60, wickH: 10 + Math.random() * 30,
      width: 8 + Math.random() * 10, speed: 0.4 + Math.random() * 0.6,
      color: up ? "#22c55e" : "#ef4444", alpha: 0.2 + Math.random() * 0.35
    };
  }
  function drawCandle(c) {
    ctx.globalAlpha = c.alpha;
    ctx.strokeStyle = c.color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - c.bodyH - c.wickH);
    ctx.lineTo(c.x, c.y + c.wickH);
    ctx.stroke();
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x - c.width / 2, c.y - c.bodyH, c.width, c.bodyH);
    ctx.globalAlpha = 1;
  }
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (candles.length < 18) candles.push(makeCandle());
    candles.forEach(c => { c.y -= c.speed; });
    candles = candles.filter(c => c.y + c.bodyH + c.wickH > 0);
    candles.forEach(drawCandle);
    requestAnimationFrame(loop);
  }
  window.addEventListener("resize", resize);
  resize();
  for (let i = 0; i < 14; i++) {
    const c = makeCandle();
    c.y = Math.random() * canvas.height;
    candles.push(c);
  }
  loop();
})();

// ── Progress bar ───────────────────────────────────
function setProgress(pct) {
  const bar = document.getElementById("progress-bar");
  if (!bar) return;
  bar.style.width = pct + "%";
  if (pct >= 100) setTimeout(() => { bar.style.width = "0%"; }, 400);
}

// ── Search ─────────────────────────────────────────
async function onSearchInput(value) {
  const box = document.getElementById("suggestions");
  selectedTicker = "";
  if (value.length < 2) { box.innerHTML = ""; return; }
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      const res     = await fetch(`${API}/search?q=${encodeURIComponent(value)}`);
      const results = await res.json();
      if (!results.length) { box.innerHTML = ""; return; }
      box.innerHTML = results.map(r => `
        <div class="suggestion-item"
             onclick="selectTicker('${r.symbol}','${r.name.replace(/'/g, "")}')">
          <span class="suggestion-symbol">${r.symbol}</span>
          <span class="suggestion-name">${r.name}</span>
          <span class="suggestion-exchange">${r.exchange}</span>
        </div>`).join("");
    } catch { box.innerHTML = ""; }
  }, 350);
}

function selectTicker(symbol, name) {
  selectedTicker = symbol;
  selectedName   = name;
  document.getElementById("ticker-input").value = `${symbol} — ${name}`;
  document.getElementById("suggestions").innerHTML = "";
}

function loadAnalysis() {
  const inputVal = document.getElementById("ticker-input").value.trim();
  const ticker   = selectedTicker || inputVal.split("—")[0].trim().toUpperCase();
  const period   = document.getElementById("period-select").value;
  if (!ticker) return;
  window.location.href = `/analysis/${ticker}?period=${period}`;
}

// ── Fetch & render analysis ────────────────────────
async function fetchAnalysis(ticker, period) {
  setProgress(20);
  document.getElementById("loading") && (document.getElementById("loading").style.display = "block");

  try {
    setProgress(40);
    const res = await fetch(`${API}/stock/${ticker}/analysis?period=${period}`);
    setProgress(70);

    if (!res.ok) throw new Error(`Could not find data for "${ticker}".`);
    const data = await res.json();

    // fetch 52W + change data
    try {
      const infoRes  = await fetch(`${API}/stock/${ticker}`);
      const infoData = await infoRes.json();
      data.week52_high = infoData.week52_high;
      data.week52_low  = infoData.week52_low;
      data.change_pct  = infoData.change_pct;
    } catch {}

    selectedTicker = ticker;
    selectedName   = data.ticker;
    setProgress(90);
    render(data);
    setProgress(100);

  } catch (err) {
    console.error("fetchAnalysis error:", err);
    const errEl = document.getElementById("error-msg");
    if (errEl) {
      errEl.textContent = `⚠️ ${err.message}`;
      errEl.style.display = "block";
    }
    setProgress(100);
  } finally {
    const loadEl = document.getElementById("loading");
    if (loadEl) loadEl.style.display = "none";
  }
}

// ── Render ─────────────────────────────────────────
function render(data) {
  const cards = document.getElementById("summary-cards");
  if (!cards) return;

  document.title = `${data.ticker} Analysis — Deep Market Inspection`;

  const breadcrumb = document.getElementById("analysis-breadcrumb");
  if (breadcrumb) breadcrumb.textContent = `${data.ticker} · ${data.period} Analysis`;

  const isIndian = selectedTicker.endsWith(".NS") || selectedTicker.endsWith(".BO");
  const currency = isIndian ? "₹" : "$";

  const w52h     = data.week52_high ? `${currency}${parseFloat(data.week52_high).toFixed(2)}` : "N/A";
  const w52l     = data.week52_low  ? `${currency}${parseFloat(data.week52_low).toFixed(2)}`  : "N/A";
  const chg      = data.change_pct;
  const chgText  = chg !== null && chg !== undefined
    ? `${chg > 0 ? "+" : ""}${chg}%`
    : "N/A";
  const chgColor = chg > 0 ? "var(--green)" : chg < 0 ? "var(--red)" : "var(--amber)";

  cards.innerHTML = `
    <div class="glass-card stat-card">
      <p class="card-label">Ticker</p>
      <p class="card-value">${data.ticker}</p>
    </div>
    <div class="glass-card stat-card">
      <p class="card-label">Company</p>
      <p class="card-value" style="font-size:15px">${selectedName || data.ticker}</p>
    </div>
    <div class="glass-card stat-card">
      <p class="card-label">Latest Price</p>
      <p class="card-value">${currency}${data.latest_price}</p>
    </div>
    <div class="glass-card stat-card">
      <p class="card-label">Change</p>
      <p class="card-value" style="color:${chgColor}">${chgText}</p>
    </div>
    <div class="glass-card stat-card">
      <p class="card-label">Overall Signal</p>
      <p class="card-value ${data.summary}">${data.summary}</p>
    </div>
    <div class="glass-card stat-card">
      <p class="card-label">52W High</p>
      <p class="card-value" style="color:var(--green)">${w52h}</p>
    </div>
    <div class="glass-card stat-card">
      <p class="card-label">52W Low</p>
      <p class="card-value" style="color:var(--red)">${w52l}</p>
    </div>
    <div class="glass-card stat-card">
      <p class="card-label">Period</p>
      <p class="card-value">${data.period}</p>
    </div>
  `;

  // Action bar
  const actionBar = document.getElementById("action-bar");
  if (actionBar) actionBar.style.display = "flex";

  // Save history if auth available
  try { saveHistory(data.ticker, data.period, data.summary); } catch {}

  // Save recently viewed
  try {
    let recent = JSON.parse(localStorage.getItem("dmi_recent") || "[]");
    recent     = recent.filter(r => r.ticker !== data.ticker);
    recent.unshift({ ticker: data.ticker, name: selectedName });
    localStorage.setItem("dmi_recent", JSON.stringify(recent.slice(0, 6)));
  } catch {}

  // Signals
  const grid = document.getElementById("signals-grid");
  if (grid) {
    grid.innerHTML = data.signals.map(s => `
      <div class="signal-card ${s.signal}">
        <div class="signal-name">${s.indicator}</div>
        <div class="signal-badge">${s.signal}</div>
        <div class="signal-reason">${s.reason}</div>
      </div>`).join("");
    document.getElementById("signals-section").style.display = "block";
  }

  // Charts
  const dates  = data.data.map(d => d.Date);
  const opens  = data.data.map(d => d.Open);
  const highs  = data.data.map(d => d.High);
  const lows   = data.data.map(d => d.Low);
  const closes = data.data.map(d => d.Close);

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor:  "rgba(0,0,0,0)",
    font:  { color: "#f0f0ff", family: "Segoe UI, sans-serif" },
    xaxis: { gridcolor: "rgba(255,255,255,0.06)" },
    yaxis: { gridcolor: "rgba(255,255,255,0.06)" },
    margin: { t: 16, b: 40, l: 60, r: 20 },
    height: 340,
    legend: { bgcolor: "rgba(0,0,0,0)", font: { color: "#f0f0ff" } }
  };

  Plotly.newPlot("candlestick-chart", [{
    type: "candlestick",
    x: dates, open: opens, high: highs, low: lows, close: closes,
    increasing: { line: { color: "#22c55e" } },
    decreasing: { line: { color: "#ef4444" } }
  }], { ...layout, height: 420 });

  Plotly.newPlot("rsi-chart", [
    { x: dates, y: data.data.map(d => d.RSI), type: "scatter", name: "RSI", line: { color: "#a78bfa" } },
    { x: dates, y: Array(dates.length).fill(70), name: "Overbought", line: { color: "#ef4444", dash: "dash" } },
    { x: dates, y: Array(dates.length).fill(30), name: "Oversold",   line: { color: "#22c55e", dash: "dash" } }
  ], layout);

  Plotly.newPlot("macd-chart", [
    { x: dates, y: data.data.map(d => d.MACD),        type: "scatter", name: "MACD",   line: { color: "#4fb8f7" } },
    { x: dates, y: data.data.map(d => d.MACD_signal), type: "scatter", name: "Signal", line: { color: "#f59e0b" } },
    { x: dates, y: data.data.map(d => d.MACD_diff),   type: "bar",     name: "Diff",   marker: { color: "#6366f1" } }
  ], layout);

  Plotly.newPlot("bb-chart", [
    { x: dates, y: data.data.map(d => d.BB_upper),  name: "Upper",  line: { color: "#ef4444", dash: "dot" } },
    { x: dates, y: data.data.map(d => d.BB_middle), name: "Middle", line: { color: "#f59e0b" } },
    { x: dates, y: data.data.map(d => d.BB_lower),  name: "Lower",  line: { color: "#22c55e", dash: "dot" } },
    { x: dates, y: closes, name: "Close", line: { color: "#ffffff" } }
  ], layout);

  document.getElementById("charts-section").style.display = "block";
  loadNews(data.ticker);
saveRecentlyViewed(data.ticker, selectedName);
}

// ── News ───────────────────────────────────────────
async function loadNews(ticker) {
  try {
    const res   = await fetch(`${API}/stock/${ticker}/news`);
    const items = await res.json();
    const grid  = document.getElementById("news-section");
    if (!grid || !items.length) return;
    grid.innerHTML = items.map(n => `
      <a class="news-card glass-card" href="${n.url}" target="_blank" rel="noopener">
        <p class="news-source">${n.source}</p>
        <p class="news-title">${n.title}</p>
        <p class="news-summary">${n.summary}</p>
      </a>`).join("");
  } catch {}
}

// ── Helpers ────────────────────────────────────────
document.addEventListener("click", e => {
  if (!e.target.closest(".search-wrapper")) {
    const s = document.getElementById("suggestions");
    if (s) s.innerHTML = "";
  }
});

const tickerInput = document.getElementById("ticker-input");
if (tickerInput) {
  tickerInput.addEventListener("keydown", e => {
    if (e.key === "Enter") loadAnalysis();
  });
}

// ── Boot: read ticker from URL ─────────────────────
const pathParts = window.location.pathname.split("/");
const urlTicker = pathParts[2] ? pathParts[2].toUpperCase() : null;
const urlPeriod = new URLSearchParams(window.location.search).get("period") || "6mo";

if (urlTicker) {
  selectedTicker = urlTicker;
  selectedName   = urlTicker;
  const input = document.getElementById("ticker-input");
  if (input) input.value = urlTicker;
  const sel = document.getElementById("period-select");
  if (sel) sel.value = urlPeriod;
  fetchAnalysis(urlTicker, urlPeriod);
} else {
  window.location.href = "/";
}

function saveRecentlyViewed(ticker, name) {
  let recent = JSON.parse(localStorage.getItem("dmi_recent") || "[]");
  recent     = recent.filter(r => r.ticker !== ticker);
  recent.unshift({ ticker, name });
  recent     = recent.slice(0, 6);
  localStorage.setItem("dmi_recent", JSON.stringify(recent));
}

// ── Theme toggle ───────────────────────────────────
function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem("dmi_theme", isLight ? "light" : "dark");
  document.getElementById("theme-toggle").textContent = isLight ? "☀️" : "🌙";
}

// Apply saved theme on load
(function() {
  if (localStorage.getItem("dmi_theme") === "light") {
    document.body.classList.add("light");
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = "☀️";
  }
})();

// ── Fullscreen chart ───────────────────────────────
function openFullscreen(chartId) {
  const overlay     = document.getElementById("fullscreen-overlay");
  const container   = document.getElementById("fullscreen-chart-container");
  const chartEl     = document.getElementById(chartId);
  overlay.classList.add("active");
  container.innerHTML = "";
  const clone = chartEl.cloneNode(true);
  clone.id    = "fullscreen-inner";
  clone.style.height = "100%";
  container.appendChild(clone);
  Plotly.relayout(chartEl.id, {});
  setTimeout(() => Plotly.Plots.resize(clone), 100);
}

function closeFullscreen() {
  document.getElementById("fullscreen-overlay").classList.remove("active");
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeFullscreen();
});