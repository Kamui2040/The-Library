# The Library Site Foundation

**Status:** Working implementation foundation

The Library is the common fiction website and reader. It is designed to host multiple independent worlds or series without forcing them to share one visual identity.

Telanas is currently the first and only world in the Library. While it remains the only published world, the Library root may lead directly into the Telanas experience. Telanas still owns a stable namespace from the beginning so later expansion does not require changing its URLs.

# 1. Information architecture

## 1.1 Library level

The Library owns the common shell and shared capabilities:

- K2040 project navigation
- Library/world selection
- language handling
- theme handling
- shared reader engine
- shared accessibility behavior
- shared publication/content format
- common footer functions

Each world or major fiction project owns:

- its landing page
- its stories and volumes
- its lexicon and spoiler model
- its updates and downloads
- its visual theme
- its public content and assets

Current world registry:

```text
The Library
└── Telanas
    └── The Dragon Knight
        └── Volume 1 — Home / Band 1 — Zuhause
```

Future worlds are siblings of Telanas, not children of Telanas.

## 1.2 Root behavior

Canonical locale roots are:

```text
/en/
/de/
```

While Telanas is the only published world, these roots may resolve or redirect directly to the corresponding Telanas landing page.

Telanas still has permanent canonical world routes:

```text
/en/telanas/
/de/telanas/
```

When another world is added, `/en/` and `/de/` become real Library landing pages containing the available worlds. Existing Telanas URLs remain unchanged.

## 1.3 Telanas navigation

Within Telanas, the primary navigation is:

1. **K2040 cascade** — route into the wider K2040 project ecosystem.
2. **The Library / Telanas home control** — returns to the current world landing page and exposes the Library/world selector where appropriate.
3. **Stories** — expandable story navigation.
4. **Lexicon** — spoiler-aware Telanas knowledge section.
5. **Downloads** — jumps to the Telanas landing-page download section.
6. **Updates** — Telanas news/update feed.
7. **Language** — released languages only.
8. **Theme** — site/reader appearance control.

The exact label arrangement can be refined during UI implementation, but the functions above are required.

The mobile navigation preserves the same functions in a compact menu.

The footer uses the canonical shared K2040 destinations/functions but is visually adapted to the active Library/world theme. The live shared destination set must be verified before implementation rather than copied from an old mockup.

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

Later Telanas stories or side stories can be added beside The Dragon Knight without changing the world navigation model.

Display names are localized. Stable internal IDs are not.

## 1.5 Telanas landing page

The Telanas landing page contains:

- cinematic Telanas hero/title area
- spoiler-free introduction
- featured/current story or volume
- Downloads section
- Lexicon entry point
- spoiler-progress control where appropriate
- Updates feed
- shared footer functions in Telanas styling

Initially Downloads may contain one Volume 1 card with the actually released downloadable formats plus a dedicated **Read** action.

## 1.6 Lexicon

Lexicon remains a Telanas-level top navigation destination.

Initial categories:

- Characters
- Places
- Creatures
- Factions
- History
- Magic
- Mythology
- Items / Artifacts
- Cultures
- Terminology

Entries may belong to multiple categories.

The Lexicon supports category browsing, search, entry pages, spoiler-safe relationships/cross-links, and semantic links back to story locations.

Maps, timelines, and relationship views may begin inside the Lexicon and become first-class navigation only if they later justify it.

# 2. URL and localization model

## 2.1 Locale registry

Localization is data-driven.

Current released locales:

```text
en — English
de — Deutsch
```

Only actually released languages appear publicly. Adding a future language must not require new templates or a site redesign.

Released story editions remain separate localized editions rather than one bilingual manuscript.

## 2.2 Canonical route pattern

Examples:

```text
/en/
/en/telanas/
/en/telanas/stories/
/en/telanas/stories/dragon-knight/
/en/telanas/stories/dragon-knight/volume-01/
/en/telanas/read/dragon-knight/volume-01/
/en/telanas/read/dragon-knight/volume-01/chapter-01/
/en/telanas/lexicon/
/en/telanas/lexicon/characters/
/en/telanas/lexicon/entry/<stable-entry-id>/
/en/telanas/updates/

/de/... equivalent structure ...
```

Structural route segments and stable IDs remain consistent across locales. Visible labels and titles are localized.

Language switching should preserve the same semantic destination whenever the equivalent localized content exists. Switching language while reading Chapter 3 should open the same stable chapter ID in the other edition rather than returning to a landing page.

Downloads uses a localized world landing anchor such as:

```text
/en/telanas/#downloads
/de/telanas/#downloads
```

## 2.3 Localization completeness

For a locale exposed as released:

- interface text must exist
- released story content must exist
- visible Lexicon content must exist in that locale
- public updates must not silently fall back to another language

Validation should report missing localization rather than publishing a mixed-language page accidentally.

# 3. Spoiler-aware knowledge model

## 3.1 Principle

Spoiler protection is based on explicit reader progress.

The selected progress profile controls Lexicon entries, search, relationships, references, timelines, maps, and other knowledge views before they are presented.

If the existence of something is itself a spoiler, it is absent until revealed. It must not appear as a blurred result, redacted title, autocomplete suggestion, result-count hint, or hidden related entry.

## 3.2 Progress profile

The profile must support multiple worlds and multiple stories.

Conceptual shape:

```yaml
spoiler_profile:
  full_spoilers: false
  worlds:
    telanas:
      completed:
        dragon-knight: volume-01
```

Finishing a volume may offer to advance the reader's spoiler level, but it does not silently change the setting by default.

An explicit **Full spoilers** mode bypasses normal reveal gates.

## 3.3 Reveal fragments

A Lexicon entry consists of stable metadata plus reveal-gated fragments rather than one monolithic article.

Conceptual example:

```yaml
id: character-eryn
world: telanas
categories: [characters]
visibility:
  first_revealed:
    story: dragon-knight
    volume: volume-01
    anchor: dk-v01-ch01-s01
content:
  - id: eryn-basic-v01
    revealed_at:
      story: dragon-knight
      volume: volume-01
      anchor: dk-v01-ch01-s01
    text_key: lexicon.character-eryn.basic-v01
```

Aliases, relationships, media, events, descriptions, and references use equivalent reveal gates.

Search filters the eligible knowledge set before ranking or presenting results.

Spoiler protection is an accidental-spoiler prevention feature, not a security boundary against someone deliberately inspecting public static files.

# 4. Reader and publication content model

## 4.1 Source principle

The source manuscript defines semantic story structure. The reader creates rendered pages dynamically.

No web chapter has a fixed page count. Pagination may change with:

- viewport size
- one-page vs spread layout
- font size
- typeface
- line spacing
- page margins
- language

Bookmarks, progress, chapter navigation, and Lexicon references therefore use semantic IDs, never canonical rendered page numbers.

## 4.2 Publication boundary

The Library repository contains only content approved for public release and the code/data required to present it.

Unreleased manuscript text, internal planning, hidden future lore, private reference material, and other source-project-only material do not belong in the Library repository.

The publication process should eventually transform approved source content into a deterministic release representation. The public site must not require manual duplicate HTML versions of the manuscript.

## 4.3 Stable hierarchy

Stable IDs include the world context where necessary:

```text
world: telanas
story: dragon-knight
volume: volume-01
chapter: dk-v01-ch01
scene: dk-v01-ch01-s01
illustration: dk-v01-ill-village
```

IDs remain the same across localized editions.

## 4.4 Semantic markers

The private manuscript/source format may use invisible machine-readable markers for durable structure.

Required marker concepts:

- chapter start/end
- scene start/end
- illustration anchor
- precise reference/reveal anchor
- front-matter blocks where needed

The publication exporter converts those source markers into the public Library representation without exposing unrelated private source content.

## 4.5 Chapter and scene behavior

Chapter boundaries are hard reader boundaries.

Scene boundaries are softer layout boundaries. Pagination may place scenes on the same rendered page when appropriate, but visible scene separators must remain intact and should not be orphaned at the bottom of a page.

## 4.6 Illustrations

Illustrations use semantic anchors and layout roles rather than fixed page numbers.

Supported roles may include:

- chapter-opening full page
- between-scenes full page
- inline
- half-page

For Telanas Volume 1, the established chapter-opening order is:

```text
illustration page → chapter title page → chapter text
```

When no opening illustration exists:

```text
chapter title page → chapter text
```

A wide two-page reader may present the illustration and title page as facing pages when pagination permits. The source order is more important than forcing a specific left/right page.

## 4.7 Integrated Contents and reader navigation

Each published book has one ordered structural manifest.

That same structure generates both:

- the integrated clickable/tappable Contents page inside the book
- the reader-side table-of-contents navigation

A chapter rename, insertion, or removal therefore updates both automatically.

## 4.8 Reader table-of-contents control

The reader has a permanently available `☰` control on the left.

Desktop pointer behavior:

- collapsed by default
- hovering the icon opens the contents panel
- the panel remains open while the pointer is over the icon or panel
- leaving both closes a hover-opened panel after a short tolerance delay
- clicking the icon pins the panel open
- clicking again unpins/closes it
- the active chapter is highlighted
- chapter selection jumps to its semantic anchor

Touch behavior:

- tapping opens/closes the drawer
- selecting a chapter may close the drawer to restore reading space

Keyboard access must provide the same functionality without depending on hover. `Esc` may close the panel.

## 4.9 Reader modes

Default Telanas reader experience:

- dark theme
- book-like page surface
- two-page spread on sufficiently wide screens
- automatic single-page fallback when the viewport becomes too narrow
- page-turn transition enabled

Layout options:

- Book spread
- Single page
- Continuous

Transition options:

- Page turn
- Fade
- None

Reader appearance controls support at least:

- dark / light / parchment-style theme
- font size
- typeface
- line spacing
- page width/margins where applicable

Preferences may persist locally without an account. Reduced-motion preferences must be respected.

## 4.10 Reading position

Canonical reading position stores semantic location data such as:

- world ID
- story ID
- volume ID
- chapter ID
- nearest stable scene/reference anchor
- relative position within/after that anchor

Rendered page numbers may be shown for convenience but are temporary presentation data.

# 5. Publication validation

Before any released book/world data is accepted into the public site build, validation should check at least:

- stable IDs are unique
- localized released editions contain the same required structural IDs/order
- chapter and scene boundaries are balanced
- illustration references resolve to approved public assets
- Lexicon references resolve to valid published anchors
- released locale strings are complete
- unreleased locales are absent from public navigation
- integrated Contents and reader navigation derive from the same structure
- no private/unreleased source material is accidentally included
- external assets have acceptable rights/provenance

# 6. Decisions deliberately left for implementation

These do not block the architecture:

- framework/static-site generator
- final hosting/deployment path
- exact reader pagination library or custom implementation
- exact page-turn implementation
- exact public export format
- exact persistence behavior for pinned reader navigation
- whether future maps/timelines become top-level destinations

These choices must not require changing the stable world/story IDs, localization model, spoiler rules, or semantic reader structure above.
