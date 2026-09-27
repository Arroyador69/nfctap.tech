# NFCTap · media

Reels solo con **tus grabaciones**. Carrusel solo con **tus fotos**. Subtítulos amarillos. Voces Azure España (Ximena / Tristan).

Cada Reel: **pieza acabada** (hook) → **proceso de impresión** (cuerpo) → **nfctap.tech en uso** (cierre). El cierre dice «Lo podrás encontrar en la web. Envíos a toda España.» con subtítulos amarillos.

## Dónde pegar el material

```
media/assets/bank/resultado/   1 MOV nuevo de pieza acabada → hook
media/assets/bank/proceso/     2 MOV nuevos de impresión / NFC / TAP → cuerpo
media/assets/bank/web/         1 MOV LARGO de nfctap.tech → cierre (trozos distintos)
media/assets/bank/imagenes/    3 fotos JPG/PNG → único carrusel del pack
```

Cualquier MOV/MP4 vale para los Reels. El sistema los deja a 1080×1920 sin recortar.

El cierre de la web **no** corta siempre el mismo segundo: recorre el vídeo largo
a trozos. En la suma de Reels se ve casi entero.

Para el carrusel: al menos 3 fotos. Si pones exactamente 3, salen en orden de nombre (`01.jpg`, `02.jpg`, `03.jpg`). Si el iPhone guarda HEIC, exporta a JPG.

## Pack del día

Dos Reels (voz de mujer + voz de hombre) + **un** carrusel de 3 fotos + stories.

Los dos Reels **no abren con el mismo clip**. Si el de María usa `IMG_0562`, el de Andrés usa otro de `resultado/`.

```bash
cd media
source .venv/bin/activate
python -m nfctap_media doctor
python -m nfctap_media day
python -m nfctap_media open
```

Aún no publica solo. Polar después.
