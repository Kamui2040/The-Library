import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const safeId = /^[a-z0-9][a-z0-9-]*$/;

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const assertId = (value, label) => {
  assert(typeof value === "string" && safeId.test(value), `${label} must use lowercase letters, numbers, and hyphens only`);
};

const assertLocalizedString = (value, label) => {
  assert(typeof value === "string" && value.trim(), `${label} is missing`);
};

const readJson = async (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  let raw;
  try {
    raw = await readFile(absolutePath, "utf8");
  } catch (error) {
    fail(`Cannot read ${relativePath}: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
};

const library = await readJson("content/library.json");
assert(Array.isArray(library.worlds), "content/library.json worlds must be an array");

let readerLinkCount = 0;

for (const worldRef of library.worlds) {
  const worldPath = path.posix.join("content", worldRef.manifest);
  const worldDirectory = path.posix.dirname(worldRef.manifest);
  const world = await readJson(worldPath);
  if (!world.lexicon) continue;

  const targets = new Map();

  for (const story of world.stories || []) {
    for (const bookRef of story.books || []) {
      const bookPath = path.posix.join("content", worldDirectory, bookRef.manifest);
      const bookDirectory = path.posix.dirname(bookPath);
      const book = await readJson(bookPath);
      const anchorsByLocale = new Map();

      for (const locale of book.locales || []) {
        const editionPath = path.posix.join(bookDirectory, book.editions?.[locale] || "");
        const edition = await readJson(editionPath);
        const anchors = new Set(["contents"]);

        for (const chapter of edition.chapters || []) {
          assertId(chapter.id, `${editionPath} chapter id`);
          anchors.add(chapter.id);
          for (const block of chapter.blocks || []) {
            assertId(block.id, `${editionPath} reader anchor`);
            anchors.add(block.id);
          }
        }

        anchorsByLocale.set(locale, anchors);
      }

      targets.set(`${story.id}/${book.id}`, {
        locales: new Set(book.locales || []),
        anchorsByLocale
      });
    }
  }

  const lexiconPath = path.posix.join("content", worldDirectory, world.lexicon);
  const lexicon = await readJson(lexiconPath);
  const lexiconLocales = Array.isArray(lexicon.locales) ? lexicon.locales : [];

  for (const entry of lexicon.entries || []) {
    for (const fragment of entry.fragments || []) {
      if (fragment.readerLinks === undefined) continue;
      const label = `Lexicon fragment ${entry.id}/${fragment.id}`;
      assert(Array.isArray(fragment.readerLinks), `${label} readerLinks must be an array`);
      assert(fragment.readerLinks.length > 0, `${label} readerLinks must not be empty`);

      const linkIds = new Set();
      for (const link of fragment.readerLinks) {
        assert(link && typeof link === "object" && !Array.isArray(link), `${label} has an invalid reader link`);
        assert(link.href === undefined && link.url === undefined, `${label} reader links must use semantic IDs, not stored URLs`);
        assertId(link.id, `${label} reader link id`);
        assert(!linkIds.has(link.id), `${label} has duplicate reader link id: ${link.id}`);
        linkIds.add(link.id);

        assertId(link.story, `${label}/${link.id} story`);
        assertId(link.book, `${label}/${link.id} book`);
        assertId(link.anchor, `${label}/${link.id} anchor`);

        const targetKey = `${link.story}/${link.book}`;
        const target = targets.get(targetKey);
        assert(target, `${label}/${link.id} references unknown reader target: ${targetKey}`);
        assert(link.labels && typeof link.labels === "object" && !Array.isArray(link.labels), `${label}/${link.id} labels are missing`);

        for (const locale of lexiconLocales) {
          assertLocalizedString(link.labels[locale], `${label}/${link.id} ${locale} label`);
          assert(target.locales.has(locale), `${label}/${link.id} target ${targetKey} has no ${locale} edition`);
          assert(
            target.anchorsByLocale.get(locale)?.has(link.anchor),
            `${label}/${link.id} references unknown ${locale} reader anchor: ${targetKey}/${link.anchor}`
          );
        }

        readerLinkCount += 1;
      }
    }
  }
}

console.log(`PASS: validated ${readerLinkCount} semantic Lexicon reader link(s)`);
