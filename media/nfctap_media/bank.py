from __future__ import annotations

import random
import re
import subprocess
import unicodedata
from pathlib import Path

import yaml

from nfctap_media.paths import ROOT, data_path

BANK_DIR = ROOT / "assets" / "bank"
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm"}
IMAGE_RASTER = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_RAW = {".heic", ".heif"}
IMAGE_EXT = IMAGE_RASTER | IMAGE_RAW
RESULTADO = BANK_DIR / "resultado"
PROCESO = BANK_DIR / "proceso"
WEB = BANK_DIR / "web"
MUSICA = BANK_DIR / "musica"
IMAGENES = BANK_DIR / "imagenes"


def load_bank() -> dict:
    return yaml.safe_load(data_path("bank.yaml").read_text(encoding="utf-8")) or {}


def ensure_dirs() -> None:
    for folder in (RESULTADO, PROCESO, WEB, MUSICA, IMAGENES):
        folder.mkdir(parents=True, exist_ok=True)


def sync_bank() -> list[Path]:
    """Ya no descarga stock. Solo deja las carpetas de tus grabaciones."""
    ensure_dirs()
    return own_videos()


def rasterize_image(path: Path) -> Path | None:
    """JPG/PNG directo. HEIC del iPhone → JPG con sips."""
    if not path.is_file() or path.stat().st_size <= 8_000:
        return None
    ext = path.suffix.lower()
    if ext in IMAGE_RASTER:
        return path
    if ext not in IMAGE_RAW:
        return None
    dest = path.with_suffix(".jpg")
    if dest.exists() and dest.stat().st_mtime >= path.stat().st_mtime and dest.stat().st_size > 8_000:
        return dest
    try:
        proc = subprocess.run(
            [
                "sips",
                "-s",
                "format",
                "jpeg",
                "-s",
                "formatOptions",
                "90",
                str(path),
                "--out",
                str(dest),
            ],
            capture_output=True,
            text=True,
        )
        if proc.returncode == 0 and dest.exists() and dest.stat().st_size > 8_000:
            return dest
    except Exception:
        return None
    return None


def list_images(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    seen: set[Path] = set()
    out: list[Path] = []
    for path in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
        raster = rasterize_image(path)
        if raster is None:
            continue
        key = raster.resolve()
        if key in seen:
            continue
        seen.add(key)
        out.append(raster)
    return out


def pick_carousel_photos(n: int = 3, *, exclude: set[str] | None = None) -> list[Path]:
    """Tres fotos tuyas para el único carrusel del pack."""
    ensure_dirs()
    pool = list_images(IMAGENES)
    if len(pool) < n:
        raise RuntimeError(
            f"Carrusel: pega al menos {n} fotos JPG, PNG o HEIC en {IMAGENES} "
            f"(ahora hay {len(pool)})."
        )
    skip = exclude or set()
    fresh = [p for p in pool if p.name not in skip]
    source = fresh if len(fresh) >= n else pool
    if len(source) == n:
        chosen = list(source)
    else:
        chosen = random.sample(source, n)
    return sorted(chosen, key=lambda p: p.name.lower())


def list_videos(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    out: list[Path] = []
    for path in sorted(folder.iterdir()):
        if not path.is_file():
            continue
        if path.suffix.lower() not in VIDEO_EXT:
            continue
        if path.stat().st_size > 20_000:
            out.append(path)
    return out


def own_videos() -> list[Path]:
    return list_videos(RESULTADO) + list_videos(PROCESO) + list_videos(WEB)


def _fill(paths: list[Path], n: int) -> list[Path]:
    if not paths:
        return []
    chosen = random.sample(paths, min(n, len(paths)))
    i = 0
    while len(chosen) < n:
        chosen.append(paths[i % len(paths)])
        i += 1
    return chosen


def _norm_name(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def _wanted_key(wanted: str) -> str:
    raw = str(wanted).strip()
    stem = Path(raw).stem if Path(raw).suffix.lower() in VIDEO_EXT else raw
    return _norm_name(stem)


def match_clip(videos: list[Path], wanted: str) -> Path | None:
    needle = _wanted_key(wanted)
    if not needle:
        return None
    ranked: list[tuple[int, Path]] = []
    for path in videos:
        hay = _norm_name(path.stem)
        score = 0
        if hay == needle:
            score = 100
        elif needle in hay:
            score = 80 + min(len(needle), 15)
        else:
            tokens = needle.split()
            hay_tokens = set(hay.split())
            if tokens and all(t in hay_tokens for t in tokens):
                score = 50 + len(tokens)
            elif tokens and all(t in hay for t in tokens):
                score = 40 + len(tokens)
        if score:
            ranked.append((score, path))
    if not ranked:
        return None
    ranked.sort(key=lambda item: (-item[0], item[1].name.lower()))
    return ranked[0][1]


def _pick_from(pool: list[Path], *, exclude: set[str] | None = None) -> Path | None:
    if not pool:
        return None
    skip = exclude or set()
    fresh = [p for p in pool if p.name not in skip]
    return random.choice(fresh or pool)


def pick_hook(*, exclude: set[str] | None = None, hook_file: str | None = None) -> Path:
    """Pieza acabada. Si aún no hay resultado, usa cualquier proceso."""
    ensure_dirs()
    if hook_file:
        for folder in (RESULTADO, PROCESO):
            candidate = folder / hook_file
            if candidate.exists():
                return candidate
    pool = list_videos(RESULTADO) or list_videos(PROCESO)
    hit = _pick_from(pool, exclude=exclude)
    if hit is None:
        raise RuntimeError(
            "Falta un vídeo tuyo para el hook. Pégalo en "
            f"{RESULTADO} (pieza acabada) o en {PROCESO}."
        )
    return hit


def pick_process_clip(pain_id: str, *, exclude: set[str] | None = None) -> Path | None:
    """Proceso de impresión. Si está vacío, reutiliza un resultado."""
    ensure_dirs()
    pool = list_videos(PROCESO)
    spec = load_bank().get("proceso") or {}
    if pool:
        for wanted in (spec.get("by_pain", {}).get(pain_id), spec.get("default")):
            if not wanted:
                continue
            hit = match_clip(pool, str(wanted))
            if hit and (not exclude or hit.name not in exclude):
                return hit
        return _pick_from(pool, exclude=exclude)
    return _pick_from(list_videos(RESULTADO), exclude=exclude)


def pick_print_clip(pain_id: str) -> Path | None:
    return pick_process_clip(pain_id)


def pick_web_clip() -> Path | None:
    ensure_dirs()
    clips = list_videos(WEB)
    return clips[0] if clips else None


def pick_rooms(n: int = 3) -> list[Path]:
    """Compat: fotogramas se sacan en posts/stories. Aquí, vídeos propios."""
    return _fill(own_videos(), n)


def pick_music() -> Path | None:
    ensure_dirs()
    clips = [
        p
        for p in MUSICA.iterdir()
        if p.is_file() and p.suffix.lower() in {".mp3", ".m4a", ".wav"} and p.stat().st_size > 8_000
    ] if MUSICA.exists() else []
    if not clips:
        return None
    return random.choice(clips)


def is_video(path: Path) -> bool:
    return path.suffix.lower() in VIDEO_EXT
