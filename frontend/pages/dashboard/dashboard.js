// TransitOps - Dashboard Module
// Contains: renderDashboard, SVG Charts (Bar, Line, Pie), Widget Navigation

function renderDashboard() {
  const activeVehicles = db.vehicles.filter(v => v.status === "ACTIVE").length;
  const availableVehicles = db.vehicles.filter(v => v.status === "AVAILABLE").length;
  const maintenanceVehicles = db.vehicles.filter(v => v.status === "MAINTENANCE").length;
  const activeTrips = db.trips.filter(t => t.status === "ACTIVE").length;
  const pendingTrips = db.trips.filter(t => t.status === "PENDING").length;
  const driversDuty = db.drivers.filter(d => d.status === "DUTY").length;
  const totalVehiclesCount = db.vehicles.length;
  const utilization = totalVehiclesCount > 0 ? Math.round(((activeVehicles) / totalVehiclesCount) * 100) : 0;
  const currentMonthYear = "2026-07";
  const monthlyExpensesVal = db.expenses.filter(e => e.date.startsWith(currentMonthYear)).reduce((sum, e) => sum + Number(e.cost), 0);
  const fuelLitres = db.fuel.reduce((sum, f) => sum + Number(f.liters), 0);
  const calculatedEff = fuelLitres > 0 ? (28600 / fuelLitres).toFixed(1) : "8.4";

  document.getElementById("widget-active-vehicles").textContent = activeVehicles;
  document.getElementById("widget-available-vehicles").textContent = availableVehicles;
  document.getElementById("widget-maintenance-vehicles").textContent = maintenanceVehicles;
  document.getElementById("widget-active-trips").textContent = activeTrips;
  document.getElementById("widget-pending-trips").textContent = pendingTrips;
  document.getElementById("widget-drivers-duty").textContent = driversDuty;
  document.getElementById("widget-fleet-utilization").textContent = `${utilization}%`;
  document.getElementById("widget-monthly-expenses").textContent = formatCurrency(monthlyExpensesVal);
  document.getElementById("widget-fuel-efficiency").textContent = `${calculatedEff} km/L`;

  drawBarChart();
  drawLineChart();
  drawPieChart(activeVehicles, availableVehicles, maintenanceVehicles);

  // Active Vehicles List
  const activeVehiclesTbody = document.getElementById("dashboard-active-vehicles-table").querySelector("tbody");
  const activeVehList = db.vehicles.filter(v => v.status === "ACTIVE");
  activeVehiclesTbody.innerHTML = activeVehList.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;">No active vehicles in transit.</td></tr>`
    : activeVehList.map(v => `<tr><td><strong>${v.plate}</strong></td><td>${v.make} ${v.model}</td><td><span class="status-pill status-active">${v.type}</span></td></tr>`).join("");

  // Active Trips List
  const activeTripsTbody = document.getElementById("dashboard-active-trips-table").querySelector("tbody");
  const activeTripsList = db.trips.filter(t => t.status === "ACTIVE");
  activeTripsTbody.innerHTML = activeTripsList.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;">No active trips in dispatch.</td></tr>`
    : activeTripsList.map(t => {
        const v = db.vehicles.find(vh => vh.id == t.vehicleId) || { plate: "Unknown" };
        const d = db.drivers.find(dr => dr.id == t.driverId) || { name: "Unknown" };
        return `<tr><td><strong>${t.origin} → ${t.destination}</strong></td><td>${v.plate}</td><td>${d.name}</td></tr>`;
      }).join("");
}

// --- SVG CHARTS ---
function drawBarChart() {
  const container = document.getElementById("bar-chart-container");
  if (!container) return;
  container.innerHTML = "";
  const categories = ["Fuel", "Maintenance", "Insurance", "Tolls", "Other"];
  const sums = categories.map(cat => db.expenses.filter(e => e.category.toLowerCase() === cat.toLowerCase()).reduce((sum, e) => sum + Number(e.cost), 0));
  const maxVal = Math.max(...sums, 100);
  const cH = 220, cW = 450, pL = 60, pB = 40, pT = 20, pR = 20;
  const ctW = cW - pL - pR, ctH = cH - pT - pB;
  let svg = `<svg class="svg-chart" viewBox="0 0 ${cW} ${cH}">`;
  for (let i = 0; i <= 4; i++) {
    const yV = maxVal * (i / 4), yP = cH - pB - (ctH * (i / 4));
    svg += `<line class="svg-grid-line" x1="${pL}" y1="${yP}" x2="${cW - pR}" y2="${yP}" /><text class="svg-text" x="${pL - 10}" y="${yP + 4}" text-anchor="end">${Math.round(yV)}</text>`;
  }
  svg += `<line class="svg-axis" x1="${pL}" y1="${cH - pB}" x2="${cW - pR}" y2="${cH - pB}" /><line class="svg-axis" x1="${pL}" y1="${pT}" x2="${pL}" y2="${cH - pB}" />`;
  const bS = ctW / categories.length, bW = bS * 0.55;
  categories.forEach((cat, i) => {
    const val = sums[i], bH = (val / maxVal) * ctH, xP = pL + (i * bS) + (bS - bW) / 2, yP = cH - pB - bH;
    svg += `<rect class="svg-bar" x="${xP}" y="${yP}" width="${bW}" height="${bH}" rx="4" ry="4" /><text class="svg-text" x="${xP + bW / 2}" y="${yP - 6}" text-anchor="middle" font-weight="600" fill="#0F172A">${Math.round(val)}</text><text class="svg-text" x="${xP + bW / 2}" y="${cH - pB + 18}" text-anchor="middle">${cat}</text>`;
  });
  svg += `</svg>`;
  container.innerHTML = svg;
}

function drawLineChart() {
  const container = document.getElementById("line-chart-container");
  if (!container) return;
  container.innerHTML = "";
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const monthIndices = [2, 3, 4, 5, 6, 7];
  const sums = monthIndices.map(m => db.expenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === 2026 && (d.getMonth() + 1) === m; }).reduce((sum, e) => sum + Number(e.cost), 0));
  const maxVal = Math.max(...sums, 500);
  const cH = 220, cW = 450, pL = 60, pB = 40, pT = 20, pR = 20;
  const ctW = cW - pL - pR, ctH = cH - pT - pB;
  let svg = `<svg class="svg-chart" viewBox="0 0 ${cW} ${cH}">`;
  for (let i = 0; i <= 4; i++) {
    const yV = maxVal * (i / 4), yP = cH - pB - (ctH * (i / 4));
    svg += `<line class="svg-grid-line" x1="${pL}" y1="${yP}" x2="${cW - pR}" y2="${yP}" /><text class="svg-text" x="${pL - 10}" y="${yP + 4}" text-anchor="end">${Math.round(yV)}</text>`;
  }
  svg += `<line class="svg-axis" x1="${pL}" y1="${cH - pB}" x2="${cW - pR}" y2="${cH - pB}" /><line class="svg-axis" x1="${pL}" y1="${pT}" x2="${pL}" y2="${cH - pB}" />`;
  const sp = ctW / (months.length - 1);
  const pts = months.map((m, i) => { const val = sums[i], x = pL + (i * sp), y = cH - pB - ((val / maxVal) * ctH); return { x, y, val, m }; });
  svg += `<polyline class="svg-line" points="${pts.map(p => `${p.x},${p.y}`).join(" ")}" />`;
  pts.forEach(p => { svg += `<circle class="svg-line-point" cx="${p.x}" cy="${p.y}" r="4" /><text class="svg-text" x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-weight="600" fill="#0F172A">${Math.round(p.val)}</text><text class="svg-text" x="${p.x}" y="${cH - pB + 18}" text-anchor="middle">${p.m}</text>`; });
  svg += `</svg>`;
  container.innerHTML = svg;
}

function drawPieChart(active, available, maintenance) {
  const container = document.getElementById("pie-chart-container");
  if (!container) return;
  container.innerHTML = "";
  const total = active + available + maintenance;
  const values = [active, available, maintenance];
  const labels = ["Active", "Available", "Maintenance"];
  const colors = ["#10B981", "#3B82F6", "#F59E0B"];
  const cx = 150, cy = 100, radius = 70;
  let svg = `<svg class="svg-chart" viewBox="0 0 300 200" style="height:190px;">`;
  if (total === 0) {
    svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgba(15,23,42,0.05)" stroke="var(--border-color)" stroke-width="1" /><text class="svg-text" x="${cx}" y="${cy}" text-anchor="middle">No Fleet Data</text>`;
  } else {
    let startAngle = 0;
    values.forEach((val, idx) => {
      if (val === 0) return;
      const angle = (val / total) * 360, endAngle = startAngle + angle;
      const startRad = (startAngle - 90) * Math.PI / 180, endRad = (endAngle - 90) * Math.PI / 180;
      const x1 = cx + radius * Math.cos(startRad), y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad), y2 = cy + radius * Math.sin(endRad);
      const largeArc = angle > 180 ? 1 : 0;
      let pathData = angle === 360 ? `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy}` : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      svg += `<path class="svg-pie-slice" d="${pathData}" fill="${colors[idx]}" />`;
      const labelRad = (startAngle + angle / 2 - 90) * Math.PI / 180;
      const lx = cx + (radius * 0.65) * Math.cos(labelRad), ly = cy + (radius * 0.65) * Math.sin(labelRad);
      const percent = Math.round((val / total) * 100);
      if (percent > 8) svg += `<text class="svg-text" x="${lx}" y="${ly + 3}" text-anchor="middle" font-weight="700" fill="#FFFFFF">${percent}%</text>`;
      startAngle = endAngle;
    });
  }
  svg += `</svg>`;
  let legend = `<div class="chart-legend">`;
  labels.forEach((label, idx) => { legend += `<div class="legend-item"><div class="legend-color" style="background-color:${colors[idx]};border:1px solid var(--border-color);"></div><span>${label} (${values[idx]})</span></div>`; });
  legend += `</div>`;
  container.innerHTML = svg + legend;
}

// --- WIDGET CLICK NAVIGATION ---
function setupWidgetNavigation() {
  const widgets = document.querySelectorAll(".widget-card");
  if (widgets.length >= 9) {
    widgets[0].addEventListener("click", () => window.location.href = "../vehicles/vehicles.html");
    widgets[1].addEventListener("click", () => window.location.href = "../vehicles/vehicles.html");
    widgets[2].addEventListener("click", () => window.location.href = "../vehicles/vehicles.html");
    widgets[3].addEventListener("click", () => window.location.href = "../trips/trips.html");
    widgets[4].addEventListener("click", () => window.location.href = "../trips/trips.html");
    widgets[5].addEventListener("click", () => window.location.href = "../drivers/drivers.html");
    widgets[6].addEventListener("click", () => window.location.href = "../vehicles/vehicles.html");
    widgets[7].addEventListener("click", () => window.location.href = "../expenses/expenses.html");
    widgets[8].addEventListener("click", () => window.location.href = "../fuel/fuel.html");
  }
}

// --- INIT ---
window.addEventListener("DOMContentLoaded", async () => {
  const loggedIn = localStorage.getItem("transitops_logged_in");
  if (loggedIn !== "true") { window.location.href = "../login/login.html"; return; }

  await loadDatabase();
  renderDashboard();
  setupWidgetNavigation();
  lucide.createIcons();

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });
});
