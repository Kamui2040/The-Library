# EPUB Publication Preparation

**Status:** Distribution-preparation contract

Telanas Volume 1 EPUBs are generated from the already released, publication-safe Reader content in The Library. The builder does not read the private Telanas repository directly and does not publish or upload anything to an external storefront.

## Outputs

The EPUB build produces separate localized editions:

- `output/epub/the-dragon-knight-volume-01-home-en.epub`
- `output/epub/der-drachenritter-band-01-zuhause-de.epub`

The editions remain separate rather than combining English and German into one bilingual file.

## Format

The builder targets polished reflowable EPUB 3.3-compatible packaging with:

- one deterministic non-ISBN UUID identifier per language edition;
- the approved Volume 1 cover;
- all ten approved interior illustrations in story order;
- dedicated illustration pages, chapter-title pages, and reflowable chapter-body documents;
- the released chapter order and localized chapter labels;
- semantic paragraph and scene-break IDs retained in XHTML;
- EPUB navigation derived from the canonical book manifest;
- a localized afterword after Chapter 9 as the final back-matter section;
- the official localized Telanas website link on the title and afterword pages;
- the visible hyperlink label `The Library - Telanas` for the official site;
- no direct third-party donation/store link inside the EPUB.

The localized afterword text is stored in `content/worlds/telanas/books/dragon-knight/volume-01/afterword.json`. It records the origin of Telanas as an Ultima Online character background more than twenty years ago, thanks the Ultima Online creators and communities, J.R.R. Tolkien, Bernhard Hennen, the author's best friend and girlfriend, and directs readers to the official Telanas website and its Reader, illustrated edition, spoiler-aware Lexicon, project updates, and future-volume information.

## Image handling

Original publication assets remain untouched. EPUB builds create temporary JPEG derivatives only inside the generated ebook:

- maximum dimensions: 1800 × 2700 px;
- maximum image area: 5.6 megapixels;
- JPEG quality: 85;
- non-progressive JPEG;
- transparent source images are flattened onto white only in the EPUB derivative.

This keeps the EPUB below the 100 MiB safety target while preserving the approved source artwork in the repository.

## Build and validation

Build both editions with:

```text
npm run build:epubs
```

This performs internal validation of the EPUB ZIP structure, required package files, XML parsing, image pixel limits, and the 100 MiB size ceiling.

A distribution candidate must additionally pass the official EPUBCheck validator:

```text
npm run build:epubs:release
```

The release builder stages both localized books under their real `.epub` filenames, runs official EPUBCheck against both staged files, and promotes them to `output/epub/` only after both validators succeed. This avoids treating temporary non-`.epub` filenames as generic expansion packages and prevents failed candidates from being promoted as release outputs.

The release command accepts either an `epubcheck` executable on `PATH` or an `EPUBCHECK_JAR` environment variable pointing to the official validator JAR.

Pillow is required for store-safe image derivatives. EPUBCheck is required for final distribution acceptance.

## Publication gate

Successful local generation and EPUBCheck validation do not authorize external publication. Store submission, pricing, account changes, ISBN decisions, or uploads to Amazon, Kobo, Google Play Books, Apple Books, or another distributor remain explicit publication actions and require separate user approval.
