(() => {
  "use strict";

  const body = document.body;
  const settings = document.querySelector("[data-reader-settings]");
  const settingsToggle = document.querySelector("[data-reader-settings-toggle]");
  const spread = document.querySelector("[data-book-spread]");
  const stage = document.querySelector(".book-stage");
  const previousButton = document.querySelector("[data-page-previous]");
  const nextButton = document.querySelector("[data-page-next]");
  const themeSelect = document.querySelector("select[data-reader-theme]");
  const typefaceSelect = document.querySelector("select[data-reader-typeface]");
  const fontSizeSelect = document.querySelector("select[data-reader-font-size]");
  const lineHeightSelect = document.querySelector("select[data-reader-line-height]");
  const transitionSelect = document.querySelector("select[data-reader-transition]");

  if (
    !body || !settings || !settingsToggle || !spread || !stage || !previousButton || !nextButton ||
    !themeSelect || !typefaceSelect || !fontSizeSelect || !lineHeightSelect || !transitionSelect
  ) return;

  const storageKey = "library-reader-presentation-v1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const defaults = {
    theme: "dark",
    typeface: "serif",
    fontSize: "1",
    lineHeight: "1.75",
    transition: "none"
  };

  const allowed = {
    theme: new Set(["dark", "light", "parchment"]),
    typeface: new Set(["serif", "sans"]),
    fontSize: new Set(["0.9", "1", "1.1", "1.2"]),
    lineHeight: new Set(["1.5", "1.75", "2"]),
    transition: new Set(["fade", "none"])
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

  const prepareFadeOverlay = () => {
    if (reducedMotion.matches || preferences.transition !== "fade" || spread.classList.contains("continuous")) return;

    clearTransitionOverlays();
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
      const animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 220,
        easing: "ease-out",
        fill: "forwards"
      });
      animation.finished.catch(() => undefined).finally(() => overlay.remove());
      window.setTimeout(() => overlay.remove(), 340);
    });
  };

  const isInteractiveTarget = (target) => (
    target instanceof Element && Boolean(
      target.closest("button, a, input, select, textarea, summary, label, [contenteditable='true']")
    )
  );

  const pageClickCanTurn = (event) => {
    if (spread.classList.contains("continuous") || event.button !== 0 || isInteractiveTarget(event.target)) return false;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) return false;

    const pages = [...spread.querySelectorAll("[data-book-page]")];
    const clickedPage = pages.find((page) => page.contains(event.target));
    if (clickedPage) {
      if (clickedPage.dataset.bookPage === "left") return !previousButton.disabled;
      if (clickedPage.dataset.bookPage === "right") return !nextButton.disabled;
    }

    const visiblePage = pages[0];
    if (!visiblePage) return false;
    const rect = visiblePage.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return false;
    return event.clientX < rect.left + rect.width / 2 ? !previousButton.disabled : !nextButton.disabled;
  };

  stage.addEventListener("click", (event) => {
    if (pageClickCanTurn(event)) prepareFadeOverlay();
  }, true);

  previousButton.addEventListener("click", () => {
    if (!previousButton.disabled) prepareFadeOverlay();
  }, true);

  nextButton.addEventListener("click", () => {
    if (!nextButton.disabled) prepareFadeOverlay();
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      settings.open = false;
      return;
    }

    if (spread.classList.contains("continuous") || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
    if (event.key === "ArrowLeft" && !previousButton.disabled) prepareFadeOverlay();
    if (event.key === "ArrowRight" && !nextButton.disabled) prepareFadeOverlay();
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
