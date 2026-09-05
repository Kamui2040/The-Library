# The Library Site Foundation

**Status:** Working implementation foundation

The Library is the common fiction website and reader. It is designed to host multiple independent worlds or series without forcing them to share one visual identity.

Telanas is currently the first and only world. Telanas keeps a stable namespace from the beginning so later expansion does not require changing its URLs.

# 1. Information architecture

## 1.1 Library level

The Library owns shared capabilities:

- K2040 project navigation;
- Library/world selection;
- language and theme handling;
- shared reader engine;
- accessibility behavior;
- publication/content format;
- spoiler-profile behavior;
- common footer functions.

Each world or major fiction project may eventually own stories, a Lexicon, optional chronology/geography views, downloads, updates, and its own visual identity. Optional views do not have to exist merely because the data model can support them.

Current world registry:

```text
The Library
└── Telanas
    └── The Dragon Knight
        └── Volume 1 — Home / Band 1 — Zuhause
```

Future worlds are siblings of Telanas, not children of Telanas.

## 1.2 First public Telanas iteration

The first public Telanas website is intentionally focused on two reader-facing systems:

1. **Reader** — stable localized reading with semantic navigation, bookmarks, presentation settings, and spoiler-progress integration.
2. **Lexicon** — short spoiler-aware descriptions that can cover characters, locations, and events already revealed by the reader's selected progress, with search built directly into the Lexicon.

The Telanas landing page and small supporting sections may link into those systems, but standalone Timeline, Map, and world-search pages are not first-version requirements.

The canonical Timeline implementation is retained as development work but is not linked from the first-version canonical navigation and is marked not to be indexed. Map and standalone Search remain deferred development/prototype surfaces.

The Map has an additional hard design gate: it stays hidden until Telanas geography is explicitly approved as stable enough to commit to a real map. Lexicon location entries must not require final coordinates, distances, borders, or map geometry.

## 1.3 Root and canonical routes

Canonical locale roots are:

```text
/en/
/de/
```

While Telanas is the only released world, those roots may resolve or redirect directly to the matching Telanas landing page. Telanas keeps permanent canonical roots:

```text
/en/telanas/
/de/telanas/
```

Implemented reader-facing routes are:

```text
/en/telanas/read/dragon-knight/volume-01/
/en/telanas/lexicon/
/de/telanas/read/dragon-knight/volume-01/
/de/telanas/lexicon/
```

The canonical Timeline route also exists as deferred development work:

```text
/en/telanas/timeline/
/de/telanas/timeline/
```

It is not part of first-version public navigation. Map and standalone Search are not canonical first-version routes.

Future structural patterns may include:

```text
/en/telanas/stories/
/en/telanas/stories/dragon-knight/
/en/telanas/stories/dragon-knight/volume-01/
/en/telanas/timeline/
/en/telanas/map/
/en/telanas/search/
/en/telanas/updates/
```

Future patterns are not permission to expose unreleased content or to publish unfinished features.

## 1.4 First-version navigation

The first-version canonical navigation should keep the reader's choices small:

1. **Home** — Telanas landing page.
2. **Stories / Reader** — current story, volume, and chapter access.
3. **Lexicon** — spoiler-aware short world knowledge with built-in search.
4. **Downloads / Updates** — supporting sections when they contain useful released material.
5. **Language / Theme** — shared controls.

Timeline, Map, and standalone Search stay out of this navigation until they are deliberately brought back into scope.

## 1.5 Stories hierarchy

The world data model supports multiple story lines from the start.

```text
Stories
└── The Dragon Knight
    └── Volume 1 — Home / Band 1 — Zuhause
        ├── Volume overview
        ├── Read
        └── Direct chapter selection
```

Later Telanas stories or side stories can be added beside The Dragon Knight without changing the world model. Display names are localized; stable internal IDs are not.

# 2. URL and localization model

## 2.1 Locale registry

Current locales:

```text
en — English
de — Deutsch
```

Only actually released languages appear publicly. Released story editions remain separate localized editions rather than one bilingual manuscript.

Structural route segments and stable IDs remain consistent across locales. Visible labels and titles are localized.

Language switching preserves the same semantic destination whenever equivalent localized content exists. Reader switching keeps the current query and semantic hash anchor. Lexicon switching preserves semantic `entry` and category query state without allowing a hidden target to bypass spoiler filtering.

## 2.2 Localization completeness

For any exposed locale:

- interface text must exist;
- released story content must exist;
- visible Lexicon content must exist;
- public updates must not silently fall back to another language.

Deferred surfaces do not become release requirements merely because development implementations exist.

# 3. Spoiler-aware knowledge model

## 3.1 Principle

Spoiler protection is based on explicit reader progress.

Filtering happens before normal rendering and search. If the existence of something is itself a spoiler, it is absent until the reader's selected progress permits it. It must not appear as a blurred result, redacted title, autocomplete suggestion, count, placeholder, gap, source hint, or relationship hint.

Full Spoilers explicitly bypasses normal reveal gates.

Spoiler protection prevents accidental spoilers; it is not a security boundary against someone deliberately inspecting public static data.

## 3.2 Progress profile

Conceptual shape:

```yaml
spoiler_profile:
  full_spoilers: false
  worlds:
    telanas:
      completed:
        dragon-knight: volume-01
```

Reader completion may offer to advance the profile, update automatically if the reader chose that mode, or remain manual. Re-reading an earlier volume must never lower later completed progress.

## 3.3 Lexicon

The Lexicon is the first-version home for compact world knowledge.

Entries use stable metadata plus reveal-gated fragments rather than one monolithic article. The initial reader-facing emphasis is:

- **Characters** — short descriptions of people already known at the selected progress.
- **Places** — short descriptions of locations already known at the selected progress, without requiring final map coordinates.
- **Events** — short descriptions of events that have already happened in released reading material and are allowed by the selected progress.

The data model may retain additional categories for future use, but those categories do not need prominent first-version entry points.

Visible fragments may contain semantic Reader links. Entry relationships use stable target IDs and are shown/searchable only when both source and target are visible.

The Lexicon's own search is the first-version search experience. Search and category browsing operate only on the already-eligible knowledge set. Canonical links may carry a stable `entry` target or category filter; those parameters affect navigation only and never bypass the spoiler profile.

## 3.4 Deferred Timeline

A standalone Timeline is optional, not required for the first public iteration. The existing implementation remains useful development work and keeps the same spoiler-filtering rules, but it is not linked from first-version canonical pages.

Until a standalone Timeline adds enough value, revealed events can live naturally as searchable Lexicon entries.

## 3.5 Deferred Map

The Map is intentionally deferred.

No public map should be exposed until the geography is explicitly approved as stable. A location's Lexicon entry may exist long before its final position, surrounding geography, distance relationships, borders, roads, or map artwork are settled.

When a future Map is approved, it should reference existing stable location IDs rather than redefine the locations or force earlier Lexicon data to contain coordinates.

## 3.6 Deferred standalone Search

A separate world-search page is not needed for the first iteration because the Lexicon already provides spoiler-aware search over the content readers need first.

A broader cross-feature Search can return later if there are enough mature public surfaces to justify it.

# 4. Reader model

## 4.1 Source principle

The private manuscript defines semantic story structure. The Reader creates rendered pages dynamically.

Pagination may change with viewport size, layout mode, font size, typeface, line spacing, margins, language, and illustration placement. Bookmarks, progress, chapter navigation, and knowledge references therefore use semantic IDs, never canonical rendered page numbers.

## 4.2 Stable hierarchy and markers

Examples:

```text
world: telanas
story: dragon-knight
volume: volume-01
chapter: dk-v01-ch01
anchor: dk-v01-ch01-p001
illustration: dk-v01-prototype-full-page
```

IDs remain stable across localized editions.

## 4.3 Reader blocks and illustrations

Current public semantic block types are:

- paragraph;
- scene break;
- illustration.

Current illustration placements are:

- `flow`;
- `full-page`;
- `before-title`.

For the established Telanas opening flow:

```text
illustration page → chapter title page → chapter text
```

When no opening illustration exists:

```text
chapter title page → chapter text
```

## 4.4 Contents, modes, and appearance

Each published book has one ordered structural manifest. That same structure generates both the integrated Contents page and the reader-side table of contents.

Current layouts:

- Book spread;
- Single page;
- Continuous.

Current appearance controls include dark/light/parchment themes, serif/sans typeface, text size, and line spacing. Preferences persist locally where available.

Paged layouts use the accepted restrained spine-anchored page-turn effect. Reduced-motion preferences disable it cleanly.

## 4.5 Reading position and bookmarks

Canonical reading position and bookmarks store semantic world/story/book/chapter/anchor identity rather than rendered page numbers. Labels are rebuilt from the current localized structural data so saved places survive repagination, layout changes, viewport changes, and language changes.

# 5. Publication boundary

The Library repository contains only content approved for public release plus code/data required to present it.

Unreleased manuscript text, internal planning, hidden future lore, private reference material, and private assets remain in the private source project.

Intended flow:

```text
private source project
→ explicit release selection/export
→ deterministic release bundle
→ Library validation/import
→ review
→ publication only after separate approval
```

The Library already validates and imports release bundles. The private-source exporter/parser remains production work.

# 6. Validation and production acceptance

Before released book/world data is accepted, validation should establish at least:

- stable IDs are unique;
- localized editions contain matching required structure and order;
- semantic references resolve in every relevant locale;
- illustration references resolve and obey placement/path rules;
- Lexicon relationships resolve without hidden-target leakage;
- released locale strings are complete;
- unreleased locales are absent from public navigation;
- integrated Contents and Reader navigation derive from the same structure;
- first-version canonical navigation exposes Reader and Lexicon but not deferred Timeline, Map, or standalone Search;
- the deferred Timeline remains non-indexed while retained in the repository;
- release bundles match declared hashes and safe target paths;
- no private/unreleased source material is accidentally included.

Asset ownership/licensing and publication approval remain separate acceptance gates.

# 7. Current production work still ahead

The first-version product direction is now clear: stable Reader plus searchable spoiler-aware Lexicon.

Remaining work is mainly:

- keep the Reader stable while real released text replaces neutral placeholders;
- populate the Lexicon with approved short descriptions for characters, places, and already-revealed events;
- implement the private-source exporter/parser;
- add production illustrations, cover/hero artwork, and final licensed web fonts;
- add released download files and metadata;
- refine pagination where useful without changing semantic IDs;
- decide final hosting/deployment;
- complete accessibility, responsive, localization, privacy, rights, and release-candidate QA;
- revisit Timeline and broader Search only when they add clear reader value;
- keep Map hidden until geography is explicitly approved as stable;
- deploy/publish only after explicit approval.

Those choices must not change the stable world/story IDs, localization model, spoiler rules, or semantic Reader structure established here.
