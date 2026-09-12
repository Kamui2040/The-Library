# The Library Site Foundation

**Status:** Working implementation foundation

The Library is the common fiction website and Reader. It is designed to host multiple independent worlds or series without forcing them to share one visual identity.

Telanas keeps a stable namespace so later Library expansion does not require changing its URLs.

# 1. Reader-facing architecture

## 1.1 Library level

The Library owns shared capabilities:

- K2040 project navigation;
- Library/world selection;
- language and theme handling;
- shared Reader engine;
- accessibility behavior;
- publication/content format;
- spoiler-profile behavior;
- common footer functions.

Each world or major fiction project may define its own stories, Lexicon, optional reference views, downloads, updates, and visual identity.

Current Telanas hierarchy:

```text
Telanas
└── The Dragon Knight
    └── Volume 1 — Home / Band 1 — Zuhause
```

## 1.2 Telanas surface

The current Telanas reader-facing surface has two connected systems:

1. **Reader** — localized reading with semantic navigation, bookmarks, presentation settings, spoiler progress, and contextual Lexicon cards.
2. **Lexicon** — spoiler-aware reference entries with built-in search.

The Lexicon can hold characters, locations, events, creatures, factions, history, magic, mythology, items, cultures, terminology, and other useful reference categories. The landing page intentionally emphasizes Characters, Places, and Events, while the dedicated Lexicon exposes any category that currently has at least one spoiler-eligible entry.

A standalone Timeline and standalone world-search page are not part of the current navigation. A retained Timeline route may support development and validation, but it is non-indexed and unlinked from the reader-facing surface.

The Map is not exposed until Telanas geography is explicitly approved as stable enough for a definitive map. Location entries therefore do not require final coordinates, distances, borders, roads, or map geometry.

## 1.3 Canonical routes

Canonical locale roots are:

```text
/en/
/de/
```

Telanas keeps permanent roots:

```text
/en/telanas/
/de/telanas/
```

Current reader-facing routes include:

```text
/en/telanas/read/dragon-knight/volume-01/
/en/telanas/lexicon/
/de/telanas/read/dragon-knight/volume-01/
/de/telanas/lexicon/
```

Structural route segments and stable IDs remain consistent across locales. Visible labels and titles are localized.

Language switching preserves the same semantic destination whenever equivalent localized content exists. Reader switching keeps the current query and semantic hash anchor. Lexicon switching preserves semantic `entry` and category query state without allowing a hidden target to bypass spoiler filtering.

# 2. Localization

Current locales:

```text
en — English
de — Deutsch
```

Only actually released languages appear publicly. Released story editions remain separate localized editions rather than one bilingual manuscript.

For any exposed locale:

- interface text must exist;
- released story content must exist;
- visible Lexicon content must exist;
- contextual Reader Lexicon annotations must resolve against that localized edition;
- public updates must not silently fall back to another language.

# 3. Spoiler-aware knowledge

## 3.1 Principle

Spoiler protection is based on explicit reader progress.

Filtering happens before normal rendering and search. If the existence of something is itself a spoiler, it remains absent until the selected progress permits it. It must not appear as a blurred result, redacted title, autocomplete suggestion, count, placeholder, category name, source hint, relationship hint, or contextual Reader link.

Full Spoilers explicitly bypasses normal reveal gates.

Spoiler protection prevents accidental spoilers; it is not a security boundary against someone deliberately inspecting public static data.

## 3.2 Progress profile

The spoiler profile tracks two kinds of progress:

```yaml
spoiler_profile:
  full_spoilers: false
  worlds:
    telanas:
      completed:
        dragon-knight: volume-01
      reached:
        dragon-knight:
          volume-01:
            - some-semantic-milestone
```

`completed` records the highest explicitly completed volume for a story.

`reached` records sparse semantic milestones encountered inside a volume. These are not every paragraph. A book declares only the anchors needed to control meaningful within-volume reveals.

Reached milestones advance monotonically. Returning to an earlier chapter or anchor never lowers them. Completing a volume automatically satisfies all within-volume gates for that volume.

Reader completion may offer to advance volume + chapter progress, update automatically if the reader chose that mode, or remain manual.

## 3.3 Visibility modes

Reader-facing knowledge currently supports these visibility concepts:

- `always` — visible whenever the entry itself is available;
- `reached-anchor` — visible after a declared semantic story milestone has been reached;
- `completed-chapter` — visible after the required chapter in the configured volume is marked complete;
- `full-spoilers` — visible only when Full Spoilers is enabled.

Entry existence and entry details are separate decisions. A character or location may have a safe general entry while one or more later fragments remain absent until an internal milestone or volume completion.

The same shared visibility function must be used by the dedicated Lexicon and contextual Reader cards.

## 3.4 Lexicon

Lexicon entries use stable metadata plus reveal-gated fragments rather than one monolithic article.

A normal entry may therefore contain:

- an existence gate;
- localized title and safe summary;
- zero or more fragments with their own visibility gates;
- semantic Reader references;
- relationships to other entries.

Search operates only on the already-eligible entry and fragment data. Hidden text must not enter the searchable set.

Entry relationships use stable target IDs and appear only when the target itself is visible. Category controls are derived from currently visible entries, so an empty or not-yet-revealed category cannot hint that hidden information exists.

Canonical Lexicon links may carry a stable `entry` target or category filter. Those parameters affect navigation only and never bypass the spoiler profile.

## 3.5 Contextual Reader Lexicon

The Reader can annotate selected words or phrases that correspond to Lexicon entries.

Contextual references are explicit publication data. They are tied to:

- a semantic Reader paragraph anchor;
- a stable Lexicon entry ID;
- the exact localized text to annotate;
- an occurrence number when the same text appears more than once in one paragraph.

The Reader does not automatically scan prose and link every word that resembles a Lexicon title. This avoids accidental links, false positives, unwanted emphasis, and spoiler hints.

When an explicit reference targets an entry whose existence is not yet allowed, the prose remains ordinary text. No placeholder, underline, icon, tooltip, count, or other hint is rendered.

When the entry is eligible, the annotated text becomes an unobtrusive keyboard-accessible control. Activating it opens a small overlay card over the Reader rather than navigating away.

The card uses the same shared spoiler profile as the dedicated Lexicon and displays only:

- the localized entry title;
- its safe summary;
- fragments currently permitted by the reader's progress.

Closing the card returns focus to the triggering term. Opening a contextual card must not turn the page or change the Reader's semantic position.

## 3.6 Optional Timeline and Map

Revealed events can exist naturally as searchable Lexicon entries, so a standalone Timeline is optional.

No reader-facing Map is exposed until the geography is explicitly approved as stable. If a Map is added later, it should reference existing stable location IDs rather than redefine locations or force coordinates into earlier Lexicon data.

# 4. Reader model

## 4.1 Source principle

The private manuscript defines semantic story structure. The Reader creates rendered pages dynamically.

Pagination may change with viewport size, layout mode, font size, typeface, line spacing, margins, language, and illustration placement. Bookmarks, progress, chapter navigation, contextual Lexicon annotations, and knowledge references therefore use semantic IDs, never canonical rendered page numbers.

## 4.2 Stable hierarchy and markers

Examples:

```text
world: telanas
story: dragon-knight
volume: volume-01
chapter: dk-v01-ch01
anchor: dk-v01-ch01-p001
illustration: dk-v01-prototype-full-page
```

A book keeps story chapters and non-story back matter as separate first-class structures:

```text
book
├── chapters
│   └── story chapter
└── backMatter
    └── afterword
```

Back matter has stable section and block IDs for navigation, language switching, and bookmarks, but it is never treated as a story chapter. Entering or leaving back matter must not add a chapter to spoiler progress or change chapter-completion ordering.

Chapter IDs remain stable across localized editions. A book may require either exact block alignment or chapter alignment. In chapter alignment, ordinary prose and scene-break IDs are locale-specific so a translation can use natural paragraph boundaries; declared spoiler milestones and illustration positions remain shared semantic points.

A book may also declare a sparse ordered set of `spoilerMilestones`. Every declared milestone must resolve to a semantic anchor in every released locale edition for that book.

## 4.3 Reader blocks and illustrations

Current public semantic block types are:

- paragraph;
- scene break;
- illustration.

Current illustration placements are:

- `flow`;
- `full-page`;
- `before-title`.

For an opening illustration:

```text
illustration page → chapter title page → chapter text
```

When no opening illustration exists:

```text
chapter title page → chapter text
```

## 4.4 Contents, modes, and appearance

Each published book has one ordered structural manifest: story chapters followed by declared back matter. That same structure generates both the integrated Contents page and the Reader-side table of contents.

Current layouts:

- Book spread;
- Single page;
- Continuous.

Current appearance controls include dark/light/parchment themes, serif/sans typeface, text size, and line spacing. Preferences persist locally where available.

Paged layouts use the accepted restrained spine-anchored page-turn effect. Reduced-motion preferences disable it cleanly.

## 4.5 Reading position versus spoiler progress

The Reader stores the current reading position separately from spoiler progress.

Current position may move backward and forward as the reader navigates. Reached spoiler milestones only move forward. This prevents rereading earlier pages from hiding information the reader already encountered.

Canonical reading position and bookmarks store semantic world/story/book/chapter/anchor identity rather than rendered page numbers. Labels are rebuilt from the current localized structural data so saved places survive repagination, layout changes, viewport changes, and language changes.

# 5. Publication boundary

The Library repository contains only content approved for public release plus code/data required to present it.

Unreleased manuscript text, internal planning, hidden future lore, private reference material, and private assets remain in the private source project.

Intended flow:

```text
private source project
→ explicit release selection/export
→ deterministic release bundle
→ Library validation/import
→ review
→ publication only after separate approval
```

A release exporter that supplies contextual Lexicon behavior must preserve stable semantic anchors and emit explicit localized contextual annotations plus the sparse spoiler milestones used by reveal gates.

# 6. Validation

Before released book/world data is accepted, validation should establish at least:

- stable IDs are unique;
- localized editions contain matching chapter order and obey the book's declared block- or chapter-alignment contract;
- semantic references resolve in every relevant locale;
- illustration references resolve and obey placement/path rules;
- Lexicon relationships resolve without hidden-target leakage;
- contextual Lexicon annotations target real semantic paragraph anchors and real Lexicon entries;
- annotated localized text and requested occurrences exist exactly in each edition;
- contextual annotations do not overlap;
- declared spoiler milestones resolve in every released edition;
- reached-anchor gates use declared semantic milestones;
- dedicated Lexicon and Reader overlays share one spoiler-eligibility calculation;
- released locale strings are complete;
- unreleased locales are absent from public navigation;
- integrated Contents and Reader navigation derive from the same structure;
- reader-facing navigation exposes Reader and Lexicon but not optional Timeline, Map, or standalone Search;
- retained non-reader-facing routes are not indexed accidentally;
- release bundles match declared hashes and safe target paths;
- no private/unreleased source material is accidentally included.

Asset ownership/licensing and publication approval remain separate acceptance gates.
