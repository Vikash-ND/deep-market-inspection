const API = "http://127.0.0.1:8000/api/v1";
let searchTimer = null;
let selectedTicker = "";
let selectedName = "";

async function onSearchInput(value) {
  const box = document.getElementById("suggestions");
  if (value.length < 2) { box.innerHTML = ""; return; }

  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(value)}`);
      const results = await res.json();
      if (!results.length) { box.innerHTML = ""; return; }

      box.innerHTML = results.map(r => `
        <div class="suggestion-item" onclick="selectTicker('${r.symbol}', '${r.name.replace(/'/g, "")}')">
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
  selectedName   = name;
  document.getElementById("ticker-input").value = `${symbol} — ${name}`;
  document.getElementById("suggestions").innerHTML = "";
}

async function loadAnalysis() {
  const inputVal = document.getElementById("ticker-input").value.trim();
  const ticker   = selectedTicker || inputVal.split("—")[0].trim().toUpperCase();
  const period   = document.getElementById("period-select").value;

  if (!ticker) { showError("Please enter or select a company."); return; }

  showLoading(true);
  hideAll();

  try {
    const res = await fetch(`${API}/stock/${ticker}/analysis?period=${period}`);
    if (!res.ok) throw new Error(`Could not find data for "${ticker}".`);
    const data = await res.json();
    render(data);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

function render(data) {
  document.getElementById("card-ticker").textContent  = data.ticker;
  document.getElementById("card-name").textContent    = selectedName || data.ticker;
  document.getElementById("card-price").textContent   = `$${data.latest_price}`;
  const summaryEl = document.getElementById("card-summary");
  summaryEl.textContent = data.summary;
  summaryEl.className   = data.summary;
  document.getElementById("card-period").textContent  = data.period;
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
    paper_bgcolor: "#1a1d27",
    plot_bgcolor:  "#1a1d27",
    font:  { color: "#e0e0e0" },
    xaxis: { gridcolor: "#2a2d3a" },
    yaxis: { gridcolor: "#2a2d3a" },
    margin: { t: 20, b: 40, l: 60, r: 20 },
    height: 340
  };

  Plotly.newPlot("candlestick-chart", [{
    type: "candlestick",
    x: dates, open: opens, high: highs, low: lows, close: closes,
    increasing: { line: { color: "#22c55e" } },
    decreasing: { line: { color: "#ef4444" } }
  }], { ...layout, height: 400 });

  Plotly.newPlot("rsi-chart", [
    { x: dates, y: data.data.map(d => d.RSI), type: "scatter", name: "RSI", line: { color: "#a78bfa" } },
    { x: dates, y: Array(dates.length).fill(70), name: "Overbought", line: { color: "#ef4444", dash: "dash" } },
    { x: dates, y: Array(dates.length).fill(30), name: "Oversold",   line: { color: "#22c55e", dash: "dash" } }
  ], layout);

  Plotly.newPlot("macd-chart", [
    { x: dates, y: data.data.map(d => d.MACD),        type: "scatter", name: "MACD",   line: { color: "#4f8ef7" } },
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
}

function showLoading(on) {
  document.getElementById("loading").style.display = on ? "block" : "none";
}

function showError(msg) {
  const el = document.getElementById("error-msg");
  el.textContent = `⚠️ ${msg}`;
  el.style.display = "block";
}

function hideAll() {
  ["summary-cards","signals-section","charts-section","error-msg"]
    .forEach(id => document.getElementById(id).style.display = "none");
}

document.addEventListener("click", e => {
  if (!e.target.closest(".search-wrapper")) {
    document.getElementById("suggestions").innerHTML = "";
  }
});

document.getElementById("ticker-input").addEventListener("keydown", e => {
  if (e.key === "Enter") loadAnalysis();
});