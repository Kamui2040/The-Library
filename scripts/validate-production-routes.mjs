import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const k2040ChromeRevision = "20260910library1";
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
const pdfRoutes = [
  "output/pdf/the-dragon-knight-volume-01-home-en.pdf",
  "output/pdf/der-drachenritter-band-01-zuhause-de.pdf"
];

const required = [
  "index.html",
  "assets/library-shell.js",
  "assets/spoiler-profile.js",
  "assets/spoiler-controls.js",
  "assets/telanas/styles.css",
  ...readerAssets,
  ...lexiconAssets,
  ...timelineAssets,
  "content/worlds/telanas/lexicon/lexicon.json",
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
  "de/telanas/timeline/index.html",
  ...pdfRoutes
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

for (const relativePath of pdfRoutes) {
  const contents = await readFile(path.join(root, relativePath));
  assert(contents.length > 1_000_000, `${relativePath} must contain the complete illustrated edition`);
  assert(contents.subarray(0, 5).toString("ascii") === "%PDF-", `${relativePath} must be a PDF document`);
}

const revisionFor = async (relativePath) => createHash("sha256")
  .update(await readFile(path.join(root, relativePath)))
  .digest("hex")
  .slice(0, 12);

const [
  telanasStylesheetRevision,
  readerControllerRevision,
  pageTurnControllerRevision,
  pageTurnStylesRevision,
] = await Promise.all([
  revisionFor("assets/telanas/styles.css"),
  revisionFor("assets/reader/reader.js"),
  revisionFor("assets/reader/reader-page-turn.js"),
  revisionFor("assets/reader/reader-page-turn.css"),
]);

const assertTelanasStylesheet = (filePath, html, relativeHref) => {
  assert(
    html.includes(`href="${relativeHref}?v=${telanasStylesheetRevision}"`),
    `${filePath} must use the current production Telanas stylesheet revision`,
  );
};

const assertK2040EcosystemShell = (filePath, html) => {
  assert(html.includes('data-k2040-site="library"'), `${filePath} must identify the Library site family`);
  assert(html.includes("data-k2040-site-home"), `${filePath} must expose the Library home link`);
  assert(html.includes('href="https://kamui2040.github.io/The-Library/"'), `${filePath} must expose The Library in K2040 navigation`);
  assert(
    html.includes(`src="https://kamui2040.github.io/shared/k2040-chrome.js?v=${k2040ChromeRevision}"`),
    `${filePath} must use the shared K2040 footer controller`,
  );
  assert(html.includes("data-k2040-footer"), `${filePath} must expose the shared K2040 footer`);
};

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

const assertReaderFacingNavigation = (filePath, html) => {
  assert(!html.includes('href="timeline/"'), `${filePath} must not expose optional Timeline navigation`);
  assert(!html.includes('href="../timeline/"'), `${filePath} must not expose optional Timeline navigation`);
  assert(!html.includes("prototype/telanas/map.html"), `${filePath} must not expose the Map`);
  assert(!html.includes("prototype/telanas/world-search.html"), `${filePath} must not expose standalone Search`);
};

const libraryRootHtml = await readFile(path.join(root, "index.html"), "utf8");
assert(libraryRootHtml.includes('content="0; url=en/telanas/"'), "Library root must preserve its English fallback route");
assert(libraryRootHtml.includes('localStorage.getItem("k2040-language")'), "Library root must honor the shared language preference");
assert(libraryRootHtml.includes("window.location.replace(`${locale}/telanas/`)"), "Library root must route into the localized Telanas landing page");

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
  assertTelanasStylesheet(landingPath, landingHtml, "../../assets/telanas/styles.css");
  assertK2040EcosystemShell(landingPath, landingHtml);
  assert(landingHtml.includes('data-spoiler-progress-select'), `${landingPath} must preserve the shared spoiler-progress control`);
  assert(landingHtml.includes('href="read/dragon-knight/volume-01/"'), `${landingPath} must link to the canonical Reader`);
  assert(landingHtml.includes('href="../../output/pdf/the-dragon-knight-volume-01-home-en.pdf" download'), `${landingPath} must expose the English PDF download`);
  assert(landingHtml.includes('href="../../output/pdf/der-drachenritter-band-01-zuhause-de.pdf" download'), `${landingPath} must expose the German PDF download`);
  assert(landingHtml.includes('href="lexicon/"'), `${landingPath} must link to the canonical Lexicon`);
  assert(landingHtml.includes('lexicon/?category=characters'), `${landingPath} must preserve the Characters category entry point`);
  assert(landingHtml.includes('lexicon/?category=places'), `${landingPath} must preserve the Places category entry point`);
  assert(landingHtml.includes('lexicon/?category=events'), `${landingPath} must preserve the Events category entry point`);
  assert(!landingHtml.includes("prototype/telanas/reader.html"), `${landingPath} must not retain the old Reader bridge`);
  assert(!landingHtml.includes("prototype/telanas/lexicon.html"), `${landingPath} must not retain the old Lexicon bridge`);
  assertReaderFacingNavigation(landingPath, landingHtml);
  await validateLocalReferences(landingPath, landingHtml);

  assert(readerHtml.includes(`<html lang="${locale}" data-route-locale="${locale}"`), `${readerPath} must declare its route locale`);
  assert(readerHtml.includes('href="../../../../../en/telanas/read/dragon-knight/volume-01/"'), `${readerPath} must expose the English Reader route`);
  assert(readerHtml.includes('href="../../../../../de/telanas/read/dragon-knight/volume-01/"'), `${readerPath} must expose the German Reader route`);
  assert(readerHtml.includes('src="../../../../../assets/library-shell.js"'), `${readerPath} must use the production Library shell`);
  assertTelanasStylesheet(readerPath, readerHtml, "../../../../../assets/telanas/styles.css");
  assert(
    readerHtml.includes(`href="../../../../../assets/reader/reader-page-turn.css?v=${pageTurnStylesRevision}"`),
    `${readerPath} must use the current page-turn stylesheet revision`,
  );
  assert(
    readerHtml.includes(`src="../../../../../assets/reader/reader-page-turn.js?v=${pageTurnControllerRevision}"`),
    `${readerPath} must use the current page-turn controller revision`,
  );
  assert(
    readerHtml.includes(`src="../../../../../assets/reader/reader.js?v=${readerControllerRevision}"`),
    `${readerPath} must use the current production Reader controller revision`,
  );
  assert(readerHtml.includes('data-reader-book-manifest="../../../../../content/worlds/telanas/books/dragon-knight/volume-01/book.json"'), `${readerPath} must resolve the public book manifest from the canonical route`);
  assert(readerHtml.includes('data-reader-bookmark-toggle'), `${readerPath} must preserve semantic bookmarks`);
  assert(readerHtml.includes('data-reader-progress-mode'), `${readerPath} must preserve Reader completion/spoiler controls`);
  assert(readerHtml.includes('href="../../../"'), `${readerPath} must return to the locale-matched Telanas landing page`);
  assert(readerHtml.includes('href="../../../lexicon/"'), `${readerPath} completion flow must open the canonical Lexicon`);
  assert(!readerHtml.includes("prototype/telanas/lexicon.html"), `${readerPath} must not retain the old Lexicon completion bridge`);
  await validateLocalReferences(readerPath, readerHtml);

  assert(lexiconHtml.includes(`<html lang="${locale}" data-route-locale="${locale}"`), `${lexiconPath} must declare its route locale`);
  assert(lexiconHtml.includes('href="../../../en/telanas/lexicon/"'), `${lexiconPath} must expose the English Lexicon route`);
  assert(lexiconHtml.includes('href="../../../de/telanas/lexicon/"'), `${lexiconPath} must expose the German Lexicon route`);
  assertTelanasStylesheet(lexiconPath, lexiconHtml, "../../../assets/telanas/styles.css");
  assertK2040EcosystemShell(lexiconPath, lexiconHtml);
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
  assert(lexiconHtml.includes('data-lexicon-search'), `${lexiconPath} must preserve built-in Lexicon search`);
  assert(lexiconHtml.includes('data-lexicon-results'), `${lexiconPath} must render the spoiler-filtered result set`);
  assert(lexiconHtml.includes('href="../read/dragon-knight/volume-01/"'), `${lexiconPath} must expose the canonical Reader in story navigation`);
  assert(!lexiconHtml.includes("prototype/telanas/lexicon.html"), `${lexiconPath} must not bridge back to the old Lexicon`);
  assertReaderFacingNavigation(lexiconPath, lexiconHtml);
  await validateLocalReferences(lexiconPath, lexiconHtml);

  assert(timelineHtml.includes(`<html lang="${locale}" data-route-locale="${locale}"`), `${timelinePath} must declare its route locale`);
  assert(timelineHtml.includes('<meta name="robots" content="noindex,nofollow">'), `${timelinePath} must remain non-indexed while outside reader-facing navigation`);
  assert(timelineHtml.includes('href="../../../en/telanas/timeline/"'), `${timelinePath} must expose the English Timeline equivalent`);
  assert(timelineHtml.includes('href="../../../de/telanas/timeline/"'), `${timelinePath} must expose the German Timeline equivalent`);
  assertTelanasStylesheet(timelinePath, timelineHtml, "../../../assets/telanas/styles.css");
  assertK2040EcosystemShell(timelinePath, timelineHtml);
  assert(timelineHtml.includes('src="../../../assets/timeline/timeline.js"'), `${timelinePath} must use the retained Timeline controller`);
  assert(timelineHtml.includes('data-timeline-results'), `${timelinePath} must preserve the spoiler-filtered chronology`);
  assert(!timelineHtml.includes("prototype/telanas/map.html"), `${timelinePath} must not expose the Map`);
  assert(!timelineHtml.includes("prototype/telanas/world-search.html"), `${timelinePath} must not expose standalone Search`);
  await validateLocalReferences(timelinePath, timelineHtml);
}

const lexiconManifest = JSON.parse(
  await readFile(path.join(root, "content/worlds/telanas/lexicon/lexicon.json"), "utf8"),
);
const eventCategory = lexiconManifest.categories?.find((category) => category.id === "events");
assert(eventCategory?.labels?.en === "Events", "Lexicon must expose the Events category in English");
assert(eventCategory?.labels?.de === "Ereignisse", "Lexicon must expose the Events category in German");
assert(
  lexiconManifest.entries?.some((entry) => entry.categories?.includes("events")),
  "Lexicon Events category must be exercised by a publication-safe entry",
);

const readerController = await readFile(path.join(root, "assets/reader/reader.js"), "utf8");
assert(readerController.includes("dataset.readerBookManifest"), "Production Reader must resolve its book manifest from the page contract");
assert(readerController.includes('new CustomEvent("reader-page-turn-request"'), "Reader navigation must request an animated page turn before committing the destination spread");
assert(readerController.includes("detail: { direction, prepare, rollback, commit }"), "Reader navigation must supply both sides of the moving leaf and a reversible underlay");

const pageTurnController = await readFile(path.join(root, "assets/reader/reader-page-turn.js"), "utf8");
assert(pageTurnController.includes('document.addEventListener("reader-page-turn-request"'), "Page-turn controller must own the deferred navigation request");
assert(pageTurnController.includes("back = prepare();"), "Page-turn controller must render the destination content on the reverse of the moving leaf");
assert(pageTurnController.includes("prepared.commit();"), "Page-turn controller must commit the destination spread after animation completion");
assert(pageTurnController.includes("turn.rollback();"), "Page-turn controller must restore the current spread when a turn is cancelled");
assert(pageTurnController.includes('{ offset: 1, filter: "brightness(.88)", opacity: 0 }'), "Page-turn controller must hide the old front after it crosses the spine");
assert(pageTurnController.includes('{ offset: 1, filter: "brightness(1)", opacity: 1 }'), "Page-turn controller must keep the correctly oriented reverse visible until it settles");
assert(pageTurnController.includes('boxShadow: "0 17px 24px rgba(0,0,0,.21)"'), "Page-turn controller must keep the lifted-sheet shadow without flattening its two faces");
assert(!pageTurnController.includes('filter: "drop-shadow'), "Page-turn controller must not flatten the two-sided sheet with a parent filter");
assert(!pageTurnController.includes("is-page-turn-source"), "Page-turn controller must reveal the destination underlay instead of hiding it with the source page");
assert(!pageTurnController.includes('stage.addEventListener("click"'), "Page-turn controller must not duplicate Reader navigation listeners");

const pageTurnStyles = await readFile(path.join(root, "assets/reader/reader-page-turn.css"), "utf8");
assert(pageTurnStyles.includes(".book-spread.is-page-turning > .book-page"), "Page-turn stylesheet must prevent interaction with temporary underlay pages");

const spoilerProfile = await readFile(path.join(root, "assets/spoiler-profile.js"), "utf8");
assert(
  spoilerProfile.includes("if (profile?.fullSpoilers === true) return true;"),
  "Shared spoiler profile must preserve the explicit Full Spoilers bypass",
);

const lexiconController = await readFile(path.join(root, "assets/lexicon/lexicon.js"), "utf8");
assert(lexiconController.includes("dataset.worldManifest"), "Production Lexicon must resolve its world manifest from the page contract");
assert(lexiconController.includes("dataset.lexiconManifest"), "Production Lexicon must resolve its Lexicon manifest from the page contract");
assert(lexiconController.includes("dataset.readerBase"), "Production Lexicon must resolve Reader routes from the page contract");
assert(lexiconController.includes("profileApi.visibilityAllowed"), "Production Lexicon must use the shared spoiler visibility calculation");
assert(lexiconController.includes("visibilityAllowed(entry.visibility"), "Production Lexicon must filter entry existence before rendering");
assert(lexiconController.includes("visibilityAllowed(fragment.visibility"), "Production Lexicon must filter fragments before rendering");
assert(lexiconController.includes("visibilityAllowed(target.visibility"), "Production Lexicon must filter relationship targets before rendering");
assert(lexiconController.includes('source: "lexicon"'), "Production Lexicon Reader links must carry their semantic source context");
assert(lexiconController.includes('get("entry")'), "Production Lexicon must accept semantic entry targets without using page numbers");
assert(lexiconController.includes('get("category")'), "Production Lexicon must accept public category navigation state");

const timelineController = await readFile(path.join(root, "assets/timeline/timeline.js"), "utf8");
assert(timelineController.includes("dataset.worldManifest"), "Retained Timeline must resolve its world manifest from the page contract");
assert(timelineController.includes("dataset.timelineManifest"), "Retained Timeline must resolve its Timeline manifest from the page contract");
assert(timelineController.includes("profileApi.visibilityAllowed"), "Retained Timeline must use the shared spoiler visibility calculation");
assert(timelineController.includes("visibilityAllowed(event.visibility"), "Retained Timeline must filter event existence before rendering");

const shell = await readFile(path.join(root, "assets/library-shell.js"), "utf8");
assert(shell.includes("destination.search = window.location.search"), "Language switching must preserve the current query string");
assert(shell.includes("destination.hash = window.location.hash"), "Language switching must preserve semantic hashes");

const prototypeSite = await readFile(path.join(root, "prototype/telanas/site.js"), "utf8");
assert(prototypeSite.includes("dataset.prototypeReaderHref"), "Prototype knowledge views must retain their original Reader target while bridging to the canonical route");
assert(prototypeSite.includes("/telanas/read/"), "Prototype knowledge views must route Reader links to the canonical locale Reader");
assert(prototypeSite.includes("dataset.prototypeLexiconHref"), "Prototype knowledge views must retain their original Lexicon target while bridging to the canonical route");
assert(prototypeSite.includes("/telanas/lexicon/"), "Prototype knowledge views must route Lexicon links to the canonical locale Lexicon");
assert(prototypeSite.includes("target.search = source.search"), "Prototype canonical bridges must preserve semantic query data");
assert(prototypeSite.includes("target.hash = source.hash"), "Prototype canonical bridges must preserve semantic hashes");

console.log("PASS: validated Reader/Lexicon public surface and retained Timeline route");
