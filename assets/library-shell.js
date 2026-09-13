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

  const setPrimaryNavOpen = (open) => {
    if (!mobileButton || !primaryNav) return;
    primaryNav.classList.toggle("is-open", open);
    mobileButton.setAttribute("aria-expanded", String(open));
  };

  if (mobileButton && primaryNav) {
    mobileButton.addEventListener("click", () => {
      const open = !primaryNav.classList.contains("is-open");
      if (open) {
        document.querySelectorAll("details.menu-popover[open]").forEach((details) => {
          details.removeAttribute("open");
        });
      }
      setPrimaryNavOpen(open);
    });

    primaryNav.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        setPrimaryNavOpen(false);
      }
    });

    window.matchMedia("(max-width: 1199px)").addEventListener("change", (event) => {
      if (!event.matches) setPrimaryNavOpen(false);
    });
  }

  document.querySelectorAll("details.menu-popover").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      document.querySelectorAll("details.menu-popover[open]").forEach((other) => {
        if (other !== details) other.removeAttribute("open");
      });
      if (!primaryNav || !primaryNav.contains(details)) setPrimaryNavOpen(false);
    });
  });

  document.addEventListener("click", (event) => {
    document.querySelectorAll("details.menu-popover[open]").forEach((details) => {
      if (!details.contains(event.target)) details.removeAttribute("open");
    });

    if (
      primaryNav?.classList.contains("is-open") &&
      !primaryNav.contains(event.target) &&
      !mobileButton?.contains(event.target)
    ) {
      setPrimaryNavOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const openMenus = [...document.querySelectorAll("details.menu-popover[open]")];
    const openMenu = openMenus.at(-1);
    if (openMenu) {
      openMenu.removeAttribute("open");
      openMenu.querySelector(":scope > summary")?.focus();
      event.preventDefault();
      return;
    }

    if (primaryNav?.classList.contains("is-open")) {
      setPrimaryNavOpen(false);
      mobileButton?.focus();
      event.preventDefault();
    }
  });

  setTheme(storageGet("library-theme") === "light" ? "light" : "dark");
  window.dispatchEvent(new CustomEvent("library-language-change", { detail: { language: locale } }));
})();
