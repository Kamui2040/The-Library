# Volume 1 Afterword

**Status:** Released back matter shared across publication surfaces.

The localized Volume 1 afterword lives in:

`content/worlds/telanas/books/dragon-knight/volume-01/afterword.json`

That file is the content source for:

- the English and German website Reader pages;
- the illustrated English and German PDF editions;
- the English and German EPUB editions.

The website keeps the afterword outside the canonical story chapter list so it does not change chapter-based spoiler progress or Volume 1 completion semantics. It is rendered inside the Reader's book stage as publication back matter, uses the same book-page visual language as the Reader, and is exposed from both the Reader table of contents and the in-book Contents page.

The PDF build appends the localized afterword after Chapter 9, includes it in PDF navigation, and preserves the clickable `The Library - Telanas` website link.

The EPUB build appends the localized afterword directly after Chapter 9 as the final back-matter section. The EPUB uses dedicated cover, illustration, chapter-title, chapter-body, and afterword documents so the reflowable edition retains a deliberate book structure rather than presenting one minimally styled text stream.

`npm run validate:afterword` checks that the released localized payload, website integration, PDF integration, EPUB integration, and localized site links remain aligned.

External publication remains separately approval-gated.
