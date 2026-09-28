#!/usr/bin/env python3
"""JPG presupuesto web: Vitrina / Negocio / Marca + cuota mensual."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "NFCTap-presupuesto-web.jpg"
BG, INK, MUTED, GOLD, DARK = (243, 238, 228), (28, 25, 21), (111, 103, 92), (196, 154, 60), (20, 20, 22)
CREAM, TOP = (255, 253, 248), (42, 35, 24)


def fnt(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(Path("/System/Library/Fonts/Supplemental") / name), size)


def main() -> None:
    w, h = 1080, 2280
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    display = fnt("Georgia Bold.ttf", 42)
    body = fnt("Georgia.ttf", 21)
    small = fnt("Georgia.ttf", 20)
    tiny = fnt("Georgia.ttf", 15)
    price = fnt("Georgia Bold.ttf", 34)

    d.text((56, 40), "NFCTAP.TECH  ·  WEB PARA NEGOCIOS", font=tiny, fill=GOLD)
    d.text((56, 78), "Tu web, lista para vender.", font=display, fill=INK)
    d.text((56, 132), "Tres opciones. Hosting mes a mes.", font=display, fill=INK)
    d.text((56, 198), "Responsive · login · tu dominio · SSL · IVA aparte", font=small, fill=MUTED)
    d.text((56, 232), "Alta única + cuota mensual de hosting y mantenimiento", font=small, fill=MUTED)

    packs = [
        {
            "tag": "ENTRADA  ·  CON LOGIN",
            "name": "Vitrina   300 € + IVA",
            "dark": False,
            "top": False,
            "lines": [
                "29 €/mes · hosting + mantenimiento",
                "Web responsive · login · hasta 5 páginas",
                "Contacto · WhatsApp · dominio y SSL",
            ],
        },
        {
            "tag": "EL QUE MÁS SE PIDE",
            "name": "Negocio   550 € + IVA",
            "dark": True,
            "top": False,
            "lines": [
                "35 €/mes · hosting + mantenimiento",
                "Todo Vitrina + panel + hasta 10 páginas",
                "SEO local · blog · estadísticas",
            ],
        },
        {
            "tag": "EL COMPLETO",
            "name": "Marca   790 € + IVA",
            "dark": False,
            "top": True,
            "lines": [
                "39 €/mes · hosting + mantenimiento",
                "Todo Negocio + reservas / catálogo / pagos",
                "SEO ampliado · formación · prioridad soporte",
            ],
        },
    ]
    y = 290
    for p in packs:
        box_h = 420
        fill = TOP if p["top"] else (DARK if p["dark"] else CREAM)
        d.rounded_rectangle((56, y, 1024, y + box_h), 22, fill=fill)
        ink = (246, 241, 231) if (p["dark"] or p["top"]) else INK
        dim = (213, 203, 184) if (p["dark"] or p["top"]) else MUTED
        d.text((88, y + 28), p["tag"], font=tiny, fill=(226, 180, 58))
        d.text((88, y + 72), p["name"], font=price, fill=ink)
        yy = y + 160
        for i, line in enumerate(p["lines"]):
            col = dim if i else ink
            d.text((88, yy), "·  " + line, font=body, fill=col)
            yy += 58
        y += box_h + 18

    d.text((56, 1880), "Cuota mensual: hosting, SSL, copias y mantenimiento.", font=small, fill=MUTED)
    d.text((56, 1920), "Mes a mes. Dominio anual aparte si no lo tienes.", font=small, fill=MUTED)
    d.text((56, 1960), "IVA no incluido. Válido 30 días.", font=small, fill=MUTED)
    d.text((56, 2040), "contacto@nfctap.tech", font=tiny, fill=INK)
    img.save(OUT, "JPEG", quality=92, optimize=True)
    print(f"OK  {OUT}")


if __name__ == "__main__":
    main()
