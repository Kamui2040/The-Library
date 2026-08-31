(() => {
  "use strict";

  const storageKey = "library-spoiler-profile-v1";
  const eventName = "library-spoiler-profile-change";

  const defaultProfile = () => ({
    version: 1,
    fullSpoilers: false,
    worlds: {
      telanas: {
        completed: {
          "dragon-knight": "none"
        }
      }
    }
  });

  const normalize = (value) => {
    const normalized = {
      version: 1,
      fullSpoilers: value?.fullSpoilers === true,
      worlds: {}
    };

    if (value?.worlds && typeof value.worlds === "object" && !Array.isArray(value.worlds)) {
      for (const [worldId, worldValue] of Object.entries(value.worlds)) {
        if (!worldValue?.completed || typeof worldValue.completed !== "object" || Array.isArray(worldValue.completed)) continue;
        const completed = {};
        for (const [storyId, volumeId] of Object.entries(worldValue.completed)) {
          if (typeof volumeId === "string") completed[storyId] = volumeId;
        }
        normalized.worlds[worldId] = { completed };
      }
    }

    normalized.worlds.telanas ||= { completed: {} };
    normalized.worlds.telanas.completed ||= {};
    normalized.worlds.telanas.completed["dragon-knight"] ||= "none";
    return normalized;
  };

  const read = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? normalize(JSON.parse(raw)) : defaultProfile();
    } catch {
      return defaultProfile();
    }
  };

  const write = (profile) => {
    const normalized = normalize(profile);
    try {
      localStorage.setItem(storageKey, JSON.stringify(normalized));
    } catch {
      // Persistence is optional; the current page can still use the value.
    }
    window.dispatchEvent(new CustomEvent(eventName, { detail: { profile: normalized } }));
    return normalized;
  };

  const update = (mutator) => {
    const next = read();
    mutator(next);
    return write(next);
  };

  window.LibrarySpoilerProfile = {
    storageKey,
    eventName,
    get: read,
    set: write,
    setFullSpoilers(enabled) {
      return update((profile) => {
        profile.fullSpoilers = Boolean(enabled);
      });
    },
    setCompletedVolume(world, story, volume) {
      return update((profile) => {
        profile.worlds[world] ||= { completed: {} };
        profile.worlds[world].completed ||= {};
        profile.worlds[world].completed[story] = volume || "none";
      });
    }
  };
})();
