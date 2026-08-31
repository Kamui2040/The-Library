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

A localized edition must remain complete enough to stand on its own. The public site must not silently fill missing German text with English or vice versa.

## 5. Book manifest

A public book manifest owns reader-visible structure such as:

- world/story/book IDs;
- publication/content state;
- localized series and volume labels;
- ordered chapter IDs/slugs;
- localized chapter labels;
- one public edition-file reference per released locale;
- a central registry of illustration assets used by the book.

The reader-side table of contents and the integrated book Contents page both derive from this same ordered chapter list.

Illustration assets use stable IDs. A production `image` asset stores one relative path and an aspect ratio in the book manifest. The path must stay inside the book content directory and resolve to a regular non-symlink file. A neutral `placeholder` asset is allowed only for development/prototype content, must be marked `prototypeOnly`, and stores no image path. Rights and provenance for production illustration files remain a separate acceptance requirement.

Prototype manifests contain no real manuscript prose. They exist only to exercise the publication/reader structure safely.

## 6. Reader editions and semantic anchors

Each locale has a separate public reader-edition file. English and German are not combined into one bilingual payload.

A reader edition records:

- world/story/book identity;
- exactly one locale;
- content state and content mode;
- the same ordered chapter IDs as the book manifest;
- ordered semantic blocks inside each chapter.

The public block types are:

- `paragraph` — localized prose attached to a stable block ID;
- `scene-break` — a structural anchor/separator containing no prose;
- `illustration` — a semantic visual position attached to a registered book illustration asset.

An illustration block stores a stable block ID, asset ID, placement, localized alternative text, and an optional localized caption. Asset ID and placement must match across localized editions; alt text and captions may differ by language. The edition stores no arbitrary image URL and no rendered page number.

Current illustration placements are:

- `flow` — participates in normal adaptive pagination at its semantic source position;
- `full-page` — occupies its own rendered page at its semantic source position;
- `before-title` — occupies its own page before the generated chapter title page.

`before-title` exists specifically so an opening sequence can remain **illustration page → chapter title page → chapter text** while still using semantic anchors rather than fixed rendered page numbers. Continuous mode preserves the same logical order.

Illustration blocks are ordinary semantic anchors. Bookmarks, Lexicon reader links, language changes, layout changes, and repagination may resolve directly to them in the same way as paragraph and scene anchors.

Chapter IDs and block IDs are canonical semantic positions. Localized editions must use the same chapter IDs, block IDs, block types, and order. Illustration asset references and placements must also match. Only localized text differs.

The current prototype editions are explicitly `prototypeOnly` and contain neutral implementation text and neutral illustration placeholders rather than Telanas manuscript or story artwork.

Rendered pages are created dynamically by the browser. The prototype measures whole semantic blocks against the current page surface, keeps chapter-title pages separate, gives `full-page`/`before-title` illustration blocks dedicated pages, and repaginates when layout, language, viewport width, or typography changes. This first implementation does not split a paragraph across two rendered pages; a later renderer may become finer-grained without changing the stable anchors.

Reader position is stored by semantic anchor rather than rendered page number. Switching between spread, single-page, continuous, or localized editions therefore resolves the saved anchor again in the new presentation.

Reader completion may advance the spoiler profile by stable world/story/book ID. The reader supports three user choices: ask for confirmation at the end, update automatically, or leave completion entirely manual in the Lexicon. Merely reaching the final rendered position does not change spoiler visibility unless automatic updating is enabled or the reader explicitly confirms the prompt. Completion is monotonic within a story: rereading an earlier volume must never lower a later completed volume. Layout-specific end detection never becomes a public content identifier; the saved completion value remains the stable book ID.

## 7. Lexicon manifest

A world may reference one public Lexicon manifest.

The Lexicon manifest owns:

- stable category IDs and localized labels;
- stable entry IDs;
- localized public titles and summaries;
- reveal-gated public fragments;
- the story/volume reveal points that determine normal visibility;
- optional semantic reader references attached to revealed fragments;
- optional relationships between Lexicon entries.

Current reveal modes are:

- `always` — visible regardless of reading progress;
- `completed-volume` — visible only once the configured story volume is marked completed;
- `full-spoilers` — visible only when the reader explicitly enables Full Spoilers.

The website must filter entries and fragments for the current spoiler profile **before** search, category-result rendering, relationship rendering, reader-link construction, or other presentation logic. Hidden entries must not leak through result counts, redacted titles, autocomplete suggestions, related-entry hints, or source links.

A fragment may contain a `readerLinks` array. Each reader link uses a stable link ID, target story ID, target book ID, semantic anchor, and one display label per Lexicon locale. The manifest stores no rendered page number and no arbitrary URL. The website derives the reader route from the stable IDs and opens the target anchor through the reader's normal semantic-location handling.

Reader links inherit the visibility of their containing fragment. A hidden fragment's links must remain absent from the DOM and search data. A visible link must resolve to a real anchor—including an illustration anchor when used—in every localized edition exposed by the Lexicon, so switching language cannot turn a valid source link into a missing location.

An entry may contain a `relationships` array. Each relationship uses a stable relationship ID, a target Lexicon entry ID, and one localized relationship label per Lexicon locale. Relationships store no arbitrary URL. A relationship is rendered or added to search data only after both its source entry and target entry pass the current spoiler profile. If the target is hidden, the relationship must be absent rather than shown as a redacted or locked hint.

Visible relationship controls may navigate to the target entry inside the currently filtered Lexicon view. The target title is resolved from the current locale at render time rather than duplicated into the relationship record.

Prototype-only Lexicon entries may be used to exercise reveal, reader-link, and relationship behavior, but they must be clearly marked as prototype data and must not contain unreleased story lore.

## 8. Release bundle boundary

The private source side produces a **release bundle**. The Library consumes that bundle instead of reading the private repository directly.

A release bundle is a directory containing `bundle.json` plus only the selected public payload files. `bundle.json` identifies:

- schema and bundle ID;
- content state;
- source world/story/book and a release-selection ID;
- target world/story/book;
- every payload path;
- the exact target path under `content/`;
- a SHA-256 digest for every payload file.

The bundle deliberately does not need to record private repository URLs, local checkout paths, Drive paths, or other internal topology.

Version 1 accepts bundle states `prototype`, `approved`, and `published`. The Library tooling accepts `prototype` bundles normally. `approved` or `published` bundles require the explicit `--allow-release-content` acknowledgement so actual release material cannot be imported accidentally during ordinary prototype work.

Bundle validation rejects:

- absolute paths, `..`, empty path segments, and targets outside `content/`;
- symbolic-link payload files;
- duplicate source or target paths;
- missing or mismatched SHA-256 digests;
- source/target world, story, or book mismatches;
- known book/Lexicon payloads whose IDs or state do not match the bundle.

Reader-edition files and approved illustration assets may travel in the same deterministic bundle. Their semantic/localization and illustration-contract validation occurs through normal repository validation after import.

The neutral fixture at `fixtures/release-bundles/telanas-volume-01-prototype/` proves this transport contract without using manuscript prose or private lore.

## 9. Import behavior

Validate any supplied bundle with:

```text
node scripts/validate-release-bundle.mjs <bundle-directory>
```

For real approved/published release material, validation additionally requires:

```text
--allow-release-content
```

The importer is dry-run by default:

```text
npm run import:bundle -- <bundle-directory>
```

A dry run validates hashes and target safety, then reports what would change. It writes nothing.

Writing requires the explicit `--apply` flag. Replacing an existing target with different bytes additionally requires `--replace`. If the target already has the expected SHA-256, the importer treats it as unchanged.

Importing a bundle changes only the working repository content. It does **not** approve deployment, make the repository public, create a release, or publish the site. Repository validation and normal review still follow before acceptance.

## 10. Validation

`npm run validate` runs the dependency-free public-content validator, the semantic Lexicon reader-link validator, the semantic Lexicon relationship validator, and the neutral release-bundle fixture validator.

The validators check:

- Library/world/book/Lexicon manifest references resolve;
- stable IDs and slugs use safe formats and remain unique in their scope;
- manifest states use the allowed state set;
- enabled locales are known to the Library/world;
- every book locale has a registered reader-edition file;
- reader-edition world/story/book/locale/state/content-mode identity matches its book manifest;
- localized reader editions contain the same chapters, semantic block IDs, block types, and order;
- paragraph blocks contain text and scene-break blocks do not contain prose;
- illustration assets use valid unique IDs, supported modes, aspect ratios, and safe paths;
- prototype illustration placeholders are explicitly marked and cannot appear in approved/published books;
- illustration blocks reference known assets and have localized alternative text;
- illustration asset IDs and placements match across localized editions;
- `before-title` illustration blocks precede chapter body blocks;
- prototype placeholder editions are explicitly marked `prototypeOnly`;
- prototype book manifests do not contain embedded story-text fields;
- Lexicon categories and entries use valid unique IDs;
- Lexicon localized titles, summaries, fragments, category labels, reader-link labels, and relationship labels are complete;
- completed-volume reveal gates resolve to an existing public story and volume;
- every semantic Lexicon reader link resolves to an existing story, book, and anchor in every relevant locale;
- Lexicon reader links use stable IDs rather than stored URLs or rendered page numbers;
- Lexicon relationships use stable IDs, resolve to existing entries, and do not store URLs;
- prototype Full Spoilers entries are explicitly marked `prototypeOnly`;
- duplicate world/story/book/chapter/reader-anchor/Lexicon/link/relationship IDs are rejected.

The release-bundle validator independently checks the deterministic transport envelope and file hashes before any import is allowed.

Validation cannot establish illustration ownership or publication rights; those remain a manual acceptance gate.

Validation will expand when real release text, production illustrations, cross-story reveal rules, and more complex relationship types are introduced.

## 11. Publication acceptance

Before any actual story release is accepted into The Library, review must separately confirm:

- exact source release scope;
- localization completeness and semantic alignment;
- spoiler boundary;
- asset rights/provenance;
- no private/unreleased material is included;
- bundle hashes and target mapping are correct;
- semantic references resolve;
- reader/build checks pass;
- deployment/publication approval has been given for any external release action.
