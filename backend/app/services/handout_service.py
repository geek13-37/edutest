"""PDF со списком логинов/паролей: карточки для распечатки и раздачи ученикам.

Сетка 2x3 - 6 карточек на лист A4, без полей по краям. Лист режется по
пунктирным линиям (одна вертикальная по центру, две горизонтальные на треть
и две трети высоты). На каждой карточке QR-код на страницу входа, логин, пароль.
Печатается сразу после создания учеников или сброса пароля, пока пароль
известен в открытом виде.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

import segno
from fpdf import FPDF

_ASSETS = Path(__file__).resolve().parent.parent / "assets"
_FONT_REGULAR = _ASSETS / "DejaVuSans.ttf"
_FONT_BOLD = _ASSETS / "DejaVuSans-Bold.ttf"

_COLS = 2
_ROWS = 3
_PER_PAGE = _COLS * _ROWS  # 6 карточек на лист A4
_QR = 24  # сторона QR-кода, мм
_PAD = 7  # внутреннее поле карточки, мм


def _qr_png(data: str) -> bytes:
    buf = BytesIO()
    segno.make(data, error="m").save(
        buf, kind="png", scale=8, border=0, dark="#1a1a1a", light="#ffffff"
    )
    return buf.getvalue()


def _fit(pdf: FPDF, text: str, max_w: float, start_size: float, min_size: float = 8.0) -> float:
    size = start_size
    while size > min_size:
        pdf.set_font("DejaVu", "B", size)
        if pdf.get_string_width(text) <= max_w:
            return size
        size -= 0.5
    pdf.set_font("DejaVu", "B", size)
    return size


def _ellipsize(pdf: FPDF, text: str, max_w: float) -> str:
    while pdf.get_string_width(text) > max_w and len(text) > 4:
        text = text[:-2] + "…"
    return text


def build_handouts_pdf(
    *,
    class_name: str,
    school_name: str | None,
    login_url: str,
    items: list[dict],
) -> BytesIO:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.add_font("DejaVu", "", str(_FONT_REGULAR))
    pdf.add_font("DejaVu", "B", str(_FONT_BOLD))

    page_w, page_h = 210.0, 297.0
    card_w = page_w / _COLS  # 105
    card_h = page_h / _ROWS  # 99
    text_w = card_w - 2 * _PAD - _QR - 3
    qr_png = _qr_png(login_url)

    def cut_guides() -> None:
        pdf.set_draw_color(160, 160, 160)
        pdf.set_line_width(0.2)
        pdf.set_dash_pattern(dash=2, gap=2)
        for c in range(1, _COLS):
            pdf.line(c * card_w, 0, c * card_w, page_h)
        for r in range(1, _ROWS):
            pdf.line(0, r * card_h, page_w, r * card_h)
        pdf.set_dash_pattern()

    for idx, item in enumerate(items):
        slot = idx % _PER_PAGE
        if slot == 0:
            pdf.add_page()
            cut_guides()

        col = slot % _COLS
        row = slot // _COLS
        x0 = col * card_w
        y0 = row * card_h
        inner_x = x0 + _PAD
        cursor = y0 + _PAD

        # шапка: класс и школа
        header = class_name + (f"  ·  {school_name}" if school_name else "")
        pdf.set_font("DejaVu", "", 8)
        pdf.set_text_color(135, 135, 135)
        pdf.set_xy(inner_x, cursor)
        pdf.cell(text_w, 4, _ellipsize(pdf, header, text_w), new_x="LMARGIN", new_y="NEXT")
        cursor += 7

        # ФИО
        name = " ".join(item["full_name"].split())
        _fit(pdf, name, text_w, 13.0)
        name = _ellipsize(pdf, name, text_w)
        pdf.set_text_color(20, 20, 20)
        pdf.set_xy(inner_x, cursor)
        pdf.cell(text_w, 6, name, new_x="LMARGIN", new_y="NEXT")
        cursor += 11

        # логин / пароль
        for label, value in (("Логин", item["username"]), ("Пароль", item["password"])):
            pdf.set_font("DejaVu", "", 8)
            pdf.set_text_color(135, 135, 135)
            pdf.set_xy(inner_x, cursor)
            pdf.cell(text_w, 3.5, label, new_x="LMARGIN", new_y="NEXT")
            val_size = _fit(pdf, value, text_w, 13.0)
            pdf.set_font("DejaVu", "B", val_size)
            pdf.set_text_color(20, 20, 20)
            pdf.set_xy(inner_x, cursor + 4)
            pdf.cell(text_w, 6, value, new_x="LMARGIN", new_y="NEXT")
            cursor += 13

        # QR справа
        qr_x = x0 + card_w - _PAD - _QR
        qr_y = y0 + _PAD + 2
        pdf.image(BytesIO(qr_png), x=qr_x, y=qr_y, w=_QR, h=_QR)
        pdf.set_font("DejaVu", "", 6)
        pdf.set_text_color(150, 150, 150)
        pdf.set_xy(qr_x - 6, qr_y + _QR + 2.5)
        pdf.cell(_QR + 12, 3, "камера телефона", align="C")

        # инструкция и ссылка, сразу под паролем
        pdf.set_font("DejaVu", "", 7.5)
        pdf.set_text_color(95, 95, 95)
        pdf.set_xy(inner_x, cursor + 3)
        pdf.multi_cell(
            card_w - 2 * _PAD,
            4,
            f"Зайди на {login_url} или наведи камеру телефона на QR-код, "
            "введи логин и пароль.",
        )

    if not items:
        pdf.add_page()

    out = BytesIO(pdf.output())
    out.seek(0)
    return out
