import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const safeId = /^[a-z0-9][a-z0-9-]*$/;
const allowedModes = new Set([
  "always",
  "completed-chapter",
  "reached-anchor",
  "full-spoilers"
]);

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const assertId = (value, label) => {
  assert(
    typeof value === "string" && safeId.test(value),
    `${label} must use a stable lowercase id`
  );
};

const readText = async (relativePath) =>
  readFile(path.join(root, relativePath), "utf8");

const readJson = async (relativePath) =>
  JSON.parse(await readText(relativePath));

const worldPath = "content/worlds/telanas/world.json";
const world = await readJson(worldPath);
const worldDirectory = path.posix.dirname(worldPath);

const targets = new Map();

for (const story of world.stories || []) {
  for (const ref of story.books || []) {
    const bookPath = path.posix.join(
      worldDirectory,
      ref.manifest
    );
    const bookDirectory = path.posix.dirname(bookPath);
    const book = await readJson(bookPath);

    const chapterIds = new Set(
      (book.chapters || []).map((chapter) => chapter.id)
    );

    const anchorChapterByLocale = new Map();

    for (const locale of book.locales || []) {
      const edition = await readJson(
        path.posix.join(
          bookDirectory,
          book.editions[locale]
        )
      );

      const mapping = new Map();

      for (const chapter of edition.chapters || []) {
        mapping.set(chapter.id, chapter.id);

        for (const block of chapter.blocks || []) {
          mapping.set(block.id, chapter.id);
        }
      }

      anchorChapterByLocale.set(locale, mapping);
    }

    targets.set(`${story.id}/${book.id}`, {
      story: story.id,
      book,
      chapterIds,
      anchorChapterByLocale
    });
  }
}

let visibilityCount = 0;
let chapterGateCount = 0;
let anchorGateCount = 0;

const validateVisibility = (visibility, label) => {
  assert(
    visibility &&
      typeof visibility === "object" &&
      !Array.isArray(visibility),
    `${label} visibility is missing`
  );

  assert(
    allowedModes.has(visibility.mode),
    `${label} uses obsolete or unknown visibility mode: ${visibility.mode}`
  );

  if (
    visibility.mode === "completed-chapter" ||
    visibility.mode === "reached-anchor"
  ) {
    assertId(visibility.story, `${label} story`);
    assertId(visibility.book, `${label} book`);
    assertId(visibility.chapter, `${label} chapter`);

    const target = targets.get(
      `${visibility.story}/${visibility.book}`
    );
    assert(
      target,
      `${label} references unknown book target`
    );
    assert(
      target.chapterIds.has(visibility.chapter),
      `${label} references unknown chapter: ${visibility.chapter}`
    );

    if (visibility.mode === "completed-chapter") {
      chapterGateCount += 1;
    }

    if (visibility.mode === "reached-anchor") {
      assertId(visibility.anchor, `${label} anchor`);

      for (const locale of target.book.locales || []) {
        const owner = target.anchorChapterByLocale
          .get(locale)
          ?.get(visibility.anchor);

        assert(
          owner === visibility.chapter,
          `${label} ${locale} anchor ${visibility.anchor} belongs to ${owner || "no chapter"}, not ${visibility.chapter}`
        );
      }

      anchorGateCount += 1;
    }
  }

  visibilityCount += 1;
};

const lexicon = await readJson(
  "content/worlds/telanas/lexicon/lexicon.json"
);

for (const entry of lexicon.entries || []) {
  validateVisibility(
    entry.visibility,
    `Lexicon entry ${entry.id}`
  );

  for (const section of entry.sections || []) {
    validateVisibility(
      section.visibility,
      `Lexicon section ${entry.id}/${section.id}`
    );
  }

  for (const fragment of entry.fragments || []) {
    validateVisibility(
      fragment.visibility,
      `Lexicon fragment ${entry.id}/${fragment.id}`
    );
  }

  for (const relationship of entry.relationships || []) {
    if (relationship.visibility) {
      validateVisibility(
        relationship.visibility,
        `Lexicon relationship ${entry.id}/${relationship.id}`
      );
    }
  }
}

const timeline = await readJson(
  "content/worlds/telanas/timeline/timeline.json"
);
for (const event of timeline.events || []) {
  validateVisibility(
    event.visibility,
    `Timeline event ${event.id}`
  );
}

const map = await readJson(
  "content/worlds/telanas/map/map.json"
);
for (const marker of map.markers || []) {
  validateVisibility(
    marker.visibility,
    `Map marker ${marker.id}`
  );
}

const profileSource = await readText(
  "assets/spoiler-profile.js"
);
assert(
  profileSource.includes(
    'const storageKey = "library-spoiler-profile-v3"'
  ),
  "Spoiler profile must use v3 storage"
);
assert(
  profileSource.includes("hasCompletedChapter"),
  "Spoiler profile must expose chapter completion"
);
assert(
  profileSource.includes("setStoryCompletedChapters"),
  "Spoiler profile must expose manual story chapter progress"
);
assert(
  profileSource.includes("markStoryCompletedChapters"),
  "Spoiler profile must expose monotonic Reader chapter progress"
);
assert(
  !profileSource.includes("completedVolumeAtLeast"),
  "Old completed-volume API must be removed"
);
assert(
  !profileSource.includes("setCompletedVolume"),
  "Old setCompletedVolume API must be removed"
);

const controlsSource = await readText(
  "assets/spoiler-controls.js"
);
assert(
  controlsSource.includes('document.createElement("optgroup")'),
  "Spoiler controls must group chapters by volume"
);
assert(
  controlsSource.includes("setStoryCompletedChapters"),
  "Manual spoiler controls must write chapter progress"
);

const readerProgressSource = await readText(
  "assets/reader/reader-progress.js"
);
assert(
  readerProgressSource.includes(
    "markStoryCompletedChapters"
  ),
  "Reader automatic progress must write chapter completion"
);
assert(
  !readerProgressSource.includes("setCompletedVolume"),
  "Reader progress must not use volume completion"
);

for (const locale of ["en", "de"]) {
  const landingPath = `${locale}/telanas/index.html`;
  const lexiconPath = `${locale}/telanas/lexicon/index.html`;
  const timelinePath = `${locale}/telanas/timeline/index.html`;
  const readerPath =
    `${locale}/telanas/read/dragon-knight/volume-01/index.html`;

  const landing = await readText(landingPath);
  const lexiconHtml = await readText(lexiconPath);
  const timelineHtml = await readText(timelinePath);
  const reader = await readText(readerPath);

  for (const [pathName, html] of [
    [landingPath, landing],
    [lexiconPath, lexiconHtml],
    [timelinePath, timelineHtml]
  ]) {
    assert(
      html.includes("data-spoiler-progress-select"),
      `${pathName} must expose chapter progress`
    );
    assert(
      html.includes(
        'data-spoiler-story="dragon-knight"'
      ),
      `${pathName} must identify its spoiler story`
    );
    assert(
      !html.includes('option value="volume-01"'),
      `${pathName} must not expose the old volume-only option`
    );
  }

  assert(
    landing.includes("data-spoiler-world-manifest"),
    `${landingPath} must identify its spoiler world manifest`
  );

  if (locale === "en") {
    assert(
      reader.includes("Ask when a chapter ends"),
      `${readerPath} must use chapter-end progress`
    );
    assert(
      !reader.includes("Ask when a volume ends"),
      `${readerPath} must not retain volume-end progress`
    );
  } else {
    assert(
      reader.includes("Am Kapitelende nachfragen"),
      `${readerPath} must use chapter-end progress`
    );
    assert(
      !reader.includes("Am Bandende nachfragen"),
      `${readerPath} must not retain volume-end progress`
    );
  }
}

console.log(
  `PASS: validated ${visibilityCount} spoiler visibility rule(s), ` +
  `${chapterGateCount} chapter gate(s), ${anchorGateCount} exact anchor gate(s)`
);
