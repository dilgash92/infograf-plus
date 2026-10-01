document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const body = document.body;
  const root = document.documentElement;
  const toggle = document.getElementById("halloween-mode-toggle");
  const pumpkin = document.querySelector(".halloween-pumpkin");
  const surprise = document.querySelector(".halloween-surprise");

  if (!toggle) return;

  const storageKey = "infograf-halloween-mode";

  function setMode(enabled, persist) {
    body.classList.toggle("halloween-mode", enabled);
    root.classList.toggle("halloween-mode", enabled);
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.setAttribute("title", enabled ? "إيقاف نسخة الهالوين" : "تشغيل نسخة الهالوين");

    const label = toggle.querySelector(".halloween-toggle-label");
    if (label) label.textContent = enabled ? "Halloween Mode ON" : "Halloween Mode";

    if (persist) {
      try {
        localStorage.setItem(storageKey, enabled ? "on" : "off");
      } catch (error) {
        /* Storage may be unavailable; the visual mode still works. */
      }
    }
  }

  let savedMode = null;
  try {
    savedMode = localStorage.getItem(storageKey);
  } catch (error) {
    savedMode = null;
  }

  setMode(savedMode === "on", false);

  toggle.addEventListener("click", function () {
    setMode(!body.classList.contains("halloween-mode"), true);
  });

  if (pumpkin && surprise) {
    pumpkin.addEventListener("click", function () {
      pumpkin.classList.remove("is-surprised");
      void pumpkin.offsetWidth;
      pumpkin.classList.add("is-surprised");
      surprise.classList.add("is-visible");

      window.setTimeout(function () {
        surprise.classList.remove("is-visible");
      }, 1500);
    });
  }
});
