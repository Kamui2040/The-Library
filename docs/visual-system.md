# The Library Visual System

**Status:** Working direction

The Library needs a shared structural shell without forcing every fiction project to look alike. The common system should feel coherent and polished, while each world is free to carry its own visual identity.

# 1. Shared Library layer

The Library-level shell should be restrained and neutral enough to host very different worlds.

Shared principles:

- dark-first but not permanently dark-only
- silver / platinum / steel as the primary metallic language
- no gold as a default Library accent
- low-noise surfaces
- responsive HTML/CSS/SVG rather than raster UI frames
- accessible contrast and visible focus states
- minimal animation outside the reader
- reusable navigation/footer behavior across worlds

The Library shell should not look like the current K2040 Android or gaming sites. Functional consistency is useful; visual composition should be original.

The root Library landing page, once more than one world exists, should be visually neutral enough that individual world cards/portals can carry their own identities.

# 2. Telanas theme

Telanas uses a dark cinematic fantasy presentation.

## 2.1 Palette direction

Primary atmosphere:

- deep charcoal
- dark slate
- moonlit blue-gray
- weathered silver
- platinum
- cool steel

Secondary accents may use:

- restrained copper
- restrained bronze

Avoid:

- gold
- bright yellow-metal ornament
- glossy fantasy-game UI chrome
- excessive neon
- heavy glowing borders

Metal effects should read as worn, cool, and understated rather than polished jewelry.

## 2.2 Surfaces

Primary panels use dark charcoal/slate surfaces with subtle tonal separation.

Borders and separators should be constructed from CSS and small reusable SVG motifs:

- thin steel/silver lines
- restrained engraved-looking corners
- occasional geometric/organic fantasy motifs
- no large raster panel frames

Decoration should frame content rather than compete with it.

## 2.3 Typography

Use a two-level typographic system:

- expressive literary/fantasy display face for major Telanas/series/chapter headings
- highly readable serif or humanist reading face for longer prose and body content

Navigation and controls may use a restrained UI face when needed for clarity.

The final font choices must have suitable web/publication licences and strong English/German character support.

Do not use ornate display typography for long paragraphs or reader controls.

## 2.4 Hero direction

The Telanas landing hero should use a cinematic landscape rather than canon-specific character art.

Useful subjects include:

- roads through broad terrain
- distant settlements
- forests
- mountains
- rivers
- ruins
- old stonework
- weather and atmospheric light

The image should leave deliberate negative space for title/copy placement.

The hero must not introduce visual canon that conflicts with established manuscript locations.

A temporary non-canon-neutral placeholder may be used during implementation. Final hero artwork is a separate approval step.

## 2.5 Cards and sections

Story, Lexicon, Downloads, and Updates areas should feel like parts of one literary site rather than generic dashboard cards.

Prefer:

- broad editorial spacing
- calm hierarchy
- subtle framed regions
- small symbolic SVG category marks
- limited use of badges
- clear primary actions

Avoid:

- dense grid dashboards
- oversized status chips
- excessive iconography
- app-store-like card treatment

# 3. Reader presentation

The reader should be visually quieter than the landing site.

Default Telanas reader:

- dark surrounding canvas
- book/page surfaces with restrained tonal contrast
- narrow silver/steel controls
- two-page spread on wide screens
- single-page fallback on narrow screens
- minimal visible interface until interaction is needed

The `☰` contents control remains visible at the left edge but should not visually dominate the reading area.

When the contents panel opens:

- it should feel attached to the reader rather than like a separate website menu
- active chapter is clearly highlighted
- hover-open and pinned states use the same panel presentation
- panel animation is short and restrained

Reader settings should use the same control language as the contents panel.

Page-turn motion should be subtle. Reduced-motion mode and an explicit animation-off option must remove it cleanly.

# 4. Icons and ornament

Reusable interface decoration should be authored as SVG wherever practical.

Expected reusable assets:

- corner/frame motifs
- dividers
- Lexicon category symbols
- Library/world selector symbol
- reader controls where native/simple glyphs are insufficient

Icons should be legible at mobile sizes and inherit theme colors through `currentColor` where appropriate.

Do not rasterize simple interface symbols.

# 5. Image budget

The initial Telanas site should need only a small number of substantial raster assets:

- Telanas landing hero landscape
- actual released Volume 1 cover
- optional subtle texture if CSS/SVG cannot provide the desired result
- optional Telanas crest/mark if later approved
- optional update/news imagery when it adds real value

Existing approved interior book illustrations belong to story content and should not be repurposed casually as generic site decoration.

# 6. Responsive behavior

Desktop may use larger cinematic spacing and wider framed regions.

Tablet should preserve the same hierarchy without forcing desktop-width cards.

Mobile should:

- collapse the primary navigation cleanly
- keep major actions thumb-friendly
- avoid decorative frames that reduce useful reading width
- use single-page reader mode automatically when spread mode no longer fits
- open reader contents as a drawer rather than permanently consuming width

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

Telanas supplies its own values for those tokens.

A future world can supply a different palette, typography, ornaments, and hero treatment while keeping the same underlying Library navigation, reader, localization, and accessibility behavior.

# 8. Prototype target

The first real prototype should prove the system rather than attempt final artwork.

It should include:

- Telanas landing page
- responsive top navigation
- hero with temporary landscape treatment
- featured Volume 1 section
- Downloads section
- Lexicon teaser
- Updates area
- canonical footer functions
- basic reader shell
- functional hover/click/touch table-of-contents behavior
- theme and responsive tokens

The prototype should use real HTML/CSS/SVG for interface structure. Placeholder imagery is acceptable until the layout is stable enough to justify final art.
