import JSZip from "jszip";
import { orderToSpec, pauseLayer } from "./print-spec";
import { buildCardStls, pauseNote } from "./stl-card";
import type { Order } from "./types";

export async function buildPrintPack(order: Order) {
  const spec = orderToSpec(order);
  const files = buildCardStls(spec);
  const { z, layer } = pauseLayer(spec);
  const zip = new JSZip();
  const folder = zip.folder(spec.nombre)!;
  for (const [name, buf] of Object.entries(files)) {
    folder.file(name, buf);
  }
  folder.file("pedido.json", JSON.stringify(spec, null, 2));
  folder.file("PAUSA_NFC.txt", pauseNote(spec));
  folder.file(
    "COLORES.txt",
    `Asigna en Orca-Flashforge (IFS, 4 canales)

01_cuerpo.stl     → ${spec.colores.cuerpo}
02_estrellas.stl  → ${spec.colores.estrellas}
03_texto.stl      → ${spec.colores.texto}
04_icono.stl      → ${spec.colores.icono}
05_soporte.stl    → ${spec.colores.soporte}

Cantidad: ${spec.qty}
Pausa NFC: ${z.toFixed(2)} mm / capa ${layer}
`,
  );
  folder.file(
    "NFC.txt",
    `URL a grabar en el chip (NFC Tools → URL):\n${spec.googleUrl}\n\nCliente: ${spec.cliente}\nPedido: ${spec.orderId}\n`,
  );
  if (order.previewDataUrl?.startsWith("data:image/")) {
    const b64 = order.previewDataUrl.split(",")[1] || "";
    folder.file("cara.jpg", Buffer.from(b64, "base64"));
  }
  folder.file(
    "LEEME.txt",
    `Este zip es el modelo que se diseñó en el editor.

1. Abre Orca-Flashforge, impresora AD5X.
2. Arrastra 01_cuerpo + 02_estrellas + 03_texto + 04_icono (y 05_soporte aparte o en la misma placa).
3. Si no coinciden: seleccionar → Ensamblar.
4. Color por pieza según COLORES.txt
5. Pausa en la capa de PAUSA_NFC.txt
6. Al terminar, graba el enlace de NFC.txt
`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
