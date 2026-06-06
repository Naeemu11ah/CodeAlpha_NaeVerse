// friends.js — handles friend request UI interactions on profile pages
(function () {
  async function sendRequest(toId, btn) {
    try {
      const resp = await fetch(`/friends/send/${toId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      });
      if (!resp.ok) {
        let err = null;
        try {
          err = await resp.json();
        } catch (e) {}
        if (resp.status === 401) {
          alert((err && err.error) || "Please login to continue.");
          return null;
        }
        return null;
      }
      const data = await resp.json();
      return data.request;
    } catch (err) {
      alert("Please login to continue.");
      return null;
    }
  }

  async function cancelRequest(requestId) {
    try {
      const resp = await fetch(`/friends/${requestId}/cancel`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          // not logged in
          alert("Please login to continue.");
        }
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  async function unfriendUser(targetId) {
    try {
      const resp = await fetch(`/friends/unfriend/${targetId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
      });
      if (!resp.ok) {
        if (resp.status === 401) alert("Please login to continue.");
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  async function acceptRequest(requestId) {
    try {
      const resp = await fetch(`/friends/${requestId}/accept`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
      });
      if (!resp.ok) {
        if (resp.status === 401) alert("Please login to continue.");
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  async function rejectRequest(requestId) {
    try {
      const resp = await fetch(`/friends/${requestId}/reject`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
      });
      if (!resp.ok) {
        if (resp.status === 401) alert("Please login to continue.");
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function createFriendButton(targetId, options = {}) {
    const btn = document.createElement("button");
    btn.id = "friendRequestBtn";
    btn.dataset.userId = targetId;
    btn.style.borderRadius = "50px";
    if (options.action === "unfriend") {
      btn.dataset.action = "unfriend";
      btn.className = "btn btn-outline-danger";
      btn.textContent = "Unfriend";
    } else if (options.action === "cancel") {
      btn.dataset.action = "cancel";
      btn.dataset.requestId = options.requestId || "";
      btn.className = "btn btn-outline-secondary";
      btn.textContent = "Cancel Request";
    } else {
      btn.className = "btn btn-primary";
      btn.textContent = "Add friend";
    }
    return btn;
  }

  document.addEventListener("click", async function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    // friend request button (Add/Cancel/Unfriend)
    if (btn.id === "friendRequestBtn") {
      const action = btn.dataset.action || "send";
      const userId = btn.dataset.userId;
      if (action === "send") {
        // send
        const req = await sendRequest(userId, btn);
        if (req && req._id) {
          btn.dataset.action = "cancel";
          btn.dataset.requestId = req._id;
          btn.classList.remove("btn-primary");
          btn.classList.add("btn-outline-secondary");
          btn.textContent = "Cancel Request";
        }
      } else if (action === "cancel") {
        const requestId = btn.dataset.requestId;
        const ok = await cancelRequest(requestId);
        if (ok) {
          btn.removeAttribute("data-action");
          btn.removeAttribute("data-request-id");
          btn.classList.remove("btn-outline-secondary");
          btn.classList.add("btn-primary");
          btn.textContent = "Add friend";
        }
      } else if (action === "unfriend") {
        const ok = await unfriendUser(userId);
        if (ok) {
          btn.removeAttribute("data-action");
          btn.className = "btn btn-primary";
          btn.textContent = "Add friend";
        }
      }
      return;
    }

    // accept friend request on profile (receiver)
    if (btn.id === "friendAcceptBtn") {
      const requestId = btn.dataset.requestId;
      const ok = await acceptRequest(requestId);
      if (ok) {
        // replace accept/reject with Unfriend button
        const container = btn.closest('.my-1') || btn.parentElement;
        const followBtn = document.getElementById('followBtn');
        const targetId = followBtn ? followBtn.dataset.userId : null;
        if (container && targetId) {
          // remove existing accept/reject
          const rejectBtn = document.getElementById('friendRejectBtn');
          if (rejectBtn) rejectBtn.remove();
          // remove accept button itself
          btn.remove();
          // insert unfriend button (if not present)
          let friendBtn = document.getElementById('friendRequestBtn');
          if (!friendBtn) {
            friendBtn = createFriendButton(targetId, { action: 'unfriend' });
            if (followBtn && followBtn.nextSibling) {
              followBtn.parentNode.insertBefore(friendBtn, followBtn.nextSibling);
            } else if (followBtn) {
              followBtn.parentNode.appendChild(friendBtn);
            }
          } else {
            friendBtn.dataset.action = 'unfriend';
            friendBtn.className = 'btn btn-outline-danger';
            friendBtn.textContent = 'Unfriend';
          }
        }
      }
      return;
    }

    // reject friend request on profile
    if (btn.id === "friendRejectBtn") {
      const requestId = btn.dataset.requestId;
      const ok = await rejectRequest(requestId);
      if (ok) {
        // remove accept/reject and show Add friend
        const container = btn.closest('.my-1') || btn.parentElement;
        const followBtn = document.getElementById('followBtn');
        const targetId = followBtn ? followBtn.dataset.userId : null;
        // remove accept button if present
        const acceptBtn = document.getElementById('friendAcceptBtn');
        if (acceptBtn) acceptBtn.remove();
        // remove this reject btn
        btn.remove();
        // create Add friend button
        if (container && targetId) {
          let friendBtn = document.getElementById('friendRequestBtn');
          if (!friendBtn) {
            friendBtn = createFriendButton(targetId, {});
            if (followBtn && followBtn.nextSibling) {
              followBtn.parentNode.insertBefore(friendBtn, followBtn.nextSibling);
            } else if (followBtn) {
              followBtn.parentNode.appendChild(friendBtn);
            }
          } else {
            friendBtn.removeAttribute('data-action');
            friendBtn.className = 'btn btn-primary';
            friendBtn.textContent = 'Add friend';
          }
        }
      }
      return;
    }
  });

  // no other exports
})();
