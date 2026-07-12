// TransitOps - Settings Module

function loadSettingsForms() {
  const settings = db.settings;
  if (!settings) return;

  document.getElementById("settings-platform-name").value = settings.platformName || "TransitOps";
  document.getElementById("settings-timezone").value = settings.timezone || "GMT+5:30";
  document.getElementById("settings-currency").value = settings.currency || "USD";
  
  document.getElementById("settings-company-name").value = settings.companyName || "";
  document.getElementById("settings-company-email").value = settings.companyEmail || "";
  document.getElementById("settings-company-address").value = settings.companyAddress || "";
  
  document.getElementById("settings-notify-maintenance").checked = settings.notifyMaintenance === true || settings.notifyMaintenance === "true";
  document.getElementById("settings-notify-trip").checked = settings.notifyTrip === true || settings.notifyTrip === "true";
  document.getElementById("settings-notify-expenses").checked = settings.notifyExpenses === true || settings.notifyExpenses === "true";
}

// --- INIT ---
window.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("transitops_logged_in") !== "true") {
    window.location.href = "../login/login.html";
    return;
  }

  await loadDatabase();
  loadSettingsForms();
  lucide.createIcons();

  // Tab switching logic
  document.querySelectorAll(".settings-nav-item").forEach(item => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".settings-nav-item").forEach(i => i.classList.remove("active"));
      document.querySelectorAll(".settings-content-pane").forEach(p => p.classList.remove("active"));
      
      item.classList.add("active");
      const paneId = item.getAttribute("data-pane");
      document.getElementById(paneId).classList.add("active");
    });
  });

  // Save General settings
  document.getElementById("form-settings-general").addEventListener("submit", async function(e) {
    e.preventDefault();
    const payload = {
      platformName: document.getElementById("settings-platform-name").value.trim(),
      timezone: document.getElementById("settings-timezone").value,
      currency: document.getElementById("settings-currency").value
    };
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("General system settings saved.");
        await loadDatabase();
        loadSettingsForms();
      }
    } catch (err) {
      alert("Error updating general settings.");
    }
  });

  // Save Company Profile
  document.getElementById("form-settings-profile").addEventListener("submit", async function(e) {
    e.preventDefault();
    const payload = {
      companyName: document.getElementById("settings-company-name").value.trim(),
      companyEmail: document.getElementById("settings-company-email").value.trim(),
      companyAddress: document.getElementById("settings-company-address").value.trim()
    };
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Company profile updated.");
        await loadDatabase();
        loadSettingsForms();
      }
    } catch (err) {
      alert("Error updating profile.");
    }
  });

  // Save Notifications
  document.getElementById("form-settings-notifications").addEventListener("submit", async function(e) {
    e.preventDefault();
    const payload = {
      notifyMaintenance: document.getElementById("settings-notify-maintenance").checked,
      notifyTrip: document.getElementById("settings-notify-trip").checked,
      notifyExpenses: document.getElementById("settings-notify-expenses").checked
    };
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Notifications preferences updated.");
        await loadDatabase();
        loadSettingsForms();
      }
    } catch (err) {
      alert("Error updating notifications.");
    }
  });

  // Security password Mock submission
  document.getElementById("form-settings-security").addEventListener("submit", function(e) {
    e.preventDefault();
    showToast("Administrative passwords updated successfully.");
    e.target.reset();
  });

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });
});
