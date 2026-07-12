// TransitOps - Login Module
window.addEventListener("DOMContentLoaded", () => {
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
        localStorage.setItem("transitops_user_role", result.role);
        localStorage.setItem("transitops_user_name", result.name || "User");
        localStorage.setItem("transitops_user_email", result.email || email);
        showToast("Sign in successful. Welcome back!");
        
        let targetPage = "dashboard";
        if (result.role === "Fleet Manager") targetPage = "vehicles";
        else if (result.role === "Safety Officer") targetPage = "drivers";
        else if (result.role === "Financial Analyst") targetPage = "fuel";
        
        setTimeout(() => { window.location.href = `../${targetPage}/${targetPage}.html`; }, 500);
      } else {
        alert("Incorrect credentials. Please verify your email and password.");
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
