#!/usr/bin/env python3
"""JPG presupuesto redes: 4 packs, 1 vídeo/día ~22 s, 5 €/vídeo en Barrio."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "NFCTap-presupuesto-redes.jpg"
BG, INK, MUTED, GOLD, DARK = (243, 238, 228), (28, 25, 21), (111, 103, 92), (196, 154, 60), (20, 20, 22)
CREAM, TOP = (255, 253, 248), (42, 35, 24)


def fnt(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(Path("/System/Library/Fonts/Supplemental") / name), size)


def main() -> None:
    w, h = 1080, 2480
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    display = fnt("Georgia Bold.ttf", 42)
    body = fnt("Georgia.ttf", 21)
    small = fnt("Georgia.ttf", 20)
    tiny = fnt("Georgia.ttf", 15)
    price = fnt("Georgia Bold.ttf", 34)

    d.text((56, 40), "NFCTAP.TECH  ·  NEGOCIOS QUE VENDEN", font=tiny, fill=GOLD)
    d.text((56, 78), "Cuatro packs. Mismos vídeos.", font=display, fill=INK)
    d.text((56, 132), "Subes de servicio, no de cantidad.", font=display, fill=INK)
    d.text((56, 198), "1 vídeo/día · ~22 s · IG · TikTok · FB · YT Shorts", font=small, fill=MUTED)
    d.text((56, 232), "Estrategia 3 meses · IVA aparte", font=small, fill=MUTED)

    packs = [
        {
            "tag": "ENTRADA  ·  1 VÍDEO AL DÍA  ·  5 € / VÍDEO",
            "name": "Barrio   150 €/mes + IVA",
            "dark": False,
            "top": False,
            "lines": [
                "≈30 vídeos · 4 redes · textos + calendario",
                "Estrategia 3 meses · panel cliente",
                "25–55 mil visualizaciones · visitas a los vídeos",
            ],
        },
        {
            "tag": "EL QUE MÁS SE PIDE",
            "name": "Calle   450 €/mes + IVA",
            "dark": True,
            "top": False,
            "lines": [
                "Todo Barrio + DMs / WhatsApp automáticos",
                "Google local · stories + feed · revisión",
                "35–75 mil visualizaciones · visitas a los vídeos",
            ],
        },
        {
            "tag": "PERSONALIZADO  ·  CON TU CARA",
            "name": "Plaza   590 €/mes + IVA",
            "dark": False,
            "top": False,
            "lines": [
                "Todo Calle + guiones + grabación a cámara",
                "Sesión de grabación en tu negocio",
                "45–95 mil visualizaciones · visitas a los vídeos",
            ],
        },
        {
            "tag": "EL TOP  ·  MÁXIMA PRESENCIA",
            "name": "Faro   790 €/mes + IVA",
            "dark": False,
            "top": True,
            "lines": [
                "Todo Plaza + prioridad + más piezas de venta",
                "Acompañamiento cercano · ajustes mensuales",
                "55–120 mil visualizaciones · visitas a los vídeos",
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

    d.text((56, 2200), "Mismos ≈30 vídeos en todos. En Barrio, cada vídeo sale a 5 €.", font=small, fill=MUTED)
    d.text((56, 2240), "Estimación orgánica tras ~3 meses. No es un compromiso. Sin ads de pago.", font=small, fill=MUTED)
    d.text((56, 2280), "Mes a mes, sin permanencia. IVA no incluido.", font=small, fill=MUTED)
    d.text((56, 2350), "contacto@nfctap.tech  ·  válido 30 días", font=tiny, fill=INK)
    img.save(OUT, "JPEG", quality=92, optimize=True)
    print(f"OK  {OUT}")


if __name__ == "__main__":
    main()
