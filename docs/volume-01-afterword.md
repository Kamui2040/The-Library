# Volume 1 Afterword

**Status:** Released back matter shared across publication surfaces.

The localized Volume 1 afterword lives in:

`content/worlds/telanas/books/dragon-knight/volume-01/afterword.json`

That file is the content source for:

- the English and German website Reader pages;
- the illustrated English and German PDF editions;
- the English and German EPUB editions.

The website renders the afterword as back matter below the Reader rather than adding it to the canonical story chapter list. This preserves chapter-based spoiler progress and Volume 1 completion semantics while still exposing the afterword through the Reader table of contents.

The PDF build appends the localized afterword after Chapter 9, includes it in PDF navigation, and preserves the clickable `The Library - Telanas` website link.

The EPUB build places the afterword after Chapter 9 and before the final Telanas exploration page.

`npm run validate:afterword` checks that the released localized payload, website integration, PDF integration, EPUB integration, and localized site links remain aligned.

External publication remains separately approval-gated.
