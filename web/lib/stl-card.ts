import { ATRIL } from "./atril-geom";
import { buildAtrilMeshes, type Mesh } from "./atril-mesh";
import type { PrintSpec } from "./print-spec";

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
  return `Hueco NFC — abierto, sin pausa
==============================
Pedido: ${spec.orderId}
Pozo Ø${ATRIL.WELL_D} (se ve) · asiento Ø${ATRIL.SEAT_D} · pegatina Ø${ATRIL.STICKER_D}
Suelo del pozo: ${ATRIL.Z_FLOOR.toFixed(2)} mm. La cara no tapa el hueco.

Imprime entero (Agrupar 01 + 02, NO Reparar).
Al terminar, mete la pegatina Timeskey Ø25 en el asiento
(hundida, adhesivo abajo). No hay filamento encima: no montañita.
Programa el chip con el enlace de NFC.txt
`;
}
