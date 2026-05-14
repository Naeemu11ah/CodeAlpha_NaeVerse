// Tab switching logic extracted from views/searchedResults.ejs
(function () {
  document.addEventListener("DOMContentLoaded", function () {
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

    window.showTab = showTab;

    var hash = window.location.hash ? window.location.hash.replace("#", "") : null;
    var initial = hash && document.getElementById(hash) ? hash : "posts";
    var initialBtn = document.querySelector('.tab-button[data-tab="' + initial + '"]');
    showTab(initial, initialBtn);
  });
})();
