document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  /* =====================================================
     SEARCH ELEMENTS
  ===================================================== */

  const searchPanel = document.getElementById("search-panel");
  const openSearch = document.getElementById("open-search");
  const mobileSearch = document.getElementById("mobile-search");
  const closeSearch = document.getElementById("close-search");
  const searchInput = document.getElementById("site-search");
  const searchResults = document.getElementById("search-results");


  /* =====================================================
     SEARCH INDEX
  ===================================================== */

  let searchIndex = [];

  const searchIndexElement =
    document.getElementById("search-index");

  if (searchIndexElement) {
    try {
      searchIndex =
        JSON.parse(
          searchIndexElement.textContent || "[]"
        );

      if (!Array.isArray(searchIndex)) {
        searchIndex = [];
      }

    } catch (error) {
      console.error(
        "Infograf+ search index error:",
        error
      );

      searchIndex = [];
    }
  }


  /* =====================================================
     OPEN SEARCH
  ===================================================== */

  function showSearch() {

    if (!searchPanel) {
      return;
    }

    searchPanel.hidden = false;

    document.body.style.overflow = "hidden";

    if (searchInput) {
      setTimeout(function () {
        searchInput.focus();
      }, 50);
    }
  }


  /* =====================================================
     CLOSE SEARCH
  ===================================================== */

  function hideSearch() {

    if (!searchPanel) {
      return;
    }

    searchPanel.hidden = true;

    document.body.style.overflow = "";

    if (searchInput) {
      searchInput.value = "";
    }

    if (searchResults) {
      searchResults.innerHTML = "";
    }
  }


  /* =====================================================
     SEARCH BUTTONS
  ===================================================== */

  if (openSearch) {

    openSearch.addEventListener(
      "click",
      showSearch
    );
  }


  if (mobileSearch) {

    mobileSearch.addEventListener(
      "click",
      showSearch
    );
  }


  if (closeSearch) {

    closeSearch.addEventListener(
      "click",
      hideSearch
    );
  }


  /* =====================================================
     CLICK OUTSIDE
  ===================================================== */

  if (searchPanel) {

    searchPanel.addEventListener(
      "click",
      function (event) {

        if (event.target === searchPanel) {
          hideSearch();
        }

      }
    );
  }


  /* =====================================================
     ESC KEY
  ===================================================== */

  document.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Escape") {
        hideSearch();
      }

    }
  );


  /* =====================================================
     ARABIC NORMALIZATION
  ===================================================== */

  function normalizeArabic(text) {

    return String(text || "")
      .toLowerCase()
      .replace(
        /[\u064B-\u065F\u0670]/g,
        ""
      )
      .replace(
        /[إأآٱ]/g,
        "ا"
      )
      .replace(
        /ى/g,
        "ي"
      )
      .replace(
        /ؤ/g,
        "و"
      )
      .replace(
        /ئ/g,
        "ي"
      )
      .replace(
        /ة/g,
        "ه"
      )
      .replace(
        /ـ/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }


  /* =====================================================
     TEXT WORDS
  ===================================================== */

  function getWords(text) {

    return normalizeArabic(text)
      .split(/\s+/)
      .filter(function (word) {

        return word.length >= 2;

      });
  }


  /* =====================================================
     HTML ESCAPE
  ===================================================== */

  function escapeHtml(text) {

    return String(text || "")
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  function escapeAttribute(text) {

    return escapeHtml(text);
  }


  /* =====================================================
     SEARCH SCORE
  ===================================================== */

  function scorePost(post, query) {

    const title =
      normalizeArabic(
        post.title || ""
      );

    const description =
      normalizeArabic(
        post.description || ""
      );

    const category =
      normalizeArabic(
        post.category || ""
      );


    let score = 0;


    /* -------------------------------------------------
       EXACT FULL TITLE
    ------------------------------------------------- */

    if (title === query) {
      score += 2000;
    }


    /* -------------------------------------------------
       TITLE
    ------------------------------------------------- */

    if (title.startsWith(query)) {
      score += 800;
    }

    if (title.includes(query)) {
      score += 500;
    }


    /* -------------------------------------------------
       CATEGORY
    ------------------------------------------------- */

    if (category === query) {
      score += 400;
    }

    if (category.startsWith(query)) {
      score += 300;
    }

    if (category.includes(query)) {
      score += 200;
    }


    /* -------------------------------------------------
       DESCRIPTION
    ------------------------------------------------- */

    if (description.includes(query)) {
      score += 100;
    }


    /* -------------------------------------------------
       MULTI-WORD SEARCH
    ------------------------------------------------- */

    const queryWords =
      getWords(query);


    let matchedWords = 0;


    queryWords.forEach(
      function (word) {

        let wordMatched = false;


        /* Title gets highest weight */

        if (title.includes(word)) {

          score += 180;
          wordMatched = true;
        }


        /* Category */

        if (category.includes(word)) {

          score += 100;
          wordMatched = true;
        }


        /* Description */

        if (description.includes(word)) {

          score += 40;
          wordMatched = true;
        }


        if (wordMatched) {
          matchedWords++;
        }

      }
    );


    /* -------------------------------------------------
       BONUS FOR MATCHING ALL SEARCH WORDS
    ------------------------------------------------- */

    if (
      queryWords.length > 1 &&
      matchedWords === queryWords.length
    ) {

      score += 500;
    }


    /* -------------------------------------------------
       BONUS FOR PHRASE
    ------------------------------------------------- */

    if (
      queryWords.length > 1 &&
      title.includes(query)
    ) {

      score += 700;
    }


    return score;
  }


  /* =====================================================
     SEARCH
  ===================================================== */

  function performSearch(query) {

    if (!searchResults) {
      return;
    }


    const originalQuery =
      String(query || "").trim();


    const cleanQuery =
      normalizeArabic(
        originalQuery
      );


    /* -------------------------------------------------
       EMPTY / VERY SHORT SEARCH
    ------------------------------------------------- */

    if (cleanQuery.length < 2) {

      searchResults.innerHTML = "";

      return;
    }


    /* -------------------------------------------------
       SCORE ALL POSTS
    ------------------------------------------------- */

    const matches =
      searchIndex
        .map(
          function (post) {

            return {
              post: post,
              score: scorePost(
                post,
                cleanQuery
              )
            };

          }
        )
        .filter(
          function (result) {

            return result.score > 0;

          }
        )
        .sort(
          function (a, b) {

            /* Highest relevance first */

            if (
              b.score !== a.score
            ) {

              return (
                b.score -
                a.score
              );
            }


            /* Newer content first
               when relevance is equal */

            const dateA =
              String(
                a.post.date || ""
              );

            const dateB =
              String(
                b.post.date || ""
              );


            return dateB.localeCompare(
              dateA
            );

          }
        )
        .map(
          function (result) {

            return result.post;

          }
        );


    /* =================================================
       NO RESULTS
    ================================================= */

    if (matches.length === 0) {

      searchResults.innerHTML =
        '<div class="no-results">' +
        "لا توجد نتائج مطابقة لـ «" +
        escapeHtml(
          originalQuery
        ) +
        "»." +
        "</div>";

      return;
    }


    /* =================================================
       RESULT COUNT
    ================================================= */

    let html =
      '<div class="search-result-count">' +
      "تم العثور على " +
      matches.length +
      " إنفوغرافيك" +
      "</div>";


    /* =================================================
       DISPLAY RESULTS
    ================================================= */

    const visibleMatches =
      matches.slice(
        0,
        12
      );


    visibleMatches.forEach(
      function (post) {

        const title =
          post.title ||
          "إنفوغرافيك";

        const category =
          post.category ||
          "";

        const description =
          post.description ||
          "";

        const url =
          post.url ||
          "#";


        html +=
          '<a class="search-result" href="' +
          escapeAttribute(url) +
          '">' +

          "<strong>" +
          escapeHtml(title) +
          "</strong>" +

          (
            category
              ? "<span>" +
                escapeHtml(category) +
                "</span>"
              : ""
          ) +

          (
            description
              ? "<small>" +
                escapeHtml(description) +
                "</small>"
              : ""
          ) +

          "</a>";
      }
    );


    /* =================================================
       MORE RESULTS
    ================================================= */

    if (
      matches.length > 12
    ) {

      html +=
        '<div class="search-more">' +
        "هناك " +
        matches.length +
        " نتيجة — يتم عرض أول 12." +
        "</div>";
    }


    searchResults.innerHTML =
      html;
  }


  /* =====================================================
     LIVE SEARCH
  ===================================================== */

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      function () {

        performSearch(
          searchInput.value
        );

      }
    );
  }


  /* =====================================================
     CTRL + K / CMD + K
  ===================================================== */

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {

        event.preventDefault();

        showSearch();
      }

    }
  );


  /* =====================================================
     HOME CATEGORY FILTER
  ===================================================== */

  const categoryButtons =
    Array.from(
      document.querySelectorAll(
        ".category-chip"
      )
    );


  const homeCards =
    Array.from(
      document.querySelectorAll(
        "#infographic-grid .infographic-card"
      )
    );


  categoryButtons.forEach(
    function (button) {

      /*
       * Only activate JavaScript
       * filtering when data-category
       * actually exists.
       *
       * Normal homepage links remain
       * normal links.
       */

      if (
        !button.dataset.category
      ) {
        return;
      }


      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();


          const selectedCategory =
            button.dataset.category ||
            "all";


          categoryButtons.forEach(
            function (item) {

              item.classList.remove(
                "active"
              );

            }
          );


          button.classList.add(
            "active"
          );


          homeCards.forEach(
            function (card) {

              const cardCategory =
                (
                  card.dataset.category ||
                  ""
                ).trim();


              if (
                selectedCategory ===
                  "all" ||
                cardCategory ===
                  selectedCategory
              ) {

                card.style.display =
                  "";

              } else {

                card.style.display =
                  "none";
              }

            }
          );

        }
      );

    }
  );


  /* =====================================================
     IMAGE PROTECTION
     =====================================================
     This blocks the easy/traditional ways of saving images
     while keeping normal page scrolling and mobile pinch-zoom.
     It cannot prevent screenshots or advanced extraction.
  ===================================================== */

  const protectedImages =
    document.querySelectorAll(
      ".infographic-main-image img, .infographic-image-link img"
    );

  protectedImages.forEach(function (image) {

    image.setAttribute("draggable", "false");

    image.addEventListener(
      "contextmenu",
      function (event) {
        event.preventDefault();
      }
    );

    image.addEventListener(
      "dragstart",
      function (event) {
        event.preventDefault();
      }
    );

    image.addEventListener(
      "selectstart",
      function (event) {
        event.preventDefault();
      }
    );

  });


  /* =====================================================
     INITIALIZE
  ===================================================== */

  if (searchPanel) {
    searchPanel.hidden = true;
  }


  console.log(
    "Infograf+ loaded successfully."
  );


  console.log(
    "Search index:",
    searchIndex.length,
    "posts"
  );

});
