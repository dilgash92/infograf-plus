document.addEventListener("DOMContentLoaded", function () {

  /* =====================================================
     Search
     ===================================================== */

  const searchPanel = document.getElementById("search-panel");
  const openSearch = document.getElementById("open-search");
  const mobileSearch = document.getElementById("mobile-search");
  const closeSearch = document.getElementById("close-search");
  const searchInput = document.getElementById("site-search");
  const searchResults = document.getElementById("search-results");


  function showSearch() {

    if (!searchPanel) {
      return;
    }

    searchPanel.hidden = false;

    if (searchInput) {
      setTimeout(function () {
        searchInput.focus();
      }, 50);
    }

  }


  function hideSearch() {

    if (!searchPanel) {
      return;
    }

    searchPanel.hidden = true;

    if (searchInput) {
      searchInput.value = "";
    }

    if (searchResults) {
      searchResults.innerHTML = "";
    }

  }


  if (openSearch) {
    openSearch.addEventListener("click", showSearch);
  }


  if (mobileSearch) {
    mobileSearch.addEventListener("click", showSearch);
  }


  if (closeSearch) {
    closeSearch.addEventListener("click", hideSearch);
  }


  if (searchPanel) {

    searchPanel.addEventListener("click", function (event) {

      if (event.target === searchPanel) {
        hideSearch();
      }

    });

  }


  document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
      hideSearch();
    }

  });


  /* =====================================================
     Search Data
     ===================================================== */

  const cards = Array.from(
    document.querySelectorAll(".infographic-card")
  );


  function performSearch(query) {

    if (!searchResults) {
      return;
    }

    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      searchResults.innerHTML = "";
      return;
    }


    const matches = cards.filter(function (card) {

      const titleElement = card.querySelector("h3");
      const descriptionElement = card.querySelector("p");
      const categoryElement = card.querySelector(".card-category");

      const title = titleElement
        ? titleElement.textContent.toLowerCase()
        : "";

      const description = descriptionElement
        ? descriptionElement.textContent.toLowerCase()
        : "";

      const category = categoryElement
        ? categoryElement.textContent.toLowerCase()
        : "";

      return (
        title.includes(cleanQuery) ||
        description.includes(cleanQuery) ||
        category.includes(cleanQuery)
      );

    });


    if (matches.length === 0) {

      searchResults.innerHTML =
        '<div class="no-results">لا توجد نتائج مطابقة.</div>';

      return;

    }


    searchResults.innerHTML = "";


    matches.forEach(function (card) {

      const link = card.querySelector(
        ".infographic-image-link"
      );

      const title = card.querySelector("h3");

      if (!link || !title) {
        return;
      }


      const result = document.createElement("a");

      result.className = "search-result";
      result.href = link.href;


      const strong = document.createElement("strong");
      strong.textContent = title.textContent.trim();


      const category = card.querySelector(".card-category");

      const span = document.createElement("span");

      if (category) {
        span.textContent = category.textContent.trim();
      }


      result.appendChild(strong);
      result.appendChild(span);

      searchResults.appendChild(result);

    });

  }


  if (searchInput) {

    searchInput.addEventListener(
      "input",
      function () {
        performSearch(searchInput.value);
      }
    );

  }


  /* =====================================================
     Category Filtering
     ===================================================== */

  const categoryButtons = Array.from(
    document.querySelectorAll(".category-chip")
  );


  categoryButtons.forEach(function (button) {

    button.addEventListener("click", function () {

      const selectedCategory =
        button.dataset.category || "all";


      categoryButtons.forEach(function (item) {
        item.classList.remove("active");
      });


      button.classList.add("active");


      cards.forEach(function (card) {

        const cardCategory =
          (card.dataset.category || "").trim();


        if (
          selectedCategory === "all" ||
          cardCategory === selectedCategory
        ) {

          card.style.display = "";

        } else {

          card.style.display = "none";

        }

      });

    });

  });

});
