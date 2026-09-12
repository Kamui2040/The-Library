# The Library

The Library is a fiction website and web reader designed to host independent worlds and story series under one shared reading platform.

The repository and published site are public. Read The Library at <https://kamui2040.github.io/The-Library/>.

The repository contains only publication-safe website material and neutral development placeholders. Private manuscripts, canon planning, unreleased lore, and private creative assets remain in their source repositories until an explicit release/export step approves them for The Library.

## Current reader-facing surface

Telanas currently focuses on two connected systems:

- a stable localized Reader;
- a spoiler-aware Lexicon with built-in search and short entries for characters, locations, events, and other reference material the reader is allowed to know about.

The Reader can show explicit contextual Lexicon references directly inside the prose. Tapping or clicking one opens a small overlay card instead of leaving the Reader. The card and the dedicated Lexicon use the same spoiler-eligibility calculation.

Spoiler progress supports both completed volumes and sparse semantic milestones inside a volume. This lets an entry keep a safe base description while later details remain absent until the reader reaches the relevant story anchor. Re-reading earlier material does not lower reached progress, and completing a volume supersedes its internal milestones.

Locations do not depend on a map. A Telanas map is not exposed until the geography is explicitly approved as stable enough for a definitive map.

## Current foundation

- `docs/site-foundation.md` — information architecture, localization, spoiler, contextual Lexicon, and Reader model
- `docs/visual-system.md` — shared Library and Telanas visual direction
- `docs/publication-pipeline.md` — private-source to public-Library boundary and release-bundle contract
- `docs/epub-publication.md` — EPUB 3.3 build and distribution-preparation contract
- `docs/volume-01-afterword.md` — shared Volume 1 afterword contract across website, PDF, and EPUB
- `content/library.json` — data-driven Library/world/locale registry
- `en/` and `de/` — canonical locale roots with localized Telanas landing, Volume 1 Reader, and Lexicon routes
- `assets/library-shell.js` — route-aware shared shell behavior for canonical pages
- `assets/spoiler-profile.js` — shared completed-chapter and reached-anchor spoiler profile
- `assets/reader/` — canonical Reader engine, presentation, page-turn, progress, section-aware bookmarks, contextual Lexicon, and first-class back matter
- `assets/lexicon/` — canonical spoiler-aware Lexicon browsing, relationships, built-in search, and Reader references
- `assets/timeline/` — retained spoiler-aware chronology module, not exposed in the current reader-facing navigation
- `output/pdf/` — downloadable illustrated English and German editions of the released volume
- `output/epub/` — generated illustrated English and German EPUB editions when built locally
- `scripts/build-volume-pdfs.py` — core deterministic A5 PDF builder for the released editions
- `scripts/build-volume-pdfs-release.py` — afterword-aware PDF release wrapper
- `scripts/build-volume-epubs.py` — deterministic reflowable EPUB 3.3 builder for the released editions
- `fixtures/release-bundles/` — neutral deterministic bundle fixtures used to verify the import boundary

`npm run validate` checks public content manifests, the shared afterword contract, semantic links and relationships, contextual Reader Lexicon references and milestones, retained chronology/map data, canonical production routes, illustration contracts, and the neutral release-bundle fixture.

`npm run build:pdfs` rebuilds both downloadable editions from the released Reader content and shared localized afterword. The builder requires ReportLab and the Noto Serif and Noto Sans font families.

`npm run build:epubs` rebuilds both conservative reflowable EPUB 3.3 editions from the same released Reader content and shared localized afterword. The builder requires Pillow. `npm run build:epubs:release` additionally requires the official EPUBCheck validator.

`npm run import:bundle -- <bundle-directory>` performs a non-mutating dry run. Actual file writes require explicit import flags as described in `docs/publication-pipeline.md`.
