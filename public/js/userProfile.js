// JS extracted from views/users/userProfile.ejs
// Expects `window.currentUser` to be set by the server in a small inline script
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("followBtn");
    if (btn) {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        var targetId = btn.getAttribute("data-user-id");
        try {
            var resp = await fetch("/user/" + targetId + "/follow", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
                Accept: "application/json",
              },
              credentials: "same-origin",
            });
          if (!resp.ok) {
            var err = await resp.json().catch(function () {
              return { error: "Request failed" };
            });
            alert(err && err.error ? err.error : "Action failed");
            return;
          }
          var data = await resp.json();
          if (data.status === "followed") {
            btn.textContent = "Unfollow";
            btn.classList.remove("btn-danger");
            btn.classList.add("btn-outline-danger");
            try {
              window.currentUser = window.currentUser || {};
              window.currentUser.following = window.currentUser.following || [];
              if (
                !window.currentUser.following.some(function (f) {
                  return String(f) === String(targetId);
                })
              ) {
                window.currentUser.following.push(targetId);
              }
              if (window.currentUser.sentFollowRequests) {
                window.currentUser.sentFollowRequests = window.currentUser.sentFollowRequests.filter(function (f) { return String(f) !== String(targetId); });
              }
            } catch (e) {}
          } else if (data.status === "unfollowed") {
            btn.textContent = "Follow";
            btn.classList.remove("btn-outline-danger");
            btn.classList.add("btn-danger");
            try {
              if (window.currentUser && window.currentUser.following) {
                window.currentUser.following =
                  window.currentUser.following.filter(function (f) {
                    return String(f) !== String(targetId);
                  });
              }
            } catch (e) {}
          }

          // handle private account request state
          if (data.status === "requested") {
            btn.textContent = "Cancel Request";
            btn.classList.remove("btn-danger");
            btn.classList.add("btn-outline-secondary");
            try {
              window.currentUser = window.currentUser || {};
              window.currentUser.sentFollowRequests = window.currentUser.sentFollowRequests || [];
              if (!window.currentUser.sentFollowRequests.some(function (f) { return String(f) === String(targetId); })) {
                window.currentUser.sentFollowRequests.push(targetId);
              }
            } catch (e) {}
          } else if (data.status === "cancelled") {
            btn.textContent = "Follow";
            btn.classList.remove("btn-outline-secondary");
            btn.classList.add("btn-danger");
            try {
              if (window.currentUser && window.currentUser.sentFollowRequests) {
                window.currentUser.sentFollowRequests = window.currentUser.sentFollowRequests.filter(function (f) { return String(f) !== String(targetId); });
              }
            } catch (e) {}
          }
        } catch (err) {
          console.error(err);
          alert("Please login to continue.");
        }
      });
    }

    // Tabs logic
    function showTab(name, btn) {
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.remove("active");
        t.style.display = "none";
      });
      var el = document.getElementById(name);
      if (el) {
        el.classList.add("active");
        el.style.display = "block";
      }
      document.querySelectorAll(".tab-button").forEach(function (b) {
        b.classList.remove("active");
      });
      if (btn && btn.classList) btn.classList.add("active");
    }

    // Expose showTab to inline onclick handlers
    window.showTab = showTab;

    // Initialize tabs: use hash if present, otherwise default to 'posts'
    var hash = window.location.hash
      ? window.location.hash.replace("#", "")
      : null;
    var initial = hash && document.getElementById(hash) ? hash : "posts";
    var initialBtn = document.querySelector(
      '.tab-button[data-tab="' + initial + '"]',
    );
    showTab(initial, initialBtn);
  });
})();
