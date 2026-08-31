# The Library Visual System

**Status:** Working implementation direction

The Library uses a shared structural shell without forcing every fiction project to look alike. The common system should feel coherent and polished, while each world carries its own visual identity.

# 1. Shared Library layer

The Library-level shell should remain restrained and neutral enough to host very different worlds.

Shared principles:

- dark-first but not permanently dark-only;
- silver / platinum / steel as the primary metallic language;
- no gold as a default Library accent;
- low-noise surfaces;
- responsive HTML/CSS/SVG rather than raster UI frames;
- accessible contrast and visible focus states;
- minimal animation outside the reader;
- reusable navigation/footer behavior across worlds.

The Library shell should not imitate the K2040 Android or gaming sites. Functional consistency is useful; visual composition should remain original.

The root Library landing page, once more than one world exists, should be visually neutral enough that individual world portals can carry their own identities.

# 2. Telanas theme

Telanas uses a dark cinematic fantasy presentation.

## 2.1 Palette direction

Primary atmosphere:

- deep charcoal;
- dark slate;
- moonlit blue-gray;
- weathered silver;
- platinum;
- cool steel.

Secondary accents may use restrained copper or bronze.

Avoid gold, bright yellow-metal ornament, glossy fantasy-game UI chrome, excessive neon, and heavy glowing borders. Metal effects should read as worn, cool, and understated rather than polished jewelry.

## 2.2 Surfaces and framing

Primary panels use dark charcoal/slate surfaces with subtle tonal separation.

Borders and separators should be built from CSS and small reusable SVG motifs where practical:

- thin steel/silver lines;
- restrained engraved-looking corners;
- occasional geometric/organic fantasy motifs;
- no large raster panel frames.

Decoration should frame content rather than compete with it.

## 2.3 Typography

Use a two-level typographic system:

- expressive literary/fantasy display face for major Telanas, series, and chapter headings;
- highly readable serif or humanist reading face for prose and longer body content.

Navigation and controls may use a restrained UI face when clarity benefits. Final font choices must have suitable web/publication licences and strong English/German character support.

Do not use ornate display typography for long paragraphs or reader controls.

## 2.4 Hero direction

The Telanas landing hero should use a cinematic landscape rather than canon-specific character art.

Useful subjects include roads through broad terrain, distant settlements, forests, mountains, rivers, ruins, old stonework, weather, and atmospheric light.

The image should leave deliberate negative space for title/copy placement and must not introduce visual canon that conflicts with established manuscript locations.

A temporary neutral placeholder is appropriate during implementation. Final hero artwork is a separate approval step.

## 2.5 Knowledge and editorial views

Story, Lexicon, Timeline, Map, Search, Downloads, and Updates should feel like parts of one literary site rather than generic dashboard modules.

Prefer:

- broad editorial spacing;
- calm hierarchy;
- subtle framed regions;
- small symbolic SVG marks;
- limited badges;
- clear primary actions.

Avoid dense grid dashboards, oversized status chips, excessive iconography, and app-store-like card treatment.

Timeline should read as restrained chronology rather than a game quest log. Map should keep the interface quiet enough that final geography/artwork remains primary. Search results should feel like editorial references into the world, not a generic web-search product.

# 3. Reader presentation

The reader should be visually quieter than the landing and knowledge views.

Default Telanas reader:

- dark surrounding canvas;
- book/page surfaces with restrained tonal contrast;
- narrow silver/steel controls;
- two-page spread on wide screens;
- single-page fallback on narrow screens;
- minimal visible interface until interaction is needed.

The `☰` contents control remains visible at the left edge without dominating the reading area.

When the contents panel opens, it should feel attached to the reader rather than like a separate site menu. Hover-open and pinned states use the same presentation, the active chapter is clearly indicated, and motion remains short and restrained.

Reader settings use the same control language as the contents panel.

The current paged reader uses a soft spine-anchored page turn. Reduced-motion mode must remove it cleanly. Future transition choices may be added only if they remain restrained and do not interfere with reading or semantic navigation.

# 4. Icons and ornament

Reusable interface decoration should be authored as SVG wherever practical.

Expected reusable assets include:

- corner/frame motifs;
- dividers;
- Lexicon/category symbols;
- Library/world selector symbol;
- Timeline/Map/Search symbols where native text is insufficient;
- reader controls where simple glyphs are insufficient.

Icons should be legible at mobile sizes and inherit theme colors through `currentColor` where appropriate. Do not rasterize simple interface symbols.

# 5. Image budget

The production Telanas site should need only a small number of substantial raster assets outside actual story content:

- Telanas landing hero landscape;
- released Volume 1 cover;
- optional subtle texture if CSS/SVG cannot provide the desired result;
- optional Telanas crest/mark if later approved;
- optional update/news imagery when it adds real value;
- final map artwork/geography only when the real public map is ready.

Existing approved interior book illustrations belong to story content and should not be repurposed casually as generic site decoration.

# 6. Responsive behavior

Desktop may use larger cinematic spacing and wider framed regions.

Tablet should preserve the same hierarchy without forcing desktop-width cards.

Mobile should:

- collapse primary navigation cleanly;
- keep major actions thumb-friendly;
- avoid decorative frames that reduce useful reading width;
- use single-page reader presentation automatically when spread mode no longer fits;
- open reader contents as a drawer rather than permanently consuming width;
- keep Timeline, Map, Search, and spoiler controls usable without hover.

No essential interaction may depend solely on hover.

# 7. Theming future worlds

Shared Library components should consume theme tokens rather than hard-coded Telanas colors.

Conceptual token families:

```text
surface / surface-raised
text / text-muted
border / border-strong
accent / accent-muted
metal / metal-muted
focus
reader-page / reader-canvas
```

Telanas supplies its own values for those tokens. A future world may supply a different palette, typography, ornaments, and hero treatment while keeping the same underlying Library navigation, reader, localization, spoiler, and accessibility behavior.

# 8. Current prototype and production target

The prototype now proves substantially more than the original landing/reader shell. It includes:

- Telanas landing page and responsive shared navigation;
- neutral hero treatment and featured Volume 1 area;
- Downloads and Updates placeholders;
- semantic reader with spread/single/continuous layouts;
- reader appearance controls, persistent semantic position, bookmarks, and completion/spoiler synchronization;
- spoiler-aware Lexicon with relationships and semantic reader links;
- spoiler-aware Timeline;
- spoiler-aware Map;
- spoiler-aware cross-feature Search;
- EN/DE interface/content switching;
- shared dark/light presentation and responsive behavior.

The production visual pass should therefore focus on replacement and refinement rather than inventing another prototype layer:

- final licensed web fonts;
- final hero and cover assets;
- approved production illustrations;
- final public map artwork/geography when available;
- production route shell and world/locale navigation polish;
- accessibility/focus/responsive review with real content lengths;
- restrained final ornament and spacing adjustments.

Do not add decorative assets merely to make the prototype look more finished. Final visual material should correspond to approved public content and have clear rights/provenance.
