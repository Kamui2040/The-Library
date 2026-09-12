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
AFTERWORD_PATH = ROOT / "content/worlds/telanas/books/dragon-knight/volume-01/afterword.json"


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


def afterword_flowables(locale: str, styles: dict) -> list:
    payload = pdf.read_json(AFTERWORD_PATH)
    if payload.get("state") != "published" or payload.get("contentMode") != "released":
        raise ValueError("Afterword is not released publication content")

    data = payload.get("locales", {}).get(locale)
    if not isinstance(data, dict):
        raise ValueError(f"Missing {locale} afterword")

    heading = data.get("heading")
    paragraphs = data.get("paragraphs")
    closing = data.get("closingParagraphs")
    website_label = data.get("websiteLabel")
    website_url = data.get("websiteUrl")
    signature = data.get("signature")

    if not isinstance(heading, str) or not heading.strip():
        raise ValueError(f"Missing {locale} afterword heading")
    if not isinstance(paragraphs, list) or not all(isinstance(item, str) and item.strip() for item in paragraphs):
        raise ValueError(f"Invalid {locale} afterword paragraphs")
    if not isinstance(closing, list) or not all(isinstance(item, str) and item.strip() for item in closing):
        raise ValueError(f"Invalid {locale} afterword closing paragraphs")
    if not all(isinstance(item, str) and item.strip() for item in (website_label, website_url, signature)):
        raise ValueError(f"Incomplete {locale} afterword link or signature")

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

    for paragraph in paragraphs:
        result.append(pdf.Paragraph(escape(paragraph), body))

    link_markup = f"<link href={quoteattr(website_url)}><b>{escape(website_label)}</b></link>"
    result.append(pdf.Paragraph(link_markup, link_style))

    for paragraph in closing:
        result.append(pdf.Paragraph(escape(paragraph), body))

    result.append(pdf.Paragraph(escape(signature), signature_style))
    return result


def build_story_with_afterword(book: dict, edition: dict, locale: str, labels: dict, styles: dict) -> list:
    story = base_build_story(book, edition, locale, labels, styles)
    story.extend(afterword_flowables(locale, styles))
    return story


pdf.build_story = build_story_with_afterword


if __name__ == "__main__":
    pdf.main()
