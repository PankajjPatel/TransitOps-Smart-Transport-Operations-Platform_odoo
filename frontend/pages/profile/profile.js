// TransitOps - Profile Module
// Placeholder for module-specific logic
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('transitops_logged_in') !== 'true') { window.location.href = '../login/login.html'; return; }
  lucide.createIcons();
  document.getElementById('btn-logout').addEventListener('click', () => { localStorage.removeItem('transitops_logged_in'); window.location.href = '../login/login.html'; });
});
