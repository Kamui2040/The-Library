(() => {
  "use strict";

  const profileApi = window.LibrarySpoilerProfile;
  const body = document.body;
  const spread = document.querySelector("[data-book-spread]");
  const leftPage = document.querySelector("[data-book-page='left']");
  const nextButton = document.querySelector("[data-page-next]");
  const positionLabel = document.querySelector("[data-reader-position]");
  const modeSelect = document.querySelector("[data-reader-progress-mode]");
  const settingLabel = document.querySelector("[data-reader-progress-setting-label]");
  const completion = document.querySelector("[data-reader-completion]");
  const completionEyebrow = document.querySelector("[data-reader-completion-eyebrow]");
  const completionTitle = document.querySelector("[data-reader-completion-title]");
  const completionText = document.querySelector("[data-reader-completion-text]");
  const markButton = document.querySelector("[data-reader-mark-complete]");
  const dismissButton = document.querySelector("[data-reader-dismiss-completion]");
  const lexiconLink = document.querySelector("[data-reader-completion-lexicon]");
  const manifestReference = body?.dataset.readerBookManifest;

  if (
    !profileApi || !body || !spread || !leftPage || !nextButton || !positionLabel ||
    !modeSelect || !settingLabel || !completion || !completionEyebrow || !completionTitle ||
    !completionText || !markButton || !dismissButton || !lexiconLink || !manifestReference
  ) return;

  const modeStorageKey = "library-reader-progress-mode-v1";
  const allowedModes = new Set(["ask", "automatic", "manual"]);

  const copy = {
    en: {
      setting: "Spoiler progress",
      ask: "Ask when a volume ends",
      automatic: "Update automatically",
      manual: "Manual in Lexicon",
      eyebrow: "Reading progress",
      title: "Mark this volume as finished?",
      text: (volume) => `You reached the end of ${volume}. Mark it as finished to unlock only the Lexicon information revealed through this volume.`,
      mark: "Mark finished",
      dismiss: "Not now",
      lexicon: "Open Lexicon"
    },
    de: {
      setting: "Spoiler-Fortschritt",
      ask: "Am Bandende nachfragen",
      automatic: "Automatisch aktualisieren",
      manual: "Manuell im Lexikon",
      eyebrow: "Lesefortschritt",
      title: "Diesen Band als abgeschlossen markieren?",
      text: (volume) => `Du hast das Ende von ${volume} erreicht. Markiere den Band als abgeschlossen, um nur die bis hier enthüllten Lexikon-Informationen freizuschalten.`,
      mark: "Als abgeschlossen markieren",
      dismiss: "Nicht jetzt",
      lexicon: "Lexikon öffnen"
    }
  };

  let book = null;
  let world = null;
  let progressMode = readMode();
  let continuousAtEnd = false;
  let wasAtEnd = false;
  let dismissedAtEnd = false;
  let sentinel = null;
  let observedSentinel = null;
  let sentinelObserver = null;
  let framePending = false;

  function language() {
    return document.documentElement.lang === "de" ? "de" : "en";
  }

  function readMode() {
    try {
      const stored = localStorage.getItem(modeStorageKey);
      return allowedModes.has(stored) ? stored : "ask";
    } catch {
      return "ask";
    }
  }

  function saveMode() {
    try {
      localStorage.setItem(modeStorageKey, progressMode);
    } catch {
      // Persistence is optional.
    }
  }

  function setOptionText(value, text) {
    const option = modeSelect.querySelector(`option[value='${value}']`);
    if (option) option.textContent = text;
  }

  function volumeLabel() {
    const labels = book?.labels?.[language()] || book?.labels?.en;
    return labels?.volume || (language() === "de" ? "diesem Band" : "this volume");
  }

  function localize() {
    const table = copy[language()];
    settingLabel.textContent = table.setting;
    setOptionText("ask", table.ask);
    setOptionText("automatic", table.automatic);
    setOptionText("manual", table.manual);
    completionEyebrow.textContent = table.eyebrow;
    completionTitle.textContent = table.title;
    completionText.textContent = table.text(volumeLabel());
    markButton.textContent = table.mark;
    dismissButton.textContent = table.dismiss;
    lexiconLink.textContent = table.lexicon;
    modeSelect.value = progressMode;
  }

  function storyBooks() {
    const story = world?.stories?.find((candidate) => candidate.id === book?.story);
    return Array.isArray(story?.books) ? story.books : [];
  }

  function completedBookId() {
    if (!book) return "none";
    return profileApi.get().worlds?.[book.world]?.completed?.[book.story] || "none";
  }

  function isBookCompleted() {
    const books = storyBooks();
    const currentIndex = books.findIndex((candidate) => candidate.id === book?.id);
    const completedId = completedBookId();
    const completedIndex = books.findIndex((candidate) => candidate.id === completedId);

    if (currentIndex < 0) return false;
    if (completedId !== "none" && completedIndex < 0) return true;
    return completedIndex >= currentIndex;
  }

  function readerHasContent() {
    return Boolean(leftPage.querySelector("[data-reader-anchor]"));
  }

  function disconnectSentinelObserver() {
    if (sentinelObserver) sentinelObserver.disconnect();
    sentinelObserver = null;
    observedSentinel = null;
  }

  function updateContinuousFallback() {
    if (!spread.classList.contains("continuous") || !sentinel) return;
    const rect = sentinel.getBoundingClientRect();
    const next = rect.top <= window.innerHeight && rect.bottom >= 0;
    if (next === continuousAtEnd) return;
    continuousAtEnd = next;
    scheduleEvaluate();
  }

  function observeSentinel(nextSentinel) {
    if (observedSentinel === nextSentinel) return;
    disconnectSentinelObserver();
    observedSentinel = nextSentinel;

    if (!("IntersectionObserver" in window)) {
      updateContinuousFallback();
      return;
    }

    sentinelObserver = new IntersectionObserver((entries) => {
      const entry = entries.find((candidate) => candidate.target === observedSentinel);
      const next = Boolean(entry?.isIntersecting);
      if (next === continuousAtEnd) return;
      continuousAtEnd = next;
      scheduleEvaluate();
    }, {
      root: null,
      rootMargin: "0px 0px -4% 0px",
      threshold: 0
    });

    sentinelObserver.observe(nextSentinel);
  }

  function maintainContinuousSentinel() {
    if (!spread.classList.contains("continuous") || !leftPage.classList.contains("continuous-page")) {
      const staleSentinel = leftPage.querySelector("[data-reader-progress-end]");
      if (staleSentinel) staleSentinel.remove();
      disconnectSentinelObserver();
      sentinel = null;
      continuousAtEnd = false;
      return;
    }

    sentinel = leftPage.querySelector("[data-reader-progress-end]");
    if (!sentinel) {
      sentinel = document.createElement("span");
      sentinel.className = "reader-progress-end-sentinel";
      sentinel.dataset.readerProgressEnd = "";
      sentinel.setAttribute("aria-hidden", "true");
      leftPage.append(sentinel);
    }

    observeSentinel(sentinel);
  }

  function currentAtEnd() {
    if (!readerHasContent()) return false;
    return spread.classList.contains("continuous") ? continuousAtEnd : nextButton.disabled;
  }

  function hideCompletion() {
    completion.hidden = true;
  }

  function markCompleted() {
    if (!book || !world || isBookCompleted()) {
      hideCompletion();
      return;
    }

    const books = storyBooks();
    const currentIndex = books.findIndex((candidate) => candidate.id === book.id);
    const completedIndex = books.findIndex((candidate) => candidate.id === completedBookId());
    if (currentIndex < 0 || completedIndex >= currentIndex) {
      hideCompletion();
      return;
    }

    profileApi.setCompletedVolume(book.world, book.story, book.id);
    hideCompletion();
  }

  function evaluate() {
    maintainContinuousSentinel();

    if (!book || !world) {
      hideCompletion();
      return;
    }

    const atEnd = currentAtEnd();
    if (!atEnd) {
      dismissedAtEnd = false;
      wasAtEnd = false;
      hideCompletion();
      return;
    }

    if (!wasAtEnd) dismissedAtEnd = false;
    wasAtEnd = true;

    if (isBookCompleted()) {
      hideCompletion();
      return;
    }

    if (progressMode === "automatic") {
      markCompleted();
      return;
    }

    if (progressMode === "ask" && !dismissedAtEnd) {
      localize();
      completion.hidden = false;
      return;
    }

    hideCompletion();
  }

  function scheduleEvaluate() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => {
      framePending = false;
      evaluate();
    });
  }

  modeSelect.addEventListener("change", () => {
    const next = String(modeSelect.value);
    if (!allowedModes.has(next)) return;
    progressMode = next;
    dismissedAtEnd = false;
    saveMode();
    localize();
    scheduleEvaluate();
  });

  markButton.addEventListener("click", markCompleted);

  dismissButton.addEventListener("click", () => {
    dismissedAtEnd = true;
    hideCompletion();
  });

  window.addEventListener(profileApi.eventName, scheduleEvaluate);
  window.addEventListener("library-language-change", () => {
    localize();
    scheduleEvaluate();
  });
  window.addEventListener("resize", () => {
    updateContinuousFallback();
    scheduleEvaluate();
  });
  window.addEventListener("scroll", updateContinuousFallback, { passive: true });

  new MutationObserver(scheduleEvaluate).observe(nextButton, {
    attributes: true,
    attributeFilter: ["disabled"]
  });

  new MutationObserver(scheduleEvaluate).observe(positionLabel, {
    childList: true,
    characterData: true,
    subtree: true
  });

  new MutationObserver(scheduleEvaluate).observe(spread, {
    attributes: true,
    attributeFilter: ["class"]
  });

  new MutationObserver(scheduleEvaluate).observe(leftPage, {
    childList: true,
    subtree: true
  });

  async function loadManifests() {
    try {
      const bookUrl = new URL(manifestReference, window.location.href);
      const bookResponse = await fetch(bookUrl, { cache: "no-store" });
      if (!bookResponse.ok) throw new Error(`Book manifest HTTP ${bookResponse.status}`);
      book = await bookResponse.json();

      const worldUrl = new URL("../../../world.json", bookUrl);
      const worldResponse = await fetch(worldUrl, { cache: "no-store" });
      if (!worldResponse.ok) throw new Error(`World manifest HTTP ${worldResponse.status}`);
      world = await worldResponse.json();

      localize();
      scheduleEvaluate();
    } catch (error) {
      console.error("Reader progress integration could not load its public manifests", error);
      hideCompletion();
    }
  }

  localize();
  loadManifests();
})();
