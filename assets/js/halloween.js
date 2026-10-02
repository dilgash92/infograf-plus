document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const body = document.body;
  const root = document.documentElement;
  const toggle = document.getElementById("halloween-mode-toggle");
  const christmasToggle = document.getElementById("christmas-mode-toggle");
  const christmasLayer = document.querySelector(".christmas-ambient-layer");
  const christmasSurprise = document.querySelector(".christmas-surprise");
  const pumpkins = document.querySelectorAll(".halloween-pumpkin-decor");
  const surprise = document.querySelector(".halloween-surprise");

  if (!toggle && !christmasToggle) return;


  function setChristmasMode(enabled, persist) {
    body.classList.toggle("christmas-mode", enabled);
    root.classList.toggle("christmas-mode", enabled);
    if (christmasToggle) {
      christmasToggle.setAttribute("aria-pressed", String(enabled));
      const label = christmasToggle.querySelector(".christmas-switch span");
      if (label) label.textContent = enabled ? "ON" : "OFF";
      christmasToggle.title = enabled ? "إيقاف نسخة الكريسماس" : "تشغيل نسخة الكريسماس";
    }
    if (persist) {
      try { localStorage.setItem("infograf-christmas-mode", enabled ? "on" : "off"); } catch (error) {}
    }
  }

  let savedChristmas = null;
  try { savedChristmas = localStorage.getItem("infograf-christmas-mode"); } catch (error) {}
  setChristmasMode(savedChristmas === "on", false);

  if (christmasToggle) {
    christmasToggle.addEventListener("click", function () {
      const enabled = !body.classList.contains("christmas-mode");
      if (enabled && body.classList.contains("halloween-mode") && toggle) setMode(false, true);
      setChristmasMode(enabled, true);
    });
  }

  if (christmasLayer && christmasSurprise) {
    const treeHotspot = christmasLayer.querySelector(".christmas-tree-hotspot");
    if (treeHotspot) {
      treeHotspot.addEventListener("click", function () {
        christmasLayer.classList.add("is-lit");
        christmasSurprise.classList.remove("is-visible");
        void christmasSurprise.offsetWidth;
        christmasSurprise.classList.add("is-visible");
        window.setTimeout(function () { christmasSurprise.classList.remove("is-visible"); }, 1700);
      });
    }
  }

  const storageKey = "infograf-halloween-mode";
  let previousDarkMode = root.classList.contains("dark-mode");

  function setMode(enabled, persist) {
    if (enabled) {
      previousDarkMode = root.classList.contains("dark-mode");
      root.classList.add("dark-mode");
    } else if (!previousDarkMode) {
      root.classList.remove("dark-mode");
    }

    body.classList.toggle("halloween-mode", enabled);
    root.classList.toggle("halloween-mode", enabled);
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.setAttribute("title", enabled ? "إيقاف نسخة الهالوين" : "تشغيل نسخة الهالوين");

    const label = toggle.querySelector(".halloween-toggle-label");
    if (label) label.textContent = "Halloween Mode";
    const switchLabel = toggle.querySelector(".halloween-switch span");
    if (switchLabel) switchLabel.textContent = enabled ? "ON" : "OFF";

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

  const scene = document.querySelector(".halloween-hero-scene");
  const moonHotspot = document.querySelector(".halloween-moon-hotspot");
  const bats = document.querySelectorAll(".halloween-floating-bat");
  const webs = document.querySelectorAll(".halloween-web-corner");

  function showSurprise(message) {
    if (!surprise) return;
    surprise.textContent = message;
    surprise.classList.remove("is-visible");
    void surprise.offsetWidth;
    surprise.classList.add("is-visible");
    window.setTimeout(function () {
      surprise.classList.remove("is-visible");
    }, 1600);
  }

  if (scene && moonHotspot) {
    moonHotspot.addEventListener("click", function () {
      scene.classList.remove("moon-pulse");
      void scene.offsetWidth;
      scene.classList.add("moon-pulse");
      showSurprise("🌕 القمر استيقظ!");
      window.setTimeout(function () {
        scene.classList.remove("moon-pulse");
      }, 900);
    });
  }

  bats.forEach(function (bat) {
    bat.addEventListener("click", function () {
      if (!scene) return;
      scene.classList.add("bat-burst");
      showSurprise("🦇 الخفافيش طارت!");
      window.setTimeout(function () {
        scene.classList.remove("bat-burst");
      }, 1300);
    });
  });

  webs.forEach(function (web) {
    web.addEventListener("click", function () {
      const spider = document.querySelector(".halloween-spider-interactive");
      if (spider) {
        spider.style.animation = "none";
        void spider.offsetWidth;
        spider.style.animation = "halloween-spider-swing .8s ease-in-out 2";
      }
      showSurprise("🕷️ وجدت العنكبوت!");
    });
  });

  pumpkins.forEach(function (pumpkin) {
    pumpkin.addEventListener("click", function () {
      pumpkin.classList.remove("is-surprised");
      void pumpkin.offsetWidth;
      pumpkin.classList.add("is-surprised");
      showSurprise("🎃 القرعة مستيقظة!");
    });
  });
});
