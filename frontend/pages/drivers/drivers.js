// TransitOps - Drivers Module
window.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-page") === "drivers");
  });

  setupFilterListeners();

  const addBtn = document.getElementById("btn-add-driver");
  if (addBtn) addBtn.addEventListener("click", () => openFormModal("drivers", "add"));

  document.getElementById("modal-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const type = currentModalType, action = currentModalAction, id = currentModalId;
    const vehicleVal = document.getElementById("form-assigned_vehicle").value;
    const payload = {
      name: document.getElementById("form-name").value.trim(),
      phone: document.getElementById("form-phone").value.trim(),
      email: document.getElementById("form-email").value.trim(),
      address: document.getElementById("form-address").value.trim(),
      license: document.getElementById("form-license").value.trim(),
      license_category: document.getElementById("form-license_category").value,
      license_expiry: document.getElementById("form-license_expiry").value || "",
      joining_date: document.getElementById("form-joining_date").value || "",
      experience: parseInt(document.getElementById("form-experience").value) || 0,
      safety_score: parseInt(document.getElementById("form-safety_score").value) || 100,
      assigned_vehicle_id: vehicleVal ? parseInt(vehicleVal) : null,
      status: document.getElementById("form-status").value,
      photo: document.getElementById("form-photo").value
    };
    try {
      let url = `/api/${type}`;
      let method = "POST";
      if (action === "edit") { url = `/api/${type}/${id}`; method = "PUT"; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) showToast(`Successfully ${action === "add" ? "created" : "updated"} driver profile`);
      else alert("Error: " + result.error);
    } catch (err) { alert("Error connecting to server."); }
    closeModal();
    await loadDatabase();
    renderTablePage("drivers");
  });

  document.getElementById("btn-delete-confirm").addEventListener("click", async function() {
    if (activeDeleteTarget) {
      const { type, id } = activeDeleteTarget;
      try {
        const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) showToast(`Deleted driver #${id}`);
        else alert("Error: " + result.error);
      } catch (err) { alert("Error connecting to server."); }
      closeDeleteModal();
      await loadDatabase();
      renderTablePage("drivers");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });

  const loggedIn = localStorage.getItem("transitops_logged_in");
  if (loggedIn !== "true") { window.location.href = "../login/login.html"; return; }

  await loadDatabase();
  renderTablePage("drivers");
  lucide.createIcons();

  // TOGGLE STAT buttons handlers
  const bindToggleBtn = (btnId, statusVal) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener("click", async () => {
        if (!selectedDriverId) return;
        const driver = db.drivers.find(d => d.id == selectedDriverId);
        if (!driver) return;
        
        try {
          const payload = {
            name: driver.name,
            phone: driver.phone,
            email: driver.email,
            address: driver.address,
            license: driver.license,
            license_category: driver.license_category,
            license_expiry: driver.license_expiry,
            joining_date: driver.joining_date,
            experience: driver.experience,
            safety_score: driver.safety_score,
            status: statusVal
          };
          const res = await fetch(`/api/drivers/${selectedDriverId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const result = await res.json();
          if (result.success) {
            showToast(`Driver status updated to ${statusVal}`);
            await loadDatabase();
            renderTablePage("drivers");
            
            // Reset panel
            document.getElementById("selected-driver-display-name").textContent = "TOGGLE STAT (Select a driver row below to activate)";
            const buttons = ["btn-toggle-available", "btn-toggle-ontrip", "btn-toggle-offduty", "btn-toggle-suspended"];
            buttons.forEach(btnId => {
              const b = document.getElementById(btnId);
              if (b) {
                b.disabled = true;
                b.style.opacity = "0.5";
                b.style.cursor = "not-allowed";
              }
            });
            selectedDriverId = null;
          } else {
            alert("Error updating status: " + result.error);
          }
        } catch (err) {
          alert("Error connecting to server.");
        }
      });
    }
  };

  bindToggleBtn("btn-toggle-available", "AVAILABLE");
  bindToggleBtn("btn-toggle-ontrip", "ON_TRIP");
  bindToggleBtn("btn-toggle-offduty", "OFF_DUTY");
  bindToggleBtn("btn-toggle-suspended", "SUSPENDED");
});
