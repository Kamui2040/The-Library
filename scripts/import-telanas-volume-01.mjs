import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRepository = "Kamui2040/Telanas";
const sourceCommit = "0177893694171b9650ff49bb97b136d0850b9e61";
const expectedBranch = "release/telanas-volume-01";
const bookDirectory = "content/worlds/telanas/books/dragon-knight/volume-01";
const illustrationsDirectory = path.join(root, bookDirectory, "illustrations");

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const ghJson = (endpoint) => JSON.parse(execFileSync("gh", ["api", endpoint], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

const sourceFiles = {
  "manuscript/en/band-01.md": "410153c0da2cf0a9c9d56563459d6c2c753459db",
  "manuscript/de/band-01.md": "105c7a4090399ab549a6c0082124761c559535b4",
  "docs/story/illustration-reference.md": "72a98c42ac7a247f3cbe42aaafc163116d3ba375",
};

const chapters = [
  {
    id: "dk-v01-prologue",
    slug: "prologue",
    headings: { en: "Prologue — Before the Sky", de: "Prolog — Vor dem Himmel" },
    assetId: "dk-v01-ill-prologue",
    filename: "Band 1 - Approved Primordial Cosmos.png",
    sourceBlob: "5c499b2b778d205ca34e2a56eabbab497174f921",
    alt: {
      en: "Watercolor view of two distant young dragons leaving luminous trails through a forming primordial cosmos.",
      de: "Aquarellansicht zweier ferner junger Drachen, deren leuchtende Spuren sich durch einen entstehenden ursprünglichen Kosmos ziehen.",
    },
  },
  {
    id: "dk-v01-ch01",
    slug: "chapter-1",
    headings: { en: "Chapter 1 — The Road", de: "Kapitel 1 — Die Straße" },
    assetId: "dk-v01-ill-ch01",
    filename: "Band 1 - Approved Village Illustration Reference.png",
    sourceBlob: "3dd09843fc3c6396102b3d31029229d212adf63f",
    alt: {
      en: "Watercolor view of an open rural village, its road, working buildings, fields, and the Old Forest.",
      de: "Aquarellansicht eines offenen ländlichen Dorfes mit Straße, Arbeitsgebäuden, Feldern und dem alten Wald.",
    },
  },
  {
    id: "dk-v01-ch02",
    slug: "chapter-2",
    headings: { en: "Chapter 2 — The Old Woods", de: "Kapitel 2 — Der alte Wald" },
    assetId: "dk-v01-ill-ch02",
    filename: "Band 1 - Approved Old Forest Entrance.png",
    sourceBlob: "5ad8fe990b9000159712cd8d064c6a08fea2fbc8",
    alt: {
      en: "Watercolor view of a quiet, misty path entering the Old Forest beneath large old trees.",
      de: "Aquarellansicht eines ruhigen, nebligen Pfades, der unter großen alten Bäumen in den alten Wald führt.",
    },
  },
  {
    id: "dk-v01-ch03",
    slug: "chapter-3",
    headings: { en: "Chapter 3 — Beyond Home", de: "Kapitel 3 — Jenseits des Dorfes" },
    assetId: "dk-v01-ill-ch03",
    filename: "Band 1 - Approved Town Entrance.png",
    sourceBlob: "b239689816cbbd7564b0d3cf458a7312f6b1c328",
    alt: {
      en: "Watercolor view of a road approaching a modest walled regional town through surrounding countryside.",
      de: "Aquarellansicht einer Straße, die durch das Umland auf eine bescheidene ummauerte Regionalstadt zuführt.",
    },
  },
  {
    id: "dk-v01-ch04",
    slug: "chapter-4",
    headings: { en: "Chapter 4 — Useful Hands", de: "Kapitel 4 — Nützliche Hände" },
    assetId: "dk-v01-ill-ch04",
    filename: "Band 1 - Approved Alden Smithy.png",
    sourceBlob: "4f077b39f3e9f167749e9d4a0574c5e866158b8d",
    alt: {
      en: "Watercolor view inside a practical open-front village smithy with forge, anvil, tools, and everyday metalwork.",
      de: "Aquarellansicht einer praktischen offenen Dorfschmiede mit Esse, Amboss, Werkzeugen und alltäglichen Metallarbeiten.",
    },
  },
  {
    id: "dk-v01-ch05",
    slug: "chapter-5",
    headings: { en: "Chapter 5 — The Hunt", de: "Kapitel 5 — Die Jagd" },
    assetId: "dk-v01-ill-ch05",
    filename: "Band 1 - Approved Forest Camp.png",
    sourceBlob: "2fad07eb20427a634e3da51ab38ca05d9cba4bad",
    alt: {
      en: "Watercolor view of a quiet night forest camp with a small fire, bedrolls, packs, and practical hunting gear.",
      de: "Aquarellansicht eines ruhigen nächtlichen Waldlagers mit kleinem Feuer, Schlafrollen, Gepäck und praktischer Jagdausrüstung.",
    },
  },
  {
    id: "dk-v01-ch06",
    slug: "chapter-6",
    headings: { en: "Chapter 6 — Apprentice", de: "Kapitel 6 — Die Lehre" },
    assetId: "dk-v01-ill-ch06",
    filename: "Band 1 - Approved Apprentice.png",
    sourceBlob: "079b20bc7c2b8a9c694a0cf4bf72b49bbf3c5aeb",
    alt: {
      en: "Watercolor view of a fine-metalwork workshop filled with small tools, chains, clasps, pendants, and careful bench work.",
      de: "Aquarellansicht einer Feinmetallwerkstatt mit kleinen Werkzeugen, Ketten, Verschlüssen, Anhängern und sorgfältiger Werkbankarbeit.",
    },
  },
  {
    id: "dk-v01-ch07",
    slug: "chapter-7",
    headings: { en: "Chapter 7 — The Long Winter", de: "Kapitel 7 — Der lange Winter" },
    assetId: "dk-v01-ill-ch07",
    filename: "Band 1 - Approved Long Winter.png",
    sourceBlob: "ba343be21782a33c623d52a1fd3b88b54dddd92d",
    alt: {
      en: "Watercolor view of a village home and attached smithy under heavy winter snow, with warm light inside.",
      de: "Aquarellansicht eines Dorfhauses mit angebauter Schmiede unter schwerem Winterschnee und warmem Licht im Inneren.",
    },
  },
  {
    id: "dk-v01-ch08",
    slug: "chapter-8",
    headings: { en: "Chapter 8 — What Remains", de: "Kapitel 8 — Was bleibt" },
    assetId: "dk-v01-ill-ch08",
    filename: "Band 1 - Approved What Remains.png",
    sourceBlob: "6928b4c6fc820adbe5c68dce19e989f82ee5fcf4",
    alt: {
      en: "Watercolor view of an empty porch chair with a draped blanket, a simple bow nearby, and a small silver leaf pendant.",
      de: "Aquarellansicht eines leeren Verandastuhls mit darübergelegter Decke, einem einfachen Bogen in der Nähe und einem kleinen silbernen Blattanhänger.",
    },
  },
  {
    id: "dk-v01-ch09",
    slug: "chapter-9",
    headings: { en: "Chapter 9 — The Choice", de: "Kapitel 9 — Die Entscheidung" },
    assetId: "dk-v01-ill-ch09",
    filename: "Band 1 - Approved The Choice.png",
    sourceBlob: "f65b214954b70f4530a4ccfef62f32aad8ff0b76",
    alt: {
      en: "Watercolor view of old chainmail and a sword laid out quietly on a wooden chest at home.",
      de: "Aquarellansicht eines alten Kettenhemds und eines Schwertes, die ruhig auf einer Holztruhe im Haus liegen.",
    },
  },
];

const metadata = {
  en: ["# TELANAS", "## The Dragon Knight", "### Volume 1 — Home"],
  de: ["# TELANAS", "## Der Drachenritter", "### Band 1 — Zuhause"],
};

const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);

const pngRatio = async (filename) => {
  const data = await readFile(path.join(illustrationsDirectory, filename));
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(data.subarray(0, 8).equals(signature), `${filename} is not a PNG`);
  assert(data.subarray(12, 16).toString("ascii") === "IHDR", `${filename} has no PNG IHDR header`);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  assert(width > 0 && height > 0, `${filename} has invalid dimensions`);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

const fetchBlob = (sha) => {
  const blob = ghJson(`repos/${sourceRepository}/git/blobs/${sha}`);
  assert(blob.encoding === "base64", `Unexpected GitHub blob encoding for ${sha}`);
  const data = Buffer.from(String(blob.content || "").replace(/\s+/g, ""), "base64");
  assert(data.length === blob.size, `GitHub blob size mismatch for ${sha}`);
  return data;
};

const trimBoundaryBlankLines = (lines) => {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === "") start += 1;
  while (end > start && lines[end - 1] === "") end -= 1;
  return lines.slice(start, end);
};

const parseBody = (lines, anchorPrefix) => {
  const blocks = [];
  let paragraph = [];
  let paragraphIndex = 0;
  let sceneIndex = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    paragraphIndex += 1;
    blocks.push({
      id: `${anchorPrefix}-p${String(paragraphIndex).padStart(3, "0")}`,
      type: "paragraph",
      text: paragraph.join("\n"),
    });
    paragraph = [];
  };

  for (const line of lines) {
    if (line === "") {
      flushParagraph();
      continue;
    }

    if (["---", "***", "* * *"].includes(line.trim()) && paragraph.length === 0) {
      sceneIndex += 1;
      blocks.push({
        id: `${anchorPrefix}-s${String(sceneIndex).padStart(3, "0")}`,
        type: "scene-break",
      });
      continue;
    }

    assert(!/^#{1,6}\s/.test(line), `Unexpected nested Markdown heading inside ${anchorPrefix}: ${line}`);
    paragraph.push(line);
  }

  flushParagraph();
  assert(blocks.length > 0, `${anchorPrefix} contains no body blocks`);
  return blocks;
};

const parseManuscript = (source, locale) => {
  assert(!source.includes("\r"), `${locale} manuscript must use LF line endings`);
  const lines = source.split("\n");
  const nonblank = lines.filter((line) => line !== "");
  assert(nonblank[0] === metadata[locale][0], `${locale} manuscript title heading mismatch`);
  assert(nonblank[1] === metadata[locale][1], `${locale} manuscript series heading mismatch`);
  assert(nonblank[2] === metadata[locale][2], `${locale} manuscript volume heading mismatch`);

  const sectionHeadingIndexes = [];
  lines.forEach((line, index) => {
    if (/^#\s/.test(line) && line !== metadata[locale][0]) sectionHeadingIndexes.push(index);
  });

  assert(sectionHeadingIndexes.length === chapters.length, `${locale} manuscript must contain exactly ${chapters.length} prologue/chapter headings; found ${sectionHeadingIndexes.length}`);

  return chapters.map((chapter, index) => {
    const headingIndex = sectionHeadingIndexes[index];
    const heading = lines[headingIndex].slice(2);
    assert(heading === chapter.headings[locale], `${locale} heading mismatch at ${chapter.id}: expected ${JSON.stringify(chapter.headings[locale])}, found ${JSON.stringify(heading)}`);
    const nextHeadingIndex = index + 1 < sectionHeadingIndexes.length ? sectionHeadingIndexes[index + 1] : lines.length;
    const bodyLines = trimBoundaryBlankLines(lines.slice(headingIndex + 1, nextHeadingIndex));
    return {
      id: chapter.id,
      blocks: parseBody(bodyLines, chapter.id),
    };
  });
};

const structuralSignature = (editionChapters) => editionChapters.map((chapter) => ({
  id: chapter.id,
  blocks: chapter.blocks.map((block) => ({ id: block.id, type: block.type })),
}));

const withIllustrations = (editionChapters, locale) => editionChapters.map((editionChapter, index) => {
  const chapter = chapters[index];
  return {
    id: editionChapter.id,
    blocks: [
      {
        id: `${chapter.id}-i001`,
        type: "illustration",
        asset: chapter.assetId,
        placement: "before-title",
        alt: chapter.alt[locale],
      },
      ...editionChapter.blocks,
    ],
  };
});

const writeJson = async (relativePath, value) => {
  await writeFile(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

try {
  assert(git("remote", "get-url", "origin") === "https://github.com/Kamui2040/The-Library.git", "Wrong The-Library origin");
  assert(git("rev-parse", "--abbrev-ref", "HEAD") === expectedBranch, `Run this importer on ${expectedBranch}`);
  assert(git("status", "--porcelain") === "", "The-Library checkout must be clean before import");

  const commit = ghJson(`repos/${sourceRepository}/git/commits/${sourceCommit}`);
  assert(commit.sha === sourceCommit, "Could not resolve the pinned Telanas source commit");
  const sourceTree = ghJson(`repos/${sourceRepository}/git/trees/${commit.tree.sha}?recursive=1`);
  assert(sourceTree.truncated === false, "Telanas source tree response was truncated");
  const sourceTreeMap = new Map(sourceTree.tree.map((entry) => [entry.path, entry]));

  for (const [sourcePath, expectedSha] of Object.entries(sourceFiles)) {
    const entry = sourceTreeMap.get(sourcePath);
    assert(entry?.type === "blob", `Missing source file at pinned commit: ${sourcePath}`);
    assert(entry.sha === expectedSha, `Unexpected source version for ${sourcePath}`);
  }

  const sourceIllustrations = sourceTree.tree.filter((entry) => entry.type === "blob" && entry.path.startsWith("assets/illustrations/band-01/") && entry.path.toLowerCase().endsWith(".png"));
  assert(sourceIllustrations.length === 10, `Pinned Telanas commit must contain exactly 10 Band 1 illustration PNGs; found ${sourceIllustrations.length}`);

  const expectedIllustrationNames = new Set(chapters.map((chapter) => chapter.filename));
  const sourceIllustrationNames = new Set(sourceIllustrations.map((entry) => path.posix.basename(entry.path)));
  assert(expectedIllustrationNames.size === sourceIllustrationNames.size && [...expectedIllustrationNames].every((name) => sourceIllustrationNames.has(name)), "Pinned Telanas illustration inventory does not match the authoritative Band 1 mapping");

  const localIllustrationEntries = (await import("node:fs/promises")).readdir(illustrationsDirectory, { withFileTypes: true });
  const localIllustrationNames = (await localIllustrationEntries).filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png")).map((entry) => entry.name);
  assert(localIllustrationNames.length === 10, `The-Library must contain exactly 10 Band 1 illustration PNGs; found ${localIllustrationNames.length}`);
  assert(localIllustrationNames.every((name) => expectedIllustrationNames.has(name)), "The-Library contains an unexpected Band 1 illustration PNG");

  const illustrationDefinitions = [];
  for (const chapter of chapters) {
    const localPath = path.join(illustrationsDirectory, chapter.filename);
    const localBlob = execFileSync("git", ["hash-object", localPath], { encoding: "utf8" }).trim();
    assert(localBlob === chapter.sourceBlob, `Wrong approved illustration version: ${chapter.filename}`);
    const sourceEntry = sourceTreeMap.get(`assets/illustrations/band-01/${chapter.filename}`);
    assert(sourceEntry?.sha === chapter.sourceBlob, `Pinned Telanas source blob mismatch: ${chapter.filename}`);
    illustrationDefinitions.push({
      id: chapter.assetId,
      mode: "image",
      src: `illustrations/${chapter.filename}`,
      aspectRatio: await pngRatio(chapter.filename),
    });
  }

  const enBytes = fetchBlob(sourceFiles["manuscript/en/band-01.md"]);
  const deBytes = fetchBlob(sourceFiles["manuscript/de/band-01.md"]);
  const enSource = enBytes.toString("utf8");
  const deSource = deBytes.toString("utf8");
  assert(Buffer.from(enSource, "utf8").equals(enBytes), "English manuscript is not valid UTF-8");
  assert(Buffer.from(deSource, "utf8").equals(deBytes), "German manuscript is not valid UTF-8");

  const enParsed = parseManuscript(enSource, "en");
  const deParsed = parseManuscript(deSource, "de");
  assert(JSON.stringify(structuralSignature(enParsed)) === JSON.stringify(structuralSignature(deParsed)), "English and German manuscript paragraph/scene structure is not semantically aligned; import stopped rather than inventing anchors");

  const enChapters = withIllustrations(enParsed, "en");
  const deChapters = withIllustrations(deParsed, "de");

  const book = {
    schemaVersion: 1,
    world: "telanas",
    story: "dragon-knight",
    id: "volume-01",
    state: "approved",
    contentMode: "released",
    locales: ["en", "de"],
    editions: {
      en: "editions/en.json",
      de: "editions/de.json",
    },
    contextualLexicon: "contextual-lexicon.json",
    spoilerMilestones: ["dk-v01-ch01-p004"],
    source: {
      repository: sourceRepository,
      commit: sourceCommit,
      manuscripts: {
        en: "manuscript/en/band-01.md",
        de: "manuscript/de/band-01.md",
      },
      manuscriptBlobs: {
        en: sourceFiles["manuscript/en/band-01.md"],
        de: sourceFiles["manuscript/de/band-01.md"],
      },
      illustrationReference: "docs/story/illustration-reference.md",
      illustrationsDirectory: "assets/illustrations/band-01/",
    },
    illustrations: illustrationDefinitions,
    labels: {
      en: {
        world: "Telanas",
        series: "The Dragon Knight",
        volume: "Volume 1 — Home",
        contents: "Contents",
      },
      de: {
        world: "Telanas",
        series: "Der Drachenritter",
        volume: "Band 1 — Zuhause",
        contents: "Inhalt",
      },
    },
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      slug: chapter.slug,
      labels: chapter.headings,
    })),
  };

  const editionBase = {
    schemaVersion: 1,
    world: "telanas",
    story: "dragon-knight",
    book: "volume-01",
    state: "approved",
    contentMode: "released",
  };

  await writeJson(`${bookDirectory}/book.json`, book);
  await writeJson(`${bookDirectory}/editions/en.json`, { ...editionBase, locale: "en", chapters: enChapters });
  await writeJson(`${bookDirectory}/editions/de.json`, { ...editionBase, locale: "de", chapters: deChapters });
  await writeJson(`${bookDirectory}/contextual-lexicon.json`, {
    schemaVersion: 1,
    world: "telanas",
    story: "dragon-knight",
    book: "volume-01",
    locales: ["en", "de"],
    references: { en: [], de: [] },
  });

  const worldPath = path.join(root, "content/worlds/telanas/world.json");
  const world = JSON.parse(await readFile(worldPath, "utf8"));
  const story = world.stories?.find((candidate) => candidate.id === "dragon-knight");
  const bookRef = story?.books?.find((candidate) => candidate.id === "volume-01");
  assert(bookRef, "Telanas world manifest is missing dragon-knight/volume-01");
  bookRef.state = "approved";
  await writeJson("content/worlds/telanas/world.json", world);

  console.log(`PASS: imported exact EN/DE Band 1 manuscripts from ${sourceCommit} with 10 authoritative lead illustrations`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
