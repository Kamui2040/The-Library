import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedStates = new Set(["development", "prototype", "approved", "published"]);
const allowedVisibilityModes = new Set(["always", "completed-volume", "full-spoilers"]);
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

const validateVisibility = (visibility, label, storyBooks) => {
  assert(visibility && typeof visibility === "object", `${label} visibility is missing`);
  assert(allowedVisibilityModes.has(visibility.mode), `${label} has unsupported visibility mode: ${visibility.mode}`);

  if (visibility.mode === "completed-volume") {
    assertId(visibility.story, `${label} visibility story`);
    assertId(visibility.volume, `${label} visibility volume`);
    const books = storyBooks.get(visibility.story);
    assert(books, `${label} references unknown story: ${visibility.story}`);
    assert(books.has(visibility.volume), `${label} references unknown volume: ${visibility.story}/${visibility.volume}`);
  }
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
let lexiconEntryCount = 0;

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

  const worldDirectory = path.posix.dirname(worldRef.manifest);
  const storyIds = new Set();
  const storyBooks = new Map();

  for (const story of world.stories) {
    assertId(story.id, `Story id in ${world.id}`);
    assert(!storyIds.has(story.id), `Duplicate story id in ${world.id}: ${story.id}`);
    storyIds.add(story.id);
    assert(Array.isArray(story.books), `Story ${story.id} books must be an array`);

    const bookIds = new Set();
    storyBooks.set(story.id, bookIds);

    for (const bookRef of story.books) {
      assertId(bookRef.id, `Book id in ${story.id}`);
      assert(!bookIds.has(bookRef.id), `Duplicate book id in ${story.id}: ${bookRef.id}`);
      bookIds.add(bookRef.id);
      assertState(bookRef.state, `Book reference ${story.id}/${bookRef.id}`);
      assertRelativeManifest(bookRef.manifest, `Book ${story.id}/${bookRef.id} manifest`);

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
          assertLocalizedString(labels[required], `${bookPath} ${locale}.${required}`);
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
          assertLocalizedString(chapter.labels[locale], `Chapter ${chapter.id} ${locale} label`);
        }
      }

      if (book.contentMode === "placeholder") {
        const forbidden = findForbiddenPrototypeKey(book);
        assert(!forbidden, `${bookPath} placeholder manifest contains story-text field: ${forbidden}`);
      }
    }
  }

  if (world.lexicon) {
    assertRelativeManifest(world.lexicon, `World ${world.id} Lexicon manifest`);
    const lexiconPath = path.posix.join("content", worldDirectory, world.lexicon);
    const lexicon = await readJson(lexiconPath);

    assert(lexicon.schemaVersion === 1, `${lexiconPath} must use schemaVersion 1`);
    assert(lexicon.world === world.id, `${lexiconPath} world id does not match ${world.id}`);
    assertState(lexicon.state, `Lexicon ${world.id}`);
    assert(Array.isArray(lexicon.locales) && lexicon.locales.length > 0, `${lexiconPath} locales are missing`);
    assert(Array.isArray(lexicon.categories), `${lexiconPath} categories must be an array`);
    assert(Array.isArray(lexicon.entries), `${lexiconPath} entries must be an array`);

    for (const locale of lexicon.locales) {
      assert(world.locales.includes(locale), `${lexiconPath} uses locale not enabled for world ${world.id}: ${locale}`);
    }

    const categoryIds = new Set();
    for (const category of lexicon.categories) {
      assertId(category.id, `Lexicon category id in ${world.id}`);
      assert(!categoryIds.has(category.id), `Duplicate Lexicon category id: ${category.id}`);
      categoryIds.add(category.id);
      assert(category.labels && typeof category.labels === "object", `Lexicon category ${category.id} labels are missing`);
      for (const locale of lexicon.locales) {
        assertLocalizedString(category.labels[locale], `Lexicon category ${category.id} ${locale} label`);
      }
    }

    const entryIds = new Set();
    for (const entry of lexicon.entries) {
      assertId(entry.id, `Lexicon entry id in ${world.id}`);
      assert(!entryIds.has(entry.id), `Duplicate Lexicon entry id: ${entry.id}`);
      entryIds.add(entry.id);
      lexiconEntryCount += 1;

      assert(Array.isArray(entry.categories) && entry.categories.length > 0, `Lexicon entry ${entry.id} categories are missing`);
      for (const category of entry.categories) {
        assert(categoryIds.has(category), `Lexicon entry ${entry.id} uses unknown category: ${category}`);
      }

      validateVisibility(entry.visibility, `Lexicon entry ${entry.id}`, storyBooks);
      if (lexicon.state === "prototype" && entry.visibility.mode === "full-spoilers") {
        assert(entry.prototypeOnly === true, `Prototype full-spoilers entry ${entry.id} must be marked prototypeOnly`);
      }

      assert(entry.labels && typeof entry.labels === "object", `Lexicon entry ${entry.id} labels are missing`);
      for (const locale of lexicon.locales) {
        const labels = entry.labels[locale];
        assert(labels && typeof labels === "object", `Lexicon entry ${entry.id} is missing ${locale} labels`);
        assertLocalizedString(labels.title, `Lexicon entry ${entry.id} ${locale} title`);
        assertLocalizedString(labels.summary, `Lexicon entry ${entry.id} ${locale} summary`);
      }

      assert(Array.isArray(entry.fragments), `Lexicon entry ${entry.id} fragments must be an array`);
      const fragmentIds = new Set();
      for (const fragment of entry.fragments) {
        assertId(fragment.id, `Lexicon fragment id in ${entry.id}`);
        assert(!fragmentIds.has(fragment.id), `Duplicate Lexicon fragment id in ${entry.id}: ${fragment.id}`);
        fragmentIds.add(fragment.id);
        validateVisibility(fragment.visibility, `Lexicon fragment ${entry.id}/${fragment.id}`, storyBooks);
        assert(fragment.text && typeof fragment.text === "object", `Lexicon fragment ${entry.id}/${fragment.id} text is missing`);
        for (const locale of lexicon.locales) {
          assertLocalizedString(fragment.text[locale], `Lexicon fragment ${entry.id}/${fragment.id} ${locale} text`);
        }
      }
    }
  }
}

assert(worldIds.has(library.defaultWorld), `Default world does not exist: ${library.defaultWorld}`);
console.log(`PASS: validated ${worldCount} world(s), ${bookCount} book(s), ${chapterCount} chapter(s), ${lexiconEntryCount} Lexicon entry/entries`);
