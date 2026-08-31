# The Library Site Foundation

**Status:** Working implementation foundation

The Library is the common fiction website and reader. It is designed to host multiple independent worlds or series without forcing them to share one visual identity.

Telanas is currently the first and only world. While it remains the only published world, the Library root may lead directly into the Telanas experience. Telanas still owns a stable namespace from the beginning so later expansion does not require changing its URLs.

# 1. Information architecture

## 1.1 Library level

The Library owns the shared shell and capabilities:

- K2040 project navigation;
- Library/world selection;
- language and theme handling;
- shared reader engine;
- shared accessibility behavior;
- shared publication/content format;
- shared spoiler-profile behavior;
- common footer functions.

Each world or major fiction project owns:

- its landing page;
- stories and volumes;
- Lexicon;
- Timeline;
- Map;
- world search;
- updates and downloads;
- visual theme;
- public content and assets.

Current world registry:

```text
The Library
└── Telanas
    └── The Dragon Knight
        └── Volume 1 — Home / Band 1 — Zuhause
```

Future worlds are siblings of Telanas, not children of Telanas.

## 1.2 Root and canonical routes

Canonical locale roots are:

```text
/en/
/de/
```

While Telanas is the only published world, those roots may resolve or redirect directly to the matching Telanas landing page. Telanas keeps permanent canonical routes:

```text
/en/telanas/
/de/telanas/
```

When another world is added, `/en/` and `/de/` become Library landing pages listing available worlds. Existing Telanas URLs remain unchanged.

The current implementation is still under `prototype/telanas/`; production work will map the established behavior onto the canonical locale/world routes rather than changing the semantic model.

## 1.3 Telanas navigation

The current first-class Telanas destinations are:

1. **Home** — current world landing page.
2. **Stories** — story/volume and chapter navigation.
3. **Lexicon** — spoiler-aware world knowledge.
4. **Timeline** — spoiler-aware chronology.
5. **Map** — spoiler-aware locations.
6. **Search** — spoiler-aware cross-feature search over Lexicon, Timeline, and Map.
7. **Downloads** — released downloadable editions.
8. **Updates** — Telanas news/update feed.
9. **Language** — released languages only.
10. **Theme** — site/reader appearance control.

The K2040 cascade and Library/Telanas context remain part of the shared header. Mobile navigation preserves the same functions in a compact form.

Timeline, Map, and Search are no longer tentative Lexicon subviews; the prototype has established them as first-class Telanas destinations.

## 1.4 Stories hierarchy

The world data model supports multiple story lines from the start.

Current Telanas hierarchy:

```text
Stories
└── The Dragon Knight
    └── Volume 1 — Home / Band 1 — Zuhause
        ├── Volume overview
        ├── Read
        └── Direct chapter selection
```

Later Telanas stories or side stories can be added beside The Dragon Knight without changing the world model. Display names are localized; stable internal IDs are not.

## 1.5 Telanas landing page

The Telanas landing page contains or provides access to:

- cinematic Telanas hero/title area;
- spoiler-free introduction;
- featured/current story or volume;
- Lexicon;
- Timeline;
- Map;
- Search;
- spoiler-progress control where appropriate;
- Downloads;
- Updates;
- shared footer functions in Telanas styling.

The current prototype uses neutral placeholders. Final artwork and release content remain separate acceptance steps.

# 2. URL and localization model

## 2.1 Locale registry

Localization is data-driven.

Current locales:

```text
en — English
de — Deutsch
```

Only actually released languages appear publicly. Released story editions remain separate localized editions rather than one bilingual manuscript.

## 2.2 Canonical route pattern

Production routes should follow stable semantic structure such as:

```text
/en/telanas/
/en/telanas/stories/
/en/telanas/stories/dragon-knight/
/en/telanas/stories/dragon-knight/volume-01/
/en/telanas/read/dragon-knight/volume-01/
/en/telanas/lexicon/
/en/telanas/timeline/
/en/telanas/map/
/en/telanas/search/
/en/telanas/updates/

/de/... equivalent structure ...
```

Structural route segments and stable IDs remain consistent across locales. Visible labels and titles are localized.

Language switching should preserve the same semantic destination whenever equivalent localized content exists. Switching language while reading, viewing an entry, or following a semantic reference must not fall back to a generic landing page when the same target exists in the other locale.

## 2.3 Localization completeness

For any locale exposed as released:

- interface text must exist;
- released story content must exist;
- visible Lexicon content must exist;
- visible Timeline and Map content must exist;
- public updates must not silently fall back to another language.

Validation should report incomplete localization rather than publish mixed-language content accidentally.

# 3. Spoiler-aware knowledge model

## 3.1 Principle

Spoiler protection is based on explicit reader progress.

The shared progress profile controls Lexicon entries and fragments, relationships, reader references, Timeline events, Map markers, and cross-feature Search before those items are presented or indexed.

If the existence of something is itself a spoiler, it is absent until revealed. It must not appear as a blurred result, redacted title, autocomplete suggestion, count, placeholder, gap, source hint, related-entry hint, hidden map pin, or hidden timeline marker.

Full Spoilers explicitly bypasses normal reveal gates.

Spoiler protection is an accidental-spoiler prevention feature, not a security boundary against someone deliberately inspecting public static files.

## 3.2 Progress profile

The profile supports multiple worlds and stories. Current conceptual shape:

```yaml
spoiler_profile:
  full_spoilers: false
  worlds:
    telanas:
      completed:
        dragon-knight: volume-01
```

Reader completion may offer to advance the profile, update automatically if the user chose that mode, or remain fully manual. Re-reading an earlier volume must never lower later completed progress.

## 3.3 Lexicon

Lexicon entries use stable metadata plus reveal-gated fragments rather than one monolithic article.

Entries may belong to multiple categories. Initial category families include characters, places, creatures, factions, history, magic, mythology, items/artifacts, cultures, and terminology.

Visible fragments may contain semantic reader links. Entry relationships use stable target IDs and are shown/searchable only when both source and target are visible.

Search and category browsing operate only on the already-eligible knowledge set.

## 3.4 Timeline

Timeline events use stable event IDs and deterministic order values. Event existence is filtered before rendering or search.

A hidden event contributes no chronology label, title, summary, reader reference, placeholder, gap marker, or count. The visible chronology may therefore be intentionally incomplete without exposing where hidden material exists.

## 3.5 Map

Map markers use stable marker IDs and normalized presentation positions. Marker existence is filtered before rendering or search.

A hidden location contributes no pin, name, type, description, reader reference, list item, placeholder, or count. Normalized coordinates are presentation data for the current map representation, not rendered page numbers or manuscript identifiers.

## 3.6 World search

World Search is a derived view, not a second content store.

It reads the public Lexicon, Timeline, and Map manifests and applies the shared spoiler profile before constructing searchable records. Hidden entries, fragments, relationship targets, events, and markers therefore never enter the searchable set.

Visible results may link back to the exact stable Lexicon entry, Timeline event, Map marker, or semantic reader anchor. An empty search field intentionally shows no result dump; Full Spoilers changes eligibility, not the requirement to enter a query.

# 4. Reader and publication content model

## 4.1 Source principle

The private manuscript defines semantic story structure. The reader creates rendered pages dynamically.

No web chapter has a fixed canonical page count. Pagination may change with viewport size, layout mode, font size, typeface, line spacing, margins, language, and illustration placement.

Bookmarks, progress, chapter navigation, and world-knowledge references therefore use semantic IDs, never canonical rendered page numbers.

## 4.2 Publication boundary

The Library repository contains only content approved for public release plus code/data required to present it.

Unreleased manuscript text, internal planning, hidden future lore, private reference material, and private assets remain in the private source project.

The intended production flow is:

```text
private source project
→ explicit release selection/export
→ deterministic release bundle
→ Library validation/import
→ review
→ publication only after separate approval
```

The Library already validates and imports release bundles. The private-source exporter/parser remains production work.

## 4.3 Stable hierarchy and semantic markers

Stable IDs include world context where necessary:

```text
world: telanas
story: dragon-knight
volume: volume-01
chapter: dk-v01-ch01
anchor: dk-v01-ch01-p001
illustration: dk-v01-prototype-full-page
```

IDs remain stable across localized editions.

The private source format may use invisible machine-readable markers for chapter boundaries, scene boundaries, illustration anchors, and precise reveal/reference anchors. Export converts those markers into the public representation without exposing unrelated private source content.

## 4.4 Reader blocks and pagination

Current public semantic block types are:

- paragraph;
- scene break;
- illustration.

Chapter boundaries are hard reader boundaries. Scene separators remain semantically intact. The current prototype paginates whole semantic blocks and does not split one paragraph across multiple rendered pages; finer paragraph/line pagination may be added later without changing anchors.

## 4.5 Illustrations

Illustrations use stable asset IDs and semantic anchors rather than fixed page numbers.

Current placements are:

- `flow`;
- `full-page`;
- `before-title`.

For Telanas Volume 1, the established opening order is:

```text
illustration page → chapter title page → chapter text
```

When no opening illustration exists:

```text
chapter title page → chapter text
```

Localized editions share illustration IDs and placements while alt text and captions may differ by locale.

## 4.6 Contents and reader navigation

Each published book has one ordered structural manifest. That same structure generates both the integrated Contents page and the reader-side table of contents.

The reader `☰` control supports hover-open/pin behavior on pointer devices, tap behavior on touch devices, keyboard access, `Escape` closing, active-chapter indication, semantic chapter jumps, and saved bookmarks.

Continuous mode keeps the control reachable while scrolling.

## 4.7 Reader modes and appearance

Current reader layouts:

- Book spread;
- Single page;
- Continuous.

The default Telanas presentation is dark and book-like, with automatic narrow-screen fallback from spread to single-page presentation.

Current appearance controls include dark/light/parchment themes, serif/sans typeface, text size, and line spacing. Preferences persist locally where available.

Paged layouts use a restrained spine-anchored page-turn effect. Reduced-motion preferences disable the effect cleanly. Additional transition choices may be added later if they remain lightweight and do not change semantic navigation.

## 4.8 Reading position and bookmarks

Canonical reading position stores semantic world/story/book/chapter/anchor identity rather than a rendered page number.

Bookmarks likewise persist semantic locations only. Labels are rebuilt from the current localized structural data, allowing bookmarks and reading position to survive repagination, layout changes, viewport changes, and language changes.

# 5. Validation and production acceptance

Before released book/world data is accepted, validation should establish at least:

- stable IDs are unique;
- localized editions contain matching required structure and order;
- semantic references resolve in every relevant locale;
- illustration references resolve and obey placement/path rules;
- Lexicon relationships resolve without hidden-target leakage;
- Timeline and Map reveal gates resolve to real public story/volume IDs;
- released locale strings are complete;
- unreleased locales are absent from public navigation;
- integrated Contents and reader navigation derive from the same structure;
- release bundles match declared hashes and safe target paths;
- no private/unreleased source material is accidentally included.

Asset ownership/licensing and publication approval remain separate manual acceptance gates.

# 6. Current production work still ahead

The architecture is no longer waiting on decisions about whether Timeline, Map, or Search should be first-class Telanas destinations; the prototype has answered that.

Remaining implementation work is mainly productionization:

- convert the prototype shell to canonical locale/world routes;
- implement the private-source exporter/parser;
- add release-approved manuscript and world content;
- add production illustrations, cover/hero artwork, and final licensed web fonts;
- add released download files and metadata;
- refine pagination where useful without changing semantic IDs;
- choose the final hosting/deployment path;
- complete production accessibility, responsive, localization, privacy, rights, and release-candidate QA;
- deploy/publish only after explicit approval.

Those choices must not change the stable world/story IDs, localization model, spoiler rules, or semantic reader structure established here.
