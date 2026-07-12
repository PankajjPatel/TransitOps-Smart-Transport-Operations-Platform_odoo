// TransitOps - Login Module
window.addEventListener("DOMContentLoaded", () => {
  // Check if already logged in
  if (localStorage.getItem("transitops_logged_in") === "true") {
    window.location.href = "../dashboard/dashboard.html";
    return;
  }

  lucide.createIcons();

  // Login Form
  document.getElementById("login-form").addEventListener("submit", async function(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await res.json();
      if (res.ok && result.success) {
        localStorage.setItem("transitops_logged_in", "true");
        showToast("Sign in successful. Welcome back!");
        setTimeout(() => { window.location.href = "../dashboard/dashboard.html"; }, 500);
      } else {
        alert("Incorrect credentials. Please check details in the helper box.");
      }
    } catch (err) { alert("Error connecting to login server."); }
  });

  // Signup Form
  document.getElementById("signup-form").addEventListener("submit", async function(e) {
    e.preventDefault();
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const role = document.getElementById("signup-role").value;
    try {
      const res = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role }) });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast("Account created! Please sign in.");
        document.getElementById("signup-modal-overlay").classList.remove("active");
        document.getElementById("login-email").value = email;
        document.getElementById("login-password").value = password;
        document.getElementById("login-modal-overlay").classList.add("active");
      } else { alert("Registration failed: " + (result.error || "Unknown error")); }
    } catch (err) { alert("Error connecting to sign up server."); }
  });

  // Button triggers
  document.getElementById("btn-show-login").addEventListener("click", () => document.getElementById("login-modal-overlay").classList.add("active"));
  document.getElementById("btn-show-signup").addEventListener("click", () => document.getElementById("signup-modal-overlay").classList.add("active"));
  document.getElementById("btn-close-login").addEventListener("click", () => document.getElementById("login-modal-overlay").classList.remove("active"));
  document.getElementById("btn-close-signup").addEventListener("click", () => document.getElementById("signup-modal-overlay").classList.remove("active"));
  document.getElementById("btn-hero-cta").addEventListener("click", () => document.getElementById("signup-modal-overlay").classList.add("active"));
  document.getElementById("btn-hero-sec").addEventListener("click", () => document.getElementById("login-modal-overlay").classList.add("active"));
});
