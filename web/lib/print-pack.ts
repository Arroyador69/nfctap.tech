import JSZip from "jszip";
import { ATRIL } from "./atril-geom";
import { orderToSpec, pauseLayer } from "./print-spec";
import { buildCardStls, pauseNote } from "./stl-card";
import type { Order } from "./types";

export async function buildPrintPack(order: Order) {
  const spec = orderToSpec(order);
  const pause = pauseLayer();
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
Pausa NFC: capa ${pause.layer} (${pause.z.toFixed(2)} mm).
Antes de pausar: disco de acento Ø${ATRIL.PAD_D} bajo la G / el logo (mira).
Pegatina Ø${ATRIL.STICKER_D} ENCIMA de ese círculo, adhesivo a la cama.
`,
  );
  folder.file(
    "NFC.txt",
    spec.kind === "unica"
      ? `Pieza única — dos NFC\n\n1. Reseña Google:\n${spec.googleUrl}\n\n2. Segundo enlace:\n${spec.extraUrl || "(pendiente)"}\n\nCliente: ${spec.cliente}\nPedido: ${spec.orderId}\n`
      : `URL a grabar en el chip (NFC Tap Config → URL):\n${spec.googleUrl}\n\nCliente: ${spec.cliente}\nPedido: ${spec.orderId}\n`,
  );
  if (order.previewDataUrl?.startsWith("data:image/")) {
    const b64 = order.previewDataUrl.split(",")[1] || "";
    folder.file("cara.jpg", Buffer.from(b64, "base64"));
  }
  folder.file(
    "LEEME.txt",
    `Este zip es el mismo atril que ves en la web (y en Flash).

1. Proyecto NUEVO en Flash Studio, impresora AD5X.
2. Importa 01_cuerpo.stl + 02_acento.stl (no el 3mf viejo).
3. Selecciónalos → Agrupar. NO pulses Reparar.
4. Color: cuerpo = ${spec.colores.cuerpo}, acento = ${spec.colores.acento}.
5. Rebana 0,20 mm. Previsualización → slider derecho → capa ${pause.layer} (~${pause.z.toFixed(2)} mm).
6. Mitad-arriba de la placa: hueco redondo (sitio de la G / logo) con círculo de acento. Clic derecho → Añadir pausa.
7. Al pausar: Timeskey Ø25 ENCIMA de ese círculo, adhesivo ABAJO. Continuar.
8. Graba el enlace de NFC.txt.

Genérica = G de Google. Personalizada = logo en acento.
Pieza única = logo + dos NFC (reseña + segundo enlace de NFC.txt).
`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
