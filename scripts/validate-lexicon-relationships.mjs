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

let relationshipCount = 0;

for (const worldRef of library.worlds) {
  const worldPath = path.posix.join("content", worldRef.manifest);
  const worldDirectory = path.posix.dirname(worldRef.manifest);
  const world = await readJson(worldPath);
  if (!world.lexicon) continue;

  const lexiconPath = path.posix.join("content", worldDirectory, world.lexicon);
  const lexicon = await readJson(lexiconPath);
  const locales = Array.isArray(lexicon.locales) ? lexicon.locales : [];
  const entries = Array.isArray(lexicon.entries) ? lexicon.entries : [];
  const entryIds = new Set();

  for (const entry of entries) {
    assertId(entry.id, `${lexiconPath} entry id`);
    assert(!entryIds.has(entry.id), `${lexiconPath} has duplicate entry id: ${entry.id}`);
    entryIds.add(entry.id);
  }

  for (const entry of entries) {
    if (entry.relationships === undefined) continue;
    const label = `Lexicon entry ${entry.id}`;
    assert(Array.isArray(entry.relationships), `${label} relationships must be an array`);
    assert(entry.relationships.length > 0, `${label} relationships must not be empty`);

    const relationshipIds = new Set();
    for (const relationship of entry.relationships) {
      assert(
        relationship && typeof relationship === "object" && !Array.isArray(relationship),
        `${label} has an invalid relationship`,
      );
      assert(
        relationship.href === undefined && relationship.url === undefined,
        `${label} relationships must use stable entry IDs, not stored URLs`,
      );
      assertId(relationship.id, `${label} relationship id`);
      assert(!relationshipIds.has(relationship.id), `${label} has duplicate relationship id: ${relationship.id}`);
      relationshipIds.add(relationship.id);

      assertId(relationship.target, `${label}/${relationship.id} target`);
      assert(relationship.target !== entry.id, `${label}/${relationship.id} must not target itself`);
      assert(entryIds.has(relationship.target), `${label}/${relationship.id} references unknown entry: ${relationship.target}`);
      assert(
        relationship.labels && typeof relationship.labels === "object" && !Array.isArray(relationship.labels),
        `${label}/${relationship.id} labels are missing`,
      );

      for (const locale of locales) {
        assertLocalizedString(
          relationship.labels[locale],
          `${label}/${relationship.id} ${locale} label`,
        );
      }

      relationshipCount += 1;
    }
  }
}

console.log(`PASS: validated ${relationshipCount} semantic Lexicon relationship(s)`);
