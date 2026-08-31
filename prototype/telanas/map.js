(() => {
  "use strict";

  const profileApi = window.LibrarySpoilerProfile;
  const searchInput = document.querySelector("[data-map-search]");
  const stateNode = document.querySelector("[data-map-state]");
  const markerLayer = document.querySelector("[data-map-markers]");
  const selectedNode = document.querySelector("[data-map-selected]");
  const listNode = document.querySelector("[data-map-list]");
  const canvas = document.querySelector("[data-map-canvas]");

  if (!profileApi || !searchInput || !stateNode || !markerLayer || !selectedNode || !listNode || !canvas) return;

  const ui = {
    en: {
      title: "Map",
      intro: "Explore only the locations available at your selected reading progress.",
      progressEyebrow: "Reading progress",
      progressTitle: "Choose what you have finished",
      progressHelp: "Locations beyond this point do not exist in the rendered map.",
      through: "Spoilers through",
      fullSpoilers: "Full spoilers",
      fullSpoilersHelp: "Show every public map marker regardless of progress.",
      browseEyebrow: "Available locations",
      browseTitle: "Explore the map",
      browseHelp: "Search and map markers use the same spoiler-filtered data set.",
      currentView: "Current view",
      searchLabel: "Search visible locations",
      searchPlaceholder: "Search visible locations",
      empty: "No visible locations match this view.",
      loading: "Loading map…",
      error: "The map could not be loaded.",
      choose: "Choose a visible marker to see its details."
    },
    de: {
      title: "Karte",
      intro: "Erkunde nur Orte, die zu deinem gewählten Lesefortschritt gehören.",
      progressEyebrow: "Lesefortschritt",
      progressTitle: "Wähle, was du abgeschlossen hast",
      progressHelp: "Spätere Orte existieren in der gerenderten Karte überhaupt nicht.",
      through: "Spoiler bis",
      fullSpoilers: "Vollständige Spoiler",
      fullSpoilersHelp: "Zeige alle öffentlichen Kartenmarker unabhängig vom Fortschritt.",
      browseEyebrow: "Verfügbare Orte",
      browseTitle: "Karte erkunden",
      browseHelp: "Suche und Kartenmarker verwenden denselben spoilergefilterten Datensatz.",
      currentView: "Aktuelle Ansicht",
      searchLabel: "Sichtbare Orte durchsuchen",
      searchPlaceholder: "Sichtbare Orte durchsuchen",
      empty: "Keine sichtbaren Orte passen zu dieser Ansicht.",
      loading: "Karte wird geladen…",
      error: "Die Karte konnte nicht geladen werden.",
      choose: "Wähle einen sichtbaren Marker, um seine Details anzuzeigen."
    }
  };

  let world = null;
  let map = null;
  let query = "";
  let selectedId = null;

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const translateStatic = () => {
    const table = ui[language()];
    document.querySelectorAll("[data-map-i18n]").forEach((node) => {
      const key = node.dataset.mapI18n;
      if (table[key]) node.textContent = table[key];
    });
    searchInput.placeholder = table.searchPlaceholder;
  };

  const completedVolume = (profile, story) => profile.worlds?.telanas?.completed?.[story] || "none";

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

  const localizedMarker = (marker, profile) => {
    if (!visibilityAllowed(marker.visibility, profile)) return null;
    const lang = language();
    const labels = marker.labels?.[lang];
    if (!labels) return null;
    return {
      id: marker.id,
      order: marker.order,
      x: marker.x,
      y: marker.y,
      kind: labels.kind,
      title: labels.title,
      summary: labels.summary,
      readerLinks: (marker.readerLinks || [])
        .map((link) => localizedReaderLink(link, lang))
        .filter(Boolean)
    };
  };

  const visibleMarkers = () => {
    const profile = profileApi.get();
    return (map?.markers || [])
      .map((marker) => localizedMarker(marker, profile))
      .filter(Boolean)
      .sort((left, right) => left.order - right.order);
  };

  const filteredMarkers = () => {
    const markers = visibleMarkers();
    if (!query) return markers;
    return markers.filter((marker) => [marker.kind, marker.title, marker.summary]
      .join(" ")
      .toLocaleLowerCase(language())
      .includes(query));
  };

  const readerHref = (link) => {
    const parameters = new URLSearchParams({
      world: map.world,
      story: link.story,
      book: link.book,
      source: "map"
    });
    return `reader.html?${parameters.toString()}#${encodeURIComponent(link.anchor)}`;
  };

  const renderReaderLinks = (links) => {
    const wrapper = document.createElement("div");
    wrapper.className = "map-reader-links";
    for (const link of links) {
      const anchor = document.createElement("a");
      anchor.className = "map-reader-link";
      anchor.href = readerHref(link);
      anchor.dataset.mapReaderReference = link.id;
      anchor.textContent = link.label;
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      anchor.append(arrow);
      wrapper.append(anchor);
    }
    return wrapper;
  };

  const renderSelected = (marker) => {
    selectedNode.replaceChildren();
    if (!marker) {
      const paragraph = document.createElement("p");
      paragraph.textContent = ui[language()].choose;
      selectedNode.append(paragraph);
      return;
    }

    const kind = document.createElement("p");
    kind.className = "map-selected-kind";
    kind.textContent = marker.kind;
    const title = document.createElement("h3");
    title.textContent = marker.title;
    const summary = document.createElement("p");
    summary.textContent = marker.summary;
    selectedNode.append(kind, title, summary);
    if (marker.readerLinks.length) selectedNode.append(renderReaderLinks(marker.readerLinks));
  };

  const selectMarker = (id, markers) => {
    selectedId = id;
    const selected = markers.find((marker) => marker.id === selectedId) || null;
    markerLayer.querySelectorAll(".map-marker").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.mapMarker === selectedId);
      button.setAttribute("aria-pressed", String(button.dataset.mapMarker === selectedId));
    });
    listNode.querySelectorAll(".map-list-button").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.mapListMarker === selectedId);
    });
    renderSelected(selected);
  };

  const renderCanvas = (markers) => {
    markerLayer.replaceChildren();
    for (const marker of markers) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-marker";
      button.dataset.mapMarker = marker.id;
      button.style.left = `${marker.x}%`;
      button.style.top = `${marker.y}%`;
      button.setAttribute("aria-label", marker.title);
      button.setAttribute("aria-pressed", "false");
      button.title = marker.title;
      const glyph = document.createElement("span");
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = "◇";
      button.append(glyph);
      button.addEventListener("click", () => selectMarker(marker.id, markers));
      markerLayer.append(button);
    }
  };

  const renderList = (markers) => {
    listNode.replaceChildren();
    for (const marker of markers) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-list-button";
      button.dataset.mapListMarker = marker.id;
      const title = document.createElement("strong");
      title.textContent = marker.title;
      const kind = document.createElement("span");
      kind.textContent = marker.kind;
      button.append(title, kind);
      button.addEventListener("click", () => selectMarker(marker.id, markers));
      listNode.append(button);
    }
  };

  const render = () => {
    translateStatic();
    if (!world || !map) return;
    const markers = filteredMarkers();
    stateNode.textContent = markers.length ? "" : ui[language()].empty;
    renderCanvas(markers);
    renderList(markers);

    if (!markers.some((marker) => marker.id === selectedId)) selectedId = markers[0]?.id || null;
    selectMarker(selectedId, markers);
  };

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLocaleLowerCase(language());
    selectedId = null;
    render();
  });

  window.addEventListener(profileApi.eventName, () => {
    selectedId = null;
    render();
  });

  window.addEventListener("library-language-change", () => {
    query = searchInput.value.trim().toLocaleLowerCase(language());
    render();
  });

  const load = async () => {
    stateNode.textContent = ui[language()].loading;
    try {
      const worldResponse = await fetch("../../content/worlds/telanas/world.json", { cache: "no-store" });
      if (!worldResponse.ok) throw new Error("World manifest request failed");
      world = await worldResponse.json();
      if (typeof world.map !== "string" || !world.map) throw new Error("World map manifest is missing");

      const mapUrl = new URL(`../../content/worlds/telanas/${world.map}`, window.location.href);
      const mapResponse = await fetch(mapUrl, { cache: "no-store" });
      if (!mapResponse.ok) throw new Error("Map manifest request failed");
      map = await mapResponse.json();
      canvas.setAttribute("aria-label", map.labels?.[language()]?.title || "Map");
      stateNode.textContent = "";
      render();
    } catch (error) {
      console.error(error);
      markerLayer.replaceChildren();
      listNode.replaceChildren();
      selectedNode.replaceChildren();
      stateNode.textContent = ui[language()].error;
    }
  };

  translateStatic();
  load();
})();
