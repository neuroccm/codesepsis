/* Light / dark mode.
   Applies a saved choice before first paint (this file is loaded in <head>) and wires up the toggle button.
   Without JavaScript the pages follow the system setting through styles.css. */
(function () {
  var KEY = "theme";
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function readSaved() {
    try {
      var value = window.localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (e) {
      return null;
    }
  }

  function save(value) {
    try {
      window.localStorage.setItem(KEY, value);
    } catch (e) {
      /* storage blocked: the choice lasts for this page view only */
    }
  }

  function current() {
    return root.getAttribute("data-theme") || (media && media.matches ? "dark" : "light");
  }

  var saved = readSaved();
  if (saved) root.setAttribute("data-theme", saved);

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("theme-toggle");
    if (!button) return;

    function show() {
      button.setAttribute("aria-pressed", current() === "dark" ? "true" : "false");
    }

    button.hidden = false;
    show();
    button.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      save(next);
      show();
    });
    if (media && media.addEventListener) media.addEventListener("change", show);
  });
})();
