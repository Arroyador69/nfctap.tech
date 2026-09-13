#!/usr/bin/env python3
"""JPG presupuesto redes: 4 packs, Barrio ya es servicio completo."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "NFCTap-presupuesto-redes.jpg"
BG, INK, MUTED, GOLD, DARK = (243, 238, 228), (28, 25, 21), (111, 103, 92), (196, 154, 60), (20, 20, 22)
CREAM, TOP = (255, 253, 248), (42, 35, 24)


def fnt(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(Path("/System/Library/Fonts/Supplemental") / name), size)


def main() -> None:
    w, h = 1080, 2100
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    display = fnt("Georgia Bold.ttf", 44)
    body = fnt("Georgia.ttf", 22)
    small = fnt("Georgia.ttf", 20)
    tiny = fnt("Georgia.ttf", 15)
    price = fnt("Georgia Bold.ttf", 36)

    d.text((56, 44), "NFCTAP.TECH  ·  LOCALES", font=tiny, fill=GOLD)
    d.text((56, 84), "Cuatro packs. Cuatro redes.", font=display, fill=INK)
    d.text((56, 140), "Barrio ya es el servicio completo.", font=display, fill=INK)
    d.text((56, 208), "Instagram · TikTok · Facebook · YouTube", font=small, fill=MUTED)
    d.text((56, 244), "100 % local: caras nuevas de la zona.", font=small, fill=MUTED)

    packs = [
        {
            "tag": "EL ECONÓMICO  ·  SERVICIO COMPLETO",
            "name": "Barrio   150 €/mes + IVA",
            "dark": False,
            "top": False,
            "lines": [
                "10 vídeos · 15 fotos · 16 stories · 4 redes",
                "12.000–28.000 visualizaciones / mes",
                "250–600 visitas a perfiles",
            ],
        },
        {
            "tag": "EL QUE MÁS SE PIDE",
            "name": "Calle   450 €/mes + IVA",
            "dark": True,
            "top": False,
            "lines": [
                "16 vídeos · 24 fotos · 24 stories · 4 redes",
                "20.000–45.000 visualizaciones / mes",
                "400–900 visitas a perfiles",
            ],
        },
        {
            "tag": "MÁS VOLUMEN",
            "name": "Plaza   590 €/mes + IVA",
            "dark": False,
            "top": False,
            "lines": [
                "24 vídeos · 32 fotos · 32 stories · 4 redes",
                "30.000–70.000 visualizaciones / mes",
                "600–1.400 visitas a perfiles",
            ],
        },
        {
            "tag": "EL TOP",
            "name": "Faro   790 €/mes + IVA",
            "dark": False,
            "top": True,
            "lines": [
                "32 vídeos · 40 fotos · 40 stories · 1 YouTube largo",
                "50.000–100.000 visualizaciones / mes",
                "900–2.000 visitas a perfiles",
            ],
        },
    ]
    y = 300
    for p in packs:
        box_h = 380
        fill = TOP if p["top"] else (DARK if p["dark"] else CREAM)
        d.rounded_rectangle((56, y, 1024, y + box_h), 22, fill=fill)
        ink = (246, 241, 231) if (p["dark"] or p["top"]) else INK
        dim = (213, 203, 184) if (p["dark"] or p["top"]) else MUTED
        d.text((88, y + 24), p["tag"], font=tiny, fill=(226, 180, 58))
        d.text((88, y + 64), p["name"], font=price, fill=ink)
        yy = y + 150
        for i, line in enumerate(p["lines"]):
            col = dim if i else ink
            d.text((88, yy), "·  " + line, font=body, fill=col)
            yy += 56
        y += box_h + 18

    d.text((56, 1888), "Estimación orgánica para locales. No es un compromiso.", font=small, fill=MUTED)
    d.text((56, 1924), "Sin anuncios de pago. Mes a mes, sin permanencia.", font=small, fill=MUTED)
    d.text((56, 1990), "contacto@nfctap.tech  ·  válido 30 días", font=tiny, fill=INK)
    img.save(OUT, "JPEG", quality=92, optimize=True)
    print(f"OK  {OUT}")


if __name__ == "__main__":
    main()
