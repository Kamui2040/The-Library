# Telanas Prototype

This is the first publication-safe visual prototype for the Telanas world area inside **The Library**.

It intentionally contains no unreleased manuscript text or private lore. The landscape, cover, update text, and book-page copy are neutral placeholders used only to test layout and interaction.

## Pages

- `index.html` — Telanas landing-page prototype
- `reader.html` — reader-shell prototype

## Implemented interactions

- English / German interface switching
- dark / light presentation switching
- responsive desktop/mobile navigation
- Stories menu
- reader table of contents:
  - generated from the public Volume 1 prototype manifest
  - the integrated Contents page uses that same ordered chapter data
  - hover `☰` to open on pointer devices
  - move normally inside the open panel
  - move away to close after a short tolerance delay
  - click `☰` to pin/unpin on desktop
  - tap `☰` to open/close on touch devices
  - `Escape` closes the panel
  - chapter selection resolves to stable semantic chapter IDs
- reader layout choice: spread / single / continuous

## Running the prototype

The reader loads its book structure with `fetch()`, so open it through a local static web server or normal website host rather than directly from a `file://` URL.

The current public prototype manifest is:

`content/worlds/telanas/books/dragon-knight/volume-01/book.json`

Run `npm run validate` from the repository root to validate the Library/world/book manifests.

## Deliberately not implemented yet

- final hero artwork
- final web fonts
- released manuscript text
- real Lexicon/search content
- spoiler filtering pipeline
- private-source exporter/parser
- dynamic book pagination
- true page-turn rendering
- downloads
- deployment

The durable architecture is in `docs/site-foundation.md`; visual rules are in `docs/visual-system.md`; the public-content boundary is in `docs/publication-pipeline.md`.
