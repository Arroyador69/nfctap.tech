from __future__ import annotations

import re
from pathlib import Path

import yaml

from nfctap_media.paths import data_path
from nfctap_media.script import Pain, Variant, load_pains

_EMPTY = {
    "last_pack": 0,
    "pains": [],
    "hooks": [],
    "photos": [],
    "process": [],
    "scripts": [],
    "spoken_hooks": [],
    "captions": [],
    "stories": [],
    "web_cursor": 0.0,
}


def fingerprint(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip().lower()


def _path() -> Path:
    return data_path("published.yaml")


def load_published() -> dict:
    path = _path()
    if not path.exists():
        return dict(_EMPTY)
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    data = dict(_EMPTY)
    data["last_pack"] = int(raw.get("last_pack") or 0)
    for key in (
        "pains",
        "hooks",
        "photos",
        "process",
        "scripts",
        "spoken_hooks",
        "captions",
        "stories",
    ):
        data[key] = [str(x) for x in (raw.get(key) or []) if str(x).strip()]
    try:
        data["web_cursor"] = float(raw.get("web_cursor") or 0)
    except (TypeError, ValueError):
        data["web_cursor"] = 0.0
    return data


def _write_published(data: dict) -> None:
    payload = {
        "last_pack": int(data.get("last_pack") or 0),
        "pains": list(data.get("pains") or []),
        "hooks": list(data.get("hooks") or []),
        "photos": list(data.get("photos") or []),
        "process": list(data.get("process") or []),
        "scripts": list(data.get("scripts") or []),
        "spoken_hooks": list(data.get("spoken_hooks") or []),
        "captions": list(data.get("captions") or []),
        "stories": list(data.get("stories") or []),
        "web_cursor": round(float(data.get("web_cursor") or 0), 3),
    }
    _path().write_text(
        yaml.safe_dump(payload, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )


def _unique_extend(bucket: list[str], values: list[str] | None) -> list[str]:
    seen = list(bucket)
    known = set(seen)
    for raw in values or []:
        item = str(raw).strip()
        if not item or item in known:
            continue
        seen.append(item)
        known.add(item)
    return seen


def mark_published(
    pain_ids: list[str],
    pack: int | None = None,
    hooks: list[str] | None = None,
    photos: list[str] | None = None,
    process: list[str] | None = None,
    scripts: list[str] | None = None,
    spoken_hooks: list[str] | None = None,
    captions: list[str] | None = None,
    stories: list[str] | None = None,
) -> None:
    data = load_published()
    data["pains"] = _unique_extend(data["pains"], pain_ids)
    if pack is not None:
        data["last_pack"] = pack
    data["hooks"] = _unique_extend(data["hooks"], hooks)
    data["photos"] = _unique_extend(data["photos"], photos)
    data["process"] = _unique_extend(data["process"], process)
    data["scripts"] = _unique_extend(
        data["scripts"], [fingerprint(s) for s in (scripts or [])]
    )
    data["spoken_hooks"] = _unique_extend(
        data["spoken_hooks"], [fingerprint(s) for s in (spoken_hooks or [])]
    )
    data["captions"] = _unique_extend(
        data["captions"], [fingerprint(s) for s in (captions or [])]
    )
    data["stories"] = _unique_extend(data["stories"], stories)
    _write_published(data)


def variant_is_used(variant: Variant, published: dict | None = None) -> bool:
    data = published or load_published()
    used_scripts = set(data.get("scripts") or [])
    used_hooks = set(data.get("spoken_hooks") or [])
    used_caps = set(data.get("captions") or [])
    return (
        fingerprint(variant.text) in used_scripts
        or fingerprint(variant.spoken_hook) in used_hooks
        or fingerprint(variant.caption) in used_caps
        or fingerprint(variant.carousel_caption) in used_caps
    )


def unused_variants(*, money: bool) -> list[tuple[Pain, Variant]]:
    data = load_published()
    used_pains = set(data.get("pains") or [])
    pool = [p for p in load_pains() if bool(p.money_angle) is money]
    fresh_pain: list[tuple[Pain, Variant]] = []
    used_pain: list[tuple[Pain, Variant]] = []
    for pain in pool:
        for variant in pain.variants:
            if variant_is_used(variant, data):
                continue
            target = used_pain if pain.id in used_pains else fresh_pain
            target.append((pain, variant))
    return fresh_pain or used_pain


def pick_unused_pain(*, money: bool) -> Pain:
    """Compat: dolor con al menos una variante libre."""
    found = unused_variants(money=money)
    if not found:
        raise RuntimeError(
            "No quedan guiones nuevos. Añade variantes en data/pains.yaml "
            "(objetivo: 60 vídeos distintos)."
        )
    import random

    return random.choice(found)[0]


def pick_unused_variant(*, money: bool, pain_id: str | None = None) -> tuple[Pain, Variant]:
    import random

    found = unused_variants(money=money)
    if pain_id:
        found = [(p, v) for p, v in found if p.id == pain_id]
        if not found:
            raise RuntimeError(
                f"El dolor {pain_id} no tiene guion, hook ni caption nuevos."
            )
    if not found:
        raise RuntimeError(
            "No quedan guiones nuevos para este pack. "
            "Añade variantes en data/pains.yaml (60 vídeos distintos, sin copiar)."
        )
    return random.choice(found)


def leftover_unique_reels() -> int:
    data = load_published()
    n = 0
    for pain in load_pains():
        for variant in pain.variants:
            if not variant_is_used(variant, data):
                n += 1
    return n


def take_web_start(src: Path, take: float) -> float:
    """Siguiente trozo del vídeo largo de la web. Al acabar, vuelve al inicio."""
    from nfctap_media.bank import video_duration

    dur = video_duration(src)
    take = max(float(take), 0.5)
    data = load_published()
    cursor = float(data.get("web_cursor") or 0.0)
    if dur <= take + 0.25:
        start = 0.0
        nxt = 0.0
    else:
        if cursor < 0:
            cursor = 0.0
        if cursor + take > dur:
            cursor = 0.0
        start = cursor
        nxt = start + take
        if nxt >= dur - 0.08:
            nxt = 0.0
    data["web_cursor"] = round(nxt, 3)
    _write_published(data)
    return round(start, 3)
