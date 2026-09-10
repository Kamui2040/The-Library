(() => {
  "use strict";

  const body = document.body;
  const profileApi = window.LibrarySpoilerProfile;
  const spread = document.querySelector("[data-book-spread]");
  const bookStage = document.querySelector(".book-stage");
  const manifestReference = body?.dataset.readerBookManifest;

  if (!body || !profileApi || !spread || !bookStage || !manifestReference) return;

  const copy = {
    en: {
      kicker: "Lexicon",
      close: "Close Lexicon card",
      open: (term) => `Open Lexicon note for ${term}`
    },
    de: {
      kicker: "Lexikon",
      close: "Lexikon-Karte schließen",
      open: (term) => `Lexikon-Eintrag zu ${term} öffnen`
    }
  };

  let book = null;
  let world = null;
  let lexicon = null;
  let contextual = null;
  let edition = null;
  let bookUrl = null;
  let anchorOrder = new Map();
  let paragraphText = new Map();
  let referencesByAnchor = new Map();
  let milestoneOrder = [];
  let mutationFrame = null;
  let milestoneObserver = null;
  let openEntryId = null;
  let returnFocus = null;
  let editionLoadToken = 0;

  const language = () => document.documentElement.lang === "de" ? "de" : "en";
  const table = () => copy[language()];

  const overlay = document.createElement("div");
  overlay.className = "reader-lexicon-overlay";
  overlay.dataset.readerLexiconOverlay = "";
  overlay.hidden = true;
  overlay.setAttribute("role", "presentation");

  const card = document.createElement("section");
  card.className = "reader-lexicon-card";
  card.dataset.readerLexiconCard = "";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "reader-lexicon-card-title");
  card.tabIndex = -1;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "reader-lexicon-close";
  closeButton.dataset.readerLexiconClose = "";
  closeButton.textContent = "×";

  const kicker = document.createElement("p");
  kicker.className = "reader-lexicon-kicker";

  const title = document.createElement("h2");
  title.id = "reader-lexicon-card-title";
  title.className = "reader-lexicon-title";

  const fullName = document.createElement("p");
  fullName.className = "reader-lexicon-full-name";

  const summary = document.createElement("p");
  summary.className = "reader-lexicon-summary";

  const sections = document.createElement("div");
  sections.className = "reader-lexicon-sections";

  const relationships = document.createElement("div");
  relationships.className = "reader-lexicon-relationships";

  card.append(closeButton, kicker, title, fullName, summary, sections, relationships);
  overlay.append(card);
  document.body.append(overlay);

  const localizeOverlay = () => {
    kicker.textContent = table().kicker;
    closeButton.setAttribute("aria-label", table().close);
    closeButton.title = table().close;
  };

  const closeOverlay = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    openEntryId = null;
    const focusTarget = returnFocus;
    returnFocus = null;
    if (focusTarget instanceof HTMLElement && document.contains(focusTarget)) focusTarget.focus();
  };

  const entryById = (entryId) => (
    (lexicon?.entries || []).find((entry) => entry.id === entryId) || null
  );

  const eligibleEntry = (entryId, profile = profileApi.get()) => {
    const entry = entryById(entryId);
    if (!entry || !profileApi.visibilityAllowed(world, entry.visibility, profile)) return null;

    const labels = entry.labels?.[language()];
    if (!labels?.title || !labels?.summary) return null;

    const curatedSections = (entry.sections || [])
      .filter((section) => profileApi.visibilityAllowed(world, section.visibility, profile))
      .map((section) => ({
        id: section.id,
        title: section.labels?.[language()],
        text: section.text?.[language()]
      }))
      .filter((section) => typeof section.title === "string" && section.title.trim() && typeof section.text === "string" && section.text.trim());

    const related = (entry.relationships || [])
      .filter((relationship) => profileApi.visibilityAllowed(world, relationship.visibility || { mode: "always" }, profile))
      .map((relationship) => {
        const target = entryById(relationship.target);
        if (!target || !profileApi.visibilityAllowed(world, target.visibility, profile)) return null;
        const label = relationship.labels?.[language()];
        const targetTitle = target.labels?.[language()]?.title;
        if (!label || !targetTitle) return null;
        return { label, targetTitle };
      })
      .filter(Boolean);

    return {
      id: entry.id,
      title: labels.title,
      fullName: typeof labels.fullName === "string" ? labels.fullName : "",
      summary: labels.summary,
      sections: curatedSections,
      relationships: related
    };
  };

  const renderOpenCard = () => {
    if (!openEntryId) return;
    const entry = eligibleEntry(openEntryId);
    if (!entry) {
      closeOverlay();
      return;
    }

    localizeOverlay();
    title.textContent = entry.title;
    fullName.textContent = entry.fullName && entry.fullName !== entry.title
      ? `${language() === "de" ? "Vollständiger Name" : "Full name"}: ${entry.fullName}`
      : "";
    fullName.hidden = !fullName.textContent;
    summary.textContent = entry.summary;

    sections.replaceChildren(...entry.sections.map((item) => {
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      heading.textContent = item.title;
      const paragraph = document.createElement("p");
      paragraph.textContent = item.text;
      section.append(heading, paragraph);
      return section;
    }));
    sections.hidden = entry.sections.length === 0;

    relationships.replaceChildren();
    if (entry.relationships.length > 0) {
      const heading = document.createElement("h3");
      heading.textContent = language() === "de" ? "Verwandt" : "Related";
      relationships.append(heading, ...entry.relationships.map((item) => {
        const row = document.createElement("p");
        const label = document.createElement("span");
        label.textContent = item.label;
        const target = document.createElement("strong");
        target.textContent = item.targetTitle;
        row.append(label, target);
        return row;
      }));
    }
    relationships.hidden = entry.relationships.length === 0;
  };

  const openOverlay = (entryId, trigger) => {
    const entry = eligibleEntry(entryId);
    if (!entry) return;

    openEntryId = entry.id;
    returnFocus = trigger instanceof HTMLElement ? trigger : null;
    renderOpenCard();
    overlay.hidden = false;
    closeButton.focus();
  };

  closeButton.addEventListener("click", closeOverlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay();
  });

  document.addEventListener("keydown", (event) => {
    if (overlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeOverlay();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      closeButton.focus();
    }
  });

  const rebuildEditionIndex = () => {
    anchorOrder = new Map([["contents", 0]]);
    paragraphText = new Map();
    let index = 1;

    for (const chapter of edition?.chapters || []) {
      anchorOrder.set(chapter.id, index++);
      for (const block of chapter.blocks || []) {
        anchorOrder.set(block.id, index++);
        if (block.type === "paragraph" && typeof block.text === "string") {
          paragraphText.set(block.id, block.text);
        }
      }
    }

    milestoneOrder = (book?.spoilerMilestones || [])
      .filter((anchor) => anchorOrder.has(anchor))
      .sort((left, right) => anchorOrder.get(left) - anchorOrder.get(right));

    referencesByAnchor = new Map();
    for (const reference of contextual?.references?.[language()] || []) {
      if (!referencesByAnchor.has(reference.anchor)) referencesByAnchor.set(reference.anchor, []);
      referencesByAnchor.get(reference.anchor).push(reference);
    }
  };

  const milestonesThrough = (anchor) => {
    const targetIndex = anchorOrder.get(anchor);
    if (targetIndex === undefined) return [];
    return milestoneOrder.filter((milestone) => anchorOrder.get(milestone) <= targetIndex);
  };

  const markMilestonesThrough = (anchor) => {
    if (!book || !anchorOrder.has(anchor)) return;
    const reached = milestonesThrough(anchor);
    if (reached.length === 0) return;
    profileApi.markReachedAnchors(book.world, book.story, book.id, reached);
  };

  const findOccurrence = (source, needle, occurrence) => {
    let from = 0;
    let found = -1;
    for (let count = 0; count < occurrence; count += 1) {
      found = source.indexOf(needle, from);
      if (found < 0) return -1;
      from = found + needle.length;
    }
    return found;
  };

  const eligibleAnnotations = (anchor) => {
    const source = paragraphText.get(anchor);
    if (typeof source !== "string") return [];
    const profile = profileApi.get();

    return (referencesByAnchor.get(anchor) || [])
      .map((reference) => {
        if (!eligibleEntry(reference.entry, profile)) return null;
        const start = findOccurrence(source, reference.text, reference.occurrence || 1);
        if (start < 0) return null;
        return {
          ...reference,
          start,
          end: start + reference.text.length
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.start - right.start);
  };

  const annotationSignature = (anchor, annotations) => (
    `${language()}|${anchor}|${annotations.map((item) => `${item.entry}:${item.start}:${item.end}`).join(",")}`
  );

  const annotateParagraph = (paragraph) => {
    const anchor = paragraph.dataset.readerAnchor;
    const source = paragraphText.get(anchor);
    if (typeof source !== "string") return;

    const annotations = eligibleAnnotations(anchor);
    const signature = annotationSignature(anchor, annotations);
    if (paragraph.dataset.readerLexiconSignature === signature) return;
    paragraph.dataset.readerLexiconSignature = signature;

    if (annotations.length === 0) {
      paragraph.textContent = source;
      return;
    }

    const nodes = [];
    let cursor = 0;
    for (const annotation of annotations) {
      if (annotation.start < cursor) continue;
      if (annotation.start > cursor) nodes.push(document.createTextNode(source.slice(cursor, annotation.start)));

      const button = document.createElement("button");
      button.type = "button";
      button.className = "reader-lexicon-ref";
      button.dataset.readerLexiconEntry = annotation.entry;
      button.dataset.readerLexiconAnchor = anchor;
      button.textContent = source.slice(annotation.start, annotation.end);
      button.setAttribute("aria-label", table().open(button.textContent));
      nodes.push(button);
      cursor = annotation.end;
    }
    if (cursor < source.length) nodes.push(document.createTextNode(source.slice(cursor)));
    paragraph.replaceChildren(...nodes);
  };

  const annotateRenderedParagraphs = () => {
    spread.querySelectorAll(".reader-prose[data-reader-anchor]").forEach(annotateParagraph);
  };

  const furthestPagedAnchor = () => {
    let bestAnchor = null;
    let bestIndex = -1;
    spread.querySelectorAll(".book-page:not(.pagination-probe) [data-reader-anchor]").forEach((node) => {
      const anchor = node.dataset.readerAnchor;
      const index = anchorOrder.get(anchor);
      if (index !== undefined && index > bestIndex) {
        bestIndex = index;
        bestAnchor = anchor;
      }
    });
    return bestAnchor;
  };

  const disconnectMilestoneObserver = () => {
    if (milestoneObserver) milestoneObserver.disconnect();
    milestoneObserver = null;
  };

  const observeContinuousMilestones = () => {
    disconnectMilestoneObserver();
    if (!spread.classList.contains("continuous") || milestoneOrder.length === 0) return;

    const nodes = [...spread.querySelectorAll("[data-reader-anchor]")]
      .filter((node) => milestoneOrder.includes(node.dataset.readerAnchor));
    if (nodes.length === 0) return;

    if (!("IntersectionObserver" in window)) return;
    milestoneObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        markMilestonesThrough(entry.target.dataset.readerAnchor);
      }
    }, {
      root: null,
      rootMargin: "-8% 0px -52% 0px",
      threshold: 0
    });
    nodes.forEach((node) => milestoneObserver.observe(node));
  };

  const updateProgressTracking = () => {
    if (!edition) return;
    if (spread.classList.contains("continuous")) {
      observeContinuousMilestones();
      return;
    }
    disconnectMilestoneObserver();
    const anchor = furthestPagedAnchor();
    if (anchor) markMilestonesThrough(anchor);
  };

  const refreshRenderedState = () => {
    mutationFrame = null;
    if (!edition || !lexicon || !world) return;
    annotateRenderedParagraphs();
    updateProgressTracking();
  };

  const scheduleRefresh = () => {
    if (mutationFrame !== null) return;
    mutationFrame = requestAnimationFrame(refreshRenderedState);
  };

  new MutationObserver(scheduleRefresh).observe(spread, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });

  bookStage.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-reader-lexicon-entry]");
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    const anchor = trigger.dataset.readerLexiconAnchor;
    if (anchor) markMilestonesThrough(anchor);
    openOverlay(trigger.dataset.readerLexiconEntry, trigger);
  });

  window.addEventListener(profileApi.eventName, () => {
    spread.querySelectorAll(".reader-prose[data-reader-anchor]").forEach((paragraph) => {
      delete paragraph.dataset.readerLexiconSignature;
    });
    scheduleRefresh();
    renderOpenCard();
  });

  const editionUrl = (locale) => {
    const relative = book?.editions?.[locale];
    if (!relative) throw new Error(`No public reader edition registered for ${locale}`);
    return new URL(relative, bookUrl).href;
  };

  const loadEdition = async (locale) => {
    const token = ++editionLoadToken;
    const response = await fetch(editionUrl(locale), { cache: "no-store" });
    if (!response.ok) throw new Error(`Contextual Lexicon edition HTTP ${response.status}`);
    const loaded = await response.json();
    if (token !== editionLoadToken) return false;
    edition = loaded;
    rebuildEditionIndex();
    scheduleRefresh();
    renderOpenCard();
    return true;
  };

  window.addEventListener("library-language-change", async () => {
    try {
      await loadEdition(language());
    } catch (error) {
      console.error("Reader contextual Lexicon could not switch edition", error);
    }
  });

  const load = async () => {
    try {
      bookUrl = new URL(manifestReference, window.location.href);
      const bookResponse = await fetch(bookUrl, { cache: "no-store" });
      if (!bookResponse.ok) throw new Error(`Book manifest HTTP ${bookResponse.status}`);
      book = await bookResponse.json();
      if (!book.contextualLexicon) return;

      const worldUrl = new URL("../../../world.json", bookUrl);
      const worldResponse = await fetch(worldUrl, { cache: "no-store" });
      if (!worldResponse.ok) throw new Error(`World manifest HTTP ${worldResponse.status}`);
      world = await worldResponse.json();
      if (!world.lexicon) return;

      const [lexiconResponse, contextualResponse] = await Promise.all([
        fetch(new URL(world.lexicon, worldUrl), { cache: "no-store" }),
        fetch(new URL(book.contextualLexicon, bookUrl), { cache: "no-store" })
      ]);
      if (!lexiconResponse.ok) throw new Error(`Lexicon manifest HTTP ${lexiconResponse.status}`);
      if (!contextualResponse.ok) throw new Error(`Contextual Lexicon manifest HTTP ${contextualResponse.status}`);
      [lexicon, contextual] = await Promise.all([lexiconResponse.json(), contextualResponse.json()]);

      localizeOverlay();
      await loadEdition(language());
    } catch (error) {
      console.error("Reader contextual Lexicon could not load its public manifests", error);
      closeOverlay();
    }
  };

  localizeOverlay();
  load();
})();
