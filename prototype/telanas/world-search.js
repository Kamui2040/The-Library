(() => {
  "use strict";

  const profileApi = window.LibrarySpoilerProfile;
  const input = document.querySelector("[data-world-search-input]");
  const sourceFilters = document.querySelector("[data-world-search-sources]");
  const stateNode = document.querySelector("[data-world-search-state]");
  const resultsNode = document.querySelector("[data-world-search-results]");

  if (!profileApi || !input || !sourceFilters || !stateNode || !resultsNode) return;

  const ui = {
    en: {
      title: "Search",
      intro: "Search only the world knowledge currently available at your reading progress.",
      progressEyebrow: "Reading progress",
      progressTitle: "Choose what you have finished",
      progressHelp: "Hidden knowledge is excluded before the search index is built.",
      through: "Spoilers through",
      fullSpoilers: "Full spoilers",
      fullSpoilersHelp: "Include every public world-search source regardless of progress.",
      browseEyebrow: "Available knowledge",
      browseTitle: "Search Telanas",
      browseHelp: "Lexicon, Timeline, and Map results use one spoiler-filtered view.",
      currentView: "Current view",
      searchLabel: "Search visible world knowledge",
      searchPlaceholder: "Search visible world knowledge",
      prompt: "Enter a search term to search the currently visible world knowledge.",
      empty: "No visible results match this search.",
      loading: "Loading searchable world knowledge…",
      error: "World search could not be loaded.",
      all: "All",
      lexicon: "Lexicon",
      timeline: "Timeline",
      map: "Map",
      openLexicon: "Open Lexicon entry",
      openTimeline: "Open Timeline event",
      openMap: "Open Map marker"
    },
    de: {
      title: "Suche",
      intro: "Durchsuche nur Weltwissen, das zu deinem aktuellen Lesefortschritt gehört.",
      progressEyebrow: "Lesefortschritt",
      progressTitle: "Wähle, was du abgeschlossen hast",
      progressHelp: "Verstecktes Wissen wird ausgeschlossen, bevor der Suchindex entsteht.",
      through: "Spoiler bis",
      fullSpoilers: "Vollständige Spoiler",
      fullSpoilersHelp: "Beziehe alle öffentlichen Suchquellen unabhängig vom Fortschritt ein.",
      browseEyebrow: "Verfügbares Wissen",
      browseTitle: "Telanas durchsuchen",
      browseHelp: "Lexikon, Zeitleiste und Karte verwenden dieselbe spoilergefilterte Ansicht.",
      currentView: "Aktuelle Ansicht",
      searchLabel: "Sichtbares Weltwissen durchsuchen",
      searchPlaceholder: "Sichtbares Weltwissen durchsuchen",
      prompt: "Gib einen Suchbegriff ein, um das aktuell sichtbare Weltwissen zu durchsuchen.",
      empty: "Keine sichtbaren Ergebnisse passen zu dieser Suche.",
      loading: "Durchsuchbares Weltwissen wird geladen…",
      error: "Die Weltsuche konnte nicht geladen werden.",
      all: "Alle",
      lexicon: "Lexikon",
      timeline: "Zeitleiste",
      map: "Karte",
      openLexicon: "Lexikon-Eintrag öffnen",
      openTimeline: "Zeitleisten-Ereignis öffnen",
      openMap: "Kartenmarker öffnen"
    }
  };

  let world = null;
  let lexicon = null;
  let timeline = null;
  let map = null;
  let query = "";
  let activeSource = "all";

  const language = () => document.documentElement.lang === "de" ? "de" : "en";
  const table = () => ui[language()];

  const translateStatic = () => {
    const local = table();
    document.querySelectorAll("[data-world-search-i18n]").forEach((node) => {
      const key = node.dataset.worldSearchI18n;
      if (local[key]) node.textContent = local[key];
    });
    input.placeholder = local.searchPlaceholder;
  };

  const completedVolume = (profile, story) => (
    profile.worlds?.telanas?.completed?.[story] || "none"
  );

  const volumeIndex = (storyId, volumeId) => {
    const story = world?.stories?.find((item) => item.id === storyId);
    if (!Array.isArray(story?.books)) return -1;
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

  const buildLexiconResults = (profile) => {
    const lang = language();
    const visibleRawEntries = (lexicon?.entries || []).filter((entry) => visibilityAllowed(entry.visibility, profile));
    const visibleIds = new Set(visibleRawEntries.map((entry) => entry.id));
    const rawById = new Map((lexicon?.entries || []).map((entry) => [entry.id, entry]));

    return visibleRawEntries.map((entry) => {
      const labels = entry.labels?.[lang];
      if (!labels) return null;

      const fragments = (entry.fragments || [])
        .filter((fragment) => visibilityAllowed(fragment.visibility, profile))
        .map((fragment) => ({
          text: fragment.text?.[lang],
          readerLinks: (fragment.readerLinks || [])
            .map((link) => localizedReaderLink(link, lang))
            .filter(Boolean)
        }))
        .filter((fragment) => typeof fragment.text === "string" && fragment.text.trim());

      const relationshipTerms = (entry.relationships || []).flatMap((relationship) => {
        if (!visibleIds.has(relationship.target)) return [];
        const target = rawById.get(relationship.target);
        const label = relationship.labels?.[lang];
        const targetTitle = target?.labels?.[lang]?.title;
        return typeof label === "string" && typeof targetTitle === "string" ? [label, targetTitle] : [];
      });

      return {
        type: "lexicon",
        id: entry.id,
        title: labels.title,
        summary: labels.summary,
        meta: "",
        searchText: [
          labels.title,
          labels.summary,
          ...fragments.map((fragment) => fragment.text),
          ...relationshipTerms
        ].join(" "),
        readerLinks: fragments.flatMap((fragment) => fragment.readerLinks),
        sourceHref: `lexicon.html?entry=${encodeURIComponent(entry.id)}`
      };
    }).filter(Boolean);
  };

  const buildTimelineResults = (profile) => {
    const lang = language();
    return (timeline?.events || []).map((event) => {
      if (!visibilityAllowed(event.visibility, profile)) return null;
      const labels = event.labels?.[lang];
      if (!labels) return null;
      const readerLinks = (event.readerLinks || [])
        .map((link) => localizedReaderLink(link, lang))
        .filter(Boolean);
      return {
        type: "timeline",
        id: event.id,
        title: labels.title,
        summary: labels.summary,
        meta: labels.period,
        searchText: [labels.period, labels.title, labels.summary, ...readerLinks.map((link) => link.label)].join(" "),
        readerLinks,
        sourceHref: `timeline.html?event=${encodeURIComponent(event.id)}`
      };
    }).filter(Boolean);
  };

  const buildMapResults = (profile) => {
    const lang = language();
    return (map?.markers || []).map((marker) => {
      if (!visibilityAllowed(marker.visibility, profile)) return null;
      const labels = marker.labels?.[lang];
      if (!labels) return null;
      const readerLinks = (marker.readerLinks || [])
        .map((link) => localizedReaderLink(link, lang))
        .filter(Boolean);
      return {
        type: "map",
        id: marker.id,
        title: labels.title,
        summary: labels.summary,
        meta: labels.kind,
        searchText: [labels.kind, labels.title, labels.summary, ...readerLinks.map((link) => link.label)].join(" "),
        readerLinks,
        sourceHref: `map.html?marker=${encodeURIComponent(marker.id)}`
      };
    }).filter(Boolean);
  };

  const visibleSearchRecords = () => {
    const profile = profileApi.get();
    return [
      ...buildLexiconResults(profile),
      ...buildTimelineResults(profile),
      ...buildMapResults(profile)
    ];
  };

  const sourceLabel = (type) => table()[type] || type;

  const renderSourceFilters = () => {
    sourceFilters.replaceChildren();
    for (const source of ["all", "lexicon", "timeline", "map"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "world-search-source-filter";
      button.dataset.worldSearchSource = source;
      button.textContent = table()[source];
      button.setAttribute("aria-pressed", String(activeSource === source));
      button.addEventListener("click", () => {
        activeSource = source;
        render();
      });
      sourceFilters.append(button);
    }
  };

  const readerHref = (link) => {
    const parameters = new URLSearchParams({
      world: world.id,
      story: link.story,
      book: link.book,
      source: "search"
    });
    return `reader.html?${parameters.toString()}#${encodeURIComponent(link.anchor)}`;
  };

  const sourceActionLabel = (type) => {
    if (type === "lexicon") return table().openLexicon;
    if (type === "timeline") return table().openTimeline;
    return table().openMap;
  };

  const renderResult = (record) => {
    const article = document.createElement("article");
    article.className = "world-search-result framed-panel";
    article.dataset.worldSearchResult = `${record.type}:${record.id}`;

    const heading = document.createElement("div");
    heading.className = "world-search-result-heading";
    const title = document.createElement("h3");
    title.textContent = record.title;
    const source = document.createElement("span");
    source.className = "world-search-result-source";
    source.textContent = sourceLabel(record.type);
    heading.append(title, source);
    article.append(heading);

    if (record.meta) {
      const meta = document.createElement("p");
      meta.className = "world-search-result-meta";
      meta.textContent = record.meta;
      article.append(meta);
    }

    const summary = document.createElement("p");
    summary.className = "world-search-result-summary";
    summary.textContent = record.summary;
    article.append(summary);

    if (record.readerLinks.length) {
      const readerLinks = document.createElement("div");
      readerLinks.className = "world-search-reader-links";
      for (const link of record.readerLinks) {
        const anchor = document.createElement("a");
        anchor.className = "world-search-reader-link";
        anchor.href = readerHref(link);
        anchor.textContent = link.label;
        const arrow = document.createElement("span");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        anchor.append(arrow);
        readerLinks.append(anchor);
      }
      article.append(readerLinks);
    }

    const actions = document.createElement("div");
    actions.className = "world-search-result-actions";
    const sourceLink = document.createElement("a");
    sourceLink.className = "world-search-result-link";
    sourceLink.href = record.sourceHref;
    sourceLink.textContent = sourceActionLabel(record.type);
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    sourceLink.append(arrow);
    actions.append(sourceLink);
    article.append(actions);

    return article;
  };

  const render = () => {
    translateStatic();
    renderSourceFilters();
    if (!world || !lexicon || !timeline || !map) return;

    query = input.value.trim().toLocaleLowerCase(language());
    if (!query) {
      resultsNode.replaceChildren();
      stateNode.textContent = table().prompt;
      return;
    }

    const records = visibleSearchRecords()
      .filter((record) => activeSource === "all" || record.type === activeSource)
      .filter((record) => record.searchText.toLocaleLowerCase(language()).includes(query))
      .sort((left, right) => left.title.localeCompare(right.title, language()));

    resultsNode.replaceChildren(...records.map(renderResult));
    stateNode.textContent = records.length ? "" : table().empty;
  };

  input.addEventListener("input", render);
  window.addEventListener(profileApi.eventName, render);
  window.addEventListener("library-language-change", render);

  const loadJson = async (url, label) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
    return response.json();
  };

  const load = async () => {
    stateNode.textContent = table().loading;
    try {
      const worldUrl = new URL("../../content/worlds/telanas/world.json", window.location.href);
      world = await loadJson(worldUrl, "World manifest");
      if (!world.lexicon || !world.timeline || !world.map) throw new Error("World search sources are not fully registered");

      [lexicon, timeline, map] = await Promise.all([
        loadJson(new URL(world.lexicon, worldUrl), "Lexicon manifest"),
        loadJson(new URL(world.timeline, worldUrl), "Timeline manifest"),
        loadJson(new URL(world.map, worldUrl), "Map manifest")
      ]);

      const requested = new URLSearchParams(location.search).get("q");
      if (requested) input.value = requested;
      stateNode.textContent = "";
      render();
    } catch (error) {
      console.error(error);
      resultsNode.replaceChildren();
      sourceFilters.replaceChildren();
      stateNode.textContent = table().error;
    }
  };

  translateStatic();
  renderSourceFilters();
  load();
})();
