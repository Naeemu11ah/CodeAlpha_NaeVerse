(() => {
  "use strict";

  function showLoader() {
    const overlay = document.getElementById("loader-overlay");
    if (overlay) overlay.classList.remove("d-none");
  }

  const forms = document.querySelectorAll(".needs-validation");
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        } else {
          // valid; show loader while the request is processed
          showLoader();
        }
        form.classList.add("was-validated");
      },
      false,
    );
  });

  // also show loader when any form (not only validated ones) submits
  // this covers delete-confirm forms and other simple POSTs
  document.addEventListener("submit", (e) => {
    // Skip showing loader for lightweight AJAX-like forms (class `like-form`)
    const tgt = e.target;
    if (tgt && tgt.classList && tgt.classList.contains("like-form")) return;
    // if the event has not been prevented yet, show loader
    if (!e.defaultPrevented) showLoader();
  });

  /* ------------------------------------------------------------------------
     theme toggle helpers
  */

  function updateThemeIcon() {
    const icons = document.querySelectorAll(
      "#theme-icon, #theme-icon-offcanvas",
    );
    icons.forEach((icon) => {
      if (!icon) return;
      if (document.body.classList.contains("dark-mode")) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
        icon.title = "Switch to light mode";
        // update associated text labels if present
        const txt = document.getElementById("theme-text");
        const txtOff = document.getElementById("theme-text-offcanvas");
        if (txt) txt.innerText = "Light mode";
        if (txtOff) txtOff.innerText = "Light mode";
      } else {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
        icon.title = "Switch to dark mode";
        const txt = document.getElementById("theme-text");
        const txtOff = document.getElementById("theme-text-offcanvas");
        if (txt) txt.innerText = "Dark mode";
        if (txtOff) txtOff.innerText = "Dark mode";
      }
    });
  }

  function setTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("theme", theme);
    updateThemeIcon();
  }

  function toggleTheme() {
    // only spin the icon itself, not the containing button/link
    const icons = document.querySelectorAll(
      "#theme-icon, #theme-icon-offcanvas",
    );
    icons.forEach((icon) => {
      if (icon) {
        icon.classList.add("theme-toggle-spin");
        setTimeout(() => icon.classList.remove("theme-toggle-spin"), 500);
      }
    });
    const dark = document.body.classList.toggle("dark-mode");
    setTheme(dark ? "dark" : "light");
  }

  document.addEventListener("DOMContentLoaded", () => {
    // initialize theme on page load (light by default)
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
    // mark active navbar/offcanvas links based on current path
    function markActiveNav() {
      const path = location.pathname || "/";
      // desktop nav links
      document.querySelectorAll(".nav-link").forEach((a) => {
        try {
          const href = a.getAttribute("href");
          if (!href) return;
          if (href === "/" ? path === "/" : path.startsWith(href)) {
            a.classList.add("active");
          } else {
            a.classList.remove("active");
          }
        } catch (e) {}
      });
      // offcanvas/mobile links
      document.querySelectorAll(".offcanvas_anchorTags").forEach((a) => {
        try {
          const href = a.getAttribute("href");
          if (!href || href === "#") return;
          if (href === "/" ? path === "/" : path.startsWith(href)) {
            a.classList.add("active");
          } else {
            a.classList.remove("active");
          }
        } catch (e) {}
      });
    }
    markActiveNav();
    const btns = document.querySelectorAll(
      "#theme-toggle, #theme-toggle-offcanvas",
    );
    btns.forEach((btn) => {
      if (btn) btn.addEventListener("click", toggleTheme);
    });
  });

  // Like form handler: submit via fetch to avoid page reload and loader
  document.addEventListener("submit", async (e) => {
    try {
      const form = e.target;
      if (!form || !form.classList || !form.classList.contains("like-form")) return;
      e.preventDefault();
      // find heart icon and count span
      const btn = form.querySelector("button[type=submit]");
      const icon = btn && btn.querySelector("i.fa-heart");
      const countEl = form.querySelector(".like-count");
      const origText = countEl ? countEl.innerText : null;

      const res = await fetch(form.action, {
        method: form.method.toUpperCase() || "POST",
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data) return;
      // update count
      if (typeof data.likesCount === "number" && countEl) {
        countEl.innerText = String(data.likesCount);
      }
      // update color by toggling `liked` class (CSS controls exact color)
      if (icon) {
        if (data.liked) icon.classList.add("liked");
        else icon.classList.remove("liked");
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  });
})();
