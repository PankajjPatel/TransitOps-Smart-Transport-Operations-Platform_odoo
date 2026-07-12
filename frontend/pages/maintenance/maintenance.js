// TransitOps - Maintenance Module
window.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-page") === "maintenance");
  });

  setupFilterListeners();

  const addBtn = document.getElementById("btn-add-maintenance");
  if (addBtn) addBtn.addEventListener("click", () => openFormModal("maintenance", "add"));

  document.getElementById("modal-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const type = currentModalType, action = currentModalAction, id = currentModalId;
    const payload = {
      vehicleId: parseInt(document.getElementById("form-vehicle").value),
      type: document.getElementById("form-type").value,
      description: document.getElementById("form-description").value.trim(),
      workshop: document.getElementById("form-workshop").value.trim(),
      technician: document.getElementById("form-technician").value.trim(),
      cost: parseFloat(document.getElementById("form-cost").value) || 0,
      start_date: document.getElementById("form-start_date").value,
      end_date: document.getElementById("form-end_date").value || null,
      status: document.getElementById("form-status").value
    };
    try {
      let url = `/api/${type}`;
      let method = "POST";
      if (action === "edit") { url = `/api/${type}/${id}`; method = "PUT"; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) showToast(`Successfully ${action === "add" ? "logged" : "updated"} maintenance log`);
      else alert("Error: " + result.error);
    } catch (err) { alert("Error connecting to server."); }
    closeModal();
    await loadDatabase();
    renderTablePage("maintenance");
  });

  document.getElementById("btn-delete-confirm").addEventListener("click", async function() {
    if (activeDeleteTarget) {
      const { type, id } = activeDeleteTarget;
      try {
        const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) showToast(`Deleted maintenance record #${id}`);
        else alert("Error: " + result.error);
      } catch (err) { alert("Error connecting to server."); }
      closeDeleteModal();
      await loadDatabase();
      renderTablePage("maintenance");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });

  const loggedIn = localStorage.getItem("transitops_logged_in");
  if (loggedIn !== "true") { window.location.href = "../login/login.html"; return; }

  await loadDatabase();
  renderTablePage("maintenance");
  lucide.createIcons();
});
