import JSZip from "jszip";
import { MODEL_LABEL, piecesLabel } from "./catalog";
import { ATRIL } from "./atril-geom";
import { orderToSpec, pauseLayer, type PrintSpec } from "./print-spec";
import { buildCardStls, pauseNote } from "./stl-card";
import type { FaceModel, Order, OrderPiece } from "./types";

function pieceGroups(pieces: OrderPiece[]) {
  const order: FaceModel[] = [];
  const map = new Map<FaceModel, { model: FaceModel; nfcUrl: string; copies: number }>();
  for (const p of pieces) {
    const g = map.get(p.model);
    if (g) g.copies += 1;
    else {
      map.set(p.model, { model: p.model, nfcUrl: p.nfcUrl, copies: 1 });
      order.push(p.model);
    }
  }
  return order.map((m) => map.get(m)!);
}

function copiesNote(label: string, copies: number, nfcUrl: string) {
  return `${copies} copias de ${label}

Mismo STL. Imprime ${copies} veces (o duplica en el laminador).

NFC:
${nfcUrl}
`;
}

function nfcText(spec: PrintSpec) {
  if (spec.kind === "unica") {
    return `Pieza única — dos NFC\n\n1. Primer enlace:\n${spec.googleUrl}\n\n2. Segundo enlace:\n${spec.extraUrl || "(pendiente)"}\n\nCliente: ${spec.cliente}\nPedido: ${spec.orderId}\n`;
  }
  const groups = pieceGroups(spec.pieces);
  const lines = groups.map((g) => {
    const n = g.copies > 1 ? `${MODEL_LABEL[g.model]} × ${g.copies}` : MODEL_LABEL[g.model];
    return `${n}\n${g.nfcUrl}`;
  });
  return `URL a grabar en el chip (NFC Tap Config → URL):\n\n${lines.join("\n\n")}\n\nCliente: ${spec.cliente}\nPedido: ${spec.orderId}\n`;
}

export async function buildPrintPack(order: Order) {
  const spec = orderToSpec(order);
  const pause = pauseLayer();
  const zip = new JSZip();
  const folder = zip.folder(spec.nombre)!;
  const groups = pieceGroups(spec.pieces);

  const writePair = (dest: JSZip, pieceSpec: PrintSpec) => {
    const files = buildCardStls(pieceSpec);
    for (const [name, buf] of Object.entries(files)) {
      dest.file(name, buf);
    }
  };

  if (groups.length > 1) {
    groups.forEach((g) => {
      const sub = folder.folder(g.model)!;
      writePair(sub, { ...spec, model: g.model, qty: g.copies });
      if (g.copies > 1) sub.file("COPIAS.txt", copiesNote(MODEL_LABEL[g.model], g.copies, g.nfcUrl));
    });
  } else {
    writePair(folder, spec);
    const g = groups[0];
    if (g && g.copies > 1) {
      folder.file("COPIAS.txt", copiesNote(MODEL_LABEL[g.model], g.copies, g.nfcUrl));
    }
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
Piezas: ${piecesLabel(spec.pieces) || spec.pieces.map((p) => MODEL_LABEL[p.model]).join(" + ")}
Pausa NFC: capa ${pause.layer} (${pause.z.toFixed(2)} mm).
Antes de pausar: disco de acento Ø${ATRIL.PAD_D} bajo el icono (mira).
Pegatina Ø${ATRIL.STICKER_D} ENCIMA de ese círculo, adhesivo a la cama.
`,
  );
  folder.file("NFC.txt", nfcText(spec));
  if (order.previewDataUrl?.startsWith("data:image/")) {
    const b64 = order.previewDataUrl.split(",")[1] || "";
    folder.file("cara.jpg", Buffer.from(b64, "base64"));
  }
  folder.file(
    "LEEME.txt",
    `Este zip es el mismo atril que ves en la web (y en Flash).

1. Proyecto NUEVO en Flash Studio, impresora AD5X.
2. Importa 01_cuerpo.stl + 02_acento.stl (no el 3mf viejo).
${groups.length > 1 ? "   Hay una carpeta por modelo (WhatsApp / Instagram / Google).\n" : ""}${groups.some((g) => g.copies > 1) ? "   Si hay COPIAS.txt, imprime esa cantidad del mismo par STL.\n" : ""}3. Selecciónalos → Agrupar. NO pulses Reparar.
4. Color: cuerpo = ${spec.colores.cuerpo}, acento = ${spec.colores.acento}.
5. Rebana 0,20 mm. Previsualización → slider derecho → capa ${pause.layer} (~${pause.z.toFixed(2)} mm).
6. Mitad-arriba de la placa: hueco redondo (sitio del icono) con círculo de acento. Clic derecho → Añadir pausa.
7. Al pausar: Timeskey Ø25 ENCIMA de ese círculo, adhesivo ABAJO. Continuar.
8. Graba el enlace de NFC.txt (uno por pieza).

Google = G y estrellas. WhatsApp / Instagram = wordmark + icono. Personalizada = logo en acento.
`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
