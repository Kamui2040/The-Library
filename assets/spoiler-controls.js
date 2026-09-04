(() => {
  "use strict";

  const profileApi = window.LibrarySpoilerProfile;
  if (!profileApi) return;

  const labels = {
    en: {
      none: "No completed volumes",
      volume01: "Through Volume 1 — Home",
      full: "Full spoilers"
    },
    de: {
      none: "Keine abgeschlossenen Bände",
      volume01: "Bis Band 1 — Zuhause",
      full: "Vollständige Spoiler"
    }
  };

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const render = () => {
    const profile = profileApi.get();
    const table = labels[language()];
    const completed = profile.worlds?.telanas?.completed?.["dragon-knight"] || "none";

    document.querySelectorAll("[data-spoiler-progress-select]").forEach((select) => {
      const none = select.querySelector("option[value='none']");
      const volumeOne = select.querySelector("option[value='volume-01']");
      if (none) none.textContent = table.none;
      if (volumeOne) volumeOne.textContent = table.volume01;
      select.value = completed;
      select.disabled = profile.fullSpoilers;
    });

    document.querySelectorAll("[data-full-spoilers-toggle]").forEach((checkbox) => {
      checkbox.checked = profile.fullSpoilers;
    });

    document.querySelectorAll("[data-spoiler-summary]").forEach((node) => {
      node.textContent = profile.fullSpoilers
        ? table.full
        : completed === "volume-01"
          ? table.volume01
          : table.none;
    });
  };

  document.querySelectorAll("[data-spoiler-progress-select]").forEach((select) => {
    select.addEventListener("change", () => {
      profileApi.setCompletedVolume("telanas", "dragon-knight", select.value);
    });
  });

  document.querySelectorAll("[data-full-spoilers-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      profileApi.setFullSpoilers(checkbox.checked);
    });
  });

  window.addEventListener(profileApi.eventName, render);
  window.addEventListener("library-language-change", render);
  render();
})();
