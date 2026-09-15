from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

from nfctap_media.bank import (
    ensure_dirs,
    pick_carousel_photos,
    pick_hook,
    pick_music,
    pick_process_clip,
    pick_web_clip,
)
from nfctap_media.captions import write_ass
from nfctap_media.config import Config
from nfctap_media.endcard import make_endcard
from nfctap_media.history import load_published, mark_published, pick_unused_pain
from nfctap_media.posts import write_instagram_pack, write_publish_guide, write_reel_captions
from nfctap_media.render import render_reel
from nfctap_media.script import (
    Pain,
    Persona,
    build_script,
    close_caption_lines,
    split_body_and_close,
)
from nfctap_media.stories import write_stories_pack
from nfctap_media.tts import VOICE_GAP, concat_voiceovers, speak


def _slug(pain: Pain, persona: Persona) -> str:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"{stamp}_{pain.id}_{persona.id}"


def generate_one(
    cfg: Config,
    *,
    pain_id: str | None = None,
    persona_id: str | None = None,
    money_only: bool = False,
    use_llm: bool = False,
    dest_dir: Path | None = None,
    reel_name: str | None = None,
    hook_file: str | None = None,
    exclude_hooks: set[str] | None = None,
) -> Path:
    pain, persona, script = build_script(
        cfg,
        pain_id=pain_id,
        persona_id=persona_id,
        money_only=money_only,
        use_llm=use_llm,
    )
    slug = _slug(pain, persona)
    work = Path("/tmp/nfctap-media") / slug
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True, exist_ok=True)
    out_dir = dest_dir or cfg.ready_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg.logs_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ {slug}")
    print(f"  dolor: {pain.hook}")
    print(f"  hook 3s: {script.spoken_hook}")
    print(f"  persona: {persona.name} ({persona.city})")
    print(f"  cuerpo ({script.source}): {script.text}")
    print(f"  motor voz: {cfg.voice_engine}")

    body_text, close_text = split_body_and_close(script.text, close=cfg.close_spoken)
    hook_vo = speak(script.spoken_hook, persona, work / "hook.mp3", cfg)
    body_vo = speak(body_text, persona, work / "body.mp3", cfg)
    close_vo = speak(close_text, persona, work / "close.mp3", cfg)
    voice = concat_voiceovers([hook_vo, body_vo, close_vo], work / "voice.mp3")
    hook_v = hook_vo.duration + VOICE_GAP
    body_v = body_vo.duration + VOICE_GAP
    close_v = max(close_vo.duration, float(cfg.endcard_seconds), 5.5)
    total_s = hook_v + body_v + close_v
    print(
        f"  voz: hook {hook_vo.duration:.1f}s + cuerpo {body_vo.duration:.1f}s "
        f"+ cierre {close_vo.duration:.1f}s = {voice.duration:.1f}s"
    )
    print(f"  cuerpo oral: {body_text}")
    print(f"  cierre oral: {close_text} ({close_v:.1f}s de web)")

    ensure_dirs()
    skip = set(exclude_hooks or [])
    hook_src = pick_hook(exclude=skip, hook_file=hook_file)
    if exclude_hooks is not None:
        exclude_hooks.add(hook_src.name)
    app_src = pick_process_clip(pain.id, exclude={hook_src.name})
    if app_src is None:
        app_src = hook_src
        print("  aviso: no hay vídeo de proceso. Cuerpo = el mismo del hook.")
    else:
        print(f"  proceso: {app_src.name}")
    print(f"  hook (resultado): {hook_src.name}")
    music = pick_music()
    if music:
        print(f"  música: {music.name} (entra tras el hook, baja antes del cierre)")
    else:
        print("  música: solo voz (opcional: MP3 en assets/bank/musica/)")

    ass = write_ass(
        voice.words,
        work / "subs.ass",
        cfg,
        hook_until=hook_vo.duration,
        close_from=hook_v + body_v,
        close_until=total_s,
        close_lines=close_caption_lines(close_text),
    )
    web_src = pick_web_clip()
    if web_src is not None:
        endcard = web_src
        print(
            f"  cierre: {web_src.name} desde {cfg.web_start_seconds:.0f}s "
            f"(web en uso, {close_v:.1f}s)"
        )
    else:
        endcard = make_endcard(cfg, work / "endcard.png")
        print("  aviso: no hay grabación de la web. Cierre con tarjeta. Pégala en assets/bank/web/")
    dest = out_dir / (reel_name or f"{slug}.mp4")
    render_reel(
        hook_src,
        app_src,
        voice.path,
        ass,
        endcard,
        dest,
        work,
        hook_v,
        body_v,
        cfg,
        music=music,
        close_seconds=close_v,
        web_start=cfg.web_start_seconds,
    )

    meta = {
        "file": dest.name,
        "pain_id": pain.id,
        "persona_id": persona.id,
        "hook": pain.hook,
        "spoken_hook": script.spoken_hook,
        "script": script.text,
        "source": script.source,
        "duration_s": round(voice.duration, 2),
        "structure": "resultado-proceso-web",
        "music": music.name if music else None,
        "hook_visual": hook_src.name,
        "app": app_src.name if app_src else None,
        "cta": cfg.cta_url,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
    (out_dir / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_reel_captions(out_dir, pain, script)
    print(f"  listo: {dest}")
    return dest


def generate_day(
    cfg: Config,
    *,
    maria_pain: str | None = None,
    andres_pain: str | None = None,
    use_llm: bool = False,
    maria_hook: str | None = None,
    andres_hook: str | None = None,
) -> Path:
    """Pack: Reel mujer + Reel hombre + 1 carrusel (3 fotos) + 2 stories."""
    maria_id = maria_pain or pick_unused_pain(money=False).id
    andres_id = andres_pain or pick_unused_pain(money=True).id
    used_photos = set(load_published().get("photos") or [])
    photos = pick_carousel_photos(3, exclude=used_photos)

    pack_n = int(load_published().get("last_pack") or 0) + 1
    dest_root = cfg.ready_dir / f"{pack_n:02d}_pack"
    if dest_root.exists():
        shutil.rmtree(dest_root)
    reel_t = dest_root / "01_reel_tiempo"
    reel_d = dest_root / "02_reel_dinero"
    car = dest_root / "03_carrusel"
    stories = dest_root / "04_stories"
    for folder in (reel_t, reel_d, car, stories):
        folder.mkdir(parents=True, exist_ok=True)

    print(f"\nPack de producción {pack_n:02d} → {dest_root.name}")
    print("  01 Reel mujer · 02 Reel hombre · 03 carrusel (3 fotos) · 04 stories")
    print(f"  fotos carrusel: {', '.join(p.name for p in photos)}\n")

    used_hooks: set[str] = set()
    generate_one(
        cfg,
        pain_id=maria_id,
        persona_id="maria",
        dest_dir=reel_t,
        reel_name="reel.mp4",
        use_llm=use_llm,
        hook_file=maria_hook,
        exclude_hooks=used_hooks,
    )
    generate_one(
        cfg,
        pain_id=andres_id,
        persona_id="andres",
        dest_dir=reel_d,
        reel_name="reel.mp4",
        use_llm=use_llm,
        hook_file=andres_hook,
        exclude_hooks=used_hooks,
    )
    pain, persona, script = build_script(cfg, pain_id=maria_id, persona_id="maria")
    write_instagram_pack(cfg, car, pain, persona, script, photos=photos)
    print(f"  carrusel: {car}")
    write_stories_pack(cfg, stories, n=2)
    print(f"  stories: {stories}")
    write_publish_guide(dest_root, "01_reel_tiempo", "02_reel_dinero")
    hook_names = []
    for folder in (reel_t, reel_d):
        meta_path = folder / "meta.json"
        if meta_path.exists():
            payload = json.loads(meta_path.read_text(encoding="utf-8"))
            name = payload.get("hook_visual")
            if name:
                hook_names.append(name)
    mark_published(
        [maria_id, andres_id],
        pack=pack_n,
        hooks=hook_names,
        photos=[p.name for p in photos],
    )
    print(f"  guía: {dest_root / 'COMO_PUBLICAR.txt'}")
    print(f"\nTodo en {dest_root}")
    return dest_root


def clean_ready(cfg: Config) -> int:
    n = 0
    cfg.ready_dir.mkdir(parents=True, exist_ok=True)
    for path in list(cfg.ready_dir.iterdir()):
        if path.name == ".gitkeep":
            continue
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
        n += 1
    print(f"Limpio: {n} archivos/carpetas en {cfg.ready_dir}")
    return n
