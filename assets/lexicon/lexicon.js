(() => {
  "use strict";

  const body = document.body;
  const profileApi = window.LibrarySpoilerProfile;
  const resultsNode = document.querySelector("[data-lexicon-results]");
  const stateNode = document.querySelector("[data-lexicon-state]");
  const filtersNode = document.querySelector("[data-category-filters]");
  const searchInput = document.querySelector("[data-lexicon-search]");
  const worldManifestReference = body?.dataset.worldManifest;
  const lexiconManifestReference = body?.dataset.lexiconManifest;
  const readerBaseReference = body?.dataset.readerBase;

  if (
    !body || !profileApi || !resultsNode || !stateNode || !filtersNode || !searchInput ||
    !worldManifestReference || !lexiconManifestReference || !readerBaseReference
  ) return;

  const ui = {
    en: {
      title: "Lexicon",
      intro: "Browse only the world information available at your selected reading progress.",
      progressEyebrow: "Reading progress",
      progressTitle: "Choose what you have finished",
      progressHelp: "Entries and search results beyond this point are not rendered at all.",
      through: "Spoilers through",
      fullSpoilers: "Full spoilers",
      fullSpoilersHelp: "Show every public Lexicon entry regardless of progress.",
      browseEyebrow: "Available knowledge",
      browseTitle: "Browse the Lexicon",
      browseHelp: "Search and categories use the same spoiler-filtered data set.",
      currentView: "Current view",
      searchLabel: "Search visible entries",
      searchPlaceholder: "Search visible entries",
      all: "All",
      empty: "No entries match this view.",
      loading: "Loading Lexicon…",
      error: "The Lexicon could not be loaded.",
      prototype: "Prototype",
      related: "Related",
      readMore: "Read more",
      close: "Close",
      fullName: "Full name",
      sortLabel: "Sort entries",
      sortAppearance: "Appearance",
      sortAlphabetical: "Alphabetical",
      sortChronological: "Chronological"
    },
    de: {
      title: "Lexikon",
      intro: "Durchsuche nur Weltinformationen, die zu deinem gewählten Lesefortschritt gehören.",
      progressEyebrow: "Lesefortschritt",
      progressTitle: "Wähle, was du abgeschlossen hast",
      progressHelp: "Spätere Einträge und Suchergebnisse werden überhaupt nicht gerendert.",
      through: "Spoiler bis",
      fullSpoilers: "Vollständige Spoiler",
      fullSpoilersHelp: "Zeige alle öffentlichen Lexikon-Einträge unabhängig vom Fortschritt.",
      browseEyebrow: "Verfügbares Wissen",
      browseTitle: "Lexikon durchsuchen",
      browseHelp: "Suche und Kategorien verwenden denselben spoilergefilterten Datensatz.",
      currentView: "Aktuelle Ansicht",
      searchLabel: "Sichtbare Einträge durchsuchen",
      searchPlaceholder: "Sichtbare Einträge durchsuchen",
      all: "Alle",
      empty: "Keine Einträge passen zu dieser Ansicht.",
      loading: "Lexikon wird geladen…",
      error: "Das Lexikon konnte nicht geladen werden.",
      prototype: "Prototyp",
      related: "Verwandt",
      readMore: "Mehr lesen",
      close: "Schließen",
      fullName: "Vollständiger Name",
      sortLabel: "Einträge sortieren",
      sortAppearance: "Auftreten",
      sortAlphabetical: "Alphabetisch",
      sortChronological: "Chronologisch"
    }
  };

  const initialParameters = new URLSearchParams(location.search);
  let lexicon = null;
  let world = null;
  let activeCategory = initialParameters.get("entry") ? "all" : (initialParameters.get("category") || "all");
  let requestedEntry = initialParameters.get("entry");
  let query = "";
  const sortStorageKey = "library-lexicon-sort-v1";
  let sortMode = "appearance";
  try {
    const savedSort = localStorage.getItem(sortStorageKey);
    if (["appearance", "alphabetical", "chronological"].includes(savedSort)) sortMode = savedSort;
  } catch {
    // Local persistence is optional.
  }

  const searchRow = searchInput.closest(".lexicon-search-row");
  if (!searchRow) return;
  const sortField = document.createElement("label");
  sortField.className = "lexicon-sort";
  const sortLabel = document.createElement("span");
  const sortSelect = document.createElement("select");
  sortSelect.dataset.lexiconSort = "";
  sortField.append(sortLabel, sortSelect);
  searchRow.append(sortField);

  const detailOverlay = document.createElement("div");
  detailOverlay.className = "lexicon-detail-overlay";
  detailOverlay.hidden = true;
  detailOverlay.setAttribute("role", "presentation");
  const detailPanel = document.createElement("article");
  detailPanel.className = "lexicon-detail framed-panel";
  detailPanel.setAttribute("role", "dialog");
  detailPanel.setAttribute("aria-modal", "true");
  detailPanel.setAttribute("aria-labelledby", "lexicon-detail-title");
  detailPanel.tabIndex = -1;
  const detailClose = document.createElement("button");
  detailClose.type = "button";
  detailClose.className = "lexicon-detail-close";
  detailClose.textContent = "×";
  detailPanel.append(detailClose);
  detailOverlay.append(detailPanel);
  document.body.append(detailOverlay);

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const translateStatic = () => {
    const table = ui[language()];
    document.querySelectorAll("[data-lexicon-i18n]").forEach((node) => {
      const key = node.dataset.lexiconI18n;
      if (table[key]) node.textContent = table[key];
    });
    searchInput.placeholder = table.searchPlaceholder;
    sortLabel.textContent = table.sortLabel;
    sortSelect.setAttribute("aria-label", table.sortLabel);
    sortSelect.replaceChildren(...[
      ["appearance", table.sortAppearance],
      ["alphabetical", table.sortAlphabetical],
      ["chronological", table.sortChronological]
    ].map(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = value === sortMode;
      return option;
    }));
    detailClose.setAttribute("aria-label", table.close);
    detailClose.title = table.close;
  };

  const volumeIndex = (storyId, volumeId) => {
    const story = world?.stories?.find((item) => item.id === storyId);
    if (!Array.isArray(story?.books)) return -1;
    return story.books.findIndex((book) => book.id === volumeId);
  };

  const visibilityAllowed = (visibility, profile) => (
    profileApi.visibilityAllowed(world, visibility, profile)
  );

  const rawEntry = (entryId) => (
    (lexicon?.entries || []).find((entry) => entry.id === entryId) || null
  );

  const localizedReaderLink = (link, lang) => {
    if (!link || volumeIndex(link.story, link.book) < 0) return null;
    const label = link.labels?.[lang];
    if (typeof label !== "string" || !label.trim()) return null;

    return {
      id: link.id,
      story: link.story,
      book: link.book,
      anchor: link.anchor,
      label
    };
  };

  const localizedRelationship = (relationship, profile, lang) => {
    if (!visibilityAllowed(relationship?.visibility || { mode: "always" }, profile)) return null;
    const target = rawEntry(relationship?.target);
    if (!target || !visibilityAllowed(target.visibility, profile)) return null;

    const label = relationship.labels?.[lang];
    const targetTitle = target.labels?.[lang]?.title;
    if (typeof label !== "string" || !label.trim()) return null;
    if (typeof targetTitle !== "string" || !targetTitle.trim()) return null;

    return {
      id: relationship.id,
      target: target.id,
      label,
      targetTitle
    };
  };

  const localizedEntry = (entry, profile) => {
    if (!visibilityAllowed(entry.visibility, profile)) return null;

    const lang = language();
    const labels = entry.labels?.[lang];
    if (!labels) return null;

    const sections = (entry.sections || [])
      .filter((section) => visibilityAllowed(section.visibility, profile))
      .map((section) => {
        const title = section.labels?.[lang];
        const text = section.text?.[lang];
        if (typeof title !== "string" || !title.trim() || typeof text !== "string" || !text.trim()) return null;
        return { id: section.id, title, text };
      })
      .filter(Boolean);

    const fragments = (entry.fragments || [])
      .filter((fragment) => visibilityAllowed(fragment.visibility, profile))
      .map((fragment) => {
        const text = fragment.text?.[lang];
        if (typeof text !== "string" || !text.trim()) return null;

        return {
          id: fragment.id,
          text,
          readerLinks: (fragment.readerLinks || [])
            .map((link) => localizedReaderLink(link, lang))
            .filter(Boolean)
        };
      })
      .filter(Boolean);

    const relationships = (entry.relationships || [])
      .map((relationship) => localizedRelationship(relationship, profile, lang))
      .filter(Boolean);

    return {
      id: entry.id,
      categories: entry.categories || [],
      prototypeOnly: entry.prototypeOnly === true,
      title: labels.title,
      fullName: typeof labels.fullName === "string" ? labels.fullName : "",
      summary: labels.summary,
      sections,
      fragments,
      relationships,
      appearanceOrder: Number.isFinite(entry.appearanceOrder) ? entry.appearanceOrder : Number.MAX_SAFE_INTEGER,
      chronologyOrder: Number.isFinite(entry.chronologyOrder) ? entry.chronologyOrder : (Number.isFinite(entry.appearanceOrder) ? entry.appearanceOrder : Number.MAX_SAFE_INTEGER)
    };
  };

  const visibleEntries = () => {
    const profile = profileApi.get();
    return (lexicon?.entries || [])
      .map((entry) => localizedEntry(entry, profile))
      .filter(Boolean);
  };

  const visibleCategoryIds = (entries) => {
    const ids = new Set();
    for (const entry of entries) {
      for (const category of entry.categories) ids.add(category);
    }
    return ids;
  };

  const searchEligible = (entry) => {
    if (activeCategory !== "all" && !entry.categories.includes(activeCategory)) return false;
    if (!query) return true;

    const haystack = [
      entry.title,
      entry.fullName,
      entry.summary,
      ...entry.sections.flatMap((section) => [section.title, section.text]),
      ...entry.fragments.map((fragment) => fragment.text),
      ...entry.relationships.flatMap((relationship) => [relationship.label, relationship.targetTitle])
    ]
      .join(" ")
      .toLocaleLowerCase(language());
    return haystack.includes(query);
  };

  const updateRouteState = ({ category = activeCategory, entry = requestedEntry } = {}) => {
    const url = new URL(location.href);
    if (category && category !== "all") url.searchParams.set("category", category);
    else url.searchParams.delete("category");
    if (entry) url.searchParams.set("entry", entry);
    else url.searchParams.delete("entry");
    history.replaceState(null, "", url);
  };

  const normalizeCategory = (categoryIds) => {
    if (activeCategory === "all") return;
    if (!categoryIds.has(activeCategory)) {
      activeCategory = "all";
      updateRouteState({ category: "all" });
    }
  };

  const renderFilters = (categoryIds) => {
    filtersNode.replaceChildren();
    const table = ui[language()];

    const makeButton = (id, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-filter";
      button.dataset.category = id;
      button.textContent = label;
      button.setAttribute("aria-pressed", String(activeCategory === id));
      button.addEventListener("click", () => {
        activeCategory = id;
        requestedEntry = null;
        updateRouteState({ category: id, entry: null });
        render();
      });
      return button;
    };

    filtersNode.append(makeButton("all", table.all));

    for (const category of lexicon?.categories || []) {
      if (!categoryIds.has(category.id)) continue;
      const label = category.labels?.[language()];
      if (!label) continue;
      filtersNode.append(makeButton(category.id, label));
    }
  };

  const readerHref = (link) => {
    const readerBase = new URL(readerBaseReference, window.location.href);
    const target = new URL(
      `${encodeURIComponent(link.story)}/${encodeURIComponent(link.book)}/`,
      readerBase,
    );
    target.search = new URLSearchParams({
      world: lexicon.world,
      story: link.story,
      book: link.book,
      source: "lexicon"
    }).toString();
    target.hash = link.anchor;
    return target.href;
  };

  const renderReaderLink = (link) => {
    const anchor = document.createElement("a");
    anchor.className = "lexicon-reader-link";
    anchor.href = readerHref(link);
    anchor.dataset.readerReference = link.id;
    anchor.textContent = link.label;

    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    anchor.append(arrow);
    return anchor;
  };

  const renderFragment = (fragment) => {
    const section = document.createElement("section");
    section.className = "lexicon-fragment";
    section.dataset.lexiconFragment = fragment.id;

    const paragraph = document.createElement("p");
    paragraph.textContent = fragment.text;
    section.append(paragraph);

    if (fragment.readerLinks.length > 0) {
      const links = document.createElement("div");
      links.className = "lexicon-reader-links";
      links.append(...fragment.readerLinks.map(renderReaderLink));
      section.append(links);
    }

    return section;
  };

  const renderRelationship = (relationship) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lexicon-relationship";
    button.dataset.relationshipTarget = relationship.target;

    const label = document.createElement("span");
    label.textContent = relationship.label;
    const target = document.createElement("strong");
    target.textContent = relationship.targetTitle;
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    button.append(label, target, arrow);
    button.addEventListener("click", () => {
      activeCategory = "all";
      query = "";
      searchInput.value = "";
      requestedEntry = relationship.target;
      updateRouteState({ category: "all", entry: relationship.target });
      render();
    });
    return button;
  };

  const renderRelationships = (relationships) => {
    if (relationships.length === 0) return null;

    const section = document.createElement("section");
    section.className = "lexicon-relationships";

    const heading = document.createElement("h4");
    heading.textContent = ui[language()].related;

    const links = document.createElement("div");
    links.className = "lexicon-relationship-list";
    links.append(...relationships.map(renderRelationship));

    section.append(heading, links);
    return section;
  };

  const closeDetail = (clearRoute = true) => {
    detailOverlay.hidden = true;
    if (clearRoute && requestedEntry) {
      requestedEntry = null;
      updateRouteState({ entry: null });
    }
  };

  const renderDetail = (entry) => {
    detailPanel.replaceChildren(detailClose);

    const title = document.createElement("h2");
    title.id = "lexicon-detail-title";
    title.textContent = entry.title;
    detailPanel.append(title);

    if (entry.fullName && entry.fullName !== entry.title) {
      const fullName = document.createElement("p");
      fullName.className = "lexicon-detail-full-name";
      fullName.textContent = `${ui[language()].fullName}: ${entry.fullName}`;
      detailPanel.append(fullName);
    }

    const summary = document.createElement("p");
    summary.className = "lexicon-detail-summary";
    summary.textContent = entry.summary;
    detailPanel.append(summary);

    if (entry.sections.length > 0) {
      const sections = document.createElement("div");
      sections.className = "lexicon-detail-sections";
      for (const item of entry.sections) {
        const section = document.createElement("section");
        const heading = document.createElement("h3");
        heading.textContent = item.title;
        const paragraph = document.createElement("p");
        paragraph.textContent = item.text;
        section.append(heading, paragraph);
        sections.append(section);
      }
      detailPanel.append(sections);
    }

    if (entry.fragments.length > 0) {
      const fragments = document.createElement("div");
      fragments.className = "lexicon-detail-fragments";
      fragments.append(...entry.fragments.map(renderFragment));
      detailPanel.append(fragments);
    }

    const relationships = renderRelationships(entry.relationships);
    if (relationships) detailPanel.append(relationships);

    detailOverlay.hidden = false;
    detailPanel.focus({ preventScroll: true });
  };

  const renderEntry = (entry) => {
    const article = document.createElement("article");
    article.className = "lexicon-entry framed-panel";
    article.dataset.lexiconEntry = entry.id;

    const headingRow = document.createElement("div");
    headingRow.className = "lexicon-entry-heading";
    const title = document.createElement("h3");
    title.textContent = entry.title;
    headingRow.append(title);

    if (entry.prototypeOnly) {
      const badge = document.createElement("span");
      badge.className = "prototype-badge";
      badge.textContent = ui[language()].prototype;
      headingRow.append(badge);
    }

    const summary = document.createElement("p");
    summary.className = "lexicon-entry-summary";
    summary.textContent = entry.summary;

    const readMore = document.createElement("button");
    readMore.type = "button";
    readMore.className = "lexicon-read-more";
    readMore.textContent = ui[language()].readMore;
    readMore.addEventListener("click", () => {
      requestedEntry = entry.id;
      updateRouteState({ category: activeCategory, entry: entry.id });
      render();
    });

    article.append(headingRow, summary, readMore);
    return article;
  };

  const compareEntries = (left, right) => {
    if (sortMode === "alphabetical") return left.title.localeCompare(right.title, language());
    const key = sortMode === "chronological" ? "chronologyOrder" : "appearanceOrder";
    return (left[key] - right[key]) || left.title.localeCompare(right.title, language());
  };

  const openRequestedDetail = (eligible) => {
    if (!requestedEntry) {
      detailOverlay.hidden = true;
      return;
    }
    const entry = eligible.find((item) => item.id === requestedEntry);
    if (!entry) {
      closeDetail(true);
      return;
    }
    renderDetail(entry);
  };

  const render = () => {
    translateStatic();
    if (!lexicon || !world) return;

    const eligible = visibleEntries();
    const categoryIds = visibleCategoryIds(eligible);
    normalizeCategory(categoryIds);
    renderFilters(categoryIds);

    const filtered = eligible
      .filter(searchEligible)
      .sort(compareEntries);

    resultsNode.replaceChildren(...filtered.map(renderEntry));
    stateNode.textContent = filtered.length === 0 ? ui[language()].empty : "";
    openRequestedDetail(eligible);
  };

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLocaleLowerCase(language());
    if (requestedEntry) {
      requestedEntry = null;
      updateRouteState({ entry: null });
    }
    render();
  });

  sortSelect.addEventListener("change", () => {
    sortMode = ["appearance", "alphabetical", "chronological"].includes(sortSelect.value) ? sortSelect.value : "appearance";
    try {
      localStorage.setItem(sortStorageKey, sortMode);
    } catch {
      // Local persistence is optional.
    }
    render();
  });

  detailClose.addEventListener("click", () => closeDetail(true));
  detailOverlay.addEventListener("click", (event) => {
    if (event.target === detailOverlay) closeDetail(true);
  });
  document.addEventListener("keydown", (event) => {
    if (!detailOverlay.hidden && event.key === "Escape") {
      event.preventDefault();
      closeDetail(true);
    }
  });

  window.addEventListener(profileApi.eventName, render);
  window.addEventListener("library-language-change", () => {
    query = searchInput.value.trim().toLocaleLowerCase(language());
    render();
  });

  const load = async () => {
    stateNode.textContent = ui[language()].loading;
    try {
      const [worldResponse, lexiconResponse] = await Promise.all([
        fetch(new URL(worldManifestReference, window.location.href), { cache: "no-store" }),
        fetch(new URL(lexiconManifestReference, window.location.href), { cache: "no-store" })
      ]);

      if (!worldResponse.ok || !lexiconResponse.ok) throw new Error("Lexicon manifest request failed");
      [world, lexicon] = await Promise.all([worldResponse.json(), lexiconResponse.json()]);
      stateNode.textContent = "";
      render();
    } catch (error) {
      console.error(error);
      resultsNode.replaceChildren();
      stateNode.textContent = ui[language()].error;
    }
  };

  translateStatic();
  load();
})();
