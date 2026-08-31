# Publication Pipeline

**Status:** Working contract

The Library is publication-safe by design. Private creative repositories remain the source of truth; The Library receives only material deliberately approved for public presentation.

## 1. Boundary

Private source repositories may contain manuscript drafts, canon notes, future plot material, internal references, private assets, and other material that must never be copied wholesale into The Library.

The Library may contain:

- website and reader implementation;
- public world/story/book metadata;
- approved released text;
- approved public Lexicon fragments and relationships;
- approved public Timeline events;
- approved public Map locations/geography data;
- approved public updates/download metadata;
- approved assets with usable rights/provenance;
- neutral development placeholders that reveal no private story material.

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

- `development` — site/world structure under development; no release implication;
- `prototype` — neutral placeholder content used to exercise the reader/site;
- `approved` — content deliberately accepted for a future public release but not yet published;
- `published` — content included in the public Library release.

Changing content to `approved` or `published` is not a substitute for publication approval. Public deployment, release creation, or repository visibility changes remain separate approval-gated actions.

## 3. Stable hierarchy

The current public data hierarchy is:

```text
Library
└── world
    ├── story
    │   └── book/volume
    │       ├── illustration asset registry
    │       ├── chapter
    │       │   └── semantic reader block
    │       └── localized edition
    ├── Lexicon
    │   └── entry
    │       ├── reveal-gated fragment
    │       └── spoiler-safe relationship
    ├── Timeline
    │   └── reveal-gated event
    └── Map
        └── reveal-gated marker
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

World Search is intentionally not another content branch. It derives searchable records from the already-public Lexicon, Timeline, and Map after spoiler filtering.

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

The reader-side table of contents and integrated book Contents page derive from the same ordered chapter list.

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

Current public block types are:

- `paragraph` — localized prose attached to a stable block ID;
- `scene-break` — structural anchor/separator containing no prose;
- `illustration` — semantic visual position attached to a registered book illustration asset.

An illustration block stores a stable block ID, asset ID, placement, localized alternative text, and optional localized caption. Asset ID and placement must match across localized editions; alt text and captions may differ by language. The edition stores no arbitrary image URL and no rendered page number.

Current illustration placements are:

- `flow` — participates in normal adaptive pagination;
- `full-page` — occupies its own rendered page;
- `before-title` — occupies its own page before the generated chapter title page.

`before-title` preserves the established sequence:

```text
illustration page → chapter title page → chapter text
```

Illustration blocks are ordinary semantic anchors. Bookmarks, Lexicon links, Timeline links, Map links, language changes, layout changes, and repagination may resolve directly to them.

Chapter IDs and block IDs are canonical semantic positions. Localized editions must use the same chapter IDs, block IDs, block types, and order. Illustration asset references and placements must also match. Only localized text differs.

The current prototype editions are explicitly `prototypeOnly` and contain neutral implementation text and neutral illustration placeholders rather than Telanas manuscript or story artwork.

Rendered pages are created dynamically by the browser. The prototype paginates whole semantic blocks and repaginates when layout, language, viewport width, or typography changes. It does not currently split one paragraph across multiple rendered pages; a later renderer may become finer-grained without changing stable anchors.

Reader position and bookmarks are stored by semantic identity rather than rendered page number.

Reader completion may advance the spoiler profile by stable world/story/book ID. The reader supports asking at the end, automatic updating, or fully manual progress. Completion is monotonic within a story: rereading an earlier volume must never lower a later completed volume.

## 7. Shared spoiler rules

Current reveal modes are:

- `always` — visible regardless of reading progress;
- `completed-volume` — visible once the configured story volume is marked completed;
- `full-spoilers` — visible only when Full Spoilers is enabled.

Full Spoilers deliberately bypasses normal reveal gates, including when no volume is marked completed.

Filtering happens before normal rendering, relationship construction, source linking, map/timeline presentation, and cross-feature search indexing.

If existence itself is a spoiler, hidden material must not leak through titles, counts, placeholders, gaps, redacted cards, autocomplete, relationship hints, source links, map pins, timeline markers, or search terms.

## 8. Lexicon manifest

A world may reference one public Lexicon manifest.

The Lexicon manifest owns:

- stable category IDs and localized labels;
- stable entry IDs;
- localized public titles and summaries;
- reveal-gated public fragments;
- story/volume reveal points;
- optional semantic reader references attached to revealed fragments;
- optional relationships between entries.

A fragment may contain a `readerLinks` array. Each link uses a stable link ID, target story ID, target book ID, semantic anchor, and one display label per Lexicon locale. The manifest stores no rendered page number and no arbitrary URL. The site derives the reader route from stable IDs.

Reader links inherit the visibility of their containing fragment. A hidden fragment's links remain absent from DOM and search data. Visible links must resolve to real anchors in every relevant localized edition.

A relationship uses a stable relationship ID, target Lexicon entry ID, and localized label. It stores no arbitrary URL. A relationship is rendered or searchable only after both source and target entries pass the current spoiler profile. Hidden targets produce no redacted/locked hint.

Prototype-only Lexicon entries may exercise reveal, reader-link, and relationship behavior, but must be clearly marked and must not contain unreleased story lore.

## 9. Timeline manifest

A world may reference one public Timeline manifest. Timeline events use the same spoiler-profile contract as the Lexicon.

Each event owns:

- stable event ID;
- stable integer `order` used only to arrange currently visible events;
- visibility rule;
- localized period, title, and summary text;
- optional semantic reader links.

Event existence is filtered before rendering or search. A hidden event contributes no period label, title, summary, reader-link label, placeholder, count, gap marker, or search term. The visible Timeline may therefore be intentionally incomplete without revealing where hidden chronology exists.

Timeline reader links use the stable story/book/anchor model, store no rendered page number or arbitrary URL, and must resolve in every relevant locale.

Prototype Timeline events must be marked `prototypeOnly` and contain neutral development text rather than real chronology, manuscript events, or future canon.

## 10. Map manifest

A world may reference one public Map manifest. Map markers use the same spoiler-profile contract as the Lexicon and Timeline.

Each marker owns:

- stable marker ID;
- stable integer `order`;
- normalized presentation coordinates;
- visibility rule;
- localized type/title/summary text;
- optional semantic reader links.

Marker existence is filtered before map rendering, list rendering, or search. A hidden marker contributes no pin, label, title, summary, reader-link label, list item, placeholder, count, or search term.

Normalized marker coordinates are presentation data for the current map representation; they are not manuscript locations, rendered page numbers, or substitute semantic IDs.

Map reader links use stable story/book/anchor targets and store no arbitrary URL.

Prototype Map markers must be marked `prototypeOnly` and contain neutral development positions/text rather than real Telanas geography, place names, or future canon.

## 11. World Search

World Search is a derived presentation layer over the public Lexicon, Timeline, and Map manifests.

It must:

- apply the shared spoiler profile before constructing searchable records;
- include Lexicon relationship terms only when their target entry is also visible;
- include only visible Timeline events and Map markers;
- expose no hidden result counts or source hints;
- preserve localized display text;
- construct semantic reader routes from stable IDs;
- link visible results back to exact stable source targets.

It does not own or duplicate public story/world content. An empty query intentionally produces no automatic dump of all eligible content; Full Spoilers changes eligibility but does not remove the requirement for a search term.

## 12. Release bundle boundary

The private source side produces a **release bundle**. The Library consumes that bundle instead of reading the private repository directly.

A release bundle is a directory containing `bundle.json` plus only selected public payload files. `bundle.json` identifies:

- schema and bundle ID;
- content state;
- source world/story/book and a release-selection ID;
- target world/story/book;
- every payload path;
- exact target path under `content/`;
- SHA-256 digest for every payload file.

The bundle does not need private repository URLs, local checkout paths, Drive paths, or other internal topology.

Version 1 accepts bundle states `prototype`, `approved`, and `published`. Prototype bundles are accepted normally. `approved` or `published` bundles require explicit `--allow-release-content` acknowledgement so real release material cannot be imported accidentally during prototype work.

Bundle validation rejects:

- absolute paths, `..`, empty path segments, and targets outside `content/`;
- symbolic-link payload files;
- duplicate source or target paths;
- missing or mismatched SHA-256 digests;
- source/target world, story, or book mismatches;
- known payloads whose IDs or state do not match the bundle.

Reader-edition files and approved illustration assets may travel in the same deterministic bundle. Semantic/localization and illustration-contract validation occurs through normal repository validation after import.

The neutral fixture at `fixtures/release-bundles/telanas-volume-01-prototype/` proves this transport contract without manuscript prose or private lore.

The Library-side bundle validator/importer exists. The private-source exporter/parser that selects approved material and emits these bundles remains production work.

## 13. Import behavior

Validate any supplied bundle with:

```text
node scripts/validate-release-bundle.mjs <bundle-directory>
```

Real approved/published release material additionally requires:

```text
--allow-release-content
```

The importer is dry-run by default:

```text
npm run import:bundle -- <bundle-directory>
```

A dry run validates hashes and target safety, then reports what would change. It writes nothing.

Writing requires explicit `--apply`. Replacing an existing target with different bytes additionally requires `--replace`. If the target already has the expected SHA-256, the importer treats it as unchanged.

Importing a bundle changes only working repository content. It does **not** approve deployment, make the repository public, create a release, or publish the site. Repository validation and normal review still follow before acceptance.

## 14. Validation

`npm run validate` currently runs:

- dependency-free public-content validation;
- semantic Lexicon reader-link validation;
- semantic Lexicon relationship validation;
- spoiler-safe Timeline validation;
- spoiler-safe Map validation;
- neutral release-bundle fixture validation.

The validators check, among other things:

- Library/world/book/Lexicon/Timeline/Map manifest references resolve;
- stable IDs and slugs use safe formats and remain unique in scope;
- manifest states use allowed values;
- enabled locales are known to the Library/world;
- every book locale has a registered reader-edition file;
- reader-edition identity matches its book manifest;
- localized editions contain the same chapters, semantic block IDs, block types, and order;
- paragraph blocks contain text and scene breaks do not contain prose;
- illustration assets use valid IDs, modes, aspect ratios, and safe paths;
- prototype illustration placeholders are explicitly marked and excluded from approved/published books;
- illustration blocks reference known assets and have localized alternative text;
- illustration asset IDs and placements match across localized editions;
- `before-title` blocks precede chapter body blocks;
- prototype editions/manifests cannot silently masquerade as release content;
- Lexicon categories, entries, links, and relationships use valid unique IDs;
- Lexicon localized titles, summaries, fragments, category labels, reader-link labels, and relationship labels are complete;
- completed-volume reveal gates resolve to existing public stories and volumes;
- semantic reader links resolve in every relevant locale and store no URLs/page numbers;
- Lexicon relationships resolve to existing entries and store no URLs;
- Timeline event IDs/order values are unique, localized text is complete, reveal gates resolve, and reader links are valid;
- Map marker IDs/order values are unique, coordinates are valid normalized positions, localized text is complete, reveal gates resolve, and reader links are valid;
- prototype Timeline events and Map markers are explicitly marked `prototypeOnly`;
- duplicate world/story/book/chapter/reader-anchor/Lexicon/link/relationship/Timeline/Map IDs are rejected.

World Search adds no content store, so it relies on those validated manifests and applies the same visibility rules at runtime.

The release-bundle validator independently checks the deterministic transport envelope and file hashes before import.

Validation cannot establish illustration/map/cover ownership or publication rights; those remain manual acceptance gates.

Validation will expand when real release text, production illustrations, real chronology/geography, additional worlds/stories, and more complex relationship/reveal rules are introduced.

## 15. Publication acceptance

Before any actual story/world release is accepted into The Library, review must separately confirm:

- exact source release scope;
- localization completeness and semantic alignment;
- spoiler boundary;
- asset rights/provenance;
- no private/unreleased material is included;
- bundle hashes and target mapping are correct;
- semantic references resolve;
- reader/build/runtime checks pass;
- production routes behave correctly;
- deployment/publication approval has been given for any external release action.
