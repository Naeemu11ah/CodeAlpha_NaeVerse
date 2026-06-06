// notifications.js — handle realtimeNotification events and update Activity UI
(function () {
  async function ensureSenderInfo(n) {
    if (!n || !n.sender) return n;
    try {
      const raw = (n.sender.name || n.sender.username || "") + "";
      if (raw.trim()) return n; // already have a name
    } catch (e) {
      // continue to try fetching
    }
    const id = typeof n.sender === "string" ? n.sender : n.sender._id || null;
    if (!id) return n;
    try {
      const resp = await fetch(`/api/user/${id}`, {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) return n;
      const data = await resp.json();
      if (data) {
        n.sender = Object.assign({}, n.sender || {}, {
          _id: data._id,
          name: data.name || data.username || "",
          username: data.username || "",
          profilePic:
            data.profilePic || data.profilePic || "/assets/userProfilePic.png",
        });
      }
    } catch (err) {
      // ignore fetch errors
    }
    return n;
  }
  function renderNotificationCard(n) {
    const senderPic = (function () {
      if (!n.sender) return "/assets/userProfilePic.png";
      const pp = n.sender.profilePic;
      if (!pp) return "/assets/userProfilePic.png";
      return typeof pp === "string"
        ? pp
        : pp.url || "/assets/userProfilePic.png";
    })();

    let senderName = "Someone";
    try {
      if (n.sender) {
        const raw = (n.sender.name || n.sender.username || "") + "";
        const trimmed = raw.trim();
        if (trimmed) senderName = trimmed;
      }
    } catch (e) {
      senderName = "Someone";
    }
    const time = new Date(n.createdAt).toLocaleString();
    let message = "";
    let thumb = "";
    if (n.type === "like") {
      message = `<span class="text-reset"><strong class="fw-semibold d-inline text-reset">${senderName}</strong> liked your post</span>`;
      if (n.post && n.post.thumbnail) {
        thumb = `<img src="${n.post.thumbnail}" style="width:48px;height:48px;object-fit:cover"/>`;
      } else if (n.post && n.post.media && n.post.media.length) {
        const m = n.post.media[0];
        if (m && m.mediaType === "video") {
          thumb = `<video src="${m.url}" style="width:48px;height:48px;object-fit:cover" muted preload="metadata"></video>`;
        } else if (m && m.url) {
          thumb = `<img src="${m.url}" style="width:48px;height:48px;object-fit:cover"/>`;
        } else {
          thumb = "";
        }
      } else {
        thumb = "";
      }
    } else if (n.type === "comment") {
      const snippet =
        n.commentSnippet ||
        (n.commentText || "").split(/\s+/).slice(0, 3).join(" ");
      message = `<span class="text-reset"><strong class="fw-semibold d-inline text-reset">${senderName}</strong> commented: ${snippet}</span>`;
      if (n.post && n.post.thumbnail) {
        thumb = `<img src="${n.post.thumbnail}" style="width:48px;height:48px;object-fit:cover"/>`;
      } else if (n.post && n.post.media && n.post.media.length) {
        const m = n.post.media[0];
        if (m && m.mediaType === "video") {
          thumb = `<video src="${m.url}" style="width:48px;height:48px;object-fit:cover" muted preload="metadata"></video>`;
        } else if (m && m.url) {
          thumb = `<img src="${m.url}" style="width:48px;height:48px;object-fit:cover"/>`;
        } else {
          thumb = "";
        }
      } else {
        thumb = "";
      }
    } else if (n.type === "follow") {
      message = `<span class="text-reset"><strong class="fw-semibold d-inline text-reset">${senderName}</strong> started following you</span>`;
    } else if (n.type === "follow_request") {
      message = `<div class="d-flex flex-wrap gap-2"><strong class="fw-semibold d-inline text-reset">${senderName}</strong><span class="ms-1">requested to follow you</span><div class="d-flex flex-wrap gap-2 ms-2"><button class="btn btn-sm btn-primary" data-action="follow-approve" data-user="${
        n.sender && n.sender._id
      }">Approve</button><button class="btn btn-sm btn-outline-danger ms-2" data-action="follow-reject" data-user="${
        n.sender && n.sender._id
      }">Decline</button></div></div>`;
    } else if (n.type === "friend_request") {
      message = `<span class="text-reset"><strong class="fw-semibold d-inline text-reset">${senderName}</strong> sent you a friend request</span>`;
      message += ` <button class="btn btn-sm btn-success ms-2" data-action="friend-accept" data-request="${n.request}">Accept</button>`;
      message += ` <button class="btn btn-sm btn-outline-danger ms-2" data-action="friend-reject" data-request="${n.request}">Reject</button>`;
    } else if (n.type === "friend_accept") {
      message = `<span class="text-reset"><strong class="fw-semibold d-inline text-reset">${senderName}</strong> accepted your friend request</span>`;
    }

    return `<div class="card mb-2 notification-card ${
      n.isRead ? "border border-secondary" : "border border-2 border-primary"
    }" data-id="${n._id}">
      <div class="card-body d-flex gap-3 align-items-center">
        <img src="${senderPic}" alt="pic" class="rounded-circle" style="width:48px;height:48px;object-fit:cover">
        <div class="flex-grow-1">
          <div class="small text-secondary">${time}</div>
          <div>${message}</div>
        </div>
        <div>${thumb}</div>
      </div>
    </div>`;
  }

  async function markAsRead(id) {
    try {
      const resp = await fetch(`/notifications/${id}/mark-read`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!resp.ok) return;
      const el = document.querySelector(`.notification-card[data-id="${id}"]`);
      if (el) {
        el.classList.remove("border-2", "border-primary");
        el.classList.add("border", "border-secondary");
      }
      // decrement badge(s) — update all matching badge elements (desktop + mobile)
      const badges = Array.from(document.querySelectorAll('#notif-badge')) || [];
      if (badges.length) {
        badges.forEach(function (badge) {
          try {
            const current = parseInt(badge.textContent || "0", 10) || 0;
            const newVal = Math.max(0, current - 1);
            badge.textContent = String(newVal);
            if (newVal === 0) badge.classList.add("d-none");
          } catch (e) {}
        });
      }
    } catch (err) {}
  }

  async function handleActionClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (action === "follow-approve") {
      const userId = btn.getAttribute("data-user");
      // send approve for follow request
      try {
        const path = `/user/${window.__CURRENT_USER__._id}/follow/approve/${userId}`;
        const resp = await fetch(path, { method: "POST" });
        if (resp.ok) {
          const card = btn.closest(".notification-card");
          if (card) card.remove();
        }
      } catch (err) {}
    } else if (action === "follow-reject") {
      const userId = btn.getAttribute("data-user");
      try {
        const path = `/user/${window.__CURRENT_USER__._id}/follow/reject/${userId}`;
        const resp = await fetch(path, { method: "POST" });
        if (resp.ok) {
          // remove the whole notification card
          const card = btn.closest(".notification-card");
          if (card) card.remove();
        }
      } catch (err) {}
    } else if (action === "friend-accept" || action === "friend-reject") {
      const requestId = btn.getAttribute("data-request");
      const path =
        action === "friend-accept"
          ? `/friends/${requestId}/accept`
          : `/friends/${requestId}/reject`;
      try {
        const resp = await fetch(path, { method: "POST" });
        if (resp.ok) {
          // remove card
          const card = btn.closest(".notification-card");
          if (card) card.remove();
        }
      } catch (err) {}
    }
  }

  document.addEventListener("realtimeNotification", async function (e) {
    const n = e.detail;
    // ensure we have sender details (name/profilePic) to render correctly
    await ensureSenderInfo(n);
    // prepend card if activity list exists
    const list = document.querySelector(".notifications-list");
    if (list) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = renderNotificationCard(n);
      list.prepend(wrapper.firstElementChild);
    }
    // If this is a follow approval notification and viewer is on that profile, update follow button
    try {
      if (n && n.type === "follow" && n.sender && n.sender._id) {
        const followBtn = document.getElementById("followBtn");
        if (
          followBtn &&
          String(followBtn.getAttribute("data-user-id")) ===
            String(n.sender._id)
        ) {
          followBtn.textContent = "Unfollow";
          followBtn.classList.remove("btn-danger");
          followBtn.classList.add("btn-outline-danger");
          try {
            window.currentUser = window.currentUser || {};
            window.currentUser.following = window.currentUser.following || [];
            if (
              !window.currentUser.following.some(function (f) {
                return String(f) === String(n.sender._id);
              })
            ) {
              window.currentUser.following.push(n.sender._id);
            }
            // remove any pending sentFollowRequests for this user
            if (window.currentUser.sentFollowRequests) {
              window.currentUser.sentFollowRequests =
                window.currentUser.sentFollowRequests.filter(function (f) {
                  return String(f) !== String(n.sender._id);
                });
            }
          } catch (e) {}
        }
      }
    } catch (err) {}
    // show a small toast/alert
    try {
      const toastArea = document.getElementById("notif-toast-area");
      if (toastArea) {
        const div = document.createElement("div");
        div.className = "alert alert-info alert-dismissible fade show";
        div.role = "alert";
        let toastSender = "Someone";
        try {
          if (n.sender) {
            const raw = (n.sender.name || n.sender.username || "") + "";
            const t = raw.trim();
            if (t) toastSender = t;
          }
        } catch (err) {
          toastSender = "Someone";
        }

        div.innerHTML = `<strong>${toastSender}</strong> ${
          n.type === "like"
            ? "liked your post"
            : n.type === "comment"
            ? "commented on your post"
            : n.type
        } <button type="button" class="btn-close notif-toast-close" aria-label="Close" data-bs-dismiss="alert"></button>`;
        // replace default svg close with a text cross for consistent coloring
        const closeBtn = div.querySelector(".notif-toast-close");
        if (closeBtn) {
          closeBtn.innerHTML = "&times;";
        }
        toastArea.appendChild(div);
        setTimeout(() => {
          try {
            div.classList.remove("show");
            div.remove();
          } catch (e) {}
        }, 6000);
      }
    } catch (err) {}
  });

  // handle server-sent notification removals (e.g., friend request cancelled)
  document.addEventListener("realtimeNotificationRemove", function (e) {
    try {
      const payload = e.detail || {};
      const reqId = payload.request;
      const notifId = payload.notif;
      let removed = false;
      if (notifId) {
        const el = document.querySelector(
          `.notification-card[data-id="${notifId}"]`,
        );
        if (el) {
          el.remove();
          removed = true;
        }
      }
      if (!removed && reqId) {
        const btn = document.querySelector(`button[data-request="${reqId}"]`);
        if (btn) {
          const card = btn.closest(".notification-card");
          if (card) card.remove();
        }
      }
    } catch (err) {}
  });

  document.addEventListener("click", function (e) {
    // clicking a notification card marks it as read
    const card = e.target.closest(".notification-card");
    if (card) {
      const id = card.getAttribute("data-id");
      markAsRead(id);
    }
  });

  // Mark all notifications as read
  async function markAllRead() {
    try {
      const resp = await fetch("/notifications/mark-all", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!resp.ok) return;
      // update UI
      document
        .querySelectorAll(".notification-card.border-2.border-primary")
        .forEach(function (el) {
          el.classList.remove("border-2", "border-primary");
          el.classList.add("border", "border-secondary");
        });
      // set all notification badges to zero (desktop + mobile)
      const badgesAll = Array.from(document.querySelectorAll('#notif-badge')) || [];
      badgesAll.forEach(function (badge) {
        try {
          badge.textContent = "0";
          badge.classList.add("d-none");
        } catch (e) {}
      });
    } catch (err) {
      // ignore
    }
  }

  const markAllBtn = document.getElementById("markAllReadBtn");
  if (markAllBtn)
    markAllBtn.addEventListener("click", function () {
      markAllRead();
    });

  document.addEventListener("click", handleActionClick);
})();
