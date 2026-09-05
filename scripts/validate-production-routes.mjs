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
const lexiconAssets = [
  "lexicon.css",
  "lexicon-reader-links.css",
  "lexicon-relationships.css",
  "lexicon.js"
].map((name) => `assets/lexicon/${name}`);
const timelineAssets = [
  "timeline.css",
  "timeline.js"
].map((name) => `assets/timeline/${name}`);

const required = [
  "assets/library-shell.js",
  "assets/spoiler-profile.js",
  "assets/spoiler-controls.js",
  "assets/telanas/styles.css",
  ...readerAssets,
  ...lexiconAssets,
  ...timelineAssets,
  "prototype/telanas/site.js",
  "en/index.html",
  "de/index.html",
  "en/telanas/index.html",
  "de/telanas/index.html",
  "en/telanas/read/dragon-knight/volume-01/index.html",
  "de/telanas/read/dragon-knight/volume-01/index.html",
  "en/telanas/lexicon/index.html",
  "de/telanas/lexicon/index.html",
  "en/telanas/timeline/index.html",
  "de/telanas/timeline/index.html"
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
  const lexiconPath = `${locale}/telanas/lexicon/index.html`;
  const timelinePath = `${locale}/telanas/timeline/index.html`;
  const rootHtml = await readFile(path.join(root, rootPath), "utf8");
  const landingHtml = await readFile(path.join(root, landingPath), "utf8");
  const readerHtml = await readFile(path.join(root, readerPath), "utf8");
  const lexiconHtml = await readFile(path.join(root, lexiconPath), "utf8");
  const timelineHtml = await readFile(path.join(root, timelinePath), "utf8");

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
  assert(landingHtml.includes('href="lexicon/"'), `${landingPath} must link to the canonical Lexicon`);
  assert(landingHtml.includes('href="timeline/"'), `${landingPath} must link to the canonical Timeline`);
  assert(landingHtml.includes('lexicon/?category=characters'), `${landingPath} must preserve the Characters category entry point`);
  assert(landingHtml.includes('lexicon/?category=places'), `${landingPath} must preserve the Places category entry point`);
  assert(landingHtml.includes('lexicon/?category=mythology'), `${landingPath} must preserve the Mythology category entry point`);
  assert(landingHtml.includes('lexicon/?category=history'), `${landingPath} must preserve the History category entry point`);
  assert(!landingHtml.includes("prototype/telanas/reader.html"), `${landingPath} must not retain the old reader bridge`);
  assert(!landingHtml.includes("prototype/telanas/lexicon.html"), `${landingPath} must not retain the old Lexicon bridge`);
  assert(!landingHtml.includes("prototype/telanas/timeline.html"), `${landingPath} must not retain the old Timeline bridge`);
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
  assert(readerHtml.includes('href="../../../lexicon/"'), `${readerPath} completion flow must open the canonical Lexicon`);
  assert(!readerHtml.includes("prototype/telanas/lexicon.html"), `${readerPath} must not retain the old Lexicon completion bridge`);
  await validateLocalReferences(readerPath, readerHtml);

  assert(lexiconHtml.includes(`<html lang="${locale}" data-route-locale="${locale}"`), `${lexiconPath} must declare its route locale`);
  assert(lexiconHtml.includes('href="../../../en/telanas/lexicon/"'), `${lexiconPath} must expose the English Lexicon route`);
  assert(lexiconHtml.includes('href="../../../de/telanas/lexicon/"'), `${lexiconPath} must expose the German Lexicon route`);
  assert(lexiconHtml.includes('href="../../../assets/telanas/styles.css"'), `${lexiconPath} must use the production Telanas stylesheet`);
  assert(lexiconHtml.includes('href="../../../assets/lexicon/lexicon.css"'), `${lexiconPath} must use the production Lexicon stylesheet`);
  assert(lexiconHtml.includes('src="../../../assets/library-shell.js"'), `${lexiconPath} must use the production Library shell`);
  assert(lexiconHtml.includes('src="../../../assets/spoiler-profile.js"'), `${lexiconPath} must use the production spoiler profile`);
  assert(lexiconHtml.includes('src="../../../assets/spoiler-controls.js"'), `${lexiconPath} must use the production spoiler controls`);
  assert(lexiconHtml.includes('src="../../../assets/lexicon/lexicon.js"'), `${lexiconPath} must use the production Lexicon controller`);
  assert(lexiconHtml.includes('data-world-manifest="../../../content/worlds/telanas/world.json"'), `${lexiconPath} must resolve the public world manifest`);
  assert(lexiconHtml.includes('data-lexicon-manifest="../../../content/worlds/telanas/lexicon/lexicon.json"'), `${lexiconPath} must resolve the public Lexicon manifest`);
  assert(lexiconHtml.includes('data-reader-base="../read/"'), `${lexiconPath} must declare the canonical Reader route base`);
  assert(lexiconHtml.includes('data-spoiler-progress-select'), `${lexiconPath} must preserve spoiler-progress controls`);
  assert(lexiconHtml.includes('data-full-spoilers-toggle'), `${lexiconPath} must preserve Full Spoilers controls`);
  assert(lexiconHtml.includes('data-lexicon-results'), `${lexiconPath} must render the spoiler-filtered result set`);
  assert(lexiconHtml.includes('href="../read/dragon-knight/volume-01/"'), `${lexiconPath} must expose the canonical Reader in story navigation`);
  assert(lexiconHtml.includes('href="../timeline/"'), `${lexiconPath} must expose the canonical Timeline`);
  assert(!lexiconHtml.includes("prototype/telanas/lexicon.html"), `${lexiconPath} must not bridge back to the old Lexicon`);
  assert(!lexiconHtml.includes("prototype/telanas/timeline.html"), `${lexiconPath} must not retain the old Timeline bridge`);
  await validateLocalReferences(lexiconPath, lexiconHtml);

  assert(timelineHtml.includes(`<html lang="${locale}" data-route-locale="${locale}"`), `${timelinePath} must declare its route locale`);
  assert(timelineHtml.includes('href="../../../en/telanas/timeline/"'), `${timelinePath} must expose the English Timeline route`);
  assert(timelineHtml.includes('href="../../../de/telanas/timeline/"'), `${timelinePath} must expose the German Timeline route`);
  assert(timelineHtml.includes('href="../../../assets/telanas/styles.css"'), `${timelinePath} must use the production Telanas stylesheet`);
  assert(timelineHtml.includes('href="../../../assets/timeline/timeline.css"'), `${timelinePath} must use the production Timeline stylesheet`);
  assert(timelineHtml.includes('src="../../../assets/library-shell.js"'), `${timelinePath} must use the production Library shell`);
  assert(timelineHtml.includes('src="../../../assets/spoiler-profile.js"'), `${timelinePath} must use the production spoiler profile`);
  assert(timelineHtml.includes('src="../../../assets/spoiler-controls.js"'), `${timelinePath} must use the production spoiler controls`);
  assert(timelineHtml.includes('src="../../../assets/timeline/timeline.js"'), `${timelinePath} must use the production Timeline controller`);
  assert(timelineHtml.includes('data-world-manifest="../../../content/worlds/telanas/world.json"'), `${timelinePath} must resolve the public world manifest`);
  assert(timelineHtml.includes('data-timeline-manifest="../../../content/worlds/telanas/timeline/timeline.json"'), `${timelinePath} must resolve the public Timeline manifest`);
  assert(timelineHtml.includes('data-reader-base="../read/"'), `${timelinePath} must declare the canonical Reader route base`);
  assert(timelineHtml.includes('data-spoiler-progress-select'), `${timelinePath} must preserve spoiler-progress controls`);
  assert(timelineHtml.includes('data-full-spoilers-toggle'), `${timelinePath} must preserve Full Spoilers controls`);
  assert(timelineHtml.includes('data-timeline-results'), `${timelinePath} must render the spoiler-filtered chronology`);
  assert(timelineHtml.includes('href="../lexicon/"'), `${timelinePath} must expose the canonical Lexicon`);
  assert(timelineHtml.includes('href="../read/dragon-knight/volume-01/"'), `${timelinePath} must expose the canonical Reader in story navigation`);
  assert(!timelineHtml.includes("prototype/telanas/timeline.html"), `${timelinePath} must not bridge back to the old Timeline`);
  await validateLocalReferences(timelinePath, timelineHtml);
}

const readerController = await readFile(path.join(root, "assets/reader/reader.js"), "utf8");
assert(readerController.includes("dataset.readerBookManifest"), "Production reader must resolve its book manifest from the page contract");

const lexiconController = await readFile(path.join(root, "assets/lexicon/lexicon.js"), "utf8");
assert(lexiconController.includes("dataset.worldManifest"), "Production Lexicon must resolve its world manifest from the page contract");
assert(lexiconController.includes("dataset.lexiconManifest"), "Production Lexicon must resolve its Lexicon manifest from the page contract");
assert(lexiconController.includes("dataset.readerBase"), "Production Lexicon must resolve Reader routes from the page contract");
assert(lexiconController.includes("profile.fullSpoilers"), "Production Lexicon must preserve the explicit Full Spoilers bypass");
assert(lexiconController.includes("visibilityAllowed(entry.visibility"), "Production Lexicon must filter entry existence before rendering");
assert(lexiconController.includes("visibilityAllowed(fragment.visibility"), "Production Lexicon must filter fragments before rendering");
assert(lexiconController.includes("visibilityAllowed(target.visibility"), "Production Lexicon must filter relationship targets before rendering");
assert(lexiconController.includes('source: "lexicon"'), "Production Lexicon Reader links must carry their semantic source context");
assert(lexiconController.includes('get("entry")'), "Production Lexicon must accept semantic entry targets without using page numbers");
assert(lexiconController.includes('get("category")'), "Production Lexicon must accept public category navigation state");

const timelineController = await readFile(path.join(root, "assets/timeline/timeline.js"), "utf8");
assert(timelineController.includes("dataset.worldManifest"), "Production Timeline must resolve its world manifest from the page contract");
assert(timelineController.includes("dataset.timelineManifest"), "Production Timeline must resolve its Timeline manifest from the page contract");
assert(timelineController.includes("dataset.readerBase"), "Production Timeline must resolve Reader routes from the page contract");
assert(timelineController.includes("profile.fullSpoilers"), "Production Timeline must preserve the explicit Full Spoilers bypass");
assert(timelineController.includes("visibilityAllowed(event.visibility"), "Production Timeline must filter event existence before rendering");
assert(timelineController.includes('source: "timeline"'), "Production Timeline Reader links must carry their semantic source context");
assert(timelineController.includes('get("event")'), "Production Timeline must accept semantic event targets without bypassing spoiler filtering");

const shell = await readFile(path.join(root, "assets/library-shell.js"), "utf8");
assert(shell.includes("destination.search = window.location.search"), "Language switching must preserve the current query string");
assert(shell.includes("destination.hash = window.location.hash"), "Language switching must preserve semantic hashes");

const prototypeSite = await readFile(path.join(root, "prototype/telanas/site.js"), "utf8");
assert(prototypeSite.includes("dataset.prototypeReaderHref"), "Prototype knowledge views must retain their original reader target while bridging to the canonical route");
assert(prototypeSite.includes("/telanas/read/"), "Prototype knowledge views must route reader links to the canonical locale reader");
assert(prototypeSite.includes("dataset.prototypeLexiconHref"), "Prototype knowledge views must retain their original Lexicon target while bridging to the canonical route");
assert(prototypeSite.includes("/telanas/lexicon/"), "Prototype knowledge views must route Lexicon links to the canonical locale Lexicon");
assert(prototypeSite.includes("dataset.prototypeTimelineHref"), "Prototype knowledge views must retain their original Timeline target while bridging to the canonical route");
assert(prototypeSite.includes("/telanas/timeline/"), "Prototype knowledge views must route Timeline links to the canonical locale Timeline");
assert(prototypeSite.includes("target.search = source.search"), "Prototype canonical bridges must preserve semantic query data");
assert(prototypeSite.includes("target.hash = source.hash"), "Prototype canonical bridges must preserve semantic hashes");

console.log("PASS: validated canonical EN/DE Telanas landing, reader, Lexicon, and Timeline routes");
