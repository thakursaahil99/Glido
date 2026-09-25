// Runs before paint so a saved dark-mode preference doesn't flash light first.
// A same-origin file (not an inline <script>) on purpose — it lets the CSP in
// next.config.ts use a strict script-src with no 'unsafe-inline'.
(function () {
  try {
    var t = localStorage.getItem("glido-theme");
    if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.dataset.theme = "dark";
    }
  } catch (e) {}
})();
