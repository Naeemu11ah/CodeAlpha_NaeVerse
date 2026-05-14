// Combined scripts for posts feed page (extracted from views/posts/allPosts.ejs)
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    // Scroll to and briefly highlight a selected post (if any)
    try {
      var sel = window.selectedPostId;
      if (sel) {
        var el =
          document.querySelector('.post[data-post-id="' + sel + '"]') ||
          document.getElementById("post-" + sel);
        if (el) {
          try {
            el.scrollIntoView({ behavior: "auto", block: "center" });
          } catch (e) {}
          el.classList.add("selected-post");
          setTimeout(function () {
            try {
              el.classList.remove("selected-post");
            } catch (e) {}
          }, 3000);
        }
      }
    } catch (e) {}

    // Handle various click interactions delegated on body
    document.body.addEventListener("click", function (e) {
      var likeUnauth = e.target.closest && e.target.closest(".like-unauth");
      if (likeUnauth) {
        e.preventDefault();
        alert("Please log in first to continue");
        return;
      }

      // Handle mobile top tabs 'Following' link when user is not logged in.
      var loginNav =
        e.target.closest && e.target.closest(".top-mobile-tabs .nav-link");
      if (loginNav) {
        var href = loginNav.getAttribute("href") || "";
        if (
          !window.currentUser &&
          (href.indexOf("javascript:void") === 0 ||
            loginNav.getAttribute("onclick"))
        ) {
          e.preventDefault();
          alert("Please log in first to continue");
          return;
        }
      }

      // Read-more toggle for post captions
      if (
        e.target &&
        e.target.classList &&
        e.target.classList.contains("read-more")
      ) {
        e.preventDefault();
        var container = e.target.closest(".post-info");
        if (!container) return;
        var teaser = container.querySelector(".caption-teaser");
        var full = container.querySelector(".caption-full");
        var ellipsis = container.querySelector(".caption-ellipsis");
        if (!full) return;
        if (full.classList.contains("d-none")) {
          full.classList.remove("d-none");
          if (teaser) teaser.classList.add("d-none");
          if (ellipsis) ellipsis.classList.add("d-none");
          e.target.textContent = "less";
        } else {
          full.classList.add("d-none");
          if (teaser) teaser.classList.remove("d-none");
          if (ellipsis) ellipsis.classList.remove("d-none");
          e.target.textContent = "more";
        }
      }
    });

    // Follow animation helper
    function animateAndHide(button) {
      var icon = button.querySelector("i") || button;
      var tick = document.createElement("span");
      tick.className = "follow-tick";
      tick.innerHTML = '<i class="fa-solid fa-check"></i>';
      // keep size and position
      try {
        icon.style.display = "none";
      } catch (e) {}
      button.appendChild(tick);
      requestAnimationFrame(function () {
        tick.classList.add("show");
      });
      setTimeout(function () {
        try {
          button.style.display = "none";
        } catch (e) {}
      }, 700);
    }

    // Handle follow (+) and follow button clicks
    document.addEventListener("click", async function (e) {
      var el =
        e.target.closest && e.target.closest(".follow-plus-btn, .follow-btn");
      if (!el) return;
      e.preventDefault();
      var userId = el.getAttribute("data-user-id");
      if (!userId) return;
      if (!window.currentUser) {
        alert("Please log in first to continue");
        return;
      }
      el.disabled = true;
      try {
        var resp = await fetch("/user/" + userId + "/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
        });
        if (!resp.ok) {
          var err = await resp.json().catch(function () {
            return { error: "Request failed" };
          });
          alert(err && err.error ? err.error : "Could not follow user");
          el.disabled = false;
          return;
        }
        var data = await resp.json();
        if (data.status === "followed") {
          try {
            window.currentUser = window.currentUser || {};
            window.currentUser.following = window.currentUser.following || [];
            if (
              !window.currentUser.following.some(function (f) {
                return String(f) === String(userId);
              })
            ) {
              window.currentUser.following.push(userId);
            }
          } catch (e) {}
          animateAndHide(el);
        } else {
          el.disabled = false;
        }
      } catch (err) {
        console.error(err);
        alert("Could not complete action.");
        el.disabled = false;
      }
    });
  });
})();
