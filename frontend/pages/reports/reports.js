// TransitOps - Reports & Analytics Module

function renderReportsPage() {
  const typeSelect = document.getElementById("report-type-select");
  const rangeSelect = document.getElementById("report-date-range");
  const vehicleSelect = document.getElementById("report-vehicle-select");

  const reportType = typeSelect.value;
  const range = rangeSelect.value;
  const targetVehicleId = vehicleSelect.value;

  // 1. Populate vehicle dropdown list if empty (only first time)
  if (vehicleSelect.children.length === 1) {
    db.vehicles.forEach(v => {
      vehicleSelect.innerHTML += `<option value="${v.id}">${v.plate} - ${v.make}</option>`;
    });
  }

  // 2. Filter Helpers
  const curDate = new Date("2026-07-12");
  const filterByDateRange = (dateStr) => {
    if (!dateStr) return false;
    if (range === "all-time") return true;
    const itemDate = new Date(dateStr);
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

  // 3. Compute Metrics Widgets (always fleet-wide or vehicle-specific based on dropdown, but filtered by range)
  let metricsExpenses = db.expenses.filter(e => filterByDateRange(e.date));
  let metricsFuel = db.fuel.filter(f => filterByDateRange(f.date));
  let metricsTrips = db.trips.filter(t => filterByDateRange(t.date));
  let metricsMaint = db.maintenance.filter(m => filterByDateRange(m.start_date));

  if (targetVehicleId !== "ALL") {
    metricsExpenses = metricsExpenses.filter(e => e.vehicleId == targetVehicleId);
    metricsFuel = metricsFuel.filter(f => f.vehicleId == targetVehicleId);
    metricsTrips = metricsTrips.filter(t => t.vehicleId == targetVehicleId);
    metricsMaint = metricsMaint.filter(m => m.vehicleId == targetVehicleId);
  }

  const totalFuelLiters = metricsFuel.reduce((sum, f) => sum + Number(f.liters), 0);
  const totalCosts = metricsExpenses.reduce((sum, e) => sum + Number(e.cost), 0);
  const completedTrips = metricsTrips.filter(t => t.status === "COMPLETED").length;
  const completedMaint = metricsMaint.filter(m => m.status === "COMPLETED").length;

  document.getElementById("report-total-fuel").textContent = `${totalFuelLiters.toLocaleString()} L`;
  document.getElementById("report-total-costs").textContent = formatCurrency(totalCosts);
  document.getElementById("report-completed-trips").textContent = completedTrips;
  document.getElementById("report-completed-maintenance").textContent = completedMaint;

  // 4. Render Table based on Selected Report Type
  const thead = document.getElementById("reports-summary-table").querySelector("thead");
  const tbody = document.getElementById("reports-summary-table").querySelector("tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  document.getElementById("reports-table-heading").textContent = typeSelect.options[typeSelect.selectedIndex].text;

  if (reportType === "summary") {
    // Columns: Vehicle, Make/Model, Total Trips, Total Revenue, Maintenance Cost, Fuel Cost, Total Cost, Vehicle ROI
    thead.innerHTML = `
      <tr>
        <th>Vehicle Plate</th>
        <th>Make / Model</th>
        <th>Total Trips</th>
        <th>Total Revenue</th>
        <th>Maintenance Cost</th>
        <th>Fuel Cost</th>
        <th>Total Cost</th>
        <th>Vehicle ROI</th>
      </tr>
    `;

    const vehiclesToSummarize = targetVehicleId === "ALL" 
      ? db.vehicles 
      : db.vehicles.filter(v => v.id == targetVehicleId);

    if (vehiclesToSummarize.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
    } else {
      vehiclesToSummarize.forEach(v => {
        const vTrips = metricsTrips.filter(t => t.vehicleId == v.id).length;
        const revenue = metricsTrips.filter(t => t.vehicleId == v.id && t.status === "COMPLETED").reduce((sum, t) => sum + Number(t.cost), 0);
        const maintCost = metricsMaint.filter(m => m.vehicleId == v.id && m.status === "COMPLETED").reduce((sum, m) => sum + Number(m.cost), 0);
        const fuelCost = metricsFuel.filter(f => f.vehicleId == v.id).reduce((sum, f) => sum + Number(f.cost), 0);
        const total = maintCost + fuelCost;
        
        const acquisition = Number(v.purchase_cost) || 0;
        const roiVal = acquisition > 0 ? (((revenue - (maintCost + fuelCost)) / acquisition) * 100).toFixed(1) : "0.0";
        const roiColor = Number(roiVal) >= 0 ? "#10b981" : "#ef4444";

        tbody.innerHTML += `
          <tr>
            <td><strong>${v.plate}</strong></td>
            <td>${v.make} ${v.model}</td>
            <td>${vTrips}</td>
            <td>${formatCurrency(revenue)}</td>
            <td>${formatCurrency(maintCost)}</td>
            <td>${formatCurrency(fuelCost)}</td>
            <td><strong>${formatCurrency(total)}</strong></td>
            <td><strong style="color: ${roiColor};">${roiVal}%</strong></td>
          </tr>
        `;
      });
    }
  } 
  
  else if (reportType === "vehicles") {
    thead.innerHTML = `
      <tr>
        <th>Plate</th>
        <th>Vehicle Name</th>
        <th>Brand / Model</th>
        <th>Type</th>
        <th>Load Cap (kg)</th>
        <th>Odometer (km)</th>
        <th>Ins. Expiry</th>
        <th>Status</th>
      </tr>
    `;

    let list = targetVehicleId === "ALL" ? db.vehicles : db.vehicles.filter(v => v.id == targetVehicleId);
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
    } else {
      list.forEach(v => {
        tbody.innerHTML += `
          <tr>
            <td><strong>${v.plate}</strong></td>
            <td>${v.name || "N/A"}</td>
            <td>${v.make} ${v.model}</td>
            <td>${v.type}</td>
            <td>${v.max_load} kg</td>
            <td>${v.odometer} km</td>
            <td>${formatDate(v.insurance_expiry) || "N/A"}</td>
            <td><span class="status-pill status-${v.status.toLowerCase()}">${v.status}</span></td>
          </tr>
        `;
      });
    }
  }

  else if (reportType === "drivers") {
    thead.innerHTML = `
      <tr>
        <th>Driver Name</th>
        <th>License Code</th>
        <th>Category</th>
        <th>Expiry Date</th>
        <th>Safety Score</th>
        <th>Experience</th>
        <th>Status</th>
      </tr>
    `;

    let list = db.drivers;
    if (targetVehicleId !== "ALL") {
      const v = db.vehicles.find(vh => vh.id == targetVehicleId);
      list = list.filter(d => d.assigned_vehicle_id == targetVehicleId);
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
    } else {
      list.forEach(d => {
        tbody.innerHTML += `
          <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.license}</td>
            <td>${d.license_category}</td>
            <td>${formatDate(d.license_expiry) || "N/A"}</td>
            <td>${d.safety_score} / 100</td>
            <td>${d.experience} Years</td>
            <td><span class="status-pill status-${d.status.toLowerCase()}">${d.status}</span></td>
          </tr>
        `;
      });
    }
  }

  else if (reportType === "trips") {
    thead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Vehicle Plate</th>
        <th>Driver</th>
        <th>Origin</th>
        <th>Destination</th>
        <th>Load (kg)</th>
        <th>Distance (km)</th>
        <th>Status</th>
        <th>Cost/Revenue</th>
      </tr>
    `;

    let list = metricsTrips;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
    } else {
      list.forEach(t => {
        const v = db.vehicles.find(vh => vh.id == t.vehicleId) || { plate: "N/A" };
        const d = db.drivers.find(dr => dr.id == t.driverId) || { name: "N/A" };
        tbody.innerHTML += `
          <tr>
            <td>#${t.id}</td>
            <td><strong>${v.plate}</strong></td>
            <td>${d.name}</td>
            <td>${t.origin}</td>
            <td>${t.destination}</td>
            <td>${t.cargo_weight} kg</td>
            <td>${t.planned_distance} km</td>
            <td><span class="status-pill status-${t.status.toLowerCase()}">${t.status}</span></td>
            <td><strong>${formatCurrency(t.cost)}</strong></td>
          </tr>
        `;
      });
    }
  }

  else if (reportType === "fuel") {
    thead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Vehicle</th>
        <th>Driver</th>
        <th>Fuel Type</th>
        <th>Volume (L)</th>
        <th>Odometer (km)</th>
        <th>Provider</th>
        <th>Fill Date</th>
        <th>Cost</th>
      </tr>
    `;

    let list = metricsFuel;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
    } else {
      list.forEach(f => {
        const v = db.vehicles.find(vh => vh.id == f.vehicleId) || { plate: "N/A" };
        const d = db.drivers.find(dr => dr.id == f.driverId) || { name: "N/A" };
        tbody.innerHTML += `
          <tr>
            <td>#${f.id}</td>
            <td><strong>${v.plate}</strong></td>
            <td>${d.name}</td>
            <td>${f.fuel_type}</td>
            <td>${f.liters} L</td>
            <td>${f.odometer} km</td>
            <td>${f.provider}</td>
            <td>${formatDate(f.date)}</td>
            <td><strong>${formatCurrency(f.cost)}</strong></td>
          </tr>
        `;
      });
    }
  }

  else if (reportType === "maintenance") {
    thead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Vehicle</th>
        <th>Type</th>
        <th>Workshop</th>
        <th>Technician</th>
        <th>Start Date</th>
        <th>End Date</th>
        <th>Status</th>
        <th>Cost</th>
      </tr>
    `;

    let list = metricsMaint;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
    } else {
      list.forEach(m => {
        const v = db.vehicles.find(vh => vh.id == m.vehicleId) || { plate: "N/A" };
        tbody.innerHTML += `
          <tr>
            <td>#${m.id}</td>
            <td><strong>${v.plate}</strong></td>
            <td>${m.type}</td>
            <td>${m.workshop}</td>
            <td>${m.technician}</td>
            <td>${formatDate(m.start_date)}</td>
            <td>${formatDate(m.end_date) || "N/A"}</td>
            <td><span class="status-pill status-${m.status.toLowerCase()}">${m.status}</span></td>
            <td><strong>${formatCurrency(m.cost)}</strong></td>
          </tr>
        `;
      });
    }
  }

  else if (reportType === "expenses") {
    thead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Vehicle</th>
        <th>Category</th>
        <th>Description</th>
        <th>Charge Date</th>
        <th>Status</th>
        <th>Amount</th>
      </tr>
    `;

    let list = metricsExpenses;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
    } else {
      list.forEach(e => {
        const v = db.vehicles.find(vh => vh.id == e.vehicleId) || { plate: "N/A" };
        tbody.innerHTML += `
          <tr>
            <td>#${e.id}</td>
            <td><strong>${v.plate}</strong></td>
            <td>${e.category}</td>
            <td>${e.description}</td>
            <td>${formatDate(e.date)}</td>
            <td><span class="status-pill status-${e.status.toLowerCase()}">${e.status}</span></td>
            <td><strong>${formatCurrency(e.cost)}</strong></td>
          </tr>
        `;
      });
    }
  }
}

// Generate dynamic CSV file and download it based on current visible rows
function exportCSVReport() {
  const table = document.getElementById("reports-summary-table");
  if (!table) return;
  
  showToast("Compiling report details into CSV...");
  
  const headers = [];
  table.querySelectorAll("thead th").forEach(th => headers.push(th.textContent.trim()));
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += headers.map(h => `"${h}"`).join(",") + "\n";
  
  const rows = table.querySelectorAll("tbody tr");
  if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
    showToast("No data to export!");
    return;
  }
  
  rows.forEach(row => {
    const cells = [];
    row.querySelectorAll("td").forEach(td => {
      cells.push(`"${td.textContent.trim()}"`);
    });
    csvContent += cells.join(",") + "\n";
  });
  
  const reportType = document.getElementById("report-type-select").value;
  const range = document.getElementById("report-date-range").value;
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `TransitOps_${reportType}_report_${range}.csv`);
  document.body.appendChild(link);
  
  setTimeout(() => {
    link.click();
    document.body.removeChild(link);
    showToast("CSV Download started.");
  }, 800);
}

// Generate PDF Report using printable layout window
function exportPDFReport() {
  const table = document.getElementById("reports-summary-table");
  if (!table) return;

  const rows = table.querySelectorAll("tbody tr");
  if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
    showToast("No data to export!");
    return;
  }

  showToast("Formatting PDF printable layout...");

  const reportTypeSelect = document.getElementById("report-type-select");
  const title = reportTypeSelect.options[reportTypeSelect.selectedIndex].text;
  const range = document.getElementById("report-date-range").options[document.getElementById("report-date-range").selectedIndex].text;
  const vehicle = document.getElementById("report-vehicle-select").options[document.getElementById("report-vehicle-select").selectedIndex].text;
  
  const tableHTML = table.outerHTML;
  const companyName = db.settings.companyName || "TransitOps Solutions";
  const logoSymbol = db.settings.platformName || "TransitOps";

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>TransitOps Report - ${title}</title>
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
          .meta { font-size: 12px; color: #475569; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; padding: 12px 16px; border-radius: 6px; }
          .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;}
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
          th { background-color: #f1f5f9; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; font-weight: 700; text-align: left; text-transform: uppercase; color: #64748b; font-size: 9px; letter-spacing: 0.5px; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          tr:last-child td { border-bottom: 2px solid #1e293b; }
          .status-pill { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: #e2e8f0; color: #475569; }
          .status-active, .status-completed, .status-paid, .status-approved { background: #d1fae5; color: #065f46; }
          .status-available { background: #e0f2fe; color: #075985; }
          .status-maintenance, .status-pending { background: #fef3c7; color: #92400e; }
          .status-cancelled, .status-suspended, .status-retired { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">${logoSymbol}</div>
            <div style="font-size: 11px; color: #64748b; font-weight:500;">${companyName}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 14px;">System Analytics Report</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>
        <div class="title">${title}</div>
        <div class="meta">
          <div>Date Range Window: <strong>${range}</strong></div>
          <div>Filter Scope: <strong>${vehicle}</strong></div>
        </div>
        ${tableHTML}
        <div class="footer">
          Generated automatically by TransitOps Transport Operations Management System. Confidential Document.
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// --- INIT ---
window.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("transitops_logged_in") !== "true") {
    window.location.href = "../login/login.html";
    return;
  }

  await loadDatabase();
  renderReportsPage();
  lucide.createIcons();

  // Listeners
  document.getElementById("btn-generate-report").addEventListener("click", renderReportsPage);
  document.getElementById("btn-export-report").addEventListener("click", exportCSVReport);
  document.getElementById("btn-export-pdf").addEventListener("click", exportPDFReport);
  
  // Re-render automatically on dropdown toggle
  document.getElementById("report-type-select").addEventListener("change", renderReportsPage);

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });
});
