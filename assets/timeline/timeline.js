(() => {
  "use strict";

  const body = document.body;
  const profileApi = window.LibrarySpoilerProfile;
  const resultsNode = document.querySelector("[data-timeline-results]");
  const stateNode = document.querySelector("[data-timeline-state]");
  const searchInput = document.querySelector("[data-timeline-search]");
  const worldManifestReference = body?.dataset.worldManifest;
  const timelineManifestReference = body?.dataset.timelineManifest;
  const readerBaseReference = body?.dataset.readerBase;

  if (
    !body || !profileApi || !resultsNode || !stateNode || !searchInput ||
    !worldManifestReference || !timelineManifestReference || !readerBaseReference
  ) return;

  const ui = {
    en: {
      title: "Timeline",
      intro: "Browse only timeline knowledge available at your selected reading progress.",
      progressEyebrow: "Reading progress",
      progressTitle: "Choose what you have finished",
      progressHelp: "Later events remain completely absent until your spoiler profile allows them.",
      through: "Spoilers through",
      fullSpoilers: "Full spoilers",
      fullSpoilersHelp: "Show every public timeline event regardless of progress.",
      browseEyebrow: "Available chronology",
      browseTitle: "Telanas timeline",
      browseHelp: "Search uses only events already visible at the current spoiler level.",
      currentView: "Current view",
      searchLabel: "Search visible timeline events",
      searchPlaceholder: "Search visible timeline events",
      empty: "No timeline events match this view.",
      loading: "Loading timeline…",
      error: "The timeline could not be loaded.",
      prototype: "Prototype"
    },
    de: {
      title: "Zeitleiste",
      intro: "Durchsuche nur Zeitleistenwissen, das zu deinem gewählten Lesefortschritt gehört.",
      progressEyebrow: "Lesefortschritt",
      progressTitle: "Wähle, was du abgeschlossen hast",
      progressHelp: "Spätere Ereignisse bleiben vollständig unsichtbar, bis dein Spoilerprofil sie erlaubt.",
      through: "Spoiler bis",
      fullSpoilers: "Vollständige Spoiler",
      fullSpoilersHelp: "Zeige alle öffentlichen Zeitleisten-Ereignisse unabhängig vom Fortschritt.",
      browseEyebrow: "Verfügbare Chronologie",
      browseTitle: "Telanas-Zeitleiste",
      browseHelp: "Die Suche verwendet nur Ereignisse, die beim aktuellen Spoilerstand bereits sichtbar sind.",
      currentView: "Aktuelle Ansicht",
      searchLabel: "Sichtbare Zeitleisten-Ereignisse durchsuchen",
      searchPlaceholder: "Sichtbare Zeitleisten-Ereignisse durchsuchen",
      empty: "Keine Zeitleisten-Ereignisse passen zu dieser Ansicht.",
      loading: "Zeitleiste wird geladen…",
      error: "Die Zeitleiste konnte nicht geladen werden.",
      prototype: "Prototyp"
    }
  };

  const initialParameters = new URLSearchParams(location.search);
  let world = null;
  let timeline = null;
  let query = "";
  let requestedEvent = initialParameters.get("event");
  let linkedEventFocused = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const language = () => document.documentElement.lang === "de" ? "de" : "en";
  const table = () => ui[language()];

  const translateStatic = () => {
    const local = table();
    document.querySelectorAll("[data-timeline-i18n]").forEach((node) => {
      const key = node.dataset.timelineI18n;
      if (local[key]) node.textContent = local[key];
    });
    searchInput.placeholder = local.searchPlaceholder;
  };

  const volumeIndex = (storyId, volumeId) => {
    const story = world?.stories?.find((item) => item.id === storyId);
    if (!Array.isArray(story?.books)) return -1;
    return story.books.findIndex((book) => book.id === volumeId);
  };

  const visibilityAllowed = (visibility, profile) => (
    profileApi.visibilityAllowed(world, visibility, profile)
  );

  const localizedReaderLink = (link, lang) => {
    if (!link || volumeIndex(link.story, link.book) < 0) return null;
    const label = link.labels?.[lang];
    if (typeof label !== "string" || !label.trim()) return null;
    return { id: link.id, story: link.story, book: link.book, anchor: link.anchor, label };
  };

  const localizedEvent = (event, profile) => {
    if (!visibilityAllowed(event.visibility, profile)) return null;
    const labels = event.labels?.[language()];
    if (!labels) return null;
    return {
      id: event.id,
      order: event.order,
      prototypeOnly: event.prototypeOnly === true,
      period: labels.period,
      title: labels.title,
      summary: labels.summary,
      readerLinks: (event.readerLinks || [])
        .map((link) => localizedReaderLink(link, language()))
        .filter(Boolean)
    };
  };

  const visibleEvents = () => {
    const profile = profileApi.get();
    return (timeline?.events || [])
      .map((event) => localizedEvent(event, profile))
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  };

  const matchesSearch = (event) => {
    if (!query) return true;
    const haystack = [
      event.period,
      event.title,
      event.summary,
      ...event.readerLinks.map((link) => link.label)
    ].join(" ").toLocaleLowerCase(language());
    return haystack.includes(query);
  };

  const updateRouteState = (eventId = requestedEvent) => {
    const url = new URL(location.href);
    if (eventId) url.searchParams.set("event", eventId);
    else url.searchParams.delete("event");
    history.replaceState(null, "", url);
  };

  const readerHref = (link) => {
    const readerBase = new URL(readerBaseReference, window.location.href);
    const target = new URL(
      `${encodeURIComponent(link.story)}/${encodeURIComponent(link.book)}/`,
      readerBase,
    );
    target.search = new URLSearchParams({
      world: timeline.world,
      story: link.story,
      book: link.book,
      source: "timeline"
    }).toString();
    target.hash = link.anchor;
    return target.href;
  };

  const renderEvent = (event) => {
    const article = document.createElement("article");
    article.className = "timeline-event framed-panel";
    article.dataset.timelineEvent = event.id;
    article.tabIndex = -1;

    const period = document.createElement("p");
    period.className = "timeline-period";
    period.textContent = event.period;

    const title = document.createElement("h3");
    title.textContent = event.title;

    const summary = document.createElement("p");
    summary.className = "timeline-event-summary";
    summary.textContent = event.summary;

    article.append(period, title, summary);

    if (event.prototypeOnly) {
      const badge = document.createElement("span");
      badge.className = "prototype-badge";
      badge.textContent = table().prototype;
      article.append(badge);
    }

    if (event.readerLinks.length) {
      const links = document.createElement("div");
      links.className = "timeline-reader-links";
      for (const link of event.readerLinks) {
        const anchor = document.createElement("a");
        anchor.className = "timeline-reader-link";
        anchor.href = readerHref(link);
        anchor.dataset.timelineReaderReference = link.id;
        anchor.textContent = link.label;
        const arrow = document.createElement("span");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        anchor.append(arrow);
        links.append(anchor);
      }
      article.append(links);
    }

    return article;
  };

  const focusLinkedEvent = () => {
    if (!requestedEvent || linkedEventFocused) return;
    const target = [...resultsNode.querySelectorAll("[data-timeline-event]")]
      .find((node) => node.dataset.timelineEvent === requestedEvent);
    if (!target) return;

    linkedEventFocused = true;
    requestAnimationFrame(() => {
      target.scrollIntoView({
        block: "center",
        behavior: reducedMotion.matches ? "auto" : "smooth"
      });
      target.focus({ preventScroll: true });
    });
  };

  const render = () => {
    translateStatic();
    if (!world || !timeline) return;
    const filtered = visibleEvents().filter(matchesSearch);
    resultsNode.replaceChildren(...filtered.map(renderEvent));
    stateNode.textContent = filtered.length ? "" : table().empty;
    focusLinkedEvent();
  };

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLocaleLowerCase(language());
    if (requestedEvent) {
      requestedEvent = null;
      linkedEventFocused = true;
      updateRouteState(null);
    }
    render();
  });

  window.addEventListener(profileApi.eventName, render);
  window.addEventListener("library-language-change", () => {
    query = searchInput.value.trim().toLocaleLowerCase(language());
    render();
  });

  const load = async () => {
    stateNode.textContent = table().loading;
    try {
      const [worldResponse, timelineResponse] = await Promise.all([
        fetch(new URL(worldManifestReference, window.location.href), { cache: "no-store" }),
        fetch(new URL(timelineManifestReference, window.location.href), { cache: "no-store" })
      ]);
      if (!worldResponse.ok || !timelineResponse.ok) throw new Error("Timeline manifest request failed");
      [world, timeline] = await Promise.all([worldResponse.json(), timelineResponse.json()]);
      stateNode.textContent = "";
      render();
    } catch (error) {
      console.error(error);
      resultsNode.replaceChildren();
      stateNode.textContent = table().error;
    }
  };

  translateStatic();
  load();
})();
