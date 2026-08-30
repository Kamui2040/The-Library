import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedStates = new Set(["development", "prototype", "approved", "published"]);
const safeId = /^[a-z0-9][a-z0-9-]*$/;
const forbiddenPrototypeKeys = new Set(["storyText", "prose", "paragraphs", "html", "markdown", "body"]);

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const assertId = (value, label) => {
  assert(typeof value === "string" && safeId.test(value), `${label} must use lowercase letters, numbers, and hyphens only`);
};

const assertState = (value, label) => {
  assert(allowedStates.has(value), `${label} has unsupported state: ${value}`);
};

const assertRelativeManifest = (value, label) => {
  assert(typeof value === "string" && value.length > 0, `${label} is missing`);
  assert(!path.posix.isAbsolute(value), `${label} must be relative`);
  assert(!value.split("/").includes(".."), `${label} must not escape its content directory`);
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

const findForbiddenPrototypeKey = (value, trail = "book") => {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenPrototypeKey(value[index], `${trail}[${index}]`);
      if (found) return found;
    }
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenPrototypeKeys.has(key)) return `${trail}.${key}`;
    const found = findForbiddenPrototypeKey(child, `${trail}.${key}`);
    if (found) return found;
  }
  return null;
};

const library = await readJson("content/library.json");
assert(library.schemaVersion === 1, "content/library.json must use schemaVersion 1");
assertId(library.id, "Library id");
assertState(library.state, "Library");
assert(library.locales && typeof library.locales === "object", "Library locales are missing");
assert(Array.isArray(library.worlds), "Library worlds must be an array");

const enabledLocales = new Set(
  Object.entries(library.locales)
    .filter(([, config]) => config?.enabled === true)
    .map(([locale]) => locale),
);
assert(enabledLocales.size > 0, "At least one Library locale must be enabled");

const worldIds = new Set();
let worldCount = 0;
let bookCount = 0;
let chapterCount = 0;

for (const worldRef of library.worlds) {
  assertId(worldRef.id, "World id");
  assert(!worldIds.has(worldRef.id), `Duplicate world id: ${worldRef.id}`);
  worldIds.add(worldRef.id);
  assertRelativeManifest(worldRef.manifest, `World ${worldRef.id} manifest`);

  const worldPath = path.posix.join("content", worldRef.manifest);
  const world = await readJson(worldPath);
  worldCount += 1;

  assert(world.schemaVersion === 1, `${worldPath} must use schemaVersion 1`);
  assert(world.id === worldRef.id, `${worldPath} id does not match Library registry`);
  assertState(world.state, `World ${world.id}`);
  assert(Array.isArray(world.locales) && world.locales.length > 0, `World ${world.id} locales are missing`);
  assert(Array.isArray(world.stories), `World ${world.id} stories must be an array`);

  for (const locale of world.locales) {
    assert(enabledLocales.has(locale), `World ${world.id} uses disabled or unknown locale: ${locale}`);
  }

  const storyIds = new Set();
  for (const story of world.stories) {
    assertId(story.id, `Story id in ${world.id}`);
    assert(!storyIds.has(story.id), `Duplicate story id in ${world.id}: ${story.id}`);
    storyIds.add(story.id);
    assert(Array.isArray(story.books), `Story ${story.id} books must be an array`);

    const bookIds = new Set();
    for (const bookRef of story.books) {
      assertId(bookRef.id, `Book id in ${story.id}`);
      assert(!bookIds.has(bookRef.id), `Duplicate book id in ${story.id}: ${bookRef.id}`);
      bookIds.add(bookRef.id);
      assertState(bookRef.state, `Book reference ${story.id}/${bookRef.id}`);
      assertRelativeManifest(bookRef.manifest, `Book ${story.id}/${bookRef.id} manifest`);

      const worldDirectory = path.posix.dirname(worldRef.manifest);
      const bookPath = path.posix.join("content", worldDirectory, bookRef.manifest);
      const book = await readJson(bookPath);
      bookCount += 1;

      assert(book.schemaVersion === 1, `${bookPath} must use schemaVersion 1`);
      assert(book.world === world.id, `${bookPath} world id does not match ${world.id}`);
      assert(book.story === story.id, `${bookPath} story id does not match ${story.id}`);
      assert(book.id === bookRef.id, `${bookPath} book id does not match ${bookRef.id}`);
      assertState(book.state, `Book ${story.id}/${book.id}`);
      assert(book.state === bookRef.state, `${bookPath} state does not match its world registry entry`);
      assert(Array.isArray(book.locales) && book.locales.length > 0, `${bookPath} locales are missing`);
      assert(book.labels && typeof book.labels === "object", `${bookPath} labels are missing`);
      assert(Array.isArray(book.chapters), `${bookPath} chapters must be an array`);

      for (const locale of book.locales) {
        assert(world.locales.includes(locale), `${bookPath} uses locale not enabled for world ${world.id}: ${locale}`);
        const labels = book.labels[locale];
        assert(labels && typeof labels === "object", `${bookPath} is missing ${locale} book labels`);
        for (const required of ["world", "series", "volume", "contents"]) {
          assert(typeof labels[required] === "string" && labels[required].trim(), `${bookPath} is missing ${locale}.${required}`);
        }
      }

      const chapterIds = new Set();
      const chapterSlugs = new Set();
      for (const chapter of book.chapters) {
        assertId(chapter.id, `Chapter id in ${book.id}`);
        assertId(chapter.slug, `Chapter slug in ${book.id}`);
        assert(!chapterIds.has(chapter.id), `Duplicate chapter id in ${book.id}: ${chapter.id}`);
        assert(!chapterSlugs.has(chapter.slug), `Duplicate chapter slug in ${book.id}: ${chapter.slug}`);
        chapterIds.add(chapter.id);
        chapterSlugs.add(chapter.slug);
        chapterCount += 1;

        assert(chapter.labels && typeof chapter.labels === "object", `Chapter ${chapter.id} labels are missing`);
        for (const locale of book.locales) {
          assert(typeof chapter.labels[locale] === "string" && chapter.labels[locale].trim(), `Chapter ${chapter.id} is missing ${locale} label`);
        }
      }

      if (book.contentMode === "placeholder") {
        const forbidden = findForbiddenPrototypeKey(book);
        assert(!forbidden, `${bookPath} placeholder manifest contains story-text field: ${forbidden}`);
      }
    }
  }
}

assert(worldIds.has(library.defaultWorld), `Default world does not exist: ${library.defaultWorld}`);
console.log(`PASS: validated ${worldCount} world(s), ${bookCount} book(s), ${chapterCount} chapter(s)`);
