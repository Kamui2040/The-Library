import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const safeId = /^[a-z0-9][a-z0-9-]*$/;
const allowedStates = new Set(["development", "prototype", "approved", "published"]);
const allowedVisibilityModes = new Set(["always", "completed-volume", "full-spoilers"]);

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const assertId = (value, label) => {
  assert(typeof value === "string" && safeId.test(value), `${label} must use lowercase letters, numbers, and hyphens only`);
};
const assertLocalizedString = (value, label) => {
  assert(typeof value === "string" && value.trim(), `${label} is missing`);
};
const assertRelativePath = (value, label) => {
  assert(typeof value === "string" && value, `${label} is missing`);
  assert(!path.posix.isAbsolute(value), `${label} must be relative`);
  assert(!value.split("/").includes(".."), `${label} must not escape its content directory`);
};

const readJson = async (relativePath) => {
  let raw;
  try {
    raw = await readFile(path.join(root, relativePath), "utf8");
  } catch (error) {
    fail(`Cannot read ${relativePath}: ${error.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
};

const worldPath = "content/worlds/telanas/world.json";
const world = await readJson(worldPath);
assert(world.id === "telanas", `${worldPath} must describe telanas`);
assertRelativePath(world.timeline, `${worldPath} timeline`);

const worldDirectory = path.posix.dirname(worldPath);
const timelinePath = path.posix.join(worldDirectory, world.timeline);
const timeline = await readJson(timelinePath);

assert(timeline.schemaVersion === 1, `${timelinePath} must use schemaVersion 1`);
assert(timeline.world === world.id, `${timelinePath} world id does not match ${world.id}`);
assert(allowedStates.has(timeline.state), `${timelinePath} has unsupported state: ${timeline.state}`);
assert(Array.isArray(timeline.locales) && timeline.locales.length > 0, `${timelinePath} locales are missing`);
assert(Array.isArray(timeline.events), `${timelinePath} events must be an array`);

for (const locale of timeline.locales) {
  assert(world.locales?.includes(locale), `${timelinePath} uses locale not enabled for world ${world.id}: ${locale}`);
}

const storyBooks = new Map();
const targets = new Map();

for (const story of world.stories || []) {
  const books = new Set();
  storyBooks.set(story.id, books);

  for (const bookRef of story.books || []) {
    books.add(bookRef.id);
    const bookPath = path.posix.join("content", worldDirectory, bookRef.manifest);
    const bookDirectory = path.posix.dirname(bookPath);
    const book = await readJson(bookPath);
    const anchorsByLocale = new Map();

    for (const locale of book.locales || []) {
      const editionPath = path.posix.join(bookDirectory, book.editions?.[locale] || "");
      const edition = await readJson(editionPath);
      const anchors = new Set(["contents"]);
      for (const chapter of edition.chapters || []) {
        anchors.add(chapter.id);
        for (const block of chapter.blocks || []) anchors.add(block.id);
      }
      anchorsByLocale.set(locale, anchors);
    }

    targets.set(`${story.id}/${book.id}`, {
      locales: new Set(book.locales || []),
      anchorsByLocale
    });
  }
}

const validateVisibility = (visibility, label) => {
  assert(visibility && typeof visibility === "object" && !Array.isArray(visibility), `${label} visibility is missing`);
  assert(allowedVisibilityModes.has(visibility.mode), `${label} has unsupported visibility mode: ${visibility.mode}`);

  if (visibility.mode === "completed-volume") {
    assertId(visibility.story, `${label} visibility story`);
    assertId(visibility.volume, `${label} visibility volume`);
    const books = storyBooks.get(visibility.story);
    assert(books, `${label} references unknown story: ${visibility.story}`);
    assert(books.has(visibility.volume), `${label} references unknown volume: ${visibility.story}/${visibility.volume}`);
  }
};

const eventIds = new Set();
const eventOrders = new Set();
let readerLinkCount = 0;

for (const event of timeline.events) {
  assert(event && typeof event === "object" && !Array.isArray(event), `${timelinePath} contains an invalid event`);
  assertId(event.id, "Timeline event id");
  assert(!eventIds.has(event.id), `Duplicate timeline event id: ${event.id}`);
  eventIds.add(event.id);

  assert(Number.isInteger(event.order), `Timeline event ${event.id} order must be an integer`);
  assert(!eventOrders.has(event.order), `Duplicate timeline event order: ${event.order}`);
  eventOrders.add(event.order);

  validateVisibility(event.visibility, `Timeline event ${event.id}`);
  if (timeline.state === "prototype") {
    assert(event.prototypeOnly === true, `Prototype timeline event ${event.id} must be marked prototypeOnly`);
  }

  assert(event.labels && typeof event.labels === "object" && !Array.isArray(event.labels), `Timeline event ${event.id} labels are missing`);
  for (const locale of timeline.locales) {
    const labels = event.labels[locale];
    assert(labels && typeof labels === "object", `Timeline event ${event.id} is missing ${locale} labels`);
    for (const field of ["period", "title", "summary"]) {
      assertLocalizedString(labels[field], `Timeline event ${event.id} ${locale}.${field}`);
    }
  }

  if (event.readerLinks === undefined) continue;
  assert(Array.isArray(event.readerLinks) && event.readerLinks.length > 0, `Timeline event ${event.id} readerLinks must be a non-empty array`);
  const linkIds = new Set();

  for (const link of event.readerLinks) {
    const label = `Timeline event ${event.id} reader link`;
    assert(link && typeof link === "object" && !Array.isArray(link), `${label} is invalid`);
    assert(link.href === undefined && link.url === undefined, `${label} must use semantic IDs, not stored URLs`);
    assertId(link.id, `${label} id`);
    assert(!linkIds.has(link.id), `Timeline event ${event.id} has duplicate reader link id: ${link.id}`);
    linkIds.add(link.id);
    assertId(link.story, `${label} story`);
    assertId(link.book, `${label} book`);
    assertId(link.anchor, `${label} anchor`);

    const targetKey = `${link.story}/${link.book}`;
    const target = targets.get(targetKey);
    assert(target, `${label} ${link.id} references unknown reader target: ${targetKey}`);
    assert(link.labels && typeof link.labels === "object" && !Array.isArray(link.labels), `${label} ${link.id} labels are missing`);

    for (const locale of timeline.locales) {
      assertLocalizedString(link.labels[locale], `${label} ${link.id} ${locale} label`);
      assert(target.locales.has(locale), `${label} ${link.id} target ${targetKey} has no ${locale} edition`);
      assert(target.anchorsByLocale.get(locale)?.has(link.anchor), `${label} ${link.id} references unknown ${locale} anchor: ${targetKey}/${link.anchor}`);
    }
    readerLinkCount += 1;
  }
}

console.log(`PASS: validated ${timeline.events.length} spoiler-safe timeline event(s), ${readerLinkCount} semantic reader link(s)`);
