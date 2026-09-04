import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readerAssets = [
  "reader-content.css",
  "reader-presentation.css",
  "reader-page-turn.css",
  "reader-progress.css",
  "reader-bookmarks.css",
  "reader-engine.js",
  "reader-presentation.js",
  "reader-page-turn.js",
  "reader-progress.js",
  "reader.js",
  "reader-bookmarks.js"
].map((name) => `assets/reader/${name}`);

const required = [
  "assets/library-shell.js",
  "assets/spoiler-profile.js",
  "assets/spoiler-controls.js",
  "assets/telanas/styles.css",
  ...readerAssets,
  "prototype/telanas/site.js",
  "en/index.html",
  "de/index.html",
  "en/telanas/index.html",
  "de/telanas/index.html",
  "en/telanas/read/dragon-knight/volume-01/index.html",
  "de/telanas/read/dragon-knight/volume-01/index.html"
];

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const exists = async (relativePath) => {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};

for (const relativePath of required) {
  assert(await exists(relativePath), `Missing production route file: ${relativePath}`);
}

const validateLocalReferences = async (filePath, html) => {
  const tags = html.match(/<(?:a|link|script)\b[^>]*(?:href|src)="[^"]+"[^>]*>/g) || [];
  for (const tag of tags) {
    const match = tag.match(/(?:href|src)="([^"]+)"/);
    if (!match) continue;
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;

    const withoutFragment = reference.split("#", 1)[0].split("?", 1)[0];
    if (!withoutFragment) continue;
    let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(filePath), withoutFragment));
    if (withoutFragment.endsWith("/") || resolved === ".") resolved = path.posix.join(resolved, "index.html");
    assert(await exists(resolved), `${filePath} references missing local target: ${reference}`);

    if (reference.includes("prototype/telanas/")) {
      assert(tag.includes("data-prototype-bridge"), `${filePath} prototype bridge must be explicitly marked: ${reference}`);
    }
  }
};

for (const locale of ["en", "de"]) {
  const rootPath = `${locale}/index.html`;
  const landingPath = `${locale}/telanas/index.html`;
  const readerPath = `${locale}/telanas/read/dragon-knight/volume-01/index.html`;
  const rootHtml = await readFile(path.join(root, rootPath), "utf8");
  const landingHtml = await readFile(path.join(root, landingPath), "utf8");
  const readerHtml = await readFile(path.join(root, readerPath), "utf8");

  assert(rootHtml.includes('content="0; url=telanas/"'), `${rootPath} must redirect to telanas/`);
  assert(rootHtml.includes('window.location.replace("telanas/")'), `${rootPath} must preserve the locale-root redirect without relying only on meta refresh`);

  assert(landingHtml.includes(`<html lang="${locale}" data-route-locale="${locale}"`), `${landingPath} must declare its route locale`);
  assert(landingHtml.includes('href="../../en/telanas/"'), `${landingPath} must expose the English equivalent route`);
  assert(landingHtml.includes('href="../../de/telanas/"'), `${landingPath} must expose the German equivalent route`);
  assert(landingHtml.includes('src="../../assets/library-shell.js"'), `${landingPath} must use the production Library shell`);
  assert(landingHtml.includes('src="../../assets/spoiler-profile.js"'), `${landingPath} must use the production spoiler profile`);
  assert(landingHtml.includes('src="../../assets/spoiler-controls.js"'), `${landingPath} must use the production spoiler controls`);
  assert(landingHtml.includes('href="../../assets/telanas/styles.css"'), `${landingPath} must use the production Telanas stylesheet`);
  assert(landingHtml.includes('data-spoiler-progress-select'), `${landingPath} must preserve the shared spoiler-progress control`);
  assert(landingHtml.includes('href="read/dragon-knight/volume-01/"'), `${landingPath} must link to the canonical reader`);
  assert(!landingHtml.includes("prototype/telanas/reader.html"), `${landingPath} must not retain the old reader bridge`);
  await validateLocalReferences(landingPath, landingHtml);

  assert(readerHtml.includes(`<html lang="${locale}" data-route-locale="${locale}"`), `${readerPath} must declare its route locale`);
  assert(readerHtml.includes('href="../../../../../en/telanas/read/dragon-knight/volume-01/"'), `${readerPath} must expose the English reader route`);
  assert(readerHtml.includes('href="../../../../../de/telanas/read/dragon-knight/volume-01/"'), `${readerPath} must expose the German reader route`);
  assert(readerHtml.includes('src="../../../../../assets/library-shell.js"'), `${readerPath} must use the production Library shell`);
  assert(readerHtml.includes('src="../../../../../assets/reader/reader.js"'), `${readerPath} must use the production reader controller`);
  assert(readerHtml.includes('data-reader-book-manifest="../../../../../content/worlds/telanas/books/dragon-knight/volume-01/book.json"'), `${readerPath} must resolve the public book manifest from the canonical route`);
  assert(readerHtml.includes('data-reader-bookmark-toggle'), `${readerPath} must preserve semantic bookmarks`);
  assert(readerHtml.includes('data-reader-progress-mode'), `${readerPath} must preserve reader completion/spoiler controls`);
  assert(readerHtml.includes('href="../../../"'), `${readerPath} must return to the locale-matched Telanas landing page`);
  await validateLocalReferences(readerPath, readerHtml);
}

const readerController = await readFile(path.join(root, "assets/reader/reader.js"), "utf8");
assert(readerController.includes("dataset.readerBookManifest"), "Production reader must resolve its book manifest from the page contract");

const shell = await readFile(path.join(root, "assets/library-shell.js"), "utf8");
assert(shell.includes("destination.search = window.location.search"), "Language switching must preserve the current query string");
assert(shell.includes("destination.hash = window.location.hash"), "Language switching must preserve the semantic reader anchor/hash");

const prototypeSite = await readFile(path.join(root, "prototype/telanas/site.js"), "utf8");
assert(prototypeSite.includes("dataset.prototypeReaderHref"), "Prototype knowledge views must retain their original reader target while bridging to the canonical route");
assert(prototypeSite.includes("/telanas/read/"), "Prototype knowledge views must route reader links to the canonical locale reader");
assert(prototypeSite.includes("target.search = source.search"), "Prototype-to-reader bridges must preserve semantic source query data");
assert(prototypeSite.includes("target.hash = source.hash"), "Prototype-to-reader bridges must preserve semantic reader anchors");

console.log("PASS: validated canonical EN/DE Telanas landing and reader routes");
