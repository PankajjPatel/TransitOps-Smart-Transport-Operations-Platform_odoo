// --- LOGIN REDIRECTION CHECK ---
if (!window.location.pathname.includes("login.html") && localStorage.getItem("transitops_logged_in") !== "true") {
  window.location.href = "../login/login.html";
}

// --- DATABASE STATE ---
let db = {
  vehicles: [], drivers: [], trips: [],
  maintenance: [], fuel: [], expenses: [],
  users: [], settings: {}, notifications: []
};

async function loadDatabase() {
  try {
    const [vehicles, drivers, trips, maintenance, fuel, expenses, users, settings, notifications] = await Promise.all([
      fetch("/api/vehicles").then(r => r.json()),
      fetch("/api/drivers").then(r => r.json()),
      fetch("/api/trips").then(r => r.json()),
      fetch("/api/maintenance").then(r => r.json()),
      fetch("/api/fuel").then(r => r.json()),
      fetch("/api/expenses").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
      fetch("/api/settings").then(r => r.json()),
      fetch("/api/notifications").then(r => r.json())
    ]);
    db.vehicles = vehicles; db.drivers = drivers; db.trips = trips;
    db.maintenance = maintenance; db.fuel = fuel; db.expenses = expenses;
    db.users = users; db.settings = settings; db.notifications = notifications;
    
    document.querySelectorAll(".sidebar-brand").forEach(b => {
      b.textContent = db.settings.platformName || "TransitOps";
    });
    
    // Auto-update notifications counter badge in header
    updateNotificationBadge();
  } catch (err) { console.error("Error loading database:", err); }
}

// --- STATE ---
let activePage = "dashboard";
let paginationConfig = {
  vehicles: { page: 1, limit: 5 }, drivers: { page: 1, limit: 5 },
  trips: { page: 1, limit: 5 }, maintenance: { page: 1, limit: 5 },
  fuel: { page: 1, limit: 5 }, expenses: { page: 1, limit: 5 },
  users: { page: 1, limit: 5 }, notifications: { page: 1, limit: 10 }
};
let tableSorting = {
  vehicles: { column: 'id', desc: false }, drivers: { column: 'id', desc: false },
  trips: { column: 'id', desc: false }, maintenance: { column: 'id', desc: false },
  fuel: { column: 'id', desc: false }, expenses: { column: 'id', desc: false },
  users: { column: 'id', desc: false }, notifications: { column: 'id', desc: true }
};
let activeDeleteTarget = null;
let currentModalType = null;
let currentModalAction = null;
let currentModalId = null;

// --- TOAST ---
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i data-lucide="check-circle" style="width:16px;height:16px;"></i> <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- CURRENCY FORMAT ---
function formatCurrency(val) {
  const code = db.settings ? db.settings.currency : "INR";
  if (code === "INR") {
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const symbol = code === "EUR" ? "€" : "$";
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// --- DATE FORMAT ---
function formatDate(dateStr) {
  if (!dateStr) return "";
  const dtMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (dtMatch) {
    return `${dtMatch[3]}/${dtMatch[2]}/${dtMatch[1]} ${dtMatch[4]}:${dtMatch[5]}:${dtMatch[6]}`;
  }
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dateStr;
}

// --- NOTIFICATION BADGE ---
function updateNotificationBadge() {
  const unreadCount = db.notifications.filter(n => !n.read).length;
  const notifBtn = document.getElementById("btn-notifications");
  if (notifBtn) {
    let badge = notifBtn.querySelector(".badge-count");
    if (unreadCount > 0) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "badge-count";
        badge.style = "position:absolute;top:0;right:0;background:var(--accent);color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:700;";
        notifBtn.appendChild(badge);
      }
      badge.textContent = unreadCount;
    } else if (badge) {
      badge.remove();
    }
  }
}

// --- RBAC ACCESS CONTROL ---
function enforceRBAC() {
  const role = localStorage.getItem("transitops_user_role") || "Dispatcher";
  const name = localStorage.getItem("transitops_user_name") || "Admin User";
  
  // Set User Profile Headers
  const userNameEl = document.getElementById("header-user-name");
  const userRoleEl = document.getElementById("header-user-role");
  const initialsEl = document.getElementById("user-avatar-initials");
  
  if (userNameEl) userNameEl.textContent = name;
  if (userRoleEl) userRoleEl.textContent = role.replace("_", " ");
  if (initialsEl) {
    const parts = name.split(" ");
    initialsEl.textContent = parts.map(p => p[0]).join("").substring(0, 2).toUpperCase();
  }

  // Define sidebar menu page restrictions matching the custom role scopes:
  // - Fleet Manager -> Fleet (vehicles), Maintenance
  // - Dispatcher -> Dashboard, Trips
  // - Safety Officer -> Drivers, Compliance (notifications)
  // - Financial Analyst -> Fuel & Expenses, Analytics (reports)
  const restrictedPages = [];
  if (role === "Dispatcher") {
    restrictedPages.push("vehicles", "drivers", "maintenance", "fuel", "expenses", "reports");
  } else if (role === "Fleet Manager") {
    restrictedPages.push("dashboard", "drivers", "trips", "fuel", "expenses", "reports");
  } else if (role === "Safety Officer") {
    restrictedPages.push("dashboard", "vehicles", "trips", "maintenance", "fuel", "expenses", "reports");
  } else if (role === "Financial Analyst") {
    restrictedPages.push("dashboard", "vehicles", "drivers", "trips", "maintenance");
  }

  // Path protection: Redirect user if they try to access a restricted page directly
  const currentPage = window.location.pathname.split("/").pop().replace(".html", "");
  if (restrictedPages.includes(currentPage)) {
    let redirectPage = "dashboard";
    if (role === "Fleet Manager") redirectPage = "vehicles";
    else if (role === "Safety Officer") redirectPage = "drivers";
    else if (role === "Financial Analyst") redirectPage = "fuel";
    
    window.location.href = `../${redirectPage}/${redirectPage}.html`;
    return;
  }

  document.querySelectorAll(".sidebar-link").forEach(link => {
    const page = link.getAttribute("data-page");
    if (restrictedPages.includes(page)) {
      link.parentElement.style.display = "none";
    } else {
      link.parentElement.style.display = "block";
    }
  });

  // Action buttons restrictions (e.g. Add Vehicle, Add Driver)
  if (role === "Safety Officer") {
    const addBtns = ["btn-add-vehicle", "btn-add-trip", "btn-add-maintenance", "btn-add-fuel", "btn-add-expense"];
    addBtns.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = "none";
    });
  } else if (role === "Financial Analyst") {
    const addBtns = ["btn-add-vehicle", "btn-add-driver", "btn-add-trip", "btn-add-maintenance"];
    addBtns.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = "none";
    });
  }
}

// --- PAGE NAVIGATION ---
async function navigateTo(pageId) {
  activePage = pageId;
  document.querySelectorAll(".page-container").forEach(el => el.classList.remove("active"));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add("active");

  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.getAttribute("data-page") === pageId ? link.classList.add("active") : link.classList.remove("active");
  });

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
    notifications: { title: "System Alerts & Notifications", icon: "bell" },
    profile: { title: "User Profile Settings", icon: "user" },
    settings: { title: "System Configurations", icon: "settings" }
  };
  const details = pageDetails[pageId] || { title: "TransitOps", icon: "navigation" };
  if (headerTitle) headerTitle.textContent = details.title;
  if (headerIcon) {
    headerIcon.setAttribute("data-lucide", details.icon);
  }
  lucide.createIcons();
  await loadDatabase();
  enforceRBAC();
  triggerPageLoad(pageId);
}

function triggerPageLoad(pageId) {
  if (pageId === "dashboard") renderDashboard();
  else if (pageId === "reports") renderReportsPage();
  else if (pageId === "settings") loadSettingsForms();
  else if (pageId === "notifications") renderNotificationsPage();
  else if (pageId === "profile") loadProfileDetails();
  else renderTablePage(pageId);
}

// --- TABLE ENGINE ---
function getSortedAndFilteredData(pageId) {
  let list = [];
  const searchInput = document.getElementById(`${pageId}-search`);
  const filterSelect = document.getElementById(`${pageId}-filter-status`) || document.getElementById(`${pageId}-filter-category`) || document.getElementById(`${pageId}-filter-role`);
  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const filterVal = filterSelect ? filterSelect.value : "ALL";

  if (pageId === "vehicles") {
    list = db.vehicles.filter(v => {
      const ms = v.plate.toLowerCase().includes(searchVal) || v.name.toLowerCase().includes(searchVal) || v.make.toLowerCase().includes(searchVal) || v.model.toLowerCase().includes(searchVal) || v.type.toLowerCase().includes(searchVal) || v.depot.toLowerCase().includes(searchVal);
      return ms && (filterVal === "ALL" || v.status === filterVal);
    });
  } else if (pageId === "drivers") {
    list = db.drivers.filter(d => {
      const ms = d.name.toLowerCase().includes(searchVal) || d.license.toLowerCase().includes(searchVal) || d.phone.toLowerCase().includes(searchVal) || d.email.toLowerCase().includes(searchVal);
      return ms && (filterVal === "ALL" || d.status === filterVal);
    });
  } else if (pageId === "trips") {
    list = db.trips.map(t => {
      const v = db.vehicles.find(vh => vh.id == t.vehicleId) || { plate: "Unknown" };
      const d = db.drivers.find(dr => dr.id == t.driverId) || { name: "Unknown" };
      return { ...t, vehiclePlate: v.plate, driverName: d.name };
    }).filter(t => {
      const ms = t.origin.toLowerCase().includes(searchVal) || t.destination.toLowerCase().includes(searchVal) || t.vehiclePlate.toLowerCase().includes(searchVal) || t.driverName.toLowerCase().includes(searchVal);
      return ms && (filterVal === "ALL" || t.status === filterVal);
    });
  } else if (pageId === "maintenance") {
    list = db.maintenance.map(m => {
      const v = db.vehicles.find(vh => vh.id == m.vehicleId) || { plate: "Unknown" };
      return { ...m, vehiclePlate: v.plate };
    }).filter(m => {
      const ms = m.description.toLowerCase().includes(searchVal) || m.vehiclePlate.toLowerCase().includes(searchVal) || m.type.toLowerCase().includes(searchVal) || m.technician.toLowerCase().includes(searchVal);
      return ms && (filterVal === "ALL" || m.status === filterVal);
    });
  } else if (pageId === "fuel") {
    list = db.fuel.map(f => {
      const v = db.vehicles.find(vh => vh.id == f.vehicleId) || { plate: "Unknown" };
      return { ...f, vehiclePlate: v.plate };
    }).filter(f => f.vehiclePlate.toLowerCase().includes(searchVal) || f.provider.toLowerCase().includes(searchVal) || f.fuel_type.toLowerCase().includes(searchVal));
  } else if (pageId === "expenses") {
    list = db.expenses.map(e => {
      const v = db.vehicles.find(vh => vh.id == e.vehicleId) || { plate: "Unknown" };
      return { ...e, vehiclePlate: v.plate };
    }).filter(e => {
      const ms = e.description.toLowerCase().includes(searchVal) || e.vehiclePlate.toLowerCase().includes(searchVal) || e.category.toLowerCase().includes(searchVal);
      return ms && (filterVal === "ALL" || e.category === filterVal);
    });
  } else if (pageId === "users") {
    list = db.users.filter(u => {
      const ms = u.name.toLowerCase().includes(searchVal) || u.email.toLowerCase().includes(searchVal);
      return ms && (filterVal === "ALL" || u.role === filterVal);
    });
  }
  const sort = tableSorting[pageId];
  if (sort && sort.column) {
    list.sort((a, b) => {
      let valA = a[sort.column], valB = b[sort.column];
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
  if (sort.column === column) sort.desc = !sort.desc;
  else { sort.column = column; sort.desc = false; }
  renderTablePage(pageId);
}

function renderTablePage(pageId) {
  const table = document.getElementById(`${pageId}-table`);
  if (!table) return;
  const dataList = getSortedAndFilteredData(pageId);
  const config = paginationConfig[pageId];
  const totalRecords = dataList.length;
  const totalPages = Math.max(Math.ceil(totalRecords / config.limit), 1);
  if (config.page > totalPages) config.page = totalPages;
  const startIndex = (config.page - 1) * config.limit;
  const endIndex = Math.min(startIndex + config.limit, totalRecords);
  const pagedList = dataList.slice(startIndex, endIndex);

  const thead = table.querySelector("thead");
  const headers = getTableHeaders(pageId);
  let theadHTML = "<tr>";
  headers.forEach(h => {
    if (h.key) {
      const sort = tableSorting[pageId];
      const isSorted = sort.column === h.key;
      const arrow = isSorted ? (sort.desc ? "↓" : "↑") : "↕";
      theadHTML += `<th class="sortable" onclick="handleSort('${pageId}', '${h.key}')"><div class="th-content"><span>${h.label}</span><span style="font-size:10px; opacity:${isSorted ? 1 : 0.4};">${arrow}</span></div></th>`;
    } else theadHTML += `<th>${h.label}</th>`;
  });
  theadHTML += `<th style="text-align:right;">Actions</th></tr>`;
  thead.innerHTML = theadHTML;

  const tbody = table.querySelector("tbody");
  if (pagedList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${headers.length + 1}" style="text-align:center;padding:30px;color:var(--text-muted);">No records found.</td></tr>`;
  } else {
    let tbodyHTML = "";
    pagedList.forEach(row => {
      tbodyHTML += `<tr style="cursor: pointer;" onclick="handleRowSelect('${pageId}', ${row.id}, this)">`;
      headers.forEach(h => tbodyHTML += `<td>${formatTableCellValue(pageId, row, h)}</td>`);
      
      // Hide edit/delete actions for safety officer / financial analyst if page matches
      const userRole = localStorage.getItem("transitops_user_role") || "Dispatcher";
      let hideActions = false;
      if (userRole === "Safety Officer") {
        if (pageId !== "drivers") {
          hideActions = true;
        }
      } else if (userRole === "Financial Analyst") {
        if (["vehicles", "drivers", "trips", "maintenance", "users"].includes(pageId)) {
          hideActions = true;
        }
      }
      
      tbodyHTML += `<td><div class="table-actions">
        <button class="btn btn-secondary btn-sm" onclick="openDetailsModal('${pageId}', ${row.id})" title="View"><i data-lucide="eye" style="width:12px;height:12px;"></i> View</button>
        ${hideActions ? '' : `<button class="btn btn-secondary btn-sm" onclick="openFormModal('${pageId}', 'edit', ${row.id})" title="Edit"><i data-lucide="edit" style="width:12px;height:12px;"></i> Edit</button>
        <button class="btn btn-danger-outline btn-sm" onclick="openDeleteModal('${pageId}', ${row.id})" title="Delete"><i data-lucide="trash" style="width:12px;height:12px;"></i> Delete</button>`}
      </div></td></tr>`;
    });
    tbody.innerHTML = tbodyHTML;
  }
  renderPaginationControls(pageId, config.page, totalPages, startIndex + 1, endIndex, totalRecords);
  lucide.createIcons();
}

function getTableHeaders(pageId) {
  switch (pageId) {
    case "vehicles": return [{ label: "ID", key: "id" }, { label: "Plate Number", key: "plate" }, { label: "Vehicle Name", key: "name" }, { label: "Manufacturer", key: "make" }, { label: "Model", key: "model" }, { label: "Type", key: "type" }, { label: "Odometer (km)", key: "odometer" }, { label: "Status", key: "status" }];
    case "drivers": return [{ label: "Driver", key: "name" }, { label: "Licence No.", key: "license" }, { label: "Category", key: "license_category" }, { label: "Expiry", key: "license_expiry" }, { label: "Contact", key: "phone" }, { label: "Trip Compl.", key: "safety_score" }, { label: "Safety", key: "safety_status" }, { label: "Status", key: "status" }];
    case "trips": return [{ label: "ID", key: "id" }, { label: "Vehicle Plate", key: "vehiclePlate" }, { label: "Driver", key: "driverName" }, { label: "Origin", key: "origin" }, { label: "Destination", key: "destination" }, { label: "Cost", key: "cost" }, { label: "Status", key: "status" }];
    case "maintenance": return [{ label: "ID", key: "id" }, { label: "Vehicle Plate", key: "vehiclePlate" }, { label: "Type", key: "type" }, { label: "Description", key: "description" }, { label: "Cost", key: "cost" }, { label: "Start Date", key: "start_date" }, { label: "Status", key: "status" }];
    case "fuel": return [{ label: "ID", key: "id" }, { label: "Vehicle Plate", key: "vehiclePlate" }, { label: "Quantity (L)", key: "liters" }, { label: "Total Cost", key: "cost" }, { label: "Fuel Type", key: "fuel_type" }, { label: "Date", key: "date" }];
    case "expenses": return [{ label: "ID", key: "id" }, { label: "Vehicle", key: "vehiclePlate" }, { key: "category", label: "Category" }, { label: "Description", key: "description" }, { label: "Amount", key: "cost" }, { label: "Date", key: "date" }, { label: "Status", key: "status" }];
    case "users": return [{ label: "ID", key: "id" }, { label: "User Name", key: "name" }, { label: "Email", key: "email" }, { label: "Role", key: "role" }, { label: "Status", key: "status" }];
    default: return [];
  }
}

function formatTableCellValue(pageId, row, header) {
  const value = row[header.key];
  if (pageId === "drivers") {
    if (header.key === "license_expiry") {
      if (!value) return "N/A";
      const parts = value.split("-"); // YYYY-MM-DD
      const formatted = parts.length === 3 ? `${parts[1]}/${parts[0]}` : value;
      const today = new Date("2026-07-12");
      const exp = new Date(value);
      if (exp < today) {
        return `<span style="color:#ef4444;font-weight:700;">${formatted} EXPIRED</span>`;
      }
      return formatted;
    }
    if (header.key === "safety_score") {
      return `${value}%`;
    }
    if (header.key === "safety_status") {
      const status = row.status;
      if (status === "SUSPENDED") return `<span class="status-pill status-suspended" style="background-color:#f97316;color:white;border:none;">Suspended</span>`;
      if (status === "ON_TRIP") return `<span class="status-pill status-ontrip" style="background-color:#3b82f6;color:white;border:none;">On Trip</span>`;
      return `<span class="status-pill status-available" style="background-color:#22c55e;color:white;border:none;">Available</span>`;
    }
    if (header.key === "status") {
      const valStr = String(value).toUpperCase();
      if (valStr === "ON_TRIP") return `<span class="status-pill status-ontrip" style="background-color:#3b82f6;color:white;border:none;">On Trip</span>`;
      if (valStr === "OFF_DUTY") return `<span class="status-pill status-offduty" style="background-color:#64748b;color:white;border:none;">Off Duty</span>`;
      if (valStr === "SUSPENDED") return `<span class="status-pill status-suspended" style="background-color:#f97316;color:white;border:none;">Suspended</span>`;
      return `<span class="status-pill status-available" style="background-color:#22c55e;color:white;border:none;">Available</span>`;
    }
  }

  if (header.key === "status") {
    const valStr = String(value).toUpperCase();
    return `<span class="status-pill status-${valStr.toLowerCase()}">${valStr.replace("_", " ")}</span>`;
  }
  if (header.key === "cost" || header.key === "amount") return formatCurrency(value);
  
  const dateKeys = ["date", "start_date", "end_date", "purchase_date", "insurance_expiry", "fitness_expiry", "pollution_expiry", "license_expiry", "joining_date", "dispatch_date", "arrival_date"];
  if (dateKeys.includes(header.key)) {
    return formatDate(value);
  }
  return value;
}

function renderPaginationControls(pageId, curPage, totalPages, start, end, total) {
  const pag = document.getElementById(`${pageId}-pagination`);
  if (!pag) return;
  if (total === 0) { pag.innerHTML = ""; return; }
  pag.innerHTML = `<div class="pagination-info">Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${total}</strong> records</div><div class="pagination-buttons"><button class="btn btn-secondary btn-sm" ${curPage === 1 ? "disabled" : ""} onclick="changePage('${pageId}', ${curPage - 1})"><i data-lucide="chevron-left" style="width:12px;height:12px;"></i> Prev</button><span style="font-size:12px;font-weight:500;">Page ${curPage} of ${totalPages}</span><button class="btn btn-secondary btn-sm" ${curPage === totalPages ? "disabled" : ""} onclick="changePage('${pageId}', ${curPage + 1})">Next <i data-lucide="chevron-right" style="width:12px;height:12px;"></i></button></div>`;
}

function changePage(pageId, newPage) {
  paginationConfig[pageId].page = newPage;
  renderTablePage(pageId);
}

function setupFilterListeners() {
  const tables = ["vehicles", "drivers", "trips", "maintenance", "fuel", "expenses", "users"];
  tables.forEach(t => {
    const search = document.getElementById(`${t}-search`);
    const filter = document.getElementById(`${t}-filter-status`) || document.getElementById(`${t}-filter-category`) || document.getElementById(`${t}-filter-role`);
    if (search) search.addEventListener("input", () => { paginationConfig[t].page = 1; renderTablePage(t); });
    if (filter) filter.addEventListener("change", () => { paginationConfig[t].page = 1; renderTablePage(t); });
  });
}

// --- DETAILS MODAL ---
function openDetailsModal(type, id) {
  const detailsModal = document.getElementById("details-modal-container");
  const detailsTitle = document.getElementById("details-modal-title");
  const detailsBody = document.getElementById("details-modal-body");
  let record = null, labelType = "";
  if (type === "vehicles") { record = db.vehicles.find(v => v.id == id); labelType = "Vehicle Profile"; }
  else if (type === "drivers") { record = db.drivers.find(d => d.id == id); labelType = "Driver Details"; }
  else if (type === "trips") { const t = db.trips.find(tr => tr.id == id); if (t) { const v = db.vehicles.find(vh => vh.id == t.vehicleId) || { plate: "N/A" }; const d = db.drivers.find(dr => dr.id == t.driverId) || { name: "N/A" }; record = { ...t, vehiclePlate: v.plate, driverName: d.name }; } labelType = "Trip Invoice"; }
  else if (type === "maintenance") { const m = db.maintenance.find(mn => mn.id == id); if (m) { const v = db.vehicles.find(vh => vh.id == m.vehicleId) || { plate: "N/A" }; record = { ...m, vehiclePlate: v.plate }; } labelType = "Maintenance Records"; }
  else if (type === "fuel") { const f = db.fuel.find(fl => fl.id == id); if (f) { const v = db.vehicles.find(vh => vh.id == f.vehicleId) || { plate: "N/A" }; const d = db.drivers.find(dr => dr.id == f.driverId) || { name: "N/A" }; record = { ...f, vehiclePlate: v.plate, driverName: d.name }; } labelType = "Fuel Log Summary"; }
  else if (type === "expenses") { const e = db.expenses.find(ex => ex.id == id); if (e) { const v = db.vehicles.find(vh => vh.id == e.vehicleId) || { plate: "N/A" }; record = { ...e, vehiclePlate: v.plate }; } labelType = "Expense Receipt"; }
  else if (type === "users") { record = db.users.find(u => u.id == id); labelType = "User Registry Info"; }
  if (!record) return;
  detailsTitle.textContent = `${labelType} (ID: #${record.id})`;
  let gridHTML = "";
  if (type === "trips") {
    const status = record.status;
    let step1Color = "#10B981", step2Color = "#E2E8F0", step3Color = "#E2E8F0", step4Color = "#E2E8F0";
    let step1TextColor = "#10B981", step2TextColor = "#64748B", step3TextColor = "#64748B", step4TextColor = "#64748B";

    if (status === "DISPATCHED") {
      step2Color = "#3B82F6"; step2TextColor = "#3B82F6";
    } else if (status === "COMPLETED") {
      step2Color = "#3B82F6"; step2TextColor = "#3B82F6";
      step3Color = "#10B981"; step3TextColor = "#10B981";
    } else if (status === "CANCELLED") {
      step4Color = "#EF4444"; step4TextColor = "#EF4444";
    }

    gridHTML += `
      <div class="stepper-wrapper" style="display:flex; justify-content:space-between; margin-bottom:24px; position:relative; padding: 0 10px;">
        <div style="position:absolute; top:12px; left:12.5%; right:12.5%; height:3px; background:#E2E8F0; z-index:1;">
          <div style="position:absolute; top:0; left:0; width:${status === "DISPATCHED" ? "33%" : status === "COMPLETED" ? "100%" : "0%"}; height:100%; background:linear-gradient(90deg, #10B981, #3B82F6); transition:width 0.4s ease;"></div>
        </div>
        <div class="stepper-step" style="z-index:2; text-align:center; flex:1;">
          <div class="stepper-bubble" style="width:26px; height:26px; border-radius:50%; background-color:${step1Color}; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:#FFFFFF; border:2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">1</div>
          <div style="font-size:11px; font-weight:700; color:${step1TextColor};">Draft</div>
        </div>
        <div class="stepper-step" style="z-index:2; text-align:center; flex:1;">
          <div class="stepper-bubble" style="width:26px; height:26px; border-radius:50%; background-color:${step2Color}; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:${status === "DISPATCHED" || status === "COMPLETED" ? "#FFFFFF" : "#475569"}; border:2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">2</div>
          <div style="font-size:11px; font-weight:700; color:${step2TextColor};">Dispatched</div>
        </div>
        <div class="stepper-step" style="z-index:2; text-align:center; flex:1;">
          <div class="stepper-bubble" style="width:26px; height:26px; border-radius:50%; background-color:${step3Color}; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:${status === "COMPLETED" ? "#FFFFFF" : "#475569"}; border:2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">3</div>
          <div style="font-size:11px; font-weight:700; color:${step3TextColor};">Completed</div>
        </div>
        <div class="stepper-step" style="z-index:2; text-align:center; flex:1;">
          <div class="stepper-bubble" style="width:26px; height:26px; border-radius:50%; background-color:${step4Color}; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:${status === "CANCELLED" ? "#FFFFFF" : "#475569"}; border:2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">4</div>
          <div style="font-size:11px; font-weight:700; color:${step4TextColor};">Cancelled</div>
        </div>
      </div>
      <h4 style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">Trip Details</h4>
    `;
  }
  gridHTML += `<div class="detail-grid">`;
  const keyLabels = { 
    id: "Record ID", 
    plate: "Plate / Registration Number", 
    name: "Vehicle / Driver Name",
    make: "Manufacturer (Brand)", 
    model: "Model Name", 
    type: "Vehicle / Maintenance Type", 
    year: "Manufacture Year", 
    max_load: "Maximum Load Capacity (kg)",
    fuel_type: "Fuel Type",
    fuel_capacity: "Fuel Tank Capacity (L)",
    average_mileage: "Average Mileage (km/L)",
    odometer: "Odometer Reading (km)",
    purchase_cost: "Purchase Price / Cost",
    purchase_date: "Purchase Date",
    insurance_expiry: "Insurance Expiry Date",
    fitness_expiry: "Fitness Certificate Expiry",
    pollution_expiry: "Pollution Expiry Date",
    assigned_driver_name: "Assigned Driver",
    assigned_vehicle_plate: "Assigned Vehicle",
    status: "Status / State", 
    depot: "Depot / Garage",
    remarks: "Remarks",
    phone: "Phone Number", 
    email: "Email Address", 
    address: "Address",
    license: "License Code / Number", 
    license_category: "License Category",
    license_expiry: "License Expiry Date",
    joining_date: "Joining Date",
    experience: "Experience (years)",
    safety_score: "Safety Score (0-100)",
    vehiclePlate: "Vehicle Assigned", 
    driverName: "Driver Assigned", 
    origin: "Origin / Source Terminal", 
    destination: "Destination Hub", 
    cargo_weight: "Cargo Weight (kg)",
    planned_distance: "Planned Distance (km)",
    dispatch_date: "Dispatch Date",
    arrival_date: "Arrival Date",
    cost: "Total Cost / Revenue", 
    date: "Date Logged", 
    description: "Detailed Description", 
    liters: "Volume Filled (L)", 
    provider: "Station / Provider Name", 
    category: "Cost Category", 
    role: "System Role",
    technician: "Technician",
    workshop: "Workshop / Garage",
    start_date: "Start Date",
    end_date: "End Date"
  };
  Object.keys(record).forEach(key => {
    if (key === "id" || !keyLabels[key]) return;
    const label = keyLabels[key];
    let val = record[key];
    if (key === "cost" || key === "amount" || key === "purchase_cost") val = formatCurrency(val);
    else if (key === "status") val = `<span class="status-pill status-${String(val).toLowerCase()}">${String(val).replace("_", " ")}</span>`;
    
    const dateKeys = ["date", "start_date", "end_date", "purchase_date", "insurance_expiry", "fitness_expiry", "pollution_expiry", "license_expiry", "joining_date", "dispatch_date", "arrival_date"];
    if (dateKeys.includes(key)) {
      val = formatDate(val);
    }
    gridHTML += `<div class="detail-label">${label}</div><div class="detail-value">${val}</div>`;
  });
  gridHTML += `</div>`;
  detailsBody.innerHTML = gridHTML;
  detailsModal.classList.add("active");
}
function closeDetailsModal() { document.getElementById("details-modal-container").classList.remove("active"); }

// --- FORM MODAL ---
function openFormModal(type, action, id = null) {
  currentModalType = type; currentModalAction = action; currentModalId = id;
  const modal = document.getElementById("modal-container");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const submitBtn = document.getElementById("btn-modal-submit");
  let record = id ? db[type].find(r => r.id == id) : null;
  const labels = { vehicles: "Vehicle", drivers: "Driver Profile", trips: "Trip Route Details", maintenance: "Maintenance Log", fuel: "Fuel Log", expenses: "Expense Log", users: "User Account" };
  modalTitle.textContent = `${action === "add" ? "Create New" : "Edit"} ${labels[type]}`;
  submitBtn.textContent = action === "add" ? "Submit Record" : "Save Changes";
  modalBody.innerHTML = buildFormHTML(type, record);
  modal.classList.add("active");
}
function closeModal() { document.getElementById("modal-container").classList.remove("active"); currentModalType = null; currentModalAction = null; currentModalId = null; }

function buildFormHTML(type, record) {
  const getVal = (key, fallback = "") => (record ? record[key] : fallback);
  
  if (type === "vehicles") {
    const doOpts = `<option value="">Unassigned</option>` + db.drivers.map(d => `<option value="${d.id}" ${getVal("assigned_driver_id") == d.id ? "selected" : ""}>${d.name} (${d.status})</option>`).join("");
    return `
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-plate">Registration Number (Unique)</label><input type="text" id="form-plate" class="form-control" placeholder="e.g. NY-1102-K" required value="${getVal("plate")}"></div>
        <div class="form-group"><label class="form-label" for="form-name">Vehicle Name</label><input type="text" id="form-name" class="form-control" placeholder="e.g. Eagle Trans" required value="${getVal("name")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-make">Manufacturer / Brand</label><input type="text" id="form-make" class="form-control" placeholder="e.g. Freightliner" required value="${getVal("make")}"></div>
        <div class="form-group"><label class="form-label" for="form-model">Model Name</label><input type="text" id="form-model" class="form-control" placeholder="e.g. Cascadia" required value="${getVal("model")}"></div>
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
        <div class="form-group"><label class="form-label" for="form-year">Manufacturing Year</label><input type="number" id="form-year" class="form-control" min="1995" max="2027" required value="${getVal("year", 2023)}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-max_load">Max Load Capacity (kg)</label><input type="number" id="form-max_load" class="form-control" placeholder="15000" required value="${getVal("max_load")}"></div>
        <div class="form-group"><label class="form-label" for="form-fuel_type">Fuel Type</label><select id="form-fuel_type" class="form-control"><option value="Diesel" ${getVal("fuel_type") === "Diesel" ? "selected" : ""}>Diesel</option><option value="Petrol" ${getVal("fuel_type") === "Petrol" ? "selected" : ""}>Petrol</option><option value="CNG" ${getVal("fuel_type") === "CNG" ? "selected" : ""}>CNG</option><option value="Electric" ${getVal("fuel_type") === "Electric" ? "selected" : ""}>Electric</option></select></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-fuel_capacity">Fuel Tank Capacity (L)</label><input type="number" id="form-fuel_capacity" class="form-control" placeholder="300" required value="${getVal("fuel_capacity")}"></div>
        <div class="form-group"><label class="form-label" for="form-average_mileage">Average Mileage (km/L)</label><input type="number" step="0.1" id="form-average_mileage" class="form-control" placeholder="4.5" required value="${getVal("average_mileage")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-odometer">Current Odometer (km)</label><input type="number" id="form-odometer" class="form-control" placeholder="50000" required value="${getVal("odometer")}"></div>
        <div class="form-group"><label class="form-label" for="form-purchase_cost">Purchase Cost (₹)</label><input type="number" id="form-purchase_cost" class="form-control" placeholder="120000" required value="${getVal("purchase_cost")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-purchase_date">Purchase Date</label><input type="date" id="form-purchase_date" class="form-control" value="${getVal("purchase_date")}"></div>
        <div class="form-group"><label class="form-label" for="form-insurance_expiry">Insurance Expiry Date</label><input type="date" id="form-insurance_expiry" class="form-control" value="${getVal("insurance_expiry")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-fitness_expiry">Fitness Certificate Expiry</label><input type="date" id="form-fitness_expiry" class="form-control" value="${getVal("fitness_expiry")}"></div>
        <div class="form-group"><label class="form-label" for="form-pollution_expiry">Pollution Certificate Expiry</label><input type="date" id="form-pollution_expiry" class="form-control" value="${getVal("pollution_expiry")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-assigned_driver">Assigned Driver</label><select id="form-assigned_driver" class="form-control">${doOpts}</select></div>
        <div class="form-group"><label class="form-label" for="form-depot">Depot / Garage</label><input type="text" id="form-depot" class="form-control" placeholder="Main Depot" value="${getVal("depot")}"></div>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-status">Status</label>
        <select id="form-status" class="form-control">
          <option value="AVAILABLE" ${getVal("status") === "AVAILABLE" ? "selected" : ""}>Available</option>
          <option value="ON_TRIP" ${getVal("status") === "ON_TRIP" ? "selected" : ""}>On Trip</option>
          <option value="MAINTENANCE" ${getVal("status") === "MAINTENANCE" ? "selected" : ""}>Maintenance</option>
          <option value="RETIRED" ${getVal("status") === "RETIRED" ? "selected" : ""}>Retired</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label" for="form-image">Vehicle Photo URL / Base64</label><input type="text" id="form-image" class="form-control" placeholder="Base64 URL..." value="${getVal("image")}"></div>
      <div class="form-group"><label class="form-label" for="form-remarks">Remarks</label><textarea id="form-remarks" class="form-control">${getVal("remarks")}</textarea></div>
    `;
  }
  
  if (type === "drivers") {
    const voOpts = `<option value="">Unassigned</option>` + db.vehicles.map(v => `<option value="${v.id}" ${getVal("assigned_vehicle_id") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`).join("");
    return `
      <div class="form-group"><label class="form-label" for="form-name">Driver Full Name</label><input type="text" id="form-name" class="form-control" placeholder="John Doe" required value="${getVal("name")}"></div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-phone">Phone Number</label><input type="text" id="form-phone" class="form-control" placeholder="+1 (555) 012-3456" required value="${getVal("phone")}"></div>
        <div class="form-group"><label class="form-label" for="form-email">Email Address</label><input type="email" id="form-email" class="form-control" placeholder="john@company.com" required value="${getVal("email")}"></div>
      </div>
      <div class="form-group"><label class="form-label" for="form-address">Home Address</label><input type="text" id="form-address" class="form-control" placeholder="123 Road City" value="${getVal("address")}"></div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-license">Licence Number</label><input type="text" id="form-license" class="form-control" placeholder="e.g. MH-CDL-4567" required value="${getVal("license")}"></div>
        <div class="form-group"><label class="form-label" for="form-license_category">Licence Category</label><select id="form-license_category" class="form-control"><option value="LMV" ${getVal("license_category") === "LMV" ? "selected" : ""}>LMV</option><option value="HMV" ${getVal("license_category") === "HMV" ? "selected" : ""}>HMV</option></select></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-license_expiry">Licence Expiry Date</label><input type="date" id="form-license_expiry" class="form-control" required value="${getVal("license_expiry")}"></div>
        <div class="form-group"><label class="form-label" for="form-joining_date">Joining Date</label><input type="date" id="form-joining_date" class="form-control" value="${getVal("joining_date")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-experience">Experience (Years)</label><input type="number" id="form-experience" class="form-control" placeholder="5" value="${getVal("experience")}"></div>
        <div class="form-group"><label class="form-label" for="form-safety_score">Safety Score (0-100)</label><input type="number" id="form-safety_score" class="form-control" min="0" max="100" placeholder="100" value="${getVal("safety_score", 100)}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-assigned_vehicle">Assigned Vehicle</label><select id="form-assigned_vehicle" class="form-control">${voOpts}</select></div>
        <div class="form-group">
          <label class="form-label" for="form-status">Duty Status</label>
          <select id="form-status" class="form-control">
            <option value="AVAILABLE" ${getVal("status") === "AVAILABLE" ? "selected" : ""}>Available</option>
            <option value="ON_TRIP" ${getVal("status") === "ON_TRIP" ? "selected" : ""}>On Trip</option>
            <option value="OFF_DUTY" ${getVal("status") === "OFF_DUTY" ? "selected" : ""}>Off Duty</option>
            <option value="SUSPENDED" ${getVal("status") === "SUSPENDED" ? "selected" : ""}>Suspended</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label" for="form-photo">Driver Photo URL / Base64</label><input type="text" id="form-photo" class="form-control" placeholder="Photo string..." value="${getVal("photo")}"></div>
    `;
  }
  
  if (type === "trips") {
    const status = getVal("status", "DRAFT");
    let step1Color = "#10B981", step2Color = "#E2E8F0", step3Color = "#E2E8F0", step4Color = "#E2E8F0";
    let step1TextColor = "#10B981", step2TextColor = "#64748B", step3TextColor = "#64748B", step4TextColor = "#64748B";

    if (status === "DISPATCHED") {
      step2Color = "#3B82F6"; step2TextColor = "#3B82F6";
    } else if (status === "COMPLETED") {
      step2Color = "#3B82F6"; step2TextColor = "#3B82F6";
      step3Color = "#10B981"; step3TextColor = "#10B981";
    } else if (status === "CANCELLED") {
      step4Color = "#EF4444"; step4TextColor = "#EF4444";
    }

    const stepperHTML = `
      <div class="stepper-wrapper" style="display:flex; justify-content:space-between; margin-bottom:24px; position:relative; padding: 0 10px;">
        <div style="position:absolute; top:12px; left:12.5%; right:12.5%; height:3px; background:#E2E8F0; z-index:1;">
          <div style="position:absolute; top:0; left:0; width:${status === "DISPATCHED" ? "33%" : status === "COMPLETED" ? "100%" : "0%"}; height:100%; background:linear-gradient(90deg, #10B981, #3B82F6); transition:width 0.4s ease;"></div>
        </div>
        <div class="stepper-step" style="z-index:2; text-align:center; flex:1;">
          <div class="stepper-bubble" style="width:26px; height:26px; border-radius:50%; background-color:${step1Color}; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:#FFFFFF; border:2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">1</div>
          <div style="font-size:11px; font-weight:700; color:${step1TextColor};">Draft</div>
        </div>
        <div class="stepper-step" style="z-index:2; text-align:center; flex:1;">
          <div class="stepper-bubble" style="width:26px; height:26px; border-radius:50%; background-color:${step2Color}; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:${status === "DISPATCHED" || status === "COMPLETED" ? "#FFFFFF" : "#475569"}; border:2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">2</div>
          <div style="font-size:11px; font-weight:700; color:${step2TextColor};">Dispatched</div>
        </div>
        <div class="stepper-step" style="z-index:2; text-align:center; flex:1;">
          <div class="stepper-bubble" style="width:26px; height:26px; border-radius:50%; background-color:${step3Color}; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:${status === "COMPLETED" ? "#FFFFFF" : "#475569"}; border:2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">3</div>
          <div style="font-size:11px; font-weight:700; color:${step3TextColor};">Completed</div>
        </div>
        <div class="stepper-step" style="z-index:2; text-align:center; flex:1;">
          <div class="stepper-bubble" style="width:26px; height:26px; border-radius:50%; background-color:${step4Color}; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:${status === "CANCELLED" ? "#FFFFFF" : "#475569"}; border:2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">4</div>
          <div style="font-size:11px; font-weight:700; color:${step4TextColor};">Cancelled</div>
        </div>
      </div>
      <h4 style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">Create / Edit Trip</h4>
    `;

    const vo = db.vehicles.filter(v => v.status !== "RETIRED").map(v => `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make} ${v.model} (${v.status})</option>`).join("");
    const dro = db.drivers.filter(d => d.status !== "SUSPENDED").map(d => `<option value="${d.id}" ${getVal("driverId") == d.id ? "selected" : ""}>${d.name} (${d.status})</option>`).join("");
    return stepperHTML + `
      <div class="form-group"><label class="form-label" for="form-vehicle">Assign Vehicle</label><select id="form-vehicle" class="form-control" required>${vo}</select></div>
      <div class="form-group"><label class="form-label" for="form-driver">Assign Driver</label><select id="form-driver" class="form-control" required>${dro}</select></div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-origin">Origin Terminal / Source</label><input type="text" id="form-origin" class="form-control" placeholder="e.g. Chicago, IL" required value="${getVal("origin")}"></div>
        <div class="form-group"><label class="form-label" for="form-destination">Destination Hub</label><input type="text" id="form-destination" class="form-control" placeholder="e.g. Seattle, WA" required value="${getVal("destination")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-cargo_weight">Cargo Weight (kg)</label><input type="number" id="form-cargo_weight" class="form-control" placeholder="8000" required value="${getVal("cargo_weight")}"></div>
        <div class="form-group"><label class="form-label" for="form-planned_distance">Planned Distance (km)</label><input type="number" id="form-planned_distance" class="form-control" placeholder="320" required value="${getVal("planned_distance")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-dispatch_date">Dispatch Date</label><input type="date" id="form-dispatch_date" class="form-control" value="${getVal("dispatch_date")}"></div>
        <div class="form-group"><label class="form-label" for="form-arrival_date">Arrival Date</label><input type="date" id="form-arrival_date" class="form-control" value="${getVal("arrival_date")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-cost">Revenue / Cost (₹)</label><input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}"></div>
        <div class="form-group"><label class="form-label" for="form-date">Date Created</label><input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}"></div>
      </div>
      <div class="form-group">
        <label class="form-label" for="form-status">Trip Status</label>
        <select id="form-status" class="form-control">
          <option value="DRAFT" ${getVal("status") === "DRAFT" ? "selected" : ""}>Draft</option>
          <option value="DISPATCHED" ${getVal("status") === "DISPATCHED" ? "selected" : ""}>Dispatched</option>
          <option value="COMPLETED" ${getVal("status") === "COMPLETED" ? "selected" : ""}>Completed</option>
          <option value="CANCELLED" ${getVal("status") === "CANCELLED" ? "selected" : ""}>Cancelled</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label" for="form-remarks">Remarks</label><textarea id="form-remarks" class="form-control">${getVal("remarks")}</textarea></div>
    `;
  }
  
  if (type === "maintenance") {
    const vo = db.vehicles.map(v => `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`).join("");
    return `
      <div class="form-group"><label class="form-label" for="form-vehicle">Vehicle</label><select id="form-vehicle" class="form-control" required>${vo}</select></div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-type">Maintenance Type</label><select id="form-type" class="form-control"><option value="Routine" ${getVal("type") === "Routine" ? "selected" : ""}>Routine</option><option value="Breakdown" ${getVal("type") === "Breakdown" ? "selected" : ""}>Breakdown</option><option value="Repair" ${getVal("type") === "Repair" ? "selected" : ""}>Repair</option><option value="Scheduled" ${getVal("type") === "Scheduled" ? "selected" : ""}>Scheduled</option></select></div>
        <div class="form-group"><label class="form-label" for="form-workshop">Workshop Name</label><input type="text" id="form-workshop" class="form-control" placeholder="Internal Workshop" required value="${getVal("workshop")}"></div>
      </div>
      <div class="form-group"><label class="form-label" for="form-technician">Technician Name</label><input type="text" id="form-technician" class="form-control" placeholder="John Mechanic" required value="${getVal("technician")}"></div>
      <div class="form-group"><label class="form-label" for="form-description">Description of Work</label><textarea id="form-description" class="form-control" placeholder="Details of issues..." required>${getVal("description")}</textarea></div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-cost">Cost (₹)</label><input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}"></div>
        <div class="form-group"><label class="form-label" for="form-start_date">Start Date</label><input type="date" id="form-start_date" class="form-control" required value="${getVal("start_date", "2026-07-12")}"></div>
      </div>
      <div class="form-group"><label class="form-label" for="form-end_date">End Date</label><input type="date" id="form-end_date" class="form-control" value="${getVal("end_date")}"></div>
      <div class="form-group">
        <label class="form-label" for="form-status">Status</label>
        <select id="form-status" class="form-control">
          <option value="SCHEDULED" ${getVal("status") === "SCHEDULED" ? "selected" : ""}>Scheduled</option>
          <option value="IN_PROGRESS" ${getVal("status") === "IN_PROGRESS" ? "selected" : ""}>In Progress</option>
          <option value="COMPLETED" ${getVal("status") === "COMPLETED" ? "selected" : ""}>Completed</option>
          <option value="CANCELLED" ${getVal("status") === "CANCELLED" ? "selected" : ""}>Cancelled</option>
        </select>
      </div>
    `;
  }
  
  if (type === "fuel") {
    const vo = db.vehicles.map(v => `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`).join("");
    const dro = db.drivers.map(d => `<option value="${d.id}" ${getVal("driverId") == d.id ? "selected" : ""}>${d.name}</option>`).join("");
    return `
      <div class="form-group"><label class="form-label" for="form-vehicle">Vehicle</label><select id="form-vehicle" class="form-control" required>${vo}</select></div>
      <div class="form-group"><label class="form-label" for="form-driver">Driver Who Filled</label><select id="form-driver" class="form-control">${dro}</select></div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-liters">Liters Filled</label><input type="number" id="form-liters" class="form-control" min="1" step="1" required value="${getVal("liters")}"></div>
        <div class="form-group"><label class="form-label" for="form-cost">Total Fuel Cost (₹)</label><input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-fuel_type">Fuel Type</label><select id="form-fuel_type" class="form-control"><option value="Diesel" ${getVal("fuel_type") === "Diesel" ? "selected" : ""}>Diesel</option><option value="Petrol" ${getVal("fuel_type") === "Petrol" ? "selected" : ""}>Petrol</option><option value="CNG" ${getVal("fuel_type") === "CNG" ? "selected" : ""}>CNG</option></select></div>
        <div class="form-group"><label class="form-label" for="form-odometer">Odometer Reading (km)</label><input type="number" id="form-odometer" class="form-control" placeholder="10500" required value="${getVal("odometer")}"></div>
      </div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-date">Date Filled</label><input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}"></div>
        <div class="form-group"><label class="form-label" for="form-provider">Fuel Station Provider</label><input type="text" id="form-provider" class="form-control" placeholder="e.g. Chevron Station" required value="${getVal("provider")}"></div>
      </div>
    `;
  }
  
  if (type === "expenses") {
    const vo = db.vehicles.map(v => `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`).join("");
    return `
      <div class="form-group"><label class="form-label" for="form-vehicle">Vehicle</label><select id="form-vehicle" class="form-control" required>${vo}</select></div>
      <div class="form-group"><label class="form-label" for="form-category">Expense Category</label><select id="form-category" class="form-control"><option value="Fuel" ${getVal("category") === "Fuel" ? "selected" : ""}>Fuel</option><option value="Maintenance" ${getVal("category") === "Maintenance" ? "selected" : ""}>Maintenance</option><option value="Tolls" ${getVal("category") === "Tolls" ? "selected" : ""}>Toll</option><option value="Insurance" ${getVal("category") === "Insurance" ? "selected" : ""}>Insurance</option><option value="Salary" ${getVal("category") === "Salary" ? "selected" : ""}>Salary</option><option value="Other" ${getVal("category") === "Other" ? "selected" : ""}>Other</option></select></div>
      <div class="form-group"><label class="form-label" for="form-description">Description</label><input type="text" id="form-description" class="form-control" placeholder="Toll tags refill..." required value="${getVal("description")}"></div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-cost">Amount (₹)</label><input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}"></div>
        <div class="form-group"><label class="form-label" for="form-date">Date Charged</label><input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}"></div>
      </div>
      <div class="form-group"><label class="form-label" for="form-status">Status</label><select id="form-status" class="form-control"><option value="PENDING" ${getVal("status") === "PENDING" ? "selected" : ""}>Pending</option><option value="APPROVED" ${getVal("status") === "APPROVED" ? "selected" : ""}>Approved</option><option value="PAID" ${getVal("status") === "PAID" ? "selected" : ""}>Paid</option></select></div>
    `;
  }
  
  if (type === "users") {
    return `
      <div class="form-group"><label class="form-label" for="form-name">User Name</label><input type="text" id="form-name" class="form-control" placeholder="Alice Vance" required value="${getVal("name")}"></div>
      <div class="form-group"><label class="form-label" for="form-email">Email Address</label><input type="email" id="form-email" class="form-control" placeholder="alice@transitops.com" required value="${getVal("email")}"></div>
      <div class="form-group"><label class="form-label" for="form-password">User Password</label><input type="password" id="form-password" class="form-control" placeholder="Enter password" required value="${getVal("password", "user123")}"></div>
      <div class="form-group-row">
        <div class="form-group"><label class="form-label" for="form-role">System Role</label><select id="form-role" class="form-control"><option value="Fleet Manager" ${getVal("role") === "Fleet Manager" ? "selected" : ""}>Fleet Manager</option><option value="Dispatcher" ${getVal("role") === "Dispatcher" ? "selected" : ""}>Dispatcher</option><option value="Safety Officer" ${getVal("role") === "Safety Officer" ? "selected" : ""}>Safety Officer</option><option value="Financial Analyst" ${getVal("role") === "Financial Analyst" ? "selected" : ""}>Financial Analyst</option></select></div>
        <div class="form-group"><label class="form-label" for="form-status">Account Status</label><select id="form-status" class="form-control"><option value="ACTIVE" ${getVal("status") === "ACTIVE" ? "selected" : ""}>Active</option><option value="INACTIVE" ${getVal("status") === "INACTIVE" ? "selected" : ""}>Inactive</option></select></div>
      </div>
    `;
  }
  return "";
}

// --- DELETE MODAL ---
function openDeleteModal(type, id) {
  activeDeleteTarget = { type, id };
  const targetModal = document.getElementById("delete-modal-container");
  const descContainer = document.getElementById("delete-item-display");
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
function closeDeleteModal() { document.getElementById("delete-modal-container").classList.remove("active"); activeDeleteTarget = null; }

function navigateWithFilter(pageId, filterElementId, filterValue) {
  const filterSelect = document.getElementById(filterElementId);
  if (filterSelect) {
    filterSelect.value = filterValue;
    const searchInput = document.getElementById(`${pageId}-search`);
    if (searchInput) searchInput.value = "";
    paginationConfig[pageId].page = 1;
  }
  navigateTo(pageId);
}

// Global DOM navigation binds
window.addEventListener("DOMContentLoaded", () => {
  // Load saved theme mode
  const savedTheme = localStorage.getItem("transitops_theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  enforceRBAC();

  const notifBtn = document.getElementById("btn-notifications");
  if (notifBtn) {
    notifBtn.addEventListener("click", () => {
      window.location.href = "../notifications/notifications.html";
    });
  }
  
  const userInfo = document.querySelector(".header-user-info");
  if (userInfo) {
    userInfo.style.cursor = "pointer";
    userInfo.addEventListener("click", () => {
      window.location.href = "../profile/profile.html";
    });
  }

  const globalLogoutBtn = document.getElementById("btn-logout");
  if (globalLogoutBtn) {
    globalLogoutBtn.addEventListener("click", () => {
      localStorage.removeItem("transitops_logged_in");
      localStorage.removeItem("transitops_user_role");
      localStorage.removeItem("transitops_user_name");
      localStorage.removeItem("transitops_user_email");
      window.location.href = "../login/login.html";
    });
  }

  // Dark Mode injection trigger
  const headerActions = document.querySelector(".header-actions");
  if (headerActions && !document.getElementById("btn-dark-mode")) {
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn-icon";
    toggleBtn.id = "btn-dark-mode";
    toggleBtn.title = "Toggle Theme Mode";
    toggleBtn.style.marginRight = "8px";
    const isDark = document.body.classList.contains("dark-theme");
    toggleBtn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" style="width: 20px; height: 20px; color: var(--text-primary);"></i>`;
    
    headerActions.insertBefore(toggleBtn, headerActions.firstChild);
    lucide.createIcons();
    
    toggleBtn.addEventListener("click", () => {
      const isDarkNow = document.body.classList.toggle("dark-theme");
      localStorage.setItem("transitops_theme", isDarkNow ? "dark" : "light");
      toggleBtn.innerHTML = `<i data-lucide="${isDarkNow ? 'sun' : 'moon'}" style="width: 20px; height: 20px; color: var(--text-primary);"></i>`;
      lucide.createIcons();
    });
  } else if (!headerActions && !document.getElementById("btn-dark-mode")) {
    // Floating circle button for login page
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "btn-dark-mode";
    toggleBtn.title = "Toggle Theme Mode";
    toggleBtn.style.position = "fixed";
    toggleBtn.style.top = "20px";
    toggleBtn.style.right = "20px";
    toggleBtn.style.zIndex = "9999";
    toggleBtn.style.backgroundColor = "var(--bg-card)";
    toggleBtn.style.border = "1px solid var(--border-color)";
    toggleBtn.style.borderRadius = "50%";
    toggleBtn.style.width = "40px";
    toggleBtn.style.height = "40px";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.display = "flex";
    toggleBtn.style.alignItems = "center";
    toggleBtn.style.justifyContent = "center";
    toggleBtn.style.boxShadow = "var(--shadow-md)";
    
    const isDark = document.body.classList.contains("dark-theme");
    toggleBtn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" style="width: 20px; height: 20px; color: var(--text-primary);"></i>`;
    
    document.body.appendChild(toggleBtn);
    lucide.createIcons();
    
    toggleBtn.addEventListener("click", () => {
      const isDarkNow = document.body.classList.toggle("dark-theme");
      localStorage.setItem("transitops_theme", isDarkNow ? "dark" : "light");
      toggleBtn.innerHTML = `<i data-lucide="${isDarkNow ? 'sun' : 'moon'}" style="width: 20px; height: 20px; color: var(--text-primary);"></i>`;
      lucide.createIcons();
    });
  }
});

// Global password visibility toggle
function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (input) {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    const icon = btnEl.querySelector("i");
    if (icon) {
      icon.setAttribute("data-lucide", isPassword ? "eye-off" : "eye");
      lucide.createIcons();
    }
  }
}

let selectedDriverId = null;

function handleRowSelect(pageId, id, element) {
  const siblings = element.parentElement.querySelectorAll("tr");
  siblings.forEach(s => s.style.backgroundColor = "");
  element.style.backgroundColor = "rgba(15, 23, 42, 0.04)";
  
  if (pageId === "drivers") {
    selectedDriverId = id;
    const driver = db.drivers.find(d => d.id == id);
    if (driver) {
      const disp = document.getElementById("selected-driver-display-name");
      if (disp) disp.innerHTML = `TOGGLE STAT FOR: <strong style="color:var(--text-color);">${driver.name.toUpperCase()}</strong>`;
      
      const buttons = ["btn-toggle-available", "btn-toggle-ontrip", "btn-toggle-offduty", "btn-toggle-suspended"];
      buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
        }
      });
    }
  }
}
