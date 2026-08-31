(() => {
  "use strict";

  const translations = {
    en: {
      "global.home": "Home",
      "global.android": "Android Projects",
      "global.gaming": "Gaming Mods",
      "nav.menu": "Menu",
      "nav.home": "Home",
      "nav.stories": "Stories",
      "nav.lexicon": "Lexicon",
      "nav.timeline": "Timeline",
      "nav.map": "Map",
      "nav.search": "Search",
      "nav.downloads": "Downloads",
      "nav.updates": "Updates",
      "nav.language": "Language",
      "stories.arc": "The Dragon Knight",
      "stories.volume": "Volume 1 — Home",
      "stories.overview": "Overview",
      "stories.read": "Read Volume 1",
      "stories.chapters": "Chapters",
      "chapter.prologue": "Prologue",
      "chapter.one": "Chapter 1",
      "chapter.two": "Chapter 2",
      "hero.series": "The Dragon Knight",
      "hero.description": "A quiet road into a larger world, told one volume at a time.",
      "hero.read": "Begin reading",
      "hero.explore": "Explore the story",
      "section.storyEyebrow": "Featured story",
      "section.storyTitle": "The Dragon Knight",
      "section.storyIntro": "The first Telanas story is structured as a sequence of volumes rather than one arc per book.",
      "book.current": "Current volume",
      "book.description": "Open the dedicated reader, browse the volume structure, or return later for release downloads.",
      "book.contents": "View contents",
      "section.lexiconEyebrow": "Explore Telanas",
      "section.lexiconTitle": "Lexicon",
      "section.lexiconIntro": "World information will follow the reader's selected progress so later revelations stay out of sight.",
      "spoiler.label": "Spoilers through",
      "spoiler.value": "Volume 1",
      "lexicon.characters": "Characters",
      "lexicon.places": "Places",
      "lexicon.mythology": "Mythology",
      "lexicon.history": "History",
      "section.downloadsEyebrow": "Keep a copy",
      "section.downloadsTitle": "Downloads",
      "section.downloadsIntro": "Released formats will appear here. Prototype download buttons remain disabled.",
      "downloads.note": "The web reader remains available independently of downloadable editions.",
      "downloads.archive": "Archive",
      "section.updatesEyebrow": "From the Library",
      "section.updatesTitle": "Updates",
      "updates.prototypeTitle": "The Library foundation begins",
      "updates.prototypeBody": "The first prototype focuses on the Telanas landing page and reader shell.",
      "theme.light": "Light",
      "theme.dark": "Dark"
    },
    de: {
      "global.home": "Home",
      "global.android": "Android-Projekte",
      "global.gaming": "Gaming Mods",
      "nav.menu": "Menü",
      "nav.home": "Home",
      "nav.stories": "Geschichten",
      "nav.lexicon": "Lexikon",
      "nav.timeline": "Zeitleiste",
      "nav.map": "Karte",
      "nav.search": "Suche",
      "nav.downloads": "Downloads",
      "nav.updates": "Neuigkeiten",
      "nav.language": "Sprache",
      "stories.arc": "Der Drachenritter",
      "stories.volume": "Band 1 — Zuhause",
      "stories.overview": "Übersicht",
      "stories.read": "Band 1 lesen",
      "stories.chapters": "Kapitel",
      "chapter.prologue": "Prolog",
      "chapter.one": "Kapitel 1",
      "chapter.two": "Kapitel 2",
      "hero.series": "Der Drachenritter",
      "hero.description": "Eine ruhige Straße in eine größere Welt, erzählt Band für Band.",
      "hero.read": "Lesen beginnen",
      "hero.explore": "Geschichte entdecken",
      "section.storyEyebrow": "Aktuelle Geschichte",
      "section.storyTitle": "Der Drachenritter",
      "section.storyIntro": "Die erste Telanas-Geschichte ist als Folge von Bänden aufgebaut und nicht als ein Handlungsbogen pro Band.",
      "book.current": "Aktueller Band",
      "book.description": "Öffne den eigenen Reader, sieh dir den Aufbau des Bandes an oder kehre später für Veröffentlichungsdownloads zurück.",
      "book.contents": "Inhalt ansehen",
      "section.lexiconEyebrow": "Telanas erkunden",
      "section.lexiconTitle": "Lexikon",
      "section.lexiconIntro": "Weltinformationen richten sich nach dem gewählten Lesefortschritt, damit spätere Enthüllungen unsichtbar bleiben.",
      "spoiler.label": "Spoiler bis",
      "spoiler.value": "Band 1",
      "lexicon.characters": "Charaktere",
      "lexicon.places": "Orte",
      "lexicon.mythology": "Mythologie",
      "lexicon.history": "Geschichte",
      "section.downloadsEyebrow": "Eigene Ausgabe",
      "section.downloadsTitle": "Downloads",
      "section.downloadsIntro": "Veröffentlichte Formate erscheinen hier. Die Download-Schaltflächen des Prototyps bleiben deaktiviert.",
      "downloads.note": "Der Web-Reader bleibt unabhängig von herunterladbaren Ausgaben verfügbar.",
      "downloads.archive": "Archiv",
      "section.updatesEyebrow": "Aus der Library",
      "section.updatesTitle": "Neuigkeiten",
      "updates.prototypeTitle": "Die Grundlage der Library entsteht",
      "updates.prototypeBody": "Der erste Prototyp konzentriert sich auf die Telanas-Startseite und den Reader.",
      "theme.light": "Hell",
      "theme.dark": "Dunkel"
    }
  };

  const storageGet = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const storageSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Local persistence is optional.
    }
  };

  const normalizeLanguage = (value) => String(value || "").toLowerCase().startsWith("de") ? "de" : "en";

  const ensureWorldNavigation = () => {
    document.querySelectorAll("[data-primary-nav]").forEach((nav) => {
      const lexiconLink = nav.querySelector("a[href='lexicon.html']");
      if (!lexiconLink) return;

      let timelineLink = nav.querySelector("a[href='timeline.html']");
      if (!timelineLink) {
        timelineLink = document.createElement("a");
        timelineLink.className = "nav-link";
        timelineLink.href = "timeline.html";
        timelineLink.dataset.i18n = "nav.timeline";
        timelineLink.textContent = "Timeline";
        lexiconLink.insertAdjacentElement("afterend", timelineLink);
      }

      let mapLink = nav.querySelector("a[href='map.html']");
      if (!mapLink) {
        mapLink = document.createElement("a");
        mapLink.className = "nav-link";
        mapLink.href = "map.html";
        mapLink.dataset.i18n = "nav.map";
        mapLink.textContent = "Map";
        timelineLink.insertAdjacentElement("afterend", mapLink);
      }

      if (!nav.querySelector("a[href='world-search.html']")) {
        const searchLink = document.createElement("a");
        searchLink.className = "nav-link";
        searchLink.href = "world-search.html";
        searchLink.dataset.i18n = "nav.search";
        searchLink.textContent = "Search";
        mapLink.insertAdjacentElement("afterend", searchLink);
      }
    });
  };

  const focusLinkedWorldTarget = () => {
    const page = location.pathname.split("/").pop();
    const params = new URLSearchParams(location.search);
    const config = page === "lexicon.html"
      ? { parameter: "entry", attribute: "data-lexicon-entry", datasetKey: "lexiconEntry", activate: false }
      : page === "timeline.html"
        ? { parameter: "event", attribute: "data-timeline-event", datasetKey: "timelineEvent", activate: false }
        : page === "map.html"
          ? { parameter: "marker", attribute: "data-map-marker", datasetKey: "mapMarker", activate: true }
          : null;

    if (!config) return;
    const targetId = params.get(config.parameter);
    if (!targetId) return;

    const attempt = () => {
      const target = [...document.querySelectorAll(`[${config.attribute}]`)]
        .find((node) => node.dataset[config.datasetKey] === targetId);
      if (!target) return false;
      if (config.activate && target instanceof HTMLButtonElement) target.click();
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      target.scrollIntoView({ block: "center", behavior });
      target.focus({ preventScroll: true });
      return true;
    };

    if (attempt()) return;
    const observer = new MutationObserver(() => {
      if (attempt()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 5000);
  };

  const translate = (language) => {
    const lang = normalizeLanguage(language);
    const table = translations[lang];
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (table[key]) node.textContent = table[key];
    });

    document.querySelectorAll("[data-language-select]").forEach((select) => {
      select.value = lang;
    });

    storageSet("library-language", lang);
    window.dispatchEvent(new CustomEvent("library-language-change", { detail: { language: lang } }));
  };

  const setTheme = (theme) => {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = next;

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const isLight = next === "light";
      button.setAttribute("aria-pressed", String(isLight));
      const icon = button.querySelector("[data-theme-icon]");
      const label = button.querySelector("[data-theme-label]");
      if (icon) icon.textContent = isLight ? "☀" : "☾";
      if (label) label.dataset.i18n = isLight ? "theme.dark" : "theme.light";
    });

    storageSet("library-theme", next);
    translate(document.documentElement.lang);
  };

  ensureWorldNavigation();
  focusLinkedWorldTarget();

  document.querySelectorAll("[data-language-select]").forEach((select) => {
    select.addEventListener("change", () => translate(select.value));
  });

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
    });
  });

  const mobileButton = document.querySelector("[data-mobile-menu]");
  const primaryNav = document.querySelector("[data-primary-nav]");
  if (mobileButton && primaryNav) {
    mobileButton.addEventListener("click", () => {
      const open = !primaryNav.classList.contains("is-open");
      primaryNav.classList.toggle("is-open", open);
      mobileButton.setAttribute("aria-expanded", String(open));
    });
  }

  document.addEventListener("click", (event) => {
    document.querySelectorAll("details.menu-popover[open]").forEach((details) => {
      if (!details.contains(event.target)) details.removeAttribute("open");
    });
  });

  const initialLanguage = normalizeLanguage(storageGet("library-language") || navigator.language);
  const initialTheme = storageGet("library-theme") === "light" ? "light" : "dark";
  translate(initialLanguage);
  setTheme(initialTheme);
})();
