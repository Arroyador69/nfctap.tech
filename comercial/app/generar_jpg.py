#!/usr/bin/env python3
"""JPG presupuesto app: App / App Negocio / App Marca + cuota mensual."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "NFCTap-presupuesto-app.jpg"
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

    d.text((56, 40), "NFCTAP.TECH  ·  APP ANDROID + IPHONE", font=tiny, fill=GOLD)
    d.text((56, 78), "Tu app en las dos tiendas.", font=display, fill=INK)
    d.text((56, 132), "Tres opciones. Mantenimiento mes a mes.", font=display, fill=INK)
    d.text((56, 198), "Android · iPhone · login · push · IVA aparte", font=small, fill=MUTED)
    d.text((56, 232), "Alta única + cuota mensual de hosting y mantenimiento", font=small, fill=MUTED)

    packs = [
        {
            "tag": "EL QUE MÁS SE PIDE  ·  ANDROID + IPHONE",
            "name": "App   699 € + IVA",
            "dark": True,
            "top": False,
            "lines": [
                "29 €/mes · hosting + mantenimiento",
                "Login · pantallas de tu negocio · push",
                "Publicación guiada en Play y App Store",
            ],
        },
        {
            "tag": "PARA VENDER Y RESERVAR",
            "name": "App Negocio   990 € + IVA",
            "dark": False,
            "top": False,
            "lines": [
                "35 €/mes · hosting + mantenimiento",
                "Todo App + panel + reservas / catálogo",
                "Pagos · push avanzado · estadísticas",
            ],
        },
        {
            "tag": "EL COMPLETO",
            "name": "App Marca   1.290 € + IVA",
            "dark": False,
            "top": True,
            "lines": [
                "45 €/mes · hosting + mantenimiento",
                "Todo App Negocio + diseño premium",
                "Integraciones · más flujos · prioridad",
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

    d.text((56, 1880), "Cuota mensual: servidor, SSL, copias y mantenimiento.", font=small, fill=MUTED)
    d.text((56, 1920), "Tasas Apple/Google las paga el cliente a las tiendas.", font=small, fill=MUTED)
    d.text((56, 1960), "IVA no incluido. Mes a mes. Válido 30 días.", font=small, fill=MUTED)
    d.text((56, 2040), "contacto@nfctap.tech", font=tiny, fill=INK)
    img.save(OUT, "JPEG", quality=92, optimize=True)
    print(f"OK  {OUT}")


if __name__ == "__main__":
    main()
