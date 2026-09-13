#!/usr/bin/env python3
"""Build conservative reflowable EPUB 3.3 editions for released Telanas Volume 1 content."""

from __future__ import annotations

import argparse
import html
import json
import os
import shutil
import subprocess
import tempfile
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree as ET

try:
    from PIL import Image, ImageOps
except ImportError as error:
    raise SystemExit("EPUB build requires Pillow.") from error

ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = ROOT / "content/worlds/telanas/books/dragon-knight/volume-01"
OUTPUT_DIR = ROOT / "output/epub"
TMP_DIR = ROOT / "tmp/epubs"
MIMETYPE = b"application/epub+zip"
MAX_BYTES = 100 * 1024 * 1024
MAX_PIXELS = 5_600_000
MAX_IMAGE_SIZE = (1800, 2700)
JPEG_QUALITY = 85

LOCALES = {
    "en": {
        "filename": "the-dragon-knight-volume-01-home-en.epub",
        "edition": "English edition",
        "contents": "Contents",
        "website": "https://kamui2040.github.io/The-Library/en/telanas/",
    },
    "de": {
        "filename": "der-drachenritter-band-01-zuhause-de.epub",
        "edition": "Deutsche Ausgabe",
        "contents": "Inhalt",
        "website": "https://kamui2040.github.io/The-Library/de/telanas/",
    },
}

CSS = '''@charset "UTF-8";

body {
  margin: 0;
  padding: 1em;
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.5;
}

h1, h2, p {
  margin-top: 0;
}

a {
  color: inherit;
}

.cover-page,
.illustration-page,
.title-page,
.chapter-title-page,
.contents-page,
.back-matter {
  text-align: center;
}

.cover-page img,
.illustration-page img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

.chapter-illustration,
.chapter-body {
  break-before: page;
}

.title-page,
.chapter-title-page,
.contents-page,
.back-matter {
  padding-top: 2em;
}

.title-page .world,
.chapter-title-page .kicker {
  letter-spacing: .15em;
  text-transform: uppercase;
}

.title-page .series,
.chapter-title-page .series {
  font-weight: normal;
}

.title-page .rule,
.chapter-title-page .rule {
  margin: 1.25em auto;
  border: 0;
  border-top: 1px solid currentColor;
}

.title-page .website {
  margin-top: 3em;
}

.contents-page ol {
  margin: 1.5em 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.contents-page li {
  margin-bottom: .75em;
}

.contents-page a {
  text-decoration: none;
}

.chapter-body {
  text-align: left;
}

.chapter-body,
.back-matter {
  hyphens: none;
}

.chapter-body p {
  margin: 0 0 1em;
  text-indent: 0;
}

.scene-break {
  margin: 1.5em 0;
  text-align: center;
  text-indent: 0 !important;
  letter-spacing: .2em;
}

.back-matter p {
  margin: 0 0 1em;
  text-align: left;
}

.back-matter .website-link {
  margin: 1.5em 0;
  text-align: center;
}

.back-matter .website-link a {
  font-weight: bold;
}

.back-matter .signature {
  margin-top: 2em;
  text-align: right;
  font-style: italic;
}
'''

CONTAINER = '''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
'''


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def safe_path(value: str) -> str:
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise ValueError(f"Unsafe EPUB path: {value}")
    return path.as_posix()


def xml_doc(locale: str, title: str, body: str, body_class: str = "") -> str:
    class_attr = f' class="{html.escape(body_class, quote=True)}"' if body_class else ""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{locale}" lang="{locale}">
<head>
  <meta charset="UTF-8"/>
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="../styles/book.css" type="text/css"/>
</head>
<body{class_attr}>{body}</body>
</html>
'''


def modified_time() -> datetime:
    if os.environ.get("SOURCE_DATE_EPOCH"):
        return datetime.fromtimestamp(int(os.environ["SOURCE_DATE_EPOCH"]), timezone.utc).replace(microsecond=0)
    rel = BOOK_DIR.relative_to(ROOT)
    result = subprocess.run(
        ["git", "log", "-1", "--format=%cI", "--", str(rel)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode or not result.stdout.strip():
        raise RuntimeError("Build from the Git checkout or set SOURCE_DATE_EPOCH.")
    return datetime.fromisoformat(result.stdout.strip().replace("Z", "+00:00")).astimezone(timezone.utc).replace(microsecond=0)


def identifier(locale: str) -> str:
    value = uuid.uuid5(
        uuid.NAMESPACE_URL,
        f"https://kamui2040.github.io/The-Library/{locale}/telanas/#dragon-knight-volume-01",
    )
    return f"urn:uuid:{value}"


def optimize(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        if image.mode != "RGB":
            if "A" in image.getbands():
                background = Image.new("RGB", image.size, "white")
                background.paste(image, mask=image.getchannel("A"))
                image = background
            else:
                image = image.convert("RGB")
        image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
        if image.width * image.height > MAX_PIXELS:
            ratio = (MAX_PIXELS / float(image.width * image.height)) ** 0.5
            image = image.resize(
                (max(1, int(image.width * ratio)), max(1, int(image.height * ratio))),
                Image.Resampling.LANCZOS,
            )
        image.save(destination, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=False)


def write(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8", newline="\n")


def afterword_definition(book: dict) -> dict:
    entries = book.get("backMatter")
    if not isinstance(entries, list):
        raise ValueError("Book back matter is missing")
    matches = [entry for entry in entries if entry.get("type") == "afterword"]
    if len(matches) != 1:
        raise ValueError("Book must declare exactly one afterword")
    return matches[0]


def load_back_matter(book: dict, definition: dict) -> dict:
    relative = definition.get("source")
    if not isinstance(relative, str) or not relative:
        raise ValueError("Afterword source is missing")
    source = (BOOK_DIR / safe_path(relative)).resolve()
    if source.parent != BOOK_DIR.resolve() or not source.is_file():
        raise ValueError("Afterword source must be a file inside the book directory")
    return read_json(source)


def check_release(book: dict, edition: dict, definition: dict, afterword: dict, locale: str) -> None:
    for name, item in (("book", book), ("edition", edition), ("afterword", afterword)):
        if item.get("state") != "published" or item.get("contentMode") != "released":
            raise ValueError(f"{name} is not released publication content")
    if edition.get("locale") != locale:
        raise ValueError(f"Edition locale mismatch: {locale}")
    if [x["id"] for x in edition["chapters"]] != [x["id"] for x in book["chapters"]]:
        raise ValueError(f"Chapter order mismatch: {locale}")
    expected = {
        "world": book.get("world"),
        "story": book.get("story"),
        "book": book.get("id"),
        "id": definition.get("id"),
        "type": definition.get("type"),
    }
    for field, value in expected.items():
        if afterword.get(field) != value:
            raise ValueError(f"Afterword {field} does not match the book manifest")
    data = afterword.get("locales", {}).get(locale)
    if not isinstance(data, dict):
        raise ValueError(f"Missing afterword locale: {locale}")
    if not isinstance(data.get("blocks"), list) or not data["blocks"]:
        raise ValueError(f"Missing afterword blocks: {locale}")


def split_chapter_label(label: str) -> tuple[str, str]:
    parts = label.split(" — ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return "", label


def chapter_html(label: str, series: str, image_href: str, image_alt: str, chapter: dict) -> str:
    kicker, title = split_chapter_label(label)
    kicker_html = f'<p class="kicker">{html.escape(kicker)}</p>' if kicker else ""
    return (
        '<main class="chapter" epub:type="chapter">'
        '<section class="chapter-title-page">'
        f'{kicker_html}<hr class="rule"/><h1>{html.escape(title)}</h1>'
        f'<p class="series">{html.escape(series)}</p></section>'
        '<section class="illustration-page chapter-illustration">'
        f'<img src="{html.escape(image_href, quote=True)}" alt="{html.escape(image_alt, quote=True)}"/>'
        '</section>'
        f'{chapter_body_html(chapter)}'
        '</main>'
    )


def chapter_body_html(chapter: dict) -> str:
    out = ['<section class="chapter-body">']
    first, after_break = True, False
    for block in chapter["blocks"]:
        kind = block["type"]
        if kind == "illustration":
            continue
        block_id = html.escape(block["id"], quote=True)
        if kind == "scene-break":
            out.append(f'<p id="{block_id}" class="scene-break" aria-hidden="true">* * *</p>')
            after_break = True
            continue
        if kind != "paragraph":
            raise ValueError(f"Unsupported block type: {kind}")
        classes = " ".join(x for x, active in (("first", first), ("after-break", after_break)) if active)
        attr = f' class="{classes}"' if classes else ""
        out.append(f'<p id="{block_id}"{attr}>{html.escape(block["text"])}</p>')
        first, after_break = False, False
    out.append("</section>")
    return "\n".join(out)


def afterword_html(locale: str, definition: dict, afterword: dict) -> str:
    data = afterword["locales"][locale]
    heading = definition["labels"][locale]
    out = [f'<main class="back-matter" epub:type="afterword"><h1>{html.escape(heading)}</h1>']
    for block in data["blocks"]:
        block_id = html.escape(block["id"], quote=True)
        block_type = block["type"]
        if block_type == "paragraph":
            out.append(f'<p id="{block_id}">{html.escape(block["text"])}</p>')
        elif block_type == "link":
            out.append(
                f'<p id="{block_id}" class="website-link"><a href="{html.escape(block["url"], quote=True)}">'
                f'{html.escape(block["label"])}</a></p>'
            )
        elif block_type == "signature":
            out.append(f'<p id="{block_id}" class="signature">{html.escape(block["text"])}</p>')
        else:
            raise ValueError(f"Unsupported afterword block type: {block_type}")
    out.append("</main>")
    return "\n".join(out)


def nav_html(locale: str, config: dict, book: dict, definition: dict) -> str:
    chapter_links = [
        f'<li><a href="chapter-{c["id"]}.xhtml">{html.escape(c["labels"][locale])}</a></li>'
        for c in book["chapters"]
    ]
    chapter_links.append(
        f'<li><a href="afterword.xhtml">{html.escape(definition["labels"][locale])}</a></li>'
    )
    toc = (
        f'<nav epub:type="toc" id="toc" class="contents-page"><h1>{html.escape(config["contents"])}</h1>'
        f'<ol>{"".join(chapter_links)}</ol></nav>'
    )
    landmarks = (
        '<nav epub:type="landmarks" hidden="hidden"><ol>'
        '<li><a epub:type="cover" href="cover.xhtml">Cover</a></li>'
        '<li><a epub:type="titlepage" href="title.xhtml">Title page</a></li>'
        f'<li><a epub:type="bodymatter" href="chapter-{book["chapters"][0]["id"]}.xhtml">Story</a></li>'
        f'<li><a epub:type="afterword" href="afterword.xhtml">{html.escape(definition["labels"][locale])}</a></li>'
        '</ol></nav>'
    )
    return xml_doc(locale, config["contents"], toc + landmarks)


def ncx_html(locale: str, config: dict, book: dict, definition: dict) -> str:
    labels = book["labels"][locale]
    title = f'{labels["series"]}: {labels["volume"]}'
    entries = [
        (config["contents"], "text/nav.xhtml"),
        *[
            (chapter["labels"][locale], f'text/chapter-{chapter["id"]}.xhtml')
            for chapter in book["chapters"]
        ],
        (definition["labels"][locale], "text/afterword.xhtml"),
    ]
    nav_points = "".join(
        '<navPoint id="nav-{order}" playOrder="{order}">'
        '<navLabel><text>{label}</text></navLabel>'
        '<content src="{source}"/>'
        '</navPoint>'.format(
            order=order,
            label=html.escape(label),
            source=html.escape(source, quote=True),
        )
        for order, (label, source) in enumerate(entries, 1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="{locale}">
<head><meta name="dtb:uid" content="{identifier(locale)}"/></head>
<docTitle><text>{html.escape(title)}</text></docTitle>
<navMap>{nav_points}</navMap>
</ncx>
'''


def package_xml(locale: str, book: dict, modified: datetime, images: list[tuple[str, str, bool]]) -> str:
    labels = book["labels"][locale]
    title = f'{labels["series"]}: {labels["volume"]}'
    manifest = [
        '<item id="nav" href="text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
        '<item id="css" href="styles/book.css" media-type="text/css"/>',
        '<item id="cover-page" href="text/cover.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="title-page" href="text/title.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="afterword" href="text/afterword.xhtml" media-type="application/xhtml+xml"/>',
    ]
    spine = [
        '<itemref idref="cover-page"/>',
        '<itemref idref="title-page"/>',
        '<itemref idref="nav"/>',
    ]
    for chapter in book["chapters"]:
        cid = chapter["id"]
        manifest.append(
            f'<item id="chapter-{cid}" href="text/chapter-{cid}.xhtml" media-type="application/xhtml+xml"/>'
        )
        spine.append(f'<itemref idref="chapter-{cid}" properties="page-spread-left"/>')
    spine.append('<itemref idref="afterword"/>')
    for item_id, href, cover in images:
        prop = ' properties="cover-image"' if cover else ""
        manifest.append(f'<item id="{item_id}" href="{href}" media-type="image/jpeg"{prop}/>')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="{locale}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:identifier id="pub-id">{identifier(locale)}</dc:identifier>
  <dc:title>{html.escape(title)}</dc:title>
  <dc:creator>K2040</dc:creator>
  <dc:publisher>K2040</dc:publisher>
  <dc:language>{locale}</dc:language>
  <meta name="cover" content="cover-image"/>
  <meta property="dcterms:modified">{modified.strftime("%Y-%m-%dT%H:%M:%SZ")}</meta>
  <meta property="rendition:layout">reflowable</meta>
  <meta property="rendition:orientation">auto</meta>
  <meta property="rendition:spread">auto</meta>
</metadata>
<manifest>{''.join(manifest)}</manifest>
<spine toc="ncx" page-progression-direction="ltr">{''.join(spine)}</spine>
<guide><reference type="cover" title="Cover" href="text/cover.xhtml"/></guide>
</package>
'''


def zip_time(value: datetime) -> tuple[int, int, int, int, int, int]:
    return (max(1980, value.year), value.month, value.day, value.hour, value.minute, value.second)


def make_epub(stage: Path, destination: Path, modified: datetime) -> None:
    with zipfile.ZipFile(destination, "w") as archive:
        info = zipfile.ZipInfo("mimetype", zip_time(modified))
        info.compress_type = zipfile.ZIP_STORED
        archive.writestr(info, MIMETYPE)
        for source in sorted(stage.rglob("*")):
            if not source.is_file():
                continue
            arcname = safe_path(source.relative_to(stage).as_posix())
            info = zipfile.ZipInfo(arcname, zip_time(modified))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, source.read_bytes())


def validate(path: Path, book: dict) -> None:
    if path.stat().st_size >= MAX_BYTES:
        raise ValueError(f"EPUB exceeds 100 MiB: {path.name}")
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        if not infos or infos[0].filename != "mimetype" or infos[0].compress_type != zipfile.ZIP_STORED:
            raise ValueError("Invalid EPUB mimetype placement/compression")
        if archive.read("mimetype") != MIMETYPE:
            raise ValueError("Invalid EPUB mimetype")
        names = {x.filename for x in infos}
        required = {
            "META-INF/container.xml",
            "EPUB/package.opf",
            "EPUB/toc.ncx",
            "EPUB/text/nav.xhtml",
            "EPUB/text/afterword.xhtml",
        }
        if required - names:
            raise ValueError(f"Missing EPUB files: {sorted(required - names)}")
        package = ET.fromstring(archive.read("EPUB/package.opf"))
        namespace = {
            "opf": "http://www.idpf.org/2007/opf",
            "dc": "http://purl.org/dc/elements/1.1/",
        }
        creator = package.find("opf:metadata/dc:creator", namespace)
        publisher = package.find("opf:metadata/dc:publisher", namespace)
        if creator is None or creator.text != "K2040" or publisher is None or publisher.text != "K2040":
            raise ValueError("EPUB creator and publisher metadata must identify K2040")
        manifest_items = {
            item.get("id"): item.get("href")
            for item in package.findall("opf:manifest/opf:item", namespace)
        }
        cover_item = package.find("opf:manifest/opf:item[@id='cover-image']", namespace)
        if (
            cover_item is None
            or cover_item.get("href") != "images/cover.jpg"
            or cover_item.get("media-type") != "image/jpeg"
            or cover_item.get("properties") != "cover-image"
        ):
            raise ValueError("EPUB 3 cover image declaration is missing or invalid")
        legacy_cover = package.find("opf:metadata/opf:meta[@name='cover']", namespace)
        if legacy_cover is None or legacy_cover.get("content") != "cover-image":
            raise ValueError("EPUB 2 cover image compatibility metadata is missing or invalid")
        guide_cover = package.find("opf:guide/opf:reference[@type='cover']", namespace)
        if guide_cover is None or guide_cover.get("href") != "text/cover.xhtml":
            raise ValueError("EPUB 2 cover guide compatibility reference is missing or invalid")
        spine_items = package.findall("opf:spine/opf:itemref", namespace)
        spine_ids = [item.get("idref") for item in spine_items]
        if spine_ids[:3] != ["cover-page", "title-page", "nav"] or spine_ids[-1:] != ["afterword"]:
            raise ValueError("EPUB reading order must be cover, title, contents, story, afterword")
        story_ids = spine_ids[3:-1]
        xhtml_namespace = {"xhtml": "http://www.w3.org/1999/xhtml"}
        expected_story_ids = [f'chapter-{chapter["id"]}' for chapter in book["chapters"]]
        if story_ids != expected_story_ids:
            raise ValueError("EPUB story reading order must contain exactly one spine section per chapter")
        expected_chapter_hrefs = [f'text/chapter-{chapter["id"]}.xhtml' for chapter in book["chapters"]]
        if [manifest_items.get(item_id) for item_id in story_ids] != expected_chapter_hrefs:
            raise ValueError("EPUB chapter spine entries must resolve directly to their localized navigation targets")
        for offset, chapter in enumerate(book["chapters"]):
            chapter_id = chapter["id"]
            chapter_item = spine_items[offset + 3]
            if chapter_item.get("properties") != "page-spread-left":
                raise ValueError("EPUB chapter must request the left side of its opening spread")
            chapter_doc = ET.fromstring(archive.read(f"EPUB/text/chapter-{chapter_id}.xhtml"))
            classes = [section.get("class") for section in chapter_doc.findall(".//xhtml:section", xhtml_namespace)]
            if classes != ["chapter-title-page", "illustration-page chapter-illustration", "chapter-body"]:
                raise ValueError("EPUB chapter must contain its title, illustration, and text in order")
        if any(name.startswith("EPUB/text/chapter-opening-") for name in names):
            raise ValueError("EPUB must not split chapter openings into extra spine documents")

        navigation = ET.fromstring(archive.read("EPUB/text/nav.xhtml"))
        landmark_cover = navigation.find(
            ".//xhtml:nav[@epub:type='landmarks']/xhtml:ol/xhtml:li/xhtml:a[@epub:type='cover']",
            {
                **xhtml_namespace,
                "epub": "http://www.idpf.org/2007/ops",
            },
        )
        if landmark_cover is None or landmark_cover.get("href") != "cover.xhtml":
            raise ValueError("EPUB 3 cover landmark is missing or invalid")
        toc_links = navigation.findall(
            ".//xhtml:nav[@id='toc']/xhtml:ol/xhtml:li/xhtml:a",
            xhtml_namespace,
        )
        nav_chapter_hrefs = [link.get("href") for link in toc_links[:-1]]
        if nav_chapter_hrefs != [href.removeprefix("text/") for href in expected_chapter_hrefs]:
            raise ValueError("EPUB navigation must expose exactly one entry for every story chapter")

        ncx_namespace = {"ncx": "http://www.daisy.org/z3986/2005/ncx/"}
        ncx = ET.fromstring(archive.read("EPUB/toc.ncx"))
        ncx_hrefs = [
            item.get("src")
            for item in ncx.findall(".//ncx:navPoint/ncx:content", ncx_namespace)
        ]
        if ncx_hrefs[1:-1] != expected_chapter_hrefs:
            raise ValueError("EPUB compatibility navigation must expose exactly one entry per story chapter")

        stylesheet = archive.read("EPUB/styles/book.css").decode("utf-8")
        for forbidden in ("vh", "display: flex", "min-height", "max-height", "page-break", "break-after", "@page"):
            if forbidden in stylesheet:
                raise ValueError(f"EPUB stylesheet contains physical-page behavior: {forbidden}")
        for forbidden in ("text-align: justify", "hyphens: auto"):
            if forbidden in stylesheet:
                raise ValueError(f"EPUB stylesheet contains forced paragraph formatting: {forbidden}")
        if "text-indent: 0;" not in stylesheet or "margin: 0 0 1em;" not in stylesheet:
            raise ValueError("EPUB chapter paragraphs must use block spacing without first-line indentation")
        if stylesheet.count("break-before: page;") != 1:
            raise ValueError("EPUB chapter must use standard page breaks before its illustration and text")
        for name in names:
            if name.endswith((".xml", ".opf", ".xhtml", ".ncx")):
                source = archive.read(name)
                ET.fromstring(source)
                if name.endswith(".xhtml") and b'name="viewport"' in source:
                    raise ValueError(f"EPUB XHTML contains viewport geometry: {name}")
            if name.startswith("EPUB/images/") and name.endswith(".jpg"):
                with Image.open(archive.open(name)) as image:
                    if image.width * image.height > MAX_PIXELS:
                        raise ValueError(f"Image exceeds 5.6 MP: {name}")


def run_epubcheck(path: Path, required: bool) -> None:
    executable = shutil.which("epubcheck")
    jar = os.environ.get("EPUBCHECK_JAR")
    command = [executable, str(path)] if executable else (["java", "-jar", jar, str(path)] if jar else None)
    if not command:
        if required:
            raise RuntimeError("Official EPUBCheck is required. Install epubcheck or set EPUBCHECK_JAR.")
        print(f"EPUBCheck unavailable; internal validation only: {path.name}")
        return
    subprocess.run(command, cwd=ROOT, check=True)


def build(
    book: dict,
    definition: dict,
    afterword: dict,
    locale: str,
    modified: datetime,
    destination: Path,
    require_epubcheck: bool,
) -> None:
    config = LOCALES[locale]
    edition = read_json(BOOK_DIR / book["editions"][locale])
    check_release(book, edition, definition, afterword, locale)
    illustration_assets = {x["id"]: x for x in book["illustrations"]}

    with tempfile.TemporaryDirectory(dir=TMP_DIR) as temp:
        stage = Path(temp)
        write(stage / "META-INF/container.xml", CONTAINER)
        write(stage / "EPUB/styles/book.css", CSS)

        images = [("cover-image", "images/cover.jpg", True)]
        optimize(BOOK_DIR / safe_path(book["cover"]["src"]), stage / "EPUB/images/cover.jpg")

        image_href: dict[str, str] = {}
        for number, asset in enumerate(book["illustrations"], 1):
            name = f"illustration-{number:02d}.jpg"
            optimize(BOOK_DIR / safe_path(asset["src"]), stage / "EPUB/images" / name)
            image_href[asset["id"]] = f"../images/{name}"
            images.append((f"image-{number:02d}", f"images/{name}", False))

        labels = book["labels"][locale]
        title = f'{labels["series"]}: {labels["volume"]}'
        cover_alt = book.get("cover", {}).get("alt", {}).get(locale, "")
        cover = (
            '<main class="cover-page" epub:type="cover">'
            f'<img src="../images/cover.jpg" alt="{html.escape(cover_alt, quote=True)}"/>'
            '</main>'
        )
        write(stage / "EPUB/text/cover.xhtml", xml_doc(locale, title, cover, "cover-body"))

        title_body = (
            '<main class="title-page" epub:type="titlepage">'
            f'<p class="world">{html.escape(labels["world"])}</p>'
            f'<p class="series">{html.escape(labels["series"])}</p>'
            '<hr class="rule"/>'
            f'<h1 class="volume">{html.escape(labels["volume"])}</h1>'
            f'<p class="edition">{html.escape(config["edition"])}</p>'
            f'<p class="website"><a href="{html.escape(config["website"], quote=True)}">The Library - Telanas</a></p>'
            '</main>'
        )
        write(stage / "EPUB/text/title.xhtml", xml_doc(locale, title, title_body))

        chapter_labels = {c["id"]: c["labels"][locale] for c in book["chapters"]}
        for chapter in edition["chapters"]:
            cid = chapter["id"]
            label = chapter_labels[cid]
            lead = [block for block in chapter["blocks"] if block["type"] == "illustration"]
            if len(lead) != 1 or lead[0].get("placement") != "before-title":
                raise ValueError(f"{locale} {cid}: expected one before-title illustration")
            asset_id = lead[0]["asset"]
            if asset_id not in illustration_assets or asset_id not in image_href:
                raise ValueError(f"Unknown illustration: {asset_id}")

            write(
                stage / f"EPUB/text/chapter-{cid}.xhtml",
                xml_doc(
                    locale,
                    label,
                    chapter_html(
                        label,
                        labels["series"],
                        image_href[asset_id],
                        lead[0].get("alt", ""),
                        chapter,
                    ),
                ),
            )

        write(
            stage / "EPUB/text/afterword.xhtml",
            xml_doc(
                locale,
                definition["labels"][locale],
                afterword_html(locale, definition, afterword),
            ),
        )
        write(stage / "EPUB/text/nav.xhtml", nav_html(locale, config, book, definition))
        write(stage / "EPUB/toc.ncx", ncx_html(locale, config, book, definition))
        write(stage / "EPUB/package.opf", package_xml(locale, book, modified, images))
        make_epub(stage, destination, modified)

    validate(destination, book)
    run_epubcheck(destination, require_epubcheck)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-epubcheck", action="store_true")
    args = parser.parse_args()

    book = read_json(BOOK_DIR / "book.json")
    definition = afterword_definition(book)
    afterword = load_back_matter(book, definition)
    if set(book.get("locales", [])) != set(LOCALES):
        raise ValueError("EPUB locales must match released book locales")

    modified = modified_time()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    staged: list[tuple[Path, Path]] = []
    try:
        for locale, config in LOCALES.items():
            temporary = TMP_DIR / f'.{config["filename"]}.tmp'
            final = OUTPUT_DIR / config["filename"]
            build(book, definition, afterword, locale, modified, temporary, args.require_epubcheck)
            staged.append((temporary, final))

        for temporary, final in staged:
            os.replace(temporary, final)
            print(f"Built {final.relative_to(ROOT)}")
    finally:
        for temporary, _ in staged:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
