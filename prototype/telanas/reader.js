(() => {
  "use strict";

  const dock = document.querySelector("[data-toc-dock]");
  const toggle = document.querySelector("[data-toc-toggle]");
  const panel = document.querySelector("[data-toc-panel]");
  const tocList = document.querySelector("[data-reader-toc-list]");
  const tocHeading = document.querySelector("[data-toc-heading]");
  const spread = document.querySelector("[data-book-spread]");
  const leftPage = document.querySelector("[data-book-page='left']");
  const rightPage = document.querySelector("[data-book-page='right']");
  const positionLabel = document.querySelector("[data-reader-position]");
  const modeLabel = document.querySelector("[data-reader-mode]");
  const titleLabel = document.querySelector("[data-reader-title]");

  if (!dock || !toggle || !panel || !tocList || !tocHeading || !spread || !leftPage || !rightPage) return;

  const manifestUrl = "../../content/worlds/telanas/books/dragon-knight/volume-01/book.json";
  const pointerHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  let pinned = false;
  let closeTimer = null;
  let currentTarget = "contents";
  let book = null;

  const copy = {
    en: {
      spread: "Book spread",
      single: "Single page",
      continuous: "Continuous",
      opening: "Prototype opening",
      sample1: "This page intentionally uses neutral placeholder copy. The production reader will receive released text through the publication pipeline rather than storing unreleased manuscript material in the site repository.",
      sample2: "Rendered page boundaries are temporary. Navigation, bookmarks, Lexicon references, and reading progress resolve to semantic story anchors instead of fixed page numbers.",
      sample3: "Changing type size, page width, language, or layout may repaginate this same content without changing its canonical location.",
      integrated: "This integrated Contents page and the left reader navigation are generated from the same ordered book manifest.",
      choose: "Select any entry to jump to its semantic chapter anchor.",
      loadError: "The prototype book manifest could not be loaded.",
      loadHint: "Serve the repository through a local web server or normal website host so the reader can load its public content manifest."
    },
    de: {
      spread: "Buchansicht",
      single: "Einzelseite",
      continuous: "Fortlaufend",
      opening: "Prototyp-Anfang",
      sample1: "Diese Seite verwendet absichtlich neutralen Platzhaltertext. Der fertige Reader erhält veröffentlichte Texte über den Publikationsprozess, statt unveröffentlichtes Manuskriptmaterial im Website-Repository zu speichern.",
      sample2: "Gerenderte Seitengrenzen sind vorübergehend. Navigation, Lesezeichen, Lexikon-Verweise und Lesefortschritt verwenden semantische Anker statt feste Seitenzahlen.",
      sample3: "Schriftgröße, Seitenbreite, Sprache oder Layout können denselben Inhalt neu umbrechen, ohne seine kanonische Position zu verändern.",
      integrated: "Diese integrierte Inhaltsseite und die linke Reader-Navigation werden aus demselben geordneten Buchmanifest erzeugt.",
      choose: "Wähle einen Eintrag, um zu seinem semantischen Kapitelanker zu springen.",
      loadError: "Das Prototyp-Buchmanifest konnte nicht geladen werden.",
      loadHint: "Stelle das Repository über einen lokalen Webserver oder einen normalen Website-Host bereit, damit der Reader sein öffentliches Inhaltsmanifest laden kann."
    }
  };

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const table = () => copy[language()];

  const bookLabels = () => {
    if (!book) return null;
    return book.labels?.[language()] || book.labels?.en || null;
  };

  const currentTitle = () => {
    const labels = bookLabels();
    return labels ? `${labels.series} · ${labels.volume}` : "The Library";
  };

  const chapterFor = (target) => {
    if (!book || target === "contents") return null;
    return book.chapters.find((chapter) => chapter.id === target || chapter.slug === target) || null;
  };

  const canonicalTarget = (target) => {
    if (target === "contents") return "contents";
    return chapterFor(target)?.id || "contents";
  };

  const chapterLabel = (target) => {
    const labels = bookLabels();
    if (target === "contents") return labels?.contents || "Contents";
    const chapter = chapterFor(target);
    return chapter?.labels?.[language()] || chapter?.labels?.en || labels?.contents || "Contents";
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
    if (!book) return;
    const labels = bookLabels();
    tocHeading.textContent = labels?.contents || "Contents";
    tocList.replaceChildren();

    const entries = [
      { id: "contents", label: labels?.contents || "Contents" },
      ...book.chapters.map((chapter) => ({
        id: chapter.id,
        label: chapter.labels?.[language()] || chapter.labels?.en || chapter.id
      }))
    ];

    for (const entry of entries) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.readerTarget = entry.id;
      button.textContent = entry.label;
      button.classList.toggle("is-active", entry.id === currentTarget);
      tocList.append(button);
    }
  };

  const contentsMarkup = () => {
    const labels = bookLabels();
    const localCopy = table();
    const buttons = book.chapters.map((chapter) => {
      const label = chapter.labels?.[language()] || chapter.labels?.en || chapter.id;
      return `<button type="button" data-inline-target="${chapter.id}"><span>${label}</span><span>→</span></button>`;
    }).join("");

    return `
      <h1>${labels?.contents || "Contents"}</h1>
      <h2>${labels?.world || "Telanas"} · ${labels?.series || ""}</h2>
      <p>${localCopy.integrated}</p>
      <div class="contents-list">${buttons}</div>
    `;
  };

  const render = (target, updateHash = true) => {
    if (!book) return;
    const localCopy = table();
    const resolved = canonicalTarget(target);
    currentTarget = resolved;
    titleLabel.textContent = currentTitle();

    if (resolved === "contents") {
      leftPage.classList.add("contents-page");
      rightPage.classList.remove("contents-page");
      leftPage.innerHTML = contentsMarkup();
      rightPage.innerHTML = `<h1>${localCopy.opening}</h1><h2>${currentTitle()}</h2><p>${localCopy.choose}</p><p>${localCopy.sample2}</p>`;
    } else {
      leftPage.classList.remove("contents-page");
      rightPage.classList.remove("contents-page");
      const label = chapterLabel(resolved);
      const labels = bookLabels();
      leftPage.innerHTML = `<p class="eyebrow">${labels?.world || "Telanas"}</p><h1>${label}</h1><h2>${currentTitle()}</h2><p>${localCopy.sample1}</p><p>${localCopy.sample2}</p>`;
      rightPage.innerHTML = `<p class="eyebrow">${label}</p><h1>${localCopy.opening}</h1><p>${localCopy.sample3}</p><p>${localCopy.sample2}</p>`;
    }

    positionLabel.textContent = chapterLabel(resolved);
    renderToc();

    leftPage.querySelectorAll("[data-inline-target]").forEach((button) => {
      button.addEventListener("click", () => selectTarget(button.dataset.inlineTarget));
    });

    if (updateHash) history.replaceState(null, "", `#${resolved}`);
  };

  const selectTarget = (target) => {
    if (!book) return;
    render(target);
    if (!pointerHover.matches && !pinned) setOpen(false);
  };

  const setLayout = (layout) => {
    const resolved = ["spread", "single", "continuous"].includes(layout) ? layout : "spread";
    spread.classList.toggle("single", resolved === "single");
    spread.classList.toggle("continuous", resolved === "continuous");

    document.querySelectorAll("[data-layout-button]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.layoutButton === resolved));
    });

    const localCopy = table();
    modeLabel.textContent = resolved === "single" ? localCopy.single : resolved === "continuous" ? localCopy.continuous : localCopy.spread;

    try {
      localStorage.setItem("library-reader-layout", resolved);
    } catch {
      // Persistence is optional.
    }
  };

  const savedLayout = () => {
    try {
      return localStorage.getItem("library-reader-layout") || "spread";
    } catch {
      return "spread";
    }
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
    if (button) selectTarget(button.dataset.readerTarget);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    pinned = false;
    dock.classList.remove("is-pinned");
    setOpen(false);
    toggle.focus();
  });

  document.querySelectorAll("[data-layout-button]").forEach((button) => {
    button.addEventListener("click", () => setLayout(button.dataset.layoutButton));
  });

  window.addEventListener("library-language-change", () => {
    if (book) render(currentTarget, false);
    setLayout(savedLayout());
  });

  const showLoadError = () => {
    const localCopy = table();
    titleLabel.textContent = "The Library";
    tocList.replaceChildren();
    leftPage.innerHTML = `<h1>${localCopy.loadError}</h1><p>${localCopy.loadHint}</p>`;
    rightPage.innerHTML = "";
    positionLabel.textContent = localCopy.loadError;
  };

  const initialize = async () => {
    setLayout(savedLayout());

    try {
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      book = await response.json();
    } catch (error) {
      console.error("Reader manifest load failed", error);
      showLoadError();
      return;
    }

    const initial = location.hash.replace(/^#/, "") || "contents";
    render(initial, false);
    history.replaceState(null, "", `#${currentTarget}`);
    setLayout(savedLayout());
  };

  initialize();
})();
