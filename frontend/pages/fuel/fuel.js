// TransitOps - Fuel Module
window.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-page") === "fuel");
  });

  setupFilterListeners();

  const addBtn = document.getElementById("btn-add-fuel");
  if (addBtn) addBtn.addEventListener("click", () => openFormModal("fuel", "add"));

  document.getElementById("modal-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const type = currentModalType, action = currentModalAction, id = currentModalId;
    const driverVal = document.getElementById("form-driver").value;
    const payload = {
      vehicleId: parseInt(document.getElementById("form-vehicle").value),
      driverId: driverVal ? parseInt(driverVal) : null,
      liters: parseFloat(document.getElementById("form-liters").value) || 0,
      cost: parseFloat(document.getElementById("form-cost").value) || 0,
      fuel_type: document.getElementById("form-fuel_type").value,
      odometer: parseInt(document.getElementById("form-odometer").value) || 0,
      date: document.getElementById("form-date").value,
      provider: document.getElementById("form-provider").value.trim()
    };
    try {
      let url = `/api/${type}`;
      let method = "POST";
      if (action === "edit") { url = `/api/${type}/${id}`; method = "PUT"; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) showToast(`Successfully ${action === "add" ? "logged" : "updated"} fuel fill-up`);
      else alert("Error: " + result.error);
    } catch (err) { alert("Error connecting to server."); }
    closeModal();
    await loadDatabase();
    renderTablePage("fuel");
  });

  document.getElementById("btn-delete-confirm").addEventListener("click", async function() {
    if (activeDeleteTarget) {
      const { type, id } = activeDeleteTarget;
      try {
        const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) showToast(`Deleted fuel record #${id}`);
        else alert("Error: " + result.error);
      } catch (err) { alert("Error connecting to server."); }
      closeDeleteModal();
      await loadDatabase();
      renderTablePage("fuel");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });

  const loggedIn = localStorage.getItem("transitops_logged_in");
  if (loggedIn !== "true") { window.location.href = "../login/login.html"; return; }

  await loadDatabase();
  renderTablePage("fuel");
  lucide.createIcons();
});
