# The Library

The Library is a fiction website and web reader designed to host independent worlds and story series under one shared reading platform.

Telanas is the first world. The repository remains private while the production site, reader, and publication workflow are being prepared. Public deployment and repository visibility are separate approval-gated steps.

The repository contains only publication-safe website material and neutral development placeholders. Private manuscripts, canon planning, unreleased lore, and private creative assets remain in their source repositories until an explicit release/export step approves them for The Library.

## Current foundation

- `docs/site-foundation.md` — current information architecture, localization, spoiler, knowledge-view, and reader model
- `docs/visual-system.md` — shared Library and Telanas visual direction
- `docs/publication-pipeline.md` — private-source to public-Library boundary and release-bundle contract
- `content/library.json` — data-driven Library/world/locale registry
- `prototype/telanas/` — current Telanas landing page, reader, spoiler-aware Lexicon, Timeline, Map, and cross-feature Search
- `fixtures/release-bundles/` — neutral deterministic bundle fixtures used to verify the import boundary

The current prototype already proves shared EN/DE localization, the semantic reader, bookmarks, reader-completion spoiler progress, Lexicon relationships and reader links, Timeline, Map, and a unified spoiler-safe world search.

`npm run validate` checks the public content manifests, semantic links and relationships, Timeline, Map, illustration contracts, and the neutral release-bundle fixture. The validators have no third-party runtime dependencies.

`npm run import:bundle -- <bundle-directory>` performs a non-mutating dry run. Actual file writes require explicit import flags as described in `docs/publication-pipeline.md`.

## Main work still ahead

- convert the prototype routes and shell into the production locale/world route structure;
- build the private-source exporter/parser that produces deterministic release bundles;
- add release-approved manuscript text, Lexicon content, chronology, geography, illustrations, cover/hero assets, and downloads when they are ready;
- refine reader pagination where useful without changing semantic anchors;
- complete production QA and, only with explicit approval, deployment/publication.
