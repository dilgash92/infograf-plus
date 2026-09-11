(function () {
  "use strict";

  function initInfographicZoom() {
    var figure = document.getElementById("infographic-image");
    if (!figure) return;
    var source = figure.querySelector("img");
    if (!source || document.getElementById("infographic-lightbox")) return;

    var hint = document.createElement("button");
    hint.type = "button";
    hint.className = "infographic-zoom-hint";
    hint.setAttribute("aria-label", "فتح المكبرة وقراءة تفاصيل الإنفوغرافيك");
    hint.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"></circle><path d="m16 16 4.5 4.5M10.8 7.8v6M7.8 10.8h6"></path></svg><span>مكبّرة</span>';
    figure.appendChild(hint);

    var lightbox = document.createElement("div");
    lightbox.id = "infographic-lightbox";
    lightbox.className = "infographic-lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML =
      '<div class="infographic-lightbox-top">' +
        '<span class="infographic-lightbox-help">حرّك الصورة واسحبها لقراءة التفاصيل</span>' +
        '<button type="button" class="infographic-lightbox-close" aria-label="إغلاق المكبرة">×</button>' +
      '</div>' +
      '<div class="infographic-lightbox-stage">' +
        '<img class="infographic-lightbox-image" alt="" draggable="false">' +
      '</div>' +
      '<div class="infographic-lightbox-controls" aria-label="أدوات المكبرة">' +
        '<button type="button" class="infographic-lightbox-zoom" data-zoom="out" aria-label="تصغير">−</button>' +
        '<span class="infographic-lightbox-scale">100%</span>' +
        '<button type="button" class="infographic-lightbox-reset" aria-label="إعادة ملاءمة الصورة">ملاءمة</button>' +
        '<button type="button" class="infographic-lightbox-zoom" data-zoom="in" aria-label="تكبير">+</button>' +
      '</div>';
    document.body.appendChild(lightbox);

    var stage = lightbox.querySelector(".infographic-lightbox-stage");
    var zoomImage = lightbox.querySelector(".infographic-lightbox-image");
    var closeButton = lightbox.querySelector(".infographic-lightbox-close");
    var resetButton = lightbox.querySelector(".infographic-lightbox-reset");
    var scaleLabel = lightbox.querySelector(".infographic-lightbox-scale");
    var zoomButtons = lightbox.querySelectorAll("[data-zoom]");

    var scale = 1, fitScale = 1, minScale = 0.5, maxScale = 4;
    var x = 0, y = 0, dragging = false;
    var startX = 0, startY = 0, startPanX = 0, startPanY = 0;
    var pointers = new Map(), pinchStartDistance = 0, pinchStartScale = 1;

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    function getFitScale() {
      if (!zoomImage.naturalWidth || !zoomImage.naturalHeight) return 1;
      var availableWidth = Math.max(1, stage.clientWidth - 24);
      var availableHeight = Math.max(1, stage.clientHeight - 110);
      return Math.min(1, availableWidth / zoomImage.naturalWidth, availableHeight / zoomImage.naturalHeight);
    }

    function updateLabel() {
      scaleLabel.textContent = Math.max(50, Math.round((scale / fitScale) * 100)) + "%";
    }

    function applyTransform() {
      zoomImage.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(" + scale + ")";
      updateLabel();
    }

    function resetZoom() {
      fitScale = getFitScale();
      minScale = fitScale * 0.5;
      maxScale = Math.max(fitScale * 5, fitScale);
      scale = fitScale;
      x = 0;
      y = 0;
      applyTransform();
    }

    function zoomBy(factor) {
      var next = clamp(scale * factor, minScale, maxScale);
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

      function prepare() {
        requestAnimationFrame(function () {
          resetZoom();
          closeButton.focus({ preventScroll: true });
        });
      }
      if (zoomImage.complete && zoomImage.naturalWidth) prepare();
      else zoomImage.onload = prepare;
    }

    function closeViewer() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("infographic-lightbox-open");
      pointers.clear();
      dragging = false;
      zoomImage.classList.remove("is-dragging");
      figure.focus({ preventScroll: true });
    }

    hint.addEventListener("click", openViewer);
    figure.setAttribute("tabindex", "0");
    figure.setAttribute("role", "group");
    figure.setAttribute("aria-label", "إنفوغرافيك مع مكبرة لقراءة التفاصيل");

    closeButton.addEventListener("click", closeViewer);
    resetButton.addEventListener("click", resetZoom);
    zoomButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        zoomBy(button.dataset.zoom === "in" ? 1.25 : 0.8);
      });
    });

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeViewer();
    });

    document.addEventListener("keydown", function (event) {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeViewer();
      if (event.key === "+" || event.key === "=") zoomBy(1.25);
      if (event.key === "-") zoomBy(0.8);
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
          scale = clamp(pinchStartScale * distance / pinchStartDistance, minScale, maxScale);
          applyTransform();
        }
        return;
      }
      if (!dragging || scale <= fitScale) return;
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
      if (scale > fitScale * 1.01) resetZoom(); else zoomBy(2);
    });

    stage.addEventListener("wheel", function (event) {
      if (!lightbox.classList.contains("is-open")) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.15 : 0.87);
    }, { passive: false });

    window.addEventListener("resize", function () {
      if (lightbox.classList.contains("is-open")) resetZoom();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initInfographicZoom);
  else initInfographicZoom();
})();
