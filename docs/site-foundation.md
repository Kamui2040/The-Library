# The Library Site Foundation

**Status:** Working implementation foundation

The Library is the common fiction website and Reader. It is designed to host multiple independent worlds or series without forcing them to share one visual identity.

Telanas is currently the first and only world. It keeps a stable namespace from the beginning so later expansion does not require changing its URLs.

# 1. Reader-facing architecture

## 1.1 Library level

The Library owns shared capabilities:

- K2040 project navigation;
- Library/world selection;
- language and theme handling;
- shared Reader engine;
- accessibility behavior;
- publication/content format;
- spoiler-profile behavior;
- common footer functions.

Each world or major fiction project may define its own stories, Lexicon, optional reference views, downloads, updates, and visual identity.

Current world registry:

```text
The Library
└── Telanas
    └── The Dragon Knight
        └── Volume 1 — Home / Band 1 — Zuhause
```

Future worlds are siblings of Telanas, not children of Telanas.

## 1.2 Telanas surface

The current Telanas reader-facing surface has two connected systems:

1. **Reader** — localized reading with semantic navigation, bookmarks, presentation settings, and spoiler-progress integration.
2. **Lexicon** — short spoiler-aware descriptions with built-in search.

The Lexicon is the main reference surface for:

- characters;
- locations;
- events already revealed at the selected reading progress.

A standalone Timeline and standalone world-search page are not part of the current navigation. A retained Timeline route may support development and validation, but it is non-indexed and unlinked from the reader-facing surface.

The Map is not exposed until Telanas geography is explicitly approved as stable enough for a definitive map. Location entries therefore must not require final coordinates, distances, borders, roads, or map geometry.

## 1.3 Canonical routes

Canonical locale roots are:

```text
/en/
/de/
```

Telanas keeps permanent roots:

```text
/en/telanas/
/de/telanas/
```

Current reader-facing routes include:

```text
/en/telanas/read/dragon-knight/volume-01/
/en/telanas/lexicon/
/de/telanas/read/dragon-knight/volume-01/
/de/telanas/lexicon/
```

Structural route segments and stable IDs remain consistent across locales. Visible labels and titles are localized.

Language switching preserves the same semantic destination whenever equivalent localized content exists. Reader switching keeps the current query and semantic hash anchor. Lexicon switching preserves semantic `entry` and category query state without allowing a hidden target to bypass spoiler filtering.

## 1.4 Navigation

The reader-facing navigation keeps the main choices small:

1. **Home** — Telanas landing page.
2. **Stories / Reader** — current story, volume, and chapter access.
3. **Lexicon** — spoiler-aware reference browsing and search.
4. **Downloads / Updates** — supporting sections when useful.
5. **Language / Theme** — shared controls.

Optional Timeline, Map, and standalone Search surfaces are not exposed in this navigation.

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

Display names are localized; stable internal IDs are not.

# 2. Localization

Current locales:

```text
en — English
de — Deutsch
```

Only actually released languages appear publicly. Released story editions remain separate localized editions rather than one bilingual manuscript.

For any exposed locale:

- interface text must exist;
- released story content must exist;
- visible Lexicon content must exist;
- public updates must not silently fall back to another language.

# 3. Spoiler-aware knowledge

## 3.1 Principle

Spoiler protection is based on explicit reader progress.

Filtering happens before normal rendering and search. If the existence of something is itself a spoiler, it remains absent until the selected progress permits it. It must not appear as a blurred result, redacted title, autocomplete suggestion, count, placeholder, source hint, or relationship hint.

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

Lexicon entries use stable metadata plus reveal-gated fragments rather than one monolithic article.

The main reader-facing categories are:

- **Characters** — short descriptions of people already known at the selected progress.
- **Places** — short descriptions of locations already known at the selected progress, without requiring final map coordinates.
- **Events** — short descriptions of events already revealed in released reading material.

The data model may retain additional categories when useful.

Visible fragments may contain semantic Reader links. Entry relationships use stable target IDs and are shown/searchable only when both source and target are visible.

The Lexicon's own search is the current search experience. Search and category browsing operate only on the already-eligible knowledge set. Canonical links may carry a stable `entry` target or category filter; those parameters affect navigation only and never bypass the spoiler profile.

## 3.4 Optional Timeline

A standalone Timeline is not required for event reference. Revealed events can exist as searchable Lexicon entries.

Any retained Timeline implementation follows the same existence filtering: a hidden event contributes no title, period, summary, Reader link, placeholder, or count.

## 3.5 Map availability rule

No reader-facing Map is exposed until the geography is explicitly approved as stable.

A location's Lexicon entry may exist independently of its final position, surrounding geography, distance relationships, borders, roads, or map artwork.

If a Map is added later, it should reference existing stable location IDs rather than redefine locations or force coordinates into earlier Lexicon data.

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

Each published book has one ordered structural manifest. That same structure generates both the integrated Contents page and the Reader-side table of contents.

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

# 6. Validation

Before released book/world data is accepted, validation should establish at least:

- stable IDs are unique;
- localized editions contain matching required structure and order;
- semantic references resolve in every relevant locale;
- illustration references resolve and obey placement/path rules;
- Lexicon relationships resolve without hidden-target leakage;
- released locale strings are complete;
- unreleased locales are absent from public navigation;
- integrated Contents and Reader navigation derive from the same structure;
- reader-facing navigation exposes Reader and Lexicon but not optional Timeline, Map, or standalone Search;
- retained non-reader-facing routes are not indexed accidentally;
- release bundles match declared hashes and safe target paths;
- no private/unreleased source material is accidentally included.

Asset ownership/licensing and publication approval remain separate acceptance gates.
