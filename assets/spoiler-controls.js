(() => {
  "use strict";

  const body = document.body;
  const profileApi = window.LibrarySpoilerProfile;
  if (!body || !profileApi) return;

  const selects = [...document.querySelectorAll(
    "[data-spoiler-progress-select]"
  )];
  const fullToggles = [...document.querySelectorAll(
    "[data-full-spoilers-toggle]"
  )];

  const worldManifestReference =
    body.dataset.spoilerWorldManifest ||
    body.dataset.worldManifest;
  const storyId = body.dataset.spoilerStory || "dragon-knight";

  const copy = {
    en: {
      none: "No completed chapters",
      full: "Full spoilers",
      loading: "Loading chapters…",
      through: (volume, chapter) => `Through ${volume} · ${chapter}`
    },
    de: {
      none: "Keine abgeschlossenen Kapitel",
      full: "Vollständige Spoiler",
      loading: "Kapitel werden geladen…",
      through: (volume, chapter) => `Bis ${volume} · ${chapter}`
    }
  };

  let world = null;
  let story = null;
  let books = [];
  let progressEntries = [];

  const language = () =>
    document.documentElement.lang === "de" ? "de" : "en";

  const table = () => copy[language()];

  const bookLabel = (record) => (
    record.manifest.labels?.[language()]?.volume ||
    record.manifest.labels?.en?.volume ||
    record.ref.id
  );

  const chapterLabel = (record, chapter) => (
    chapter.labels?.[language()] ||
    chapter.labels?.en ||
    chapter.id
  );

  const optionValue = (book, chapter) =>
    `${book}::${chapter}`;

  const rebuildEntries = () => {
    progressEntries = [];

    for (const record of books) {
      for (const chapter of record.manifest.chapters || []) {
        progressEntries.push({
          bookId: record.ref.id,
          chapterId: chapter.id,
          value: optionValue(record.ref.id, chapter.id),
          bookLabel: bookLabel(record),
          chapterLabel: chapterLabel(record, chapter)
        });
      }
    }
  };

  const populateSelect = (select) => {
    const none = document.createElement("option");
    none.value = "none";
    none.textContent = table().none;

    select.replaceChildren(none);

    for (const record of books) {
      const group = document.createElement("optgroup");
      group.label = bookLabel(record);

      for (const chapter of record.manifest.chapters || []) {
        const option = document.createElement("option");
        option.value = optionValue(record.ref.id, chapter.id);
        option.textContent = chapterLabel(record, chapter);
        group.append(option);
      }

      select.append(group);
    }
  };

  const selectedEntry = (profile) => {
    let selected = null;

    for (const entry of progressEntries) {
      if (
        profileApi.hasCompletedChapter(
          profile,
          world?.id,
          storyId,
          entry.bookId,
          entry.chapterId
        )
      ) {
        selected = entry;
      }
    }

    return selected;
  };

  const completedThrough = (target) => {
    const completed = {};

    for (const entry of progressEntries) {
      completed[entry.bookId] ||= [];
      completed[entry.bookId].push(entry.chapterId);
      if (entry.value === target.value) break;
    }

    return completed;
  };

  const render = () => {
    const profile = profileApi.get();
    const selected = world ? selectedEntry(profile) : null;

    for (const select of selects) {
      select.value = selected?.value || "none";
      select.disabled = profile.fullSpoilers || !world;
    }

    for (const checkbox of fullToggles) {
      checkbox.checked = profile.fullSpoilers;
    }

    document.querySelectorAll("[data-spoiler-summary]")
      .forEach((node) => {
        node.textContent = profile.fullSpoilers
          ? table().full
          : selected
            ? table().through(
                selected.bookLabel,
                selected.chapterLabel
              )
            : table().none;
      });
  };

  for (const select of selects) {
    select.disabled = true;

    select.addEventListener("change", () => {
      if (!world || !story) return;

      if (select.value === "none") {
        profileApi.setStoryCompletedChapters(
          world.id,
          storyId,
          {}
        );
        return;
      }

      const target = progressEntries.find(
        (entry) => entry.value === select.value
      );
      if (!target) return;

      profileApi.setStoryCompletedChapters(
        world.id,
        storyId,
        completedThrough(target)
      );
    });
  }

  for (const checkbox of fullToggles) {
    checkbox.addEventListener("change", () => {
      profileApi.setFullSpoilers(checkbox.checked);
    });
  }

  window.addEventListener(profileApi.eventName, render);

  window.addEventListener("library-language-change", () => {
    if (world) {
      rebuildEntries();
      for (const select of selects) populateSelect(select);
    }
    render();
  });

  const load = async () => {
    if (!worldManifestReference) {
      console.error(
        "Spoiler controls are missing a world manifest reference"
      );
      render();
      return;
    }

    try {
      for (const select of selects) {
        select.replaceChildren(
          Object.assign(document.createElement("option"), {
            value: "none",
            textContent: table().loading
          })
        );
      }

      const worldUrl = new URL(
        worldManifestReference,
        window.location.href
      );
      const worldResponse = await fetch(worldUrl, {
        cache: "no-store"
      });
      if (!worldResponse.ok) {
        throw new Error(
          `Spoiler world manifest HTTP ${worldResponse.status}`
        );
      }

      world = await worldResponse.json();
      story = (world.stories || []).find(
        (candidate) => candidate.id === storyId
      );
      if (!story) {
        throw new Error(`Unknown spoiler story: ${storyId}`);
      }

      books = await Promise.all(
        (story.books || []).map(async (ref) => {
          const response = await fetch(
            new URL(ref.manifest, worldUrl),
            { cache: "no-store" }
          );

          if (!response.ok) {
            throw new Error(
              `Spoiler book manifest HTTP ${response.status}: ${ref.id}`
            );
          }

          return {
            ref,
            manifest: await response.json()
          };
        })
      );

      rebuildEntries();
      for (const select of selects) populateSelect(select);
      render();
    } catch (error) {
      console.error(
        "Spoiler progress controls could not load manifests",
        error
      );
      world = null;
      story = null;
      books = [];
      progressEntries = [];
      render();
    }
  };

  render();
  load();
})();
