from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from nfctap_media.bank import pick_carousel_photos
from nfctap_media.config import Config, load_yaml
from nfctap_media.paths import ROOT
from nfctap_media.script import Pain, Persona, Script

SIZES = {
    "ig": (1080, 1350),
    "tt": (1080, 1920),
}


def _hex(value: str) -> tuple[int, int, int]:
    v = value.lstrip("#")
    return int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)


def _brand() -> dict:
    return load_yaml("brand.yaml")


def _load_font(path: Path, size: int, fallback: Path) -> ImageFont.FreeTypeFont:
    for candidate in (path, fallback):
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size)
            except OSError:
                continue
    return ImageFont.load_default()


def _fonts(cfg: Config, display: int, sans: int, small: int):
    brand = _brand()
    d = ROOT / str(brand.get("font_display") or "")
    s = ROOT / str(brand.get("font_sans") or "")
    r = ROOT / str(brand.get("font_sans_regular") or "")
    return (
        _load_font(d, display, cfg.font_bold),
        _load_font(s, sans, cfg.font_bold),
        _load_font(r, small, cfg.font_regular),
    )


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = (cur + " " + word).strip()
        box = draw.textbbox((0, 0), trial, font=font)
        if box[2] - box[0] <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def _open_photo(photo: Path) -> Image.Image:
    image = Image.open(photo)
    return ImageOps.exif_transpose(image).convert("RGB")


def _cover_crop(photo: Path, size: tuple[int, int]) -> Image.Image:
    w, h = size
    base = _open_photo(photo)
    bw, bh = base.size
    scale = max(w / bw, h / bh)
    base = base.resize((int(bw * scale), int(bh * scale)), Image.Resampling.LANCZOS)
    left = (base.width - w) // 2
    top = (base.height - h) // 2
    return base.crop((left, top, left + w, top + h))


def _fit_pad(photo: Path, size: tuple[int, int], bg: tuple[int, int, int]) -> Image.Image:
    w, h = size
    base = _open_photo(photo)
    bw, bh = base.size
    scale = min(w / bw, h / bh)
    nw, nh = max(1, int(bw * scale)), max(1, int(bh * scale))
    base = base.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (w, h), bg)
    canvas.paste(base, ((w - nw) // 2, (h - nh) // 2))
    return canvas


def _rounded(im: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *im.size), radius=radius, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def _tracking(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], font, fill, gap: int = 6) -> None:
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        box = draw.textbbox((0, 0), ch, font=font)
        x += (box[2] - box[0]) + gap


def make_carousel_card(
    cfg: Config,
    photo: Path,
    kicker: str,
    title: str,
    footer: str,
    size: tuple[int, int] = (1080, 1350),
    fit: str = "contain",
) -> Image.Image:
    """Carrusel al estilo nfctap.tech: crema, Fraunces, oro, botón Encargar."""
    brand = _brand()
    cream = _hex(brand.get("cream", "#f6f1e8"))
    ink = _hex(brand.get("ink", brand["navy"]))
    gold = _hex(brand.get("gold_text", "#b0892c"))
    muted = _hex(brand.get("muted", "#5c564c"))
    border = _hex(brand.get("border", "#e6ddd0"))
    paper = (255, 255, 255)
    w, h = size
    img = Image.new("RGB", (w, h), cream)
    draw = ImageDraw.Draw(img)

    font_mark, font_cta, font_k = _fonts(cfg, 34, 28, 22)
    font_title, _, font_foot = _fonts(cfg, 52 if h < 1800 else 58, 28, 26)

    mark = 56
    mx, my = 48, 40
    logo_path = ROOT / brand["logo"]
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA").resize((mark, mark), Image.Resampling.LANCZOS)
        logo_r = _rounded(logo, 12)
        img.paste(logo_r, (mx, my), logo_r)
    else:
        draw.rounded_rectangle((mx, my, mx + mark, my + mark), radius=12, fill=ink)
        nbox = draw.textbbox((0, 0), "N", font=font_mark)
        draw.text(
            (mx + (mark - (nbox[2] - nbox[0])) / 2, my + 8),
            "N",
            font=font_mark,
            fill=cream,
        )

    word_x = mx + mark + 14
    draw.text((word_x, my + 10), "NFCTap", font=font_mark, fill=ink)
    name_box = draw.textbbox((0, 0), "NFCTap", font=font_mark)
    draw.text((word_x + (name_box[2] - name_box[0]), my + 10), ".tech", font=font_mark, fill=gold)

    pill = "Encargar"
    pbox = draw.textbbox((0, 0), pill, font=font_cta)
    pw, ph = pbox[2] - pbox[0] + 44, pbox[3] - pbox[1] + 22
    px, py = w - 48 - pw, my + (mark - ph) // 2
    draw.rounded_rectangle((px, py, px + pw, py + ph), radius=ph // 2, fill=ink)
    draw.text((px + 22, py + 8), pill, font=font_cta, fill=cream)

    kicker_y = my + mark + 36
    _tracking(draw, kicker.upper(), (48, kicker_y), font_k, gold, gap=5)

    title_y = kicker_y + 40
    title_lines = _wrap(draw, title, font_title, w - 96)[: 4 if h >= 1800 else 3]
    for line in title_lines:
        draw.text((48, title_y), line, font=font_title, fill=ink)
        title_y += 62 if h < 1800 else 70

    pill_h = 72
    photo_top = title_y + 28
    photo_bot = h - 48 - pill_h - 36
    card = (44, photo_top, w - 44, photo_bot)
    draw.rounded_rectangle(card, radius=28, fill=paper, outline=border, width=2)
    inset = 16
    inner = (card[2] - card[0] - inset * 2, card[3] - card[1] - inset * 2)
    if fit == "cover":
        photo_im = _cover_crop(photo, inner)
    else:
        photo_im = _fit_pad(photo, inner, cream)
    photo_r = _rounded(photo_im, 20)
    canvas = img.convert("RGBA")
    canvas.paste(photo_r, (card[0] + inset, card[1] + inset), photo_r)
    img = canvas.convert("RGB")
    draw = ImageDraw.Draw(img)

    cta = footer if footer.lower() != "nfctap.tech" else "Encargar · nfctap.tech"
    if "nfctap.tech" not in cta.lower():
        cta = f"{footer} · nfctap.tech"
    _, font_btn, _ = _fonts(cfg, 52, 30, 26)
    bbox = draw.textbbox((0, 0), cta, font=font_btn)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    bw = min(w - 96, tw + 56)
    bx = (w - bw) // 2
    by0 = h - 48 - pill_h
    draw.rounded_rectangle((bx, by0, bx + bw, by0 + pill_h), radius=pill_h // 2, fill=ink)
    draw.text(((w - tw) / 2, by0 + (pill_h - th) / 2 - 2), cta, font=font_btn, fill=cream)
    return img


def carousel_slides(pain: Pain, persona: Persona, script: Script, cfg: Config) -> list[tuple[str, str, str]]:
    return [
        ("NFCTAP.TECH", pain.carousel_title, "Atril NFC · TAP"),
        ("EN LA BARRA", pain.carousel_line, "Impreso en España"),
        ("ENCARGAR", "Envíos a toda España.", "nfctap.tech"),
    ]


def write_instagram_pack(
    cfg: Config,
    dest_dir: Path,
    pain: Pain,
    persona: Persona,
    script: Script,
    photos: list[Path] | None = None,
) -> list[Path]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    chosen = list(photos) if photos else pick_carousel_photos(3)
    slides = carousel_slides(pain, persona, script, cfg)
    if len(chosen) < len(slides):
        raise RuntimeError(
            "Carrusel: hacen falta 3 fotos en assets/bank/imagenes/."
        )
    for i, ((kicker, title, footer), photo) in enumerate(zip(slides, chosen), start=1):
        ig = make_carousel_card(cfg, photo, kicker, title, footer, SIZES["ig"], fit="contain")
        ig.save(dest_dir / f"0{i}-carousel.jpg", "JPEG", quality=92)
        tt = make_carousel_card(cfg, photo, kicker, title, footer, SIZES["tt"], fit="contain")
        tt.save(dest_dir / f"0{i}-tiktok.jpg", "JPEG", quality=92)
    (dest_dir / "CAPTION_CARRUSEL_INSTAGRAM_FACEBOOK.txt").write_text(
        _carousel_caption(pain, script, "ig"), encoding="utf-8"
    )
    (dest_dir / "CAPTION_CARRUSEL_TIKTOK.txt").write_text(
        _carousel_caption(pain, script, "tiktok"), encoding="utf-8"
    )
    (dest_dir / "CAPTION_CARRUSEL_YOUTUBE.txt").write_text(
        _carousel_caption(pain, script, "youtube"), encoding="utf-8"
    )
    return chosen


def _reel_caption(pain: Pain, script: Script, platform: str) -> str:
    body = (
        f"{pain.spoken_hook}\n\n"
        f"{script.text}\n\n"
        "Envíos a toda España.\n"
        "nfctap.tech\n"
    )
    if platform == "tiktok":
        tags = "#NFCTap #Hosteleria #WhatsApp #Instagram #Barra #RestaurantesEspaña"
    elif platform == "youtube":
        tags = "Vídeo: atril NFC para WhatsApp, Instagram o Google. Encarga en nfctap.tech"
    else:
        tags = (
            "#NFCTap #AtrilNFC #Hosteleria "
            "#WhatsApp #Instagram #HechoEnEspaña"
        )
    return f"{body}\n{tags}\n"


def _carousel_caption(pain: Pain, script: Script, platform: str) -> str:
    """Texto del carrusel: copy propio, nunca el locutado ni el hook del Reel."""
    body = pain.carousel_caption.strip()
    if platform == "tiktok":
        tags = "#NFCTap #Hosteleria #AtrilNFC #WhatsApp #Instagram"
    elif platform == "youtube":
        tags = "Carrusel: atril NFC. Encarga en nfctap.tech"
    else:
        tags = (
            "#NFCTap #AtrilNFC "
            "#Hosteleria #HechoEnEspaña"
        )
    return f"{body}\n\n{tags}\n"


def write_reel_captions(
    dest_dir: Path,
    pain: Pain,
    script: Script,
) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / "CAPTION_REEL_INSTAGRAM_FACEBOOK.txt").write_text(
        _reel_caption(pain, script, "ig"), encoding="utf-8"
    )
    (dest_dir / "CAPTION_REEL_TIKTOK.txt").write_text(
        _reel_caption(pain, script, "tiktok"), encoding="utf-8"
    )
    (dest_dir / "CAPTION_REEL_YOUTUBE.txt").write_text(
        _reel_caption(pain, script, "youtube"), encoding="utf-8"
    )


def _caption(pain: Pain, persona: Persona, script: Script, platform: str) -> str:
    return _reel_caption(pain, script, platform)


def write_publish_guide(
    dest_dir: Path,
    tiempo_dir: str,
    dinero_dir: str,
) -> Path:
    text = f"""PACK DE PRODUCCIÓN · NFCTap
Instagram · Facebook · TikTok · YouTube

Carpetas (todo 9:16 salvo el carrusel IG/FB 1080×1350):

1) {tiempo_dir}/
   reel.mp4 + CAPTION_REEL_*.txt  → voz de mujer (María). Reel / Short / TikTok

2) {dinero_dir}/
   reel.mp4 + CAPTION_REEL_*.txt  → voz de hombre (Andrés). Precio.

3) 03_carrusel/
   Tres fotos TUYAS (assets/bank/imagenes/).
   01-03-carousel.jpg = Instagram y Facebook
   01-03-tiktok.jpg  = TikTok y YouTube
   CAPTION_CARRUSEL_*.txt distinto al Reel.

4) 04_stories/
   01 y 02 .jpg / .mp4. Frase + nfctap.tech. No explican el Reel.

El cuerpo del Reel es TU proceso. El hook es la pieza acabada.
Cierre: la web en uso + «Lo podrás encontrar en la web. Envíos a toda España.»
Mira el MP4 y las fotos antes de subir.
"""
    path = dest_dir / "COMO_PUBLICAR.txt"
    path.write_text(text, encoding="utf-8")
    return path
