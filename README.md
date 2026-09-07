# NFCTap.tech — tarjetas NFC de reseñas Google

Marca: **nfctap.tech** (canónico). `nfctab.tech` redirige aquí hasta que deje de renovarse. Web en `web/` (Next.js, Vercel). App de programación NFC en `nfctap-config/` (**NFCTap Config**). Diseños 3D en `disenos/`.

```bash
cd web && npm install && npm run dev
```

- Tienda: http://localhost:3000
- Personalizar + pagar: http://localhost:3000/personalizar
- Dashboard: http://localhost:3000/dashboard (clave `nfctab` hasta que pongas `DASHBOARD_PASSWORD`)

Deploy Vercel: root directory = `web`. Polar se conecta después (env en `web/.env.example`).

Cada push a GitHub lanza **Actions → CI** (lint + build de `web/`).

### De un pedido al STL

1. Cliente (o tú en `/dashboard/nuevo`) diseña y guarda.
2. En el pedido: **Descargar ZIP para Orca** (STL + colores + pausa NFC + URL).
3. Orca-Flashforge → importar 01–05 → ensamblar → color por pieza → pausa → imprimir.
4. Local, si quieres regenerar: `python3 disenos/generar_tarjetas.py --pedido pedido.json`

En Vercel, crea un Blob Store y pon `BLOB_READ_WRITE_TOKEN` para que los pedidos no se pierdan.

---

# Impresora Flashforge AD5X

Proyecto listo para cuando llegue la impresora: diseños STL, cómo meter la tira NFC a media impresión y cómo programarla para que el móvil abra la reseña de Google.

---

## Respuesta rápida

**¿Puedes poner cualquier color?** Sí. Compras el filamento del color que quieras (hay cientos: negro, blanco, oro, rojo marca del cliente, silk, mate…). La AD5X no limita el color. Lo que limita es **cuántos colores caben a la vez**: el IFS lleva **4 bobinas**. En una sola tarjeta puedes combinar hasta 4 colores. Entre un pedido y otro cambias bobinas y usas los que quieras.

**¿Hay repos y plantillas?** Sí. Abajo tienes los que valen y, además, **ya tienes las primeras tarjetas generadas en este proyecto** (no dependes de Cults de pago).

**Flujo completo:** diseñar → rebanar en Orca-Flashforge → pausar en la capa del hueco → meter la pegatina NFC Ø25 mm → terminar impresión → escribir la URL de Google con NFC Tools o NFCTap Config.

---

## 1. Tu impresora: Flashforge Adventurer 5X (AD5X)

Comprada el 3 sep 2026, [Amazon B0DMWCWZXL](https://www.amazon.es/dp/B0DMWCWZXL), ~349 €. Nº1 en impresoras 3D en Amazon.es.

| Dato | Valor real |
| --- | --- |
| Volumen | 220 × 220 × 220 mm |
| Velocidad | hasta 600 mm/s (impresión típica ~300 mm/s) |
| Aceleración | 20 000 mm/s² |
| Estructura | CoreXY metálica |
| Boquilla | 0,4 mm de serie (0,25 / 0,6 / 0,8 opcionales), hasta 300 °C |
| Cama | PEI magnética, hasta 110 °C |
| Colores a la vez | **4** con IFS (Intelligent Filament System) |
| Recarga auto | sí, hasta 4 kg / 4 canales del mismo color |
| Materiales | PLA, HS PLA, mate, silk, PETG, ASA, TPU, PLA-CF, PETG-CF |
| Software | **Orca-Flashforge** (recomendado) o Orca Slicer |
| Conexión | Wi-Fi, USB, Ethernet |
| App / granja | Flash Maker |

Para estas tarjetas usa **PLA mate** (o HS PLA). Queda más “producto” y no brilla de forma barata. **No uses filamento con fibra de carbono ni metal** cerca del NFC: atenúa o mata la señal.

Docs oficiales útiles:

- [Impresión multicolor AD5X](https://www.flashforge.com/a/docs/ad5x/multi-color-printing)
- [Enviar a imprimir desde Orca-Flashforge](https://www.flashforge.com/a/docs/ad5x/print-via-orca-flashforge)
- [Producto AD5X](https://www.flashforge.com/products/flashforge-ad5x-3d-printer)

En la cama de 220 mm caben **4 tarjetas** (2×2) o **6** si las giras (3×2 en 54 mm). Una sola pausa sirve para meter las 6 pegatinas de golpe.

---

## 2. Cómo se diseñan (y qué hay ya hecho)

Una tarjeta de reseña no es un solo bloque. Son **piezas de color** + un **hueco interno** para el NFC:

```
   [estrellas oro]  [texto blanco]  [icono]
  -----------------------------------------
 |              CUERPO (negro/color marca)  |
 |           ┌─────────────────┐            |
 |           │  NFC Ø25 mm     │  ← hueco   |
 |           └─────────────────┘            |
  -----------------------------------------
```

### Lo que ya tienes en esta carpeta

```
disenos/
  generar_tarjetas.py              ← genera STL a medida
  tarjeta_google_review.scad       ← mismo diseño en OpenSCAD
  stl/
    demo-tira-clasica/             ← 86×54 mm, hueco moneda_25 (Timeskey Ø25)
    demo-moneda-25/                ← mismo tamaño, grosor 4 mm
    mostrador-grande/              ← 110×70 mm para barra/recepción
    cliente-demo/                  ← plantilla de cliente, mismo hueco
    alberto-cartera/               ← tu 1ª pieza: cartera slim, 2 NFC (WA + web)
```

Cada carpeta incluye:

| Archivo | Color sugerido | Qué es |
| --- | --- | --- |
| `01_cuerpo.stl` | Negro o color de marca | Tarjeta con hueco NFC dentro |
| `02_estrellas.stl` | Amarillo oro | 5 estrellas en relieve |
| `03_texto.stl` | Blanco | “TOCA PARA / RESENA” |
| `04_icono.stl` | Blanco | Badge + estrella (icono genérico, no logo de Google) |
| `05_soporte.stl` | Negro | Atril de mesa, se imprime aparte |
| `PAUSA_NFC.txt` | — | Capa exacta donde pausar |

**Tu primera tarjeta:** abre `disenos/stl/alberto-cartera/alberto-cartera.3mf` en Flash Studio Desktop (ya va ensamblado).  
Pausa en **2,00 mm = capa 10**. Lee `LEEME_PRIMERA_IMPRESION.txt`. Huecos **Ø 28,4 × 0,8 mm** para Timeskey NTAG215 Ø25 mm. No importes los STL sueltos.

### Personalizar un cliente

```bash
python3 disenos/generar_tarjetas.py \
  --nombre "bar-pepe" \
  --linea1 "BAR PEPE" \
  --linea2 "RESENA" \
  --nfc moneda_25
```

Stock NFC (los primeros 50): [Timeskey NTAG215 Ø25 mm](https://www.amazon.es/dp/B08LD99GZT). El hueco por defecto es `moneda_25` (Ø 28 + 0,4 mm de holgura → **~Ø 28,4 × 0,8 mm**), para meterla a mano sin que roce.

| Preset | Hueco | Para qué |
| --- | --- | --- |
| **`moneda_25`** | Ø 28 × 0,8 mm | **Pegatinas Timeskey Ø25 mm (el stock)** |
| `moneda_30` | Ø 31,5 × 1,0 mm | Monedas grandes |
| `tira_45x15` | 47 × 17 × 0,8 mm | Tiras adhesivas (si compras otras) |
| `tira_40x20` | 42 × 22 × 0,8 mm | Tiras más anchas |
| `tira_35x15` | 37 × 17 × 0,8 mm | Tiras cortas |

Si una pegatina concreta roza, sube `d` en `PRESETS_NFC` de `generar_tarjetas.py`. El hueco debe quedar **~1,5 mm más grande por lado** que el chip.

### En Orca-Flashforge (cuando llegue la máquina)

1. Instala [Orca-Flashforge](https://www.flashforge.com) y elige impresora **AD5X**.
2. Añade hasta 4 filamentos en la barra izquierda (IFS = máx. 4).
3. Importa `01_cuerpo.stl`, `02_estrellas.stl`, `03_texto.stl`, `04_icono.stl`.
4. Si no coinciden, selecciónalos todos → clic derecho → **Ensamblar** (o alinea origen).
5. En el panel Objetos, asigna un color/filamento a cada pieza.
6. Opcional: **Añadir texto** para el nombre del negocio (relieve 0,4 mm).
7. Rebana. En **Vista previa**, slider derecho → capa de `PAUSA_NFC.txt` → clic derecho → **Añadir pausa**.
8. Activa **Enable IFS**, mapea canales (negro→canal X, etc.) y envía.

Ajustes que funcionan bien en tarjetas:

- Capa 0,20 mm (si quieres más detalle en texto: 0,16 mm y recalcula la capa de pausa)
- 3 perímetros, relleno 15–20 % gyroid
- Primera capa lenta, cama PEI limpia
- Generador de paredes **Arachne** para el texto
- PLA ~210/60 °C (sigue el carrete)

---

## 3. Repos, plantillas y sitios (investigado)

No hay un “GitHub oficial de tarjetas Google”. El nicho está en modelos 3D + apps NFC. Esto es lo que sí existe y sirve:

### Código / generadores (gratis)

| Recurso | Para qué |
| --- | --- |
| [nfc-keychain-generator-blender-addon](https://github.com/Clonephaze/nfc-keychain-generator-blender-addon) | Addon de Blender: tarjetas, llaveros, hueco NFC, SVG, QR |
| [Dog tag paramétrico RFID (Printables + OpenSCAD)](https://www.printables.com/model/438828-universal-parametric-rfid-compatible-dog-tag-gener) | Generador OpenSCAD con hueco RFID/NFC |
| **Este repo (`generar_tarjetas.py` + `.scad`)** | Plantilla propia, lista para AD5X y tus tiras |

### Modelos listos para descargar

| Recurso | Notas |
| --- | --- |
| [MakerWorld — Minimalist Google Review NFC & QR](https://makerworld.com/en/models/1469384-minimalist-google-review-nfc-qr-code) | Soporte de mesa + QR (el QR hay que generarlo tú) |
| [MakerWorld — NFC stand con chip embebido](https://makerworld.com/en/models/2370320-nfc-customizable-stand-embedded-chip) | Pausa ya puesta, chip 25 mm |
| [MakerWorld — QR sign paramétrico + NFC](https://makerworld.com/en/models/2401859-customizable-qr-code-sign-nfc-frame-optional) | Muy configurable |
| [Printables — soporte NFC de mostrador](https://www.printables.com/model/1186851-curved-tabletop-nfc-tag-holder) | Atril, se inserta el tag a media impresión |
| [Cults — Smart NFC Review Card](https://cults3d.com/tr/3d-model/ev/smart-nfc-review-card-boost-your-business) | De pago; 85,6×54×3 mm, pausa en capa 10 |

### Programar el NFC (apps)

- [NFC Tools](https://www.wakdev.com/en/apps/nfc-tools.html) — iOS y Android (la que usarás)
- NFC TagWriter (NXP) — alternativa Android
- [Guía de escritura de tarjetas NFC para reseñas](https://upwardbound.media/resources/nfc-card-programming)

Slicer y pausa: [cómo añadir pausa en OrcaSlicer](https://printago.io/guides/orca-slicer-pause-at-layer) (Orca-Flashforge es el mismo motor).

---

## 4. Meter la pegatina NFC a media impresión

1. La impresora hace la base (1,2 mm) y las paredes del hueco.
2. **Pausa** en la primera capa que taparía el hueco (`demo-moneda-25`: **2,00 mm / capa 10**).
3. Colocas la pegatina Timeskey **Ø25 mm plana y centrada**, adhesivo hacia el suelo del hueco, sin que sobresalga.
4. Reanudas. La impresora sella el NFC dentro. Queda invisible y protegido.

Consejos que evitan fallos:

- El nozzle está caliente: no toques la cama; usa pinzas si hace falta.
- Estas pegatinas son finas (~0,2 mm). El hueco tiene 0,8 mm de alto: caben holgadas.
- No las pongas arrugadas: el cabezal las puede arrancar.
- Programa el NFC **después** (atraviesa el PLA sin problema) o **antes** si quieres probar el chip. Después es más cómodo.
- iPhone lee NFC de serie; Android también (NFC activado).
- No van sobre metal. No las pases a solo lectura hasta comprobar el enlace.

---

## 5. Programar el NFC para Google Reviews

Necesitas el **enlace directo a escribir reseña**, no el Maps genérico.

### Conseguir el enlace (elige uno)

**A. Desde el perfil de empresa (más fácil)**  
[Google Business Profile](https://business.google.com) → el negocio → **Pedir reseñas** / Ask for reviews → copiar el enlace corto:

`https://g.page/r/XXXXXXXX/review`

**B. Con Place ID**  
1. Abre el [Place ID Finder de Google](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder).  
2. Busca el negocio, copia el `place_id` (empieza por `ChIJ…`).  
3. Monta:

`https://search.google.com/local/writereview?placeid=AQUI_EL_PLACE_ID`

Ese enlace abre **directamente el formulario de reseña**.

### Escribirlo en el chip

1. Instala **NFC Tools** en el móvil.
2. Write / Escribir → Add a record → **URL / URI**.
3. Pega el enlace de reseña.
4. Write → acerca el móvil a la tarjeta (por la cara, 1–2 cm).
5. Prueba con **otro** móvil: debe abrir Google y la reseña, sin app extra.
6. Cuando esté bien, en NFC Tools puedes **bloquear** el tag (write-protect) para que el cliente no lo pisen. Bloquea solo al entregar.

Chips que funcionan (NTAG de NXP, los que entiende iPhone y Android):

| Chip | Memoria | Recomendado |
| --- | --- | --- |
| NTAG213 | ~180 B | Vale para una URL corta |
| **NTAG215** | ~504 B | **El que debes comprar** |
| NTAG216 | ~888 B | Sobra para esto |

Las Timeskey B08LD99GZT son **NTAG215**. Si al escribir falla por “poca memoria”, acorta la URL (usa el `g.page`).

---

## 6. Lista de la compra para el día 1

Ya tienes la impresora. Falta esto:

| Qué | Para qué | Nota |
| --- | --- | --- |
| PLA mate negro 1 kg | Cuerpo | El 80 % de los pedidos |
| PLA blanco 1 kg | Texto / icono | Contraste |
| PLA oro / amarillo silk | Estrellas | Aspecto “5 estrellas” |
| 1 color extra (rojo, azul, verde) | Marca del cliente | El 4º canal del IFS |
| Pegatinas NFC **NTAG215 Ø25 mm** | El chip | [Timeskey B08LD99GZT](https://www.amazon.es/dp/B08LD99GZT); si compras más, mismas Ø25 |
| Alcohol isopropílico | Limpiar PEI | Primera capa limpia |
| Orca-Flashforge | Slicer | Gratis, web Flashforge |
| NFC Tools | Programar | Gratis en App Store / Play |

Opcional más adelante: PLA de colores de marca (corporativos), PETG si van a terraza al sol, más AD5X cuando escales (la propia Flashforge las vende como granja).

---

## 7. Coste y producto (para el negocio)

Números orientativos por tarjeta clásica 86×54:

- Filamento: 8–15 g → **0,15–0,30 €**
- NFC NTAG215: **0,08–0,25 €** (mejor por 100/500 uds)
- Tiempo máquina: 20–40 min (1 unidad) o ~1,5 h (placa de 6)
- Precio de venta habitual en este nicho: **12–29 €** unidad, packs 3/5/10 con descuento, o 39–79 € el pack “mostrador + 2 tarjetas + programación”

No uses el **logotipo oficial de Google** (la G de 4 colores) en producto a la venta sin permiso de marca. “Reseña en Google”, estrellas y un icono genérico es lo correcto y es lo que generan estos STL.

---

## 8. Plan de las próximas semanas

1. **Hoy:** Orca-Flashforge descargado; chips Timeskey Ø25 mm; hueco ya es `moneda_25`.
2. **Día que llegue la AD5X:** calibración, PLA de prueba, imprime `demo-moneda-25` en un color. Pausa, mete la pegatina, programa un enlace de prueba (puede ser el de un negocio tuyo o un Place ID de prueba).
3. **Segunda impresión:** 3 colores (negro + blanco + oro).
4. **Primera de cliente:** `--nombre` + colores de su marca + su `g.page`.
5. **Web (en unas semanas):** catálogo (tarjeta, mostrador, pack), formulario de Place ID / enlace, pago, y este mismo generador para producir el STL del pedido.

Cuando quieras, el siguiente paso técnico es: formulario web que pida nombre + enlace Google + colores y dispare `generar_tarjetas.py`.
