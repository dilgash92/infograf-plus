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

  function setTheme(dark) {
    root.classList.toggle("dark-mode", dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch (error) {}
    updateMetaTheme();
  }

  function placeToggle(button, header) {
    var actions = header.querySelector(".mobile-header-actions");
    if (actions && button.parentElement !== actions) {
      actions.appendChild(button);
      return true;
    }
    return !!actions;
  }

  function createToggle() {
    var header = document.querySelector(".header-inner");
    if (!header) return;

    var button = document.getElementById("theme-toggle");

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.id = "theme-toggle";
      button.className = "theme-toggle";
      button.setAttribute("aria-label", "تفعيل الوضع الداكن");
      button.setAttribute("title", "الوضع الداكن");

      button.innerHTML =
        '<svg class="theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="4"></circle>' +
          '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>' +
        '</svg>' +
        '<svg class="theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"></path>' +
        '</svg>';

      button.addEventListener("click", function () {
        var dark = !root.classList.contains("dark-mode");
        setTheme(dark);
        button.setAttribute("aria-label", dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن");
        button.setAttribute("title", dark ? "الوضع الفاتح" : "الوضع الداكن");
      });

      header.appendChild(button);
    }

    placeToggle(button, header);

    button.setAttribute("aria-label", root.classList.contains("dark-mode") ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن");
    button.setAttribute("title", root.classList.contains("dark-mode") ? "الوضع الفاتح" : "الوضع الداكن");
  }

  updateMetaTheme();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createToggle);
  } else {
    createToggle();
  }

  /* app.js creates the header action group after DOMContentLoaded.
     Keep watching briefly so the theme button is moved into that group. */
  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(function () {
      var header = document.querySelector(".header-inner");
      var button = document.getElementById("theme-toggle");
      var actions = header && header.querySelector(".mobile-header-actions");
      if (header && button && actions && button.parentElement !== actions) {
        actions.appendChild(button);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(function () {
      observer.disconnect();
    }, 5000);
  }
})();
