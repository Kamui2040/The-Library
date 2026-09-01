import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "assets/library-shell.js",
  "en/index.html",
  "de/index.html",
  "en/telanas/index.html",
  "de/telanas/index.html"
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

for (const locale of ["en", "de"]) {
  const rootPath = `${locale}/index.html`;
  const landingPath = `${locale}/telanas/index.html`;
  const rootHtml = await readFile(path.join(root, rootPath), "utf8");
  const html = await readFile(path.join(root, landingPath), "utf8");

  assert(rootHtml.includes('content="0; url=telanas/"'), `${rootPath} must redirect to telanas/`);
  assert(rootHtml.includes('window.location.replace("telanas/")'), `${rootPath} must preserve the locale-root redirect without relying only on meta refresh`);
  assert(html.includes(`<html lang="${locale}" data-route-locale="${locale}"`), `${landingPath} must declare its route locale`);
  assert(html.includes('href="../../en/telanas/"'), `${landingPath} must expose the English equivalent route`);
  assert(html.includes('href="../../de/telanas/"'), `${landingPath} must expose the German equivalent route`);
  assert(html.includes('src="../../assets/library-shell.js"'), `${landingPath} must use the production Library shell`);
  assert(html.includes('data-spoiler-progress-select'), `${landingPath} must preserve the shared spoiler-progress control`);

  const tags = html.match(/<(?:a|link|script)\b[^>]*(?:href|src)="[^"]+"[^>]*>/g) || [];
  for (const tag of tags) {
    const match = tag.match(/(?:href|src)="([^"]+)"/);
    if (!match) continue;
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;

    const withoutFragment = reference.split("#", 1)[0].split("?", 1)[0];
    if (!withoutFragment) continue;
    let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(landingPath), withoutFragment));
    if (withoutFragment.endsWith("/") || resolved === ".") resolved = path.posix.join(resolved, "index.html");
    assert(await exists(resolved), `${landingPath} references missing local target: ${reference}`);

    if (reference.includes("prototype/telanas/")) {
      assert(tag.includes("data-prototype-bridge") || tag.startsWith("<link") || tag.startsWith("<script"), `${landingPath} prototype navigation bridge must be explicitly marked: ${reference}`);
    }
  }
}

console.log("PASS: validated canonical EN/DE locale roots and Telanas landing routes");
