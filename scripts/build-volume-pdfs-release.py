#!/usr/bin/env python3
"""Build the released Volume 1 PDFs with shared localized back matter."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm


ROOT = Path(__file__).resolve().parents[1]
CORE_BUILDER = ROOT / "scripts/build-volume-pdfs.py"
BOOK_DIR = ROOT / "content/worlds/telanas/books/dragon-knight/volume-01"


def load_core_builder():
    spec = importlib.util.spec_from_file_location("telanas_pdf_core", CORE_BUILDER)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the core PDF builder")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


pdf = load_core_builder()
base_build_story = pdf.build_story


class AfterwordStart(pdf.ActionFlowable):
    def __init__(self, label: str):
        super().__init__()
        self.label = label

    def apply(self, document):
        document.current_chapter_label = self.label
        document.canv.bookmarkPage("afterword")
        document.canv.addOutlineEntry(self.label, "afterword", level=0, closed=False)
        document.notify("TOCEntry", (0, self.label, document.page, "afterword"))


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
    source = (BOOK_DIR / relative).resolve()
    if source.parent != BOOK_DIR.resolve() or not source.is_file():
        raise ValueError("Afterword source must be a file inside the book directory")
    payload = pdf.read_json(source)
    expected = {
        "world": book.get("world"),
        "story": book.get("story"),
        "book": book.get("id"),
        "id": definition.get("id"),
        "type": definition.get("type"),
        "state": book.get("state"),
        "contentMode": book.get("contentMode"),
    }
    for field, value in expected.items():
        if payload.get(field) != value:
            raise ValueError(f"Afterword {field} does not match the book manifest")
    return payload


def afterword_flowables(book: dict, locale: str, styles: dict) -> list:
    definition = afterword_definition(book)
    payload = load_back_matter(book, definition)
    if payload.get("state") != "published" or payload.get("contentMode") != "released":
        raise ValueError("Afterword is not released publication content")

    data = payload.get("locales", {}).get(locale)
    if not isinstance(data, dict):
        raise ValueError(f"Missing {locale} afterword")

    heading = definition.get("labels", {}).get(locale)
    blocks = data.get("blocks")
    if not isinstance(heading, str) or not heading.strip():
        raise ValueError(f"Missing {locale} afterword label")
    if not isinstance(blocks, list) or not blocks:
        raise ValueError(f"Invalid {locale} afterword blocks")

    body = ParagraphStyle(
        f"AfterwordBody-{locale}",
        parent=styles["body_first"],
        firstLineIndent=0,
        spaceAfter=3.2 * mm,
    )
    link_style = ParagraphStyle(
        f"AfterwordLink-{locale}",
        parent=body,
        alignment=pdf.TA_CENTER,
        spaceBefore=1.5 * mm,
        spaceAfter=5 * mm,
    )
    signature_style = ParagraphStyle(
        f"AfterwordSignature-{locale}",
        parent=body,
        alignment=TA_RIGHT,
        fontName=pdf.SERIF,
        spaceBefore=4 * mm,
    )

    result = [
        pdf.NextPageTemplate("Body"),
        pdf.PageBreak(),
        AfterwordStart(heading),
        pdf.Spacer(1, 11 * mm),
        pdf.Paragraph(escape(heading), styles["contents_heading"]),
    ]

    for block in blocks:
        block_type = block.get("type")
        if block_type == "paragraph":
            text = block.get("text")
            if not isinstance(text, str) or not text.strip():
                raise ValueError(f"Invalid {locale} afterword paragraph")
            result.append(pdf.Paragraph(escape(text), body))
        elif block_type == "link":
            label = block.get("label")
            url = block.get("url")
            if not all(isinstance(item, str) and item.strip() for item in (label, url)):
                raise ValueError(f"Invalid {locale} afterword link")
            link_markup = f"<link href={quoteattr(url)}><b>{escape(label)}</b></link>"
            result.append(pdf.Paragraph(link_markup, link_style))
        elif block_type == "signature":
            text = block.get("text")
            if not isinstance(text, str) or not text.strip():
                raise ValueError(f"Invalid {locale} afterword signature")
            result.append(pdf.Paragraph(escape(text), signature_style))
        else:
            raise ValueError(f"Unsupported {locale} afterword block type: {block_type}")
    return result


def build_story_with_afterword(book: dict, edition: dict, locale: str, labels: dict, styles: dict) -> list:
    story = base_build_story(book, edition, locale, labels, styles)
    story.extend(afterword_flowables(book, locale, styles))
    return story


pdf.build_story = build_story_with_afterword


if __name__ == "__main__":
    pdf.main()
