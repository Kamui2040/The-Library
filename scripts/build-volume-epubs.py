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
except ImportError as error:  # pragma: no cover - environment gate
    raise SystemExit(
        "EPUB build requires Pillow for deterministic store-safe image derivatives. "
        "Install Pillow in the publication environment and run again."
    ) from error


ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = ROOT / "content/worlds/telanas/books/dragon-knight/volume-01"
OUTPUT_DIR = ROOT / "output/epub"
TMP_DIR = ROOT / "tmp/epubs"

EPUB_MIMETYPE = b"application/epub+zip"
MAX_EPUB_BYTES = 100 * 1024 * 1024
MAX_IMAGE_PIXELS = 5_600_000
MAX_IMAGE_SIZE = (1800, 2700)
JPEG_QUALITY = 85

LOCALES = {
    "en": {
        "filename": "the-dragon-knight-volume-01-home-en.epub",
        "edition": "English edition",
        "website_label": "Official Telanas website",
        "website_url": "https://kamui2040.github.io/The-Library/en/telanas/",
        "about_heading": "Explore Telanas",
        "about_text": (
            "Continue with the integrated reader, lexicon, illustrations, updates, "
            "and ways to support the project on the official Telanas website."
        ),
        "contents": "Contents",
    },
    "de": {
        "filename": "der-drachenritter-band-01-zuhause-de.epub",
        "edition": "Deutsche Ausgabe",
        "website_label": "Offizielle Telanas-Website",
        "website_url": "https://kamui2040.github.io/The-Library/de/telanas/",
        "about_heading": "Telanas entdecken",
        "about_text": (
            "Den integrierten Reader, das Lexikon, Illustrationen, Neuigkeiten und "
            "Möglichkeiten zur Unterstützung des Projekts findest du auf der offiziellen "
            "Telanas-Website."
        ),
        "contents": "Inhalt",
    },
}

CSS = """\
@charset "UTF-8";
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0 5%;
  font-family: serif;
  line-height: 1.45;
  color: #292622;
  background: transparent;
}
main { max-width: 42em; margin: 0 auto; }
h1, h2 { text-align: center; page-break-after: avoid; break-after: avoid-page; }
h1 { margin: 12vh 0 1.2em; font-size: 1.65em; }
h2 { margin: 2.5em 0 1em; font-size: 1.3em; }
p { margin: 0; text-indent: 1.25em; orphans: 2; widows: 2; }
p.first, p.after-break { text-indent: 0; }
.scene-break { margin: 1.6em 0; text-align: center; text-indent: 0; letter-spacing: 0.25em; }
.illustration { margin: 1.5em auto 2em; text-align: center; page-break-inside: avoid; break-inside: avoid-page; }
.illustration img { display: block; max-width: 100%; max-height: 92vh; width: auto; height: auto; margin: 0 auto; }
.cover-page { margin: 0; padding: 0; text-align: center; }
.cover-page img { display: block; width: 100%; height: auto; margin: 0 auto; }
.title-page { text-align: center; padding-top: 16vh; }
.title-page .world { margin: 0 0 1.3em; letter-spacing: 0.18em; text-transform: uppercase; }
.title-page .series { margin: 0; font-size: 1.55em; }
.title-page .volume { margin: 0.8em 0 0; font-size: 1.9em; }
.title-page .edition { margin-top: 1.5em; }
.title-page .website { margin-top: 18vh; }
.about { padding-top: 10vh; }
.about p { text-indent: 0; margin: 1em 0; }
a { color: inherit; }
nav ol { padding-left: 1.5em; }
nav li { margin: 0.55em 0; }
"""

CONTAINER_XML = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def require_released(book: dict, edition: dict, locale: str) -> None:
    if book.get("state") != "published" or book.get("contentMode") != "released":
        raise ValueError("Book manifest is not released publication content")
    if edition.get("state") != "published" or edition.get("contentMode") != "released":
        raise ValueError(f"{locale} edition is not released publication content")
    if edition.get("locale") != locale:
        raise ValueError(f"Edition locale mismatch: expected {locale}")
    expected = [chapter["id"] for chapter in book["chapters"]]
    actual = [chapter["id"] for chapter in edition["chapters"]]
    if actual != expected:
        raise ValueError(f"Chapter order mismatch in {locale} edition")


def source_modified() -> datetime:
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if epoch:
        return datetime.fromtimestamp(int(epoch), tz=timezone.utc).replace(microsecond=0)

    relative = BOOK_DIR.relative_to(ROOT)
    result = subprocess.run(
        ["git", "log", "-1", "--format=%cI", "--", str(relative)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    value = result.stdout.strip()
    if result.returncode != 0 or not value:
        raise RuntimeError(
            "Could not derive deterministic EPUB modification time. Build from the Git checkout "
            "or set SOURCE_DATE_EPOCH."
        )
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).replace(microsecond=0)


def epub_identifier(locale: str) -> str:
    value = uuid.uuid5(
        uuid.NAMESPACE_URL,
        f"https://kamui2040.github.io/The-Library/{locale}/telanas/#dragon-knight-volume-01",
    )
    return f"urn:uuid:{value}"


def safe_href(value: str) -> str:
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise ValueError(f"Unsafe EPUB path: {value}")
    return path.as_posix()


def xhtml_document(locale: str, title: str, body: str) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{locale}" lang="{locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/book.css" />
</head>
<body>
{body}
</body>
</html>
'''


def optimize_image(source: Path, destination: Path) -> tuple[int, int]:
    if not source.is_file():
        raise FileNotFoundError(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        if image.mode not in {"RGB", "L"}:
            background = Image.new("RGB", image.size, "white")
            if "A" in image.getbands():
                background.paste(image, mask=image.getchannel("A"))
                image = background
            else:
                image = image.convert("RGB")
        elif image.mode == "L":
            image = image.convert("RGB")

        image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
        width, height = image.size
        if width * height > MAX_IMAGE_PIXELS:
            ratio = (MAX_IMAGE_PIXELS / float(width * height)) ** 0.5
            width = max(1, int(width * ratio))
            height = max(1, int(height * ratio))
            image = image.resize((width, height), Image.Resampling.LANCZOS)

        image.save(
            destination,
            format="JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=False,
         )
        return image.size


