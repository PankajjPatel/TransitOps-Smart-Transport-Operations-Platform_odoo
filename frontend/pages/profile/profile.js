// TransitOps - User Profile Module

function loadProfileDetails() {
  const name = localStorage.getItem("transitops_user_name") || "Girjesh Adarsh";
  const email = localStorage.getItem("transitops_user_email") || "admin@transitops.com";
  const role = localStorage.getItem("transitops_user_role") || "Administrator";

  document.getElementById("profile-fullname").textContent = name;
  document.getElementById("profile-role").textContent = role;
  document.getElementById("profile-email").textContent = email;
  document.getElementById("profile-role-display").textContent = role;

  const initials = name.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase();
  document.getElementById("profile-avatar-large").textContent = initials;
}

// --- INIT ---
window.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("transitops_logged_in") !== "true") {
    window.location.href = "../login/login.html";
    return;
  }

  await loadDatabase();
  enforceRBAC();
  loadProfileDetails();
  lucide.createIcons();

  // Change Password Form
  document.getElementById("form-profile-password").addEventListener("submit", async function(e) {
    e.preventDefault();
    const old_password = document.getElementById("profile-old-pass").value;
    const new_password = document.getElementById("profile-new-pass").value;
    const confirm_password = document.getElementById("profile-confirm-pass").value;
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
        showToast("Password updated successfully");
        e.target.reset();
      } else {
        alert("Error changing password: " + (result.error || "Incorrect password"));
      }
    } catch (err) {
      alert("Error connecting to server.");
    }
  });

  // Logout
  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });
});
