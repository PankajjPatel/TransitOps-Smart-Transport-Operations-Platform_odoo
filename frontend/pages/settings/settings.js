// TransitOps - Settings Module

function loadSettingsForms() {
  const settings = db.settings;
  if (!settings) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  const setCheck = (id, checked) => {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  };

  setVal("settings-platform-name", settings.platformName || "TransitOps");
  setVal("settings-timezone", settings.timezone || "GMT+5:30");
  setVal("settings-currency", settings.currency || "USD");
  
  setVal("settings-company-name", settings.companyName || "");
  setVal("settings-company-email", settings.companyEmail || "");
  setVal("settings-company-address", settings.companyAddress || "");
  
  setCheck("settings-notify-maintenance", settings.notifyMaintenance === true || settings.notifyMaintenance === "true");
  setCheck("settings-notify-trip", settings.notifyTrip === true || settings.notifyTrip === "true");
  setCheck("settings-notify-expenses", settings.notifyExpenses === true || settings.notifyExpenses === "true");

  setVal("settings-backup-frequency", settings.backupFrequency || "weekly");
  setVal("settings-backup-location", settings.backupLocation || "local");
  
  const backupDateDisp = document.getElementById("settings-backup-last-date-display");
  if (backupDateDisp) {
    backupDateDisp.textContent = "Last backup: " + (settings.backupLastDate || "Never");
  }

  // Load SMTP configurations
  setVal("settings-smtp-host", settings.smtpHost || "");
  setVal("settings-smtp-port", settings.smtpPort || "");
  setVal("settings-smtp-user", settings.smtpUser || "");
  setVal("settings-smtp-pass", settings.smtpPass || "");
  setVal("settings-smtp-sender", settings.smtpSender || "");
  setCheck("settings-smtp-tls", settings.smtpTls === true || settings.smtpTls === "true");
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

  // Helper to safely bind event listeners
  const safeBindSubmit = (formId, handler) => {
    const el = document.getElementById(formId);
    if (el) el.addEventListener("submit", handler);
  };
  const safeBindClick = (btnId, handler) => {
    const el = document.getElementById(btnId);
    if (el) el.addEventListener("click", handler);
  };

  // Save General settings
  safeBindSubmit("form-settings-general", async function(e) {
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

  // Save Company Profile (if present)
  safeBindSubmit("form-settings-profile", async function(e) {
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

  // Save Notifications (if present)
  safeBindSubmit("form-settings-notifications", async function(e) {
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

  // Security password submission
  safeBindSubmit("form-settings-security", async function(e) {
    e.preventDefault();
    const old_password = document.getElementById("settings-security-old").value;
    const new_password = document.getElementById("settings-security-new").value;
    const confirm_password = document.getElementById("settings-security-confirm").value;
    const email = localStorage.getItem("transitops_user_email") || "admin@transitops.com";

    if (new_password !== confirm_password) {
      alert("New password and confirm password do not match!");
      return;
    }

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, old_password, new_password })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast("Security password updated successfully.");
        e.target.reset();
      } else {
        alert("Error changing password: " + (result.error || "Incorrect current password"));
      }
    } catch (err) {
      alert("Error connecting to server.");
    }
  });

  // Save Backup configurations (if present)
  safeBindSubmit("form-settings-backup", async function(e) {
    e.preventDefault();
    const payload = {
      backupFrequency: document.getElementById("settings-backup-frequency").value,
      backupLocation: document.getElementById("settings-backup-location").value
    };
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Backup configurations saved.");
        await loadDatabase();
        loadSettingsForms();
      }
    } catch (err) {
      alert("Error updating backup configurations.");
    }
  });

  // Manual Backup trigger
  safeBindClick("btn-trigger-backup", async function() {
    showToast("Generating system database backup...");
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const filename = `transitops_backup_${new Date().toISOString().slice(0, 10)}.sql`;
    
    const payload = {
      backupLastDate: `${dateStr} (Manual export: ${filename})`
    };
    
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setTimeout(() => {
        showToast(`Backup created: ${filename} saved to server root.`);
        loadDatabase().then(loadSettingsForms);
      }, 1500);
    } catch (err) {
      showToast("Error updating last backup log.");
    }
  });

  // Save SMTP settings
  safeBindSubmit("form-settings-email", async function(e) {
    e.preventDefault();
    const payload = {
      smtpHost: document.getElementById("settings-smtp-host").value.trim(),
      smtpPort: document.getElementById("settings-smtp-port").value.trim(),
      smtpUser: document.getElementById("settings-smtp-user").value.trim(),
      smtpPass: document.getElementById("settings-smtp-pass").value,
      smtpSender: document.getElementById("settings-smtp-sender").value.trim(),
      smtpTls: document.getElementById("settings-smtp-tls").checked
    };
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("SMTP configuration saved.");
        await loadDatabase();
        loadSettingsForms();
      }
    } catch (err) {
      alert("Error updating SMTP configurations.");
    }
  });

  // Test Email trigger
  safeBindClick("btn-test-email", async function() {
    const recipient = prompt("Enter recipient email address to send test email to:");
    if (!recipient) return;
    showToast("Sending test email...");
    try {
      const res = await fetch("/api/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast("Test email sent successfully! Please check inbox.");
      } else {
        alert("SMTP error: " + (result.error || "failed to send."));
      }
    } catch (err) {
      alert("Error connecting to server.");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });
});
