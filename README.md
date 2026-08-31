# The Library

The Library is a fiction website and web reader designed to host multiple independent worlds and story series under one shared reading platform.

Telanas is the first world planned for the Library.

The repository is currently private while the site architecture, reader, and publication workflow are being developed. Public publication and repository visibility remain separate approval steps.

The repository contains only publication-safe website material and neutral development placeholders. Private manuscripts, canon planning, unreleased lore, and private creative assets remain in their source repositories until an explicit release/export step approves them for The Library.

## Current foundation

- `docs/site-foundation.md` — information architecture, localization, spoiler, and reader model
- `docs/visual-system.md` — shared Library and Telanas visual direction
- `docs/publication-pipeline.md` — private-source to public-Library boundary and release-bundle contract
- `content/library.json` — data-driven Library/world/locale registry
- `prototype/telanas/` — current Telanas landing, reader, and spoiler-aware Lexicon prototype
- `fixtures/release-bundles/` — neutral deterministic bundle fixtures used to verify the import boundary

`npm run validate` checks both the public content manifests and the neutral release-bundle fixture. The validators have no third-party runtime dependencies.

`npm run import:bundle -- <bundle-directory>` performs a non-mutating dry run. Actual file writes require explicit import flags as described in `docs/publication-pipeline.md`.
