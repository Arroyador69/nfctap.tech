from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from nfctap_media.bank import is_video
from nfctap_media.config import Config
from nfctap_media.paths import ROOT


class RenderError(RuntimeError):
    pass


def _run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RenderError(proc.stderr[-2000:] or proc.stdout[-2000:])


def _common_v(cfg: Config) -> list[str]:
    return [
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-r",
        str(cfg.fps),
        "-crf",
        "19",
        "-preset",
        "veryfast",
    ]


def _common_a() -> list[str]:
    return ["-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2"]


def cover_fill_9x16(cfg: Config, zoom: float = 1.18) -> str:
    """Llena 9:16 y acerca un poco. Sin bandas negras a los lados."""
    w, h = cfg.width, cfg.height
    zw, zh = int(w * zoom), int(h * zoom)
    return (
        f"scale={zw}:{zh}:force_original_aspect_ratio=increase:flags=lanczos,"
        f"crop={zw}:{zh},"
        f"crop={w}:{h},"
        f"eq=saturation=1.04:contrast=1.03,fps={cfg.fps},setsar=1,format=yuv420p"
    )


def cover_9x16(cfg: Config) -> str:
    return cover_fill_9x16(cfg, zoom=1.0)


def kenburns_9x16(cfg: Config, duration: float) -> str:
    """Foto en movimiento: paneo lento a 9:16, sin estirar."""
    w, h = cfg.width, cfg.height
    dur = max(duration, 0.5)
    src_w, src_h = int(w * 1.22), int(h * 1.22)
    return (
        f"scale={src_w}:{src_h}:force_original_aspect_ratio=increase:flags=lanczos,"
        f"crop={src_w}:{src_h},"
        f"crop={w}:{h}:(in_w-{w})*t/{dur:.3f}:(in_h-{h})*t/{dur:.3f}*0.45,"
        f"eq=saturation=1.05:contrast=1.04,fps={cfg.fps},setsar=1,format=yuv420p"
    )


def letterbox_9x16(cfg: Config) -> str:
    """Cabe entero en 9:16 con bandas navy. No recorta la pieza."""
    w, h = cfg.width, cfg.height
    return (
        f"scale={w}:{h}:force_original_aspect_ratio=decrease:flags=lanczos,"
        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=0x1C1915,"
        f"fps={cfg.fps},setsar=1,format=yuv420p"
    )


def _probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    )
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def _endcard_clip(src: Path, dest: Path, cfg: Config) -> Path:
    """Cierre a 1080×1920. Si es la web grabada, letterbox navy (no recorta la URL)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    max_s = max(float(cfg.endcard_seconds), 2.5)
    silent = [
        "-f",
        "lavfi",
        "-t",
        f"{max_s:.3f}",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
    ]
    if is_video(src):
        dur = _probe_duration(src)
        if dur <= 0:
            dur = max_s
        take = min(max(dur, 2.5), max_s)
        silent[3] = f"{take:.3f}"
        _run(
            [
                "ffmpeg",
                "-y",
                "-stream_loop",
                "-1",
                "-i",
                str(src),
                "-t",
                f"{take:.3f}",
                *silent,
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-vf",
                letterbox_9x16(cfg),
                "-shortest",
                *_common_v(cfg),
                *_common_a(),
                str(dest),
            ]
        )
        return dest
    _run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-t",
            f"{max_s:.3f}",
            "-i",
            str(src),
            *silent,
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-vf",
            f"scale={cfg.width}:{cfg.height},fps={cfg.fps},setsar=1,format=yuv420p",
            "-shortest",
            *_common_v(cfg),
            *_common_a(),
            str(dest),
        ]
    )
    return dest


def grab_video_frame(src: Path, dest: Path, at: float = 2.0) -> Path:
    """Fotograma de la impresión para el carrusel (misma pieza que el Reel)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    _run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            f"{max(at, 0.2):.2f}",
            "-i",
            str(src),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(dest),
        ]
    )
    return dest


def grab_own_stills(n: int, dest_dir: Path) -> list[Path]:
    """Fotogramas de piezas ACABADAS para carrusel y stories."""
    from nfctap_media.bank import PROCESO, RESULTADO, _fill, list_videos

    dest_dir.mkdir(parents=True, exist_ok=True)
    vids = list_videos(RESULTADO) or list_videos(PROCESO)
    if not vids:
        return []
    out: list[Path] = []
    for i, src in enumerate(_fill(vids, n)):
        jpg = dest_dir / f"still-{i:02d}.jpg"
        try:
            grab_video_frame(src, jpg, at=1.2)
            out.append(jpg)
        except Exception:
            continue
    return out


def _to_clip(
    src: Path,
    dest: Path,
    duration: float,
    vf: str,
    cfg: Config,
    *,
    start: float = 0.0,
    fade_in: float = 0.0,
) -> Path:
    duration = max(duration, 0.5)
    use_vf = vf
    if fade_in > 0:
        use_vf = f"{vf},fade=t=in:st=0:d={fade_in:.2f}"
    cmd = ["ffmpeg", "-y"]
    if is_video(src):
        src_dur = _probe_duration(src)
        ss = max(0.0, start)
        if src_dur > 0.6:
            ss = min(ss, max(0.0, src_dur - duration))
        if src_dur > 0.6 and src_dur < duration + 0.25:
            cmd += ["-stream_loop", "-1"]
        if ss > 0.05:
            cmd += ["-ss", f"{ss:.3f}"]
        cmd += ["-i", str(src), "-t", f"{duration:.3f}"]
    else:
        cmd += ["-loop", "1", "-t", f"{duration:.3f}", "-i", str(src)]
        use_vf = kenburns_9x16(cfg, duration)
        if fade_in > 0:
            use_vf = f"{use_vf},fade=t=in:st=0:d={fade_in:.2f}"
    cmd += ["-map", "0:v:0", "-vf", use_vf, "-an", "-sn", "-dn", *_common_v(cfg), str(dest)]
    _run(cmd)
    return dest


def render_still_video(image: Path, dest: Path, duration: float, cfg: Config) -> Path:
    """Story o cierre en movimiento a partir de un JPG 9:16."""
    duration = max(duration, 0.5)
    dest.parent.mkdir(parents=True, exist_ok=True)
    _run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-t",
            f"{duration:.3f}",
            "-i",
            str(image),
            "-f",
            "lavfi",
            "-t",
            f"{duration:.3f}",
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-vf",
            f"scale={cfg.width}:{cfg.height},fps={cfg.fps},setsar=1,format=yuv420p",
            *_common_v(cfg),
            *_common_a(),
            "-shortest",
            "-movflags",
            "+faststart",
            str(dest),
        ]
    )
    return dest


def render_reel(
    hook_src: Path,
    body_src: Path,
    audio: Path,
    ass: Path,
    endcard: Path,
    dest: Path,
    work: Path,
    hook_seconds: float,
    body_seconds: float,
    cfg: Config,
    music: Path | None = None,
    close_seconds: float = 0.0,
    web_start: float = 0.0,
) -> Path:
    if not shutil.which("ffmpeg"):
        raise RenderError("ffmpeg no está en PATH. brew install ffmpeg")
    dest.parent.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)

    close_s = close_seconds if close_seconds > 0.5 else max(float(cfg.endcard_seconds), 5.5)
    hook_clip = _to_clip(hook_src, work / "hook.mp4", hook_seconds, letterbox_9x16(cfg), cfg)
    body_vf = letterbox_9x16(cfg) if is_video(body_src) else cover_9x16(cfg)
    body_clip = _to_clip(body_src, work / "body_v.mp4", body_seconds, body_vf, cfg)
    web_vf = cover_fill_9x16(cfg, zoom=1.06)
    web_start_s = web_start if is_video(endcard) else 0.0
    web_clip = _to_clip(
        endcard,
        work / "web_v.mp4",
        close_s,
        web_vf,
        cfg,
        start=web_start_s,
        fade_in=0.35,
    )

    joined_v = work / "acts.mp4"
    _run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(hook_clip),
            "-i",
            str(body_clip),
            "-i",
            str(web_clip),
            "-filter_complex",
            "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]",
            "-map",
            "[v]",
            *_common_v(cfg),
            str(joined_v),
        ]
    )

    dest.parent.mkdir(parents=True, exist_ok=True)
    ass_esc = str(ass.resolve()).replace("\\", "/").replace(":", "\\:")
    logo = ROOT / "assets" / "brand" / "logo-512.png"
    voiced = hook_seconds + body_seconds + close_s
    fade_out = max(hook_seconds + 0.8, voiced - 0.55)
    mux = ["ffmpeg", "-y", "-i", str(joined_v), "-i", str(audio)]
    next_idx = 2
    music_idx = None
    if music is not None and music.exists() and music.stat().st_size > 20_000:
        mux += ["-stream_loop", "-1", "-i", str(music)]
        music_idx = next_idx
        next_idx += 1
    logo_idx = None
    if logo.exists():
        mux += ["-i", str(logo)]
        logo_idx = next_idx

    parts: list[str] = []
    if logo_idx is not None:
        parts.append(f"[0:v]ass='{ass_esc}'[sub]")
        parts.append(f"[{logo_idx}:v]scale=110:110[logo]")
        parts.append("[sub][logo]overlay=40:40,setsar=1,format=yuv420p[v]")
    else:
        parts.append(f"[0:v]ass='{ass_esc}',setsar=1,format=yuv420p[v]")
    parts.append(
        f"[1:a]aformat=sample_rates=44100:channel_layouts=stereo,"
        f"apad=whole_dur={voiced:.3f}[vo]"
    )
    if music_idx is not None:
        vol = max(0.03, min(float(cfg.music_volume), 0.10))
        parts.append(
            f"[{music_idx}:a]atrim=0:{voiced:.3f},asetpts=PTS-STARTPTS,"
            f"aformat=sample_rates=44100:channel_layouts=stereo,"
            f"volume={vol:.3f},afade=t=in:st={hook_seconds:.3f}:d=0.45,"
            f"afade=t=out:st={fade_out:.3f}:d=0.65[bg]"
        )
        parts.append("[vo][bg]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]")
    else:
        parts.append("[vo]volume=1[a]")

    vf = ";".join(parts)
    mux += [
        "-filter_complex",
        vf,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-t",
        f"{voiced:.3f}",
        *_common_v(cfg),
        *_common_a(),
        "-movflags",
        "+faststart",
        str(dest),
    ]
    _run(mux)
    return dest
