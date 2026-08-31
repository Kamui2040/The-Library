import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

const safeId = /^[a-z0-9][a-z0-9-]*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const allowedStates = new Set(["prototype", "approved", "published"]);

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const assertId = (value, label) => {
  assert(typeof value === "string" && safeId.test(value), `${label} must use lowercase letters, numbers, and hyphens only`);
};

const assertRelativePath = (value, label) => {
  assert(typeof value === "string" && value.length > 0, `${label} is missing`);
  assert(!value.includes("\\"), `${label} must use forward slashes`);
  assert(!path.posix.isAbsolute(value), `${label} must be relative`);
  const parts = value.split("/");
  assert(!parts.includes("") && !parts.includes(".") && !parts.includes(".."), `${label} contains an unsafe path segment`);
};

const readJson = async (filePath, label) => {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    fail(`Cannot read ${label}: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON in ${label}: ${error.message}`);
  }
};

const ensureContainedRegularFile = async (bundleRoot, relativePath) => {
  const absolutePath = path.resolve(bundleRoot, ...relativePath.split("/"));
  const rootReal = await realpath(bundleRoot);
  let info;
  try {
    info = await lstat(absolutePath);
  } catch (error) {
    fail(`Cannot inspect bundle file ${relativePath}: ${error.message}`);
  }
  assert(info.isFile(), `Bundle file is not a regular file: ${relativePath}`);
  assert(!info.isSymbolicLink(), `Bundle file must not be a symbolic link: ${relativePath}`);

  const fileReal = await realpath(absolutePath);
  const relativeReal = path.relative(rootReal, fileReal);
  assert(relativeReal && !relativeReal.startsWith("..") && !path.isAbsolute(relativeReal), `Bundle file escapes bundle directory: ${relativePath}`);
  return absolutePath;
};

const sha256File = async (filePath) => {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
};

const validateKnownPayload = async (file, absolutePath, bundle) => {
  if (!file.target.endsWith(".json")) return;
  const payload = await readJson(absolutePath, file.path);

  const canonicalBookTarget = `content/worlds/${bundle.target.world}/books/${bundle.target.story}/${bundle.target.book}/book.json`;
  const canonicalLexiconTarget = `content/worlds/${bundle.target.world}/lexicon/lexicon.json`;

  if (file.target.endsWith("/book.json")) {
    assert(file.target === canonicalBookTarget, `${file.path} book target must be ${canonicalBookTarget}`);
    assert(payload.schemaVersion === 1, `${file.path} book payload must use schemaVersion 1`);
    assert(payload.world === bundle.target.world, `${file.path} book world does not match bundle target`);
    assert(payload.story === bundle.target.story, `${file.path} book story does not match bundle target`);
    assert(payload.id === bundle.target.book, `${file.path} book id does not match bundle target`);
    assert(payload.state === bundle.state, `${file.path} book state does not match bundle state`);
  }

  if (file.target.endsWith("/lexicon/lexicon.json")) {
    assert(file.target === canonicalLexiconTarget, `${file.path} Lexicon target must be ${canonicalLexiconTarget}`);
    assert(payload.schemaVersion === 1, `${file.path} Lexicon payload must use schemaVersion 1`);
    assert(payload.world === bundle.target.world, `${file.path} Lexicon world does not match bundle target`);
    assert(payload.state === bundle.state, `${file.path} Lexicon state does not match bundle state`);
  }
};

export const validateReleaseBundle = async (bundleDirectory, options = {}) => {
  const allowReleaseContent = options.allowReleaseContent === true;
  const bundleRoot = path.resolve(bundleDirectory);
  const bundlePath = path.join(bundleRoot, "bundle.json");
  const bundle = await readJson(bundlePath, "bundle.json");

  assert(bundle.schemaVersion === 1, "bundle.json must use schemaVersion 1");
  assert(bundle.kind === "library-release-bundle", "bundle.json kind must be library-release-bundle");
  assertId(bundle.bundleId, "Bundle id");
  assert(allowedStates.has(bundle.state), `Unsupported bundle state: ${bundle.state}`);

  if (bundle.state !== "prototype") {
    assert(
      allowReleaseContent,
      `Bundle state ${bundle.state} requires explicit --allow-release-content acknowledgement`,
    );
  }

  assert(bundle.source && typeof bundle.source === "object", "Bundle source metadata is missing");
  assertId(bundle.source.world, "Source world");
  assertId(bundle.source.story, "Source story");
  assertId(bundle.source.book, "Source book");
  assertId(bundle.source.releaseId, "Source release id");

  assert(bundle.target && typeof bundle.target === "object", "Bundle target metadata is missing");
  assertId(bundle.target.world, "Target world");
  assertId(bundle.target.story, "Target story");
  assertId(bundle.target.book, "Target book");
  assert(bundle.source.world === bundle.target.world, "Source and target world must match");
  assert(bundle.source.story === bundle.target.story, "Source and target story must match");
  assert(bundle.source.book === bundle.target.book, "Source and target book must match");

  assert(Array.isArray(bundle.files) && bundle.files.length > 0, "Bundle files must be a non-empty array");

  const sourcePaths = new Set();
  const targetPaths = new Set();
  const files = [];
  const worldTargetPrefix = `content/worlds/${bundle.target.world}/`;

  for (const file of bundle.files) {
    assert(file && typeof file === "object", "Bundle file entry must be an object");
    assertRelativePath(file.path, "Bundle file path");
    assertRelativePath(file.target, `Target path for ${file.path}`);
    assert(file.target.startsWith(worldTargetPrefix), `Target path must stay inside world ${bundle.target.world}: ${file.target}`);
    assert(sha256Pattern.test(file.sha256), `Invalid SHA-256 for ${file.path}`);
    assert(!sourcePaths.has(file.path), `Duplicate bundle file path: ${file.path}`);
    assert(!targetPaths.has(file.target), `Duplicate bundle target path: ${file.target}`);
    sourcePaths.add(file.path);
    targetPaths.add(file.target);

    const absolutePath = await ensureContainedRegularFile(bundleRoot, file.path);
    const actualSha = await sha256File(absolutePath);
    assert(actualSha === file.sha256, `SHA-256 mismatch for ${file.path}`);
    await validateKnownPayload(file, absolutePath, bundle);

    files.push({ ...file, absolutePath });
  }

  return {
    bundle,
    bundleRoot,
    files,
  };
};
