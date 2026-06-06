const API = window.location.origin + "/api/v1";

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
  const ctx = canvas.getContext("2d");
  let candles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  function makeCandle() {
    const up = Math.random() > 0.5;
    return { x: Math.random() * canvas.width, y: canvas.height + 100,
      bodyH: 20 + Math.random() * 60, wickH: 10 + Math.random() * 30,
      width: 8 + Math.random() * 10, speed: 0.4 + Math.random() * 0.6,
      color: up ? "#22c55e" : "#ef4444", alpha: 0.15 + Math.random() * 0.25 };
  }
  function drawCandle(c) {
    ctx.globalAlpha = c.alpha;
    ctx.strokeStyle = c.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x, c.y - c.bodyH - c.wickH);
    ctx.lineTo(c.x, c.y + c.wickH); ctx.stroke();
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
  for (let i = 0; i < 14; i++) { const c = makeCandle(); c.y = Math.random() * canvas.height; candles.push(c); }
  loop();
})();

// ── Colors per ticker ──────────────────────────────
const COLORS = ["#7c6ef7", "#4fb8f7", "#f59e0b"];

// ── Run comparison ─────────────────────────────────
async function runComparison() {
  const t1     = document.getElementById("t1").value.trim().toUpperCase();
  const t2     = document.getElementById("t2").value.trim().toUpperCase();
  const t3     = document.getElementById("t3").value.trim().toUpperCase();
  const period = document.getElementById("compare-period").value;

  const tickers = [t1, t2, t3].filter(Boolean);
  if (tickers.length < 2) {
    showCompareError("Please enter at least 2 tickers to compare.");
    return;
  }

  document.getElementById("compare-loading").style.display = "block";
  document.getElementById("compare-results").style.display = "none";
  document.getElementById("compare-error").style.display   = "none";

  try {
    const results = await Promise.all(
      tickers.map(t => fetch(`${API}/stock/${t}/analysis?period=${period}`).then(r => r.json()))
    );
    renderComparison(tickers, results);
  } catch (err) {
    showCompareError("Failed to fetch data. Check your tickers and try again.");
  } finally {
    document.getElementById("compare-loading").style.display = "none";
  }
}

// ── Render comparison ──────────────────────────────
function renderComparison(tickers, results) {
  renderTable(tickers, results);
  renderPriceChart(tickers, results);
  renderRSIChart(tickers, results);
  renderSignals(tickers, results);
  document.getElementById("compare-results").style.display = "block";
  document.getElementById("compare-results").scrollIntoView({ behavior: "smooth" });
}

function renderTable(tickers, results) {
  const rows = [
    { label: "Latest Price",   key: r => r.latest_price ? `$${r.latest_price}` : "N/A" },
    { label: "Overall Signal", key: r => `<span class="signal-pill ${r.summary}">${r.summary}</span>` },
    { label: "RSI",            key: r => {
      const rsi = r.data?.[r.data.length-1]?.RSI;
      return rsi ? parseFloat(rsi).toFixed(2) : "N/A";
    }},
    { label: "MACD Signal",    key: r => r.signals?.find(s => s.indicator === "MACD")?.signal || "N/A" },
    { label: "Bollinger",      key: r => r.signals?.find(s => s.indicator === "Bollinger Bands")?.signal || "N/A" },
    { label: "SMA 50",         key: r => r.signals?.find(s => s.indicator === "SMA_50")?.signal || "N/A" },
  ];

  const table = document.getElementById("compare-table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Metric</th>
        ${tickers.map((t,i) => `<th style="color:${COLORS[i]}">${t}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `
        <tr>
          <td class="compare-label">${row.label}</td>
          ${results.map(r => `<td>${row.key(r)}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

function renderPriceChart(tickers, results) {
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#f0f0ff", family: "Segoe UI, sans-serif" },
    xaxis: { gridcolor: "rgba(255,255,255,0.06)" },
    yaxis: { gridcolor: "rgba(255,255,255,0.06)", title: "Price" },
    margin: { t:16, b:40, l:60, r:20 }, height: 380,
    legend: { bgcolor: "rgba(0,0,0,0)" }
  };

  const traces = results.map((r, i) => ({
    x: r.data.map(d => d.Date),
    y: r.data.map(d => d.Close),
    type: "scatter",
    name: tickers[i],
    line: { color: COLORS[i], width: 2 }
  }));

  Plotly.newPlot("compare-price-chart", traces, layout);
}

function renderRSIChart(tickers, results) {
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#f0f0ff", family: "Segoe UI, sans-serif" },
    xaxis: { gridcolor: "rgba(255,255,255,0.06)" },
    yaxis: { gridcolor: "rgba(255,255,255,0.06)", title: "RSI", range:[0,100] },
    margin: { t:16, b:40, l:60, r:20 }, height: 300,
    legend: { bgcolor: "rgba(0,0,0,0)" }
  };

  const traces = results.map((r, i) => ({
    x: r.data.map(d => d.Date),
    y: r.data.map(d => d.RSI),
    type: "scatter",
    name: `${tickers[i]} RSI`,
    line: { color: COLORS[i], width: 2 }
  }));

  traces.push({
    x: results[0].data.map(d => d.Date),
    y: Array(results[0].data.length).fill(70),
    name: "Overbought", line: { color: "#ef4444", dash: "dash", width: 1 }
  });
  traces.push({
    x: results[0].data.map(d => d.Date),
    y: Array(results[0].data.length).fill(30),
    name: "Oversold", line: { color: "#22c55e", dash: "dash", width: 1 }
  });

  Plotly.newPlot("compare-rsi-chart", traces, layout);
}

function renderSignals(tickers, results) {
  const grid = document.getElementById("compare-signals");
  grid.innerHTML = results.map((r, i) => `
    <div class="compare-signal-col glass-card">
      <h3 style="color:${COLORS[i]};margin-bottom:14px;font-size:16px">${tickers[i]}</h3>
      ${r.signals.map(s => `
        <div class="signal-card ${s.signal}" style="margin-bottom:8px">
          <div class="signal-name">${s.indicator}</div>
          <div class="signal-badge">${s.signal}</div>
          <div class="signal-reason">${s.reason}</div>
        </div>`).join("")}
      <div class="compare-overall ${r.summary}">Overall: ${r.summary}</div>
    </div>
  `).join("");
}

function showCompareError(msg) {
  const el = document.getElementById("compare-error");
  el.textContent = `⚠️ ${msg}`;
  el.style.display = "block";
}

// ── Allow Enter key ────────────────────────────────
["t1","t2","t3"].forEach(id => {
  document.getElementById(id).addEventListener("keydown", e => {
    if (e.key === "Enter") runComparison();
  });
});