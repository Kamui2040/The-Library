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
assertRelativePath(world.map, `${worldPath} map`);

const worldDirectory = path.posix.dirname(worldPath);
const mapPath = path.posix.join(worldDirectory, world.map);
const map = await readJson(mapPath);

assert(map.schemaVersion === 1, `${mapPath} must use schemaVersion 1`);
assert(map.world === world.id, `${mapPath} world id does not match ${world.id}`);
assert(allowedStates.has(map.state), `${mapPath} has unsupported state: ${map.state}`);
assert(Array.isArray(map.locales) && map.locales.length > 0, `${mapPath} locales are missing`);
assert(Array.isArray(map.markers), `${mapPath} markers must be an array`);
assert(map.labels && typeof map.labels === "object" && !Array.isArray(map.labels), `${mapPath} labels are missing`);

for (const locale of map.locales) {
  assert(world.locales?.includes(locale), `${mapPath} uses locale not enabled for world ${world.id}: ${locale}`);
  const labels = map.labels[locale];
  assert(labels && typeof labels === "object", `${mapPath} is missing ${locale} labels`);
  assertLocalizedString(labels.title, `${mapPath} ${locale}.title`);
  assertLocalizedString(labels.intro, `${mapPath} ${locale}.intro`);
}

const storyBooks = new Map();
const targets = new Map();

for (const story of world.stories || []) {
  const books = new Set();
  storyBooks.set(story.id, books);

  for (const bookRef of story.books || []) {
    books.add(bookRef.id);
    const bookPath = path.posix.join(worldDirectory, bookRef.manifest);
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

const markerIds = new Set();
const markerOrders = new Set();
let readerLinkCount = 0;

for (const marker of map.markers) {
  assert(marker && typeof marker === "object" && !Array.isArray(marker), `${mapPath} contains an invalid marker`);
  assertId(marker.id, "Map marker id");
  assert(!markerIds.has(marker.id), `Duplicate map marker id: ${marker.id}`);
  markerIds.add(marker.id);

  assert(Number.isInteger(marker.order), `Map marker ${marker.id} order must be an integer`);
  assert(!markerOrders.has(marker.order), `Duplicate map marker order: ${marker.order}`);
  markerOrders.add(marker.order);

  assert(typeof marker.x === "number" && Number.isFinite(marker.x) && marker.x >= 0 && marker.x <= 100, `Map marker ${marker.id} x must be between 0 and 100`);
  assert(typeof marker.y === "number" && Number.isFinite(marker.y) && marker.y >= 0 && marker.y <= 100, `Map marker ${marker.id} y must be between 0 and 100`);
  validateVisibility(marker.visibility, `Map marker ${marker.id}`);

  if (map.state === "prototype") {
    assert(marker.prototypeOnly === true, `Prototype map marker ${marker.id} must be marked prototypeOnly`);
  }

  assert(marker.labels && typeof marker.labels === "object" && !Array.isArray(marker.labels), `Map marker ${marker.id} labels are missing`);
  for (const locale of map.locales) {
    const labels = marker.labels[locale];
    assert(labels && typeof labels === "object", `Map marker ${marker.id} is missing ${locale} labels`);
    for (const field of ["kind", "title", "summary"]) {
      assertLocalizedString(labels[field], `Map marker ${marker.id} ${locale}.${field`);
    }
  }

  if (marker.readerLinks === undefined) continue;
  assert(Array.isArray(marker.readerLinks) && marker.readerLinks.length > 0, `Map marker ${marker.id} readerLinks must be a non-empty array`);
  const linkIds = new Set();

  for (const link of marker.readerLinks) {
    const label = `Map marker ${marker.id} reader link`;
    assert(link && typeof link === "object" && !Array.isArray(link), `${label} is invalid`);
    assert(link.href === undefined && link.url === undefined, `${label} must use semantic IDs, not stored URLs`);
    assertId(link.id, `${label} id`);
    assert(!linkIds.has(link.id), `Map marker ${marker.id} has duplicate reader link id: ${link.id}`);
    linkIds.add(link.id);
    assertId(link.story, `${label} story`);
    assertId(link.book, `${label} book`);
    assertId(link.anchor, `${label} anchor`);

    const targetKey = `${link.story}/${link.book}`;
    const target = targets.get(targetKey);
    assert(target, `${label} ${link.id} references unknown reader target: ${targetKey}`);
    assert(link.labels && typeof link.labels === "object" && !Array.isArray(link.labels), `${label} ${link.id} labels are missing`);

    for (const locale of map.locales) {
      assertLocalizedString(link.labels[locale], `${label} ${link.id} ${locale} label`);
      assert(target.locales.has(locale), `${label} ${link.id} target ${targetKey} has no ${locale} edition`);
      assert(target.anchorsByLocale.get(locale)?.has(link.anchor), `${label} ${link.id} references unknown ${locale} anchor: ${targetKey}/${link.anchor}`);
    }
    readerLinkCount += 1;
  }
}

console.log(`PASS: validated ${map.markers.length} spoiler-safe map marker(s), ${readerLinkCount} semantic reader link(s)`);
