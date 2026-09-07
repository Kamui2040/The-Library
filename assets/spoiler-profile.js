(() => {
  "use strict";

  const storageKey = "library-spoiler-profile-v3";
  const legacyStorageKeys = [
    "library-spoiler-profile-v2",
    "library-spoiler-profile-v1"
  ];
  const eventName = "library-spoiler-profile-change";

  // v1/v2 existed while only this released volume could be marked complete.
  // This is a one-time deterministic migration from the former volume model.
  const legacyCompletionModel = {
    telanas: {
      "dragon-knight": [
        {
          id: "volume-01",
          chapters: [
            "dk-v01-prologue",
            "dk-v01-ch01",
            "dk-v01-ch02",
            "dk-v01-ch03",
            "dk-v01-ch04",
            "dk-v01-ch05",
            "dk-v01-ch06",
            "dk-v01-ch07",
            "dk-v01-ch08",
            "dk-v01-ch09"
          ]
        }
      ]
    }
  };

  const defaultProfile = () => ({
    version: 3,
    fullSpoilers: false,
    worlds: {
      telanas: {
        completedChapters: {},
        reached: {}
      }
    }
  });

  const normalizeReached = (value) => {
    const reached = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return reached;

    for (const [storyId, storyValue] of Object.entries(value)) {
      if (!storyValue || typeof storyValue !== "object" || Array.isArray(storyValue)) continue;
      const books = {};

      for (const [bookId, anchorsValue] of Object.entries(storyValue)) {
        if (!Array.isArray(anchorsValue)) continue;
        const anchors = [...new Set(
          anchorsValue.filter((anchor) => typeof anchor === "string" && anchor)
        )];
        if (anchors.length > 0) books[bookId] = anchors;
      }

      if (Object.keys(books).length > 0) reached[storyId] = books;
    }

    return reached;
  };

  const normalizeCompletedChapters = (value) => {
    const completed = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return completed;

    for (const [storyId, storyValue] of Object.entries(value)) {
      if (!storyValue || typeof storyValue !== "object" || Array.isArray(storyValue)) continue;
      const books = {};

      for (const [bookId, chaptersValue] of Object.entries(storyValue)) {
        if (!Array.isArray(chaptersValue)) continue;
        const chapters = [...new Set(
          chaptersValue.filter((chapter) => typeof chapter === "string" && chapter)
        )];
        if (chapters.length > 0) books[bookId] = chapters;
      }

      if (Object.keys(books).length > 0) completed[storyId] = books;
    }

    return completed;
  };

  const migrateLegacyCompleted = (worldId, worldValue, completedChapters) => {
    const legacy = worldValue?.completed;
    if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) return;

    for (const [storyId, completedBookId] of Object.entries(legacy)) {
      if (typeof completedBookId !== "string" || completedBookId === "none") continue;

      const books = legacyCompletionModel?.[worldId]?.[storyId];
      if (!Array.isArray(books)) continue;

      const targetIndex = books.findIndex((book) => book.id === completedBookId);
      if (targetIndex < 0) continue;

      completedChapters[storyId] ||= {};
      for (let index = 0; index <= targetIndex; index += 1) {
        completedChapters[storyId][books[index].id] = [...books[index].chapters];
      }
    }
  };

  const normalize = (value) => {
    const normalized = {
      version: 3,
      fullSpoilers: value?.fullSpoilers === true,
      worlds: {}
    };

    if (value?.worlds && typeof value.worlds === "object" && !Array.isArray(value.worlds)) {
      for (const [worldId, worldValue] of Object.entries(value.worlds)) {
        if (!worldValue || typeof worldValue !== "object" || Array.isArray(worldValue)) continue;

        const completedChapters = normalizeCompletedChapters(worldValue.completedChapters);
        migrateLegacyCompleted(worldId, worldValue, completedChapters);

        normalized.worlds[worldId] = {
          completedChapters,
          reached: normalizeReached(worldValue.reached)
        };
      }
    }

    normalized.worlds.telanas ||= {
      completedChapters: {},
      reached: {}
    };
    normalized.worlds.telanas.completedChapters ||= {};
    normalized.worlds.telanas.reached ||= {};

    return normalized;
  };

  const persist = (profile) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(profile));
    } catch {
      // Persistence is optional.
    }
  };

  const read = () => {
    try {
      const current = localStorage.getItem(storageKey);
      if (current) return normalize(JSON.parse(current));

      for (const key of legacyStorageKeys) {
        const legacy = localStorage.getItem(key);
        if (!legacy) continue;
        const migrated = normalize(JSON.parse(legacy));
        persist(migrated);
        return migrated;
      }

      return defaultProfile();
    } catch {
      return defaultProfile();
    }
  };

  const write = (profile) => {
    const normalized = normalize(profile);
    persist(normalized);
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: { profile: normalized }
    }));
    return normalized;
  };

  const update = (mutator) => {
    const next = read();
    mutator(next);
    return write(next);
  };

  const ensureWorld = (profile, world) => {
    profile.worlds[world] ||= {
      completedChapters: {},
      reached: {}
    };
    profile.worlds[world].completedChapters ||= {};
    profile.worlds[world].reached ||= {};
    return profile.worlds[world];
  };

  const hasCompletedChapter = (profile, world, story, book, chapter) => (
    Array.isArray(
      profile?.worlds?.[world]?.completedChapters?.[story]?.[book]
    ) &&
    profile.worlds[world].completedChapters[story][book].includes(chapter)
  );

  const hasReachedAnchor = (profile, world, story, book, anchor) => (
    Array.isArray(profile?.worlds?.[world]?.reached?.[story]?.[book]) &&
    profile.worlds[world].reached[story][book].includes(anchor)
  );

  const visibilityAllowed = (worldManifest, visibility, profile = read()) => {
    if (profile?.fullSpoilers === true) return true;
    if (!visibility || visibility.mode === "always") return true;
    if (visibility.mode === "full-spoilers") return false;

    if (visibility.mode === "completed-chapter") {
      if (
        typeof visibility.story !== "string" ||
        typeof visibility.book !== "string" ||
        typeof visibility.chapter !== "string"
      ) return false;

      return hasCompletedChapter(
        profile,
        worldManifest?.id,
        visibility.story,
        visibility.book,
        visibility.chapter
      );
    }

    if (visibility.mode === "reached-anchor") {
      if (
        typeof visibility.story !== "string" ||
        typeof visibility.book !== "string" ||
        typeof visibility.chapter !== "string" ||
        typeof visibility.anchor !== "string"
      ) return false;

      if (
        hasCompletedChapter(
          profile,
          worldManifest?.id,
          visibility.story,
          visibility.book,
          visibility.chapter
        )
      ) return true;

      return hasReachedAnchor(
        profile,
        worldManifest?.id,
        visibility.story,
        visibility.book,
        visibility.anchor
      );
    }

    return false;
  };

  window.LibrarySpoilerProfile = {
    storageKey,
    legacyStorageKeys,
    eventName,
    get: read,
    set: write,
    normalize,
    visibilityAllowed,
    hasCompletedChapter,
    hasReachedAnchor,

    setFullSpoilers(enabled) {
      return update((profile) => {
        profile.fullSpoilers = Boolean(enabled);
      });
    },

    setStoryCompletedChapters(world, story, completedByBook) {
      return update((profile) => {
        const worldProfile = ensureWorld(profile, world);
        const normalized = normalizeCompletedChapters({
          [story]: completedByBook
        });
        worldProfile.completedChapters[story] = normalized[story] || {};
      });
    },

    markStoryCompletedChapters(world, story, completedByBook) {
      return update((profile) => {
        const worldProfile = ensureWorld(profile, world);
        worldProfile.completedChapters[story] ||= {};

        for (const [book, chaptersValue] of Object.entries(completedByBook || {})) {
          const requested = [...new Set(
            (Array.isArray(chaptersValue) ? chaptersValue : [chaptersValue])
              .filter((chapter) => typeof chapter === "string" && chapter)
          )];

          if (requested.length === 0) continue;

          const existing = worldProfile.completedChapters[story][book] || [];
          worldProfile.completedChapters[story][book] = [
            ...new Set([...existing, ...requested])
          ];
        }
      });
    },

    markReachedAnchors(world, story, book, anchors) {
      const requested = [...new Set(
        (Array.isArray(anchors) ? anchors : [anchors])
          .filter((anchor) => typeof anchor === "string" && anchor)
      )];

      if (requested.length === 0) return read();

      const current = read();
      const existing =
        current.worlds?.[world]?.reached?.[story]?.[book] || [];
      const missing = requested.filter(
        (anchor) => !existing.includes(anchor)
      );

      if (missing.length === 0) return current;

      return update((profile) => {
        const worldProfile = ensureWorld(profile, world);
        worldProfile.reached[story] ||= {};
        const saved = worldProfile.reached[story][book] || [];

        worldProfile.reached[story][book] = [
          ...new Set([...saved, ...requested])
        ];
      });
    }
  };
})();
