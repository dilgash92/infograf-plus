document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  // Seasonal mode: automatically active from October 1 through October 31.
  // It does not alter the site's theme or require a toggle.
  const now = new Date();
  const month = now.getMonth();
  const isHalloweenSeason = month === 9; // October

  document.documentElement.classList.toggle("halloween-season", isHalloweenSeason);
});
