---
name: propuesta-cliente-nfc
description: >-
  Crea la propuesta comercial de un diseño NFCTap para enseñársela al cliente
  antes de imprimir (JPG realista + visor 3D HTML + GLB). Usar cuando el usuario
  pida propuesta, muestra, WhatsApp, JPG, HTML 3D, enviárselo al cliente,
  Cristian, Freddo's u otra presentación de un diseño 3D.
---

# Propuesta cliente NFC

Alberto enseña al cliente **exactamente lo que se va a imprimir**. Nunca un dibujo plano ni un grano “abierto” inventado.

## Entrega (siempre estos tres)

1. **JPG/PNG** — render 3D del conjunto **montado** (cuna + pieza), con los **colores de filamento reales**.
2. **HTML + GLB** — el mismo mesh, mismos colores. Se abre con `ABRIR_3D.command` o `python3 -m http.server` (no con doble clic al HTML).
3. **STL** — los mismos que salen en la propuesta. Si cambia la geometría, se regeneran STL + propuesta juntos.

Carpeta: `disenos/stl/<cliente>/whatsapp/`

## Reglas

- La cuna, el pie, las letras y el encaje se ven como en la impresión. No sustituir por un icono 2D.
- Colores de stock AD5X: negro, amarillo, rojo, blanco. Freddo's = negro + amarillo.
- Comprobar estabilidad si la pieza va de pie (pie profundo, centro de masa dentro de la base).
- El visor 3D escala mm→metros (`* 0.001`). Materiales PLA (poco metal, roughness alto).
- Mensaje WhatsApp corto, en español, con el nombre del cliente.

## Flujo

1. Generar o actualizar el script del diseño (`disenos/generar_*.py`).
2. Exportar propuesta desde el mesh montado (no desde un SVG plano).
3. Abrir el JPG y el HTML y **mirarlos**. Si no se lee la cuna o el color, corregir el render.
4. Entregar solo archivos de esa carpeta `whatsapp/`.
