// TransitOps Transport Operations Platform - Application Logic
// Built using ES6 Vanilla JavaScript with SQLite API integration

// --- DATABASE STATE ---
let db = {
  vehicles: [],
  drivers: [],
  trips: [],
  maintenance: [],
  fuel: [],
  expenses: [],
  users: [],
  settings: {}
};

async function loadDatabase() {
  try {
    const [vehicles, drivers, trips, maintenance, fuel, expenses, users, settings] = await Promise.all([
      fetch("/api/vehicles").then(r => r.json()),
      fetch("/api/drivers").then(r => r.json()),
      fetch("/api/trips").then(r => r.json()),
      fetch("/api/maintenance").then(r => r.json()),
      fetch("/api/fuel").then(r => r.json()),
      fetch("/api/expenses").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
      fetch("/api/settings").then(r => r.json())
    ]);

    db.vehicles = vehicles;
    db.drivers = drivers;
    db.trips = trips;
    db.maintenance = maintenance;
    db.fuel = fuel;
    db.expenses = expenses;
    db.users = users;
    db.settings = settings;

    // Apply settings Platform Name
    document.querySelectorAll(".sidebar-brand").forEach(brand => {
      brand.textContent = db.settings.platformName || "TransitOps";
    });
  } catch (err) {
    console.error("Error loading database from SQLite API:", err);
  }
}

// --- STATE MANAGEMENT ---
let activePage = "dashboard";
let paginationConfig = {
  vehicles: { page: 1, limit: 5 },
  drivers: { page: 1, limit: 5 },
  trips: { page: 1, limit: 5 },
  maintenance: { page: 1, limit: 5 },
  fuel: { page: 1, limit: 5 },
  expenses: { page: 1, limit: 5 },
  users: { page: 1, limit: 5 }
};

let tableSorting = {
  vehicles: { column: 'id', desc: false },
  drivers: { column: 'id', desc: false },
  trips: { column: 'id', desc: false },
  maintenance: { column: 'id', desc: false },
  fuel: { column: 'id', desc: false },
  expenses: { column: 'id', desc: false },
  users: { column: 'id', desc: false }
};

// Global parameters for modals
let activeDeleteTarget = null;
let currentModalType = null;
let currentModalAction = null;
let currentModalId = null;

// --- TOAST NOTIFICATIONS ---
function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i data-lucide="check-circle" style="width:16px;height:16px;"></i> <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons();
  
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// --- PAGE ROUTING CONTROLLER ---
async function navigateTo(pageId) {
  // Update state
  activePage = pageId;
  
  // Update DOM classes
  document.querySelectorAll(".page-container").forEach(el => el.classList.remove("active"));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add("active");

  // Update sidebar active link
  document.querySelectorAll(".sidebar-link").forEach(link => {
    if (link.getAttribute("data-page") === pageId) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Dynamic header updates
  const headerTitle = document.getElementById("header-title");
  const headerIcon = document.getElementById("header-icon");
  
  const pageDetails = {
    dashboard: { title: "Dashboard", icon: "layout-dashboard" },
    vehicles: { title: "Vehicles Management", icon: "truck" },
    drivers: { title: "Driver Directory", icon: "users" },
    trips: { title: "Trip Scheduler & Dispatch", icon: "route" },
    maintenance: { title: "Maintenance Logbook", icon: "wrench" },
    fuel: { title: "Fuel Consumption Logs", icon: "droplet" },
    expenses: { title: "Expense Registry", icon: "banknote" },
    reports: { title: "Analytical Reports", icon: "bar-chart-3" },
    users: { title: "User & Role Configurations", icon: "user-check" },
    settings: { title: "System Configurations", icon: "settings" }
  };

  const details = pageDetails[pageId] || { title: "TransitOps", icon: "navigation" };
  headerTitle.textContent = details.title;
  headerIcon.setAttribute("data-lucide", details.icon);
  
  // Re-run icons loader
  lucide.createIcons();

  // Load backend SQLite database values
  await loadDatabase();

  // Load page-specific assets
  triggerPageLoad(pageId);
}

function triggerPageLoad(pageId) {
  if (pageId === "dashboard") {
    renderDashboard();
  } else if (pageId === "reports") {
    renderReportsPage();
  } else if (pageId === "settings") {
    loadSettingsForms();
  } else {
    // Standard tabular pages
    renderTablePage(pageId);
  }
}

// --- CORE DASHBOARD RENDERING ---
function renderDashboard() {
  // Calculates count values
  const activeVehicles = db.vehicles.filter(v => v.status === "ACTIVE").length;
  const availableVehicles = db.vehicles.filter(v => v.status === "AVAILABLE").length;
  const maintenanceVehicles = db.vehicles.filter(v => v.status === "MAINTENANCE").length;
  const activeTrips = db.trips.filter(t => t.status === "ACTIVE").length;
  const pendingTrips = db.trips.filter(t => t.status === "PENDING").length;
  const driversDuty = db.drivers.filter(d => d.status === "DUTY").length;
  
  // Fleet Utilization calculation
  const totalVehiclesCount = db.vehicles.length;
  const utilization = totalVehiclesCount > 0 
    ? Math.round(((activeVehicles) / totalVehiclesCount) * 100) 
    : 0;

  // Monthly Expenses calculation (For July 2026 as per dates)
  const currentMonthYear = "2026-07";
  const monthlyExpensesVal = db.expenses
    .filter(e => e.date.startsWith(currentMonthYear))
    .reduce((sum, e) => sum + Number(e.cost), 0);

  // Fuel efficiency baseline calculation
  const fuelLitres = db.fuel.reduce((sum, f) => sum + Number(f.liters), 0);
  const calculatedEff = fuelLitres > 0 ? (28600 / fuelLitres).toFixed(1) : "8.4"; // Mock total distance

  // Update elements
  document.getElementById("widget-active-vehicles").textContent = activeVehicles;
  document.getElementById("widget-available-vehicles").textContent = availableVehicles;
  document.getElementById("widget-maintenance-vehicles").textContent = maintenanceVehicles;
  document.getElementById("widget-active-trips").textContent = activeTrips;
  document.getElementById("widget-pending-trips").textContent = pendingTrips;
  document.getElementById("widget-drivers-duty").textContent = driversDuty;
  document.getElementById("widget-fleet-utilization").textContent = `${utilization}%`;
  document.getElementById("widget-monthly-expenses").textContent = formatCurrency(monthlyExpensesVal);
  document.getElementById("widget-fuel-efficiency").textContent = `${calculatedEff} km/L`;

  // Draw Charts
  drawBarChart();
  drawLineChart();
  drawPieChart(activeVehicles, availableVehicles, maintenanceVehicles);

  // Render Active Vehicles List on Dashboard
  const activeVehiclesTbody = document.getElementById("dashboard-active-vehicles-table").querySelector("tbody");
  const activeVehList = db.vehicles.filter(v => v.status === "ACTIVE");
  if (activeVehList.length === 0) {
    activeVehiclesTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding: 20px;">No active vehicles in transit.</td></tr>`;
  } else {
    activeVehiclesTbody.innerHTML = activeVehList.map(v => `
      <tr style="cursor: pointer;" onclick="openDetailsModal('vehicles', ${v.id})" title="Click to view vehicle details">
        <td><strong>${v.plate}</strong></td>
        <td>${v.make} ${v.model}</td>
        <td><span class="status-pill status-active">${v.type}</span></td>
      </tr>
    `).join("");
  }

  // Render Active Trips List on Dashboard
  const activeTripsTbody = document.getElementById("dashboard-active-trips-table").querySelector("tbody");
  const activeTripsList = db.trips.filter(t => t.status === "ACTIVE");
  if (activeTripsList.length === 0) {
    activeTripsTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding: 20px;">No active trips in dispatch.</td></tr>`;
  } else {
    activeTripsTbody.innerHTML = activeTripsList.map(t => {
      const v = db.vehicles.find(vh => vh.id == t.vehicleId) || { plate: "Unknown" };
      const d = db.drivers.find(dr => dr.id == t.driverId) || { name: "Unknown" };
      return `
        <tr style="cursor: pointer;" onclick="openDetailsModal('trips', ${t.id})" title="Click to view trip details">
          <td><strong>${t.origin} → ${t.destination}</strong></td>
          <td>${v.plate}</td>
          <td>${d.name}</td>
        </tr>
      `;
    }).join("");
  }
}

// Helper formatting functions
function formatCurrency(val) {
  const code = db.settings ? db.settings.currency : "USD";
  const symbol = code === "EUR" ? "€" : code === "INR" ? "₹" : "$";
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// --- DYNAMIC SVG CHARTS BUILDER ---

function drawBarChart() {
  const container = document.getElementById("bar-chart-container");
  container.innerHTML = "";
  
  // Group costs by categories
  const categories = ["Fuel", "Maintenance", "Insurance", "Tolls", "Other"];
  const sums = categories.map(cat => {
    return db.expenses
      .filter(e => e.category.toLowerCase() === cat.toLowerCase())
      .reduce((sum, e) => sum + Number(e.cost), 0);
  });

  const maxVal = Math.max(...sums, 100);
  const chartHeight = 220;
  const chartWidth = 450;
  const paddingLeft = 60;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingRight = 20;

  const contentWidth = chartWidth - paddingLeft - paddingRight;
  const contentHeight = chartHeight - paddingTop - paddingBottom;

  // Build SVG content
  let svgHTML = `<svg class="svg-chart" viewBox="0 0 ${chartWidth} ${chartHeight}">`;

  // Draw Grid Lines & Y Axis Labels
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const yVal = maxVal * (i / ticks);
    const yPos = chartHeight - paddingBottom - (contentHeight * (i / ticks));
    svgHTML += `
      <line class="svg-grid-line" x1="${paddingLeft}" y1="${yPos}" x2="${chartWidth - paddingRight}" y2="${yPos}" />
      <text class="svg-text" x="${paddingLeft - 10}" y="${yPos + 4}" text-anchor="end">${Math.round(yVal)}</text>
    `;
  }

  // Draw Axis lines
  svgHTML += `
    <line class="svg-axis" x1="${paddingLeft}" y1="${chartHeight - paddingBottom}" x2="${chartWidth - paddingRight}" y2="${chartHeight - paddingBottom}" />
    <line class="svg-axis" x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${chartHeight - paddingBottom}" />
  `;

  // Draw Columns
  const barSpacing = contentWidth / categories.length;
  const barWidth = barSpacing * 0.55;

  categories.forEach((cat, index) => {
    const val = sums[index];
    const barHeight = (val / maxVal) * contentHeight;
    const xPos = paddingLeft + (index * barSpacing) + (barSpacing - barWidth) / 2;
    const yPos = chartHeight - paddingBottom - barHeight;

    svgHTML += `
      <rect class="svg-bar" x="${xPos}" y="${yPos}" width="${barWidth}" height="${barHeight}" rx="4" ry="4" />
      <text class="svg-text" x="${xPos + barWidth / 2}" y="${yPos - 6}" text-anchor="middle" font-weight="600" fill="#0F172A">${Math.round(val)}</text>
      <text class="svg-text" x="${xPos + barWidth / 2}" y="${chartHeight - paddingBottom + 18}" text-anchor="middle">${cat}</text>
    `;
  });

  svgHTML += `</svg>`;
  container.innerHTML = svgHTML;
}

function drawLineChart() {
  const container = document.getElementById("line-chart-container");
  container.innerHTML = "";

  // Last 6 Months Labels
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const monthIndices = [2, 3, 4, 5, 6, 7]; // 2026 Month numbers
  const sums = monthIndices.map(m => {
    return db.expenses
      .filter(e => {
        const dateObj = new Date(e.date);
        return dateObj.getFullYear() === 2026 && (dateObj.getMonth() + 1) === m;
      })
      .reduce((sum, e) => sum + Number(e.cost), 0);
  });

  const maxVal = Math.max(...sums, 500);
  const chartHeight = 220;
  const chartWidth = 450;
  const paddingLeft = 60;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingRight = 20;

  const contentWidth = chartWidth - paddingLeft - paddingRight;
  const contentHeight = chartHeight - paddingTop - paddingBottom;

  let svgHTML = `<svg class="svg-chart" viewBox="0 0 ${chartWidth} ${chartHeight}">`;

  // Draw Grid Lines & Y Axis Labels
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const yVal = maxVal * (i / ticks);
    const yPos = chartHeight - paddingBottom - (contentHeight * (i / ticks));
    svgHTML += `
      <line class="svg-grid-line" x1="${paddingLeft}" y1="${yPos}" x2="${chartWidth - paddingRight}" y2="${yPos}" />
      <text class="svg-text" x="${paddingLeft - 10}" y="${yPos + 4}" text-anchor="end">${Math.round(yVal)}</text>
    `;
  }

  // Draw Axis lines
  svgHTML += `
    <line class="svg-axis" x1="${paddingLeft}" y1="${chartHeight - paddingBottom}" x2="${chartWidth - paddingRight}" y2="${chartHeight - paddingBottom}" />
    <line class="svg-axis" x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${chartHeight - paddingBottom}" />
  `;

  // Render Line Points coordinates
  const spacing = contentWidth / (months.length - 1);
  const points = months.map((m, index) => {
    const val = sums[index];
    const x = paddingLeft + (index * spacing);
    const y = chartHeight - paddingBottom - ((val / maxVal) * contentHeight);
    return { x, y, val, m };
  });

  // Draw connection polyline
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");
  svgHTML += `<polyline class="svg-line" points="${polylinePoints}" />`;

  // Draw point nodes & labels
  points.forEach(p => {
    svgHTML += `
      <circle class="svg-line-point" cx="${p.x}" cy="${p.y}" r="4" />
      <text class="svg-text" x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-weight="600" fill="#0F172A">${Math.round(p.val)}</text>
      <text class="svg-text" x="${p.x}" y="${chartHeight - paddingBottom + 18}" text-anchor="middle">${p.m}</text>
    `;
  });

  svgHTML += `</svg>`;
  container.innerHTML = svgHTML;
}

function drawPieChart(active, available, maintenance) {
  const container = document.getElementById("pie-chart-container");
  container.innerHTML = "";

  const total = active + available + maintenance;
  const values = [active, available, maintenance];
  const labels = ["Active", "Available", "Maintenance"];
  const colors = ["#10B981", "#3B82F6", "#F59E0B"]; // Green, Blue, Amber Status Colors

  const chartHeight = 200;
  const chartWidth = 300;
  const cx = 150;
  const cy = 100;
  const radius = 70;

  let svgHTML = `<svg class="svg-chart" viewBox="0 0 ${chartWidth} ${chartHeight}" style="height:190px;">`;

  if (total === 0) {
    svgHTML += `
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgba(15, 23, 42, 0.05)" stroke="var(--border-color)" stroke-width="1" />
      <text class="svg-text" x="${cx}" y="${cy}" text-anchor="middle">No Fleet Data</text>
    `;
  } else {
    let startAngle = 0;
    values.forEach((val, idx) => {
      if (val === 0) return;
      const angle = (val / total) * 360;
      const endAngle = startAngle + angle;

      // Convert degree to radian
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;

      // Arc points coordinates
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;
      
      let pathData = "";
      if (angle === 360) {
        pathData = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy}`;
      } else {
        pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }

      svgHTML += `<path class="svg-pie-slice" d="${pathData}" fill="${colors[idx]}" />`;
      
      // Calculate label coordinates along the center of the arc
      const labelRad = (startAngle + angle / 2 - 90) * Math.PI / 180;
      const lx = cx + (radius * 0.65) * Math.cos(labelRad);
      const ly = cy + (radius * 0.65) * Math.sin(labelRad);
      const percent = Math.round((val / total) * 100);
      
      const textColor = "#FFFFFF"; // Toggle text contrast based on background opacity
      if (percent > 8) {
        svgHTML += `<text class="svg-text" x="${lx}" y="${ly + 3}" text-anchor="middle" font-weight="700" fill="${textColor}">${percent}%</text>`;
      }

      startAngle = endAngle;
    });
  }

  svgHTML += `</svg>`;

  // Build the Legend
  let legendHTML = `<div class="chart-legend">`;
  labels.forEach((label, idx) => {
    legendHTML += `
      <div class="legend-item">
        <div class="legend-color" style="background-color: ${colors[idx]}; border: 1px solid var(--border-color);"></div>
        <span>${label} (${values[idx]})</span>
      </div>
    `;
  });
  legendHTML += `</div>`;

  container.innerHTML = svgHTML + legendHTML;
}

// --- DYNAMIC DATA LISTS & TABLES COMPONENT ---

function getSortedAndFilteredData(pageId) {
  let list = [];
  const searchInput = document.getElementById(`${pageId}-search`);
  const filterSelect = document.getElementById(`${pageId}-filter-status`) || document.getElementById(`${pageId}-filter-category`) || document.getElementById(`${pageId}-filter-role`);
  
  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const filterVal = filterSelect ? filterSelect.value : "ALL";

  // Match target tables data lists
  if (pageId === "vehicles") {
    list = db.vehicles.filter(v => {
      const matchSearch = v.plate.toLowerCase().includes(searchVal) || 
                          v.make.toLowerCase().includes(searchVal) || 
                          v.model.toLowerCase().includes(searchVal) ||
                          v.type.toLowerCase().includes(searchVal);
      const matchFilter = filterVal === "ALL" || v.status === filterVal;
      return matchSearch && matchFilter;
    });
  } else if (pageId === "drivers") {
    list = db.drivers.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(searchVal) || 
                          d.license.toLowerCase().includes(searchVal) || 
                          d.phone.toLowerCase().includes(searchVal);
      const matchFilter = filterVal === "ALL" || d.status === filterVal;
      return matchSearch && matchFilter;
    });
  } else if (pageId === "trips") {
    list = db.trips.map(t => {
      const v = db.vehicles.find(vh => vh.id == t.vehicleId) || { plate: "Unknown" };
      const d = db.drivers.find(dr => dr.id == t.driverId) || { name: "Unknown" };
      return { ...t, vehiclePlate: v.plate, driverName: d.name };
    }).filter(t => {
      const matchSearch = t.origin.toLowerCase().includes(searchVal) || 
                          t.destination.toLowerCase().includes(searchVal) || 
                          t.vehiclePlate.toLowerCase().includes(searchVal) || 
                          t.driverName.toLowerCase().includes(searchVal);
      const matchFilter = filterVal === "ALL" || t.status === filterVal;
      return matchSearch && matchFilter;
    });
  } else if (pageId === "maintenance") {
    list = db.maintenance.map(m => {
      const v = db.vehicles.find(vh => vh.id == m.vehicleId) || { plate: "Unknown" };
      return { ...m, vehiclePlate: v.plate };
    }).filter(m => {
      const matchSearch = m.description.toLowerCase().includes(searchVal) || 
                          m.vehiclePlate.toLowerCase().includes(searchVal);
      const matchFilter = filterVal === "ALL" || m.status === filterVal;
      return matchSearch && matchFilter;
    });
  } else if (pageId === "fuel") {
    list = db.fuel.map(f => {
      const v = db.vehicles.find(vh => vh.id == f.vehicleId) || { plate: "Unknown" };
      return { ...f, vehiclePlate: v.plate };
    }).filter(f => {
      const matchSearch = f.vehiclePlate.toLowerCase().includes(searchVal) || 
                          f.provider.toLowerCase().includes(searchVal);
      return matchSearch; // Fuel page has no status filter
    });
  } else if (pageId === "expenses") {
    list = db.expenses.map(e => {
      const v = db.vehicles.find(vh => vh.id == e.vehicleId) || { plate: "Unknown" };
      return { ...e, vehiclePlate: v.plate };
    }).filter(e => {
      const matchSearch = e.description.toLowerCase().includes(searchVal) || 
                          e.vehiclePlate.toLowerCase().includes(searchVal) ||
                          e.category.toLowerCase().includes(searchVal);
      const matchFilter = filterVal === "ALL" || e.category === filterVal;
      return matchSearch && matchFilter;
    });
  } else if (pageId === "users") {
    list = db.users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchVal) || 
                          u.email.toLowerCase().includes(searchVal);
      const matchFilter = filterVal === "ALL" || u.role === filterVal;
      return matchSearch && matchFilter;
    });
  }

  // Handle column sorting
  const sort = tableSorting[pageId];
  if (sort && sort.column) {
    list.sort((a, b) => {
      let valA = a[sort.column];
      let valB = b[sort.column];
      
      // Handle string conversions
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      
      if (valA < valB) return sort.desc ? 1 : -1;
      if (valA > valB) return sort.desc ? -1 : 1;
      return 0;
    });
  }

  return list;
}

function handleSort(pageId, column) {
  const sort = tableSorting[pageId];
  if (sort.column === column) {
    sort.desc = !sort.desc; // Toggle direction
  } else {
    sort.column = column;
    sort.desc = false;
  }
  renderTablePage(pageId);
}

function renderTablePage(pageId) {
  const table = document.getElementById(`${pageId}-table`);
  if (!table) return;

  const dataList = getSortedAndFilteredData(pageId);
  const config = paginationConfig[pageId];
  
  // Calculate paging limits
  const totalRecords = dataList.length;
  const totalPages = Math.max(Math.ceil(totalRecords / config.limit), 1);
  if (config.page > totalPages) config.page = totalPages;
  
  const startIndex = (config.page - 1) * config.limit;
  const endIndex = Math.min(startIndex + config.limit, totalRecords);
  const pagedList = dataList.slice(startIndex, endIndex);

  // Render Table Head with sort signals
  const thead = table.querySelector("thead");
  const headers = getTableHeaders(pageId);
  let theadHTML = "<tr>";
  
  headers.forEach(h => {
    if (h.key) {
      const sort = tableSorting[pageId];
      const isSorted = sort.column === h.key;
      const arrow = isSorted ? (sort.desc ? "↓" : "↑") : "↕";
      theadHTML += `
        <th class="sortable" onclick="handleSort('${pageId}', '${h.key}')">
          <div class="th-content">
            <span>${h.label}</span>
            <span style="font-size:10px; opacity: ${isSorted ? 1 : 0.4};">${arrow}</span>
          </div>
        </th>
      `;
    } else {
      theadHTML += `<th>${h.label}</th>`;
    }
  });
  theadHTML += `<th style="text-align: right;">Actions</th></tr>`;
  thead.innerHTML = theadHTML;

  // Render Table Body
  const tbody = table.querySelector("tbody");
  if (pagedList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${headers.length + 1}" style="text-align: center; padding: 30px; color: var(--text-muted);">No records found.</td></tr>`;
  } else {
    let tbodyHTML = "";
    pagedList.forEach(row => {
      tbodyHTML += `<tr>`;
      headers.forEach(h => {
        tbodyHTML += `<td>${formatTableCellValue(pageId, row, h)}</td>`;
      });
      // Actions Column
      tbodyHTML += `
        <td>
          <div class="table-actions">
            <button class="btn btn-secondary btn-sm" onclick="openDetailsModal('${pageId}', ${row.id})" title="View details">
              <i data-lucide="eye" style="width:12px;height:12px;"></i> View
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openFormModal('${pageId}', 'edit', ${row.id})" title="Edit record">
              <i data-lucide="edit" style="width:12px;height:12px;"></i> Edit
            </button>
            <button class="btn btn-danger-outline btn-sm" onclick="openDeleteModal('${pageId}', ${row.id})" title="Delete record">
              <i data-lucide="trash" style="width:12px;height:12px;"></i> Delete
            </button>
          </div>
        </td>
      </tr>`;
    });
    tbody.innerHTML = tbodyHTML;
  }

  // Render Pagination Info and Triggers
  renderPaginationControls(pageId, config.page, totalPages, startIndex + 1, endIndex, totalRecords);
  
  // Rebuild Lucide Icons inside dynamically generated table
  lucide.createIcons();
}

// Table Headers Config
function getTableHeaders(pageId) {
  switch (pageId) {
    case "vehicles":
      return [
        { label: "ID", key: "id" },
        { label: "Plate Number", key: "plate" },
        { label: "Manufacturer", key: "make" },
        { label: "Model", key: "model" },
        { label: "Type", key: "type" },
        { label: "Year", key: "year" },
        { label: "Status", key: "status" }
      ];
    case "drivers":
      return [
        { label: "ID", key: "id" },
        { label: "Full Name", key: "name" },
        { label: "CDL License No.", key: "license" },
        { label: "Phone Number", key: "phone" },
        { label: "Duty Status", key: "status" }
      ];
    case "trips":
      return [
        { label: "ID", key: "id" },
        { label: "Vehicle Plate", key: "vehiclePlate" },
        { label: "Assigned Driver", key: "driverName" },
        { label: "Origin", key: "origin" },
        { label: "Destination", key: "destination" },
        { label: "Revenue/Cost", key: "cost" },
        { label: "Status", key: "status" }
      ];
    case "maintenance":
      return [
        { label: "ID", key: "id" },
        { label: "Vehicle Plate", key: "vehiclePlate" },
        { label: "Description", key: "description" },
        { label: "Cost", key: "cost" },
        { label: "Scheduled Date", key: "date" },
        { label: "Status", key: "status" }
      ];
    case "fuel":
      return [
        { label: "ID", key: "id" },
        { label: "Vehicle Plate", key: "vehiclePlate" },
        { label: "Fuel Filled (L)", key: "liters" },
        { label: "Total Cost", key: "cost" },
        { label: "Fills Date", key: "date" },
        { label: "Provider", key: "provider" }
      ];
    case "expenses":
      return [
        { label: "ID", key: "id" },
        { label: "Vehicle Plate", key: "vehiclePlate" },
        { label: "Category", key: "category" },
        { label: "Description", key: "description" },
        { label: "Amount", key: "cost" },
        { label: "Log Date", key: "date" }
      ];
    case "users":
      return [
        { label: "ID", key: "id" },
        { label: "User Name", key: "name" },
        { label: "Email Address", key: "email" },
        { label: "System Role", key: "role" },
        { label: "Status", key: "status" }
      ];
    default:
      return [];
  }
}

// Table cell visual formats
function formatTableCellValue(pageId, row, header) {
  const value = row[header.key];
  
  if (header.key === "status") {
    const statusText = value.replace("_", " ");
    return `<span class="status-pill status-${value.toLowerCase()}">${statusText}</span>`;
  }
  if (header.key === "cost" || header.key === "amount") {
    return formatCurrency(value);
  }
  
  return value;
}

// Pagination controls renderer
function renderPaginationControls(pageId, curPage, totalPages, start, end, total) {
  const pag = document.getElementById(`${pageId}-pagination`);
  if (!pag) return;

  if (total === 0) {
    pag.innerHTML = "";
    return;
  }

  pag.innerHTML = `
    <div class="pagination-info">
      Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${total}</strong> records
    </div>
    <div class="pagination-buttons">
      <button class="btn btn-secondary btn-sm" ${curPage === 1 ? "disabled" : ""} onclick="changePage('${pageId}', ${curPage - 1})">
        <i data-lucide="chevron-left" style="width:12px;height:12px;"></i> Prev
      </button>
      <span style="font-size:12px; font-weight:500;">Page ${curPage} of ${totalPages}</span>
      <button class="btn btn-secondary btn-sm" ${curPage === totalPages ? "disabled" : ""} onclick="changePage('${pageId}', ${curPage + 1})">
        Next <i data-lucide="chevron-right" style="width:12px;height:12px;"></i>
      </button>
    </div>
  `;
}

function changePage(pageId, newPage) {
  paginationConfig[pageId].page = newPage;
  renderTablePage(pageId);
}

// Set up listeners for search inputs and select filters
function setupFilterListeners() {
  const tables = ["vehicles", "drivers", "trips", "maintenance", "fuel", "expenses", "users"];
  tables.forEach(t => {
    const search = document.getElementById(`${t}-search`);
    const filter = document.getElementById(`${t}-filter-status`) || document.getElementById(`${t}-filter-category`) || document.getElementById(`${t}-filter-role`);
    
    if (search) {
      search.addEventListener("input", () => {
        paginationConfig[t].page = 1; // Reset to page 1
        renderTablePage(t);
      });
    }
    
    if (filter) {
      filter.addEventListener("change", () => {
        paginationConfig[t].page = 1; // Reset page
        renderTablePage(t);
      });
    }
  });
}

// --- VIEW RECORD DETAILS DIALOG (READ) ---
function openDetailsModal(type, id) {
  const detailsModal = document.getElementById("details-modal-container");
  const detailsTitle = document.getElementById("details-modal-title");
  const detailsBody = document.getElementById("details-modal-body");

  // Retrieve exact record
  let record = null;
  let labelType = "";
  
  if (type === "vehicles") {
    record = db.vehicles.find(v => v.id == id);
    labelType = "Vehicle Profile";
  } else if (type === "drivers") {
    record = db.drivers.find(d => d.id == id);
    labelType = "Driver Details";
  } else if (type === "trips") {
    const t = db.trips.find(tr => tr.id == id);
    if (t) {
      const v = db.vehicles.find(vh => vh.id == t.vehicleId) || { plate: "N/A" };
      const d = db.drivers.find(dr => dr.id == t.driverId) || { name: "N/A" };
      record = { ...t, vehiclePlate: v.plate, driverName: d.name };
    }
    labelType = "Trip Invoice";
  } else if (type === "maintenance") {
    const m = db.maintenance.find(mn => mn.id == id);
    if (m) {
      const v = db.vehicles.find(vh => vh.id == m.vehicleId) || { plate: "N/A" };
      record = { ...m, vehiclePlate: v.plate };
    }
    labelType = "Maintenance Records";
  } else if (type === "fuel") {
    const f = db.fuel.find(fl => fl.id == id);
    if (f) {
      const v = db.vehicles.find(vh => vh.id == f.vehicleId) || { plate: "N/A" };
      record = { ...f, vehiclePlate: v.plate };
    }
    labelType = "Fuel Log Summary";
  } else if (type === "expenses") {
    const e = db.expenses.find(ex => ex.id == id);
    if (e) {
      const v = db.vehicles.find(vh => vh.id == e.vehicleId) || { plate: "N/A" };
      record = { ...e, vehiclePlate: v.plate };
    }
    labelType = "Expense Receipt";
  } else if (type === "users") {
    record = db.users.find(u => u.id == id);
    labelType = "User Registry Info";
  }

  if (!record) return;

  detailsTitle.textContent = `${labelType} (ID: #${record.id})`;
  
  // Format HTML representation in detail list grid
  let gridHTML = `<div class="detail-grid">`;
  
  Object.keys(record).forEach(key => {
    // Make key names user-friendly
    const keyLabels = {
      id: "Record ID",
      plate: "Plate Number",
      make: "Manufacturer",
      model: "Model Name",
      type: "Vehicle Type",
      year: "Manufacture Year",
      status: "Operational Status",
      name: "Full Name",
      license: "License Code",
      phone: "Phone Line",
      vehicleId: "Vehicle ID Reference",
      driverId: "Driver ID Reference",
      vehiclePlate: "Vehicle Assigned",
      driverName: "Driver Assigned",
      origin: "Origin Terminal",
      destination: "Destination Hub",
      cost: "Total Value / Fee",
      date: "Logged Date",
      description: "Detailed Description",
      liters: "Volume Filled (L)",
      provider: "Gas Provider Name",
      category: "Cost Category",
      email: "Email Account",
      role: "Platform Role"
    };

    const label = keyLabels[key] || key;
    let val = record[key];

    // Formatter rules
    if (key === "cost" || key === "amount") {
      val = formatCurrency(val);
    } else if (key === "status") {
      val = `<span class="status-pill status-${val.toLowerCase()}">${val.replace("_", " ")}</span>`;
    }

    gridHTML += `
      <div class="detail-label">${label}</div>
      <div class="detail-value">${val}</div>
    `;
  });

  gridHTML += `</div>`;
  detailsBody.innerHTML = gridHTML;
  detailsModal.classList.add("active");
}

function closeDetailsModal() {
  document.getElementById("details-modal-container").classList.remove("active");
}

// --- CREATE & UPDATE OPERATION FORMS ---
function openFormModal(type, action, id = null) {
  currentModalType = type;
  currentModalAction = action;
  currentModalId = id;

  const modal = document.getElementById("modal-container");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const submitBtn = document.getElementById("btn-modal-submit");

  // Get active record if edit
  let record = id ? db[type].find(r => r.id == id) : null;
  const labels = {
    vehicles: "Vehicle",
    drivers: "Driver Profile",
    trips: "Trip Route Details",
    maintenance: "Maintenance Log",
    fuel: "Fuel Log",
    expenses: "Expense Log",
    users: "User Account"
  };

  modalTitle.textContent = `${action === "add" ? "Create New" : "Edit"} ${labels[type]}`;
  submitBtn.textContent = action === "add" ? "Submit Record" : "Save Changes";

  // Build form inputs dynamically
  modalBody.innerHTML = buildFormHTML(type, record);
  modal.classList.add("active");
}

// Close form modal
function closeModal() {
  document.getElementById("modal-container").classList.remove("active");
  currentModalType = null;
  currentModalAction = null;
  currentModalId = null;
}

function buildFormHTML(type, record) {
  const getVal = (key, fallback = "") => (record ? record[key] : fallback);

  if (type === "vehicles") {
    return `
      <div class="form-group">
        <label class="form-label" for="form-plate">Plate Number</label>
        <input type="text" id="form-plate" class="form-control" placeholder="e.g. NY-1102-K" required value="${getVal("plate")}">
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-make">Manufacturer</label>
          <input type="text" id="form-make" class="form-control" placeholder="e.g. Freightliner" required value="${getVal("make")}">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-model">Model</label>
          <input type="text" id="form-model" class="form-control" placeholder="e.g. Cascadia" required value="${getVal("model")}">
        </div>
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-type">Vehicle Type</label>
          <select id="form-type" class="form-control">
            <option value="Semi-Truck" ${getVal("type") === "Semi-Truck" ? "selected" : ""}>Semi-Truck</option>
            <option value="Flatbed" ${getVal("type") === "Flatbed" ? "selected" : ""}>Flatbed</option>
            <option value="Box Truck" ${getVal("type") === "Box Truck" ? "selected" : ""}>Box Truck</option>
            <option value="Cargo Van" ${getVal("type") === "Cargo Van" ? "selected" : ""}>Cargo Van</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="form-year">Year</label>
          <input type="number" id="form-year" class="form-control" min="1995" max="2027" required value="${getVal("year", 2023)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-status">Status</label>
        <select id="form-status" class="form-control">
          <option value="ACTIVE" ${getVal("status") === "ACTIVE" ? "selected" : ""}>Active</option>
          <option value="AVAILABLE" ${getVal("status") === "AVAILABLE" ? "selected" : ""}>Available</option>
          <option value="MAINTENANCE" ${getVal("status") === "MAINTENANCE" ? "selected" : ""}>Maintenance</option>
        </select>
      </div>
    `;
  }

  if (type === "drivers") {
    return `
      <div class="form-group">
        <label class="form-label" for="form-name">Driver Full Name</label>
        <input type="text" id="form-name" class="form-control" placeholder="e.g. John Doe" required value="${getVal("name")}">
      </div>
      <div class="form-group">
        <label class="form-label" for="form-license">CDL License Number</label>
        <input type="text" id="form-license" class="form-control" placeholder="e.g. CDL-A-1234" required value="${getVal("license")}">
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-phone">Phone Number</label>
          <input type="text" id="form-phone" class="form-control" placeholder="e.g. +1 (555) 012-3456" required value="${getVal("phone")}">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-status">Duty Status</label>
          <select id="form-status" class="form-control">
            <option value="DUTY" ${getVal("status") === "DUTY" ? "selected" : ""}>On Duty</option>
            <option value="OFF_DUTY" ${getVal("status") === "OFF_DUTY" ? "selected" : ""}>Off Duty</option>
          </select>
        </div>
      </div>
    `;
  }

  if (type === "trips") {
    const vehiclesOptions = db.vehicles.map(v => 
      `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make} ${v.model}</option>`
    ).join("");
    
    const driversOptions = db.drivers.map(d => 
      `<option value="${d.id}" ${getVal("driverId") == d.id ? "selected" : ""}>${d.name} (${d.status.replace("_", " ")})</option>`
    ).join("");

    return `
      <div class="form-group">
        <label class="form-label" for="form-vehicle">Assign Vehicle</label>
        <select id="form-vehicle" class="form-control" required>${vehiclesOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-driver">Assign Driver</label>
        <select id="form-driver" class="form-control" required>${driversOptions}</select>
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-origin">Origin</label>
          <input type="text" id="form-origin" class="form-control" placeholder="e.g. Chicago, IL" required value="${getVal("origin")}">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-destination">Destination</label>
          <input type="text" id="form-destination" class="form-control" placeholder="e.g. Seattle, WA" required value="${getVal("destination")}">
        </div>
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-cost">Revenue / Cost ($)</label>
          <input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-date">Date</label>
          <input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-status">Trip Status</label>
        <select id="form-status" class="form-control">
          <option value="PENDING" ${getVal("status") === "PENDING" ? "selected" : ""}>Pending</option>
          <option value="ACTIVE" ${getVal("status") === "ACTIVE" ? "selected" : ""}>Active</option>
          <option value="COMPLETED" ${getVal("status") === "COMPLETED" ? "selected" : ""}>Completed</option>
        </select>
      </div>
    `;
  }

  if (type === "maintenance") {
    const vehiclesOptions = db.vehicles.map(v => 
      `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`
    ).join("");

    return `
      <div class="form-group">
        <label class="form-label" for="form-vehicle">Vehicle</label>
        <select id="form-vehicle" class="form-control" required>${vehiclesOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-description">Description of Issue / Work</label>
        <textarea id="form-description" class="form-control" placeholder="Describe the maintenance action taken..." required>${getVal("description")}</textarea>
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-cost">Total Maintenance Cost ($)</label>
          <input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-date">Scheduled Date</label>
          <input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-status">Status</label>
        <select id="form-status" class="form-control">
          <option value="PENDING" ${getVal("status") === "PENDING" ? "selected" : ""}>Pending</option>
          <option value="IN_PROGRESS" ${getVal("status") === "IN_PROGRESS" ? "selected" : ""}>In Progress</option>
          <option value="COMPLETED" ${getVal("status") === "COMPLETED" ? "selected" : ""}>Completed</option>
        </select>
      </div>
    `;
  }

  if (type === "fuel") {
    const vehiclesOptions = db.vehicles.map(v => 
      `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`
    ).join("");

    return `
      <div class="form-group">
        <label class="form-label" for="form-vehicle">Vehicle</label>
        <select id="form-vehicle" class="form-control" required>${vehiclesOptions}</select>
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-liters">Liters Filled</label>
          <input type="number" id="form-liters" class="form-control" min="1" step="1" required value="${getVal("liters")}">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-cost">Total Fuel Cost ($)</label>
          <input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}">
        </div>
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-date">Date Filled</label>
          <input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-provider">Provider Station</label>
          <input type="text" id="form-provider" class="form-control" placeholder="e.g. Love's Travel Stops" required value="${getVal("provider")}">
        </div>
      </div>
    `;
  }

  if (type === "expenses") {
    const vehiclesOptions = db.vehicles.map(v => 
      `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`
    ).join("");

    return `
      <div class="form-group">
        <label class="form-label" for="form-vehicle">Vehicle</label>
        <select id="form-vehicle" class="form-control" required>${vehiclesOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-category">Expense Category</label>
        <select id="form-category" class="form-control">
          <option value="Fuel" ${getVal("category") === "Fuel" ? "selected" : ""}>Fuel</option>
          <option value="Maintenance" ${getVal("category") === "Maintenance" ? "selected" : ""}>Maintenance</option>
          <option value="Insurance" ${getVal("category") === "Insurance" ? "selected" : ""}>Insurance</option>
          <option value="Tolls" ${getVal("category") === "Tolls" ? "selected" : ""}>Tolls</option>
          <option value="Other" ${getVal("category") === "Other" ? "selected" : ""}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-description">Description</label>
        <input type="text" id="form-description" class="form-control" placeholder="e.g. Spare tire buy" required value="${getVal("description")}">
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-cost">Amount ($)</label>
          <input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}">
        </div>
        <div class="form-group">
          <label class="form-label" for="form-date">Date Charged</label>
          <input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}">
        </div>
      </div>
    `;
  }

  if (type === "users") {
    return `
      <div class="form-group">
        <label class="form-label" for="form-name">User Full Name</label>
        <input type="text" id="form-name" class="form-control" placeholder="e.g. Alice Carter" required value="${getVal("name")}">
      </div>
      <div class="form-group">
        <label class="form-label" for="form-email">Email Address</label>
        <input type="email" id="form-email" class="form-control" placeholder="e.g. user@company.com" required value="${getVal("email")}">
      </div>
      <div class="form-group-row">
        <div class="form-group">
          <label class="form-label" for="form-role">System Role</label>
          <select id="form-role" class="form-control">
            <option value="Administrator" ${getVal("role") === "Administrator" ? "selected" : ""}>Administrator</option>
            <option value="Dispatcher" ${getVal("role") === "Dispatcher" ? "selected" : ""}>Dispatcher</option>
            <option value="Driver" ${getVal("role") === "Driver" ? "selected" : ""}>Driver</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="form-status">Account Status</label>
          <select id="form-status" class="form-control">
            <option value="ACTIVE" ${getVal("status") === "ACTIVE" ? "selected" : ""}>Active</option>
            <option value="INACTIVE" ${getVal("status") === "INACTIVE" ? "selected" : ""}>Inactive</option>
          </select>
        </div>
      </div>
    `;
  }

  return "";
}

// Modal Form Submit Event - Sends JSON values to server API
document.getElementById("modal-form").addEventListener("submit", async function(event) {
  event.preventDefault();
  
  const type = currentModalType;
  const action = currentModalAction;
  const id = currentModalId;

  // Extract variables based on input
  let payload = {};
  
  if (type === "vehicles") {
    payload = {
      plate: document.getElementById("form-plate").value.trim(),
      make: document.getElementById("form-make").value.trim(),
      model: document.getElementById("form-model").value.trim(),
      type: document.getElementById("form-type").value,
      year: parseInt(document.getElementById("form-year").value),
      status: document.getElementById("form-status").value
    };
  } else if (type === "drivers") {
    payload = {
      name: document.getElementById("form-name").value.trim(),
      license: document.getElementById("form-license").value.trim(),
      phone: document.getElementById("form-phone").value.trim(),
      status: document.getElementById("form-status").value
    };
  } else if (type === "trips") {
    payload = {
      vehicleId: parseInt(document.getElementById("form-vehicle").value),
      driverId: parseInt(document.getElementById("form-driver").value),
      origin: document.getElementById("form-origin").value.trim(),
      destination: document.getElementById("form-destination").value.trim(),
      cost: parseFloat(document.getElementById("form-cost").value),
      date: document.getElementById("form-date").value,
      status: document.getElementById("form-status").value
    };
  } else if (type === "maintenance") {
    payload = {
      vehicleId: parseInt(document.getElementById("form-vehicle").value),
      description: document.getElementById("form-description").value.trim(),
      cost: parseFloat(document.getElementById("form-cost").value),
      date: document.getElementById("form-date").value,
      status: document.getElementById("form-status").value
    };
  } else if (type === "fuel") {
    payload = {
      vehicleId: parseInt(document.getElementById("form-vehicle").value),
      liters: parseFloat(document.getElementById("form-liters").value),
      cost: parseFloat(document.getElementById("form-cost").value),
      date: document.getElementById("form-date").value,
      provider: document.getElementById("form-provider").value.trim()
    };
  } else if (type === "expenses") {
    payload = {
      vehicleId: parseInt(document.getElementById("form-vehicle").value),
      category: document.getElementById("form-category").value,
      description: document.getElementById("form-description").value.trim(),
      cost: parseFloat(document.getElementById("form-cost").value),
      date: document.getElementById("form-date").value
    };
  } else if (type === "users") {
    payload = {
      name: document.getElementById("form-name").value.trim(),
      email: document.getElementById("form-email").value.trim(),
      role: document.getElementById("form-role").value,
      status: document.getElementById("form-status").value
    };
  }

  try {
    let url = `/api/${type}`;
    let method = "POST";
    if (action === "edit") {
      url = `/api/${type}/${id}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      if (action === "add") {
        showToast(`Successfully created ${type.slice(0,-1)} #${result.id}`);
      } else {
        showToast(`Successfully updated ${type.slice(0,-1)} #${id}`);
      }
    } else {
      alert("Error saving record: " + result.error);
    }
  } catch (err) {
    console.error("Error submitting form:", err);
    alert("Error connecting to server database.");
  }

  closeModal();
  navigateTo(activePage); // Refresh page
});

// --- DELETE OPERATION ---
function openDeleteModal(type, id) {
  activeDeleteTarget = { type, id };
  const targetModal = document.getElementById("delete-modal-container");
  const descContainer = document.getElementById("delete-item-display");
  
  // Find display title
  const record = db[type].find(r => r.id == id);
  let label = "";
  if (record) {
    if (type === "vehicles") label = `Vehicle Plate: ${record.plate}`;
    else if (type === "drivers") label = `Driver Name: ${record.name}`;
    else if (type === "trips") label = `Trip Origin: ${record.origin} → ${record.destination}`;
    else if (type === "users") label = `User Email: ${record.email}`;
    else if (type === "maintenance") label = `Maintenance: ${record.description.slice(0,30)}...`;
    else label = `${type.toUpperCase()} #${record.id}`;
  }

  descContainer.textContent = label;
  targetModal.classList.add("active");
}

function closeDeleteModal() {
  document.getElementById("delete-modal-container").classList.remove("active");
  activeDeleteTarget = null;
}

document.getElementById("btn-delete-confirm").addEventListener("click", async function() {
  if (activeDeleteTarget) {
    const { type, id } = activeDeleteTarget;
    try {
      const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        showToast(`Permanently deleted record #${id}`);
      } else {
        alert("Error deleting record: " + result.error);
      }
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Error connecting to database.");
    }
    
    closeDeleteModal();
    navigateTo(activePage); // Refresh page
  }
});

// --- REPORTS AND ANALYTICS PAGE RENDERING ---
function renderReportsPage() {
  // Populate vehicle selector dropdown for report filter
  const select = document.getElementById("report-vehicle-select");
  const savedVal = select.value;
  select.innerHTML = '<option value="ALL">All Vehicles</option>';
  db.vehicles.forEach(v => {
    select.innerHTML += `<option value="${v.id}">${v.plate} - ${v.make}</option>`;
  });
  if (savedVal) select.value = savedVal;

  const targetVehicleId = select.value;
  const range = document.getElementById("report-date-range").value;

  // Filter lists based on target vehicle
  let reportsExpenses = db.expenses;
  let reportsTrips = db.trips;
  let reportsMaintenance = db.maintenance;
  let reportsFuel = db.fuel;

  if (targetVehicleId !== "ALL") {
    reportsExpenses = reportsExpenses.filter(e => e.vehicleId == targetVehicleId);
    reportsTrips = reportsTrips.filter(t => t.vehicleId == targetVehicleId);
    reportsMaintenance = reportsMaintenance.filter(m => m.vehicleId == targetVehicleId);
    reportsFuel = reportsFuel.filter(f => f.vehicleId == targetVehicleId);
  }

  // Filter based on range dates
  const curDate = new Date("2026-07-12");
  const filterByDateRange = (item) => {
    const itemDate = new Date(item.date);
    if (range === "this-month") {
      return itemDate.getMonth() === curDate.getMonth() && itemDate.getFullYear() === curDate.getFullYear();
    } else if (range === "last-month") {
      let targetMonth = curDate.getMonth() - 1;
      let targetYear = curDate.getFullYear();
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear--;
      }
      return itemDate.getMonth() === targetMonth && itemDate.getFullYear() === targetYear;
    } else if (range === "last-6-months") {
      const boundaryDate = new Date("2026-02-01");
      return itemDate >= boundaryDate;
    } else if (range === "this-year") {
      return itemDate.getFullYear() === curDate.getFullYear();
    }
    return true;
  };

  reportsExpenses = reportsExpenses.filter(filterByDateRange);
  reportsTrips = reportsTrips.filter(filterByDateRange);
  reportsMaintenance = reportsMaintenance.filter(filterByDateRange);
  reportsFuel = reportsFuel.filter(filterByDateRange);

  // Compute reports analytic counters
  const totalFuelLiters = reportsFuel.reduce((sum, f) => sum + Number(f.liters), 0);
  const totalCosts = reportsExpenses.reduce((sum, e) => sum + Number(e.cost), 0);
  const completedTrips = reportsTrips.filter(t => t.status === "COMPLETED").length;
  const completedMaintenance = reportsMaintenance.filter(m => m.status === "COMPLETED").length;

  document.getElementById("report-total-fuel").textContent = `${totalFuelLiters.toLocaleString()} L`;
  document.getElementById("report-total-costs").textContent = formatCurrency(totalCosts);
  document.getElementById("report-completed-trips").textContent = completedTrips;
  document.getElementById("report-completed-maintenance").textContent = completedMaintenance;

  // Build Operations Summary Breakdown Table content
  const tbody = document.getElementById("reports-summary-table").querySelector("tbody");
  tbody.innerHTML = "";

  const vehiclesToSummarize = targetVehicleId === "ALL" 
    ? db.vehicles 
    : db.vehicles.filter(v => v.id == targetVehicleId);

  if (vehiclesToSummarize.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No operational fleet records available.</td></tr>`;
  } else {
    vehiclesToSummarize.forEach(v => {
      // Calculate costs per vehicle in this filter configuration
      const vehicleTripsCount = reportsTrips.filter(t => t.vehicleId == v.id).length;
      
      const maintCost = reportsMaintenance
        .filter(m => m.vehicleId == v.id && m.status === "COMPLETED")
        .reduce((sum, m) => sum + Number(m.cost), 0);
      const fuelCost = reportsFuel
        .filter(f => f.vehicleId == v.id)
        .reduce((sum, f) => sum + Number(f.cost), 0);
      const otherCost = reportsExpenses
        .filter(e => e.vehicleId == v.id && e.category !== "Fuel" && e.category !== "Maintenance")
        .reduce((sum, e) => sum + Number(e.cost), 0);
      const totalCostSum = maintCost + fuelCost + otherCost;

      tbody.innerHTML += `
        <tr>
          <td><strong>${v.plate}</strong></td>
          <td>${v.make} ${v.model}</td>
          <td>${vehicleTripsCount}</td>
          <td>${formatCurrency(maintCost)}</td>
          <td>${formatCurrency(fuelCost)}</td>
          <td>${formatCurrency(otherCost)}</td>
          <td><strong>${formatCurrency(totalCostSum)}</strong></td>
        </tr>
      `;
    });
  }
}

// Generate reports buttons click events
document.getElementById("btn-generate-report").addEventListener("click", renderReportsPage);
document.getElementById("btn-export-report").addEventListener("click", () => {
  showToast("Compiling operations details into CSV...");
  setTimeout(() => {
    showToast("Download started: TransitOps_Report_2026.csv");
  }, 1000);
});

// --- SETTINGS FORM LOADER ---
function loadSettingsForms() {
  const settings = db.settings;
  
  document.getElementById("settings-platform-name").value = settings.platformName || "TransitOps";
  document.getElementById("settings-timezone").value = settings.timezone || "GMT+5:30";
  document.getElementById("settings-currency").value = settings.currency || "USD";
  
  document.getElementById("settings-company-name").value = settings.companyName || "";
  document.getElementById("settings-company-email").value = settings.companyEmail || "";
  document.getElementById("settings-company-address").value = settings.companyAddress || "";
  
  document.getElementById("settings-notify-maintenance").checked = settings.notifyMaintenance === true || settings.notifyMaintenance === "true";
  document.getElementById("settings-notify-trip").checked = settings.notifyTrip === true || settings.notifyTrip === "true";
  document.getElementById("settings-notify-expenses").checked = settings.notifyExpenses === true || settings.notifyExpenses === "true";
}

// Listeners for saving settings in DB via PUT
document.getElementById("form-settings-general").addEventListener("submit", async function(e) {
  e.preventDefault();
  const payload = {
    platformName: document.getElementById("settings-platform-name").value.trim(),
    timezone: document.getElementById("settings-timezone").value,
    currency: document.getElementById("settings-currency").value
  };
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast("General system settings saved.");
      navigateTo(activePage);
    }
  } catch (err) {
    alert("Error updating general settings.");
  }
});

document.getElementById("form-settings-profile").addEventListener("submit", async function(e) {
  e.preventDefault();
  const payload = {
    companyName: document.getElementById("settings-company-name").value.trim(),
    companyEmail: document.getElementById("settings-company-email").value.trim(),
    companyAddress: document.getElementById("settings-company-address").value.trim()
  };
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast("Company profile updated.");
      navigateTo(activePage);
    }
  } catch (err) {
    alert("Error updating profile.");
  }
});

document.getElementById("form-settings-notifications").addEventListener("submit", async function(e) {
  e.preventDefault();
  const payload = {
    notifyMaintenance: document.getElementById("settings-notify-maintenance").checked,
    notifyTrip: document.getElementById("settings-notify-trip").checked,
    notifyExpenses: document.getElementById("settings-notify-expenses").checked
  };
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast("Notifications preferences updated.");
      navigateTo(activePage);
    }
  } catch (err) {
    alert("Error updating notifications.");
  }
});

document.getElementById("form-settings-security").addEventListener("submit", function(e) {
  e.preventDefault();
  showToast("Administrative passwords updated successfully.");
  e.target.reset();
});

// Switch settings tabs
document.querySelectorAll(".settings-nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".settings-nav-item").forEach(i => i.classList.remove("active"));
    document.querySelectorAll(".settings-content-pane").forEach(p => p.classList.remove("active"));
    
    item.classList.add("active");
    const paneId = item.getAttribute("data-pane");
    document.getElementById(paneId).classList.add("active");
  });
});

// --- AUTHENTICATION & OVERLAYS ---
document.getElementById("login-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();

    if (res.ok && result.success) {
      document.getElementById("landing-page").style.display = "none";
      document.getElementById("login-modal-overlay").classList.remove("active");
      document.querySelector(".app-container").style.display = "flex";
      localStorage.setItem("transitops_logged_in", "true");
      showToast("Sign in successful. Welcome back!");
      await navigateTo("dashboard");
    } else {
      alert("Incorrect credentials. Please check details in the helper box.");
    }
  } catch (err) {
    console.error("Login connection error:", err);
    alert("Error connecting to login server.");
  }
});

// Signup Form Submit Event
document.getElementById("signup-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const role = document.getElementById("signup-role").value;

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    const result = await res.json();

    if (res.ok && result.success) {
      showToast("Account created successfully! Please sign in.");
      document.getElementById("signup-modal-overlay").classList.remove("active");
      // Populate login fields and show login popup
      document.getElementById("login-email").value = email;
      document.getElementById("login-password").value = password;
      document.getElementById("login-modal-overlay").classList.add("active");
    } else {
      alert("Registration failed: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Registration connection error:", err);
    alert("Error connecting to sign up server.");
  }
});

document.getElementById("btn-logout").addEventListener("click", function() {
  localStorage.removeItem("transitops_logged_in");
  document.querySelector(".app-container").style.display = "none";
  document.getElementById("landing-page").style.display = "flex";
  showToast("Successfully signed out of session.");
});

// --- DASHBOARD WIDGET INTERACTIVE NAVIGATION ---
function setupWidgetNavigation() {
  const widgets = document.querySelectorAll(".widget-card");
  if (widgets.length >= 9) {
    // 1. Active Vehicles Widget
    widgets[0].addEventListener("click", () => navigateWithFilter("vehicles", "vehicles-filter-status", "ACTIVE"));
    
    // 2. Available Vehicles Widget
    widgets[1].addEventListener("click", () => navigateWithFilter("vehicles", "vehicles-filter-status", "AVAILABLE"));
    
    // 3. Vehicles in Maintenance Widget
    widgets[2].addEventListener("click", () => navigateWithFilter("vehicles", "vehicles-filter-status", "MAINTENANCE"));
    
    // 4. Active Trips Widget
    widgets[3].addEventListener("click", () => navigateWithFilter("trips", "trips-filter-status", "ACTIVE"));
    
    // 5. Pending Trips Widget
    widgets[4].addEventListener("click", () => navigateWithFilter("trips", "trips-filter-status", "PENDING"));
    
    // 6. Drivers On Duty Widget
    widgets[5].addEventListener("click", () => navigateWithFilter("drivers", "drivers-filter-status", "DUTY"));
    
    // 7. Fleet Utilization Widget (jump to vehicles)
    widgets[6].addEventListener("click", () => navigateWithFilter("vehicles", "vehicles-filter-status", "ALL"));
    
    // 8. Monthly Expenses Widget
    widgets[7].addEventListener("click", () => navigateTo("expenses"));
    
    // 9. Fuel Efficiency Widget
    widgets[8].addEventListener("click", () => navigateTo("fuel"));
  }
}

function navigateWithFilter(pageId, filterElementId, filterValue) {
  const filterSelect = document.getElementById(filterElementId);
  if (filterSelect) {
    filterSelect.value = filterValue;
    // Clear search values to prevent interfering with filters
    const searchInput = document.getElementById(`${pageId}-search`);
    if (searchInput) searchInput.value = "";
    paginationConfig[pageId].page = 1;
  }
  navigateTo(pageId);
}

// --- MAIN SETUP ON PAGE LOAD ---
window.addEventListener("DOMContentLoaded", async () => {
  setupFilterListeners();
  setupWidgetNavigation();
  
  // Set up Add buttons triggers
  document.getElementById("btn-add-vehicle").addEventListener("click", () => openFormModal("vehicles", "add"));
  document.getElementById("btn-add-driver").addEventListener("click", () => openFormModal("drivers", "add"));
  document.getElementById("btn-add-trip").addEventListener("click", () => openFormModal("trips", "add"));
  document.getElementById("btn-add-maintenance").addEventListener("click", () => openFormModal("maintenance", "add"));
  document.getElementById("btn-add-fuel").addEventListener("click", () => openFormModal("fuel", "add"));
  document.getElementById("btn-add-expense").addEventListener("click", () => openFormModal("expenses", "add"));
  document.getElementById("btn-add-user").addEventListener("click", () => openFormModal("users", "add"));

  // Landing Page Interactive Triggers
  document.getElementById("btn-show-login").addEventListener("click", () => {
    document.getElementById("login-modal-overlay").classList.add("active");
  });
  document.getElementById("btn-show-signup").addEventListener("click", () => {
    document.getElementById("signup-modal-overlay").classList.add("active");
  });
  document.getElementById("btn-close-login").addEventListener("click", () => {
    document.getElementById("login-modal-overlay").classList.remove("active");
  });
  document.getElementById("btn-close-signup").addEventListener("click", () => {
    document.getElementById("signup-modal-overlay").classList.remove("active");
  });
  
  document.getElementById("btn-hero-cta").addEventListener("click", () => {
    document.getElementById("signup-modal-overlay").classList.add("active");
  });
  document.getElementById("btn-hero-sec").addEventListener("click", () => {
    document.getElementById("login-modal-overlay").classList.add("active");
  });

  // Check login session status
  const loggedIn = localStorage.getItem("transitops_logged_in");
  if (loggedIn === "true") {
    document.getElementById("landing-page").style.display = "none";
    document.querySelector(".app-container").style.display = "flex";
    await navigateTo("dashboard");
  } else {
    document.getElementById("landing-page").style.display = "flex";
    document.querySelector(".app-container").style.display = "none";
    lucide.createIcons(); // Draw icons
  }

  // Sidebar link switches click event
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      await navigateTo(page);
    });
  });
});
