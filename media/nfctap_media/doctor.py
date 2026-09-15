from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from nfctap_media.config import Config
from nfctap_media.paths import ROOT
from nfctap_media.script import load_pains, load_personas, validate_carousel_copy, validate_script


def _ram_gb() -> float | None:
    try:
        raw = subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True).strip()
        return int(raw) / (1024**3)
    except Exception:
        return None


def check_scripts(cfg: Config) -> int:
    bad = 0
    for pain in load_pains():
        copy_errors = validate_carousel_copy(pain)
        if copy_errors:
            bad += 1
            print(f"  ERROR carrusel {pain.id}: {copy_errors}")
        for script in pain.scripts:
            errors = validate_script(script, cfg, spoken_hook=pain.spoken_hook)
            if errors:
                bad += 1
                print(f"  ERROR guion {pain.id}: {errors}")
    personas = load_personas()
    if len(personas) < 2:
        print("  ERROR: hacen falta al menos 2 personas")
        bad += 1
    from nfctap_media.stories import load_stories

    if len(load_stories()) < 2:
        print("  ERROR: hacen falta al menos 2 stories en data/stories.yaml")
        bad += 1
    return bad


def run_doctor(cfg: Config, ci: bool = False) -> int:
    print("NFCTap · doctor")
    print(f"  proyecto: {ROOT}")
    ok = True

    py = sys.version.split()[0]
    print(f"  python: {py}")
    if sys.version_info < (3, 11):
        print("  ERROR: hace falta Python 3.11+")
        ok = False

    ffmpeg = shutil.which("ffmpeg")
    print(f"  ffmpeg: {ffmpeg or 'NO'}")
    if not ffmpeg and not ci:
        print("  ERROR: brew install ffmpeg")
        ok = False

    for name in ("edge_tts", "httpx", "PIL", "yaml"):
        try:
            __import__("PIL" if name == "PIL" else name)
            print(f"  {name}: ok")
        except ImportError:
            print(f"  ERROR: falta {name}. pip install -r requirements.txt")
            ok = False

    if not ci:
        key = cfg.azure_speech_key
        print(
            f"  azure: {'clave en .env' if key else 'sin AZURE_SPEECH_KEY'} "
            f"({cfg.azure_speech_region})"
        )
        if cfg.voice_engine == "azure" and not key:
            print("  aviso: voice_engine=azure pero falta la clave. Se usará Edge.")
        try:
            import azure.cognitiveservices.speech  # noqa: F401

            print("  azure-speech sdk: ok")
        except ImportError:
            print("  aviso: pip install -r requirements-voice.txt (SDK Azure)")

    if not ci:
        for font in (cfg.font_bold, cfg.font_regular):
            exists = Path(font).exists()
            print(f"  fuente {font.name}: {'ok' if exists else 'NO'}")
            if not exists:
                ok = False
        ram = _ram_gb()
        if ram is not None:
            print(f"  RAM: {ram:.1f} GB")
            if ram < 12:
                print("  aviso: 8 GB. Hook resultado + proceso + web. No Flux ni stock.")

    bank_yaml = ROOT / "data" / "bank.yaml"
    stories_yaml = ROOT / "data" / "stories.yaml"
    print(f"  banco yaml: {'ok' if bank_yaml.exists() else 'NO'}")
    print(f"  stories yaml: {'ok' if stories_yaml.exists() else 'NO'}")
    if not bank_yaml.exists() or not stories_yaml.exists():
        ok = False
    if not ci:
        from nfctap_media.bank import IMAGENES, PROCESO, RESULTADO, WEB, list_images, list_videos

        RESULTADO.mkdir(parents=True, exist_ok=True)
        PROCESO.mkdir(parents=True, exist_ok=True)
        WEB.mkdir(parents=True, exist_ok=True)
        IMAGENES.mkdir(parents=True, exist_ok=True)
        resultados = list_videos(RESULTADO)
        procesos = list_videos(PROCESO)
        webs = list_videos(WEB)
        fotos = list_images(IMAGENES)
        print(f"  resultado (hook): {len(resultados)} en assets/bank/resultado/")
        for clip in resultados:
            print(f"      · {clip.name}")
        print(f"  proceso (cuerpo): {len(procesos)} en assets/bank/proceso/")
        for clip in procesos:
            print(f"      · {clip.name}")
        print(f"  web (cierre): {len(webs)} en assets/bank/web/")
        for clip in webs:
            print(f"      · {clip.name}")
        print(f"  fotos carrusel: {len(fotos)} en assets/bank/imagenes/")
        for photo in fotos:
            print(f"      · {photo.name}")
        if not resultados and not procesos:
            print("  aviso: pega pieza acabada en resultado/ y/o proceso de impresión en proceso/")
        if not webs:
            print("  aviso: falta la grabación de nfctap.tech en assets/bank/web/")
        if len(fotos) < 3:
            print("  aviso: el carrusel necesita 3 fotos JPG/PNG/HEIC en assets/bank/imagenes/")

    script_errors = check_scripts(cfg)
    print(f"  guiones: {'ok' if script_errors == 0 else script_errors}")
    if script_errors:
        ok = False

    cfg.ready_dir.mkdir(parents=True, exist_ok=True)
    cfg.cache_dir.mkdir(parents=True, exist_ok=True)
    print(f"  salida: {cfg.ready_dir}")
    print("  listo" if ok else "  hay errores")
    return 0 if ok else 1
