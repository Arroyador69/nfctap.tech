#!/usr/bin/env python3
"""PDF «Otros servicios» NFCTap: redes + piezas a medida. → public/otros-servicios.pdf"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "public" / "otros-servicios.pdf"
BG, INK, MUTED, GOLD, CREAM, DARK = (
    (243, 238, 228),
    (28, 25, 21),
    (111, 103, 92),
    (196, 154, 60),
    (255, 253, 248),
    (28, 25, 21),
)


def fnt(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(Path("/System/Library/Fonts/Supplemental") / name), size)


def new_page(w=1240, h=1754):
    img = Image.new("RGB", (w, h), BG)
    return img, ImageDraw.Draw(img)


def main() -> None:
    display = fnt("Georgia Bold.ttf", 44)
    h2 = fnt("Georgia Bold.ttf", 28)
    body = fnt("Georgia.ttf", 22)
    small = fnt("Georgia.ttf", 18)
    tiny = fnt("Georgia.ttf", 15)
    price = fnt("Georgia Bold.ttf", 32)

    pages: list[Image.Image] = []

    # —— Página 1: portada + packs redes ——
    img, d = new_page()
    w, _ = img.size
    d.text((64, 56), "NFCTAP.TECH  ·  OTROS SERVICIOS", font=tiny, fill=GOLD)
    d.text((64, 100), "Más allá del atril", font=display, fill=INK)
    d.text(
        (64, 168),
        "Redes para negocios, piezas a medida y packs a medida.\n"
        "Esto no se compra en la tienda online: escríbenos.",
        font=body,
        fill=MUTED,
    )
    d.text((64, 250), "contacto@nfctap.tech  ·  https://nfctap.tech", font=small, fill=INK)

    d.text((64, 320), "1 · Redes (Instagram · TikTok · Facebook · Shorts)", font=h2, fill=INK)
    d.text(
        (64, 368),
        "1 vídeo al día (~22 s) · estrategia 3 meses · IVA no incluido · sin permanencia",
        font=small,
        fill=MUTED,
    )

    packs = [
        ("Barrio", "150 €/mes", "Entrada", "≈30 vídeos · 4 redes · textos + calendario · panel"),
        ("Calle", "450 €/mes", "El más pedido", "Barrio + DMs/WhatsApp · Google local · stories + feed"),
        ("Plaza", "590 €/mes", "Con tu cara", "Calle + guiones · grabación en tu negocio"),
        ("Faro", "790 €/mes", "Máxima presencia", "Plaza + prioridad · más piezas de venta · ajustes mensuales"),
    ]
    y = 420
    for name, amount, tag, blurb in packs:
        d.rounded_rectangle((64, y, w - 64, y + 118), radius=18, fill=CREAM, outline=(230, 221, 208))
        d.text((88, y + 18), tag.upper(), font=tiny, fill=GOLD)
        d.text((88, y + 42), f"{name}   {amount}", font=price, fill=INK)
        d.text((88, y + 82), blurb, font=small, fill=MUTED)
        y += 134

    d.text(
        (64, y + 20),
        "Estimaciones orgánicas orientativas. Anuncios de pago aparte. Mes a mes.",
        font=tiny,
        fill=MUTED,
    )
    pages.append(img)

    # —— Página 2: a medida ——
    img, d = new_page()
    d.text((64, 56), "NFCTAP.TECH  ·  OTROS SERVICIOS", font=tiny, fill=GOLD)
    d.text((64, 100), "2 · Piezas a medida", font=display, fill=INK)
    d.text(
        (64, 170),
        "Llaveros NFC, placas, expositores, botones y packs de evento.\n"
        "Te diseñamos la idea, te mandamos mockup 3D / JPG y la imprimimos en España.",
        font=body,
        fill=MUTED,
    )

    items = [
        "Llaveros y colgantes NFC con tu marca",
        "Placas y carteles de mostrador",
        "Expositores y stands de marca",
        "Packs evento / feria",
        "Cualquier pieza NFC que no esté en la tienda",
    ]
    y = 300
    for line in items:
        d.ellipse((72, y + 8, 84, y + 20), fill=GOLD)
        d.text((100, y), line, font=body, fill=INK)
        y += 48

    d.rounded_rectangle((64, y + 20, w - 64, y + 200), radius=20, fill=DARK)
    d.text((92, y + 48), "Cómo va", font=h2, fill=(246, 241, 231))
    d.text(
        (92, y + 100),
        "1. Nos cuentas el uso y el logo\n"
        "2. Te mandamos propuesta 3D / JPG\n"
        "3. Precio cerrado · impresión · envío",
        font=body,
        fill=(213, 203, 184),
    )

    d.text(
        (64, y + 250),
        "En la web sí se encargan: atriles, Wi‑Fi de pared y /negocio (logo + chips).\n"
        "Para redes o piezas a medida: contacto@nfctap.tech",
        font=small,
        fill=MUTED,
    )
    d.text((64, 1680), "NFCTap · España · nfctap.tech", font=tiny, fill=MUTED)
    pages.append(img)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pages[0].save(OUT, "PDF", save_all=True, append_images=pages[1:], resolution=150.0)
    print(f"OK {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
