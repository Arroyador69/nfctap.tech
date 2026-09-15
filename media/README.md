# NFCTap · media

Reels solo con **tus grabaciones**. Carrusel solo con **tus fotos**. Subtítulos amarillos. Voces Azure España (Ximena / Tristan).

Cada Reel: **pieza acabada** (hook) → **proceso de impresión** (cuerpo) → **nfctap.tech en uso** (cierre). El cierre dice «Lo podrás encontrar en la web. Envíos a toda España.» con subtítulos amarillos.

## Dónde pegar el material

```
media/assets/bank/resultado/   pieza acabada → hook del Reel
media/assets/bank/proceso/     impresión, NFC, TAP → cuerpo del Reel
media/assets/bank/web/         grabación de nfctap.tech → cierre (ya está)
media/assets/bank/imagenes/    3 fotos JPG/PNG → único carrusel del pack
```

Cualquier MOV/MP4 vale para los Reels. El sistema los deja a 1080×1920 sin recortar.

Para el carrusel: al menos 3 fotos. Si pones exactamente 3, salen en orden de nombre (`01.jpg`, `02.jpg`, `03.jpg`). Si el iPhone guarda HEIC, exporta a JPG.

## Pack del día

Dos Reels (voz de mujer + voz de hombre) + **un** carrusel de 3 fotos + stories.

```bash
cd media
source .venv/bin/activate
python -m nfctap_media doctor
python -m nfctap_media day
python -m nfctap_media open
```

Aún no publica solo. Polar después.
