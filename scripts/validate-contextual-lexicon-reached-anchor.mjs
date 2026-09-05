import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const worldPath = "content/worlds/telanas/world.json";
const world = await readJson(worldPath);
const worldDirectory = path.posix.dirname(worldPath);
const lexicon = await readJson(path.posix.join(worldDirectory, world.lexicon));

const milestones = new Map();
for (const story of world.stories || []) {
  for (const bookRef of story.books || []) {
    const bookPath = path.posix.join(worldDirectory, bookRef.manifest);
    const book = await readJson(bookPath);
    milestones.set(`${story.id}/${book.id}`, new Set(book.spoilerMilestones || []));
  }
}

let reachedAnchorGateCount = 0;
const checkVisibility = (visibility, label) => {
  if (visibility?.mode !== "reached-anchor") return;
  assert(typeof visibility.story === "string" && visibility.story, `${label} reached-anchor story is missing`);
  assert(typeof visibility.book === "string" && visibility.book, `${label} reached-anchor book is missing`);
  assert(typeof visibility.anchor === "string" && visibility.anchor, `${label} reached-anchor anchor is missing`);
  const bookMilestones = milestones.get(`${visibility.story}/${visibility.book}`);
  assert(bookMilestones, `${label} reached-anchor references unknown book: ${visibility.story}/${visibility.book}`);
  assert(bookMilestones.has(visibility.anchor), `${label} reached-anchor must reference a declared spoiler milestone: ${visibility.anchor}`);
  reachedAnchorGateCount += 1;
};

for (const entry of lexicon.entries || []) {
  checkVisibility(entry.visibility, `Lexicon entry ${entry.id}`);
  for (const fragment of entry.fragments || []) {
    checkVisibility(fragment.visibility, `Lexicon fragment ${entry.id}/${fragment.id}`);
  }
}

console.log(`PASS: validated ${reachedAnchorGateCount} reached-anchor Lexicon gate(s)`);
