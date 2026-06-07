const API = window.location.origin + "/api/v1";// ── Progress bar ───────────────────────────────────
function setProgress(pct) {
  const bar = document.getElementById("progress-bar");
  if (!bar) return;
  bar.style.width = pct + "%";
  if (pct >= 100) {
    setTimeout(() => { bar.style.width = "0%"; }, 400);
  }
}
let searchTimer = null;
let selectedTicker = "";
let selectedName = "";

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

// ── Clock ──────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

// ── Slogan carousel ────────────────────────────────
const slogans = document.querySelectorAll(".slogan");
let sloganIdx = 0;
setInterval(() => {
  slogans[sloganIdx].classList.remove("active");
  sloganIdx = (sloganIdx + 1) % slogans.length;
  slogans[sloganIdx].classList.add("active");
}, 5000);

// ── Animated candle background ─────────────────────
(function () {
  const canvas = document.getElementById("candle-canvas");
  const ctx = canvas.getContext("2d");
  let candles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function makeCandle() {
    const up = Math.random() > 0.5;
    return {
      x: Math.random() * canvas.width,
      y: canvas.height + 100,
      bodyH: 20 + Math.random() * 60,
      wickH: 10 + Math.random() * 30,
      width: 8 + Math.random() * 10,
      speed: 0.4 + Math.random() * 0.6,
      color: up ? "#22c55e" : "#ef4444",
      alpha: 0.2 + Math.random() * 0.35
    };
  }

  function drawCandle(c) {
    ctx.globalAlpha = c.alpha;
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1.5;
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

// ── Top stocks ─────────────────────────────────────
const INDIA_TICKERS = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS",
  "ICICIBANK.NS", "WIPRO.NS", "ADANIENT.NS", "BAJFINANCE.NS"
];
const US_TICKERS = [
  "AAPL", "MSFT", "NVDA", "GOOGL",
  "AMZN", "META", "TSLA", "JPM"
];

const INDIA_NAMES = {
  "RELIANCE.NS": "Reliance Industries",
  "TCS.NS": "Tata Consultancy",
  "HDFCBANK.NS": "HDFC Bank",
  "INFY.NS": "Infosys",
  "ICICIBANK.NS": "ICICI Bank",
  "WIPRO.NS": "Wipro",
  "ADANIENT.NS": "Adani Enterprises",
  "BAJFINANCE.NS": "Bajaj Finance"
};
const US_NAMES = {
  "AAPL": "Apple", "MSFT": "Microsoft",
  "NVDA": "Nvidia", "GOOGL": "Alphabet",
  "AMZN": "Amazon", "META": "Meta",
  "TSLA": "Tesla", "JPM": "JPMorgan"
};

async function fetchStockRow(ticker, nameMap) {
  try {
    const res    = await fetch(`${API}/stock/${ticker}/price`);
    const data   = await res.json();
    const currency = ticker.endsWith(".NS") || ticker.endsWith(".BO") ? "₹" : "$";
    const price  = data.price ? `${currency}${parseFloat(data.price).toFixed(2)}` : "N/A";
    const name   = nameMap[ticker] || ticker;
    const sym    = ticker.replace(".NS","").replace(".BO","");
    return { sym, name, price, ticker };
  } catch {
    return null;
  }
}
function renderStockList(elId, items) {
  const el = document.getElementById(elId);
  el.innerHTML = items.map((item, i) => {
    if (!item) return "";
    return `
      <div class="stock-row" style="animation-delay:${i * 80}ms"
           onclick="quickLoad('${item.ticker}', '${item.name.replace(/'/g, "")}')">
        <div class="stock-left">
          <span class="stock-sym">${item.sym}</span>
          <span class="stock-name">${item.name}</span>
        </div>
        <div class="stock-right">
          <span class="stock-price">${item.price}</span>
        </div>
      </div>`;
  }).join("");
}

function quickLoad(ticker, name) {
  selectedTicker = ticker;
  selectedName = name;
  document.getElementById("ticker-input").value = `${ticker} — ${name}`;
  document.getElementById("suggestions").innerHTML = "";
  loadAnalysis();
  window.scrollTo({
    top: document.querySelector(".search-box").offsetTop - 100,
    behavior: "smooth"
  });
}

function buildTicker(items) {
  const track = document.getElementById("ticker-track");
  const valid = items.filter(Boolean);
  if (!valid.length) return;
  const html = valid.map(item =>
    `<span class="ticker-item">
      <span class="ticker-symbol">${item.sym}</span>
      <span class="ticker-price">${item.price}</span>
    </span>`
  ).join("");
  track.innerHTML = html + html;
}

async function loadTopStocks() {
  const [indiaResults, usResults] = await Promise.all([
    Promise.all(INDIA_TICKERS.map(t => fetchStockRow(t, INDIA_NAMES))),
    Promise.all(US_TICKERS.map(t => fetchStockRow(t, US_NAMES)))
  ]);
  renderStockList("india-stocks", indiaResults);
  renderStockList("us-stocks", usResults);
  buildTicker([...indiaResults, ...usResults]);
}

loadTopStocks();

// ── Search autocomplete ────────────────────────────
async function onSearchInput(value) {
  const box = document.getElementById("suggestions");
  selectedTicker = "";
  if (value.length < 2) { box.innerHTML = ""; return; }

  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(value)}`);
      const results = await res.json();
      if (!results.length) { box.innerHTML = ""; return; }
      box.innerHTML = results.map(r => `
        <div class="suggestion-item"
             onclick="selectTicker('${r.symbol}', '${r.name.replace(/'/g, "")}')">
          <span class="suggestion-symbol">${r.symbol}</span>
          <span class="suggestion-name">${r.name}</span>
          <span class="suggestion-exchange">${r.exchange}</span>
        </div>
      `).join("");
    } catch {
      box.innerHTML = "";
    }
  }, 350);
}

function selectTicker(symbol, name) {
  selectedTicker = symbol;
  selectedName = name;
  document.getElementById("ticker-input").value = `${symbol} — ${name}`;
  document.getElementById("suggestions").innerHTML = "";
}

// ── Main analysis loader ───────────────────────────
async function loadAnalysis() {
  const inputVal = document.getElementById("ticker-input").value.trim();
  const ticker   = selectedTicker || inputVal.split("—")[0].trim().toUpperCase();
  const period   = document.getElementById("period-select").value;
  if (!ticker) { showError("Please enter or select a company."); return; }
  window.location.href = `/analysis/${ticker}?period=${period}`;
}

// ── Render results ─────────────────────────────────
function render(data) {
  const isIndian = selectedTicker.endsWith(".NS") || selectedTicker.endsWith(".BO");
  const currency = isIndian ? "₹" : "$";

  document.getElementById("card-ticker").textContent = data.ticker;
  document.getElementById("card-name").textContent = selectedName || data.ticker;
  document.getElementById("card-price").textContent = `${currency}${data.latest_price}`;

  const summaryEl = document.getElementById("card-summary");
  summaryEl.textContent = data.summary;
  summaryEl.className = data.summary;
  document.getElementById("card-period").textContent = data.period;
const chgEl = document.getElementById("card-change");
  if (chgEl) {
    if (data.change_pct !== null && data.change_pct !== undefined) {
      chgEl.textContent = `${data.change_pct > 0 ? "+" : ""}${data.change_pct}%`;
      chgEl.style.color = data.change_pct > 0
        ? "var(--green)"
        : data.change_pct < 0
        ? "var(--red)"
        : "var(--amber)";
    } else {
      chgEl.textContent = "N/A";
    }
  }
  document.getElementById("summary-cards").style.display = "grid";

  const grid = document.getElementById("signals-grid");
  grid.innerHTML = data.signals.map(s => `
    <div class="signal-card ${s.signal}">
      <div class="signal-name">${s.indicator}</div>
      <div class="signal-badge">${s.signal}</div>
      <div class="signal-reason">${s.reason}</div>
    </div>
  `).join("");
  document.getElementById("signals-section").style.display = "block";

  const dates  = data.data.map(d => d.Date);
  const opens  = data.data.map(d => d.Open);
  const highs  = data.data.map(d => d.High);
  const lows   = data.data.map(d => d.Low);
  const closes = data.data.map(d => d.Close);

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor:  "rgba(0,0,0,0)",
    font: { color: "#f0f0ff", family: "Segoe UI, sans-serif" },
    xaxis: { gridcolor: "rgba(255,255,255,0.06)", zerolinecolor: "rgba(255,255,255,0.1)" },
    yaxis: { gridcolor: "rgba(255,255,255,0.06)", zerolinecolor: "rgba(255,255,255,0.1)" },
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

  document.getElementById("charts-section").style.display = "block";setTimeout(() => {
    document.getElementById("summary-cards").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
document.getElementById("action-bar").style.display = "flex";
  saveHistory(data.ticker, data.period, data.summary);
loadNews(data.ticker);
}

// ── Helpers ────────────────────────────────────────
function showLoading(on) {
  document.getElementById("loading").style.display = on ? "block" : "none";
}

function showError(msg) {
  const el = document.getElementById("error-msg");
  el.textContent = `⚠️ ${msg}`;
  el.style.display = "block";
}

function hideAll() {
  ["summary-cards", "signals-section", "charts-section", "error-msg", "action-bar"]
    .forEach(id => document.getElementById(id).style.display = "none");
}

function switchPanelTab(tab) {
  ["watchlist","history","notes"].forEach(t => {
    document.getElementById(`panel-${t}`).style.display = t === tab ? "block" : "none";
  });
  document.querySelectorAll(".upanel-tab").forEach((btn, i) => {
    btn.classList.toggle("active", ["watchlist","history","notes"][i] === tab);
  });
}

document.addEventListener("click", e => {
  if (!e.target.closest(".search-wrapper")) {
    document.getElementById("suggestions").innerHTML = "";
  }
});

document.getElementById("ticker-input").addEventListener("keydown", e => {
  if (e.key === "Enter") loadAnalysis();
});
async function loadNews(ticker) {
  try {
    const res   = await fetch(`${API}/stock/${ticker}/news`);
    const items = await res.json();
    const grid  = document.getElementById("news-section");
    if (!items.length) { grid.innerHTML = ""; return; }
    grid.innerHTML = items.map(n => `
      <a class="news-card glass-card" href="${n.url}" target="_blank" rel="noopener">
        <p class="news-source">${n.source}</p>
        <p class="news-title">${n.title}</p>
        <p class="news-summary">${n.summary}</p>
      </a>
    `).join("");
  } catch { }
}

function renderRecentlyViewed() {
  const recent = JSON.parse(localStorage.getItem("dmi_recent") || "[]");
  const section = document.getElementById("recently-viewed");
  if (!section || !recent.length) return;
  section.style.display = "block";
  document.getElementById("recent-chips").innerHTML = recent.map(r => `
    <button class="recent-chip" onclick="quickLoad('${r.ticker}','${r.name}')">
      ${r.ticker}
    </button>`).join("");
}

renderRecentlyViewed();

// ── Keyboard shortcuts ─────────────────────────────
document.addEventListener("keydown", e => {
  const active = document.activeElement;
  const isTyping = active.tagName === "INPUT" || active.tagName === "TEXTAREA";

  // Press "/" to focus search
  if (e.key === "/" && !isTyping) {
    e.preventDefault();
    const input = document.getElementById("ticker-input");
    if (input) { input.focus(); input.select(); }
  }

  // Press Escape to close modal/clear search
  if (e.key === "Escape") {
    closeModal?.();
    document.getElementById("suggestions").innerHTML = "";
  }
});