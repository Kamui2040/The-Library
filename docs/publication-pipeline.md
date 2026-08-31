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
- approved public updates and download metadata;
- approved assets with usable rights and provenance;
- neutral development placeholders that reveal no private story material.

The Library must not contain:

- unreleased manuscript text;
- private planning or future lore;
- hidden spoiler material beyond the intended public release;
- private Drive/workspace topology or machine-specific state;
- secrets, credentials, signing/recovery material, or personal data;
- external assets without acceptable publication rights.

## 2. Content states

Public manifests use an explicit state:

- `development` — structure under development; no release implication.
- `prototype` — neutral placeholder content used to exercise the site or reader.
- `approved` — deliberately accepted for a future public release but not yet published.
- `published` — part of the public Library release.

Changing content to `approved` or `published` does not approve deployment. Public deployment, release creation, or repository visibility changes remain separate approval-gated actions.

## 3. Stable hierarchy

```text
Library
└── world
    ├── story
    │   └── book/volume
    │       ├── illustration asset registry
    │       ├── chapter
    │       │   └── semantic reader block
    │       └── localized edition
    └── Lexicon
        └── entry
            └── reveal-gated fragment
```

Stable IDs are language-independent. Localized display text lives alongside those IDs.

Current example:

```text
world: telanas
story: dragon-knight
book: volume-01
chapter: dk-v01-ch01
anchor: dk-v01-ch01-p001
```

## 4. Locale registry

The Library-level manifest owns the locale registry. A world or book may expose only locales registered there.

Each localized edition must stand on its own. The public site must not silently fill missing German text with English or vice versa.

## 5. Book manifest

A public book manifest owns reader-visible structure such as:

- world/story/book IDs;
- publication and content state;
- localized series and volume labels;
- ordered chapter IDs and slugs;
- localized chapter labels;
- one public edition-file reference per released locale;
- a central registry of illustration assets used by the book.

The reader-side table of contents and the integrated Contents page both derive from the same ordered chapter list.

Each illustration asset has a stable asset ID, mode, and aspect ratio. A production `image` asset stores one relative path in the book manifest. An asset path must stay inside the book content directory and resolve to a regular non-symlink file. A neutral `placeholder` asset may be used only for development/prototype work, must be marked `prototypeOnly`, and stores no image path.

Production illustration files require separate rights and provenance review. The registry does not replace that approval.

Prototype manifests contain no real manuscript prose or story artwork. They exist only to exercise the publication and reader structure safely.

## 6. Reader editions and semantic anchors

Each locale has a separate public reader-edition file. English and German are not combined into one bilingual payload.

A reader edition records:

- world/story/book identity;
- exactly one locale;
- content state and content mode;
- the same ordered chapter IDs as the book manifest;
- ordered semantic blocks inside each chapter.

Supported semantic block types are:

- `paragraph` — localized prose attached to a stable block ID;
- `scene-break` — a structural anchor containing no prose;
- `illustration` — a semantic visual position attached to a registered illustration asset.

An illustration block stores:

- its stable semantic block ID;
- the registered asset ID;
- placement: `flow`, `full-page`, or `before-title`;
- localized alternative text;
- an optional localized caption.

Asset ID and placement must match across localized editions. Alternative text and captions are localized independently. The edition does not store an arbitrary image URL or duplicate the asset path.

`flow` illustrations participate in normal adaptive pagination. `full-page` illustrations occupy their own rendered page at their semantic source position. `before-title` illustrations also occupy their own page, but are rendered before the generated chapter title page. This preserves the approved opening sequence of illustration page → chapter title page → chapter text without tying it to a rendered page number. Continuous mode keeps the same semantic order.

The reader renders an illustration as a semantic `figure`; a production asset uses its localized alternative text, while a neutral prototype placeholder exposes the same accessible description without requiring an image file.

Illustration positions are ordinary semantic anchors. Bookmarks, reader links, language changes, layout changes, and viewport repagination resolve them in the same way as paragraph and scene anchors.

Chapter IDs and block IDs are canonical semantic positions. Localized editions must use the same chapter IDs, block IDs, block types, asset references, placements, and order. Only localized text differs.

Rendered pages are temporary presentation data. The browser measures whole semantic blocks against the current page surface and repaginates when layout, language, viewport, or typography changes. This implementation does not split a paragraph across pages; a later renderer may become finer-grained without changing stable anchors.

Reader position is stored by semantic anchor rather than rendered page number. Switching between spread, single-page, continuous, or localized editions therefore resolves the saved anchor again in the new presentation.

Reader completion may advance the spoiler profile by stable world/story/book ID. The reader supports three choices: ask for confirmation at the end, update automatically, or leave completion manual in the Lexicon. Merely reaching the final rendered position changes nothing unless automatic updating is enabled or the reader explicitly confirms the prompt. Completion is monotonic within a story: rereading an earlier volume must never lower a later completed volume.

## 7. Lexicon manifest

A world may reference one public Lexicon manifest.

The Lexicon manifest owns:

- stable category and entry IDs;
- localized public titles and summaries;
- reveal-gated public fragments;
- story/volume reveal points;
- optional semantic reader references attached to revealed fragments.

Current reveal modes are:

- `always` — visible regardless of reading progress;
- `completed-volume` — visible once the configured volume is marked complete;
- `full-spoilers` — visible only when Full Spoilers is enabled.

The website filters entries and fragments for the current spoiler profile **before** search, category rendering, relationship rendering, reader-link construction, or other presentation logic. Hidden content must not leak through counts, redacted titles, autocomplete, related-entry hints, or source links.

A fragment may contain `readerLinks`. Each link uses a stable link ID, story ID, book ID, semantic anchor, and one display label per Lexicon locale. The manifest stores no rendered page number and no arbitrary URL. The target anchor may identify a chapter, paragraph, scene break, or illustration.

Reader links inherit their fragment's visibility. A visible link must resolve in every localized edition exposed by the Lexicon.

Prototype-only entries may exercise reveal and reader-link behavior, but must not contain unreleased story lore.

## 8. Release bundle boundary

The private source side produces a **release bundle**. The Library consumes that bundle instead of reading a private repository directly.

A bundle contains `bundle.json` plus only selected public payload files. The envelope identifies:

- schema and bundle ID;
- content state;
- source world/story/book and release-selection ID;
- target world/story/book;
- every payload path and exact target path under `content/`;
- a SHA-256 digest for every payload file.

It deliberately omits private repository URLs, local checkout paths, Drive paths, and other internal topology.

Version 1 accepts `prototype`, `approved`, and `published` bundles. `approved` or `published` material requires explicit `--allow-release-content` acknowledgement.

Bundle validation rejects unsafe paths, symbolic-link payloads, duplicate source/target paths, missing or mismatched hashes, identity mismatches, and known book/Lexicon payloads whose IDs or state disagree with the envelope.

Reader editions and approved illustration files may travel in the same deterministic bundle. Their content, structure, path, and semantic-reference validation runs after import.

## 9. Import behavior

Validate a bundle with:

```text
node scripts/validate-release-bundle.mjs <bundle-directory>
```

Approved/published material additionally requires:

```text
--allow-release-content
```

The importer is dry-run by default:

```text
npm run import:bundle -- <bundle-directory>
```

Writing requires `--apply`. Replacing a different existing target additionally requires `--replace`. Matching content is treated as unchanged.

Importing changes only repository content. It does not approve deployment, make the repository public, create a release, or publish the site.

## 10. Validation

`npm run validate` runs the public-content validator, semantic Lexicon reader-link validator, and neutral release-bundle fixture validator.

Validation checks include:

- manifest references, states, IDs, slugs, and locale registration;
- reader-edition identity and EN/DE semantic structure parity;
- paragraph, scene-break, and illustration block contracts;
- illustration asset registry IDs, modes, aspect ratios, relative paths, and file existence;
- prototype placeholder marking and prohibition in approved/published books;
- localized illustration alternative text and optional captions;
- matching illustration asset references and placements across editions;
- `before-title` illustration markers occurring before chapter body blocks;
- Lexicon categories, entries, reveal gates, localization, and reader-link targets;
- stable semantic targets rather than URLs or rendered page numbers;
- duplicate IDs and anchors;
- deterministic release-bundle paths and hashes.

Validation cannot prove illustration ownership or publication permission. Rights and provenance remain a manual acceptance gate.

## 11. Publication acceptance

Before actual story material is accepted into The Library, review must separately confirm:

- exact source release scope;
- localization completeness and semantic alignment;
- spoiler boundary;
- illustration and other asset rights/provenance;
- no private or unreleased material is included;
- bundle hashes and target mapping are correct;
- semantic references resolve;
- reader/build checks pass;
- deployment/publication approval exists for any external release action.
