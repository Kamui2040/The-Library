import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const branch = "release/telanas-volume-01";
const origin = "https://github.com/Kamui2040/The-Library.git";
const selfPath = "scripts/fix-natural-edition-alignment.mjs";

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const run = (command, args = []) => execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: "pipe" });

const read = async (relativePath) => readFile(path.join(root, relativePath), "utf8");
const write = async (relativePath, value) => writeFile(path.join(root, relativePath), value, "utf8");

const replaceOnce = (source, oldText, newText, label) => {
  const first = source.indexOf(oldText);
  assert(first >= 0, `${label}: expected text was not found`);
  assert(source.indexOf(oldText, first + oldText.length) < 0, `${label}: expected text was found more than once`);
  return `${source.slice(0, first)}${newText}${source.slice(first + oldText.length)}`;
};

const patchImporter = async () => {
  const relativePath = "scripts/import-telanas-volume-01.mjs";
  let source = await read(relativePath);

  source = replaceOnce(
    source,
    "const parseBody = (lines, anchorPrefix) => {",
    "const parseBody = (lines, anchorPrefix, locale) => {",
    "Importer parseBody locale",
  );
  source = replaceOnce(
    source,
    "id: `${anchorPrefix}-p${String(paragraphIndex).padStart(3, \"0\")}`",
    "id: `${anchorPrefix}-${locale}-p${String(paragraphIndex).padStart(3, \"0\")}`",
    "Importer paragraph anchor",
  );
  source = replaceOnce(
    source,
    "id: `${anchorPrefix}-s${String(sceneIndex).padStart(3, \"0\")}`",
    "id: `${anchorPrefix}-${locale}-s${String(sceneIndex).padStart(3, \"0\")}`",
    "Importer scene anchor",
  );
  source = replaceOnce(
    source,
    "blocks: parseBody(bodyLines, chapter.id),",
    "blocks: parseBody(bodyLines, chapter.id, locale),",
    "Importer parseBody call",
  );
  source = replaceOnce(
    source,
    `const structuralSignature = (editionChapters) => editionChapters.map((chapter) => ({\n  id: chapter.id,\n  blocks: chapter.blocks.map((block) => ({ id: block.id, type: block.type })),\n}));\n\n`,
    "",
    "Importer obsolete cross-locale signature",
  );
  source = replaceOnce(
    source,
    `  assert(JSON.stringify(structuralSignature(enParsed)) === JSON.stringify(structuralSignature(deParsed)), "English and German manuscript paragraph/scene structure is not semantically aligned; import stopped rather than inventing anchors");\n`,
    "",
    "Importer obsolete cross-locale assertion",
  );
  source = replaceOnce(
    source,
    `    contentMode: "released",\n    locales: ["en", "de"],`,
    `    contentMode: "released",\n    editionAlignment: "chapter",\n    locales: ["en", "de"],`,
    "Importer edition alignment",
  );
  source = replaceOnce(
    source,
    `    spoilerMilestones: ["dk-v01-ch01-p004"],`,
    `    spoilerMilestones: ["dk-v01-ch01"],`,
    "Importer shared spoiler milestone",
  );

  await write(relativePath, source);
};

const patchContentValidator = async () => {
  const relativePath = "scripts/validate-content.mjs";
  let source = await read(relativePath);

  source = replaceOnce(
    source,
    `const allowedStates = new Set(["development", "prototype", "approved", "published"]);\nconst allowedVisibilityModes = new Set(["always", "completed-volume", "full-spoilers"]);`,
    `const allowedStates = new Set(["development", "prototype", "approved", "published"]);\nconst allowedEditionAlignments = new Set(["block", "chapter"]);\nconst allowedVisibilityModes = new Set(["always", "completed-volume", "reached-anchor", "full-spoilers"]);`,
    "Content validator alignment/visibility modes",
  );

  source = replaceOnce(
    source,
    `  if (visibility.mode === "completed-volume") {\n    assertId(visibility.story, \`${"${label}"} visibility story\`);\n    assertId(visibility.volume, \`${"${label}"} visibility volume\`);\n    const books = storyBooks.get(visibility.story);\n    assert(books, \`${"${label}"} references unknown story: ${"${visibility.story}"}\`);\n    assert(books.has(visibility.volume), \`${"${label}"} references unknown volume: ${"${visibility.story}"}/${"${visibility.volume}"}\`);\n  }`,
    `  if (visibility.mode === "completed-volume") {\n    assertId(visibility.story, \`${"${label}"} visibility story\`);\n    assertId(visibility.volume, \`${"${label}"} visibility volume\`);\n    const books = storyBooks.get(visibility.story);\n    assert(books, \`${"${label}"} references unknown story: ${"${visibility.story}"}\`);\n    assert(books.has(visibility.volume), \`${"${label}"} references unknown volume: ${"${visibility.story}"}/${"${visibility.volume}"}\`);\n  }\n\n  if (visibility.mode === "reached-anchor") {\n    assertId(visibility.story, \`${"${label}"} visibility story\`);\n    assertId(visibility.book, \`${"${label}"} visibility book\`);\n    assertId(visibility.anchor, \`${"${label}"} visibility anchor\`);\n    const books = storyBooks.get(visibility.story);\n    assert(books, \`${"${label}"} references unknown story: ${"${visibility.story}"}\`);\n    assert(books.has(visibility.book), \`${"${label}"} references unknown book: ${"${visibility.story}"}/${"${visibility.book}"}\`);\n  }`,
    "Content validator reached-anchor",
  );

  source = replaceOnce(
    source,
    `      assert(Array.isArray(book.chapters), \`${"${bookPath}"} chapters must be an array\`);\n`,
    `      assert(Array.isArray(book.chapters), \`${"${bookPath}"} chapters must be an array\`);\n      const editionAlignment = book.editionAlignment || "block";\n      assert(\n        allowedEditionAlignments.has(editionAlignment),\n        \`${"${bookPath}"} has unsupported editionAlignment: ${"${editionAlignment}"}\`,\n      );\n`,
    "Content validator book alignment",
  );

  source = replaceOnce(
    source,
    `            assert(allowedReaderBlockTypes.has(block.type), \`${"${editionPath}"} block ${"${block.id}"} has unsupported type: ${"${block.type}"}\`);\n\n            if (block.type === "paragraph") {`,
    `            assert(allowedReaderBlockTypes.has(block.type), \`${"${editionPath}"} block ${"${block.id}"} has unsupported type: ${"${block.type}"}\`);\n            if (editionAlignment === "chapter" && ["paragraph", "scene-break"].includes(block.type)) {\n              assert(\n                block.id.startsWith(\`${"${editionChapter.id}"}-${"${locale}"}-\`),\n                \`${"${editionPath}"} ${"${block.id}"} must use a locale-specific body anchor in chapter alignment mode\`,\n              );\n            }\n\n            if (block.type === "paragraph") {`,
    "Content validator locale-specific body anchors",
  );

  source = replaceOnce(
    source,
    `        const signature = JSON.stringify(structure);\n        if (baselineStructure === null) {\n          baselineStructure = signature;\n          baselineLocale = locale;\n        } else {\n          assert(signature === baselineStructure, \`${"${editionPath}"} semantic structure does not match ${"${baselineLocale}"} edition\`);\n        }`,
    `        if (editionAlignment === "block") {\n          const signature = JSON.stringify(structure);\n          if (baselineStructure === null) {\n            baselineStructure = signature;\n            baselineLocale = locale;\n          } else {\n            assert(signature === baselineStructure, \`${"${editionPath}"} semantic structure does not match ${"${baselineLocale}"} edition\`);\n          }\n        }`,
    "Content validator cross-locale structure policy",
  );

  await write(relativePath, source);
};

const patchReader = async () => {
  const relativePath = "assets/reader/reader.js";
  let source = await read(relativePath);

  source = replaceOnce(
    source,
    `  const positionStorageKey = "library-reader-position-v1";`,
    `  const positionStorageKey = "library-reader-position-v2";\n  const legacyPositionStorageKey = "library-reader-position-v1";`,
    "Reader position storage version",
  );

  source = replaceOnce(
    source,
    `  const readSavedPosition = () => {\n    const key = positionKey();\n    if (!key) return null;\n    try {\n      const parsed = JSON.parse(localStorage.getItem(positionStorageKey) || "null");\n      return parsed?.version === 1 && typeof parsed.books?.[key] === "string" ? parsed.books[key] : null;\n    } catch {\n      return null;\n    }\n  };\n\n  const savePosition = (anchor) => {\n    const key = positionKey();\n    if (!key) return;\n    try {\n      const parsed = JSON.parse(localStorage.getItem(positionStorageKey) || "null");\n      const state = parsed?.version === 1 && parsed.books && typeof parsed.books === "object"\n        ? parsed\n        : { version: 1, books: {} };\n      state.books[key] = anchor;\n      localStorage.setItem(positionStorageKey, JSON.stringify(state));\n    } catch {\n      // Local persistence is optional.\n    }\n  };`,
    `  const readSavedPosition = () => {\n    const key = positionKey();\n    if (!key) return null;\n    try {\n      const parsed = JSON.parse(localStorage.getItem(positionStorageKey) || "null");\n      const localized = parsed?.version === 2 ? parsed.books?.[key]?.[language()] : null;\n      if (typeof localized === "string") return localized;\n\n      const legacy = JSON.parse(localStorage.getItem(legacyPositionStorageKey) || "null");\n      return legacy?.version === 1 && typeof legacy.books?.[key] === "string" ? legacy.books[key] : null;\n    } catch {\n      return null;\n    }\n  };\n\n  const savePosition = (anchor) => {\n    const key = positionKey();\n    if (!key) return;\n    try {\n      const parsed = JSON.parse(localStorage.getItem(positionStorageKey) || "null");\n      const state = parsed?.version === 2 && parsed.books && typeof parsed.books === "object"\n        ? parsed\n        : { version: 2, books: {} };\n      const saved = state.books[key] && typeof state.books[key] === "object" && !Array.isArray(state.books[key])\n        ? state.books[key]\n        : {};\n      saved[language()] = anchor;\n      state.books[key] = saved;\n      localStorage.setItem(positionStorageKey, JSON.stringify(state));\n    } catch {\n      // Local persistence is optional.\n    }\n  };`,
    "Reader locale-specific saved position",
  );

  source = replaceOnce(
    source,
    `  const chapterById = (chapterId) => model?.chapters.find((chapter) => chapter.id === chapterId) || null;\n`,
    `  const chapterById = (chapterId) => model?.chapters.find((chapter) => chapter.id === chapterId) || null;\n\n  const captureLanguageTransfer = () => {\n    if (!model || currentAnchor === "contents") return { anchor: "contents", chapterId: null, ratio: 0 };\n    const chapterId = engine.chapterForAnchor(model, currentAnchor);\n    if (!chapterId) return { anchor: "contents", chapterId: null, ratio: 0 };\n    const chapter = chapterById(chapterId);\n    const blockIndex = chapter?.blocks.findIndex((block) => block.id === currentAnchor) ?? -1;\n    const denominator = Math.max(1, (chapter?.blocks.length || 1) - 1);\n    return {\n      anchor: currentAnchor,\n      chapterId,\n      ratio: blockIndex >= 0 ? blockIndex / denominator : 0\n    };\n  };\n\n  const restoreAnchorForModel = (restore) => {\n    if (typeof restore === "string") return engine.resolveAnchor(model, restore);\n    if (!restore || typeof restore !== "object") return "contents";\n    if (typeof restore.anchor === "string" && model.anchors.has(restore.anchor)) return restore.anchor;\n    if (typeof restore.chapterId !== "string") return "contents";\n\n    const chapter = chapterById(restore.chapterId);\n    if (!chapter) return "contents";\n    if (!chapter.blocks.length) return chapter.id;\n    const ratio = Number.isFinite(restore.ratio) ? Math.max(0, Math.min(1, restore.ratio)) : 0;\n    const index = Math.round(ratio * Math.max(0, chapter.blocks.length - 1));\n    return chapter.blocks[index]?.id || chapter.id;\n  };\n`,
    "Reader language transfer helpers",
  );

  source = replaceOnce(
    source,
    `    currentAnchor = engine.resolveAnchor(model, restoreAnchor);`,
    `    currentAnchor = restoreAnchorForModel(restoreAnchor);`,
    "Reader restore localized anchor",
  );

  source = replaceOnce(
    source,
    `  window.addEventListener("library-language-change", async () => {\n    if (!book) return;\n    const restoreAnchor = currentAnchor;\n    applyLayoutClasses(layoutPreference);\n    try {\n      await loadSelectedEdition(restoreAnchor);`,
    `  window.addEventListener("library-language-change", async () => {\n    if (!book) return;\n    const restoreAnchor = captureLanguageTransfer();\n    applyLayoutClasses(layoutPreference);\n    try {\n      await loadSelectedEdition(restoreAnchor);`,
    "Reader safe language switch",
  );

  await write(relativePath, source);
};

const patchBookmarks = async () => {
  const relativePath = "assets/reader/reader-bookmarks.js";
  let source = await read(relativePath);

  source = replaceOnce(
    source,
    `  const storageKey = "library-reader-bookmarks-v1";`,
    `  const storageKey = "library-reader-bookmarks-v2";\n  const legacyStorageKey = "library-reader-bookmarks-v1";`,
    "Bookmark storage version",
  );

  source = replaceOnce(
    source,
    `  const defaultState = () => ({ version: 1, books: {} });\n\n  const normalizeState = (value) => {\n    const state = defaultState();\n    if (value?.version !== 1 || !value.books || typeof value.books !== "object" || Array.isArray(value.books)) return state;\n\n    for (const [key, entries] of Object.entries(value.books)) {\n      if (!Array.isArray(entries)) continue;\n      const seen = new Set();\n      const normalized = [];\n      for (const entry of entries) {\n        if (!entry || typeof entry !== "object") continue;\n        if (typeof entry.anchor !== "string" || !entry.anchor || typeof entry.chapterId !== "string" || !entry.chapterId) continue;\n        if (seen.has(entry.anchor)) continue;\n        seen.add(entry.anchor);\n        normalized.push({ anchor: entry.anchor, chapterId: entry.chapterId });\n      }\n      if (normalized.length) state.books[key] = normalized;\n    }\n    return state;\n  };\n\n  const readState = () => {\n    try {\n      return normalizeState(JSON.parse(localStorage.getItem(storageKey) || "null"));\n    } catch {\n      return defaultState();\n    }\n  };\n\n  const writeState = (state) => {\n    try {\n      localStorage.setItem(storageKey, JSON.stringify(normalizeState(state)));\n    } catch {\n      // Local persistence is optional.\n    }\n  };\n\n  const currentBookmarks = () => {\n    if (!bookKey) return [];\n    return readState().books[bookKey] || [];\n  };`,
    `  const defaultState = () => ({ version: 2, books: {} });\n\n  const normalizeEntries = (entries) => {\n    if (!Array.isArray(entries)) return [];\n    const seen = new Set();\n    const normalized = [];\n    for (const entry of entries) {\n      if (!entry || typeof entry !== "object") continue;\n      if (typeof entry.anchor !== "string" || !entry.anchor || typeof entry.chapterId !== "string" || !entry.chapterId) continue;\n      if (seen.has(entry.anchor)) continue;\n      seen.add(entry.anchor);\n      normalized.push({ anchor: entry.anchor, chapterId: entry.chapterId });\n    }\n    return normalized;\n  };\n\n  const normalizeState = (value) => {\n    const state = defaultState();\n    if (value?.version !== 2 || !value.books || typeof value.books !== "object" || Array.isArray(value.books)) return state;\n\n    for (const [key, localized] of Object.entries(value.books)) {\n      if (!localized || typeof localized !== "object" || Array.isArray(localized)) continue;\n      const normalizedLocales = {};\n      for (const locale of ["en", "de"]) {\n        const entries = normalizeEntries(localized[locale]);\n        if (entries.length) normalizedLocales[locale] = entries;\n      }\n      if (Object.keys(normalizedLocales).length) state.books[key] = normalizedLocales;\n    }\n    return state;\n  };\n\n  const writeState = (state) => {\n    try {\n      localStorage.setItem(storageKey, JSON.stringify(normalizeState(state)));\n    } catch {\n      // Local persistence is optional.\n    }\n  };\n\n  const readState = () => {\n    try {\n      const current = JSON.parse(localStorage.getItem(storageKey) || "null");\n      if (current?.version === 2) return normalizeState(current);\n\n      const legacy = JSON.parse(localStorage.getItem(legacyStorageKey) || "null");\n      const state = defaultState();\n      if (legacy?.version === 1 && legacy.books && typeof legacy.books === "object") {\n        for (const [key, entries] of Object.entries(legacy.books)) {\n          const normalized = normalizeEntries(entries);\n          if (normalized.length) state.books[key] = { [language()]: normalized };\n        }\n        writeState(state);\n      }\n      return state;\n    } catch {\n      return defaultState();\n    }\n  };\n\n  const currentBookmarks = () => {\n    if (!bookKey) return [];\n    return readState().books[bookKey]?.[language()] || [];\n  };`,
    "Locale-specific bookmark state",
  );

  source = replaceOnce(
    source,
    `  const persistBookmarks = (bookmarks) => {\n    if (!bookKey) return;\n    const state = readState();\n    if (bookmarks.length) state.books[bookKey] = bookmarks;\n    else delete state.books[bookKey];\n    writeState(state);\n  };`,
    `  const persistBookmarks = (bookmarks) => {\n    if (!bookKey) return;\n    const state = readState();\n    const localized = state.books[bookKey] && typeof state.books[bookKey] === "object" && !Array.isArray(state.books[bookKey])\n      ? state.books[bookKey]\n      : {};\n    if (bookmarks.length) localized[language()] = bookmarks;\n    else delete localized[language()];\n    if (Object.keys(localized).length) state.books[bookKey] = localized;\n    else delete state.books[bookKey];\n    writeState(state);\n  };`,
    "Locale-specific bookmark persistence",
  );

  await write(relativePath, source);
};

const patchLexicon = async () => {
  const relativePath = "content/worlds/telanas/lexicon/lexicon.json";
  let source = await read(relativePath);
  source = replaceOnce(
    source,
    `"anchor": "dk-v01-ch01-p004"`,
    `"anchor": "dk-v01-ch01"`,
    "Prototype Lexicon shared Reader anchor",
  );
  await write(relativePath, source);
};

const validateGeneratedReader = async () => {
  const base = path.join(root, "content/worlds/telanas/books/dragon-knight/volume-01");
  const book = JSON.parse(await readFile(path.join(base, "book.json"), "utf8"));
  const editions = {
    en: JSON.parse(await readFile(path.join(base, "editions/en.json"), "utf8")),
    de: JSON.parse(await readFile(path.join(base, "editions/de.json"), "utf8")),
  };

  assert(book.state === "approved" && book.contentMode === "released", "Generated book is not approved released content");
  assert(book.editionAlignment === "chapter", "Generated book must use chapter-level edition alignment");
  assert(book.source?.commit === "8c5f071c261a00d3f785cd1827c3ccffbabf3fb6", "Generated book source commit is wrong");
  assert(book.chapters?.length === 10, "Generated book must contain Prologue plus Chapters 1-9");
  assert(book.illustrations?.length === 10, "Generated book must contain exactly 10 approved illustrations");
  assert(JSON.stringify(book.spoilerMilestones) === JSON.stringify(["dk-v01-ch01"]), "Generated spoiler milestone must use the shared Chapter 1 anchor");

  const chapterIds = book.chapters.map((chapter) => chapter.id);
  for (const locale of ["en", "de"]) {
    const edition = editions[locale];
    assert(edition.state === "approved" && edition.contentMode === "released", `${locale} edition is not approved released content`);
    assert(JSON.stringify(edition.chapters.map((chapter) => chapter.id)) === JSON.stringify(chapterIds), `${locale} chapter order differs from book manifest`);
    for (const chapter of edition.chapters) {
      const illustration = chapter.blocks[0];
      assert(illustration?.type === "illustration" && illustration.placement === "before-title", `${locale}/${chapter.id} has no lead illustration`);
      for (const block of chapter.blocks.slice(1)) {
        if (!["paragraph", "scene-break"].includes(block.type)) continue;
        assert(block.id.startsWith(`${chapter.id}-${locale}-`), `${locale}/${chapter.id} has a non-localized body anchor: ${block.id}`);
      }
    }
  }
};

const main = async () => {
  assert(git("remote", "get-url", "origin") === origin, "Wrong The-Library origin");
  assert(git("rev-parse", "--abbrev-ref", "HEAD") === branch, `Run on ${branch}`);
  assert(git("status", "--porcelain") === "", "The-Library checkout must be clean before the alignment fix");

  await patchImporter();
  await patchContentValidator();
  await patchReader();
  await patchBookmarks();
  await patchLexicon();
  await unlink(path.join(root, selfPath));

  for (const file of [
    "scripts/import-telanas-volume-01.mjs",
    "scripts/validate-content.mjs",
    "assets/reader/reader.js",
    "assets/reader/reader-bookmarks.js",
  ]) {
    run("node", ["--check", file]);
  }
  run("git", ["diff", "--check"]);
  run("npm", ["run", "validate"]);

  const expectedInfrastructure = [
    "assets/reader/reader-bookmarks.js",
    "assets/reader/reader.js",
    "content/worlds/telanas/lexicon/lexicon.json",
    "scripts/fix-natural-edition-alignment.mjs",
    "scripts/import-telanas-volume-01.mjs",
    "scripts/validate-content.mjs",
  ].sort();
  const actualInfrastructure = git("diff", "--name-only").split("\n").filter(Boolean).sort();
  assert(JSON.stringify(actualInfrastructure) === JSON.stringify(expectedInfrastructure), `Unexpected infrastructure scope: ${actualInfrastructure.join(", ")}`);

  git("add", "--", ...expectedInfrastructure);
  git("commit", "-m", "Support natural localized Reader editions");
  git("push", "origin", `HEAD:${branch}`);
  assert(git("status", "--porcelain") === "", "Checkout is not clean after alignment commit");

  run("node", ["scripts/import-telanas-volume-01.mjs"]);
  await validateGeneratedReader();
  run("npm", ["run", "validate"]);
  run("git", ["diff", "--check"]);

  const generatedFiles = [
    "content/worlds/telanas/books/dragon-knight/volume-01/book.json",
    "content/worlds/telanas/books/dragon-knight/volume-01/contextual-lexicon.json",
    "content/worlds/telanas/books/dragon-knight/volume-01/editions/de.json",
    "content/worlds/telanas/books/dragon-knight/volume-01/editions/en.json",
    "content/worlds/telanas/world.json",
  ].sort();
  const actualGenerated = git("diff", "--name-only").split("\n").filter(Boolean).sort();
  assert(JSON.stringify(actualGenerated) === JSON.stringify(generatedFiles), `Unexpected generated scope: ${actualGenerated.join(", ")}`);

  git("add", "--", ...generatedFiles);
  git("commit", "-m", "Integrate released Telanas Volume 1 reader content");
  git("push", "origin", `HEAD:${branch}`);

  const localHead = git("rev-parse", "HEAD");
  const remoteHead = git("ls-remote", "origin", `refs/heads/${branch}`).split(/\s+/)[0];
  assert(localHead === remoteHead, `Remote head mismatch: local=${localHead} remote=${remoteHead}`);
  assert(git("status", "--porcelain") === "", "Checkout is not clean after Band 1 integration");
  console.log(`PASS: complete Band 1 Reader integration confirmed: ${localHead}`);
};

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
