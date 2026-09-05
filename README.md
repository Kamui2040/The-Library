# The Library

The Library is a fiction website and web reader designed to host independent worlds and story series under one shared reading platform.

Telanas is the first world. The repository remains private while the production site, reader, and publication workflow are being prepared. Public deployment and repository visibility are separate approval-gated steps.

The repository contains only publication-safe website material and neutral development placeholders. Private manuscripts, canon planning, unreleased lore, and private creative assets remain in their source repositories until an explicit release/export step approves them for The Library.

## First public iteration

The first Telanas website iteration is intentionally narrow:

- a stable localized Reader;
- a spoiler-aware Lexicon with built-in search;
- short Lexicon entries for characters, locations, and events that the reader is already allowed to know about.

A standalone Timeline, Map, and separate world-search page are not required for the first public iteration. The existing Timeline implementation is retained as a deferred development surface, while Map and standalone Search remain prototype work. None of those deferred surfaces belong in the first-version canonical navigation.

The Map stays hidden until Telanas geography is explicitly stable enough to commit to a real map. Location entries in the Lexicon therefore do not depend on final coordinates or map geometry.

## Current foundation

- `docs/site-foundation.md` — current information architecture, localization, spoiler, knowledge-view, and reader model
- `docs/visual-system.md` — shared Library and Telanas visual direction
- `docs/publication-pipeline.md` — private-source to public-Library boundary and release-bundle contract
- `content/library.json` — data-driven Library/world/locale registry
- `en/` and `de/` — canonical locale roots with localized Telanas landing, Volume 1 Reader, and Lexicon routes
- `assets/library-shell.js` — route-aware shared shell behavior for canonical pages
- `assets/reader/` — canonical reader engine, presentation, page-turn, progress, and bookmark behavior
- `assets/lexicon/` — canonical spoiler-aware Lexicon browsing, relationships, built-in search, and Reader references
- `assets/timeline/` and canonical Timeline routes — retained development implementation, intentionally outside the first public navigation
- `prototype/telanas/` — accepted development baseline for deferred Map and standalone Search work
- `fixtures/release-bundles/` — neutral deterministic bundle fixtures used to verify the import boundary

`npm run validate` checks public content manifests, semantic links and relationships, deferred Timeline/Map data, canonical production routes, illustration contracts, and the neutral release-bundle fixture. Route validation also checks that the first-version canonical landing and Lexicon do not expose deferred Timeline, Map, or standalone Search links.

`npm run import:bundle -- <bundle-directory>` performs a non-mutating dry run. Actual file writes require explicit import flags as described in `docs/publication-pipeline.md`.

## Main work still ahead

- keep the Reader stable and finish the first-version Reader/Lexicon presentation;
- build the private-source exporter/parser that produces deterministic release bundles;
- add release-approved manuscript text and short spoiler-aware Lexicon content for characters, locations, and already-revealed events;
- add production illustrations, cover/hero assets, and released downloads when approved;
- refine reader pagination where useful without changing semantic anchors;
- revisit Timeline or standalone Search only when they add clear reader value;
- do not expose a Map until its geography is explicitly approved as stable;
- complete production QA and, only with explicit approval, deployment/publication.
