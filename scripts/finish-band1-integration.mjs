import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const branch = "release/telanas-volume-01";
const origin = "https://github.com/Kamui2040/The-Library.git";
const selfPath = "scripts/finish-band1-integration.mjs";
const validatorPath = "scripts/validate-production-routes.mjs";

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const run = (command, args = []) => execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: "pipe" });

const replaceOnce = (source, oldText, newText, label) => {
  const first = source.indexOf(oldText);
  assert(first >= 0, `${label}: expected text was not found`);
  assert(source.indexOf(oldText, first + oldText.length) < 0, `${label}: expected text was found more than once`);
  return `${source.slice(0, first)}${newText}${source.slice(first + oldText.length)}`;
};

const main = async () => {
  assert(git("remote", "get-url", "origin") === origin, "Wrong The-Library origin");
  assert(git("rev-parse", "--abbrev-ref", "HEAD") === branch, `Run on ${branch}`);
  assert(git("status", "--porcelain") === "", "The-Library checkout must be clean before the final Band 1 fix");

  let validator = await readFile(path.join(root, validatorPath), "utf8");
  validator = replaceOnce(
    validator,
    `const lexiconController = await readFile(path.join(root, "assets/lexicon/lexicon.js"), "utf8");\nassert(lexiconController.includes("dataset.worldManifest"), "Production Lexicon must resolve its world manifest from the page contract");\nassert(lexiconController.includes("dataset.lexiconManifest"), "Production Lexicon must resolve its Lexicon manifest from the page contract");\nassert(lexiconController.includes("dataset.readerBase"), "Production Lexicon must resolve Reader routes from the page contract");\nassert(lexiconController.includes("profile.fullSpoilers"), "Production Lexicon must preserve the explicit Full Spoilers bypass");`,
    `const spoilerProfile = await readFile(path.join(root, "assets/spoiler-profile.js"), "utf8");\nassert(\n  spoilerProfile.includes("if (profile?.fullSpoilers === true) return true;"),\n  "Shared spoiler profile must preserve the explicit Full Spoilers bypass",\n);\n\nconst lexiconController = await readFile(path.join(root, "assets/lexicon/lexicon.js"), "utf8");\nassert(lexiconController.includes("dataset.worldManifest"), "Production Lexicon must resolve its world manifest from the page contract");\nassert(lexiconController.includes("dataset.lexiconManifest"), "Production Lexicon must resolve its Lexicon manifest from the page contract");\nassert(lexiconController.includes("dataset.readerBase"), "Production Lexicon must resolve Reader routes from the page contract");\nassert(lexiconController.includes("profileApi.visibilityAllowed"), "Production Lexicon must use the shared spoiler visibility calculation");`,
    "Production route shared spoiler validation",
  );
  await writeFile(path.join(root, validatorPath), validator, "utf8");
  await unlink(path.join(root, selfPath));

  run("node", ["--check", validatorPath]);
  run("git", ["diff", "--check"]);
  run("npm", ["run", "validate"]);

  const expected = [selfPath, validatorPath].sort();
  const actual = git("diff", "--name-only").split("\n").filter(Boolean).sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `Unexpected validator-fix scope: ${actual.join(", ")}`);

  git("add", "--", ...expected);
  git("commit", "-m", "Validate shared spoiler visibility at its owner");
  git("push", "origin", `HEAD:${branch}`);
  assert(git("status", "--porcelain") === "", "Checkout is not clean after validator fix");

  const output = run("node", ["scripts/repair-band1-integration.mjs"]);
  const finalLine = output.trim().split("\n").filter(Boolean).at(-1) || "";
  assert(finalLine.startsWith("PASS: complete Band 1 Reader integration confirmed:"), `Band 1 repair did not report PASS: ${finalLine}`);

  const localHead = git("rev-parse", "HEAD");
  const remoteHead = git("ls-remote", "origin", `refs/heads/${branch}`).split(/\s+/)[0];
  assert(localHead === remoteHead, `Remote head mismatch: local=${localHead} remote=${remoteHead}`);
  assert(git("status", "--porcelain") === "", "Checkout is not clean after Band 1 integration");
  console.log(finalLine);
};

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
