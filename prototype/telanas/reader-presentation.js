(() => {
  "use strict";

  const body = document.body;
  const settings = document.querySelector("[data-reader-settings]");
  const settingsToggle = document.querySelector("[data-reader-settings-toggle]");
  const spread = document.querySelector("[data-book-spread]");
  const stage = document.querySelector(".book-stage");
  const leftPage = document.querySelector("[data-book-page='left']");
  const rightPage = document.querySelector("[data-book-page='right']");
  const previousButton = document.querySelector("[data-page-previous]");
  const nextButton = document.querySelector("[data-page-next]");
  const themeSelect = document.querySelector("select[data-reader-theme]");
  const typefaceSelect = document.querySelector("select[data-reader-typeface]");
  const fontSizeSelect = document.querySelector("select[data-reader-font-size]");
  const lineHeightSelect = document.querySelector("select[data-reader-line-height]");
  const transitionSelect = document.querySelector("select[data-reader-transition]");

  if (
    !body || !settings || !settingsToggle || !spread || !stage || !leftPage || !rightPage ||
    !previousButton || !nextButton || !themeSelect || !typefaceSelect || !fontSizeSelect ||
    !lineHeightSelect || !transitionSelect
  ) return;

  const storageKey = "library-reader-presentation-v1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideSpread = window.matchMedia("(min-width: 981px)");
  const defaults = {
    theme: "dark",
    typeface: "serif",
    fontSize: "1",
    lineHeight: "1.75",
    transition: "page-turn"
  };

  const allowed = {
    theme: new Set(["dark", "light", "parchment"]),
    typeface: new Set(["serif", "sans"]),
    fontSize: new Set(["0.9", "1", "1.1", "1.2"]),
    lineHeight: new Set(["1.5", "1.75", "2"]),
    transition: new Set(["page-turn", "fade", "none"])
  };

  const copy = {
    en: {
      settings: "Reader settings",
      theme: "Theme",
      typeface: "Typeface",
      fontSize: "Text size",
      lineHeight: "Line spacing",
      transition: "Page transition",
      themeDark: "Dark",
      themeLight: "Light",
      themeParchment: "Parchment",
      typefaceSerif: "Book serif",
      typefaceSans: "Sans serif",
      fontSmall: "Small",
      fontStandard: "Standard",
      fontLarge: "Large",
      fontExtra: "Extra large",
      lineCompact: "Compact",
      lineComfortable: "Comfortable",
      lineRelaxed: "Relaxed",
      transitionTurn: "Page turn",
      transitionFade: "Fade",
      transitionNone: "None"
    },
    de: {
      settings: "Reader-Einstellungen",
      theme: "Darstellung",
      typeface: "Schriftart",
      fontSize: "Textgröße",
      lineHeight: "Zeilenabstand",
      transition: "Seitenübergang",
      themeDark: "Dunkel",
      themeLight: "Hell",
      themeParchment: "Pergament",
      typefaceSerif: "Buch-Serifenschrift",
      typefaceSans: "Sans-Serif",
      fontSmall: "Klein",
      fontStandard: "Standard",
      fontLarge: "Groß",
      fontExtra: "Sehr groß",
      lineCompact: "Kompakt",
      lineComfortable: "Bequem",
      lineRelaxed: "Locker",
      transitionTurn: "Umblättern",
      transitionFade: "Überblenden",
      transitionNone: "Keine"
    }
  };

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const sanitize = (candidate) => {
    const next = { ...defaults };
    if (!candidate || typeof candidate !== "object") return next;
    for (const key of Object.keys(defaults)) {
      if (allowed[key].has(String(candidate[key]))) next[key] = String(candidate[key]);
    }
    return next;
  };

  const readPreferences = () => {
    try {
      return sanitize(JSON.parse(localStorage.getItem(storageKey) || "null"));
    } catch {
      return { ...defaults };
    }
  };

  let preferences = readPreferences();

  const savePreferences = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // Local persistence is optional.
    }
  };

  const setOptionText = (select, values) => {
    for (const option of select.options) {
      if (values[option.value]) option.textContent = values[option.value];
    }
  };

  const localize = () => {
    const localCopy = copy[language()];
    settingsToggle.setAttribute("aria-label", localCopy.settings);
    settingsToggle.setAttribute("title", localCopy.settings);

    const labels = {
      theme: localCopy.theme,
      typeface: localCopy.typeface,
      fontSize: localCopy.fontSize,
      lineHeight: localCopy.lineHeight,
      transition: localCopy.transition
    };
    settings.querySelectorAll("[data-reader-setting-label]").forEach((label) => {
      const key = label.dataset.readerSettingLabel;
      if (labels[key]) label.textContent = labels[key];
    });

    setOptionText(themeSelect, {
      dark: localCopy.themeDark,
      light: localCopy.themeLight,
      parchment: localCopy.themeParchment
    });
    setOptionText(typefaceSelect, {
      serif: localCopy.typefaceSerif,
      sans: localCopy.typefaceSans
    });
    setOptionText(fontSizeSelect, {
      "0.9": localCopy.fontSmall,
      "1": localCopy.fontStandard,
      "1.1": localCopy.fontLarge,
      "1.2": localCopy.fontExtra
    });
    setOptionText(lineHeightSelect, {
      "1.5": localCopy.lineCompact,
      "1.75": localCopy.lineComfortable,
      "2": localCopy.lineRelaxed
    });
    setOptionText(transitionSelect, {
      "page-turn": localCopy.transitionTurn,
      fade: localCopy.transitionFade,
      none: localCopy.transitionNone
    });
  };

  const syncControls = () => {
    themeSelect.value = preferences.theme;
    typefaceSelect.value = preferences.typeface;
    fontSizeSelect.value = preferences.fontSize;
    lineHeightSelect.value = preferences.lineHeight;
    transitionSelect.value = preferences.transition;
  };

  const applyPreferences = ({ repaginate = false } = {}) => {
    body.dataset.readerTheme = preferences.theme;
    body.dataset.readerTypeface = preferences.typeface;
    body.style.setProperty("--reader-font-scale", preferences.fontSize);
    body.style.setProperty("--reader-line-height", preferences.lineHeight);
    syncControls();

    if (repaginate) {
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
  };

  const clearTransitionOverlays = () => {
    document.querySelectorAll(".reader-transition-overlay").forEach((node) => node.remove());
  };

  const effectiveSpread = () => (
    !spread.classList.contains("single") && !spread.classList.contains("continuous") && wideSpread.matches
  );

  const transitionMode = () => reducedMotion.matches ? "none" : preferences.transition;

  const animateAndRemove = (overlay, keyframes, options) => {
    const animation = overlay.animate(keyframes, options);
    animation.finished.catch(() => undefined).finally(() => overlay.remove());
    window.setTimeout(() => overlay.remove(), (options.duration || 0) + 120);
  };

  const prepareFadeOverlay = () => {
    const stageRect = stage.getBoundingClientRect();
    const spreadRect = spread.getBoundingClientRect();
    const overlay = spread.cloneNode(true);
    overlay.classList.add("reader-transition-overlay", "reader-fade-overlay");
    overlay.setAttribute("aria-hidden", "true");
    overlay.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    Object.assign(overlay.style, {
      position: "absolute",
      left: `${spreadRect.left - stageRect.left}px`,
      top: `${spreadRect.top - stageRect.top}px`,
      width: `${spreadRect.width}px`,
      height: `${spreadRect.height}px`
    });
    stage.append(overlay);
    requestAnimationFrame(() => {
      animateAndRemove(overlay, [{ opacity: 1 }, { opacity: 0 }], {
        duration: 220,
        easing: "ease-out",
        fill: "forwards"
      });
    });
  };

  const preparePageTurnOverlay = (direction) => {
    const source = effectiveSpread() ? (direction < 0 ? leftPage : rightPage) : leftPage;
    if (!source || source.classList.contains("is-empty")) return;

    const overlay = source.cloneNode(true);
    overlay.classList.add("reader-transition-overlay", "reader-turn-overlay");
    overlay.setAttribute("aria-hidden", "true");
    overlay.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));

    const spreadRect = spread.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    Object.assign(overlay.style, {
      position: "absolute",
      left: `${sourceRect.left - spreadRect.left}px`,
      top: `${sourceRect.top - spreadRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      transformOrigin: direction < 0 ? "right center" : "left center"
    });
    spread.append(overlay);

    const finalRotation = direction < 0 ? "rotateY(178deg)" : "rotateY(-178deg)";
    requestAnimationFrame(() => {
      animateAndRemove(overlay, [
        { transform: "rotateY(0deg)", opacity: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" },
        { transform: direction < 0 ? "rotateY(84deg)" : "rotateY(-84deg)", opacity: 0.96, boxShadow: "0 18px 34px rgba(0,0,0,.28)" },
        { transform: finalRotation, opacity: 0.08, boxShadow: "0 8px 18px rgba(0,0,0,.08)" }
      ], {
        duration: 520,
        easing: "cubic-bezier(.22,.61,.36,1)",
        fill: "forwards"
      });
    });
  };

  const prepareTransition = (direction) => {
    if (spread.classList.contains("continuous")) return;
    clearTransitionOverlays();
    const mode = transitionMode();
    if (mode === "fade") prepareFadeOverlay();
    else if (mode === "page-turn") preparePageTurnOverlay(direction);
  };

  const isInteractiveTarget = (target) => (
    target instanceof Element && Boolean(
      target.closest("button, a, input, select, textarea, summary, label, [contenteditable='true']")
    )
  );

  const directionForPageClick = (event) => {
    if (spread.classList.contains("continuous") || event.button !== 0 || isInteractiveTarget(event.target)) return 0;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) return 0;

    if (effectiveSpread()) {
      if (leftPage.contains(event.target)) return -1;
      if (rightPage.contains(event.target)) return 1;
      return 0;
    }

    const rect = leftPage.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return 0;
    return event.clientX < rect.left + rect.width / 2 ? -1 : 1;
  };

  stage.addEventListener("click", (event) => {
    const direction = directionForPageClick(event);
    if (direction < 0 && !previousButton.disabled) prepareTransition(-1);
    if (direction > 0 && !nextButton.disabled) prepareTransition(1);
  }, true);

  previousButton.addEventListener("click", () => {
    if (!previousButton.disabled) prepareTransition(-1);
  }, true);

  nextButton.addEventListener("click", () => {
    if (!nextButton.disabled) prepareTransition(1);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      settings.open = false;
      return;
    }

    if (spread.classList.contains("continuous") || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
    if (event.key === "ArrowLeft" && !previousButton.disabled) prepareTransition(-1);
    if (event.key === "ArrowRight" && !nextButton.disabled) prepareTransition(1);
  }, true);

  const bindPreference = (select, key, { repaginate = false } = {}) => {
    select.addEventListener("change", () => {
      const value = String(select.value);
      if (!allowed[key].has(value)) return;
      preferences[key] = value;
      savePreferences();
      applyPreferences({ repaginate });
    });
  };

  bindPreference(themeSelect, "theme");
  bindPreference(typefaceSelect, "typeface", { repaginate: true });
  bindPreference(fontSizeSelect, "fontSize", { repaginate: true });
  bindPreference(lineHeightSelect, "lineHeight", { repaginate: true });
  bindPreference(transitionSelect, "transition");

  window.addEventListener("library-language-change", localize);
  reducedMotion.addEventListener("change", clearTransitionOverlays);

  applyPreferences();
  localize();
})();
