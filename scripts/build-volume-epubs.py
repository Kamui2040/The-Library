#!/usr/bin/env python3
"""Build distributable EPUB 3.3 editions for released Telanas Volume 1 content."""

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
        "explore": "Explore Telanas",
        "explore_text": (
            "Continue with the integrated Reader, spoiler-aware Lexicon, illustrations, "
            "project updates, and information about future volumes on the official Telanas website."
        ),
    },
    "de": {
        "filename": "der-drachenritter-band-01-zuhause-de.epub",
        "edition": "Deutsche Ausgabe",
        "contents": "Inhalt",
        "website": "https://kamui2040.github.io/The-Library/de/telanas/",
        "explore": "Telanas entdecken",
        "explore_text": (
            "Den integrierten Reader, das spoilerabhängige Lexikon, Illustrationen, "
            "Projektneuigkeiten und Informationen zu zukünftigen Bänden findest du auf der "
            "offiziellen Telanas-Website."
        ),
    },
}

CSS = '''@charset "UTF-8";
body{margin:0 5%;font-family:serif;line-height:1.45;color:#292622}
main{max-width:42em;margin:0 auto}h1{text-align:center;margin:12vh 0 1.2em}
p{margin:0;text-indent:1.25em;orphans:2;widows:2}
p.first,p.after-break,.back-matter p{ text-indent:0}
.scene-break{text-align:center;text-indent:0;margin:1.6em 0;letter-spacing:.25em}
.illustration{text-align:center;margin:1.5em auto;break-inside:avoid-page}
.illustration img{display:block;max-width:100%;max-height:92vh;width:auto;height:auto;margin:auto}
.cover-page{margin:0;padding:0;text-align:center}.cover-page img{display:block;width:100%;height:auto}
.title-page{text-align:center;padding-top:16vh}.title-page .world{letter-spacing:.18em;text-transform:uppercase}
.title-page .series{font-size:1.55em}.title-page .volume{font-size:1.9em}.title-page .website{margin-top:18vh}
.back-matter{padding-top:5vh}.back-matter p{margin:0 0 1em}.signature{margin-top:1.8em}
.website-link{text-align:center;margin:1.5em 0}a{color:inherit}nav li{margin:.55em 0}
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


def xml_doc(locale: str, title: str, body: str) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{locale}">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{html.escape(title)}</title><link rel="stylesheet" href="../styles/book.css" type="text/css"/></head>
<body>{body}</body></html>
'''


def modified_time() -> datetime:
    if os.environ.get("SOURCE_DATE_EPOCH"):
        return datetime.fromtimestamp(int(os.environ["SOURCE_DATE_EPOCH"]), timezone.utc).replace(microsecond=0)
    rel = BOOK_DIR.relative_to(ROOT)
    result = subprocess.run(
        ["git", "log", "-1", "--format=%cI", "--", str(rel)],
        cwd=ROOT, check=False, capture_output=True, text=True,
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


def check_release(book: dict, edition: dict, afterword: dict, locale: str) -> None:
    for name, item in (("book", book), ("edition", edition), ("afterword", afterword)):
        if item.get("state") != "published" or item.get("contentMode") != "released":
            raise ValueError(f"{name} is not released publication content")
    if edition.get("locale") != locale:
        raise ValueError(f"Edition locale mismatch: {locale}")
    if [x["id"] for x in edition["chapters"]] != [x["id"] for x in book["chapters"]]:
        raise ValueError(f"Chapter order mismatch: {locale}")
    if locale not in afterword.get("locales", {}):
        raise ValueError(f"Missing afterword locale: {locale}")


def chapter_html(chapter: dict, label: str) -> str:
    out = [f"<main><h1>{html.escape(label)}</h1>"]
    first, after_break = True, False
    for block in chapter["blocks"]:
        kind = block["type"]
        if kind == "illustration":
            continue
        block_id = html.escape(block["id"], quote=True)
        if kind == "scene-break":
            out.append(f'<p id="{block_id}" class="scene-break">* * *</p>')
            after_break = True
            continue
        if kind != "paragraph":
            raise ValueError(f"Unsupported block type: {kind}")
        classes = " ".join(x for x, active in (("first", first), ("after-break", after_break)) if active)
        attr = f' class="{classes}"' if classes else ""
        out.append(f'<p id="{block_id}"{attr}>{html.escape(block["text"])}</p>')
        first, after_break = False, False
    out.append("</main>")
    return "\n".join(out)


def afterword_html(locale: str, afterword: dict, website: str) -> str:
    data = afterword["locales"][locale]
    out = [f'<main class="back-matter"><h1>{html.escape(data["heading"])}</h1>']
    out.extend(f"<p>{html.escape(value)}</p>" for value in data["paragraphs"])
    out.append(
        f'<p class="website-link"><a href="{html.escape(website, quote=True)}">'
        f'{html.escape(data["websiteLabel"])}</a></p>'
    )
    out.extend(f"<p>{html.escape(value)}</p>" for value in data["closingParagraphs"])
    out.append(f'<p class="signature">{html.escape(data["signature"])}</p></main>')
    return "\n".join(out)


def nav_html(locale: str, config: dict, book: dict, afterword: dict) -> str:
    links = [
        f'<li><a href="chapter-{c["id"]}.xhtml">{html.escape(c["labels"][locale])}</a></li>'
        for c in book["chapters"]
    ]
    links += [
        f'<li><a href="afterword.xhtml">{html.escape(afterword["locales"][locale]["heading"])}</a></li>',
        f'<li><a href="explore.xhtml">{html.escape(config["explore"])}</a></li>',
    ]
    body = f'<nav epub:type="toc" id="toc"><h1>{html.escape(config["contents"])}</h1><ol>{"".join(links)}</ol></nav>'
    return xml_doc(locale, config["contents"], body)


def package_xml(locale: str, book: dict, modified: datetime, images: list[tuple[str, str, bool]]) -> str:
    labels = book["labels"][locale]
    title = f'{labels["series"]}: {labels["volume"]}'
    manifest = [
        '<item id="nav" href="text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="css" href="styles/book.css" media-type="text/css"/>',
        '<item id="cover-page" href="text/cover.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="title-page" href="text/title.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="afterword" href="text/afterword.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="explore" href="text/explore.xhtml" media-type="application/xhtml+xml"/>',
    ]
    spine = ['<itemref idref="cover-page"/>', '<itemref idref="title-page"/>']
    for chapter in book["chapters"]:
        cid = chapter["id"]
        manifest += [
            f'<item id="ill-{cid}" href="text/illustration-{cid}.xhtml" media-type="application/xhtml+xml"/>',
            f'<item id="chapter-{cid}" href="text/chapter-{cid}.xhtml" media-type="application/xhtml+xml"/>',
        ]
        spine += [f'<itemref idref="ill-{cid}"/>', f'<itemref idref="chapter-{cid}"/>']
    spine += ['<itemref idref="afterword"/>', '<itemref idref="explore"/>']
    for item_id, href, cover in images:
        prop = ' properties="cover-image"' if cover else ""
        manifest.append(f'<item id="{item_id}" href="{href}" media-type="image/jpeg"{prop}/>')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="{locale}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="pub-id">{identifier(locale)}</dc:identifier><dc:title>{html.escape(title)}</dc:title>
<dc:creator>K2040</dc:creator><dc:language>{locale}</dc:language>
<meta property="dcterms:modified">{modified.strftime("%Y-%m-%dT%H:%M:%SZ")}</meta>
</metadata><manifest>{''.join(manifest)}</manifest><spine>{''.join(spine)}</spine></package>
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


def validate(path: Path) -> None:
    if path.stat().st_size >= MAX_BYTES:
        raise ValueError(f"EPUB exceeds 100 MiB: {path.name}")
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        if not infos or infos[0].filename != "mimetype" or infos[0].compress_type != zipfile.ZIP_STORED:
            raise ValueError("Invalid EPUB mimetype placement/compression")
        if archive.read("mimetype") != MIMETYPE:
            raise ValueError("Invalid EPUB mimetype")
        names = {x.filename for x in infos}
        required = {"META-INF/container.xml", "EPUB/package.opf", "EPUB/text/nav.xhtml", "EPUB/text/afterword.xhtml"}
        if required - names:
            raise ValueError(f"Missing EPUB files: {sorted(required - names)}")
        for name in names:
            if name.endswith((".xml", ".opf", ".xhtml")):
                ET.fromstring(archive.read(name))
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


def build(book: dict, afterword: dict, locale: str, modified: datetime, destination: Path, require_epubcheck: bool) -> None:
    config = LOCALES[locale]
    edition = read_json(BOOK_DIR / book["editions"][locale])
    check_release(book, edition, afterword, locale)
    illustration_assets = {x["id"]: x for x in book["illustrations"]}

    with tempfile.TemporaryDirectory(dir=TMP_DIR) as temp:
        stage = Path(temp)
        write(stage / "META-INF/container.xml", CONTAINER)
        write(stage / "EPUB/styles/book.css", CSS)
        images = [("cover-image", "images/cover.jpg", True)]
        optimize(BOOK_DIR / safe_path(book["cover"]["src"]), stage / "EPUB/images/cover.jpg")

        image_href = {}
        for number, asset in enumerate(book["illustrations"], 1):
            name = f"illustration-{number:02d}.jpg"
            optimize(BOOK_DIR / safe_path(asset["src"]), stage / "EPUB/images" / name)
            image_href[asset["id"]] = f"../images/{name}"
            images.append((f"image-{number:02d}", f"images/{name}", False))

        labels = book["labels"][locale]
        title = f'{labels["series"]}: {labels["volume"]}'
        write(
            stage / "EPUB/text/cover.xhtml",
            xml_doc(locale, title, '<main class="cover-page"><img src="../images/cover.jpg" alt=""/></main>'),
        )
        title_body = (
            f'<main class="title-page"><p class="world">{html.escape(labels["world"])}</p>'
            f'<p class="series">{html.escape(labels["series"])}</p>'
            f'<h1 class="volume">{html.escape(labels["volume"])}</h1>'
            f'<p>{html.escape(config["edition"])}</p>'
            f'<p class="website"><a href="{config["website"]}">The Library - Telanas</a></p></main>'
        )
        write(stage / "EPUB/text/title.xhtml", xml_doc(locale, title, title_body))

        chapter_labels = {c["id"]: c["labels"][locale] for c in book["chapters"]}
        for chapter in edition["chapters"]:
            cid, label = chapter["id"], chapter_labels[chapter["id"]]
            lead = [b for b in chapter["blocks"] if b["type"] == "illustration"]
            if len(lead) != 1 or lead[0].get("placement") != "before-title":
                raise ValueError(f"{locale} {cid}: expected one before-title illustration")
            asset_id = lead[0]["asset"]
            if asset_id not in illustration_assets or asset_id not in image_href:
                raise ValueError(f"Unknown illustration: {asset_id}")
            alt = html.escape(lead[0].get("alt", ""), quote=True)
            illustration = f'<main class="illustration"><img src="{image_href[asset_id]}" alt="{alt}"/></main>'
            write(stage / f"EPUB/text/illustration-{cid}.xhtml", xml_doc(locale, label, illustration))
            write(stage / f"EPUB/text/chapter-{cid}.xhtml", xml_doc(locale, label, chapter_html(chapter, label)))

        write(
            stage / "EPUB/text/afterword.xhtml",
            xml_doc(locale, afterword["locales"][locale]["heading"], afterword_html(locale, afterword, config["website"])),
        )
        explore = (
            f'<main class="back-matter"><h1>{html.escape(config["explore"])}</h1>'
            f'<p>{html.escape(config["explore_text"])}</p>'
            f'<p class="website-link"><a href="{config["website"]}">The Library - Telanas</a></p></main>'
        )
        write(stage / "EPUB/text/explore.xhtml", xml_doc(locale, config["explore"], explore))
        write(stage / "EPUB/text/nav.xhtml", nav_html(locale, config, book, afterword))
        write(stage / "EPUB/package.opf", package_xml(locale, book, modified, images))
        make_epub(stage, destination, modified)

    validate(destination)
    run_epubcheck(destination, require_epubcheck)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-epubcheck", action="store_true")
    args = parser.parse_args()
    book = read_json(BOOK_DIR / "book.json")
    afterword = read_json(BOOK_DIR / "afterword.json")
    if set(book.get("locales", [])) != set(LOCALES):
        raise ValueError("EPUB locales must match released book locales")
    modified = modified_time()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    staged = []
    try:
        for locale, config in LOCALES.items():
            temp = TMP_DIR / f'.{config["filename"]}.tmp'
            final = OUTPUT_DIR / config["filename"]
            build(book, afterword, locale, modified, temp, args.require_epubcheck)
            staged.append((temp, final))
        for temp, final in staged:
            os.replace(temp, final)
            print(f"Built {final.relative_to(ROOT)}")
    finally:
        for temp, _ in staged:
            temp.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
