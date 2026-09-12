(() => {
  "use strict";

  const supportedBlockTypes = new Set(["paragraph", "scene-break", "illustration"]);
  const supportedBackMatterTypes = new Set(["afterword"]);
  const supportedBackMatterBlockTypes = new Set(["paragraph", "link", "signature"]);
  const supportedIllustrationModes = new Set(["placeholder", "image"]);
  const supportedIllustrationPlacements = new Set(["flow", "full-page", "before-title"]);

  const fail = (message) => {
    throw new Error(message);
  };

  const assert = (condition, message) => {
    if (!condition) fail(message);
  };

  const buildModel = (book, edition, locale, backMatterPayloads = []) => {
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
    const backMatter = [];

    book.chapters.forEach((bookChapter, chapterIndex) => {
      const editionChapter = edition.chapters[chapterIndex];
      assert(editionChapter?.id === bookChapter.id, `Reader edition chapter order mismatch at ${bookChapter.id}`);
      assert(Array.isArray(editionChapter.blocks), `Reader edition chapter ${bookChapter.id} blocks are missing`);

      const chapter = {
        id: bookChapter.id,
        type: "chapter",
        kind: "story",
        isStory: true,
        slug: bookChapter.slug,
        label: bookChapter.labels?.[locale] || bookChapter.labels?.en || bookChapter.id,
        blocks: []
      };

      assert(!anchors.has(chapter.id), `Duplicate reader anchor: ${chapter.id}`);
      anchors.set(chapter.id, {
        sectionId: chapter.id,
        chapterId: chapter.id,
        kind: "chapter",
        blockIndex: -1
      });
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
          sectionId: chapter.id,
          chapterId: chapter.id,
          keepWithNext: block.type === "scene-break",
          forceOwnPage: block.type === "illustration" && ["full-page", "before-title"].includes(block.placement)
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
        anchors.set(block.id, {
          sectionId: chapter.id,
          chapterId: chapter.id,
          kind: block.type,
          blockIndex
        });
      });

      chapters.push(chapter);
    });

    const backMatterDefinitions = book.backMatter ?? [];
    assert(Array.isArray(backMatterDefinitions), "Book back matter must be an array");
    assert(
      backMatterPayloads.length === backMatterDefinitions.length,
      "Loaded back matter does not match the book manifest",
    );

    backMatterDefinitions.forEach((definition, sectionIndex) => {
      const payload = backMatterPayloads[sectionIndex];
      assert(definition && typeof definition === "object", "Invalid back-matter entry in book manifest");
      assert(typeof definition.id === "string" && definition.id, "Back-matter id is missing");
      assert(supportedBackMatterTypes.has(definition.type), `Unsupported back-matter type: ${definition.type}`);
      assert(typeof definition.source === "string" && definition.source, `Back-matter source is missing: ${definition.id}`);
      assert(!anchors.has(definition.id), `Duplicate reader anchor: ${definition.id}`);
      assert(payload && typeof payload === "object", `Back-matter payload is missing: ${definition.id}`);
      assert(payload.world === book.world, `Back matter ${definition.id} world does not match book manifest`);
      assert(payload.story === book.story, `Back matter ${definition.id} story does not match book manifest`);
      assert(payload.book === book.id, `Back matter ${definition.id} book does not match book manifest`);
      assert(payload.id === definition.id, `Back matter ${definition.id} id does not match its payload`);
      assert(payload.type === definition.type, `Back matter ${definition.id} type does not match its payload`);
      assert(payload.state === book.state, `Back matter ${definition.id} state does not match book manifest`);
      assert(payload.contentMode === book.contentMode, `Back matter ${definition.id} content mode does not match book manifest`);

      const localized = payload.locales?.[locale];
      assert(localized && typeof localized === "object", `Back matter ${definition.id} is missing ${locale}`);
      assert(Array.isArray(localized.blocks), `Back matter ${definition.id} blocks are missing for ${locale}`);

      const section = {
        id: definition.id,
        type: definition.type,
        kind: "back-matter",
        isStory: false,
        slug: definition.slug,
        label: definition.labels?.[locale] || definition.labels?.en || definition.id,
        blocks: []
      };

      anchors.set(section.id, {
        sectionId: section.id,
        chapterId: null,
        kind: "back-matter",
        blockIndex: -1
      });
      if (section.slug) {
        assert(!slugs.has(section.slug), `Duplicate reader slug: ${section.slug}`);
        slugs.set(section.slug, section.id);
      }

      localized.blocks.forEach((block, blockIndex) => {
        assert(block && typeof block === "object", `Invalid block in back matter ${section.id}`);
        assert(typeof block.id === "string" && block.id, `Block id is missing in back matter ${section.id}`);
        assert(!anchors.has(block.id), `Duplicate reader anchor: ${block.id}`);
        assert(
          supportedBackMatterBlockTypes.has(block.type),
          `Unsupported back-matter block type: ${block.type}`,
        );

        const normalized = {
          id: block.id,
          type: block.type,
          sectionId: section.id,
          chapterId: null,
          keepWithNext: false,
          forceOwnPage: false
        };
        if (["paragraph", "signature"].includes(block.type)) {
          assert(typeof block.text === "string" && block.text.trim(), `Back-matter block ${block.id} text is missing`);
          normalized.text = block.text;
        } else {
          assert(typeof block.label === "string" && block.label.trim(), `Back-matter link ${block.id} label is missing`);
          assert(typeof block.url === "string" && /^https:\/\//.test(block.url), `Back-matter link ${block.id} URL is invalid`);
          normalized.label = block.label;
          normalized.url = block.url;
        }

        section.blocks.push(normalized);
        anchors.set(block.id, {
          sectionId: section.id,
          chapterId: null,
          kind: block.type,
          blockIndex
        });
      });

      backMatter.push(section);
    });

    return {
      world: book.world,
      story: book.story,
      book: book.id,
      locale,
      chapters,
      backMatter,
      sections: [...chapters, ...backMatter],
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

  const sectionForAnchor = (model, anchor) => {
    if (anchor === "contents") return null;
    return model.anchors.get(anchor)?.sectionId || null;
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
    sectionForAnchor,
    paginateBlocks
  };
})();
