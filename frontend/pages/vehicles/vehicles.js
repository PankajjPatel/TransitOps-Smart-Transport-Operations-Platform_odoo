// TransitOps - Vehicles Module
window.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-page") === "vehicles");
  });

  setupFilterListeners();

  const addBtn = document.getElementById("btn-add-vehicle");
  if (addBtn) addBtn.addEventListener("click", () => openFormModal("vehicles", "add"));

  document.getElementById("modal-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const type = currentModalType, action = currentModalAction, id = currentModalId;
    const driverVal = document.getElementById("form-assigned_driver").value;
    const payload = {
      plate: document.getElementById("form-plate").value.trim(),
      name: document.getElementById("form-name").value.trim(),
      make: document.getElementById("form-make").value.trim(),
      model: document.getElementById("form-model").value.trim(),
      type: document.getElementById("form-type").value,
      year: parseInt(document.getElementById("form-year").value) || 2023,
      max_load: parseFloat(document.getElementById("form-max_load").value) || 0,
      fuel_type: document.getElementById("form-fuel_type").value,
      fuel_capacity: parseFloat(document.getElementById("form-fuel_capacity").value) || 0,
      average_mileage: parseFloat(document.getElementById("form-average_mileage").value) || 0,
      odometer: parseInt(document.getElementById("form-odometer").value) || 0,
      purchase_cost: parseFloat(document.getElementById("form-purchase_cost").value) || 0,
      purchase_date: document.getElementById("form-purchase_date").value || "",
      insurance_expiry: document.getElementById("form-insurance_expiry").value || "",
      fitness_expiry: document.getElementById("form-fitness_expiry").value || "",
      pollution_expiry: document.getElementById("form-pollution_expiry").value || "",
      assigned_driver_id: driverVal ? parseInt(driverVal) : null,
      depot: document.getElementById("form-depot").value.trim(),
      status: document.getElementById("form-status").value,
      image: document.getElementById("form-image").value,
      remarks: document.getElementById("form-remarks").value.trim()
    };
    try {
      let url = `/api/${type}`;
      let method = "POST";
      if (action === "edit") { url = `/api/${type}/${id}`; method = "PUT"; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) showToast(`Successfully ${action === "add" ? "created" : "updated"} vehicle`);
      else alert("Error: " + result.error);
    } catch (err) { alert("Error connecting to server."); }
    closeModal();
    await loadDatabase();
    renderTablePage("vehicles");
  });

  document.getElementById("btn-delete-confirm").addEventListener("click", async function() {
    if (activeDeleteTarget) {
      const { type, id } = activeDeleteTarget;
      try {
        const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) showToast(`Deleted vehicle #${id}`);
        else alert("Error: " + result.error);
      } catch (err) { alert("Error connecting to server."); }
      closeDeleteModal();
      await loadDatabase();
      renderTablePage("vehicles");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });

  const loggedIn = localStorage.getItem("transitops_logged_in");
  if (loggedIn !== "true") { window.location.href = "../login/login.html"; return; }

  await loadDatabase();
  renderTablePage("vehicles");
  lucide.createIcons();
});
