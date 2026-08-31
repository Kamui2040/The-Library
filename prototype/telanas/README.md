# Telanas Prototype

This is the first publication-safe visual prototype for the Telanas world area inside **The Library**.

It intentionally contains no unreleased manuscript text or private lore. The landscape, cover, update text, reader editions, and Lexicon examples are neutral placeholders used only to test layout and interaction.

## Pages

- `index.html` — Telanas landing-page prototype
- `reader.html` — semantic reader prototype
- `lexicon.html` — spoiler-aware Lexicon prototype

## Implemented interactions

- English / German interface switching
- dark / light presentation switching
- responsive desktop/mobile navigation
- Stories menu
- persistent spoiler profile stored locally:
  - completed-volume selection
  - Full Spoilers toggle
  - the same profile is available across Library pages
- spoiler-aware Lexicon:
  - entry visibility is filtered before rendering
  - search runs only against already-visible entries and fragments
  - hidden entries do not appear as redacted results, counts, or suggestions
  - category controls do not expose hidden-entry counts
  - prototype-only entries prove Volume 1 and Full Spoilers reveal gates without storing story lore
- semantic reader content:
  - separate English and German prototype editions
  - identical chapter/block semantic IDs across both locales
  - paragraph and scene-break anchors
  - dedicated chapter-title pages
  - dynamic block-based pagination from the current page dimensions
  - automatic repagination after layout, language, or viewport changes
  - spread mode with narrow-screen single-page fallback
  - explicit single-page and continuous modes
  - previous/next page controls plus left/right arrow-key paging
  - persistent reading position stored as a semantic anchor, never a rendered page number
  - language and layout changes restore the nearest stable semantic location
- reader table of contents:
  - generated from the public Volume 1 book manifest
  - the integrated Contents page uses that same ordered chapter data
  - hover `☰` to open on pointer devices
  - move normally inside the open panel
  - move away to close after a short tolerance delay
  - click `☰` to pin/unpin on desktop
  - tap `☰` to open/close on touch devices
  - `Escape` closes the panel
  - chapter selection resolves to stable semantic chapter IDs

## Running the prototype

The reader and Lexicon load public manifests with `fetch()`, so open them through a local static web server or normal website host rather than directly from a `file://` URL.

Current public prototype data includes:

- `content/worlds/telanas/books/dragon-knight/volume-01/book.json`
- `content/worlds/telanas/books/dragon-knight/volume-01/editions/en.json`
- `content/worlds/telanas/books/dragon-knight/volume-01/editions/de.json`
- `content/worlds/telanas/lexicon/lexicon.json`

Run `npm run validate` from the repository root to validate the Library/world/book/reader-edition/Lexicon data and the neutral release-bundle fixture.

## Deliberately not implemented yet

- final hero artwork
- final web fonts
- released manuscript text
- real released Lexicon content
- private-source exporter/parser
- finer line-level paragraph pagination
- final reader font/spacing/page-width controls
- true page-turn rendering
- downloads
- deployment

The durable architecture is in `docs/site-foundation.md`; visual rules are in `docs/visual-system.md`; the public-content boundary is in `docs/publication-pipeline.md`.
