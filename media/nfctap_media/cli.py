from __future__ import annotations

import argparse
import subprocess
import sys

from nfctap_media.config import load_config
from nfctap_media.doctor import run_doctor
from nfctap_media.pipeline import clean_ready, generate_day, generate_one
from nfctap_media.script import load_pains, load_personas


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="nfctap-media",
        description="Pack diario NFCTap: 2 Reels, 1 carrusel de fotos y stories.",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    doc = sub.add_parser("doctor", help="Comprueba Python, ffmpeg y dependencias")
    doc.add_argument("--ci", action="store_true", help="modo GitHub Actions")

    gen = sub.add_parser("generate", help="Crea un Reel (sin carrusel)")
    gen.add_argument("--count", type=int, default=1)
    gen.add_argument("--pain", help="id del dolor (ver list)")
    gen.add_argument("--persona", help="maria | andres")
    gen.add_argument("--money", action="store_true", help="solo ángulos de dinero")
    gen.add_argument(
        "--llm",
        action="store_true",
        help="intenta Ollama (no recomendado en 8 GB)",
    )

    day = sub.add_parser(
        "day",
        help="Pack del día: María + Andrés + 1 carrusel (3 fotos) + 2 stories",
    )
    day.add_argument("--maria-pain", help="dolor de María (reseñas / tiempo)")
    day.add_argument("--andres-pain", help="dolor de Andrés (dinero / precio)")
    day.add_argument("--maria-hook", help="archivo en assets/bank/resultado/")
    day.add_argument("--andres-hook", help="archivo en assets/bank/resultado/")
    day.add_argument("--llm", action="store_true")

    sub.add_parser("list", help="Lista dolores y personas")
    sub.add_parser("bank", help="Lista tus vídeos y las fotos del carrusel")
    sub.add_parser("drop", help="Muestra las carpetas donde pegas vídeos y fotos")
    sub.add_parser("clean", help="Borra output/ready para liberar espacio")
    sub.add_parser("open", help="Abre la carpeta output/ready en Finder")

    args = parser.parse_args(argv)
    cfg = load_config()

    if args.cmd == "doctor":
        return run_doctor(cfg, ci=args.ci)

    if args.cmd == "list":
        print("Dolores")
        for pain in load_pains():
            tag = "dinero" if pain.money_angle else "reseñas"
            print(f"  {pain.id:24} [{tag}] {pain.hook}")
        print("Personas")
        for persona in load_personas():
            print(f"  {persona.id:24} {persona.name}, {persona.city}")
        return 0

    if args.cmd == "bank":
        from nfctap_media.bank import (
            IMAGENES,
            PROCESO,
            RESULTADO,
            WEB,
            ensure_dirs,
            list_images,
            list_videos,
        )

        ensure_dirs()
        print(f"Resultado (hook) → {RESULTADO}")
        for clip in list_videos(RESULTADO):
            print(f"  · {clip.name}")
        print(f"Proceso (cuerpo) → {PROCESO}")
        for clip in list_videos(PROCESO):
            print(f"  · {clip.name}")
        print(f"Web (cierre) → {WEB}")
        for clip in list_videos(WEB):
            print(f"  · {clip.name}")
        print(f"Fotos carrusel → {IMAGENES}")
        for photo in list_images(IMAGENES):
            print(f"  · {photo.name}")
        return 0

    if args.cmd == "drop":
        from nfctap_media.bank import IMAGENES, PROCESO, RESULTADO, WEB, ensure_dirs

        ensure_dirs()
        print(f"1) Pieza acabada (hook): {RESULTADO}")
        print(f"2) Proceso impresión (cuerpo): {PROCESO}")
        print(f"3) Web nfctap.tech (cierre): {WEB}")
        print(f"4) Fotos del carrusel (3 JPG/PNG): {IMAGENES}")
        return 0

    if args.cmd == "clean":
        clean_ready(cfg)
        return 0

    if args.cmd == "open":
        cfg.ready_dir.mkdir(parents=True, exist_ok=True)
        subprocess.run(["open", str(cfg.ready_dir)], check=False)
        return 0

    if args.cmd == "day":
        generate_day(
            cfg,
            maria_pain=args.maria_pain,
            andres_pain=args.andres_pain,
            use_llm=args.llm,
            maria_hook=args.maria_hook,
            andres_hook=args.andres_hook,
        )
        print("Para abrirlos: python -m nfctap_media open")
        return 0

    if args.cmd == "generate":
        n = max(1, args.count)
        for i in range(n):
            print(f"\n[{i + 1}/{n}]")
            generate_one(
                cfg,
                pain_id=args.pain,
                persona_id=args.persona,
                money_only=args.money,
                use_llm=args.llm,
            )
        print(f"\nVídeos en {cfg.ready_dir}")
        print("Pack de producción (2 Reels + 1 carrusel + stories): python -m nfctap_media day")
        print("Para abrirlos: python -m nfctap_media open")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
