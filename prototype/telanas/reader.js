(() => {
  "use strict";

  const dock = document.querySelector("[data-toc-dock]");
  const toggle = document.querySelector("[data-toc-toggle]");
  const panel = document.querySelector("[data-toc-panel]");
  const spread = document.querySelector("[data-book-spread]");
  const leftPage = document.querySelector("[data-book-page='left']");
  const rightPage = document.querySelector("[data-book-page='right']");
  const positionLabel = document.querySelector("[data-reader-position]");
  const modeLabel = document.querySelector("[data-reader-mode]");
  const titleLabel = document.querySelector("[data-reader-title]");

  if (!dock || !toggle || !panel || !spread || !leftPage || !rightPage) return;

  const pointerHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  let pinned = false;
  let closeTimer = null;
  let currentTarget = "contents";

  const copy = {
    en: {
      title: "The Dragon Knight · Volume 1 — Home",
      contents: "Contents",
      prologue: "Prologue",
      chapter1: "Chapter 1",
      chapter2: "Chapter 2",
      chapter3: "Chapter 3",
      spread: "Book spread",
      single: "Single page",
      continuous: "Continuous",
      opening: "Prototype opening",
      sample1: "This page intentionally uses neutral placeholder copy. The production reader will receive released text through the publication pipeline rather than storing unreleased manuscript material in the site repository.",
      sample2: "Rendered page boundaries are temporary. Navigation, bookmarks, Lexicon references, and reading progress resolve to semantic story anchors instead of fixed page numbers.",
      sample3: "Changing type size, page width, language, or layout may repaginate this same content without changing its canonical location.",
      integrated: "This integrated Contents page and the left reader navigation are generated from the same ordered book structure.",
      choose: "Select any entry to jump to its semantic chapter anchor."
    },
    de: {
      title: "Der Drachenritter · Band 1 — Zuhause",
      contents: "Inhalt",
      prologue: "Prolog",
      chapter1: "Kapitel 1",
      chapter2: "Kapitel 2",
      chapter3: "Kapitel 3",
      spread: "Buchansicht",
      single: "Einzelseite",
      continuous: "Fortlaufend",
      opening: "Prototyp-Anfang",
      sample1: "Diese Seite verwendet absichtlich neutralen Platzhaltertext. Der fertige Reader erhält veröffentlichte Texte über den Publikationsprozess, statt unveröffentlichtes Manuskriptmaterial im Website-Repository zu speichern.",
      sample2: "Gerenderte Seitengrenzen sind vorübergehend. Navigation, Lesezeichen, Lexikon-Verweise und Lesefortschritt verwenden semantische Anker statt feste Seitenzahlen.",
      sample3: "Schriftgröße, Seitenbreite, Sprache oder Layout können denselben Inhalt neu umbrechen, ohne seine kanonische Position zu verändern.",
      integrated: "Diese integrierte Inhaltsseite und die linke Reader-Navigation werden aus derselben geordneten Buchstruktur erzeugt.",
      choose: "Wähle einen Eintrag, um zu seinem semantischen Kapitelanker zu springen."
    }
  };

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const chapterLabel = (target, table) => {
    if (target === "contents") return table.contents;
    if (target === "prologue") return table.prologue;
    if (target === "chapter-1") return table.chapter1;
    if (target === "chapter-2") return table.chapter2;
    if (target === "chapter-3") return table.chapter3;
    return table.contents;
  };

  const contentsButtons = (table) => `
    <h1>${table.contents}</h1>
    <h2>TELANAS · ${table.title.split("·")[0].trim()}</h2>
    <p>${table.integrated}</p>
    <div class="contents-list">
      <button type="button" data-inline-target="prologue"><span>${table.prologue}</span><span>→</span></button>
      <button type="button" data-inline-target="chapter-1"><span>${table.chapter1}</span><span>→</span></button>
      <button type="button" data-inline-target="chapter-2"><span>${table.chapter2}</span><span>→</span></button>
      <button type="button" data-inline-target="chapter-3"><span>${table.chapter3}</span><span>→</span></button>
    </div>
  `;

  const render = (target, updateHash = true) => {
    const table = copy[language()];
    currentTarget = target;
    titleLabel.textContent = table.title;

    if (target === "contents") {
      leftPage.classList.add("contents-page");
      rightPage.classList.remove("contents-page");
      leftPage.innerHTML = contentsButtons(table);
      rightPage.innerHTML = `<h1>${table.opening}</h1><h2>${table.title}</h2><p>${table.choose}</p><p>${table.sample2}</p>`;
    } else {
      leftPage.classList.remove("contents-page");
      rightPage.classList.remove("contents-page");
      const label = chapterLabel(target, table);
      leftPage.innerHTML = `<p class="eyebrow">TELANAS</p><h1>${label}</h1><h2>${table.title}</h2><p>${table.sample1}</p><p>${table.sample2}</p>`;
      rightPage.innerHTML = `<p class="eyebrow">${label}</p><h1>${table.opening}</h1><p>${table.sample3}</p><p>${table.sample2}</p>`;
    }

    panel.querySelectorAll("[data-reader-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.readerTarget === target);
    });

    positionLabel.textContent = chapterLabel(target, table);

    leftPage.querySelectorAll("[data-inline-target]").forEach((button) => {
      button.addEventListener("click", () => selectTarget(button.dataset.inlineTarget));
    });

    if (updateHash) history.replaceState(null, "", `#${target}`);
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

  const selectTarget = (target) => {
    const allowed = new Set(["contents", "prologue", "chapter-1", "chapter-2", "chapter-3"]);
    const resolved = allowed.has(target) ? target : "contents";
    render(resolved);
    if (!pointerHover.matches && !pinned) setOpen(false);
  };

  panel.querySelectorAll("[data-reader-target]").forEach((button) => {
    button.addEventListener("click", () => selectTarget(button.dataset.readerTarget));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    pinned = false;
    dock.classList.remove("is-pinned");
    setOpen(false);
    toggle.focus();
  });

  const layoutButtons = [...document.querySelectorAll("[data-layout-button]")];
  const setLayout = (layout) => {
    const resolved = ["spread", "single", "continuous"].includes(layout) ? layout : "spread";
    spread.classList.toggle("single", resolved === "single");
    spread.classList.toggle("continuous", resolved === "continuous");

    layoutButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.layoutButton === resolved));
    });

    const table = copy[language()];
    modeLabel.textContent = resolved === "single" ? table.single : resolved === "continuous" ? table.continuous : table.spread;

    try {
      localStorage.setItem("library-reader-layout", resolved);
    } catch {
      // Persistence is optional.
    }
  };

  layoutButtons.forEach((button) => {
    button.addEventListener("click", () => setLayout(button.dataset.layoutButton));
  });

  window.addEventListener("library-language-change", () => {
    render(currentTarget, false);
    let savedLayout = "spread";
    try {
      savedLayout = localStorage.getItem("library-reader-layout") || "spread";
    } catch {
      // Use default.
    }
    setLayout(savedLayout);
  });

  let savedLayout = "spread";
  try {
    savedLayout = localStorage.getItem("library-reader-layout") || "spread";
  } catch {
    // Use default.
  }

  const initial = location.hash.replace(/^#/, "");
  selectTarget(initial || "contents");
  setLayout(savedLayout);
})();
