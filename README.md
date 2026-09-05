# The Library

The Library is a fiction website and web reader designed to host independent fiction projects under one shared reading platform.

Telanas is the currently implemented fiction area. The repository remains private while the site and publication workflow are prepared. Public deployment and repository visibility are separate approval-gated steps.

The repository contains only publication-safe website material and neutral development placeholders. Private manuscripts, canon planning, unreleased lore, and private creative assets remain in their source repositories until an explicit release/export step approves them for The Library.

## Current reader-facing surface

Telanas currently focuses on two connected systems:

- a stable localized Reader;
- a spoiler-aware Lexicon with built-in search and short entries for characters, locations, and events the reader is allowed to know about.

Locations do not depend on a map. A Telanas map is not exposed until the geography is explicitly approved as stable enough for a definitive map.

Lexicon category controls are generated only for categories that currently contain at least one spoiler-eligible entry, so an empty or fully hidden category does not expose its own existence.

## Current foundation

- `docs/site-foundation.md` — information architecture, localization, spoiler, Lexicon, and Reader model
- `docs/visual-system.md` — shared Library and Telanas visual direction
- `docs/publication-pipeline.md` — private-source to public-Library boundary and release-bundle contract
- `content/library.json` — data-driven Library/world/locale registry
- `en/` and `de/` — canonical locale roots with localized Telanas landing, Volume 1 Reader, and Lexicon routes
- `assets/library-shell.js` — route-aware shared shell behavior for canonical pages
- `assets/reader/` — canonical Reader engine, presentation, page-turn, progress, and bookmark behavior
- `assets/lexicon/` — canonical spoiler-aware Lexicon browsing, relationships, built-in search, and Reader references
- `assets/timeline/` — retained spoiler-aware chronology module, not exposed in the current reader-facing navigation
- `fixtures/release-bundles/` — neutral deterministic bundle fixtures used to verify the import boundary

`npm run validate` checks public content manifests, semantic links and relationships, retained chronology/map data, canonical production routes, illustration contracts, and the neutral release-bundle fixture. Route validation also checks that the reader-facing landing and Lexicon do not expose the optional Timeline, Map, or standalone Search surfaces.

`npm run import:bundle -- <bundle-directory>` performs a non-mutating dry run. Actual file writes require explicit import flags as described in `docs/publication-pipeline.md`.
