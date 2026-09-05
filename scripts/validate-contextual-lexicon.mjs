import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const safeId = /^[a-z0-9][a-z0-9-]*$/;

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const assertId = (value, label) => {
  assert(typeof value === "string" && safeId.test(value), `${label} must use lowercase letters, numbers, and hyphens only`);
};

const readText = async (relativePath) => readFile(path.join(root, relativePath), "utf8");
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));

const bookPath = "content/worlds/telanas/books/dragon-knight/volume-01/book.json";
const bookDirectory = path.posix.dirname(bookPath);
const book = await readJson(bookPath);
const worldPath = "content/worlds/telanas/world.json";
const world = await readJson(worldPath);
const lexiconPath = path.posix.join(path.posix.dirname(worldPath), world.lexicon);
const lexicon = await readJson(lexiconPath);

assert(book.contextualLexicon && typeof book.contextualLexicon === "string", `${bookPath} contextualLexicon is missing`);
const contextualPath = path.posix.join(bookDirectory, book.contextualLexicon);
const contextual = await readJson(contextualPath);

assert(contextual.schemaVersion === 1, `${contextualPath} must use schemaVersion 1`);
assert(contextual.world === book.world, `${contextualPath} world does not match book`);
assert(contextual.story === book.story, `${contextualPath} story does not match book`);
assert(contextual.book === book.id, `${contextualPath} book does not match book manifest`);
assert(Array.isArray(contextual.locales), `${contextualPath} locales must be an array`);
assert(contextual.references && typeof contextual.references === "object" && !Array.isArray(contextual.references), `${contextualPath} references are missing`);

const bookLocales = new Set(book.locales || []);
assert(contextual.locales.length === bookLocales.size, `${contextualPath} locale count must match book locales`);
for (const locale of contextual.locales) {
  assert(bookLocales.has(locale), `${contextualPath} uses unknown locale: ${locale}`);
}

const lexiconEntries = new Map((lexicon.entries || []).map((entry) => [entry.id, entry]));
const editions = new Map();
const anchorsByLocale = new Map();
const paragraphByLocale = new Map();

for (const locale of book.locales || []) {
  const editionPath = path.posix.join(bookDirectory, book.editions?.[locale] || "");
  const edition = await readJson(editionPath);
  editions.set(locale, edition);

  const anchors = new Set(["contents"]);
  const paragraphs = new Map();
  for (const chapter of edition.chapters || []) {
    anchors.add(chapter.id);
    for (const block of chapter.blocks || []) {
      anchors.add(block.id);
      if (block.type === "paragraph") paragraphs.set(block.id, block.text);
    }
  }
  anchorsByLocale.set(locale, anchors);
  paragraphByLocale.set(locale, paragraphs);
}

const milestones = book.spoilerMilestones || [];
assert(Array.isArray(milestones), `${bookPath} spoilerMilestones must be an array`);
const milestoneIds = new Set();
for (const milestone of milestones) {
  assertId(milestone, `${bookPath} spoiler milestone`);
  assert(!milestoneIds.has(milestone), `${bookPath} has duplicate spoiler milestone: ${milestone}`);
  milestoneIds.add(milestone);
  for (const locale of book.locales || []) {
    assert(anchorsByLocale.get(locale)?.has(milestone), `${bookPath} spoiler milestone ${milestone} is missing from ${locale} edition`);
  }
}

const findOccurrence = (source, needle, occurrence) => {
  let from = 0;
  let found = -1;
  for (let count = 0; count < occurrence; count += 1) {
    found = source.indexOf(needle, from);
    if (found < 0) return -1;
    from = found + needle.length;
  }
  return found;
};

let referenceCount = 0;
for (const locale of book.locales || []) {
  const references = contextual.references[locale];
  assert(Array.isArray(references), `${contextualPath} ${locale} references must be an array`);
  const rangesByAnchor = new Map();

  for (const reference of references) {
    assert(reference && typeof reference === "object" && !Array.isArray(reference), `${contextualPath} ${locale} has invalid reference`);
    assertId(reference.anchor, `${contextualPath} ${locale} reference anchor`);
    assertId(reference.entry, `${contextualPath} ${locale} reference entry`);
    assert(lexiconEntries.has(reference.entry), `${contextualPath} ${locale} references unknown Lexicon entry: ${reference.entry}`);
    assert(anchorsByLocale.get(locale)?.has(reference.anchor), `${contextualPath} ${locale} references unknown Reader anchor: ${reference.anchor}`);

    const paragraph = paragraphByLocale.get(locale)?.get(reference.anchor);
    assert(typeof paragraph === "string", `${contextualPath} ${locale} contextual reference must target a paragraph: ${reference.anchor}`);
    assert(typeof reference.text === "string" && reference.text.length > 0, `${contextualPath} ${locale}/${reference.anchor} reference text is missing`);
    assert(Number.isInteger(reference.occurrence) && reference.occurrence > 0, `${contextualPath} ${locale}/${reference.anchor} occurrence must be a positive integer`);

    const start = findOccurrence(paragraph, reference.text, reference.occurrence);
    assert(start >= 0, `${contextualPath} ${locale}/${reference.anchor} cannot find occurrence ${reference.occurrence} of ${JSON.stringify(reference.text)}`);
    const range = { start, end: start + reference.text.length };
    const existing = rangesByAnchor.get(reference.anchor) || [];
    assert(
      existing.every((candidate) => range.end <= candidate.start || range.start >= candidate.end),
      `${contextualPath} ${locale}/${reference.anchor} has overlapping contextual references`,
    );
    existing.push(range);
    rangesByAnchor.set(reference.anchor, existing);
    referenceCount += 1;
  }
}

assert(referenceCount > 0, `${contextualPath} must exercise at least one contextual Reader Lexicon reference`);
assert(milestones.length > 0, `${bookPath} must exercise at least one semantic spoiler milestone`);

const profileSource = await readText("assets/spoiler-profile.js");
const storage = new Map([
  ["library-spoiler-profile-v1", JSON.stringify({
    version: 1,
    fullSpoilers: false,
    worlds: {
      telanas: {
        completed: {
          "dragon-knight": "none"
        }
      }
    }
  })]
]);

const context = {
  window: {
    dispatchEvent() {}
  },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }
  },
  CustomEvent: class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  }
};
vm.runInNewContext(profileSource, context, { filename: "assets/spoiler-profile.js" });
const profileApi = context.window.LibrarySpoilerProfile;
assert(profileApi, "Shared spoiler profile API did not initialize");
assert(profileApi.storageKey === "library-spoiler-profile-v2", "Spoiler profile must use v2 storage");

const migrated = profileApi.get();
assert(migrated.version === 2, "Legacy spoiler profile must normalize to version 2");
assert(storage.has("library-spoiler-profile-v2"), "Legacy spoiler profile must migrate into v2 storage");

const milestone = milestones[0];
const reachedVisibility = {
  mode: "reached-anchor",
  story: book.story,
  book: book.id,
  anchor: milestone
};
assert(
  profileApi.visibilityAllowed(world, reachedVisibility, migrated) === false,
  "Reached-anchor visibility must stay hidden before the milestone is reached",
);

profileApi.markReachedAnchors(book.world, book.story, book.id, [milestone]);
const reachedProfile = profileApi.get();
assert(
  profileApi.hasReachedAnchor(reachedProfile, book.world, book.story, book.id, milestone),
  "Reached milestone must persist in the shared spoiler profile",
);
assert(
  profileApi.visibilityAllowed(world, reachedVisibility, reachedProfile) === true,
  "Reached-anchor visibility must unlock after the milestone is reached",
);

profileApi.set({
  version: 2,
  fullSpoilers: false,
  worlds: {
    [book.world]: {
      completed: {
        [book.story]: book.id
      },
      reached: {}
    }
  }
});
const completedProfile = profileApi.get();
assert(
  profileApi.visibilityAllowed(world, reachedVisibility, completedProfile) === true,
  "Completed volume must supersede its internal reached-anchor gates",
);

const readerLexicon = await readText("assets/reader/reader-lexicon.js");
assert(readerLexicon.includes("profileApi.visibilityAllowed"), "Reader contextual Lexicon must use the shared visibility calculation");
assert(readerLexicon.includes("profileApi.markReachedAnchors"), "Reader contextual Lexicon must persist semantic spoiler milestones");
assert(readerLexicon.includes("book.spoilerMilestones"), "Reader contextual Lexicon must read sparse spoiler milestones from the book manifest");
assert(readerLexicon.includes("book.contextualLexicon"), "Reader contextual Lexicon must load explicit contextual annotations from the book manifest");
assert(readerLexicon.includes("data-reader-lexicon-entry"), "Reader contextual Lexicon must render explicit in-prose controls");

const lexiconController = await readText("assets/lexicon/lexicon.js");
assert(lexiconController.includes("profileApi.visibilityAllowed"), "Dedicated Lexicon must use the shared visibility calculation");

for (const locale of ["en", "de"]) {
  const readerPath = `${locale}/telanas/read/dragon-knight/volume-01/index.html`;
  const html = await readText(readerPath);
  assert(html.includes('href="../../../../../assets/reader/reader-lexicon.css"'), `${readerPath} must load contextual Lexicon presentation`);
  assert(html.includes('src="../../../../../assets/reader/reader-lexicon.js"'), `${readerPath} must load contextual Lexicon behavior`);
}

console.log(
  `PASS: validated ${milestones.length} semantic spoiler milestone(s) and ` +
  `${referenceCount} contextual Reader Lexicon reference(s)`,
);
