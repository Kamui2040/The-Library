# The Library Repository Rules

## Project role

- The Library is the publication-safe website and reader for released fiction projects.
- This repository is FUTURE PUBLIC. Treat every tracked file as if it may later be visible publicly.
- The site is an umbrella library. Telanas currently uses its own world/series area; it is not the permanent identity of the whole site.

## Source boundary

- Private creative repositories such as `Kamui2040/Telanas` remain the source of truth for manuscripts, canon, planning, unreleased material, internal references, and private assets.
- Only deliberately approved released/public content may be copied or reproducibly exported into The Library.
- Never copy private planning, unreleased lore, hidden spoiler material beyond the intended public release, internal Drive topology, machine-specific state, secrets, credentials, personal data, or recovery/signing material into this repository.
- Public-facing derived content must be traceable to an approved source and must preserve rights/provenance for externally sourced assets.

## Site structure

- The Library is the common root for all fiction projects.
- Each world/series receives its own stable namespace and landing page. Telanas currently uses the `telanas` namespace.
- The architecture must support additional unrelated worlds/series without redesigning the root site.
- Shared Library behavior may be reused across series, while each series may define its own visual identity.
- Do not expose or productionize a Telanas map until the user explicitly approves the geography as stable. Lexicon location entries must remain useful without requiring final coordinates or map geometry.

## Localization and reader

- Site localization is data-driven. Only actually released languages are exposed.
- Released story editions remain separate localized editions; do not combine them into bilingual manuscripts.
- Reader navigation, bookmarks, spoiler references, and cross-links use stable semantic IDs rather than rendered page numbers.
- The integrated book contents page and reader-side table of contents must derive from the same ordered structure.

## Spoilers

- Spoiler filtering happens before normal rendering/search presentation.
- Information whose existence is itself a spoiler must remain absent until the reader's selected progress level permits it.
- Reader-facing copy must not imply unrevealed multiplicity, ordering, origins, future structure, or other facts merely through neutral-looking wording.
- Lexicon category controls are derived from currently spoiler-eligible entries. If no eligible entry exists in a category, that category name/control must not be rendered or hinted at.
- Full-spoiler mode may deliberately bypass reveal gates.

## Development and publication

- Linux/Bazzite is the maintainer environment.
- Keep implementation simple, responsive, accessible, and lightweight. Prefer HTML/CSS/SVG for interface decoration rather than unnecessary raster assets.
- GitHub Actions/cloud CI remain disabled unless explicitly approved for this project.
- Routine reversible repository work may use branches, commits, pull requests, review, merge, and cleanup once validation passes.
- Do not force-push, rewrite shared/default history, change repository visibility/default-branch policy, publish/deploy the site publicly, create a release, or perform another irreversible external publication action without explicit user approval.

## Validation

- Before merge, verify exact head/base, changed-file scope, mergeability, unresolved reviews, privacy/publication safety, rights/licence concerns, encoding, links/references where applicable, and relevant source/build/runtime checks.
- Run `git diff --check` when a local checkout is available and applicable.
- Do not claim runtime, build, or publication success unless that exact validation actually ran and completed successfully.

## Writing

- Repository prose and user-facing copy should remain simple, natural, and human.
- Keep durable rules here. Keep current implementation/design state concise and avoid duplicate handoff/archive documents.
