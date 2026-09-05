document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  /*
   * Every infographic card is a single click target.
   * The existing app.js already handles the homepage latest grid;
   * this file covers featured cards, the categories page and /latest/.
   */
  document.querySelectorAll(".infographic-card").forEach(function (card) {
    if (card.classList.contains("is-clickable-card")) return;

    const destination =
      card.querySelector(".infographic-image-link[href]") ||
      card.querySelector("h2 a[href], h3 a[href]");

    if (!destination) return;

    card.classList.add("is-clickable-card");
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    card.addEventListener("click", function (event) {
      if (event.target.closest("a, button, input, textarea, select")) return;
      window.location.href = destination.href;
    });

    card.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      window.location.href = destination.href;
    });
  });
});
