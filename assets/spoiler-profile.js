(() => {
  "use strict";

  const storageKey = "library-spoiler-profile-v2";
  const legacyStorageKey = "library-spoiler-profile-v1";
  const eventName = "library-spoiler-profile-change";

  const defaultProfile = () => ({
    version: 2,
    fullSpoilers: false,
    worlds: {
      telanas: {
        completed: {
          "dragon-knight": "none"
        },
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
        const anchors = [...new Set(anchorsValue.filter((anchor) => typeof anchor === "string" && anchor))];
        if (anchors.length > 0) books[bookId] = anchors;
      }
      if (Object.keys(books).length > 0) reached[storyId] = books;
    }
    return reached;
  };

  const normalize = (value) => {
    const normalized = {
      version: 2,
      fullSpoilers: value?.fullSpoilers === true,
      worlds: {}
    };

    if (value?.worlds && typeof value.worlds === "object" && !Array.isArray(value.worlds)) {
      for (const [worldId, worldValue] of Object.entries(value.worlds)) {
        if (!worldValue || typeof worldValue !== "object" || Array.isArray(worldValue)) continue;

        const completed = {};
        if (worldValue.completed && typeof worldValue.completed === "object" && !Array.isArray(worldValue.completed)) {
          for (const [storyId, volumeId] of Object.entries(worldValue.completed)) {
            if (typeof volumeId === "string") completed[storyId] = volumeId;
          }
        }

        normalized.worlds[worldId] = {
          completed,
          reached: normalizeReached(worldValue.reached)
        };
      }
    }

    normalized.worlds.telanas ||= { completed: {}, reached: {} };
    normalized.worlds.telanas.completed ||= {};
    normalized.worlds.telanas.reached ||= {};
    normalized.worlds.telanas.completed["dragon-knight"] ||= "none";
    return normalized;
  };

  const persist = (profile) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(profile));
    } catch {
      // Persistence is optional; the current page can still use the value.
    }
  };

  const read = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return normalize(JSON.parse(raw));

      const legacyRaw = localStorage.getItem(legacyStorageKey);
      if (legacyRaw) {
        const migrated = normalize(JSON.parse(legacyRaw));
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
    window.dispatchEvent(new CustomEvent(eventName, { detail: { profile: normalized } }));
    return normalized;
  };

  const update = (mutator) => {
    const next = read();
    mutator(next);
    return write(next);
  };

  const storyBooks = (worldManifest, storyId) => {
    const story = worldManifest?.stories?.find((candidate) => candidate.id === storyId);
    return Array.isArray(story?.books) ? story.books : [];
  };

  const completedVolumeAtLeast = (worldManifest, profile, storyId, volumeId) => {
    const books = storyBooks(worldManifest, storyId);
    const requiredIndex = books.findIndex((book) => book.id === volumeId);
    const completedId = profile?.worlds?.[worldManifest?.id]?.completed?.[storyId] || "none";
    const completedIndex = books.findIndex((book) => book.id === completedId);
    return requiredIndex >= 0 && completedIndex >= requiredIndex;
  };

  const hasReachedAnchor = (profile, world, story, book, anchor) => (
    Array.isArray(profile?.worlds?.[world]?.reached?.[story]?.[book]) &&
    profile.worlds[world].reached[story][book].includes(anchor)
  );

  const visibilityAllowed = (worldManifest, visibility, profile = read()) => {
    if (profile?.fullSpoilers === true) return true;
    if (!visibility || visibility.mode === "always") return true;
    if (visibility.mode === "full-spoilers") return false;

    if (visibility.mode === "completed-volume") {
      return completedVolumeAtLeast(worldManifest, profile, visibility.story, visibility.volume);
    }

    if (visibility.mode === "reached-anchor") {
      if (
        typeof visibility.story !== "string" ||
        typeof visibility.book !== "string" ||
        typeof visibility.anchor !== "string"
      ) return false;

      if (completedVolumeAtLeast(worldManifest, profile, visibility.story, visibility.book)) return true;
      return hasReachedAnchor(
        profile,
        worldManifest?.id,
        visibility.story,
        visibility.book,
        visibility.anchor,
      );
    }

    return false;
  };

  window.LibrarySpoilerProfile = {
    storageKey,
    legacyStorageKey,
    eventName,
    get: read,
    set: write,
    normalize,
    visibilityAllowed,
    completedVolumeAtLeast,
    hasReachedAnchor,
    setFullSpoilers(enabled) {
      return update((profile) => {
        profile.fullSpoilers = Boolean(enabled);
      });
    },
    setCompletedVolume(world, story, volume) {
      return update((profile) => {
        profile.worlds[world] ||= { completed: {}, reached: {} };
        profile.worlds[world].completed ||= {};
        profile.worlds[world].reached ||= {};
        profile.worlds[world].completed[story] = volume || "none";
      });
    },
    markReachedAnchors(world, story, book, anchors) {
      const requested = [...new Set((Array.isArray(anchors) ? anchors : [anchors])
        .filter((anchor) => typeof anchor === "string" && anchor))];
      if (requested.length === 0) return read();

      const current = read();
      const existing = current.worlds?.[world]?.reached?.[story]?.[book] || [];
      const missing = requested.filter((anchor) => !existing.includes(anchor));
      if (missing.length === 0) return current;

      return update((profile) => {
        profile.worlds[world] ||= { completed: {}, reached: {} };
        profile.worlds[world].completed ||= {};
        profile.worlds[world].reached ||= {};
        profile.worlds[world].reached[story] ||= {};
        const saved = profile.worlds[world].reached[story][book] || [];
        profile.worlds[world].reached[story][book] = [...new Set([...saved, ...requested])];
      });
    }
  };
})();
