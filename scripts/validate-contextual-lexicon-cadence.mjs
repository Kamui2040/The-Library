import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));

const bookPath = "content/worlds/telanas/books/dragon-knight/volume-01/book.json";
const bookDirectory = path.posix.dirname(bookPath);
const book = await readJson(bookPath);
const worldPath = "content/worlds/telanas/world.json";
const world = await readJson(worldPath);
const lexiconPath = path.posix.join(path.posix.dirname(worldPath), world.lexicon);
const lexicon = await readJson(lexiconPath);
const contextualPath = path.posix.join(bookDirectory, book.contextualLexicon);
const contextual = await readJson(contextualPath);

const lexiconEntries = new Map((lexicon.entries || []).map((entry) => [entry.id, entry]));
const milestoneIds = new Set(book.spoilerMilestones || []);
const signatures = new Map();

const revealDetails = (entry) => [
  ...(Array.isArray(entry?.fragments) ? entry.fragments : []),
  ...(Array.isArray(entry?.sections) ? entry.sections : []),
];

for (const locale of book.locales || []) {
  const editionPath = path.posix.join(bookDirectory, book.editions?.[locale] || "");
  const edition = await readJson(editionPath);
  const chapterByAnchor = new Map();
  const chapterBlocks = new Map();
  const blockIndexByChapter = new Map();

  for (const chapter of edition.chapters || []) {
    const blocks = chapter.blocks || [];
    chapterBlocks.set(chapter.id, blocks);
    const indexes = new Map();
    blocks.forEach((block, index) => {
      chapterByAnchor.set(block.id, chapter.id);
      indexes.set(block.id, index);
    });
    blockIndexByChapter.set(chapter.id, indexes);
  }

  const references = contextual.references?.[locale] || [];
  const previousByChapterEntry = new Map();
  const signature = [];

  for (const reference of references) {
    const chapter = chapterByAnchor.get(reference.anchor);
    assert(chapter, `${contextualPath} ${locale}/${reference.anchor} has no owning chapter`);
    const indexes = blockIndexByChapter.get(chapter);
    const currentIndex = indexes?.get(reference.anchor);
    assert(Number.isInteger(currentIndex), `${contextualPath} ${locale}/${reference.anchor} has no block position`);

    const key = `${chapter}:${reference.entry}`;
    const previous = previousByChapterEntry.get(key);

    if (!previous) {
      assert(
        reference.repeatReason === undefined,
        `${contextualPath} ${locale}/${reference.anchor} first ${reference.entry} link in ${chapter} must not declare repeatReason`,
      );
    } else {
      const previousIndex = indexes?.get(previous.anchor);
      assert(
        Number.isInteger(previousIndex) && currentIndex > previousIndex,
        `${contextualPath} ${locale}/${reference.anchor} repeated ${reference.entry} link must come after its prior link in story order`,
      );

      if (reference.repeatReason === "scene-gap") {
        const blocks = chapterBlocks.get(chapter) || [];
        const hasSceneBreak = blocks
          .slice(previousIndex + 1, currentIndex)
          .some((block) => block.type === "scene-break");
        assert(
          hasSceneBreak,
          `${contextualPath} ${locale}/${reference.anchor} declares scene-gap for ${reference.entry} without an intervening scene-break block`,
        );
      } else if (reference.repeatReason === "newly-unlocked-detail") {
        const entry = lexiconEntries.get(reference.entry);
        assert(entry, `${contextualPath} ${locale}/${reference.anchor} references unknown Lexicon entry ${reference.entry}`);
        const hasNewReveal = revealDetails(entry).some((detail) => {
          const visibility = detail?.visibility;
          if (visibility?.mode !== "reached-anchor") return false;
          if (visibility.story !== book.story || visibility.book !== book.id || visibility.chapter !== chapter) return false;
          if (!milestoneIds.has(visibility.anchor)) return false;
          const revealIndex = indexes?.get(visibility.anchor);
          return Number.isInteger(revealIndex) && revealIndex > previousIndex && revealIndex <= currentIndex;
        });
        assert(
          hasNewReveal,
          `${contextualPath} ${locale}/${reference.anchor} declares newly-unlocked-detail for ${reference.entry} without a new reached-anchor Lexicon detail revealed since the prior link`,
        );
      } else {
        fail(
          `${contextualPath} ${locale}/${reference.anchor} repeats ${reference.entry} in ${chapter} without a structurally verified repeatReason`,
        );
      }
    }

    previousByChapterEntry.set(key, reference);
    signature.push({
      chapter,
      anchor: reference.anchor,
      entry: reference.entry,
      occurrence: reference.occurrence,
      repeatReason: reference.repeatReason || null,
    });
  }

  signatures.set(locale, signature);
}

const baselineLocale = book.locales?.[0];
const baseline = JSON.stringify(signatures.get(baselineLocale) || []);
for (const locale of (book.locales || []).slice(1)) {
  assert(
    JSON.stringify(signatures.get(locale) || []) === baseline,
    `${contextualPath} contextual Lexicon cadence must match across locales; ${locale} differs from ${baselineLocale}`,
  );
}

console.log("PASS: contextual Reader Lexicon repeat reasons are backed by Reader structure and spoiler-gated Lexicon data");
