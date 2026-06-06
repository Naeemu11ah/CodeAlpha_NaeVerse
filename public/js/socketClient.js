// socketClient.js — connects current logged-in user to Socket.IO and synchronizes notifications
(function () {
  async function init() {
    if (!window.__CURRENT_USER__ || !window.__CURRENT_USER__._id) return;
    const socket = io();
    // join room for this user
    socket.emit("join", { userId: window.__CURRENT_USER__._id });

    // helper to handle possibly duplicated badge elements
    function getBadges() {
      try {
        return Array.from(document.querySelectorAll('#notif-badge')) || [];
      } catch (e) {
        return [];
      }
    }

    function setBadgeCount(count) {
      const badges = getBadges();
      if (!badges.length) return;
      badges.forEach((badge) => {
        try {
          badge.textContent = String(count);
          if (count > 0) badge.classList.remove('d-none');
          else badge.classList.add('d-none');
        } catch (e) {}
      });
    }

    // fetch initial notifications (unread count)
    try {
      const resp = await fetch("/notifications", {
        headers: { Accept: "application/json" },
      });
      if (resp.ok) {
        const data = await resp.json();
        const notifications = data.notifications || [];
        const unread = notifications.filter((n) => !n.isRead).length || 0;
        setBadgeCount(unread);
      }
    } catch (err) {
      // ignore network errors
    }

    socket.on("notification", (notif) => {
      try {
        document.dispatchEvent(
          new CustomEvent("realtimeNotification", { detail: notif }),
        );
        const badges = getBadges();
        if (badges.length) {
          const current = parseInt(badges[0].textContent || "0", 10) || 0;
          setBadgeCount(current + 1);
        }
      } catch (e) {
        console.error(e);
      }
    });

    // removal of a notification (e.g., friend request cancelled)
    socket.on("notification_remove", (payload) => {
      try {
        document.dispatchEvent(new CustomEvent("realtimeNotificationRemove", { detail: payload }));
        const badges = getBadges();
        if (badges.length) {
          const current = parseInt(badges[0].textContent || "0", 10) || 0;
          const newVal = Math.max(0, current - 1);
          setBadgeCount(newVal);
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
