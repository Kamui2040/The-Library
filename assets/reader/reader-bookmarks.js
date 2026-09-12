(() => {
  "use strict";

  const body = document.body;
  const toggle = document.querySelector("[data-reader-bookmark-toggle]");
  const icon = document.querySelector("[data-reader-bookmark-icon]");
  const heading = document.querySelector("[data-reader-bookmarks-heading]");
  const count = document.querySelector("[data-reader-bookmark-count]");
  const empty = document.querySelector("[data-reader-bookmarks-empty]");
  const list = document.querySelector("[data-reader-bookmarks-list]");
  const tocList = document.querySelector("[data-reader-toc-list]");
  const positionLabel = document.querySelector("[data-reader-position]");
  const manifestReference = body?.dataset.readerBookManifest;

  if (!body || !toggle || !icon || !heading || !count || !empty || !list || !tocList || !positionLabel || !manifestReference) return;

  const storageKey = "library-reader-bookmarks-v3";
  const legacyStorageKey = "library-reader-bookmarks-v2";
  const oldestStorageKey = "library-reader-bookmarks-v1";
  const copy = {
    en: {
      heading: "Bookmarks",
      countLabel: "Saved bookmarks",
      empty: "No saved places yet.",
      add: "Bookmark current place",
      removeCurrent: "Remove bookmark from current place",
      remove: "Remove saved place",
      savedPlace: "Saved place",
      illustration: "Illustration",
      chapterOpening: "Chapter opening",
      sectionOpening: "Section opening"
    },
    de: {
      heading: "Lesezeichen",
      countLabel: "Gespeicherte Lesezeichen",
      empty: "Noch keine gespeicherten Stellen.",
      add: "Aktuelle Stelle als Lesezeichen speichern",
      removeCurrent: "Lesezeichen an aktueller Stelle entfernen",
      remove: "Gespeicherte Stelle entfernen",
      savedPlace: "Gespeicherte Stelle",
      illustration: "Illustration",
      chapterOpening: "Kapitelanfang",
      sectionOpening: "Abschnittsanfang"
    }
  };

  let bookKey = null;
  let ready = false;

  const language = () => document.documentElement.lang === "de" ? "de" : "en";
  const table = () => copy[language()];

  const defaultState = () => ({ version: 3, books: {} });

  const normalizeEntries = (entries) => {
    if (!Array.isArray(entries)) return [];
    const seen = new Set();
    const normalized = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const sectionId = typeof entry.sectionId === "string" ? entry.sectionId : entry.chapterId;
      if (typeof entry.anchor !== "string" || !entry.anchor || typeof sectionId !== "string" || !sectionId) continue;
      if (seen.has(entry.anchor)) continue;
      seen.add(entry.anchor);
      normalized.push({ anchor: entry.anchor, sectionId });
    }
    return normalized;
  };

  const normalizeState = (value) => {
    const state = defaultState();
    if (![2, 3].includes(value?.version) || !value.books || typeof value.books !== "object" || Array.isArray(value.books)) return state;

    for (const [key, localized] of Object.entries(value.books)) {
      if (!localized || typeof localized !== "object" || Array.isArray(localized)) continue;
      const normalizedLocales = {};
      for (const locale of ["en", "de"]) {
        const entries = normalizeEntries(localized[locale]);
        if (entries.length) normalizedLocales[locale] = entries;
      }
      if (Object.keys(normalizedLocales).length) state.books[key] = normalizedLocales;
    }
    return state;
  };

  const writeState = (state) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(normalizeState(state)));
    } catch {
      // Local persistence is optional.
    }
  };

  const readState = () => {
    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (current?.version === 3) return normalizeState(current);

      const legacy = JSON.parse(localStorage.getItem(legacyStorageKey) || "null");
      if (legacy?.version === 2) {
        const state = normalizeState(legacy);
        writeState(state);
        return state;
      }

      const oldest = JSON.parse(localStorage.getItem(oldestStorageKey) || "null");
      const state = defaultState();
      if (oldest?.version === 1 && oldest.books && typeof oldest.books === "object") {
        for (const [key, entries] of Object.entries(oldest.books)) {
          const normalized = normalizeEntries(entries);
          if (normalized.length) state.books[key] = { [language()]: normalized };
        }
        writeState(state);
      }
      return state;
    } catch {
      return defaultState();
    }
  };

  const currentBookmarks = () => {
    if (!bookKey) return [];
    return readState().books[bookKey]?.[language()] || [];
  };

  const currentAnchor = () => {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return "contents";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };

  const currentSectionId = () => {
    const anchor = currentAnchor();
    const anchorNode = [...document.querySelectorAll("[data-reader-anchor]")]
      .find((node) => node.dataset.readerAnchor === anchor);
    if (anchorNode?.dataset.readerSectionId) return anchorNode.dataset.readerSectionId;

    const activeToc = [...tocList.querySelectorAll("[data-reader-target]")]
      .find((node) => node.classList.contains("is-active"));
    const target = activeToc?.dataset.readerTarget;
    return target && target !== "contents" ? target : null;
  };

  const sectionLabel = (sectionId) => {
    const target = [...tocList.querySelectorAll("[data-reader-target]")]
      .find((node) => node.dataset.readerTarget === sectionId);
    return target?.textContent?.trim() || sectionId;
  };

  const isStorySection = (sectionId) => [...document.querySelectorAll("[data-reader-section-id]")]
    .some((node) => node.dataset.readerSectionId === sectionId && node.dataset.readerSectionKind === "story");

  const bookmarkKind = (bookmark) => {
    const localCopy = table();
    if (bookmark.anchor === bookmark.sectionId) {
      return isStorySection(bookmark.sectionId) ? localCopy.chapterOpening : localCopy.sectionOpening;
    }
    if (/-i\d+$/i.test(bookmark.anchor)) return localCopy.illustration;
    return localCopy.savedPlace;
  };

  const persistBookmarks = (bookmarks) => {
    if (!bookKey) return;
    const state = readState();
    const localized = state.books[bookKey] && typeof state.books[bookKey] === "object" && !Array.isArray(state.books[bookKey])
      ? state.books[bookKey]
      : {};
    if (bookmarks.length) localized[language()] = bookmarks;
    else delete localized[language()];
    if (Object.keys(localized).length) state.books[bookKey] = localized;
    else delete state.books[bookKey];
    writeState(state);
  };

  const jumpTo = (anchor) => {
    if (!anchor || anchor === currentAnchor()) return;
    history.pushState(null, "", `#${anchor}`);
    location.reload();
  };

  const removeBookmark = (anchor) => {
    persistBookmarks(currentBookmarks().filter((bookmark) => bookmark.anchor !== anchor));
    render();
  };

  const toggleCurrentBookmark = () => {
    if (!ready) return;
    const anchor = currentAnchor();
    const sectionId = currentSectionId();
    if (!sectionId || anchor === "contents") return;

    const bookmarks = currentBookmarks();
    const existing = bookmarks.findIndex((bookmark) => bookmark.anchor === anchor);
    if (existing >= 0) bookmarks.splice(existing, 1);
    else bookmarks.push({ anchor, sectionId });

    persistBookmarks(bookmarks);
    render();
  };

  const renderList = (bookmarks) => {
    list.replaceChildren();
    const localCopy = table();

    bookmarks.forEach((bookmark) => {
      const row = document.createElement("div");
      row.className = "reader-bookmark-row";

      const jump = document.createElement("button");
      jump.type = "button";
      jump.className = "reader-bookmark-jump";
      jump.dataset.bookmarkAnchor = bookmark.anchor;

      const chapter = document.createElement("strong");
      chapter.textContent = sectionLabel(bookmark.sectionId);
      const kind = document.createElement("span");
      kind.textContent = bookmarkKind(bookmark);
      jump.append(chapter, kind);
      jump.addEventListener("click", () => jumpTo(bookmark.anchor));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "reader-bookmark-remove";
      remove.setAttribute("aria-label", `${localCopy.remove}: ${chapter.textContent}`);
      remove.title = localCopy.remove;
      remove.textContent = "×";
      remove.addEventListener("click", () => removeBookmark(bookmark.anchor));

      row.append(jump, remove);
      list.append(row);
    });
  };

  function render() {
    const localCopy = table();
    const bookmarks = currentBookmarks();
    const anchor = currentAnchor();
    const sectionId = currentSectionId();
    const bookmarked = bookmarks.some((bookmark) => bookmark.anchor === anchor);
    const bookmarkable = ready && Boolean(sectionId) && anchor !== "contents";

    heading.textContent = localCopy.heading;
    empty.textContent = localCopy.empty;
    count.textContent = String(bookmarks.length);
    count.setAttribute("aria-label", `${localCopy.countLabel}: ${bookmarks.length}`);
    empty.hidden = bookmarks.length > 0;
    list.hidden = bookmarks.length === 0;
    renderList(bookmarks);

    toggle.disabled = !bookmarkable;
    toggle.classList.toggle("is-bookmarked", bookmarked);
    toggle.setAttribute("aria-pressed", String(bookmarked));
    toggle.setAttribute("aria-label", bookmarked ? localCopy.removeCurrent : localCopy.add);
    toggle.title = bookmarked ? localCopy.removeCurrent : localCopy.add;
    icon.textContent = bookmarked ? "★" : "☆";
  }

  toggle.addEventListener("click", toggleCurrentBookmark);
  window.addEventListener("library-language-change", render);

  new MutationObserver(render).observe(positionLabel, {
    childList: true,
    characterData: true,
    subtree: true
  });

  new MutationObserver(render).observe(tocList, {
    childList: true,
    subtree: true
  });

  const initialize = async () => {
    toggle.disabled = true;
    try {
      const manifestUrl = new URL(manifestReference, window.location.href);
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Book manifest HTTP ${response.status}`);
      const book = await response.json();
      if (!book?.world || !book?.story || !book?.id) throw new Error("Book manifest identity is incomplete");
      bookKey = `${book.world}/${book.story}/${book.id}`;
      ready = true;
      render();
    } catch (error) {
      console.error("Reader bookmarks could not initialize", error);
      ready = false;
      render();
    }
  };

  render();
  initialize();
})();
