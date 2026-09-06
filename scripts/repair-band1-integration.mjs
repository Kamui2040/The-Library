import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const branch = "release/telanas-volume-01";
const origin = "https://github.com/Kamui2040/The-Library.git";
const selfPath = "scripts/repair-band1-integration.mjs";

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

const patchContextualValidator = async () => {
  const relativePath = "scripts/validate-contextual-lexicon.mjs";
  let source = await read(relativePath);
  source = replaceOnce(
    source,
    `assert(readerLexicon.includes("book.spoilerMilestones"), "Reader contextual Lexicon must read sparse spoiler milestones from the book manifest");`,
    `assert(/book\\??\\.spoilerMilestones/.test(readerLexicon), "Reader contextual Lexicon must read sparse spoiler milestones from the book manifest");`,
    "Contextual Lexicon spoiler-milestone source check",
  );
  await write(relativePath, source);
};

const patchSharedReaderLink = async (relativePath, label) => {
  let source = await read(relativePath);
  source = replaceOnce(
    source,
    `"anchor": "dk-v01-ch01-p004"`,
    `"anchor": "dk-v01-ch01"`,
    label,
  );
  JSON.parse(source);
  await write(relativePath, source);
};

const cleanKnownFailureResidue = () => {
  const allowed = new Set([
    "assets/reader/reader-bookmarks.js",
    "assets/reader/reader.js",
    "content/worlds/telanas/books/dragon-knight/volume-01/book.json",
    "content/worlds/telanas/books/dragon-knight/volume-01/contextual-lexicon.json",
    "content/worlds/telanas/books/dragon-knight/volume-01/editions/de.json",
    "content/worlds/telanas/books/dragon-knight/volume-01/editions/en.json",
    "content/worlds/telanas/lexicon/lexicon.json",
    "content/worlds/telanas/map/map.json",
    "content/worlds/telanas/timeline/timeline.json",
    "content/worlds/telanas/world.json",
    "scripts/fix-natural-edition-alignment.mjs",
    "scripts/import-telanas-volume-01.mjs",
    "scripts/repair-band1-integration.mjs",
    "scripts/validate-content.mjs",
    "scripts/validate-contextual-lexicon.mjs",
  ]);

  const changed = new Set([
    ...git("diff", "--name-only").split("\n").filter(Boolean),
    ...git("diff", "--cached", "--name-only").split("\n").filter(Boolean),
  ]);
  if (changed.size === 0) return;
  const unexpected = [...changed].filter((item) => !allowed.has(item));
  assert(unexpected.length === 0, `Refusing to clean unrelated local changes: ${unexpected.join(", ")}`);
  git("restore", "--staged", "--worktree", "--", ...changed);
};

const main = async () => {
  assert(git("remote", "get-url", "origin") === origin, "Wrong The-Library origin");
  assert(git("rev-parse", "--abbrev-ref", "HEAD") === branch, `Run on ${branch}`);

  cleanKnownFailureResidue();
  assert(git("status", "--porcelain") === "", "Checkout must be clean before Band 1 repair");

  await patchContextualValidator();
  await patchSharedReaderLink("content/worlds/telanas/timeline/timeline.json", "Timeline shared Reader anchor");
  await patchSharedReaderLink("content/worlds/telanas/map/map.json", "Map shared Reader anchor");
  await unlink(path.join(root, selfPath));

  run("node", ["--check", "scripts/validate-contextual-lexicon.mjs"]);
  JSON.parse(await read("content/worlds/telanas/timeline/timeline.json"));
  JSON.parse(await read("content/worlds/telanas/map/map.json"));
  run("git", ["diff", "--check"]);
  run("npm", ["run", "validate"]);

  const expected = [
    "content/worlds/telanas/map/map.json",
    "content/worlds/telanas/timeline/timeline.json",
    selfPath,
    "scripts/validate-contextual-lexicon.mjs",
  ].sort();
  const actual = git("diff", "--name-only").split("\n").filter(Boolean).sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `Unexpected repair scope: ${actual.join(", ")}`);

  git("add", "--", ...expected);
  git("commit", "-m", "Align shared Reader validation links");
  git("push", "origin", `HEAD:${branch}`);
  assert(git("status", "--porcelain") === "", "Checkout is not clean after repair prerequisite commit");

  const helperOutput = run("node", ["scripts/fix-natural-edition-alignment.mjs"]);
  const finalLine = helperOutput.trim().split("\n").filter(Boolean).at(-1) || "";
  assert(finalLine.startsWith("PASS: complete Band 1 Reader integration confirmed:"), `Alignment helper did not report PASS: ${finalLine}`);

  const localHead = git("rev-parse", "HEAD");
  const remoteHead = git("ls-remote", "origin", `refs/heads/${branch}`).split(/\s+/)[0];
  assert(localHead === remoteHead, `Remote head mismatch: local=${localHead} remote=${remoteHead}`);
  assert(git("status", "--porcelain") === "", "Checkout is not clean after Band 1 integration");
  console.log(finalLine);
};

main().catch((error) => {
  try {
    cleanKnownFailureResidue();
  } catch (cleanupError) {
    console.error(`CLEANUP BLOCKED: ${cleanupError.message}`);
  }
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
