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
      color: up ? "#22c55e" : "#ef4444", alpha: 0.15 + Math.random() * 0.2
    };
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
    if (candles.length < 14) candles.push(makeCandle());
    candles.forEach(c => { c.y -= c.speed; });
    candles = candles.filter(c => c.y + c.bodyH + c.wickH > 0);
    candles.forEach(drawCandle);
    requestAnimationFrame(loop);
  }
  window.addEventListener("resize", resize); resize();
  for (let i = 0; i < 10; i++) { const c = makeCandle(); c.y = Math.random() * canvas.height; candles.push(c); }
  loop();
})();

// ── Toast ──────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className   = "toast show" + (isError ? " error" : "");
  setTimeout(() => t.className = "toast", 3000);
}

// ── Storage ────────────────────────────────────────
function getHoldings() {
  return JSON.parse(localStorage.getItem("dmi_portfolio") || "[]");
}

function saveHoldings(holdings) {
  localStorage.setItem("dmi_portfolio", JSON.stringify(holdings));
}

// ── Add holding ────────────────────────────────────
async function addHolding() {
  const ticker = document.getElementById("p-ticker").value.trim().toUpperCase();
  const qty    = parseFloat(document.getElementById("p-qty").value);
  const buy    = parseFloat(document.getElementById("p-buy").value);
  const name   = document.getElementById("p-name").value.trim() || ticker;

  if (!ticker || !qty || !buy) {
    showToast("Please fill ticker, quantity and buy price", true);
    return;
  }

  const holdings = getHoldings();
  const existing = holdings.findIndex(h => h.ticker === ticker);

  if (existing >= 0) {
    const oldQty   = holdings[existing].qty;
    const oldBuy   = holdings[existing].buy;
    const newQty   = oldQty + qty;
    holdings[existing].buy = ((oldBuy * oldQty) + (buy * qty)) / newQty;
    holdings[existing].qty = newQty;
  } else {
    holdings.push({ ticker, name, qty, buy, added: new Date().toISOString() });
  }

  saveHoldings(holdings);
  clearForm();
  showToast(`${ticker} added to portfolio ✅`);
  await renderPortfolio();
}

function clearForm() {
  ["p-ticker", "p-qty", "p-buy", "p-name"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

function removeHolding(ticker) {
  const holdings = getHoldings().filter(h => h.ticker !== ticker);
  saveHoldings(holdings);
  renderPortfolio();
  showToast(`${ticker} removed from portfolio`);
}

// ── Render ─────────────────────────────────────────
async function renderPortfolio() {
  const holdings = getHoldings();
  const empty    = document.getElementById("portfolio-empty");

  if (!holdings.length) {
    empty.style.display = "block";
    document.getElementById("portfolio-summary").style.display = "none";
    document.getElementById("holdings-section").style.display  = "none";
    return;
  }

  empty.style.display = "none";

  const priceResults = await Promise.allSettled(
    holdings.map(h =>
      fetch(`${API}/stock/${h.ticker}/price`).then(r => r.json())
    )
  );

  let totalInvested = 0;
  let totalCurrent  = 0;

  const rows = holdings.map((h, i) => {
    const priceData    = priceResults[i].status === "fulfilled" ? priceResults[i].value : null;
    const currentPrice = priceData?.price || h.buy;
    const invested      = h.buy * h.qty;
    const current        = currentPrice * h.qty;
    const pnl            = current - invested;
    const pnlPct         = ((pnl / invested) * 100).toFixed(2);
    const currency       = (h.ticker.endsWith(".NS") || h.ticker.endsWith(".BO")) ? "₹" : "$";

    totalInvested += invested;
    totalCurrent  += current;

    const pnlColor = pnl >= 0 ? "var(--green)" : "var(--red)";
    const pnlSign  = pnl >= 0 ? "+" : "";

    return `
      <tr>
        <td><a href="/analysis/${h.ticker}" style="color:var(--accent2);font-weight:700;text-decoration:none">${h.ticker}</a></td>
        <td style="color:var(--muted)">${h.name}</td>
        <td>${h.qty}</td>
        <td>${currency}${h.buy.toFixed(2)}</td>
        <td>${currency}${currentPrice.toFixed(2)}</td>
        <td>${currency}${invested.toFixed(2)}</td>
        <td>${currency}${current.toFixed(2)}</td>
        <td style="color:${pnlColor};font-weight:700">${pnlSign}${currency}${Math.abs(pnl).toFixed(2)} (${pnlSign}${pnlPct}%)</td>
        <td><button class="user-item-remove" onclick="removeHolding('${h.ticker}')">✕</button></td>
      </tr>`;
  });

  const totalPnl    = totalCurrent - totalInvested;
  const totalReturn = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(2) : "0.00";
  const pnlColor    = totalPnl >= 0 ? "var(--green)" : "var(--red)";
  const pnlSign     = totalPnl >= 0 ? "+" : "";

  document.getElementById("p-invested").textContent = `$${totalInvested.toFixed(2)}`;
  document.getElementById("p-current").textContent  = `$${totalCurrent.toFixed(2)}`;
  document.getElementById("p-pnl").textContent       = `${pnlSign}$${Math.abs(totalPnl).toFixed(2)}`;
  document.getElementById("p-pnl").style.color       = pnlColor;
  document.getElementById("p-return").textContent    = `${pnlSign}${totalReturn}%`;
  document.getElementById("p-return").style.color    = pnlColor;

  document.getElementById("portfolio-summary").style.display = "grid";
  document.getElementById("holdings-section").style.display  = "block";

  document.getElementById("holdings-table").innerHTML = `
    <thead>
      <tr>
        <th>Ticker</th><th>Name</th><th>Qty</th><th>Buy Price</th>
        <th>Current</th><th>Invested</th><th>Value</th><th>P&L</th><th></th>
      </tr>
    </thead>
    <tbody>${rows.join("")}</tbody>
  `;
}

// ── Inject extra styles ────────────────────────────
const style = document.createElement("style");
style.textContent = `
  .portfolio-add-card { padding: 28px; margin-bottom: 24px; }
  .portfolio-form { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:20px; }
  .portfolio-empty { text-align:center; padding:60px; color:var(--muted); font-size:16px; }
`;
document.head.appendChild(style);

// ── Init ───────────────────────────────────────────
renderPortfolio();