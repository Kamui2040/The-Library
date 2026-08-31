(() => {
  "use strict";

  const supportedBlockTypes = new Set(["paragraph", "scene-break", "illustration"]);
  const supportedIllustrationModes = new Set(["placeholder", "image"]);
  const supportedIllustrationPlacements = new Set(["flow", "full-page"]);

  const fail = (message) => {
    throw new Error(message);
  };

  const assert = (condition, message) => {
    if (!condition) fail(message);
  };

  const buildModel = (book, edition, locale) => {
    assert(book && typeof book === "object", "Book manifest is missing");
    assert(edition && typeof edition === "object", "Reader edition is missing");
    assert(edition.world === book.world, "Reader edition world does not match book manifest");
    assert(edition.story === book.story, "Reader edition story does not match book manifest");
    assert(edition.book === book.id, "Reader edition book does not match book manifest");
    assert(edition.locale === locale, "Reader edition locale does not match selected language");
    assert(Array.isArray(book.chapters), "Book chapters are missing");
    assert(Array.isArray(edition.chapters), "Reader edition chapters are missing");
    assert(book.chapters.length === edition.chapters.length, "Reader edition chapter count does not match book manifest");

    const illustrationDefinitions = book.illustrations ?? [];
    assert(Array.isArray(illustrationDefinitions), "Book illustrations must be an array");

    const illustrations = new Map();
    for (const asset of illustrationDefinitions) {
      assert(asset && typeof asset === "object", "Invalid illustration asset in book manifest");
      assert(typeof asset.id === "string" && asset.id, "Illustration asset id is missing");
      assert(!illustrations.has(asset.id), `Duplicate illustration asset: ${asset.id}`);
      assert(supportedIllustrationModes.has(asset.mode), `Unsupported illustration asset mode: ${asset.mode}`);
      assert(
        typeof asset.aspectRatio === "string" && /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(asset.aspectRatio),
        `Illustration asset ${asset.id} has an invalid aspect ratio`,
      );
      if (asset.mode === "image") {
        assert(typeof asset.src === "string" && asset.src, `Illustration asset ${asset.id} source is missing`);
      }

      illustrations.set(asset.id, {
        id: asset.id,
        mode: asset.mode,
        src: asset.mode === "image" ? asset.src : "",
        aspectRatio: asset.aspectRatio,
        prototypeOnly: asset.prototypeOnly === true
      });
    }

    const anchors = new Map();
    const slugs = new Map();
    const chapters = [];

    book.chapters.forEach((bookChapter, chapterIndex) => {
      const editionChapter = edition.chapters[chapterIndex];
      assert(editionChapter?.id === bookChapter.id, `Reader edition chapter order mismatch at ${bookChapter.id}`);
      assert(Array.isArray(editionChapter.blocks), `Reader edition chapter ${bookChapter.id} blocks are missing`);

      const chapter = {
        id: bookChapter.id,
        slug: bookChapter.slug,
        label: bookChapter.labels?.[locale] || bookChapter.labels?.en || bookChapter.id,
        blocks: []
      };

      assert(!anchors.has(chapter.id), `Duplicate reader anchor: ${chapter.id}`);
      anchors.set(chapter.id, { chapterId: chapter.id, kind: "chapter", blockIndex: -1 });
      if (chapter.slug) slugs.set(chapter.slug, chapter.id);

      editionChapter.blocks.forEach((block, blockIndex) => {
        assert(block && typeof block === "object", `Invalid reader block in ${chapter.id}`);
        assert(typeof block.id === "string" && block.id, `Reader block id is missing in ${chapter.id}`);
        assert(!anchors.has(block.id), `Duplicate reader anchor: ${block.id}`);
        assert(supportedBlockTypes.has(block.type), `Unsupported reader block type: ${block.type}`);
        if (block.type === "paragraph") {
          assert(typeof block.text === "string" && block.text.trim(), `Reader paragraph ${block.id} text is missing`);
        }

        let illustration = null;
        if (block.type === "illustration") {
          assert(typeof block.asset === "string" && block.asset, `Reader illustration ${block.id} asset is missing`);
          illustration = illustrations.get(block.asset);
          assert(illustration, `Reader illustration ${block.id} references unknown asset: ${block.asset}`);
          assert(
            supportedIllustrationPlacements.has(block.placement),
            `Reader illustration ${block.id} has unsupported placement: ${block.placement}`,
          );
          assert(typeof block.alt === "string" && block.alt.trim(), `Reader illustration ${block.id} alt text is missing`);
          assert(
            block.caption === undefined || (typeof block.caption === "string" && block.caption.trim()),
            `Reader illustration ${block.id} caption must be a non-empty string when present`,
          );
        }

        const normalized = {
          id: block.id,
          type: block.type,
          text: block.type === "paragraph" ? block.text : "",
          chapterId: chapter.id,
          keepWithNext: block.type === "scene-break",
          forceOwnPage: block.type === "illustration" && block.placement === "full-page"
        };

        if (illustration) {
          Object.assign(normalized, {
            assetId: block.asset,
            asset: illustration,
            placement: block.placement,
            alt: block.alt,
            caption: block.caption || ""
          });
        }
        chapter.blocks.push(normalized);
        anchors.set(block.id, { chapterId: chapter.id, kind: block.type, blockIndex });
      });

      chapters.push(chapter);
    });

    return {
      world: book.world,
      story: book.story,
      book: book.id,
      locale,
      chapters,
      anchors,
      slugs
    };
  };

  const resolveAnchor = (model, requested) => {
    if (!requested || requested === "contents") return "contents";
    if (model.anchors.has(requested)) return requested;
    return model.slugs.get(requested) || "contents";
  };

  const chapterForAnchor = (model, anchor) => {
    if (anchor === "contents") return null;
    return model.anchors.get(anchor)?.chapterId || null;
  };

  const paginateBlocks = (blocks, fits) => {
    const pages = [];
    let current = [];

    for (const block of blocks) {
      if (block.forceOwnPage) {
        if (current.length) pages.push(current);
        pages.push([block]);
        current = [];
        continue;
      }

      if (current.length === 0) {
        current = [block];
        continue;
      }

      const candidate = [...current, block];
      if (fits(candidate)) {
        current = candidate;
        continue;
      }

      const carried = [];
      while (current.length > 1 && current[current.length - 1].keepWithNext) {
        carried.unshift(current.pop());
      }

      pages.push(current);
      current = [...carried, block];

      if (!fits(current) && current.length > 1 && !current[0].keepWithNext) {
        const overflow = current.pop();
        pages.push(current);
        current = [overflow];
      }
    }

    if (current.length) pages.push(current);
    return pages;
  };

  window.LibraryReaderEngine = {
    buildModel,
    resolveAnchor,
    chapterForAnchor,
    paginateBlocks
  };
})();
