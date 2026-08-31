# Telanas Prototype

This is the first publication-safe visual prototype for the Telanas world area inside **The Library**.

It contains no unreleased manuscript text, private lore, or production story artwork. The landscape, cover, update text, reader editions, Lexicon examples, and illustration markers are neutral placeholders used only to test structure and interaction.

## Pages

- `index.html` — Telanas landing-page prototype
- `reader.html` — semantic reader prototype
- `lexicon.html` — spoiler-aware Lexicon prototype

## Implemented interactions

- English/German interface switching
- dark/light site presentation
- responsive desktop/mobile navigation
- Stories menu
- persistent spoiler profile:
  - completed-volume selection
  - Full Spoilers toggle
  - shared across Library pages
- spoiler-aware Lexicon:
  - filters before rendering and search
  - hidden entries expose no titles, counts, suggestions, or source links
  - visible fragments may link to exact semantic reader anchors
  - prototype-only data tests Volume 1, Full Spoilers, and reader-link gates without storing story lore
- semantic reader:
  - separate aligned English and German editions
  - stable chapter, paragraph, scene-break, and illustration anchors
  - dedicated chapter-title pages
  - dynamic block-based pagination
  - automatic repagination after layout, language, viewport, or typography changes
  - spread, single-page, and continuous modes
  - previous/next, page-click, and arrow-key navigation
  - semantic position persistence rather than rendered page numbers
  - dark, light, and parchment reader themes
  - serif/sans typeface, text-size, and line-spacing controls
  - spine-anchored soft page turns in paged layouts, with reduced-motion fallback
- semantic illustration blocks:
  - assets are registered once in the book manifest
  - localized editions place illustrations in the semantic content sequence
  - `flow` illustrations paginate with surrounding content
  - `full-page` illustrations occupy their own rendered page at their source position
  - `before-title` illustrations occupy their own page before the generated chapter title page
  - the Prologue prototype exercises the intended illustration page → chapter title page → chapter text sequence
  - localized alternative text and optional captions
  - neutral CSS placeholders test placement without committing story artwork
  - illustration anchors survive language, layout, and viewport changes
- reader completion and spoiler progress:
  - ask at the end, update automatically, or remain manual in the Lexicon
  - completion advances by stable book ID and never lowers later progress
- reader table of contents:
  - generated from the same manifest as the integrated Contents page
  - hover to open, click to pin, tap to toggle, Escape to close
  - Continuous mode keeps the control reachable while scrolling

## Running the prototype

The reader and Lexicon load public manifests with `fetch()`. Open them through a local static web server or normal website host, not a `file://` URL.

Current public prototype data includes:

- `content/worlds/telanas/books/dragon-knight/volume-01/book.json`
- `content/worlds/telanas/books/dragon-knight/volume-01/editions/en.json`
- `content/worlds/telanas/books/dragon-knight/volume-01/editions/de.json`
- `content/worlds/telanas/lexicon/lexicon.json`

Run `npm run validate` from the repository root.

## Deliberately not implemented yet

- final hero artwork
- final web fonts
- released manuscript text
- production illustration assets
- real released Lexicon content
- private-source exporter/parser
- finer line-level paragraph pagination
- released download files and metadata
- deployment

The durable architecture is in `docs/site-foundation.md`; visual rules are in `docs/visual-system.md`; the public-content boundary is in `docs/publication-pipeline.md`.
