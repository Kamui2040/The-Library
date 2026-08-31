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
    const fallback = defaultProfile();
    if (!value || typeof value !== "object") return fallback;

    const completed = value.worlds?.telanas?.completed?.["dragon-knight"];
    return {
      version: 1,
      fullSpoilers: value.fullSpoilers === true,
      worlds: {
        telanas: {
          completed: {
            "dragon-knight": typeof completed === "string" ? completed : "none"
          }
        }
      }
    };
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
