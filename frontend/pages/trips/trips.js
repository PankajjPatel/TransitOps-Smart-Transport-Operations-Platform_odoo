// TransitOps - Trips Module
window.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-page") === "trips");
  });

  setupFilterListeners();

  const addBtn = document.getElementById("btn-add-trip");
  if (addBtn) addBtn.addEventListener("click", () => openFormModal("trips", "add"));

  document.getElementById("modal-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const type = currentModalType, action = currentModalAction, id = currentModalId;
    const payload = {
      vehicleId: parseInt(document.getElementById("form-vehicle").value),
      driverId: parseInt(document.getElementById("form-driver").value),
      origin: document.getElementById("form-origin").value.trim(),
      destination: document.getElementById("form-destination").value.trim(),
      cargo_weight: parseFloat(document.getElementById("form-cargo_weight").value) || 0,
      planned_distance: parseFloat(document.getElementById("form-planned_distance").value) || 0,
      dispatch_date: document.getElementById("form-dispatch_date").value || null,
      arrival_date: document.getElementById("form-arrival_date").value || null,
      cost: parseFloat(document.getElementById("form-cost").value) || 0,
      date: document.getElementById("form-date").value,
      status: document.getElementById("form-status").value,
      remarks: document.getElementById("form-remarks").value.trim()
    };
    try {
      let url = `/api/${type}`;
      let method = "POST";
      if (action === "edit") { url = `/api/${type}/${id}`; method = "PUT"; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) showToast(`Successfully ${action === "add" ? "scheduled" : "updated"} trip`);
      else alert("Validation Error: " + result.error);
    } catch (err) { alert("Error connecting to server."); }
    closeModal();
    await loadDatabase();
    renderTablePage("trips");
  });

  document.getElementById("btn-delete-confirm").addEventListener("click", async function() {
    if (activeDeleteTarget) {
      const { type, id } = activeDeleteTarget;
      try {
        const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) showToast(`Deleted trip #${id}`);
        else alert("Error: " + result.error);
      } catch (err) { alert("Error connecting to server."); }
      closeDeleteModal();
      await loadDatabase();
      renderTablePage("trips");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });

  const loggedIn = localStorage.getItem("transitops_logged_in");
  if (loggedIn !== "true") { window.location.href = "../login/login.html"; return; }

  await loadDatabase();
  renderTablePage("trips");
  lucide.createIcons();
});
