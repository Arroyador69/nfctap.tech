import JSZip from "jszip";
import { ATRIL } from "./atril-geom";
import { orderToSpec } from "./print-spec";
import { buildCardStls, pauseNote } from "./stl-card";
import type { Order } from "./types";

export async function buildPrintPack(order: Order) {
  const spec = orderToSpec(order);
  const files = buildCardStls(spec);
  const zip = new JSZip();
  const folder = zip.folder(spec.nombre)!;
  for (const [name, buf] of Object.entries(files)) {
    folder.file(name, buf);
  }
  folder.file("pedido.json", JSON.stringify(spec, null, 2));
  folder.file("PAUSA_NFC.txt", pauseNote(spec));
  folder.file(
    "COLORES.txt",
    `Flash Studio / Orca-Flashforge — AD5X

01_cuerpo.stl  → ${spec.colores.cuerpo}
02_acento.stl  → ${spec.colores.acento}

Agrupar 01 + 02. NO Reparar el modelo.
Capa 0,20 mm, 3 perímetros, gyroid 15 %, Arachne.
Cantidad: ${spec.qty}
Hueco NFC abierto Ø${ATRIL.WELL_D} (sin pausa). Pegatina Ø${ATRIL.STICKER_D} al terminar.
`,
  );
  folder.file(
    "NFC.txt",
    `URL a grabar en el chip (NFC Tap Config → URL):\n${spec.googleUrl}\n\nCliente: ${spec.cliente}\nPedido: ${spec.orderId}\n`,
  );
  if (order.previewDataUrl?.startsWith("data:image/")) {
    const b64 = order.previewDataUrl.split(",")[1] || "";
    folder.file("cara.jpg", Buffer.from(b64, "base64"));
  }
  folder.file(
    "LEEME.txt",
    `Este zip es el mismo atril que ves en la web (y en Flash).

1. Abre Flash Studio / Orca-Flashforge, impresora AD5X.
2. Importa 01_cuerpo.stl + 02_acento.stl.
3. Selecciónalos → Agrupar. NO pulses Reparar.
4. Color: cuerpo = ${spec.colores.cuerpo}, acento = ${spec.colores.acento}.
5. Imprime entero. El hueco NFC queda abierto (se ve, más grande que la pegatina).
6. Al terminar, mete la pegatina Timeskey Ø25 en el asiento (adhesivo abajo).
7. Graba el enlace de NFC.txt.

Genérica = G de Google. Personalizada = tu logo en acento. TAP / RESEÑA siempre.
`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
