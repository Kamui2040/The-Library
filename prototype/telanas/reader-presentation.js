(() => {
  "use strict";

  const body = document.body;
  const settings = document.querySelector("[data-reader-settings]");
  const settingsToggle = document.querySelector("[data-reader-settings-toggle]");
  const themeSelect = document.querySelector("select[data-reader-theme]");
  const typefaceSelect = document.querySelector("select[data-reader-typeface]");
  const fontSizeSelect = document.querySelector("select[data-reader-font-size]");
  const lineHeightSelect = document.querySelector("select[data-reader-line-height]");

  if (
    !body || !settings || !settingsToggle || !themeSelect || !typefaceSelect ||
    !fontSizeSelect || !lineHeightSelect
  ) return;

  const storageKey = "library-reader-presentation-v1";
  const defaults = {
    theme: "dark",
    typeface: "serif",
    fontSize: "1",
    lineHeight: "1.75"
  };

  const allowed = {
    theme: new Set(["dark", "light", "parchment"]),
    typeface: new Set(["serif", "sans"]),
    fontSize: new Set(["0.9", "1", "1.1", "1.2"]),
    lineHeight: new Set(["1.5", "1.75", "2"])
  };

  const copy = {
    en: {
      settings: "Reader settings",
      theme: "Theme",
      typeface: "Typeface",
      fontSize: "Text size",
      lineHeight: "Line spacing",
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
      lineRelaxed: "Relaxed"
    },
    de: {
      settings: "Reader-Einstellungen",
      theme: "Darstellung",
      typeface: "Schriftart",
      fontSize: "Textgröße",
      lineHeight: "Zeilenabstand",
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
      lineRelaxed: "Locker"
    }
  };

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const sanitize = (candidate) => {
    const next = { ...defaults };
    if (!candidate || typeof candidate !== "object") return next;

    for (const key of Object.keys(defaults)) {
      const value = String(candidate[key]);
      if (allowed[key].has(value)) next[key] = value;
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
      const text = values[option.value];
      if (text) option.textContent = text;
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
      lineHeight: localCopy.lineHeight
    };

    settings.querySelectorAll("[data-reader-setting-label]").forEach((label) => {
      const text = labels[label.dataset.readerSettingLabel];
      if (text) label.textContent = text;
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
  };

  const syncControls = () => {
    themeSelect.value = preferences.theme;
    typefaceSelect.value = preferences.typeface;
    fontSizeSelect.value = preferences.fontSize;
    lineHeightSelect.value = preferences.lineHeight;
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

  const bindPreference = (select, key, { repaginate = false } = {}) => {
    select.addEventListener("change", () => {
      const value = String(select.value);
      if (!allowed[key].has(value)) return;

      preferences = { ...preferences, [key]: value };
      savePreferences();
      applyPreferences({ repaginate });
    });
  };

  bindPreference(themeSelect, "theme");
  bindPreference(typefaceSelect, "typeface", { repaginate: true });
  bindPreference(fontSizeSelect, "fontSize", { repaginate: true });
  bindPreference(lineHeightSelect, "lineHeight", { repaginate: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") settings.open = false;
  });

  window.addEventListener("library-language-change", localize);

  applyPreferences();
  localize();
})();
