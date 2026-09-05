document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const searchPanel = document.getElementById("search-panel");
  const openSearch = document.getElementById("open-search");
  const mobileSearch = document.getElementById("mobile-search");
  const closeSearch = document.getElementById("close-search");
  const searchInput = document.getElementById("site-search");
  const searchResults = document.getElementById("search-results");

  let searchIndex = [];
  const searchIndexElement = document.getElementById("search-index");

  if (searchIndexElement) {
    try {
      searchIndex = JSON.parse(searchIndexElement.textContent || "[]");
      if (!Array.isArray(searchIndex)) searchIndex = [];
    } catch (error) {
      console.error("Infograf+ search index error:", error);
      searchIndex = [];
    }
  }

  function showSearch() {
    if (!searchPanel) return;
    searchPanel.hidden = false;
    document.body.style.overflow = "hidden";
    if (searchInput) setTimeout(function () { searchInput.focus(); }, 50);
  }

  function hideSearch() {
    if (!searchPanel) return;
    searchPanel.hidden = true;
    document.body.style.overflow = "";
    if (searchInput) searchInput.value = "";
    if (searchResults) searchResults.innerHTML = "";
  }

  if (openSearch) openSearch.addEventListener("click", showSearch);
  if (mobileSearch) mobileSearch.addEventListener("click", showSearch);
  if (closeSearch) closeSearch.addEventListener("click", hideSearch);

  if (searchPanel) {
    searchPanel.addEventListener("click", function (event) {
      if (event.target === searchPanel) hideSearch();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") hideSearch();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      showSearch();
    }
  });

  function normalizeArabic(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ـ/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getWords(text) {
    return normalizeArabic(text).split(/\s+/).filter(function (word) {
      return word.length >= 2;
    });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(text) {
    return escapeHtml(text);
  }

  function scorePost(post, query) {
    const title = normalizeArabic(post.title || "");
    const description = normalizeArabic(post.description || "");
    const category = normalizeArabic(post.category || "");
    let score = 0;

    if (title === query) score += 2000;
    if (title.startsWith(query)) score += 800;
    if (title.includes(query)) score += 500;
    if (category === query) score += 400;
    if (category.startsWith(query)) score += 300;
    if (category.includes(query)) score += 200;
    if (description.includes(query)) score += 100;

    const queryWords = getWords(query);
    let matchedWords = 0;

    queryWords.forEach(function (word) {
      let wordMatched = false;
      if (title.includes(word)) { score += 180; wordMatched = true; }
      if (category.includes(word)) { score += 100; wordMatched = true; }
      if (description.includes(word)) { score += 40; wordMatched = true; }
      if (wordMatched) matchedWords++;
    });

    if (queryWords.length > 1 && matchedWords === queryWords.length) score += 500;
    if (queryWords.length > 1 && title.includes(query)) score += 700;
    return score;
  }

  function performSearch(query) {
    if (!searchResults) return;

    const originalQuery = String(query || "").trim();
    const cleanQuery = normalizeArabic(originalQuery);

    if (cleanQuery.length < 2) {
      searchResults.innerHTML = "";
      return;
    }

    const matches = searchIndex
      .map(function (post) {
        return { post: post, score: scorePost(post, cleanQuery) };
      })
      .filter(function (result) { return result.score > 0; })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return String(b.post.date || "").localeCompare(String(a.post.date || ""));
      })
      .map(function (result) { return result.post; });

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="no-results">لا توجد نتائج مطابقة لـ «' + escapeHtml(originalQuery) + '».</div>';
      return;
    }

    let html = '<div class="search-result-count">تم العثور على ' + matches.length + ' إنفوغرافيك</div>';
    const visibleMatches = matches.slice(0, 12);

    visibleMatches.forEach(function (post) {
      const title = post.title || "إنفوغرافيك";
      const category = post.category || "";
      const description = post.description || "";
      const url = post.url || "#";

      html += '<a class="search-result" href="' + escapeAttribute(url) + '">' +
        '<strong>' + escapeHtml(title) + '</strong>' +
        (category ? '<span>' + escapeHtml(category) + '</span>' : '') +
        (description ? '<small>' + escapeHtml(description) + '</small>' : '') +
        '</a>';
    });

    if (matches.length > 12) {
      html += '<div class="search-more">هناك ' + matches.length + ' نتيجة — يتم عرض أول 12.</div>';
    }

    searchResults.innerHTML = html;
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      performSearch(searchInput.value);
    });
  }

  const categoryButtons = Array.from(document.querySelectorAll(".category-chip"));
  const homeCards = Array.from(document.querySelectorAll("#infographic-grid .infographic-card"));

  categoryButtons.forEach(function (button) {
    if (!button.dataset.category) return;

    button.addEventListener("click", function (event) {
      event.preventDefault();
      const selectedCategory = button.dataset.category || "all";

      categoryButtons.forEach(function (item) {
        item.classList.remove("active");
      });
      button.classList.add("active");

      homeCards.forEach(function (card) {
        const cardCategory = (card.dataset.category || "").trim();
        card.style.display = selectedCategory === "all" || cardCategory === selectedCategory ? "" : "none";
      });
    });
  });

  /* Make every latest infographic card clickable, not only its image/title. */
  homeCards.forEach(function (card) {
    const destination = card.querySelector("h3 a") || card.querySelector(".infographic-image-link");
    if (!destination) return;

    card.classList.add("is-clickable-card");
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    card.addEventListener("click", function (event) {
      if (event.target.closest("a, button, input, textarea, select")) return;
      window.location.href = destination.href;
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.location.href = destination.href;
      }
    });
  });

  const protectedImages = document.querySelectorAll(".infographic-main-image img, .infographic-image-link img");

  protectedImages.forEach(function (image) {
    image.setAttribute("draggable", "false");
    image.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    image.addEventListener("dragstart", function (event) { event.preventDefault(); });
    image.addEventListener("selectstart", function (event) { event.preventDefault(); });
  });

  const homeLink = document.querySelector(".brand")?.getAttribute("href") || "/";
  const aboutHref = homeLink.replace(/\/?$/, "/") + "about/";

  const desktopNavigation = document.querySelector(".desktop-navigation");

  if (desktopNavigation && !desktopNavigation.querySelector('[data-nav-about="true"]')) {
    const aboutLink = document.createElement("a");
    aboutLink.href = aboutHref;
    aboutLink.className = "nav-link";
    aboutLink.textContent = "من نحن";
    aboutLink.setAttribute("data-nav-about", "true");
    aboutLink.setAttribute("aria-label", "من نحن - Infograf+");
    desktopNavigation.appendChild(aboutLink);
  }

  const headerInner = document.querySelector(".header-inner");
  if (headerInner && !headerInner.querySelector(".mobile-header-actions")) {
    const mobileAbout = document.createElement("a");
    mobileAbout.href = aboutHref;
    mobileAbout.className = "about-header-mobile";
    mobileAbout.textContent = "من نحن";
    mobileAbout.setAttribute("aria-label", "من نحن - Infograf+");

    const instagramLink = headerInner.querySelector(".instagram-header-link");
    const searchButton = headerInner.querySelector(".search-button");

    const facebookLink = document.createElement("a");
    facebookLink.href = "https://www.facebook.com/infografplus";
    facebookLink.className = "facebook-header-link";
    facebookLink.target = "_blank";
    facebookLink.rel = "noopener noreferrer";
    facebookLink.setAttribute("aria-label", "Facebook - Infograf+");
    facebookLink.setAttribute("title", "Facebook - Infograf+");
    facebookLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v3H6v4h3v6h4v-6h3.2l.8-4H13V9c0-.67.33-1 1-1z"></path></svg>';

    const actions = document.createElement("div");
    actions.className = "mobile-header-actions";

    actions.appendChild(mobileAbout);
    if (instagramLink) actions.appendChild(instagramLink);
    actions.appendChild(facebookLink);
    if (searchButton) actions.appendChild(searchButton);

    headerInner.appendChild(actions);

    const style = document.createElement("style");
    style.textContent = `
      .mobile-header-actions { display: contents; }
      .about-header-mobile, .facebook-header-link { display: none; }
      @media (max-width: 700px) {
        .header-inner { gap: 0; }
        .mobile-header-actions { display: flex; align-items: center; gap: 5px; margin-inline-start: auto; padding: 4px; border-radius: 15px; background: var(--surface-soft); flex-shrink: 0; }
        .about-header-mobile { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 10px; border-radius: 11px; background: var(--surface); color: var(--text); font-size: 11px; font-weight: 700; white-space: nowrap; text-decoration: none; flex-shrink: 0; }
        .about-header-mobile:hover, .about-header-mobile:focus-visible { background: var(--accent-light); color: var(--accent); }
        .mobile-header-actions .instagram-header-link, .mobile-header-actions .facebook-header-link, .mobile-header-actions .search-button { width: 40px; height: 40px; margin: 0; border-radius: 11px; flex-shrink: 0; }
        .facebook-header-link { display: grid; place-items: center; background: var(--surface); color: var(--text); text-decoration: none; transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease; }
        .facebook-header-link:hover, .facebook-header-link:focus-visible { background: var(--accent-light); color: var(--accent); transform: translateY(-2px); }
        .facebook-header-link svg { width: 19px; height: 19px; display: block; fill: currentColor; }
      }
    `;
    document.head.appendChild(style);
  }

  const footerNavigation = document.querySelector(".footer-navigation");
  if (footerNavigation) footerNavigation.remove();

  const footerAboutLink = document.querySelector(".footer-about-link");
  if (footerAboutLink) footerAboutLink.remove();

  if (searchPanel) searchPanel.hidden = true;

  console.log("Infograf+ loaded successfully.");
  console.log("Search index:", searchIndex.length, "posts");
});
