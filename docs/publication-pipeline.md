# Publication Pipeline

**Status:** Working contract

The Library is publication-safe by design. Private creative repositories remain the source of truth; The Library receives only material deliberately approved for public presentation.

## 1. Boundary

Private source repositories may contain manuscript drafts, canon notes, future plot material, internal references, private assets, and other material that must never be copied wholesale into The Library.

The Library may contain:

- website and reader implementation;
- public world/story/book metadata;
- approved released text;
- approved public Lexicon fragments;
- approved public updates/download metadata;
- approved assets with usable rights/provenance;
- development placeholders that reveal no private story material.

The Library must not contain:

- unreleased manuscript text;
- private planning or future lore;
- hidden spoiler material beyond the intended public release;
- private Drive/workspace topology;
- machine-specific state;
- secrets, credentials, signing/recovery material, or personal data;
- external assets without acceptable publication rights.

## 2. Content states

Public manifests use an explicit state:

- `development` — site/world structure under development; no release implication.
- `prototype` — neutral placeholder content used to exercise the reader/site.
- `approved` — content has been deliberately accepted for a future public release but is not yet published.
- `published` — content is part of the public Library release.

Changing content to `approved` or `published` is not a substitute for the user's publication approval. Public deployment, release creation, or repository visibility changes remain separate approval-gated actions.

## 3. Stable hierarchy

The public data hierarchy is:

```text
Library
└── world
    └── story
        └── book/volume
            └── chapter
```

Stable IDs are language-independent. Localized display text lives alongside those IDs.

Current example:

```text
world: telanas
story: dragon-knight
book: volume-01
chapter: dk-v01-ch01
```

## 4. Locale registry

The Library-level manifest owns the locale registry. A world or book may expose only locales registered there.

A localized edition must remain complete enough to stand on its own. The public site must not silently fill missing German text with English or vice versa.

## 5. Book manifest

A public book manifest owns reader-visible structure such as:

- world/story/book IDs;
- publication/content state;
- localized series and volume labels;
- ordered chapter IDs/slugs;
- localized chapter labels;
- public illustration references when applicable;
- later, approved public semantic anchors and text references.

The reader-side table of contents and the integrated book Contents page must both be generated from this same ordered chapter list.

Prototype manifests contain no real manuscript prose. They exist only to exercise the publication/reader structure safely.

## 6. Import/export direction

The eventual source-side publication step should produce a deterministic public bundle containing only explicitly selected release material. The Library consumes that bundle; it must not require direct unrestricted access to the private creative repository during normal website builds.

A future exporter may verify private manuscript semantic markers before creating the bundle, but website code stays in The Library.

## 7. Validation

`npm run validate` runs the repository's dependency-free content validator.

The validator currently checks:

- Library/world/book manifest references resolve;
- stable IDs and slugs use safe formats and remain unique in their scope;
- manifest states use the allowed state set;
- enabled locales are known to the Library;
- every prototype chapter has a label for every book locale;
- prototype manifests do not contain story-text fields;
- duplicate world/story/book/chapter IDs are rejected.

Validation will expand when real release bundles, Lexicon fragments, illustrations, and semantic anchors are introduced.

## 8. Publication acceptance

Before any actual story release is accepted into The Library, review must separately confirm:

- exact source release scope;
- localization completeness;
- spoiler boundary;
- asset rights/provenance;
- no private/unreleased material is included;
- semantic references resolve;
- reader/build checks pass;
- deployment/publication approval has been given for any external release action.
