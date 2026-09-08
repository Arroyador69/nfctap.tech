import { ATRIL } from "./atril-geom";
import { buildAtrilMeshes, type Mesh } from "./atril-mesh";
import { pauseLayer, type PrintSpec } from "./print-spec";

function toStl(mesh: Mesh, name: string) {
  const buf = Buffer.alloc(84 + mesh.tris.length * 50);
  buf.write(name.slice(0, 80));
  buf.writeUInt32LE(mesh.tris.length, 80);
  let o = 84;
  for (const [a, b, c] of mesh.tris) {
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2];
    const vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    const write = (v: number) => {
      buf.writeFloatLE(v, o);
      o += 4;
    };
    write(nx);
    write(ny);
    write(nz);
    for (const p of [a, b, c]) {
      write(p[0]);
      write(p[1]);
      write(p[2]);
    }
    buf.writeUInt16LE(0, o);
    o += 2;
  }
  return buf;
}

export function buildCardStls(spec: PrintSpec) {
  const { cuerpo, acento } = buildAtrilMeshes({
    kind: spec.kind,
    logoMask: spec.logoMask,
    line1: spec.nombreNegocio,
  });
  return {
    "01_cuerpo.stl": toStl(cuerpo, "cuerpo"),
    "02_acento.stl": toStl(acento, "acento"),
  };
}

export function pauseNote(spec: PrintSpec) {
  const { z, layer, cover } = pauseLayer();
  const accent = spec.colores.acento;
  return `Pausa NFC — genérica y personalizada (mismo pozo, bajo la G / logo)
================================================================
Pedido: ${spec.orderId}
Altura: ${z.toFixed(2)} mm · capa ${layer} (primera 0,25 + 0,20 mm)
Centro del pozo = centro de la G / logo (y=${ATRIL.NFC_Y} mm). NO va abajo.
Pozo Ø${ATRIL.WELL_D} · asiento Ø${ATRIL.SEAT_D} · mira Ø${ATRIL.PAD_D} · pegatina Ø${ATRIL.STICKER_D}
Tapa encima: ${cover.toFixed(2)} mm. Luego se imprime la G / el logo encima.

Proyecto NUEVO en Flash. No reutilices el 3mf/G-code viejo.
Importa 01_cuerpo.stl + 02_acento.stl → Agrupar → NO Reparar.
Rebanar 0,20 mm Standard @FF AD5X.

La mira se imprime ANTES de la pausa (capas ~16–20):
disco de acento Ø${ATRIL.PAD_D} en el suelo, justo donde irá la G / el logo.

En Previsualización:
1. Slider DERECHO BAJA hasta la capa ${layer} (~${z.toFixed(2)} mm).
   Mitad-arriba de la placa: HUECO REDONDO + círculo de acento (${accent}).
   Ese círculo es el sitio de la G / el logo. No busques el hueco abajo.
   Capa 270+ = solo el pie. Baja el slider.
2. Clic derecho en esa capa → Añadir pausa.
3. Imprime.

Cuando pare (mira desde ARRIBA):
- El círculo de acento (donde irá la G / el logo) = aquí la pegatina.
- Timeskey Ø25 ENCIMA de ese círculo, hundida, adhesivo ABAJO.
- Que no sobresalga. No apagues. Continuar.
Programa el chip con el enlace de NFC.txt
`;
}
