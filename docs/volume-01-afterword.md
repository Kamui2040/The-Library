# Volume 1 Afterword

**Status:** Released back matter shared across publication surfaces.

Volume 1 declares the afterword in its canonical `backMatter` list in `book.json`. The localized content lives in:

`content/worlds/telanas/books/dragon-knight/volume-01/afterword.json`

That file is the content source for:

- the English and German website Reader pages;
- the illustrated English and German PDF editions;
- the English and German EPUB editions.

The website Reader loads that manifest entry into its normal section model. The afterword uses the same pagination, page turns, single-page, spread, continuous, Contents, language-switching, and bookmark paths as the rest of the book. It remains separate from the story chapter list, so it cannot become a spoiler-progress chapter or change Volume 1 completion semantics.

The PDF build appends the localized afterword after Chapter 9, includes it in PDF navigation, and preserves the clickable `The Library - Telanas` website link.

The EPUB build appends the localized afterword directly after Chapter 9 as the final back-matter section. Its conservative reflowable EPUB structure uses separate documents to establish reading order without simulating physical pages in CSS.

`npm run validate:afterword` checks that the released localized payload, website integration, PDF integration, EPUB integration, and localized site links remain aligned.

External publication remains separately approval-gated.
