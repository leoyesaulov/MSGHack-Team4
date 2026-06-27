"""Generate a formal Bürgerantrag PDF using reportlab."""
import io
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY


def generate_buergerantrag_pdf(
    title: str,
    summary: str,
    formal_text: str,
    author_name: str,
    gemeinde: str,
    location_name: str,
    date_str: str | None = None,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()
    brand = colors.HexColor("#2563eb")

    heading1 = ParagraphStyle("h1", parent=styles["Normal"],
        fontSize=18, fontName="Helvetica-Bold", textColor=brand,
        spaceAfter=6, leading=22)
    heading2 = ParagraphStyle("h2", parent=styles["Normal"],
        fontSize=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e40af"),
        spaceBefore=14, spaceAfter=4)
    body = ParagraphStyle("body", parent=styles["Normal"],
        fontSize=10, leading=16, alignment=TA_JUSTIFY, spaceAfter=8)
    meta = ParagraphStyle("meta", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#6b7280"), spaceAfter=3)
    label = ParagraphStyle("label", parent=styles["Normal"],
        fontSize=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#374151"))

    today = date_str or date.today().strftime("%d.%m.%Y")
    story = []

    # Header bar
    story.append(Paragraph("BÜRGERANTRAG", ParagraphStyle("top", parent=styles["Normal"],
        fontSize=9, fontName="Helvetica-Bold", textColor=colors.white,
        backColor=brand, alignment=TA_CENTER, spaceBefore=0, spaceAfter=0,
        borderPad=6)))
    story.append(Spacer(1, 0.4 * cm))

    # Title
    story.append(Paragraph(title, heading1))
    story.append(HRFlowable(width="100%", thickness=2, color=brand, spaceAfter=10))

    # Metadata table
    meta_data = [
        [Paragraph("Eingereicht von:", label), Paragraph(author_name, meta),
         Paragraph("Datum:", label), Paragraph(today, meta)],
        [Paragraph("Gemeinde:", label), Paragraph(gemeinde or "—", meta),
         Paragraph("Standort:", label), Paragraph(location_name or "—", meta)],
    ]
    meta_table = Table(meta_data, colWidths=[3 * cm, 7 * cm, 2.5 * cm, 4.5 * cm])
    meta_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=12))

    # Summary
    story.append(Paragraph("Zusammenfassung", heading2))
    for para in summary.split("\n\n"):
        para = para.strip()
        if para:
            story.append(Paragraph(para.replace("\n", " "), body))

    story.append(Spacer(1, 0.2 * cm))

    # Formal text
    story.append(Paragraph("Antrag", heading2))
    for para in formal_text.split("\n\n"):
        para = para.strip()
        if not para:
            continue
        if para.startswith("## "):
            story.append(Paragraph(para[3:], heading2))
        elif para.startswith("# "):
            story.append(Paragraph(para[2:], heading2))
        else:
            story.append(Paragraph(para.replace("\n", " "), body))

    story.append(Spacer(1, 1.5 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=20))

    # Signature block
    sig_data = [
        [Paragraph("Unterschrift:", label), Paragraph("Ort, Datum:", label)],
        [Paragraph("_" * 35, meta), Paragraph("_" * 35, meta)],
        [Paragraph(author_name, meta), Paragraph(f"{gemeinde or ''}, {today}", meta)],
    ]
    sig_table = Table(sig_data, colWidths=[8.5 * cm, 8.5 * cm])
    sig_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(sig_table)

    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph(
        "Dieses Dokument wurde mit CityVoice erstellt · cityvoice.app",
        ParagraphStyle("footer", parent=styles["Normal"],
            fontSize=7, textColor=colors.HexColor("#9ca3af"), alignment=TA_CENTER)
    ))

    doc.build(story)
    return buf.getvalue()
