// TransitOps - Reports Module

function renderReportsPage() {
  // Populate vehicle selector dropdown
  const select = document.getElementById("report-vehicle-select");
  const savedVal = select.value;
  select.innerHTML = '<option value="ALL">All Vehicles</option>';
  db.vehicles.forEach(v => {
    select.innerHTML += `<option value="${v.id}">${v.plate} - ${v.make}</option>`;
  });
  if (savedVal && db.vehicles.some(v => v.id == savedVal)) {
    select.value = savedVal;
  }

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

// Generate dynamic CSV file and download it
function exportCSVReport() {
  showToast("Compiling operations details into CSV...");
  
  const select = document.getElementById("report-vehicle-select");
  const targetVehicleId = select.value;
  
  // Header
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Vehicle,Make/Model,Total Trips,Maintenance Cost,Fuel Cost,Other Expenses,Total Cost\n";
  
  const range = document.getElementById("report-date-range").value;
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

  const curDate = new Date("2026-07-12");
  const filterByDateRange = (item) => {
    const itemDate = new Date(item.date);
    if (range === "this-month") return itemDate.getMonth() === curDate.getMonth() && itemDate.getFullYear() === curDate.getFullYear();
    if (range === "last-month") {
      let m = curDate.getMonth() - 1, y = curDate.getFullYear();
      if (m < 0) { m = 11; y--; }
      return itemDate.getMonth() === m && itemDate.getFullYear() === y;
    }
    if (range === "last-6-months") return itemDate >= new Date("2026-02-01");
    if (range === "this-year") return itemDate.getFullYear() === curDate.getFullYear();
    return true;
  };

  reportsExpenses = reportsExpenses.filter(filterByDateRange);
  reportsTrips = reportsTrips.filter(filterByDateRange);
  reportsMaintenance = reportsMaintenance.filter(filterByDateRange);
  reportsFuel = reportsFuel.filter(filterByDateRange);

  const vehiclesToSummarize = targetVehicleId === "ALL" 
    ? db.vehicles 
    : db.vehicles.filter(v => v.id == targetVehicleId);

  vehiclesToSummarize.forEach(v => {
    const vehicleTripsCount = reportsTrips.filter(t => t.vehicleId == v.id).length;
    const maintCost = reportsMaintenance.filter(m => m.vehicleId == v.id && m.status === "COMPLETED").reduce((sum, m) => sum + Number(m.cost), 0);
    const fuelCost = reportsFuel.filter(f => f.vehicleId == v.id).reduce((sum, f) => sum + Number(f.cost), 0);
    const otherCost = reportsExpenses.filter(e => e.vehicleId == v.id && e.category !== "Fuel" && e.category !== "Maintenance").reduce((sum, e) => sum + Number(e.cost), 0);
    const totalCostSum = maintCost + fuelCost + otherCost;

    csvContent += `"${v.plate}","${v.make} ${v.model}",${vehicleTripsCount},${maintCost.toFixed(2)},${fuelCost.toFixed(2)},${otherCost.toFixed(2)},${totalCostSum.toFixed(2)}\n`;
  });

  // Download trigger
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `TransitOps_Report_${range}_2026.csv`);
  document.body.appendChild(link);
  
  setTimeout(() => {
    link.click();
    document.body.removeChild(link);
    showToast("Download started: TransitOps_Report_2026.csv");
  }, 1000);
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

  document.getElementById("btn-generate-report").addEventListener("click", renderReportsPage);
  document.getElementById("btn-export-report").addEventListener("click", exportCSVReport);
  
  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });
});
