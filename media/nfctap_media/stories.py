from __future__ import annotations

import random
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from nfctap_media.config import Config, load_yaml
from nfctap_media.paths import ROOT
from nfctap_media.render import grab_own_stills, render_still_video


def _hex(value: str) -> tuple[int, int, int]:
    v = value.lstrip("#")
    return int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)


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


def _cover_crop(photo: Path, size: tuple[int, int]) -> Image.Image:
    w, h = size
    base = Image.open(photo).convert("RGB")
    bw, bh = base.size
    scale = max(w / bw, h / bh)
    base = base.resize((int(bw * scale), int(bh * scale)), Image.Resampling.LANCZOS)
    left = (base.width - w) // 2
    top = (base.height - h) // 2
    return base.crop((left, top, left + w, top + h))


def load_stories() -> list[dict]:
    return list(load_yaml("stories.yaml")["stories"])


def pick_daily_stories(n: int = 2) -> list[dict]:
    items = load_stories()
    recuerda = [s for s in items if s.get("kind") == "recuerda"]
    registro = [s for s in items if s.get("kind") == "registro"]
    chosen: list[dict] = []
    if recuerda:
        chosen.append(random.choice(recuerda))
    if registro and len(chosen) < n:
        chosen.append(random.choice(registro))
    while len(chosen) < n and items:
        extra = random.choice(items)
        if extra not in chosen:
            chosen.append(extra)
        else:
            break
    return chosen[:n]


def make_story_card(cfg: Config, story: dict, photo: Path | None = None) -> Image.Image:
    from nfctap_media.posts import _brand, _fit_pad, _fonts, _hex, _rounded, _tracking

    brand = _brand()
    cream = _hex(brand.get("cream", "#f6f1e8"))
    ink = _hex(brand.get("ink", brand["navy"]))
    gold = _hex(brand.get("gold_text", "#b0892c"))
    border = _hex(brand.get("border", "#e6ddd0"))
    w, h = cfg.width, cfg.height
    img = Image.new("RGB", (w, h), cream)
    draw = ImageDraw.Draw(img)

    font_mark, font_cta, font_k = _fonts(cfg, 36, 32, 26)
    font_p, _, _ = _fonts(cfg, 64, 32, 26)

    mark = 64
    mx, my = 48, 56
    logo_path = ROOT / brand["logo"]
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA").resize((mark, mark), Image.Resampling.LANCZOS)
        logo_r = _rounded(logo, 14)
        img.paste(logo_r, (mx, my), logo_r)
    draw.text((mx + mark + 14, my + 12), "NFCTap", font=font_mark, fill=ink)
    nb = draw.textbbox((0, 0), "NFCTap", font=font_mark)
    draw.text((mx + mark + 14 + (nb[2] - nb[0]), my + 12), ".tech", font=font_mark, fill=gold)

    kicker = str(story.get("kicker") or "Recuerda").upper()
    _tracking(draw, kicker, (48, my + mark + 40), font_k, gold, gap=5)

    y = my + mark + 92
    for line in _wrap(draw, str(story["phrase"]), font_p, w - 96)[:4]:
        draw.text((48, y), line, font=font_p, fill=ink)
        y += 78

    if photo and photo.exists():
        card = (48, y + 12, w - 48, h - 200)
        draw.rounded_rectangle(card, radius=28, fill=(255, 255, 255), outline=border, width=2)
        inner = (card[2] - card[0] - 24, card[3] - card[1] - 24)
        photo_im = _rounded(_fit_pad(photo, inner, cream), 20)
        canvas = img.convert("RGBA")
        canvas.paste(photo_im, (card[0] + 12, card[1] + 12), photo_im)
        img = canvas.convert("RGB")
        draw = ImageDraw.Draw(img)

    cta = str(story.get("cta") or "Encargar · nfctap.tech")
    extra = cta if "nfctap.tech" in cta.lower() else f"{cta} · nfctap.tech"
    _, font_btn, _ = _fonts(cfg, 36, 30, 26)
    bbox = draw.textbbox((0, 0), extra, font=font_btn)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    bw = min(w - 96, tw + 56)
    bx = (w - bw) // 2
    by0 = h - 120
    draw.rounded_rectangle((bx, by0, bx + bw, by0 + 72), radius=36, fill=ink)
    draw.text(((w - tw) / 2, by0 + (72 - th) / 2 - 2), extra, font=font_btn, fill=cream)
    return img


def write_stories_pack(cfg: Config, dest_dir: Path, n: int = 2) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    for old in dest_dir.iterdir():
        if old.is_file():
            old.unlink()
    picked = pick_daily_stories(n)
    stills = grab_own_stills(max(n, 2), dest_dir / "_stills")
    lines = [
        "STORIES · Instagram, Facebook, TikTok, YouTube",
        "Misma pieza 9:16 en las cuatro. Una frase + registro en la web.",
        "No explican el Reel. Mandan y recuerdan. CTA: nfctap.tech",
        "",
    ]
    for i, story in enumerate(picked, start=1):
        photo = stills[(i - 1) % len(stills)] if stills else None
        img = make_story_card(cfg, story, photo)
        jpg = dest_dir / f"0{i}-{story['id']}.jpg"
        mp4 = dest_dir / f"0{i}-{story['id']}.mp4"
        img.save(jpg, "JPEG", quality=93)
        render_still_video(jpg, mp4, cfg.story_seconds, cfg)
        cta = str(story.get("cta") or "Encarga · envíos a España")
        extra = cta if cfg.cta_url.lower() in cta.lower() else f"{cta} · {cfg.cta_url}"
        lines.append(f"{jpg.name} / {mp4.name}")
        lines.append(f"  {story['phrase']}")
        lines.append(f"  {extra}")
        lines.append("")
    lines.append("Texto para pegar:")
    lines.append(f"{picked[0]['phrase']} {cfg.cta_url}")
    (dest_dir / "CAPTION_STORIES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    stills_dir = dest_dir / "_stills"
    if stills_dir.exists():
        shutil.rmtree(stills_dir)
    return dest_dir
