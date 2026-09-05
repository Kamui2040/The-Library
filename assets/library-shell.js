(() => {
  "use strict";

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

  const locale = document.documentElement.lang === "de" ? "de" : "en";
  const themeLabels = {
    en: { light: "Light", dark: "Dark" },
    de: { light: "Hell", dark: "Dunkel" }
  };

  const setTheme = (theme) => {
    const next = theme === "light" ? "light" : "dark";
    const isLight = next === "light";
    document.documentElement.dataset.theme = next;

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(isLight));
      const icon = button.querySelector("[data-theme-icon]");
      const label = button.querySelector("[data-theme-label]");
      if (icon) icon.textContent = isLight ? "☀" : "☾";
      if (label) label.textContent = isLight ? themeLabels[locale].dark : themeLabels[locale].light;
    });

    storageSet("library-theme", next);
  };

  storageSet("library-language", locale);
  document.querySelectorAll("[data-language-select]").forEach((select) => {
    select.value = locale;
    select.addEventListener("change", () => {
      const next = select.value === "de" ? "de" : "en";
      if (next === locale) return;
      const alternate = document.querySelector(`link[rel='alternate'][hreflang='${next}']`);
      if (!alternate) return;

      const destination = new URL(alternate.getAttribute("href"), window.location.href);
      destination.search = window.location.search;
      destination.hash = window.location.hash;
      storageSet("library-language", next);
      window.location.assign(destination);
    });
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

  setTheme(storageGet("library-theme") === "light" ? "light" : "dark");
  window.dispatchEvent(new CustomEvent("library-language-change", { detail: { language: locale } }));
})();
