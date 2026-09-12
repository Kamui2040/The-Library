#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BOOK_DIR = path.join(ROOT, "content/worlds/telanas/books/dragon-knight/volume-01");

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readText(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(readText(relative));
}

const book = readJson("content/worlds/telanas/books/dragon-knight/volume-01/book.json");
assert(Array.isArray(book.backMatter), "Volume 1 backMatter must be an array");
assert(book.backMatter.length === 1, "Volume 1 must declare exactly one back-matter section");

const definition = book.backMatter[0];
assert(definition.id === "afterword", "Volume 1 back matter must use the stable afterword id");
assert(definition.type === "afterword", "Volume 1 back matter must use the afterword type");
assert(definition.slug === "afterword", "Volume 1 afterword slug must remain stable");
assert(definition.source === "afterword.json", "Volume 1 afterword must use its canonical source file");

const sourcePath = path.join(BOOK_DIR, definition.source);
assert(fs.statSync(sourcePath).isFile(), "Volume 1 afterword source is missing");
const payload = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

for (const [field, expected] of Object.entries({
  world: book.world,
  story: book.story,
  book: book.id,
  id: definition.id,
  type: definition.type,
  state: book.state,
  contentMode: book.contentMode,
})) {
  assert(payload[field] === expected, `Afterword ${field} does not match the Volume 1 manifest`);
}

const expectations = {
  en: {
    label: "Afterword",
    websiteUrl: "https://kamui2040.github.io/The-Library/en/telanas/",
    reader: "en/telanas/read/dragon-knight/volume-01/index.html",
  },
  de: {
    label: "Nachwort",
    websiteUrl: "https://kamui2040.github.io/The-Library/de/telanas/",
    reader: "de/telanas/read/dragon-knight/volume-01/index.html",
  },
};

let structure = null;
for (const [locale, expected] of Object.entries(expectations)) {
  assert(definition.labels?.[locale] === expected.label, `Unexpected ${locale} afterword label`);
  const data = payload.locales?.[locale];
  assert(data && Array.isArray(data.blocks) && data.blocks.length > 0, `Missing ${locale} afterword blocks`);
  const signature = data.blocks.map((block) => `${block.id}:${block.type}`).join("|");
  if (structure === null) structure = signature;
  else assert(signature === structure, "Afterword block identity/order must match across locales");

  const website = data.blocks.filter((block) => block.type === "link");
  assert(website.length === 1, `${locale} afterword must contain exactly one website link`);
  assert(website[0].label === "The Library - Telanas", `Unexpected ${locale} afterword website label`);
  assert(website[0].url === expected.websiteUrl, `Unexpected ${locale} afterword website URL`);

  const readerPage = readText(expected.reader);
  assert(readerPage.includes("reader-engine.js"), `${locale} reader is missing the shared Reader model`);
  assert(readerPage.includes("reader.js"), `${locale} reader is missing the shared Reader renderer`);
  assert(!readerPage.includes("reader-afterword"), `${locale} reader still contains detached afterword integration`);
  assert(!readerPage.includes("data-reader-afterword"), `${locale} reader still declares a detached afterword source`);
}

assert(!fs.existsSync(path.join(ROOT, "assets/reader/reader-afterword.js")), "Detached Reader afterword script must not exist");
assert(!fs.existsSync(path.join(ROOT, "assets/reader/reader-afterword.css")), "Detached Reader afterword styles must not exist");

const readerEngine = readText("assets/reader/reader-engine.js");
const reader = readText("assets/reader/reader.js");
const bookmarks = readText("assets/reader/reader-bookmarks.js");
const progress = readText("assets/reader/reader-progress.js");
assert(readerEngine.includes("backMatterPayloads"), "Reader model must load manifest-declared back matter");
assert(readerEngine.includes('kind: "back-matter"'), "Reader model must keep back matter separate from story chapters");
assert(reader.includes("model.sections"), "Reader must paginate the combined ordered structure");
assert(reader.includes("loadBackMatter"), "Reader must load back matter through the book manifest");
assert(reader.includes("reader-continuous-back-matter"), "Continuous Reader mode must include native back matter");
assert(bookmarks.includes("sectionId"), "Reader bookmarks must use section identity for story and back matter");
assert(progress.includes("data-reader-section-kind='back-matter'"), "Reader progress must recognize the story/back-matter boundary");

const pdfBuilder = readText("scripts/build-volume-pdfs-release.py");
assert(pdfBuilder.includes('book.get("backMatter")'), "PDF release builder must consume manifest-declared back matter");
assert(pdfBuilder.includes('block_type == "link"'), "PDF release builder must preserve the website hyperlink block");
assert(pdfBuilder.includes("TOCEntry"), "PDF release builder must include the afterword in navigation");

const epubBuilder = readText("scripts/build-volume-epubs.py");
const cssStart = epubBuilder.indexOf("CSS = '''");
const cssEnd = epubBuilder.indexOf("\n'''", cssStart + 9);
assert(cssStart >= 0 && cssEnd > cssStart, "EPUB stylesheet source is missing");
const epubCss = epubBuilder.slice(cssStart, cssEnd);
for (const forbidden of ["vh", "display: flex", "min-height", "max-height", "page-break", "break-after", "@page"]) {
  assert(!epubCss.includes(forbidden), `EPUB stylesheet contains forbidden physical-page behavior: ${forbidden}`);
}
for (const forbidden of ["text-align: justify", "hyphens: auto"]) {
  assert(!epubCss.includes(forbidden), `EPUB stylesheet contains forced paragraph formatting: ${forbidden}`);
}
assert(epubCss.includes("hyphens: none;"), "EPUB paragraphs must default to natural, unhyphenated wrapping");
assert(
  epubCss.includes("text-indent: 0;") && epubCss.includes("margin: 0 0 1em;"),
  "EPUB chapter paragraphs must match the Reader's block spacing without first-line indentation",
);
assert(epubBuilder.includes('book.get("backMatter")'), "EPUB builder must consume manifest-declared back matter");
assert(epubBuilder.includes('epub:type="afterword"'), "EPUB builder must expose semantic afterword back matter");
assert(epubBuilder.includes("'<itemref idref=\"nav\"/>'"), "EPUB Contents must appear in reading order");
assert(epubBuilder.includes('toc="ncx"'), "EPUB must expose the compatibility navigation fallback");
const chapterRef = epubBuilder.indexOf(
  'f\'<itemref idref="chapter-{cid}" properties="page-spread-left"/>\'',
);
assert(
  chapterRef >= 0 && !epubBuilder.includes('idref="body-{cid}"'),
  "EPUB reading order must expose exactly one localized spine section per chapter",
);
const openingTitle = epubBuilder.indexOf("'<section class=\"chapter-title-page\">'");
const openingIllustration = epubBuilder.indexOf(
  "'<section class=\"illustration-page chapter-illustration\">'",
  openingTitle,
);
const chapterBody = epubBuilder.indexOf("out = ['<section class=\"chapter-body\">']", openingIllustration);
assert(
  openingTitle >= 0 &&
    openingTitle < openingIllustration &&
    openingIllustration < chapterBody &&
    epubCss.includes(".chapter-illustration,\n.chapter-body") &&
    epubCss.includes("break-before: page;"),
  "EPUB chapters must contain title, illustration, and prose in order with standard page breaks",
);

const packageJson = readJson("package.json");
assert(
  packageJson.scripts?.["build:pdfs"] === "python3 scripts/build-volume-pdfs-release.py",
  "build:pdfs must use the afterword-aware release builder",
);
assert(
  packageJson.scripts?.["build:epubs:release"] === "python3 scripts/build-volume-epubs-release.py",
  "build:epubs:release must use staged official validation",
);

console.log("PASS: Volume 1 back matter is first-class across Reader, PDF, and EPUB");
