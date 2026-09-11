(function () {
  "use strict";

  function initInfographicZoom() {
    var figure = document.getElementById("infographic-image");
    if (!figure) return;
    var source = figure.querySelector("img");
    if (!source || document.getElementById("infographic-lightbox")) return;

    var hint = document.createElement("span");
    hint.className = "infographic-zoom-hint";
    hint.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"></circle><path d="m16 16 4.5 4.5M10.8 7.8v6M7.8 10.8h6"></path></svg><span>اضغط للتكبير</span>';
    figure.appendChild(hint);

    var lightbox = document.createElement("div");
    lightbox.id = "infographic-lightbox";
    lightbox.className = "infographic-lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML =
      '<div class="infographic-lightbox-top">' +
        '<button type="button" class="infographic-lightbox-reset" aria-label="إعادة ضبط التكبير">100%</button>' +
        '<button type="button" class="infographic-lightbox-close" aria-label="إغلاق التكبير">×</button>' +
      '</div>' +
      '<div class="infographic-lightbox-stage">' +
        '<img class="infographic-lightbox-image" alt="" draggable="false">' +
      '</div>' +
      '<div class="infographic-lightbox-controls" aria-label="أدوات التكبير">' +
        '<button type="button" class="infographic-lightbox-zoom" data-zoom="out" aria-label="تصغير">−</button>' +
        '<span class="infographic-lightbox-scale">100%</span>' +
        '<button type="button" class="infographic-lightbox-zoom" data-zoom="in" aria-label="تكبير">+</button>' +
      '</div>';
    document.body.appendChild(lightbox);

    var stage = lightbox.querySelector(".infographic-lightbox-stage");
    var zoomImage = lightbox.querySelector(".infographic-lightbox-image");
    var closeButton = lightbox.querySelector(".infographic-lightbox-close");
    var resetButton = lightbox.querySelector(".infographic-lightbox-reset");
    var scaleLabel = lightbox.querySelector(".infographic-lightbox-scale");
    var zoomButtons = lightbox.querySelectorAll("[data-zoom]");

    var scale = 1;
    var minScale = 1;
    var maxScale = 4;
    var x = 0;
    var y = 0;
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startPanX = 0;
    var startPanY = 0;
    var lastTap = 0;
    var pinchStartDistance = 0;
    var pinchStartScale = 1;
    var pointers = new Map();

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    function applyTransform() {
      zoomImage.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(" + scale + ")";
      var percent = Math.round(scale * 100);
      scaleLabel.textContent = percent + "%";
      resetButton.textContent = percent + "%";
    }

    function resetZoom() {
      scale = minScale;
      x = 0;
      y = 0;
      applyTransform();
    }

    function zoomBy(amount) {
      var next = clamp(scale + amount, minScale, maxScale);
      if (next === scale) return;
      var ratio = next / scale;
      x *= ratio;
      y *= ratio;
      scale = next;
      applyTransform();
    }

    function openViewer() {
      zoomImage.src = source.currentSrc || source.src;
      zoomImage.alt = source.alt || "إنفوغرافيك";
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("infographic-lightbox-open");
      resetZoom();
      closeButton.focus({ preventScroll: true });
    }

    function closeViewer() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("infographic-lightbox-open");
      pointers.clear();
      dragging = false;
      figure.focus({ preventScroll: true });
    }

    figure.setAttribute("tabindex", "0");
    figure.setAttribute("role", "button");
    figure.setAttribute("aria-label", "فتح الإنفوغرافيك بحجم كبير");
    figure.addEventListener("click", function (event) {
      if (event.target.closest("a,button")) return;
      openViewer();
    });
    figure.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openViewer();
      }
    });

    closeButton.addEventListener("click", closeViewer);
    resetButton.addEventListener("click", resetZoom);
    zoomButtons.forEach(function (button) {
      button.addEventListener("click", function () { zoomBy(button.dataset.zoom === "in" ? 0.5 : -0.5); });
    });
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox || event.target === stage) closeViewer();
    });
    document.addEventListener("keydown", function (event) {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeViewer();
      if (event.key === "+" || event.key === "=") zoomBy(0.5);
      if (event.key === "-") zoomBy(-0.5);
      if (event.key === "0") resetZoom();
    });

    stage.addEventListener("pointerdown", function (event) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startPanX = x;
        startPanY = y;
        zoomImage.classList.add("is-dragging");
        stage.setPointerCapture(event.pointerId);
      } else if (pointers.size === 2) {
        dragging = false;
        var values = Array.from(pointers.values());
        pinchStartDistance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
        pinchStartScale = scale;
      }
    });

    stage.addEventListener("pointermove", function (event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        var values = Array.from(pointers.values());
        var distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
        if (pinchStartDistance > 0) {
          scale = clamp(pinchStartScale * (distance / pinchStartDistance), minScale, maxScale);
          applyTransform();
        }
        return;
      }
      if (!dragging || scale <= 1) return;
      x = startPanX + event.clientX - startX;
      y = startPanY + event.clientY - startY;
      applyTransform();
    });

    function endPointer(event) {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchStartDistance = 0;
      if (pointers.size === 0) {
        dragging = false;
        zoomImage.classList.remove("is-dragging");
      }
    }
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", endPointer);

    stage.addEventListener("dblclick", function (event) {
      event.preventDefault();
      if (scale > 1) resetZoom(); else zoomBy(1);
    });

    stage.addEventListener("wheel", function (event) {
      if (!lightbox.classList.contains("is-open")) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initInfographicZoom);
  else initInfographicZoom();
})();
