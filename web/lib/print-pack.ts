import JSZip from "jszip";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACCENT_HEX, BODY_COLORS, MODEL_LABEL, piecesLabel } from "./catalog";
import { ATRIL } from "./atril-geom";
import { orderToSpec, pauseLayer, type PrintSpec } from "./print-spec";
import { buildCardStls, pauseNote } from "./stl-card";
import type { FaceModel, Order, OrderPiece, WifiAddon } from "./types";
import { wifiLandingUrl } from "./wifi-tap";

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
  if (spec.kind === "wifi") {
    return wifiNfcText({
      ssid: spec.wifiSsid || "",
      open: Boolean(spec.wifiOpen),
      landing: spec.googleUrl,
      copies: spec.qty,
      cliente: spec.cliente,
      orderId: spec.orderId,
    });
  }
  const groups = pieceGroups(spec.pieces);
  const lines = groups.map((g) => {
    const n = g.copies > 1 ? `${MODEL_LABEL[g.model]} × ${g.copies}` : MODEL_LABEL[g.model];
    return `${n}\n${g.nfcUrl}`;
  });
  return `URL a grabar en el chip (NFC Tap Config → URL):\n\n${lines.join("\n\n")}\n\nCliente: ${spec.cliente}\nPedido: ${spec.orderId}\n`;
}

function wifiNfcText(input: {
  ssid: string;
  open: boolean;
  landing: string;
  copies: number;
  cliente: string;
  orderId: string;
  password?: string;
}) {
  return `TAP Wi‑Fi pared — NFC Timeskey Ø25
${input.copies > 1 ? `Copias: ${input.copies}\n` : ""}
NFC Tap Config → plantilla «Wi‑Fi con contraseña»:
  SSID = ${input.ssid || "(falta)"}
  Contraseña = ${input.open ? "(red abierta)" : input.password || "(en el pedido / dashboard)"}
  Seguridad = ${input.open ? "abierta" : "WPA2 / WPA3"}

URL de respaldo (iPhone, landing /w):
${input.landing}

Android se une al acercar el móvil.
iPhone enseña la red y la clave.

Cliente: ${input.cliente}
Pedido: ${input.orderId}
`;
}

function pieceSpecFor(spec: PrintSpec, model: FaceModel, copies: number): PrintSpec {
  const custom = model === "personalizada";
  return {
    ...spec,
    kind: custom ? "personalizada" : spec.kind === "unica" ? "unica" : "generica",
    model,
    qty: copies,
    logoMask: custom ? spec.logoMask : undefined,
    nombreNegocio: custom ? spec.nombreNegocio : undefined,
  };
}

function wifiStls() {
  const dir = path.join(process.cwd(), "print-assets/wifi-pared");
  return {
    "01_cuerpo.stl": readFileSync(path.join(dir, "01_cuerpo.stl")),
    "02_acento.stl": readFileSync(path.join(dir, "02_acento.stl")),
  };
}

function wifiColors(addon?: Pick<WifiAddon, "bodyColor" | "accentColor">) {
  if (!addon) return { cuerpo: "negro mate", acento: "blanco" };
  const body = BODY_COLORS.find((c) => c.id === addon.bodyColor)?.label ?? addon.bodyColor;
  return {
    cuerpo: `${addon.bodyColor} (${body})`,
    acento: `${addon.accentColor} (${ACCENT_HEX[addon.accentColor] ?? addon.accentColor})`,
  };
}

function writeWifiFolder(
  dest: JSZip,
  input: {
    qty: number;
    cuerpo: string;
    acento: string;
    ssid: string;
    password: string;
    open: boolean;
    landing: string;
    cliente: string;
    orderId: string;
  },
) {
  const files = wifiStls();
  dest.file("01_cuerpo.stl", files["01_cuerpo.stl"]);
  dest.file("02_acento.stl", files["02_acento.stl"]);
  dest.file(
    "IMPRIME.txt",
    `SOLO ESTOS STL — TAP Wi‑Fi pared
CAMA = reverso (el lado que se pega a la pared).
01_cuerpo.stl  → ${input.cuerpo}
02_acento.stl  → ${input.acento}
Agrupar. NO Reparar. Grosor 3.4 mm + relieve 0.5 mm.
Pausa NFC capa 10 (2.00 mm). Pegatina Ø25 ENCIMA del disco de acento.
Incluye adhesivo 3M para pared.
${input.qty > 1 ? `Imprime ${input.qty} copias del mismo par.\n` : ""}`,
  );
  dest.file(
    "PAUSA_NFC.txt",
    `Pausa NFC — Wi‑Fi pared
Altura: 2.00 mm · capa 10 (primera 0,25 + 0,20 mm)
Pozo Ø28 · asiento Ø26 · mira Ø24 · pegatina Ø25
Reverso en la cama. Pegar ese lado a la pared.
`,
  );
  dest.file(
    "NFC.txt",
    wifiNfcText({
      ssid: input.ssid,
      password: input.password,
      open: input.open,
      landing: input.landing,
      copies: input.qty,
      cliente: input.cliente,
      orderId: input.orderId,
    }),
  );
  dest.file(
    "LEEME.txt",
    `TAP Wi‑Fi de pared. Diseño fijo (Wi‑Fi + TAP HERE). No se edita.

1. Proyecto NUEVO en Flash Studio, AD5X.
2. Importa 01_cuerpo.stl + 02_acento.stl. Agrupar. NO Reparar.
3. Color: cuerpo = ${input.cuerpo}, acento = ${input.acento}.
4. Rebana 0,20 mm. Pausa capa 10 (~2.00 mm), centro de la placa.
5. Timeskey Ø25 ENCIMA del disco de acento, adhesivo abajo.
6. Graba SSID/clave de NFC.txt.
7. En el sobre: adhesivo 3M para pegar el reverso a la pared.
`,
  );
}

export async function buildPrintPack(order: Order) {
  const spec = orderToSpec(order);
  const pause = pauseLayer();
  const zip = new JSZip();
  const folder = zip.folder(spec.nombre)!;
  const addon = order.wifiAddon;

  if (spec.kind === "wifi") {
    writeWifiFolder(folder, {
      qty: spec.qty,
      cuerpo: spec.colores.cuerpo,
      acento: spec.colores.acento,
      ssid: order.design.wifiSsid || "",
      password: order.design.wifiPassword || "",
      open: Boolean(order.design.wifiOpen),
      landing: spec.googleUrl,
      cliente: spec.cliente,
      orderId: spec.orderId,
    });
    folder.file("pedido.json", JSON.stringify({ ...spec, wifiPassword: undefined }, null, 2));
    return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }

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
      writePair(sub, pieceSpecFor(spec, g.model, g.copies));
      if (g.copies > 1) sub.file("COPIAS.txt", copiesNote(MODEL_LABEL[g.model], g.copies, g.nfcUrl));
    });
  } else {
    const g = groups[0];
    writePair(folder, g ? pieceSpecFor(spec, g.model, g.copies) : spec);
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
${addon ? "9. Hay carpeta wifi-pared: placa de pared + adhesivo 3M. Ver su LEEME.txt.\n" : ""}
Google = G y estrellas. WhatsApp / Instagram = wordmark + icono. Personalizada = logo en acento.
`,
  );

  if (addon) {
    const colors = wifiColors(addon);
    writeWifiFolder(folder.folder("wifi-pared")!, {
      qty: addon.qty,
      cuerpo: colors.cuerpo,
      acento: colors.acento,
      ssid: addon.ssid,
      password: addon.password,
      open: addon.open,
      landing: wifiLandingUrl(addon.ssid, addon.password, addon.open),
      cliente: spec.cliente,
      orderId: spec.orderId,
    });
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
