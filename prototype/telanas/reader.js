(() => {
  "use strict";

  const engine = window.LibraryReaderEngine;
  const dock = document.querySelector("[data-toc-dock]");
  const toggle = document.querySelector("[data-toc-toggle]");
  const panel = document.querySelector("[data-toc-panel]");
  const tocList = document.querySelector("[data-reader-toc-list]");
  const tocHeading = document.querySelector("[data-toc-heading]");
  const spread = document.querySelector("[data-book-spread]");
  const leftPage = document.querySelector("[data-book-page='left']");
  const rightPage = document.querySelector("[data-book-page='right']");
  const probe = document.querySelector("[data-pagination-probe]");
  const positionLabel = document.querySelector("[data-reader-position]");
  const modeLabel = document.querySelector("[data-reader-mode]");
  const titleLabel = document.querySelector("[data-reader-title]");
  const previousButton = document.querySelector("[data-page-previous]");
  const nextButton = document.querySelector("[data-page-next]");

  if (
    !engine || !dock || !toggle || !panel || !tocList || !tocHeading || !spread ||
    !leftPage || !rightPage || !probe || !positionLabel || !modeLabel || !titleLabel ||
    !previousButton || !nextButton
  ) return;

  const manifestUrl = "../../content/worlds/telanas/books/dragon-knight/volume-01/book.json";
  const positionStorageKey = "library-reader-position-v1";
  const layoutStorageKey = "library-reader-layout";
  const pointerHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wideSpread = window.matchMedia("(min-width: 981px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let pinned = false;
  let closeTimer = null;
  let resizeTimer = null;
  let scrollObserver = null;
  let editionLoadToken = 0;
  let book = null;
  let model = null;
  let pages = [];
  let currentPageIndex = 0;
  let currentAnchor = "contents";
  let layoutPreference = "spread";
  const editionCache = new Map();

  const copy = {
    en: {
      spread: "Book spread",
      single: "Single page",
      continuous: "Continuous",
      previous: "Previous page",
      next: "Next page",
      contentsIntro: "Contents and reader navigation come from the same public book structure.",
      loadError: "The prototype reader content could not be loaded.",
      loadHint: "Serve the repository through a local web server or normal website host so the reader can load its public manifests and edition files.",
      page: (current, total) => `Page ${current} of ${total}`,
      pages: (start, end, total) => `Pages ${start}–${end} of ${total}`
    },
    de: {
      spread: "Buchansicht",
      single: "Einzelseite",
      continuous: "Fortlaufend",
      previous: "Vorherige Seite",
      next: "Nächste Seite",
      contentsIntro: "Inhaltsseite und Reader-Navigation stammen aus derselben öffentlichen Buchstruktur.",
      loadError: "Der Prototyp-Reader-Inhalt konnte nicht geladen werden.",
      loadHint: "Stelle das Repository über einen lokalen Webserver oder einen normalen Website-Host bereit, damit der Reader seine öffentlichen Manifeste und Ausgabedateien laden kann.",
      page: (current, total) => `Seite ${current} von ${total}`,
      pages: (start, end, total) => `Seiten ${start}–${end} von ${total}`
    }
  };

  const language = () => document.documentElement.lang === "de" ? "de" : "en";
  const table = () => copy[language()];
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  const bookLabels = () => {
    if (!book) return null;
    return book.labels?.[language()] || book.labels?.en || null;
  };

  const currentTitle = () => {
    const labels = bookLabels();
    return labels ? `${labels.series} · ${labels.volume}` : "The Library";
  };

  const chapterById = (chapterId) => model?.chapters.find((chapter) => chapter.id === chapterId) || null;

  const chapterLabelForAnchor = (anchor) => {
    if (!model || anchor === "contents") return bookLabels()?.contents || "Contents";
    const chapterId = engine.chapterForAnchor(model, anchor);
    return chapterById(chapterId)?.label || bookLabels()?.contents || "Contents";
  };

  const positionKey = () => book ? `${book.world}/${book.story}/${book.id}` : null;

  const readSavedPosition = () => {
    const key = positionKey();
    if (!key) return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(positionStorageKey) || "null");
      return parsed?.version === 1 && typeof parsed.books?.[key] === "string" ? parsed.books[key] : null;
    } catch {
      return null;
    }
  };

  const savePosition = (anchor) => {
    const key = positionKey();
    if (!key) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(positionStorageKey) || "null");
      const state = parsed?.version === 1 && parsed.books && typeof parsed.books === "object"
        ? parsed
        : { version: 1, books: {} };
      state.books[key] = anchor;
      localStorage.setItem(positionStorageKey, JSON.stringify(state));
    } catch {
      // Local persistence is optional.
    }
  };

  const savedLayout = () => {
    try {
      const value = localStorage.getItem(layoutStorageKey);
      return ["spread", "single", "continuous"].includes(value) ? value : "spread";
    } catch {
      return "spread";
    }
  };

  const saveLayout = (layout) => {
    try {
      localStorage.setItem(layoutStorageKey, layout);
    } catch {
      // Local persistence is optional.
    }
  };

  const setHash = (anchor) => {
    history.replaceState(null, "", `#${anchor}`);
  };

  const updateCurrentAnchor = (anchor, { updateHash = true, persist = true } = {}) => {
    if (!model) return;
    const resolved = engine.resolveAnchor(model, anchor);
    currentAnchor = resolved;
    if (persist) savePosition(resolved);
    if (updateHash) setHash(resolved);
    renderToc();
  };

  const setOpen = (open) => {
    dock.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open || pinned));
  };

  const setPinned = (nextPinned) => {
    pinned = Boolean(nextPinned);
    dock.classList.toggle("is-pinned", pinned);
    if (pinned) setOpen(true);
    else if (!dock.matches(":hover")) setOpen(false);
  };

  const clearCloseTimer = () => {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    if (pinned) return;
    closeTimer = window.setTimeout(() => setOpen(false), 180);
  };

  const renderToc = () => {
    if (!book || !model) return;
    const labels = bookLabels();
    const activeChapter = engine.chapterForAnchor(model, currentAnchor);
    tocHeading.textContent = labels?.contents || "Contents";
    tocList.replaceChildren();

    const entries = [
      { id: "contents", label: labels?.contents || "Contents" },
      ...model.chapters.map((chapter) => ({ id: chapter.id, label: chapter.label }))
    ];

    for (const entry of entries) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.readerTarget = entry.id;
      button.textContent = entry.label;
      const active = entry.id === "contents" ? currentAnchor === "contents" : entry.id === activeChapter;
      button.classList.toggle("is-active", active);
      tocList.append(button);
    }
  };

  const createAnchorElement = (tagName, anchor, chapterId, className = "") => {
    const element = document.createElement(tagName);
    element.dataset.readerAnchor = anchor;
    if (chapterId) element.dataset.chapterId = chapterId;
    if (className) element.className = className;
    return element;
  };

  const renderBlock = (block) => {
    if (block.type === "scene-break") {
      const separator = createAnchorElement("div", block.id, block.chapterId, "reader-scene-break");
      separator.setAttribute("role", "separator");
      const mark = document.createElement("span");
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "◇";
      separator.append(mark);
      return separator;
    }

    const paragraph = createAnchorElement("p", block.id, block.chapterId, "reader-prose");
    paragraph.textContent = block.text;
    return paragraph;
  };

  const makeContents = ({ compact = false } = {}) => {
    const labels = bookLabels();
    const wrapper = createAnchorElement(
      "section",
      "contents",
      null,
      compact ? "reader-contents reader-contents--compact" : "reader-contents",
    );
    const heading = document.createElement("h1");
    heading.textContent = labels?.contents || "Contents";
    const subheading = document.createElement("h2");
    subheading.textContent = `${labels?.world || "Telanas"} · ${labels?.series || ""}`;
    const intro = document.createElement("p");
    intro.textContent = table().contentsIntro;
    const list = document.createElement("div");
    list.className = "contents-list";

    for (const chapter of model.chapters) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.inlineTarget = chapter.id;
      const label = document.createElement("span");
      label.textContent = chapter.label;
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      button.append(label, arrow);
      list.append(button);
    }

    wrapper.append(heading, subheading, intro, list);
    return wrapper;
  };

  const makeChapterTitle = (chapter) => {
    const labels = bookLabels();
    const wrapper = createAnchorElement("section", chapter.id, chapter.id, "reader-chapter-title");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = labels?.world || "Telanas";
    const heading = document.createElement("h1");
    heading.textContent = chapter.label;
    const subheading = document.createElement("h2");
    subheading.textContent = currentTitle();
    wrapper.append(eyebrow, heading, subheading);
    return wrapper;
  };

  const pageForAnchor = (anchor) => {
    if (!pages.length) return 0;
    const resolved = engine.resolveAnchor(model, anchor);
    const direct = pages.findIndex((page) => page.anchor === resolved);
    if (direct >= 0) return direct;
    const bodyPage = pages.findIndex((page) => page.blocks?.some((block) => block.id === resolved));
    return bodyPage >= 0 ? bodyPage : 0;
  };

  const prepareProbe = () => {
    probe.replaceChildren();
    const pageStyle = getComputedStyle(leftPage);
    const rect = leftPage.getBoundingClientRect();
    const width = Math.max(260, rect.width || Number.parseFloat(pageStyle.width) || 480);
    const minimumHeight = Number.parseFloat(pageStyle.minHeight) || 650;
    probe.style.width = `${width}px`;
    probe.style.height = `${minimumHeight}px`;
    probe.style.minHeight = `${minimumHeight}px`;
    probe.style.maxHeight = `${minimumHeight}px`;
  };

  const blocksFitPage = (blocks) => {
    probe.replaceChildren(...blocks.map(renderBlock));
    return probe.scrollHeight <= probe.clientHeight + 1;
  };

  const buildPages = () => {
    prepareProbe();
    const built = [{ kind: "contents", anchor: "contents", chapterId: null, blocks: [] }];

    for (const chapter of model.chapters) {
      built.push({ kind: "chapter-title", anchor: chapter.id, chapterId: chapter.id, blocks: [] });
      const bodyPages = engine.paginateBlocks(chapter.blocks, blocksFitPage);
      for (const blocks of bodyPages) {
        built.push({
          kind: "body",
          anchor: blocks[0]?.id || chapter.id,
          chapterId: chapter.id,
          blocks,
        });
      }
    }

    probe.replaceChildren();
    pages = built;
  };

  const renderPage = (page, node) => {
    node.replaceChildren();
    node.classList.remove(
      "contents-page",
      "chapter-title-page",
      "body-page",
      "continuous-page",
      "is-empty",
    );

    if (!page) {
      node.classList.add("is-empty");
      return;
    }

    if (page.kind === "contents") {
      node.classList.add("contents-page");
      node.append(makeContents());
      return;
    }

    if (page.kind === "chapter-title") {
      node.classList.add("chapter-title-page");
      node.append(makeChapterTitle(chapterById(page.chapterId)));
      return;
    }

    node.classList.add("body-page");
    node.append(...page.blocks.map(renderBlock));
  };

  const effectiveSpread = () => layoutPreference === "spread" && wideSpread.matches;
  const pageStep = () => effectiveSpread() ? 2 : 1;

  const updatePagedStatus = () => {
    const total = pages.length;
    const start = currentPageIndex + 1;
    const end = Math.min(total, currentPageIndex + pageStep());
    const chapter = chapterLabelForAnchor(currentAnchor);
    const pageText = end > start ? table().pages(start, end, total) : table().page(start, total);
    positionLabel.textContent = `${chapter} · ${pageText}`;
    previousButton.disabled = currentPageIndex <= 0;
    nextButton.disabled = currentPageIndex + pageStep() >= total;
  };

  const renderPagedAt = (index, { updateHash = true, persist = true } = {}) => {
    if (!pages.length) return;
    currentPageIndex = Math.max(0, Math.min(index, pages.length - 1));
    renderPage(pages[currentPageIndex], leftPage);
    renderPage(effectiveSpread() ? pages[currentPageIndex + 1] : null, rightPage);
    updateCurrentAnchor(pages[currentPageIndex].anchor, { updateHash, persist });
    updatePagedStatus();
  };

  const disconnectScrollTracking = () => {
    if (scrollObserver) scrollObserver.disconnect();
    scrollObserver = null;
  };

  const continuousAnchorElements = () => [...leftPage.querySelectorAll("[data-reader-anchor]")];

  const findContinuousAnchor = (anchor) => (
    continuousAnchorElements().find((node) => node.dataset.readerAnchor === anchor) || null
  );

  const updateContinuousStatus = () => {
    positionLabel.textContent = chapterLabelForAnchor(currentAnchor);
    previousButton.disabled = true;
    nextButton.disabled = true;
  };

  const startScrollTracking = () => {
    disconnectScrollTracking();
    if (!("IntersectionObserver" in window)) return;

    scrollObserver = new IntersectionObserver((entries) => {
      const candidates = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top));
      const anchor = candidates[0]?.target?.dataset?.readerAnchor;
      if (!anchor || anchor === currentAnchor) return;
      updateCurrentAnchor(anchor);
      updateContinuousStatus();
    }, {
      root: null,
      rootMargin: "-16% 0px -70% 0px",
      threshold: 0,
    });

    continuousAnchorElements().forEach((node) => scrollObserver.observe(node));
  };

  const renderContinuous = (restoreAnchor = currentAnchor) => {
    disconnectScrollTracking();
    leftPage.replaceChildren();
    rightPage.replaceChildren();
    leftPage.classList.remove("contents-page", "chapter-title-page", "body-page", "is-empty");
    rightPage.classList.remove("contents-page", "chapter-title-page", "body-page", "continuous-page");
    leftPage.classList.add("continuous-page");
    rightPage.classList.add("is-empty");

    leftPage.append(makeContents({ compact: true }));
    for (const chapter of model.chapters) {
      const section = document.createElement("section");
      section.className = "reader-continuous-chapter";
      section.append(makeChapterTitle(chapter), ...chapter.blocks.map(renderBlock));
      leftPage.append(section);
    }

    updateCurrentAnchor(restoreAnchor, { updateHash: true, persist: true });
    updateContinuousStatus();
    startScrollTracking();

    requestAnimationFrame(() => {
      const target = findContinuousAnchor(currentAnchor);
      if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
    });
  };

  const navigate = (requested, { updateHash = true, persist = true } = {}) => {
    if (!model) return;
    const resolved = engine.resolveAnchor(model, requested);

    if (layoutPreference === "continuous") {
      updateCurrentAnchor(resolved, { updateHash, persist });
      updateContinuousStatus();
      const target = findContinuousAnchor(resolved);
      if (target) {
        target.scrollIntoView({
          block: "start",
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      }
    } else {
      renderPagedAt(pageForAnchor(resolved), { updateHash, persist });
    }

    if (!pointerHover.matches && !pinned) setOpen(false);
  };

  const applyLayoutClasses = (layout) => {
    layoutPreference = ["spread", "single", "continuous"].includes(layout) ? layout : "spread";
    spread.classList.toggle("single", layoutPreference === "single");
    spread.classList.toggle("continuous", layoutPreference === "continuous");

    const localCopy = table();
    document.querySelectorAll("[data-layout-button]").forEach((button) => {
      const buttonLayout = button.dataset.layoutButton;
      button.setAttribute("aria-pressed", String(buttonLayout === layoutPreference));
      if (localCopy[buttonLayout]) button.textContent = localCopy[buttonLayout];
    });

    previousButton.setAttribute("aria-label", localCopy.previous);
    nextButton.setAttribute("aria-label", localCopy.next);
    modeLabel.textContent = localCopy[layoutPreference];
    saveLayout(layoutPreference);
  };

  const repaginate = async (restoreAnchor = currentAnchor) => {
    if (!model || layoutPreference === "continuous") return;
    disconnectScrollTracking();
    leftPage.classList.remove("continuous-page");
    rightPage.classList.remove("continuous-page");
    await nextFrame();
    buildPages();
    renderPagedAt(pageForAnchor(restoreAnchor));
  };

  const setLayout = async (layout) => {
    const restoreAnchor = currentAnchor;
    applyLayoutClasses(layout);
    titleLabel.textContent = currentTitle();

    if (!model) return;
    if (layoutPreference === "continuous") {
      renderContinuous(restoreAnchor);
    } else {
      await repaginate(restoreAnchor);
    }
  };

  const editionUrl = (locale) => {
    const relative = book?.editions?.[locale];
    if (!relative) throw new Error(`No public reader edition registered for ${locale}`);
    const manifestAbsolute = new URL(manifestUrl, window.location.href);
    return new URL(relative, manifestAbsolute).href;
  };

  const loadEdition = async (locale) => {
    if (editionCache.has(locale)) return editionCache.get(locale);
    const response = await fetch(editionUrl(locale), { cache: "no-store" });
    if (!response.ok) throw new Error(`Edition HTTP ${response.status}`);
    const loaded = await response.json();
    editionCache.set(locale, loaded);
    return loaded;
  };

  const loadSelectedEdition = async (restoreAnchor) => {
    const token = ++editionLoadToken;
    const locale = language();
    const loadedEdition = await loadEdition(locale);
    if (token !== editionLoadToken) return false;

    model = engine.buildModel(book, loadedEdition, locale);
    titleLabel.textContent = currentTitle();
    currentAnchor = engine.resolveAnchor(model, restoreAnchor);
    renderToc();

    if (layoutPreference === "continuous") {
      renderContinuous(currentAnchor);
    } else {
      await repaginate(currentAnchor);
    }
    return true;
  };

  const showLoadError = (error) => {
    console.error("Reader content load failed", error);
    disconnectScrollTracking();
    const localCopy = table();
    titleLabel.textContent = "The Library";
    tocList.replaceChildren();
    leftPage.replaceChildren();
    rightPage.replaceChildren();
    leftPage.classList.remove("continuous-page");
    rightPage.classList.remove("continuous-page");
    const heading = document.createElement("h1");
    heading.textContent = localCopy.loadError;
    const hint = document.createElement("p");
    hint.textContent = localCopy.loadHint;
    leftPage.append(heading, hint);
    positionLabel.textContent = localCopy.loadError;
    previousButton.disabled = true;
    nextButton.disabled = true;
  };

  dock.addEventListener("pointerenter", () => {
    if (!pointerHover.matches) return;
    clearCloseTimer();
    setOpen(true);
  });

  dock.addEventListener("pointerleave", () => {
    if (!pointerHover.matches) return;
    scheduleClose();
  });

  toggle.addEventListener("click", () => {
    clearCloseTimer();
    if (pointerHover.matches) {
      setPinned(!pinned);
    } else {
      const open = dock.classList.contains("is-open") || dock.classList.contains("is-pinned");
      pinned = false;
      dock.classList.remove("is-pinned");
      setOpen(!open);
    }
  });

  tocList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reader-target]");
    if (button) navigate(button.dataset.readerTarget);
  });

  leftPage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inline-target]");
    if (button) navigate(button.dataset.inlineTarget);
  });

  previousButton.addEventListener("click", () => {
    if (layoutPreference === "continuous") return;
    renderPagedAt(currentPageIndex - pageStep());
  });

  nextButton.addEventListener("click", () => {
    if (layoutPreference === "continuous") return;
    renderPagedAt(currentPageIndex + pageStep());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      pinned = false;
      dock.classList.remove("is-pinned");
      setOpen(false);
      toggle.focus();
      return;
    }

    if (layoutPreference === "continuous" || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;

    if (event.key === "ArrowLeft" && !previousButton.disabled) {
      event.preventDefault();
      renderPagedAt(currentPageIndex - pageStep());
    }
    if (event.key === "ArrowRight" && !nextButton.disabled) {
      event.preventDefault();
      renderPagedAt(currentPageIndex + pageStep());
    }
  });

  document.querySelectorAll("[data-layout-button]").forEach((button) => {
    button.addEventListener("click", () => setLayout(button.dataset.layoutButton));
  });

  window.addEventListener("library-language-change", async () => {
    if (!book) return;
    const restoreAnchor = currentAnchor;
    applyLayoutClasses(layoutPreference);
    try {
      await loadSelectedEdition(restoreAnchor);
    } catch (error) {
      showLoadError(error);
    }
  });

  window.addEventListener("resize", () => {
    if (!model || layoutPreference === "continuous") return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => repaginate(currentAnchor), 140);
  });

  wideSpread.addEventListener("change", () => {
    if (model && layoutPreference === "spread") repaginate(currentAnchor);
  });

  const initialize = async () => {
    applyLayoutClasses(savedLayout());

    try {
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
      book = await response.json();

      const requested = location.hash.replace(/^#/, "");
      const restoreAnchor = requested || readSavedPosition() || "contents";
      await loadSelectedEdition(restoreAnchor);
      setHash(currentAnchor);
    } catch (error) {
      showLoadError(error);
    }
  };

  initialize();
})();
