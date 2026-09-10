#!/usr/bin/env python3
"""Build the released English and German Volume 1 PDF editions."""

from __future__ import annotations

import json
import os
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfdoc import PDFString
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    ActionFlowable,
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = ROOT / "content/worlds/telanas/books/dragon-knight/volume-01"
OUTPUT_DIR = ROOT / "output/pdf"
TEMP_DIR = ROOT / "tmp/pdfs"
PAGE_WIDTH, PAGE_HEIGHT = A5

PAPER = colors.HexColor("#F2ECD8")
INK = colors.HexColor("#292622")
MUTED = colors.HexColor("#6D655D")
ACCENT = colors.HexColor("#927C86")
EDGE = colors.HexColor("#C9BDAA")

SERIF = "BookSerif"
SERIF_BOLD = "BookSerif-Bold"
SANS = "BookSans"
SANS_BOLD = "BookSans-Bold"
FONT_FILES = {
    SERIF: Path("/usr/share/fonts/google-noto/NotoSerif-Regular.ttf"),
    SERIF_BOLD: Path("/usr/share/fonts/google-noto/NotoSerif-Bold.ttf"),
    SANS: Path("/usr/share/fonts/google-noto/NotoSans-Regular.ttf"),
    SANS_BOLD: Path("/usr/share/fonts/google-noto/NotoSans-Bold.ttf"),
}

LOCALES = {
    "en": {
        "filename": "the-dragon-knight-volume-01-home-en.pdf",
        "cover_volume": "VOLUME ONE",
        "edition": "English edition",
        "website": "Read online at kamui2040.github.io/The-Library/en/telanas/",
        "url": "https://kamui2040.github.io/The-Library/en/telanas/",
    },
    "de": {
        "filename": "der-drachenritter-band-01-zuhause-de.pdf",
        "cover_volume": "BAND EINS",
        "edition": "Deutsche Ausgabe",
        "website": "Online lesen unter kamui2040.github.io/The-Library/de/telanas/",
        "url": "https://kamui2040.github.io/The-Library/de/telanas/",
    },
}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def register_fonts() -> None:
    missing = [str(path) for path in FONT_FILES.values() if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "The PDF build requires the Noto Serif and Noto Sans font families: "
            + ", ".join(missing)
        )
    for name, path in FONT_FILES.items():
        pdfmetrics.registerFont(TTFont(name, str(path)))


def publication_labels(book: dict, locale: str) -> dict[str, str]:
    labels = {**LOCALES[locale], **book["labels"][locale]}
    labels["series_upper"] = labels["series"].upper()
    labels["cover_title"] = labels["volume"].split("—", 1)[-1].strip().upper()
    return labels


def draw_tracking_text(canvas: Canvas, text: str, x: float, y: float, font: str, size: float, tracking: float) -> None:
    text_object = canvas.beginText()
    text_object.setTextOrigin(x, y)
    text_object.setFont(font, size)
    text_object.setCharSpace(tracking)
    text_width = canvas.stringWidth(text, font, size) + max(0, len(text) - 1) * tracking
    text_object.setTextOrigin(x - text_width / 2, y)
    text_object.textLine(text)
    canvas.drawText(text_object)


def draw_cover_image(canvas: Canvas, image_path: Path) -> None:
    image = ImageReader(str(image_path))
    image_width, image_height = image.getSize()
    scale = max(PAGE_WIDTH / image_width, PAGE_HEIGHT / image_height)
    width = image_width * scale
    height = image_height * scale
    canvas.drawImage(
        image,
        (PAGE_WIDTH - width) / 2,
        (PAGE_HEIGHT - height) / 2,
        width=width,
        height=height,
        preserveAspectRatio=True,
    )


class InvariantCanvas(Canvas):
    def __init__(self, *args, **kwargs):
        kwargs["invariant"] = 1
        kwargs["pageCompression"] = 1
        super().__init__(*args, **kwargs)


class FullPageFlowable(Flowable):
    def wrap(self, available_width, available_height):
        self.available_width = available_width
        self.available_height = available_height
        # Leave a sub-point tolerance so a preceding zero-height page action
        # does not push a full-page opener onto a second new page.
        return available_width, max(0, available_height - 0.1)


class CoverPage(FullPageFlowable):
    def __init__(self, image_path: Path, labels: dict):
        super().__init__()
        self.image_path = image_path
        self.labels = labels

    def draw(self):
        canvas = self.canv
        draw_cover_image(canvas, self.image_path)

        canvas.saveState()
        canvas.setFillColor(colors.black)
        canvas.setFillAlpha(0.52)
        canvas.rect(0, PAGE_HEIGHT - 53 * mm, PAGE_WIDTH, 53 * mm, fill=1, stroke=0)
        canvas.setFillAlpha(1)
        canvas.setFillColor(colors.HexColor("#F5F0E5"))
        draw_tracking_text(canvas, "TELANAS", PAGE_WIDTH / 2, PAGE_HEIGHT - 15 * mm, SANS, 8.5, 2.0)
        canvas.setFont(SERIF_BOLD, 23)
        canvas.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 28 * mm, self.labels["series_upper"])
        canvas.setStrokeColor(colors.HexColor("#C5ADB8"))
        canvas.setLineWidth(0.7)
        canvas.line(40 * mm, PAGE_HEIGHT - 34 * mm, PAGE_WIDTH - 40 * mm, PAGE_HEIGHT - 34 * mm)
        draw_tracking_text(canvas, self.labels["cover_volume"], PAGE_WIDTH / 2, PAGE_HEIGHT - 42 * mm, SANS, 8, 1.25)
        canvas.setFont(SERIF, 14)
        canvas.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 49 * mm, self.labels["cover_title"])
        canvas.restoreState()


class TitlePage(FullPageFlowable):
    def __init__(self, labels: dict):
        super().__init__()
        self.labels = labels

    def draw(self):
        canvas = self.canv
        width = self.available_width
        height = self.available_height
        canvas.saveState()
        canvas.setFillColor(MUTED)
        draw_tracking_text(canvas, "TELANAS", width / 2, height - 34 * mm, SANS, 8.5, 2.0)
        canvas.setFillColor(INK)
        canvas.setFont(SERIF, 19)
        canvas.drawCentredString(width / 2, height - 55 * mm, self.labels["series"])
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(0.8)
        canvas.line(width / 2 - 25 * mm, height - 63 * mm, width / 2 + 25 * mm, height - 63 * mm)
        canvas.setFont(SERIF_BOLD, 27)
        canvas.drawCentredString(width / 2, height - 80 * mm, self.labels["volume"])
        canvas.setFillColor(MUTED)
        canvas.setFont(SANS, 9)
        canvas.drawCentredString(width / 2, height - 91 * mm, self.labels["edition"])
        canvas.setFont(SANS, 7.5)
        canvas.drawCentredString(width / 2, 14 * mm, self.labels["website"])
        canvas.linkURL(self.labels["url"], (0, 10 * mm, width, 20 * mm), relative=1)
        canvas.restoreState()


class ChapterTitlePage(FullPageFlowable):
    def __init__(self, chapter_key: str, label: str):
        super().__init__()
        self.chapter_key = chapter_key
        self.label = label
        parts = label.split(" — ", 1)
        self.kicker = parts[0]
        self.title = parts[1] if len(parts) == 2 else parts[0]

    def draw(self):
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(MUTED)
        draw_tracking_text(canvas, self.kicker.upper(), PAGE_WIDTH / 2, PAGE_HEIGHT * 0.59, SANS, 8.5, 1.3)
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(0.75)
        canvas.line(PAGE_WIDTH / 2 - 24 * mm, PAGE_HEIGHT * 0.55, PAGE_WIDTH / 2 + 24 * mm, PAGE_HEIGHT * 0.55)
        canvas.setFillColor(INK)
        canvas.setFont(SERIF_BOLD, 25)
        canvas.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT * 0.47, self.title)
        canvas.restoreState()


class IllustrationPage(FullPageFlowable):
    def __init__(self, image_path: Path):
        super().__init__()
        self.image_path = image_path

    def draw(self):
        canvas = self.canv
        margin = 12 * mm
        available_width = PAGE_WIDTH - 2 * margin
        available_height = PAGE_HEIGHT - 2 * margin
        image = ImageReader(str(self.image_path))
        image_width, image_height = image.getSize()
        scale = min(available_width / image_width, available_height / image_height)
        width = image_width * scale
        height = image_height * scale
        x = (PAGE_WIDTH - width) / 2
        y = (PAGE_HEIGHT - height) / 2

        canvas.saveState()
        canvas.drawImage(image, x, y, width=width, height=height, preserveAspectRatio=True)
        canvas.setStrokeColor(EDGE)
        canvas.setLineWidth(0.6)
        canvas.rect(x, y, width, height, fill=0, stroke=1)
        canvas.restoreState()


class EnsureEvenPage(ActionFlowable):
    def __init__(self):
        super().__init__()

    def apply(self, document):
        if document.page % 2 == 1:
            document.handle_pageBreak()


class BookDocTemplate(BaseDocTemplate):
    def __init__(self, filename: Path, locale: str, labels: dict):
        super().__init__(
            str(filename),
            pagesize=A5,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=21 * mm,
            bottomMargin=20 * mm,
            title=f'{labels["series"]}: {labels["volume"]}',
            author="",
            subject=labels["edition"],
            creator="The Library",
        )
        self.locale = locale
        self.labels = labels
        self.current_chapter_label = labels["volume"]

        def frame(name: str, full_page: bool = False) -> Frame:
            if full_page:
                return Frame(0, 0, PAGE_WIDTH, PAGE_HEIGHT, id=name, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
            return Frame(
                self.leftMargin,
                self.bottomMargin,
                self.width,
                self.height,
                id=name,
                leftPadding=0,
                rightPadding=0,
                topPadding=0,
                bottomPadding=0,
            )

        self.addPageTemplates([
            PageTemplate(id="Cover", frames=[frame("cover", True)]),
            PageTemplate(id="Front", frames=[frame("front")], onPage=self.draw_paper),
            PageTemplate(id="ChapterTitle", frames=[frame("chapter-title", True)], onPage=self.draw_paper),
            PageTemplate(id="Illustration", frames=[frame("illustration", True)], onPage=self.draw_paper),
            PageTemplate(id="Body", frames=[frame("body")], onPage=self.draw_body_page),
        ])

    def beforeDocument(self):
        super().beforeDocument()
        self.canv.setTitle(f'{self.labels["series"]}: {self.labels["volume"]}')
        self.canv.setAuthor("")
        self.canv.setSubject(self.labels["edition"])
        self.canv.setCreator("The Library")
        self.canv._doc.Catalog.Lang = PDFString(self.locale)
        self.canv.showOutline()

    def afterFlowable(self, flowable):
        if not isinstance(flowable, ChapterTitlePage):
            return
        self.current_chapter_label = flowable.label
        self.canv.bookmarkPage(flowable.chapter_key)
        self.canv.addOutlineEntry(flowable.label, flowable.chapter_key, level=0, closed=False)
        self.notify("TOCEntry", (0, flowable.label, self.page, flowable.chapter_key))

    @staticmethod
    def draw_paper(canvas: Canvas, document):
        del document
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        canvas.restoreState()

    def draw_body_page(self, canvas: Canvas, document):
        self.draw_paper(canvas, document)
        page_number = canvas.getPageNumber()
        canvas.saveState()
        canvas.setFillColor(MUTED)
        canvas.setFont(SANS, 7.2)
        if page_number % 2 == 0:
            canvas.drawString(18 * mm, PAGE_HEIGHT - 11 * mm, self.labels["series_upper"])
        else:
            canvas.drawRightString(PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 11 * mm, self.current_chapter_label)
        canvas.setStrokeColor(EDGE)
        canvas.setLineWidth(0.35)
        canvas.line(18 * mm, PAGE_HEIGHT - 14 * mm, PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 14 * mm)
        canvas.drawCentredString(PAGE_WIDTH / 2, 10 * mm, str(page_number))
        canvas.restoreState()


def make_styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "contents_heading": ParagraphStyle(
            "ContentsHeading",
            parent=sample["Heading1"],
            fontName=SERIF_BOLD,
            fontSize=24,
            leading=29,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=12 * mm,
        ),
        "toc": ParagraphStyle(
            "TOCEntry",
            parent=sample["Normal"],
            fontName=SERIF,
            fontSize=10.5,
            leading=17,
            textColor=INK,
            leftIndent=0,
            firstLineIndent=0,
            spaceBefore=2.5 * mm,
        ),
        "body": ParagraphStyle(
            "BookBody",
            parent=sample["BodyText"],
            fontName=SERIF,
            fontSize=10.2,
            leading=14.2,
            textColor=INK,
            alignment=TA_LEFT,
            firstLineIndent=4 * mm,
            spaceAfter=0.6 * mm,
            allowWidows=0,
            allowOrphans=0,
            splitLongWords=1,
        ),
        "body_first": ParagraphStyle(
            "BookBodyFirst",
            parent=sample["BodyText"],
            fontName=SERIF,
            fontSize=10.2,
            leading=14.2,
            textColor=INK,
            alignment=TA_LEFT,
            firstLineIndent=0,
            spaceAfter=0.6 * mm,
            allowWidows=0,
            allowOrphans=0,
            splitLongWords=1,
        ),
        "scene": ParagraphStyle(
            "SceneBreak",
            parent=sample["Normal"],
            fontName=SERIF,
            fontSize=9,
            leading=11,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=3 * mm,
            spaceAfter=4 * mm,
        ),
    }


def validate_sources(book: dict, edition: dict, locale: str) -> None:
    if book.get("state") != "published" or book.get("contentMode") != "released":
        raise ValueError("The book manifest is not a released publication")
    if edition.get("state") != "published" or edition.get("contentMode") != "released":
        raise ValueError(f"The {locale} edition is not a released publication")
    if edition.get("locale") != locale:
        raise ValueError(f"Edition locale mismatch: expected {locale}")
    expected_chapters = [chapter["id"] for chapter in book["chapters"]]
    actual_chapters = [chapter["id"] for chapter in edition["chapters"]]
    if actual_chapters != expected_chapters:
        raise ValueError(f"Chapter order mismatch in {locale} edition")


def build_story(book: dict, edition: dict, locale: str, labels: dict[str, str], styles: dict[str, ParagraphStyle]) -> list:
    cover_path = BOOK_DIR / book["cover"]["src"]
    illustrations = {item["id"]: BOOK_DIR / item["src"] for item in book["illustrations"]}
    chapter_labels = {item["id"]: item["labels"][locale] for item in book["chapters"]}

    story = [
        CoverPage(cover_path, labels),
        NextPageTemplate("Front"),
        PageBreak(),
        TitlePage(labels),
        PageBreak(),
        Spacer(1, 19 * mm),
        Paragraph(escape(labels["contents"]), styles["contents_heading"]),
    ]

    contents = TableOfContents()
    contents.levelStyles = [styles["toc"]]
    contents.dotsMinLevel = 0
    story.append(contents)

    for chapter in edition["chapters"]:
        chapter_id = chapter["id"]
        chapter_label = chapter_labels[chapter_id]
        illustration_blocks = [block for block in chapter["blocks"] if block["type"] == "illustration"]
        if len(illustration_blocks) != 1:
            raise ValueError(f"{locale} chapter {chapter_id} must have exactly one lead illustration")
        illustration_block = illustration_blocks[0]
        if illustration_block.get("placement") != "before-title":
            raise ValueError(f"{locale} chapter {chapter_id} illustration must remain a chapter opener")
        try:
            illustration_path = illustrations[illustration_block["asset"]]
        except KeyError as error:
            raise ValueError(f"Unknown illustration {illustration_block.get('asset')} in {chapter_id}") from error

        story.extend([
            NextPageTemplate("ChapterTitle"),
            PageBreak(),
            EnsureEvenPage(),
            ChapterTitlePage(chapter_id, chapter_label),
            NextPageTemplate("Illustration"),
            PageBreak(),
            IllustrationPage(illustration_path),
            NextPageTemplate("Body"),
            PageBreak(),
        ])

        first_paragraph = True
        after_scene_break = False
        for block in chapter["blocks"]:
            block_type = block["type"]
            if block_type == "illustration":
                continue
            if block_type == "scene-break":
                story.extend([
                    CondPageBreak(24 * mm),
                    Paragraph("* * *", styles["scene"]),
                ])
                after_scene_break = True
                continue
            if block_type != "paragraph":
                raise ValueError(f"Unsupported block type {block_type} in {chapter_id}")

            paragraph_style = styles["body_first"] if first_paragraph or after_scene_break else styles["body"]
            story.append(Paragraph(escape(block["text"]), paragraph_style))
            first_paragraph = False
            after_scene_break = False

    return story


def build_pdf(book: dict, locale: str, destination: Path) -> None:
    labels = publication_labels(book, locale)
    edition = read_json(BOOK_DIR / book["editions"][locale])
    validate_sources(book, edition, locale)
    styles = make_styles()
    document = BookDocTemplate(destination, locale, labels)
    document.multiBuild(build_story(book, edition, locale, labels, styles), canvasmaker=InvariantCanvas)


def main() -> None:
    register_fonts()
    book = read_json(BOOK_DIR / "book.json")
    if set(book.get("locales", [])) != set(LOCALES):
        raise ValueError("PDF locale configuration must match the released book locales")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    staged: list[tuple[Path, Path]] = []

    try:
        for locale, labels in LOCALES.items():
            temporary = TEMP_DIR / f'.{labels["filename"]}.tmp'
            final = OUTPUT_DIR / labels["filename"]
            build_pdf(book, locale, temporary)
            staged.append((temporary, final))

        for temporary, final in staged:
            os.replace(temporary, final)
            print(f"Built {final.relative_to(ROOT)}")
    finally:
        for temporary, _ in staged:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
