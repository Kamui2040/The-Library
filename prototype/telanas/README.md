# Telanas Prototype

This is the first publication-safe visual prototype for the Telanas world area inside **The Library**.

It intentionally contains no unreleased manuscript text, private lore, or production story artwork. The landscape, cover, update text, reader editions, Lexicon examples, and illustration markers are neutral placeholders used only to test layout and interaction.

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
  - hidden entries do not appear as redacted results, counts, suggestions, or source links
  - category controls do not expose hidden-entry counts
  - visible fragments may link to exact semantic reader anchors without rendered page numbers
  - reader links are constructed only after their containing fragment passes the spoiler gate
  - prototype-only entries prove Volume 1, Full Spoilers, and semantic-link behavior without storing story lore
- semantic reader content:
  - separate English and German prototype editions
  - identical chapter/block semantic IDs across both locales
  - paragraph, scene-break, and illustration anchors
  - dedicated chapter-title pages
  - dynamic block-based pagination from the current page dimensions
  - automatic repagination after layout, language, viewport, or typography changes
  - spread mode with narrow-screen single-page fallback
  - explicit single-page and continuous modes
  - previous/next controls, page-click navigation, and left/right arrow-key paging
  - persistent reading position stored as a semantic anchor, never a rendered page number
  - language and layout changes restore the nearest stable semantic location
  - multiple local bookmarks store only stable world/story/book and semantic-anchor identities
  - bookmark labels are rebuilt from the current localized chapter navigation rather than saved page text or page numbers
  - bookmarked places can be reopened after repagination or language/layout changes
  - dark, light, and parchment reader themes
  - serif/sans typeface, text-size, and line-spacing controls
  - a spine-anchored soft page turn for paged layouts, with reduced-motion fallback
- semantic illustration blocks:
  - illustration assets are registered once in the book manifest
  - localized editions reference the same stable asset IDs and placements
  - `flow` illustrations paginate with surrounding content
  - `full-page` illustrations receive a dedicated rendered page
  - `before-title` illustrations receive a dedicated page before the generated chapter title
  - the Prologue prototype exercises illustration page → chapter title page → chapter text
  - alternative text and optional captions remain localized
  - neutral CSS placeholders test layout without committing story artwork
  - illustration anchors survive language, layout, and viewport changes
- reader completion and spoiler progress:
  - `Ask when a volume ends` prompts before changing the spoiler profile
  - `Update automatically` marks a volume complete at its final reading position
  - `Manual in Lexicon` leaves progress entirely under the reader's direct control
  - completion advances by stable book ID and never lowers a later completed volume
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
  - saved bookmarks are listed below the chapter navigation
  - Continuous mode keeps the control reachable while scrolling and uses available horizontal space when open

## Running the prototype

The reader and Lexicon load public manifests with `fetch()`, so open them through a local static web server or normal website host rather than directly from a `file://` URL.

Current public prototype data includes:

- `content/worlds/telanas/books/dragon-knight/volume-01/book.json`
- `content/worlds/telanas/books/dragon-knight/volume-01/editions/en.json`
- `content/worlds/telanas/books/dragon-knight/volume-01/editions/de.json`
- `content/worlds/telanas/lexicon/lexicon.json`

Run `npm run validate` from the repository root to validate the Library/world/book/reader-edition/Lexicon data, semantic reader links, illustration contracts, and the neutral release-bundle fixture.

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
