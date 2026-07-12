// TransitOps - Fuel Module
window.addEventListener("DOMContentLoaded", async () => {
  // Highlight active sidebar link
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-page") === "fuel");
  });

  // Setup filter listeners for this module
  setupFilterListeners();

  // Add button
  const addBtn = document.getElementById("btn-add-fuel");
  if (addBtn) addBtn.addEventListener("click", () => openFormModal("fuel", "add"));

  // Modal form submit
  document.getElementById("modal-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const type = currentModalType, action = currentModalAction, id = currentModalId;
    let payload = {};
    payload = { vehicleId: parseInt(document.getElementById("form-vehicle").value), liters: parseFloat(document.getElementById("form-liters").value), cost: parseFloat(document.getElementById("form-cost").value), date: document.getElementById("form-date").value, provider: document.getElementById("form-provider").value.trim() };
    try {
      let url = `/api/${type}`;
      let method = "POST";
      if (action === "edit") { url = `/api/${type}/${id}`; method = "PUT"; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) showToast(`Successfully ${action === "add" ? "created" : "updated"} record`);
      else alert("Error: " + result.error);
    } catch (err) { alert("Error connecting to server."); }
    closeModal();
    await loadDatabase();
    renderTablePage("fuel");
  });

  // Delete confirm
  document.getElementById("btn-delete-confirm").addEventListener("click", async function() {
    if (activeDeleteTarget) {
      const { type, id } = activeDeleteTarget;
      try {
        const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) showToast(`Deleted record #${id}`);
        else alert("Error: " + result.error);
      } catch (err) { alert("Error connecting to server."); }
      closeDeleteModal();
      await loadDatabase();
      renderTablePage("fuel");
    }
  });

  // Logout
  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });

  // Auth check
  const loggedIn = localStorage.getItem("transitops_logged_in");
  if (loggedIn !== "true") { window.location.href = "../login/login.html"; return; }

  await loadDatabase();
  renderTablePage("fuel");
  lucide.createIcons();
});
