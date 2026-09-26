(function () {
  "use strict";

  var STORAGE_KEY = "infograf-theme";
  var root = document.documentElement;

  try {
    if (localStorage.getItem(STORAGE_KEY) === "dark") {
      root.classList.add("dark-mode");
    }
  } catch (error) {}

  function updateMetaTheme() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute("content", root.classList.contains("dark-mode") ? "#111214" : "#ffffff");
  }

  function setTheme(dark, button) {
    root.classList.toggle("dark-mode", dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch (error) {}
    updateMetaTheme();

    if (button) {
      button.setAttribute(
        "aria-label",
        dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"
      );
      button.setAttribute(
        "title",
        dark ? "الوضع الفاتح" : "الوضع الداكن"
      );
    }
  }

  function bindToggle() {
    var button = document.getElementById("theme-toggle");
    if (!button || button.dataset.themeBound === "true") return;

    button.dataset.themeBound = "true";
    button.addEventListener("click", function () {
      setTheme(!root.classList.contains("dark-mode"), button);
    });

    setTheme(root.classList.contains("dark-mode"), button);
  }

  updateMetaTheme();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindToggle);
  } else {
    bindToggle();
  }
})();