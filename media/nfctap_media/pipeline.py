from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

from nfctap_media.bank import (
    PROCESO,
    RESULTADO,
    ensure_dirs,
    list_videos,
    pick_carousel_photos,
    pick_hook,
    pick_music,
    pick_process_clip,
    pick_web_clip,
)
from nfctap_media.captions import write_ass
from nfctap_media.config import Config
from nfctap_media.endcard import make_endcard
from nfctap_media.history import load_published, mark_published, pick_unused_variant, take_web_start
from nfctap_media.posts import write_instagram_pack, write_publish_guide, write_reel_captions
from nfctap_media.render import render_reel
from nfctap_media.script import (
    Pain,
    Persona,
    Script,
    Variant,
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
    forbid_hooks: set[str] | None = None,
    variant: Variant | None = None,
    exclude_process: set[str] | None = None,
) -> Path:
    pain, persona, script = build_script(
        cfg,
        pain_id=pain_id,
        persona_id=persona_id,
        money_only=money_only,
        use_llm=use_llm,
        variant=variant,
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
    hard = set(forbid_hooks or [])
    hook_src = pick_hook(exclude=skip, forbid=hard, hook_file=hook_file)
    if hook_src.name in hard:
        print("  aviso: solo hay un vídeo de resultado; los dos Reels abren igual.")
    elif hard:
        print(f"  hook distinto del otro Reel del pack (no {', '.join(sorted(hard))})")
    if exclude_hooks is not None:
        exclude_hooks.add(hook_src.name)
    if forbid_hooks is not None:
        forbid_hooks.add(hook_src.name)
    skip_process = set(exclude_process or []) | {hook_src.name}
    app_src = pick_process_clip(pain.id, exclude=skip_process)
    if app_src is None:
        app_src = hook_src
        print("  aviso: no hay vídeo de proceso. Cuerpo = el mismo del hook.")
    else:
        print(f"  proceso: {app_src.name}")
        if exclude_process is not None:
            exclude_process.add(app_src.name)
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
    web_start = 0.0
    if web_src is not None:
        endcard = web_src
        web_start = take_web_start(web_src, close_v)
        from nfctap_media.bank import video_duration

        web_dur = video_duration(web_src)
        print(
            f"  cierre: {web_src.name} {web_start:.1f}s–{web_start + close_v:.1f}s "
            f"de {web_dur:.0f}s (trozo distinto cada Reel)"
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
        web_start=web_start,
    )

    meta = {
        "file": dest.name,
        "pain_id": pain.id,
        "persona_id": persona.id,
        "hook": pain.hook,
        "spoken_hook": script.spoken_hook,
        "script": script.text,
        "caption": script.caption,
        "carousel_title": script.carousel_title,
        "carousel_line": script.carousel_line,
        "carousel_caption": script.carousel_caption,
        "source": script.source,
        "duration_s": round(voice.duration, 2),
        "structure": "resultado-proceso-web",
        "music": music.name if music else None,
        "hook_visual": hook_src.name,
        "app": app_src.name if app_src else None,
        "cta": cfg.cta_url,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "web_file": web_src.name if web_src else None,
        "web_start_s": round(web_start, 2),
    }
    (out_dir / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_reel_captions(out_dir, pain, script)
    print(f"  listo: {dest}")
    return dest


def _script_from_meta(payload: dict, persona_id: str) -> tuple[Pain, Persona, Script]:
    from nfctap_media.script import pick_pain, pick_persona

    pain = pick_pain(payload["pain_id"])
    persona = pick_persona(persona_id)
    script = Script(
        pain_id=pain.id,
        persona_id=persona.id,
        hook=payload.get("hook") or pain.hook,
        spoken_hook=payload.get("spoken_hook") or pain.spoken_hook,
        text=payload.get("script") or "",
        source=str(payload.get("source") or "template"),
        caption=str(payload.get("caption") or ""),
        carousel_title=str(payload.get("carousel_title") or pain.carousel_title),
        carousel_line=str(payload.get("carousel_line") or pain.carousel_line),
        carousel_caption=str(payload.get("carousel_caption") or pain.carousel_caption),
    )
    return pain, persona, script


def _carousel_photos(
    n: int,
    dest: Path,
    used_photos: set[str],
    used_hooks: set[str],
) -> list[Path]:
    from nfctap_media.bank import IMAGENES, PROCESO, RESULTADO, list_images, list_videos
    from nfctap_media.render import grab_video_frame

    fresh = [p for p in list_images(IMAGENES) if p.name not in used_photos]
    if len(fresh) >= n:
        return pick_carousel_photos(n, exclude=used_photos)
    dest.mkdir(parents=True, exist_ok=True)
    vids = [v for v in list_videos(RESULTADO) if v.name not in used_hooks]
    vids = vids or list_videos(RESULTADO) or list_videos(PROCESO)
    if not vids:
        return pick_carousel_photos(n, exclude=set())
    out: list[Path] = []
    for i in range(n):
        src = vids[i % len(vids)]
        jpg = dest / f"still-{i + 1:02d}-{src.stem}.jpg"
        grab_video_frame(src, jpg, at=1.1 + i * 1.4)
        out.append(jpg)
        print(f"  carrusel still: {src.name} → {jpg.name}")
    return out


def generate_day(
    cfg: Config,
    *,
    maria_pain: str | None = None,
    andres_pain: str | None = None,
    use_llm: bool = False,
    maria_hook: str | None = None,
    andres_hook: str | None = None,
) -> Path:
    """Pack: Reel mujer + Reel hombre + 1 carrusel (3 fotos) + 2 stories.

    Norma: los dos Reels no abren con el mismo clip de resultado.
    """
    maria_p, maria_var = pick_unused_variant(money=False, pain_id=maria_pain)
    andres_p, andres_var = pick_unused_variant(money=True, pain_id=andres_pain)
    published = load_published()
    used_photos = set(published.get("photos") or [])
    used_hooks_hist = set(published.get("hooks") or [])
    used_process_hist = set(published.get("process") or [])
    used_stories = set(published.get("stories") or [])
    unused_hook_files = [p.name for p in list_videos(RESULTADO) if p.name not in used_hooks_hist]
    unused_process_files = [p.name for p in list_videos(PROCESO) if p.name not in used_process_hist]
    used_hooks: set[str] = set(used_hooks_hist) if unused_hook_files else set()
    used_process: set[str] = set(used_process_hist) if unused_process_files else set()
    same_pack_openers: set[str] = set()

    pack_n = int(published.get("last_pack") or 0) + 1
    dest_root = cfg.ready_dir / f"{pack_n:02d}_pack"
    if dest_root.exists():
        shutil.rmtree(dest_root)
    reel_t = dest_root / "01_reel_tiempo"
    reel_d = dest_root / "02_reel_dinero"
    car = dest_root / "03_carrusel"
    stories = dest_root / "04_stories"
    for folder in (reel_t, reel_d, car, stories):
        folder.mkdir(parents=True, exist_ok=True)

    photos = _carousel_photos(3, car / "_stills", used_photos, used_hooks_hist)

    print(f"\nPack de producción {pack_n:02d} → {dest_root.name}")
    print("  01 Reel mujer · 02 Reel hombre · 03 carrusel (3 fotos) · 04 stories")
    print(f"  dolor mujer: {maria_p.id} · {maria_var.spoken_hook}")
    print(f"  dolor hombre: {andres_p.id} · {andres_var.spoken_hook}")
    print(f"  fotos carrusel: {', '.join(p.name for p in photos)}")
    print("  norma: María y Andrés no abren con el mismo vídeo de resultado\n")

    if maria_hook and andres_hook and Path(maria_hook).name == Path(andres_hook).name:
        print("  aviso: --andres-hook igual que María; elijo otro clip para Andrés.")
        andres_hook = None

    generate_one(
        cfg,
        pain_id=maria_p.id,
        persona_id="maria",
        dest_dir=reel_t,
        reel_name="reel.mp4",
        use_llm=use_llm,
        hook_file=maria_hook,
        exclude_hooks=used_hooks,
        forbid_hooks=same_pack_openers,
        variant=maria_var,
        exclude_process=used_process,
    )
    generate_one(
        cfg,
        pain_id=andres_p.id,
        persona_id="andres",
        dest_dir=reel_d,
        reel_name="reel.mp4",
        use_llm=use_llm,
        hook_file=andres_hook,
        exclude_hooks=used_hooks,
        forbid_hooks=same_pack_openers,
        variant=andres_var,
        exclude_process=used_process,
    )
    maria_meta = json.loads((reel_t / "meta.json").read_text(encoding="utf-8"))
    pain, persona, script = _script_from_meta(maria_meta, "maria")
    write_instagram_pack(cfg, car, pain, persona, script, photos=photos)
    stills_dir = car / "_stills"
    if stills_dir.exists():
        shutil.rmtree(stills_dir)
    print(f"  carrusel: {car}")
    story_ids = write_stories_pack(cfg, stories, n=2, exclude=used_stories)
    print(f"  stories: {stories} ({', '.join(story_ids)})")
    write_publish_guide(dest_root, "01_reel_tiempo", "02_reel_dinero", (maria_p, andres_p))
    hook_names = []
    process_names = []
    scripts = []
    spoken = []
    captions = []
    for folder in (reel_t, reel_d):
        payload = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
        if payload.get("hook_visual"):
            hook_names.append(payload["hook_visual"])
        if payload.get("app"):
            process_names.append(payload["app"])
        if payload.get("script"):
            scripts.append(payload["script"])
        if payload.get("spoken_hook"):
            spoken.append(payload["spoken_hook"])
        if payload.get("caption"):
            captions.append(payload["caption"])
        if payload.get("carousel_caption"):
            captions.append(payload["carousel_caption"])
    mark_published(
        [maria_p.id, andres_p.id],
        pack=pack_n,
        hooks=hook_names,
        photos=[p.name for p in photos],
        process=process_names,
        scripts=scripts,
        spoken_hooks=spoken,
        captions=captions,
        stories=story_ids,
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
