// TransitOps - Shared JavaScript Utilities
// Common: API, Auth, State, Toasts, Navigation, Tables, Modals, Forms

// --- DATABASE STATE ---
let db = {
  vehicles: [], drivers: [], trips: [],
  maintenance: [], fuel: [], expenses: [],
  users: [], settings: {}
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
    db.vehicles = vehicles; db.drivers = drivers; db.trips = trips;
    db.maintenance = maintenance; db.fuel = fuel; db.expenses = expenses;
    db.users = users; db.settings = settings;
    document.querySelectorAll(".sidebar-brand").forEach(b => {
      b.textContent = db.settings.platformName || "TransitOps";
    });
  } catch (err) { console.error("Error loading database:", err); }
}

// --- STATE ---
let activePage = "dashboard";
let paginationConfig = {
  vehicles: { page: 1, limit: 5 }, drivers: { page: 1, limit: 5 },
  trips: { page: 1, limit: 5 }, maintenance: { page: 1, limit: 5 },
  fuel: { page: 1, limit: 5 }, expenses: { page: 1, limit: 5 },
  users: { page: 1, limit: 5 }
};
let tableSorting = {
  vehicles: { column: 'id', desc: false }, drivers: { column: 'id', desc: false },
  trips: { column: 'id', desc: false }, maintenance: { column: 'id', desc: false },
  fuel: { column: 'id', desc: false }, expenses: { column: 'id', desc: false },
  users: { column: 'id', desc: false }
};
let activeDeleteTarget = null;
let currentModalType = null;
let currentModalAction = null;
let currentModalId = null;

// --- TOAST ---
function showToast(message) {
  const container = document.getElementById("toast-container");
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
  const code = db.settings ? db.settings.currency : "USD";
  const symbol = code === "EUR" ? "€" : code === "INR" ? "₹" : "$";
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    users: { title: "User & Role Configurations", icon: "user-check" },
    settings: { title: "System Configurations", icon: "settings" }
  };
  const details = pageDetails[pageId] || { title: "TransitOps", icon: "navigation" };
  headerTitle.textContent = details.title;
  headerIcon.setAttribute("data-lucide", details.icon);
  lucide.createIcons();
  await loadDatabase();
  triggerPageLoad(pageId);
}

function triggerPageLoad(pageId) {
  if (pageId === "dashboard") renderDashboard();
  else if (pageId === "reports") renderReportsPage();
  else if (pageId === "settings") loadSettingsForms();
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
      const ms = v.plate.toLowerCase().includes(searchVal) || v.make.toLowerCase().includes(searchVal) || v.model.toLowerCase().includes(searchVal) || v.type.toLowerCase().includes(searchVal);
      return ms && (filterVal === "ALL" || v.status === filterVal);
    });
  } else if (pageId === "drivers") {
    list = db.drivers.filter(d => {
      const ms = d.name.toLowerCase().includes(searchVal) || d.license.toLowerCase().includes(searchVal) || d.phone.toLowerCase().includes(searchVal);
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
      const ms = m.description.toLowerCase().includes(searchVal) || m.vehiclePlate.toLowerCase().includes(searchVal);
      return ms && (filterVal === "ALL" || m.status === filterVal);
    });
  } else if (pageId === "fuel") {
    list = db.fuel.map(f => {
      const v = db.vehicles.find(vh => vh.id == f.vehicleId) || { plate: "Unknown" };
      return { ...f, vehiclePlate: v.plate };
    }).filter(f => f.vehiclePlate.toLowerCase().includes(searchVal) || f.provider.toLowerCase().includes(searchVal));
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
      tbodyHTML += `<tr>`;
      headers.forEach(h => tbodyHTML += `<td>${formatTableCellValue(pageId, row, h)}</td>`);
      tbodyHTML += `<td><div class="table-actions"><button class="btn btn-secondary btn-sm" onclick="openDetailsModal('${pageId}', ${row.id})" title="View"><i data-lucide="eye" style="width:12px;height:12px;"></i> View</button><button class="btn btn-secondary btn-sm" onclick="openFormModal('${pageId}', 'edit', ${row.id})" title="Edit"><i data-lucide="edit" style="width:12px;height:12px;"></i> Edit</button><button class="btn btn-danger-outline btn-sm" onclick="openDeleteModal('${pageId}', ${row.id})" title="Delete"><i data-lucide="trash" style="width:12px;height:12px;"></i> Delete</button></div></td></tr>`;
    });
    tbody.innerHTML = tbodyHTML;
  }
  renderPaginationControls(pageId, config.page, totalPages, startIndex + 1, endIndex, totalRecords);
  lucide.createIcons();
}

function getTableHeaders(pageId) {
  switch (pageId) {
    case "vehicles": return [{ label: "ID", key: "id" }, { label: "Plate Number", key: "plate" }, { label: "Manufacturer", key: "make" }, { label: "Model", key: "model" }, { label: "Type", key: "type" }, { label: "Year", key: "year" }, { label: "Status", key: "status" }];
    case "drivers": return [{ label: "ID", key: "id" }, { label: "Full Name", key: "name" }, { label: "CDL License No.", key: "license" }, { label: "Phone Number", key: "phone" }, { label: "Duty Status", key: "status" }];
    case "trips": return [{ label: "ID", key: "id" }, { label: "Vehicle Plate", key: "vehiclePlate" }, { label: "Assigned Driver", key: "driverName" }, { label: "Origin", key: "origin" }, { label: "Destination", key: "destination" }, { label: "Revenue/Cost", key: "cost" }, { label: "Status", key: "status" }];
    case "maintenance": return [{ label: "ID", key: "id" }, { label: "Vehicle Plate", key: "vehiclePlate" }, { label: "Description", key: "description" }, { label: "Cost", key: "cost" }, { label: "Scheduled Date", key: "date" }, { label: "Status", key: "status" }];
    case "fuel": return [{ label: "ID", key: "id" }, { label: "Vehicle Plate", key: "vehiclePlate" }, { label: "Fuel Filled (L)", key: "liters" }, { label: "Total Cost", key: "cost" }, { label: "Fills Date", key: "date" }, { label: "Provider", key: "provider" }];
    case "expenses": return [{ label: "ID", key: "id" }, { label: "Vehicle Plate", key: "vehiclePlate" }, { label: "Category", key: "category" }, { label: "Description", key: "description" }, { label: "Amount", key: "cost" }, { label: "Log Date", key: "date" }];
    case "users": return [{ label: "ID", key: "id" }, { label: "User Name", key: "name" }, { label: "Email Address", key: "email" }, { label: "System Role", key: "role" }, { label: "Status", key: "status" }];
    default: return [];
  }
}

function formatTableCellValue(pageId, row, header) {
  const value = row[header.key];
  if (header.key === "status") return `<span class="status-pill status-${value.toLowerCase()}">${value.replace("_", " ")}</span>`;
  if (header.key === "cost" || header.key === "amount") return formatCurrency(value);
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
  else if (type === "fuel") { const f = db.fuel.find(fl => fl.id == id); if (f) { const v = db.vehicles.find(vh => vh.id == f.vehicleId) || { plate: "N/A" }; record = { ...f, vehiclePlate: v.plate }; } labelType = "Fuel Log Summary"; }
  else if (type === "expenses") { const e = db.expenses.find(ex => ex.id == id); if (e) { const v = db.vehicles.find(vh => vh.id == e.vehicleId) || { plate: "N/A" }; record = { ...e, vehiclePlate: v.plate }; } labelType = "Expense Receipt"; }
  else if (type === "users") { record = db.users.find(u => u.id == id); labelType = "User Registry Info"; }
  if (!record) return;
  detailsTitle.textContent = `${labelType} (ID: #${record.id})`;
  let gridHTML = `<div class="detail-grid">`;
  const keyLabels = { id: "Record ID", plate: "Plate Number", make: "Manufacturer", model: "Model Name", type: "Vehicle Type", year: "Manufacture Year", status: "Operational Status", name: "Full Name", license: "License Code", phone: "Phone Line", vehicleId: "Vehicle ID Reference", driverId: "Driver ID Reference", vehiclePlate: "Vehicle Assigned", driverName: "Driver Assigned", origin: "Origin Terminal", destination: "Destination Hub", cost: "Total Value / Fee", date: "Logged Date", description: "Detailed Description", liters: "Volume Filled (L)", provider: "Gas Provider Name", category: "Cost Category", email: "Email Account", role: "Platform Role" };
  Object.keys(record).forEach(key => {
    const label = keyLabels[key] || key;
    let val = record[key];
    if (key === "cost" || key === "amount") val = formatCurrency(val);
    else if (key === "status") val = `<span class="status-pill status-${val.toLowerCase()}">${val.replace("_", " ")}</span>`;
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
  if (type === "vehicles") return `<div class="form-group"><label class="form-label" for="form-plate">Plate Number</label><input type="text" id="form-plate" class="form-control" placeholder="e.g. NY-1102-K" required value="${getVal("plate")}"></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-make">Manufacturer</label><input type="text" id="form-make" class="form-control" placeholder="e.g. Freightliner" required value="${getVal("make")}"></div><div class="form-group"><label class="form-label" for="form-model">Model</label><input type="text" id="form-model" class="form-control" placeholder="e.g. Cascadia" required value="${getVal("model")}"></div></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-type">Vehicle Type</label><select id="form-type" class="form-control"><option value="Semi-Truck" ${getVal("type") === "Semi-Truck" ? "selected" : ""}>Semi-Truck</option><option value="Flatbed" ${getVal("type") === "Flatbed" ? "selected" : ""}>Flatbed</option><option value="Box Truck" ${getVal("type") === "Box Truck" ? "selected" : ""}>Box Truck</option><option value="Cargo Van" ${getVal("type") === "Cargo Van" ? "selected" : ""}>Cargo Van</option></select></div><div class="form-group"><label class="form-label" for="form-year">Year</label><input type="number" id="form-year" class="form-control" min="1995" max="2027" required value="${getVal("year", 2023)}"></div></div><div class="form-group"><label class="form-label" for="form-status">Status</label><select id="form-status" class="form-control"><option value="ACTIVE" ${getVal("status") === "ACTIVE" ? "selected" : ""}>Active</option><option value="AVAILABLE" ${getVal("status") === "AVAILABLE" ? "selected" : ""}>Available</option><option value="MAINTENANCE" ${getVal("status") === "MAINTENANCE" ? "selected" : ""}>Maintenance</option></select></div>`;
  if (type === "drivers") return `<div class="form-group"><label class="form-label" for="form-name">Driver Full Name</label><input type="text" id="form-name" class="form-control" placeholder="e.g. John Doe" required value="${getVal("name")}"></div><div class="form-group"><label class="form-label" for="form-license">CDL License Number</label><input type="text" id="form-license" class="form-control" placeholder="e.g. CDL-A-1234" required value="${getVal("license")}"></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-phone">Phone Number</label><input type="text" id="form-phone" class="form-control" placeholder="e.g. +1 (555) 012-3456" required value="${getVal("phone")}"></div><div class="form-group"><label class="form-label" for="form-status">Duty Status</label><select id="form-status" class="form-control"><option value="DUTY" ${getVal("status") === "DUTY" ? "selected" : ""}>On Duty</option><option value="OFF_DUTY" ${getVal("status") === "OFF_DUTY" ? "selected" : ""}>Off Duty</option></select></div></div>`;
  if (type === "trips") { const vo = db.vehicles.map(v => `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make} ${v.model}</option>`).join(""); const dro = db.drivers.map(d => `<option value="${d.id}" ${getVal("driverId") == d.id ? "selected" : ""}>${d.name} (${d.status.replace("_", " ")})</option>`).join(""); return `<div class="form-group"><label class="form-label" for="form-vehicle">Assign Vehicle</label><select id="form-vehicle" class="form-control" required>${vo}</select></div><div class="form-group"><label class="form-label" for="form-driver">Assign Driver</label><select id="form-driver" class="form-control" required>${dro}</select></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-origin">Origin</label><input type="text" id="form-origin" class="form-control" placeholder="e.g. Chicago, IL" required value="${getVal("origin")}"></div><div class="form-group"><label class="form-label" for="form-destination">Destination</label><input type="text" id="form-destination" class="form-control" placeholder="e.g. Seattle, WA" required value="${getVal("destination")}"></div></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-cost">Revenue / Cost ($)</label><input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}"></div><div class="form-group"><label class="form-label" for="form-date">Date</label><input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}"></div></div><div class="form-group"><label class="form-label" for="form-status">Trip Status</label><select id="form-status" class="form-control"><option value="PENDING" ${getVal("status") === "PENDING" ? "selected" : ""}>Pending</option><option value="ACTIVE" ${getVal("status") === "ACTIVE" ? "selected" : ""}>Active</option><option value="COMPLETED" ${getVal("status") === "COMPLETED" ? "selected" : ""}>Completed</option></select></div>`; }
  if (type === "maintenance") { const vo = db.vehicles.map(v => `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`).join(""); return `<div class="form-group"><label class="form-label" for="form-vehicle">Vehicle</label><select id="form-vehicle" class="form-control" required>${vo}</select></div><div class="form-group"><label class="form-label" for="form-description">Description of Issue / Work</label><textarea id="form-description" class="form-control" placeholder="Describe the maintenance action taken..." required>${getVal("description")}</textarea></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-cost">Total Maintenance Cost ($)</label><input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}"></div><div class="form-group"><label class="form-label" for="form-date">Scheduled Date</label><input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}"></div></div><div class="form-group"><label class="form-label" for="form-status">Status</label><select id="form-status" class="form-control"><option value="PENDING" ${getVal("status") === "PENDING" ? "selected" : ""}>Pending</option><option value="IN_PROGRESS" ${getVal("status") === "IN_PROGRESS" ? "selected" : ""}>In Progress</option><option value="COMPLETED" ${getVal("status") === "COMPLETED" ? "selected" : ""}>Completed</option></select></div>`; }
  if (type === "fuel") { const vo = db.vehicles.map(v => `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`).join(""); return `<div class="form-group"><label class="form-label" for="form-vehicle">Vehicle</label><select id="form-vehicle" class="form-control" required>${vo}</select></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-liters">Liters Filled</label><input type="number" id="form-liters" class="form-control" min="1" step="1" required value="${getVal("liters")}"></div><div class="form-group"><label class="form-label" for="form-cost">Total Fuel Cost ($)</label><input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}"></div></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-date">Date Filled</label><input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}"></div><div class="form-group"><label class="form-label" for="form-provider">Provider Station</label><input type="text" id="form-provider" class="form-control" placeholder="e.g. Love's Travel Stops" required value="${getVal("provider")}"></div></div>`; }
  if (type === "expenses") { const vo = db.vehicles.map(v => `<option value="${v.id}" ${getVal("vehicleId") == v.id ? "selected" : ""}>${v.plate} - ${v.make}</option>`).join(""); return `<div class="form-group"><label class="form-label" for="form-vehicle">Vehicle</label><select id="form-vehicle" class="form-control" required>${vo}</select></div><div class="form-group"><label class="form-label" for="form-category">Expense Category</label><select id="form-category" class="form-control"><option value="Fuel" ${getVal("category") === "Fuel" ? "selected" : ""}>Fuel</option><option value="Maintenance" ${getVal("category") === "Maintenance" ? "selected" : ""}>Maintenance</option><option value="Insurance" ${getVal("category") === "Insurance" ? "selected" : ""}>Insurance</option><option value="Tolls" ${getVal("category") === "Tolls" ? "selected" : ""}>Tolls</option><option value="Other" ${getVal("category") === "Other" ? "selected" : ""}>Other</option></select></div><div class="form-group"><label class="form-label" for="form-description">Description</label><input type="text" id="form-description" class="form-control" placeholder="e.g. Spare tire buy" required value="${getVal("description")}"></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-cost">Amount ($)</label><input type="number" id="form-cost" class="form-control" min="0" step="0.01" required value="${getVal("cost")}"></div><div class="form-group"><label class="form-label" for="form-date">Date Charged</label><input type="date" id="form-date" class="form-control" required value="${getVal("date", "2026-07-12")}"></div></div>`; }
  if (type === "users") return `<div class="form-group"><label class="form-label" for="form-name">User Full Name</label><input type="text" id="form-name" class="form-control" placeholder="e.g. Alice Carter" required value="${getVal("name")}"></div><div class="form-group"><label class="form-label" for="form-email">Email Address</label><input type="email" id="form-email" class="form-control" placeholder="e.g. user@company.com" required value="${getVal("email")}"></div><div class="form-group-row"><div class="form-group"><label class="form-label" for="form-role">System Role</label><select id="form-role" class="form-control"><option value="Administrator" ${getVal("role") === "Administrator" ? "selected" : ""}>Administrator</option><option value="Dispatcher" ${getVal("role") === "Dispatcher" ? "selected" : ""}>Dispatcher</option><option value="Driver" ${getVal("role") === "Driver" ? "selected" : ""}>Driver</option></select></div><div class="form-group"><label class="form-label" for="form-status">Account Status</label><select id="form-status" class="form-control"><option value="ACTIVE" ${getVal("status") === "ACTIVE" ? "selected" : ""}>Active</option><option value="INACTIVE" ${getVal("status") === "INACTIVE" ? "selected" : ""}>Inactive</option></select></div></div>`;
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
