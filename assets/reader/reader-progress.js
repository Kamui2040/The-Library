(() => {
  "use strict";

  const profileApi = window.LibrarySpoilerProfile;
  const body = document.body;
  const spread = document.querySelector("[data-book-spread]");
  const leftPage = document.querySelector("[data-book-page='left']");
  const nextButton = document.querySelector("[data-page-next]");
  const positionLabel = document.querySelector("[data-reader-position]");
  const modeSelect = document.querySelector("[data-reader-progress-mode]");
  const settingLabel = document.querySelector(
    "[data-reader-progress-setting-label]"
  );
  const completion = document.querySelector(
    "[data-reader-completion]"
  );
  const completionEyebrow = document.querySelector(
    "[data-reader-completion-eyebrow]"
  );
  const completionTitle = document.querySelector(
    "[data-reader-completion-title]"
  );
  const completionText = document.querySelector(
    "[data-reader-completion-text]"
  );
  const markButton = document.querySelector(
    "[data-reader-mark-complete]"
  );
  const dismissButton = document.querySelector(
    "[data-reader-dismiss-completion]"
  );
  const lexiconLink = document.querySelector(
    "[data-reader-completion-lexicon]"
  );
  const manifestReference = body?.dataset.readerBookManifest;

  if (
    !profileApi ||
    !body ||
    !spread ||
    !leftPage ||
    !nextButton ||
    !positionLabel ||
    !modeSelect ||
    !settingLabel ||
    !completion ||
    !completionEyebrow ||
    !completionTitle ||
    !completionText ||
    !markButton ||
    !dismissButton ||
    !lexiconLink ||
    !manifestReference
  ) return;

  const modeStorageKey = "library-reader-progress-mode-v1";
  const allowedModes = new Set([
    "ask",
    "automatic",
    "manual"
  ]);

  const copy = {
    en: {
      setting: "Spoiler progress",
      ask: "Ask when a chapter ends",
      automatic: "Update automatically",
      manual: "Manual in Lexicon",
      eyebrow: "Reading progress",
      title: "Mark this chapter as finished?",
      text: (chapter, volume) =>
        `You reached the end of ${chapter} in ${volume}. ` +
        "Mark it as finished to unlock only the information " +
        "revealed through this chapter.",
      mark: "Mark chapter finished",
      dismiss: "Not now",
      lexicon: "Open Lexicon"
    },
    de: {
      setting: "Spoiler-Fortschritt",
      ask: "Am Kapitelende nachfragen",
      automatic: "Automatisch aktualisieren",
      manual: "Manuell im Lexikon",
      eyebrow: "Lesefortschritt",
      title: "Dieses Kapitel als abgeschlossen markieren?",
      text: (chapter, volume) =>
        `Du hast das Ende von ${chapter} in ${volume} erreicht. ` +
        "Markiere das Kapitel als abgeschlossen, um nur die bis " +
        "hier enthüllten Informationen freizuschalten.",
      mark: "Kapitel abschließen",
      dismiss: "Nicht jetzt",
      lexicon: "Lexikon öffnen"
    }
  };

  let book = null;
  let world = null;
  let storyModels = [];
  let progressMode = readMode();

  let continuousAtEnd = false;
  let continuousBoundaryIndex = -1;
  let sentinel = null;
  let observedSentinel = null;
  let sentinelObserver = null;
  let chapterObserver = null;
  let observedChapterSignature = "";

  let pendingChapterIndex = -1;
  const dismissedChapters = new Set();
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
    const option = modeSelect.querySelector(
      `option[value='${value}']`
    );
    if (option) option.textContent = text;
  }

  function volumeLabel() {
    const labels =
      book?.labels?.[language()] ||
      book?.labels?.en;
    return labels?.volume ||
      (language() === "de" ? "diesem Band" : "this volume");
  }

  function chapterLabel(index) {
    const chapter = book?.chapters?.[index];
    if (!chapter) {
      return language() === "de"
        ? "diesem Kapitel"
        : "this chapter";
    }

    return (
      chapter.labels?.[language()] ||
      chapter.labels?.en ||
      chapter.id
    );
  }

  function pendingKey(index) {
    const chapter = book?.chapters?.[index];
    return chapter && book
      ? `${book.id}/${chapter.id}`
      : "";
  }

  function localize() {
    const table = copy[language()];

    settingLabel.textContent = table.setting;
    setOptionText("ask", table.ask);
    setOptionText("automatic", table.automatic);
    setOptionText("manual", table.manual);

    completionEyebrow.textContent = table.eyebrow;
    completionTitle.textContent = table.title;
    completionText.textContent = table.text(
      chapterLabel(pendingChapterIndex),
      volumeLabel()
    );
    markButton.textContent = table.mark;
    dismissButton.textContent = table.dismiss;
    lexiconLink.textContent = table.lexicon;
    modeSelect.value = progressMode;
  }

  function readerHasContent() {
    return Boolean(
      leftPage.querySelector("[data-reader-anchor]")
    );
  }

  function chapterIndex(chapterId) {
    return (book?.chapters || []).findIndex(
      (chapter) => chapter.id === chapterId
    );
  }

  function isChapterCompleted(index) {
    const chapter = book?.chapters?.[index];
    if (!chapter || !book) return false;

    return profileApi.hasCompletedChapter(
      profileApi.get(),
      book.world,
      book.story,
      book.id,
      chapter.id
    );
  }

  function progressThrough(index) {
    const completed = {};
    const currentBookIndex = storyModels.findIndex(
      (record) => record.manifest.id === book?.id
    );

    if (currentBookIndex < 0) return completed;

    for (
      let bookIndex = 0;
      bookIndex <= currentBookIndex;
      bookIndex += 1
    ) {
      const record = storyModels[bookIndex];
      const chapters = record.manifest.chapters || [];

      if (bookIndex < currentBookIndex) {
        completed[record.manifest.id] = chapters.map(
          (chapter) => chapter.id
        );
        continue;
      }

      completed[record.manifest.id] = chapters
        .slice(0, index + 1)
        .map((chapter) => chapter.id);
    }

    return completed;
  }

  function markThrough(index) {
    if (!book || !world || index < 0) return;

    profileApi.markStoryCompletedChapters(
      book.world,
      book.story,
      progressThrough(index)
    );
  }

  function disconnectSentinelObserver() {
    if (sentinelObserver) sentinelObserver.disconnect();
    sentinelObserver = null;
    observedSentinel = null;
  }

  function disconnectChapterObserver() {
    if (chapterObserver) chapterObserver.disconnect();
    chapterObserver = null;
    observedChapterSignature = "";
  }

  function updateContinuousFallback() {
    if (!spread.classList.contains("continuous")) return;

    if (sentinel) {
      const rect = sentinel.getBoundingClientRect();
      const reachedStoryEnd = rect.top <= window.innerHeight;

      if (reachedStoryEnd && !continuousAtEnd) {
        continuousAtEnd = true;
        scheduleEvaluate();
      }
    }

    let furthestTitle = -1;
    leftPage
      .querySelectorAll(
        ".reader-chapter-title[data-chapter-id]"
      )
      .forEach((node) => {
        const index = chapterIndex(node.dataset.chapterId);
        const rect = node.getBoundingClientRect();

        if (
          index >= 0 &&
          rect.top <= window.innerHeight * 0.22
        ) {
          furthestTitle = Math.max(
            furthestTitle,
            index
          );
        }
      });

    if (furthestTitle > 0) {
      const boundary = furthestTitle - 1;
      if (boundary > continuousBoundaryIndex) {
        continuousBoundaryIndex = boundary;
        scheduleEvaluate();
      }
    }
  }

  function observeSentinel(nextSentinel) {
    if (observedSentinel === nextSentinel) return;

    disconnectSentinelObserver();
    observedSentinel = nextSentinel;

    if (!("IntersectionObserver" in window)) {
      updateContinuousFallback();
      return;
    }

    sentinelObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries.find(
          (candidate) =>
            candidate.target === observedSentinel
        );
        const reachedStoryEnd = Boolean(entry?.isIntersecting);

        if (!reachedStoryEnd || continuousAtEnd) return;
        continuousAtEnd = true;
        scheduleEvaluate();
      },
      {
        root: null,
        rootMargin: "0px 0px -4% 0px",
        threshold: 0
      }
    );

    sentinelObserver.observe(nextSentinel);
    updateContinuousFallback();
  }

  function maintainContinuousSentinel() {
    if (
      !spread.classList.contains("continuous") ||
      !leftPage.classList.contains("continuous-page")
    ) {
      const stale = leftPage.querySelector(
        "[data-reader-progress-end]"
      );
      if (stale) stale.remove();

      disconnectSentinelObserver();
      sentinel = null;
      continuousAtEnd = false;
      return;
    }

    sentinel = leftPage.querySelector(
      "[data-reader-progress-end]"
    );

    if (!sentinel) {
      sentinel = document.createElement("span");
      sentinel.className =
        "reader-progress-end-sentinel";
      sentinel.dataset.readerProgressEnd = "";
      sentinel.setAttribute("aria-hidden", "true");
      leftPage.append(sentinel);
    }

    observeSentinel(sentinel);
  }

  function maintainContinuousChapterObserver() {
    if (
      !spread.classList.contains("continuous") ||
      !book
    ) {
      disconnectChapterObserver();
      return;
    }

    const nodes = [
      ...leftPage.querySelectorAll(
        ".reader-chapter-title[data-chapter-id]"
      )
    ];

    const signature = nodes
      .map((node) => node.dataset.chapterId)
      .join("|");

    if (
      signature &&
      signature === observedChapterSignature
    ) return;

    disconnectChapterObserver();
    observedChapterSignature = signature;

    if (!signature) return;

    if (!("IntersectionObserver" in window)) {
      updateContinuousFallback();
      return;
    }

    chapterObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const index = chapterIndex(
            entry.target.dataset.chapterId
          );

          if (index <= 0) continue;

          const boundary = index - 1;
          if (boundary > continuousBoundaryIndex) {
            continuousBoundaryIndex = boundary;
          }
        }

        scheduleEvaluate();
      },
      {
        root: null,
        rootMargin: "-8% 0px -70% 0px",
        threshold: 0
      }
    );

    nodes.forEach((node) =>
      chapterObserver.observe(node)
    );
  }

  function pagedBoundaryIndex() {
    const backMatterVisible = spread.querySelector(
      ".book-page:not(.pagination-probe)[data-reader-section-kind='back-matter']"
    );
    if (backMatterVisible && (book?.chapters || []).length > 0) {
      return book.chapters.length - 1;
    }

    let furthest = -1;

    spread
      .querySelectorAll(
        ".book-page:not(.pagination-probe) " +
        "[data-chapter-id]"
      )
      .forEach((node) => {
        furthest = Math.max(
          furthest,
          chapterIndex(node.dataset.chapterId)
        );
      });

    if (furthest < 0) return -1;

    if (nextButton.disabled) return furthest;
    return furthest > 0 ? furthest - 1 : -1;
  }

  function candidateIndex() {
    if (!book) return -1;

    if (spread.classList.contains("continuous")) {
      if (
        continuousAtEnd &&
        (book.chapters || []).length > 0
      ) {
        return book.chapters.length - 1;
      }

      return continuousBoundaryIndex;
    }

    return pagedBoundaryIndex();
  }

  function hideCompletion() {
    completion.hidden = true;
    pendingChapterIndex = -1;
  }

  function showCompletion(index) {
    pendingChapterIndex = index;
    localize();
    completion.hidden = false;
  }

  function evaluate() {
    maintainContinuousSentinel();
    maintainContinuousChapterObserver();

    if (
      !book ||
      !world ||
      !readerHasContent() ||
      progressMode === "manual"
    ) {
      hideCompletion();
      return;
    }

    const index = candidateIndex();
    if (index < 0 || isChapterCompleted(index)) {
      hideCompletion();
      return;
    }

    if (progressMode === "automatic") {
      markThrough(index);
      hideCompletion();
      return;
    }

    const key = pendingKey(index);
    if (
      progressMode === "ask" &&
      key &&
      !dismissedChapters.has(key)
    ) {
      showCompletion(index);
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
    dismissedChapters.clear();
    saveMode();
    localize();
    scheduleEvaluate();
  });

  markButton.addEventListener("click", () => {
    if (pendingChapterIndex >= 0) {
      markThrough(pendingChapterIndex);
    }
    hideCompletion();
  });

  dismissButton.addEventListener("click", () => {
    const key = pendingKey(pendingChapterIndex);
    if (key) dismissedChapters.add(key);
    hideCompletion();
  });

  window.addEventListener(
    profileApi.eventName,
    scheduleEvaluate
  );

  window.addEventListener(
    "library-language-change",
    () => {
      localize();
      scheduleEvaluate();
    }
  );

  window.addEventListener("resize", () => {
    updateContinuousFallback();
    scheduleEvaluate();
  });

  window.addEventListener(
    "scroll",
    updateContinuousFallback,
    { passive: true }
  );

  new MutationObserver(scheduleEvaluate).observe(
    nextButton,
    {
      attributes: true,
      attributeFilter: ["disabled"]
    }
  );

  new MutationObserver(scheduleEvaluate).observe(
    positionLabel,
    {
      childList: true,
      characterData: true,
      subtree: true
    }
  );

  new MutationObserver(scheduleEvaluate).observe(
    spread,
    {
      attributes: true,
      attributeFilter: ["class"]
    }
  );

  new MutationObserver(scheduleEvaluate).observe(
    leftPage,
    {
      childList: true,
      subtree: true
    }
  );

  async function loadManifests() {
    try {
      const bookUrl = new URL(
        manifestReference,
        window.location.href
      );

      const bookResponse = await fetch(bookUrl, {
        cache: "no-store"
      });
      if (!bookResponse.ok) {
        throw new Error(
          `Book manifest HTTP ${bookResponse.status}`
        );
      }
      book = await bookResponse.json();

      const worldUrl = new URL(
        "../../../world.json",
        bookUrl
      );
      const worldResponse = await fetch(worldUrl, {
        cache: "no-store"
      });
      if (!worldResponse.ok) {
        throw new Error(
          `World manifest HTTP ${worldResponse.status}`
        );
      }
      world = await worldResponse.json();

      const story = (world.stories || []).find(
        (candidate) => candidate.id === book.story
      );
      if (!story) {
        throw new Error(
          `Reader progress story missing: ${book.story}`
        );
      }

      storyModels = await Promise.all(
        (story.books || []).map(async (ref) => {
          if (ref.id === book.id) {
            return { ref, manifest: book };
          }

          const response = await fetch(
            new URL(ref.manifest, worldUrl),
            { cache: "no-store" }
          );
          if (!response.ok) {
            throw new Error(
              `Reader progress book HTTP ` +
              `${response.status}: ${ref.id}`
            );
          }

          return {
            ref,
            manifest: await response.json()
          };
        })
      );

      localize();
      scheduleEvaluate();
    } catch (error) {
      console.error(
        "Reader progress integration could not load its manifests",
        error
      );
      book = null;
      world = null;
      storyModels = [];
      hideCompletion();
    }
  }

  localize();
  loadManifests();
})();
