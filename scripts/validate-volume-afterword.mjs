#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BOOK_DIR = path.join(ROOT, "content/worlds/telanas/books/dragon-knight/volume-01");
const AFTERWORD = path.join(BOOK_DIR, "afterword.json");

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readText(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

const payload = JSON.parse(fs.readFileSync(AFTERWORD, "utf8"));
assert(payload.state === "published", "Afterword must remain published");
assert(payload.contentMode === "released", "Afterword must remain released content");
assert(payload.locales && typeof payload.locales === "object", "Afterword locales are missing");

const expectations = {
  en: {
    heading: "Afterword",
    websiteUrl: "https://kamui2040.github.io/The-Library/en/telanas/",
    reader: "en/telanas/read/dragon-knight/volume-01/index.html"
  },
  de: {
    heading: "Nachwort",
    websiteUrl: "https://kamui2040.github.io/The-Library/de/telanas/",
    reader: "de/telanas/read/dragon-knight/volume-01/index.html"
  }
};

for (const [locale, expected] of Object.entries(expectations)) {
  const data = payload.locales[locale];
  assert(data && typeof data === "object", `Missing ${locale} afterword`);
  assert(data.heading === expected.heading, `Unexpected ${locale} afterword heading`);
  assert(Array.isArray(data.paragraphs) && data.paragraphs.length > 0, `Missing ${locale} afterword paragraphs`);
  assert(data.paragraphs.every((item) => typeof item === "string" && item.trim()), `Invalid ${locale} afterword paragraph`);
  assert(data.websiteLabel === "The Library - Telanas", `Unexpected ${locale} afterword website label`);
  assert(data.websiteUrl === expected.websiteUrl, `Unexpected ${locale} afterword website URL`);
  assert(Array.isArray(data.closingParagraphs) && data.closingParagraphs.length > 0, `Missing ${locale} closing paragraphs`);
  assert(typeof data.signature === "string" && data.signature.trim(), `Missing ${locale} afterword signature`);

  const reader = readText(expected.reader);
  assert(reader.includes("data-reader-afterword="), `${locale} reader is missing afterword source`);
  assert(reader.includes("reader-afterword.css"), `${locale} reader is missing afterword styles`);
  assert(reader.includes("reader-afterword.js"), `${locale} reader is missing afterword behavior`);
  assert(reader.includes("data-reader-afterword-section"), `${locale} reader is missing afterword container`);
}

const readerAfterword = readText("assets/reader/reader-afterword.js");
assert(readerAfterword.includes("bookStage.append(section)"), "Reader afterword must move into the book stage");
assert(readerAfterword.includes("reader-afterword-page book-page body-page"), "Reader afterword must use book-page presentation");
assert(readerAfterword.includes("data-reader-afterword-inline-target"), "Reader afterword must appear in the in-book Contents page");
assert(readerAfterword.includes("websiteUrl"), "Reader afterword must render the localized website URL");
assert(readerAfterword.includes("data-reader-afterword-target"), "Reader afterword must expose a sidebar TOC target");
assert(readerAfterword.includes("MutationObserver"), "Reader afterword navigation must survive Reader rerenders");

const pdfBuilder = readText("scripts/build-volume-pdfs-release.py");
assert(pdfBuilder.includes("afterword.json"), "PDF release builder must consume shared afterword data");
assert(pdfBuilder.includes("websiteUrl"), "PDF release builder must preserve the website hyperlink");
assert(pdfBuilder.includes("TOCEntry"), "PDF release builder must include the afterword in navigation");

const epubBuilder = readText("scripts/build-volume-epubs.py");
assert(epubBuilder.includes("afterword.json"), "EPUB builder must consume shared afterword data");
assert(epubBuilder.includes("chapter-title-"), "EPUB builder must preserve dedicated chapter-title documents");
assert(epubBuilder.includes('epub:type="afterword"'), "EPUB builder must expose semantic afterword back matter");
assert(!epubBuilder.includes("explore.xhtml"), "EPUB must not duplicate the approved afterword with a separate Explore page");

const packageJson = JSON.parse(readText("package.json"));
assert(
  packageJson.scripts?.["build:pdfs"] === "python3 scripts/build-volume-pdfs-release.py",
  "build:pdfs must use the afterword-aware release builder"
);

console.log("PASS: Volume 1 afterword is aligned across website, PDF, and EPUB surfaces");
