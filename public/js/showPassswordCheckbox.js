(function () {
  // Desktop: bind directly to checkboxes present at page load (works for laptop)
  function initDesktopShowPassword() {
    const toggles = document.querySelectorAll('input.show-password, input.show-password-desktop');
    toggles.forEach(function (cb) {
      // Avoid double-binding
      if (cb.__showPwBound) return;
      cb.__showPwBound = true;
      cb.addEventListener('change', function () {
        const form = cb.closest('form') || document;
        const pw = form.querySelector('input[name="password"]');
        if (pw) pw.type = cb.checked ? 'text' : 'password';
      });
    });
  }

  // Mobile: use delegated listener so dynamically inserted forms (modals/offcanvas) work
  function initMobileShowPassword() {
    // Use a single delegated listener on document
    if (document.__mobileShowPwDelegated) return;
    document.__mobileShowPwDelegated = true;
    document.addEventListener('change', function (e) {
      const target = e.target;
      if (!target || !target.matches('input.show-password-mobile')) return;
      const cb = target;
      const form = cb.closest('form') || document;
      const pw = form.querySelector('input[name="password"]');
      if (pw) pw.type = cb.checked ? 'text' : 'password';
    });
  }

  // Initialize both. Desktop binding runs on DOM ready; mobile delegation can be set up immediately.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initDesktopShowPassword();
      initMobileShowPassword();
    });
  } else {
    initDesktopShowPassword();
    initMobileShowPassword();
  }
})();
