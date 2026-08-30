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
  - hover `☰` to open on pointer devices
  - move normally inside the open panel
  - move away to close after a short tolerance delay
  - click `☰` to pin/unpin on desktop
  - tap `☰` to open/close on touch devices
  - `Escape` closes the panel
  - chapter selection updates the sample reader position
- reader layout choice: spread / single / continuous

## Deliberately not implemented yet

- final hero artwork
- final web fonts
- real publication data
- real Lexicon/search content
- spoiler filtering pipeline
- manuscript exporter/parser
- dynamic book pagination
- true page-turn rendering
- downloads
- deployment

The durable architecture is in `docs/site-foundation.md`; visual rules are in `docs/visual-system.md`.
