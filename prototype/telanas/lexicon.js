(() => {
  "use strict";

  const profileApi = window.LibrarySpoilerProfile;
  const resultsNode = document.querySelector("[data-lexicon-results]");
  const stateNode = document.querySelector("[data-lexicon-state]");
  const filtersNode = document.querySelector("[data-category-filters]");
  const searchInput = document.querySelector("[data-lexicon-search]");

  if (!profileApi || !resultsNode || !stateNode || !filtersNode || !searchInput) return;

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
      prototype: "Prototype"
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
      prototype: "Prototyp"
    }
  };

  let lexicon = null;
  let world = null;
  let activeCategory = "all";
  let query = "";

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const translateStatic = () => {
    const table = ui[language()];
    document.querySelectorAll("[data-lexicon-i18n]").forEach((node) => {
      const key = node.dataset.lexiconI18n;
      if (table[key]) node.textContent = table[key];
    });
    searchInput.placeholder = table.searchPlaceholder;
  };

  const completedVolume = (profile, story) => (
    profile.worlds?.telanas?.completed?.[story] || "none"
  );

  const volumeIndex = (storyId, volumeId) => {
    const story = world?.stories?.find((item) => item.id === storyId);
    if (!story) return -1;
    return story.books.findIndex((book) => book.id === volumeId);
  };

  const visibilityAllowed = (visibility, profile) => {
    if (profile.fullSpoilers) return true;
    if (!visibility || visibility.mode === "always") return true;
    if (visibility.mode === "full-spoilers") return false;

    if (visibility.mode === "completed-volume") {
      const required = volumeIndex(visibility.story, visibility.volume);
      const completed = volumeIndex(visibility.story, completedVolume(profile, visibility.story));
      return required >= 0 && completed >= required;
    }

    return false;
  };

  const localizedEntry = (entry, profile) => {
    if (!visibilityAllowed(entry.visibility, profile)) return null;

    const lang = language();
    const labels = entry.labels?.[lang];
    if (!labels) return null;

    const fragments = (entry.fragments || [])
      .filter((fragment) => visibilityAllowed(fragment.visibility, profile))
      .map((fragment) => fragment.text?.[lang])
      .filter((text) => typeof text === "string" && text.trim());

    return {
      id: entry.id,
      categories: entry.categories || [],
      prototypeOnly: entry.prototypeOnly === true,
      title: labels.title,
      summary: labels.summary,
      fragments
    };
  };

  const visibleEntries = () => {
    const profile = profileApi.get();
    return (lexicon?.entries || [])
      .map((entry) => localizedEntry(entry, profile))
      .filter(Boolean);
  };

  const searchEligible = (entry) => {
    if (activeCategory !== "all" && !entry.categories.includes(activeCategory)) return false;
    if (!query) return true;

    const haystack = [entry.title, entry.summary, ...entry.fragments]
      .join(" ")
      .toLocaleLowerCase(language());
    return haystack.includes(query);
  };

  const renderFilters = (entries) => {
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
        render();
      });
      return button;
    };

    filtersNode.append(makeButton("all", table.all));

    for (const category of lexicon?.categories || []) {
      const label = category.labels?.[language()];
      if (!label) continue;
      filtersNode.append(makeButton(category.id, label));
    }

    // No category counts are rendered. A category with no currently visible entries
    // therefore cannot disclose how much hidden content exists behind the spoiler gate.
    void entries;
  };

  const renderEntry = (entry) => {
    const article = document.createElement("article");
    article.className = "lexicon-entry framed-panel";

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

    article.append(headingRow, summary);

    for (const text of entry.fragments) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      article.append(paragraph);
    }

    return article;
  };

  const render = () => {
    translateStatic();
    if (!lexicon || !world) return;

    const eligible = visibleEntries();
    renderFilters(eligible);

    const filtered = eligible
      .filter(searchEligible)
      .sort((left, right) => left.title.localeCompare(right.title, language()));

    resultsNode.replaceChildren(...filtered.map(renderEntry));
    stateNode.textContent = filtered.length === 0 ? ui[language()].empty : "";
  };

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLocaleLowerCase(language());
    render();
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
        fetch("../../content/worlds/telanas/world.json", { cache: "no-store" }),
        fetch("../../content/worlds/telanas/lexicon/lexicon.json", { cache: "no-store" })
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
