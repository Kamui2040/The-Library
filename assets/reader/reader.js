(() => {
  "use strict";

  const engine = window.LibraryReaderEngine;
  const dock = document.querySelector("[data-toc-dock]");
  const toggle = document.querySelector("[data-toc-toggle]");
  const panel = document.querySelector("[data-toc-panel]");
  const tocList = document.querySelector("[data-reader-toc-list]");
  const tocHeading = document.querySelector("[data-toc-heading]");
  const bookStage = document.querySelector(".book-stage");
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
    !engine || !dock || !toggle || !panel || !tocList || !tocHeading || !bookStage || !spread ||
    !leftPage || !rightPage || !probe || !positionLabel || !modeLabel || !titleLabel ||
    !previousButton || !nextButton
  ) return;

  const manifestUrl = document.body?.dataset.readerBookManifest || "../../content/worlds/telanas/books/dragon-knight/volume-01/book.json";
  const positionStorageKey = "library-reader-position-v2";
  const legacyPositionStorageKey = "library-reader-position-v1";
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
      loadError: "The reader content could not be loaded.",
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
      loadError: "Der Reader-Inhalt konnte nicht geladen werden.",
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

  const captureLanguageTransfer = () => {
    if (!model || currentAnchor === "contents") return { anchor: "contents", chapterId: null, ratio: 0 };
    const chapterId = engine.chapterForAnchor(model, currentAnchor);
    if (!chapterId) return { anchor: "contents", chapterId: null, ratio: 0 };
    const chapter = chapterById(chapterId);
    const blockIndex = chapter?.blocks.findIndex((block) => block.id === currentAnchor) ?? -1;
    const denominator = Math.max(1, (chapter?.blocks.length || 1) - 1);
    return {
      anchor: currentAnchor,
      chapterId,
      ratio: blockIndex >= 0 ? blockIndex / denominator : 0
    };
  };

  const restoreAnchorForModel = (restore) => {
    if (typeof restore === "string") return engine.resolveAnchor(model, restore);
    if (!restore || typeof restore !== "object") return "contents";
    if (typeof restore.anchor === "string" && model.anchors.has(restore.anchor)) return restore.anchor;
    if (typeof restore.chapterId !== "string") return "contents";

    const chapter = chapterById(restore.chapterId);
    if (!chapter) return "contents";
    if (!chapter.blocks.length) return chapter.id;
    const ratio = Number.isFinite(restore.ratio) ? Math.max(0, Math.min(1, restore.ratio)) : 0;
    const index = Math.round(ratio * Math.max(0, chapter.blocks.length - 1));
    return chapter.blocks[index]?.id || chapter.id;
  };

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
      const localized = parsed?.version === 2 ? parsed.books?.[key]?.[language()] : null;
      if (typeof localized === "string") return localized;

      const legacy = JSON.parse(localStorage.getItem(legacyPositionStorageKey) || "null");
      return legacy?.version === 1 && typeof legacy.books?.[key] === "string" ? legacy.books[key] : null;
    } catch {
      return null;
    }
  };

  const savePosition = (anchor) => {
    const key = positionKey();
    if (!key) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(positionStorageKey) || "null");
      const state = parsed?.version === 2 && parsed.books && typeof parsed.books === "object"
        ? parsed
        : { version: 2, books: {} };
      const saved = state.books[key] && typeof state.books[key] === "object" && !Array.isArray(state.books[key])
        ? state.books[key]
        : {};
      saved[language()] = anchor;
      state.books[key] = saved;
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

  const illustrationSource = (relativeSource) => {
    const manifestAbsolute = new URL(manifestUrl, window.location.href);
    return new URL(relativeSource, manifestAbsolute).href;
  };

  const makeIllustration = (block) => {
    const figure = createAnchorElement(
      "figure",
      block.id,
      block.chapterId,
      `reader-illustration reader-illustration--${block.placement}`,
    );
    figure.style.setProperty("--reader-illustration-ratio", block.asset.aspectRatio.replace(":", " / "));

    let media;
    if (block.asset.mode === "image") {
      media = document.createElement("img");
      media.className = "reader-illustration-media";
      media.src = illustrationSource(block.asset.src);
      media.alt = block.alt;
      media.loading = "lazy";
      media.decoding = "async";
    } else {
      media = document.createElement("div");
      media.className = "reader-illustration-media reader-illustration-placeholder";
      media.setAttribute("role", "img");
      media.setAttribute("aria-label", block.alt);
      const mark = document.createElement("span");
      mark.className = "reader-illustration-placeholder-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "◇";
      media.append(mark);
    }

    figure.append(media);
    if (block.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = block.caption;
      figure.append(caption);
    }
    return figure;
  };

  const renderBlock = (block) => {
    if (block.type === "illustration") return makeIllustration(block);

    if (block.type === "scene-break" || block.type === "section-separator") {
      const separator = block.id
        ? createAnchorElement("div", block.id, block.chapterId, "reader-scene-break")
        : document.createElement("div");
      separator.classList.add("reader-scene-break");
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

  const makeContents = ({ compact = false, chapterIds = null, continued = false } = {}) => {
    const labels = bookLabels();
    const wrapper = createAnchorElement(
      "section",
      "contents",
      null,
      compact ? "reader-contents reader-contents--compact" : "reader-contents",
    );
    const selectedChapters = Array.isArray(chapterIds)
      ? model.chapters.filter((chapter) => chapterIds.includes(chapter.id))
      : model.chapters;

    if (!continued) {
      const heading = document.createElement("h1");
      heading.textContent = labels?.contents || "Contents";
      const subheading = document.createElement("h2");
      subheading.textContent = `${labels?.world || "Telanas"} · ${labels?.series || ""}`;
      wrapper.append(heading, subheading);
    } else {
      const continuedHeading = document.createElement("h2");
      continuedHeading.className = "contents-continued-heading";
      continuedHeading.textContent = labels?.contents || "Contents";
      wrapper.append(continuedHeading);
    }

    const list = document.createElement("div");
    list.className = "contents-list";
    for (const chapter of selectedChapters) {
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

    wrapper.append(list);
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
    const pageHeight = Math.max(
      420,
      rect.height || Number.parseFloat(pageStyle.height) || Number.parseFloat(pageStyle.minHeight) || 650,
    );
    probe.style.width = `${width}px`;
    probe.style.height = `${pageHeight}px`;
    probe.style.minHeight = `${pageHeight}px`;
    probe.style.maxHeight = `${pageHeight}px`;
  };

  const blocksFitPage = (blocks) => {
    probe.replaceChildren(...blocks.map(renderBlock));
    return probe.scrollHeight <= probe.clientHeight + 1;
  };

  const beforeTitleBlocks = (chapter) => chapter.blocks.filter(
    (block) => block.type === "illustration" && block.placement === "before-title",
  );

  const chapterBodyBlocks = (chapter) => chapter.blocks.filter(
    (block) => !(block.type === "illustration" && block.placement === "before-title"),
  );

  const syntheticSeparator = (chapterId) => ({
    id: null,
    type: "section-separator",
    chapterId,
    keepWithNext: false,
    forceOwnPage: false
  });

  const chapterSections = (chapter) => {
    const sections = [];
    let current = [];
    const startSection = () => {
      if (current.length === 0) current.push(syntheticSeparator(chapter.id));
    };

    for (const block of chapterBodyBlocks(chapter)) {
      if (block.type === "scene-break") {
        if (current.some((item) => item.type !== "section-separator")) {
          current.push({ ...block, type: "section-separator", keepWithNext: false });
          sections.push(current);
          current = [];
        }
        continue;
      }
      startSection();
      current.push(block);
    }

    if (current.some((item) => item.type !== "section-separator")) {
      if (current[current.length - 1]?.type !== "section-separator") current.push(syntheticSeparator(chapter.id));
      sections.push(current);
    }
    return sections;
  };

  const contentsFits = (chapterIds, continued = false) => {
    probe.replaceChildren(makeContents({ chapterIds, continued }));
    return probe.scrollHeight <= probe.clientHeight + 1;
  };

  const buildContentsPages = () => {
    const ids = model.chapters.map((chapter) => chapter.id);
    if (contentsFits(ids, false)) {
      return [
        { kind: "contents", anchor: "contents", chapterId: null, blocks: [], chapterIds: ids, continued: false },
        { kind: "blank", anchor: "contents", chapterId: null, blocks: [] }
      ];
    }

    const middle = Math.ceil(ids.length / 2);
    let first = ids.slice(0, middle);
    let second = ids.slice(middle);
    for (let split = middle; split >= 1; split -= 1) {
      const candidateFirst = ids.slice(0, split);
      const candidateSecond = ids.slice(split);
      if (candidateSecond.length > 0 && contentsFits(candidateFirst, false) && contentsFits(candidateSecond, true)) {
        first = candidateFirst;
        second = candidateSecond;
        break;
      }
    }
    return [
      { kind: "contents", anchor: "contents", chapterId: null, blocks: [], chapterIds: first, continued: false },
      { kind: "contents", anchor: "contents", chapterId: null, blocks: [], chapterIds: second, continued: true }
    ];
  };

  const buildPages = () => {
    prepareProbe();
    const built = [...buildContentsPages()];

    for (const chapter of model.chapters) {
      const illustrations = beforeTitleBlocks(chapter);
      built.push({ kind: "chapter-title", anchor: chapter.id, chapterId: chapter.id, blocks: [] });
      if (illustrations.length > 0) {
        built.push({
          kind: "body",
          anchor: illustrations[0].id,
          chapterId: chapter.id,
          blocks: [illustrations[0]],
        });
      } else {
        built.push({ kind: "blank", anchor: chapter.id, chapterId: chapter.id, blocks: [] });
      }

      for (const extraIllustration of illustrations.slice(1)) {
        built.push({
          kind: "body",
          anchor: extraIllustration.id,
          chapterId: chapter.id,
          blocks: [extraIllustration],
        });
      }

      for (const section of chapterSections(chapter)) {
        const sectionPages = engine.paginateBlocks(section, blocksFitPage);
        for (const blocks of sectionPages) {
          const firstAnchored = blocks.find((block) => block.id);
          built.push({
            kind: "body",
            anchor: firstAnchored?.id || chapter.id,
            chapterId: chapter.id,
            blocks,
          });
        }
      }

      if (built.length % 2 !== 0) {
        built.push({ kind: "blank", anchor: chapter.id, chapterId: chapter.id, blocks: [] });
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
      "illustration-page",
      "is-empty",
    );

    if (!page) {
      node.classList.add("is-empty");
      return;
    }

    if (page.kind === "blank") {
      node.classList.add("is-empty");
      return;
    }

    if (page.kind === "contents") {
      node.classList.add("contents-page");
      node.append(makeContents({ chapterIds: page.chapterIds, continued: page.continued }));
      return;
    }

    if (page.kind === "chapter-title") {
      node.classList.add("chapter-title-page");
      node.append(makeChapterTitle(chapterById(page.chapterId)));
      return;
    }

    node.classList.add("body-page");
    if (
      page.blocks?.length === 1 &&
      page.blocks[0].type === "illustration" &&
      page.blocks[0].placement !== "flow"
    ) {
      node.classList.add("illustration-page");
    }
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
    const requestedIndex = Math.max(0, Math.min(index, pages.length - 1));
    currentPageIndex = effectiveSpread() ? requestedIndex - (requestedIndex % 2) : requestedIndex;
    renderPage(pages[currentPageIndex], leftPage);
    renderPage(effectiveSpread() ? pages[currentPageIndex + 1] : null, rightPage);
    updateCurrentAnchor(pages[currentPageIndex].anchor, { updateHash, persist });
    updatePagedStatus();
  };

  const turnPage = (direction) => {
    if (layoutPreference === "continuous") return;
    if (direction < 0) {
      if (!previousButton.disabled) renderPagedAt(currentPageIndex - pageStep());
      return;
    }
    if (!nextButton.disabled) renderPagedAt(currentPageIndex + pageStep());
  };

  const isInteractiveTarget = (target) => (
    target instanceof Element && Boolean(
      target.closest("button, a, input, select, textarea, summary, label, [contenteditable='true']"),
    )
  );

  const handlePageClick = (event) => {
    if (layoutPreference === "continuous" || event.button !== 0 || isInteractiveTarget(event.target)) return;

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) return;

    if (effectiveSpread()) {
      if (leftPage.contains(event.target)) turnPage(-1);
      else if (rightPage.contains(event.target)) turnPage(1);
      return;
    }

    const rect = leftPage.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return;

    const midpoint = rect.left + rect.width / 2;
    turnPage(event.clientX < midpoint ? -1 : 1);
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
    leftPage.classList.remove("contents-page", "chapter-title-page", "body-page", "illustration-page", "is-empty");
    rightPage.classList.remove("contents-page", "chapter-title-page", "body-page", "continuous-page", "illustration-page");
    leftPage.classList.add("continuous-page");
    rightPage.classList.add("is-empty");

    leftPage.append(makeContents({ compact: true }));
    for (const chapter of model.chapters) {
      const section = document.createElement("section");
      section.className = "reader-continuous-chapter";
      section.append(
        makeChapterTitle(chapter),
        ...beforeTitleBlocks(chapter).map(renderBlock),
        ...chapterBodyBlocks(chapter).map(renderBlock),
      );
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
    currentAnchor = restoreAnchorForModel(restoreAnchor);
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
    leftPage.classList.remove("continuous-page", "illustration-page");
    rightPage.classList.remove("continuous-page", "illustration-page");
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

  bookStage.addEventListener("click", handlePageClick);

  previousButton.addEventListener("click", () => {
    turnPage(-1);
  });

  nextButton.addEventListener("click", () => {
    turnPage(1);
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

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      turnPage(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      turnPage(1);
    }
  });

  document.querySelectorAll("[data-layout-button]").forEach((button) => {
    button.addEventListener("click", () => setLayout(button.dataset.layoutButton));
  });

  window.addEventListener("library-language-change", async () => {
    if (!book) return;
    const restoreAnchor = captureLanguageTransfer();
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
