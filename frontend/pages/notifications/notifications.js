// TransitOps - Notifications Module

async function renderNotificationsPage() {
  const container = document.getElementById("notifications-list-container");
  if (!container) return;

  const searchVal = document.getElementById("notifications-search").value.toLowerCase().trim();
  const filterVal = document.getElementById("notifications-filter-status").value;

  // Filter local database
  let list = db.notifications;

  if (filterVal === "UNREAD") {
    list = list.filter(n => !n.read);
  } else if (filterVal === "READ") {
    list = list.filter(n => n.read);
  }

  if (searchVal) {
    list = list.filter(n => 
      n.title.toLowerCase().includes(searchVal) || 
      n.message.toLowerCase().includes(searchVal) || 
      n.type.toLowerCase().includes(searchVal)
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="card" style="padding:40px;text-align:center;">
        <i data-lucide="bell-off" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:16px;margin-left:auto;margin-right:auto;display:block;"></i>
        <h3 style="font-size:16px;font-weight:600;margin-bottom:6px;">No Alerts Found</h3>
        <p style="color:var(--text-muted);font-size:13px;">No notifications match your current search/filters.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = "";
  list.forEach(n => {
    // Determine icon name based on type
    let iconName = "bell";
    if (n.type.includes("Expiry")) iconName = "alert-triangle";
    else if (n.type.includes("Due")) iconName = "clock";
    else if (n.type.includes("Completed")) iconName = "check-circle";
    else if (n.type.includes("Cancelled")) iconName = "x-circle";
    else if (n.type.includes("Fuel")) iconName = "droplet";

    html += `
      <div class="notification-card ${n.read ? '' : 'unread'}" data-type="${n.type}" data-id="${n.id}">
        <div class="notification-header">
          <div class="notification-title-block">
            <div class="notification-icon">
              <i data-lucide="${iconName}" style="width:16px;height:16px;"></i>
            </div>
            <span class="notification-title">${n.title}</span>
            ${n.read ? '' : '<span class="badge-unread">New</span>'}
          </div>
          <div class="notification-actions">
            ${n.read ? '' : `<button class="btn-notif-action mark-read-btn" onclick="markAsRead(${n.id})" title="Mark as Read"><i data-lucide="check" style="width:14px;height:14px;"></i></button>`}
            <button class="btn-notif-action delete-notif-btn" onclick="deleteNotification(${n.id})" title="Dismiss"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
          </div>
        </div>
        <p class="notification-body">${n.message}</p>
        <div class="notification-footer">
          <span>Category: <strong>${n.type}</strong></span>
          <span>Logged: ${n.date}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  lucide.createIcons();
}

async function markAsRead(id) {
  try {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true })
    });
    if (res.ok) {
      showToast("Alert marked as read");
      await loadDatabase();
      renderNotificationsPage();
    }
  } catch (err) {
    console.error("Error marking read:", err);
  }
}

async function deleteNotification(id) {
  try {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      showToast("Notification dismissed");
      await loadDatabase();
      renderNotificationsPage();
    }
  } catch (err) {
    console.error("Error deleting notification:", err);
  }
}

// Mark all as read
async function markAllRead() {
  const unread = db.notifications.filter(n => !n.read);
  if (unread.length === 0) {
    showToast("All notifications are already read");
    return;
  }
  showToast("Marking all notifications as read...");
  try {
    await Promise.all(unread.map(n => 
      fetch(`/api/notifications/${n.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true })
      })
    ));
    await loadDatabase();
    renderNotificationsPage();
    showToast("All alerts marked as read");
  } catch (err) {
    console.error("Error marking all read:", err);
  }
}

// --- INIT ---
window.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("transitops_logged_in") !== "true") {
    window.location.href = "../login/login.html";
    return;
  }

  await loadDatabase();
  renderNotificationsPage();
  lucide.createIcons();

  // Listeners
  document.getElementById("notifications-search").addEventListener("input", renderNotificationsPage);
  document.getElementById("notifications-filter-status").addEventListener("change", renderNotificationsPage);
  document.getElementById("btn-mark-all-read").addEventListener("click", markAllRead);

  // Logout
  document.getElementById("btn-logout").addEventListener("click", function() {
    localStorage.removeItem("transitops_logged_in");
    window.location.href = "../login/login.html";
  });
});
