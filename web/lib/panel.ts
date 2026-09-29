import { createHash, randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { cookies } from "next/headers";
import { tmpdir } from "os";
import path from "path";

const BLOB_KEY = "nfctab-panel.json";
const SESSION_COOKIE = "nfctap_panel";
const CONTRACT_VERSION = "2026-09-redes-v1";
const SUPER_EMAIL = "contacto@nfctap.tech";
const ID_RE = /^[a-z0-9-]{3,40}$/;

export type RedesPack = "barrio" | "calle" | "plaza" | "faro";

export const REDES_PACKS: Record<
  RedesPack,
  { label: string; euros: number; tag: string; blurb: string }
> = {
  barrio: {
    label: "Barrio",
    euros: 150,
    tag: "Entrada",
    blurb: "≈30 vídeos · textos · calendario · estrategia 3 meses · panel",
  },
  calle: {
    label: "Calle",
    euros: 450,
    tag: "El que más se pide",
    blurb: "Barrio + DM/WhatsApp · Google Local · stories · revisiones",
  },
  plaza: {
    label: "Plaza",
    euros: 590,
    tag: "Con tu cara",
    blurb: "Calle + guion y grabación en el local",
  },
  faro: {
    label: "Faro",
    euros: 790,
    tag: "Máxima presencia",
    blurb: "Plaza + prioridad · piezas de venta · ajuste mensual",
  },
};

export type PanelFolderKind = "recursos" | "finales";

export type PanelFolder = {
  id: string;
  name: string;
  kind: PanelFolderKind;
  createdAt: string;
};

export type PanelFile = {
  id: string;
  folderId: string;
  name: string;
  size: number;
  contentType: string;
  blobUrl: string;
  uploadedBy: "client" | "admin";
  /** Día del calendario (YYYY-MM-DD), opcional. */
  dayKey?: string;
  createdAt: string;
};

export type StrategyMonth = {
  year: number;
  month: number; // 1-12
  title: string;
  focus: string;
  goalViews: number;
  progress: number; // 0-100
};

export type PanelClient = {
  id: string;
  slug: string;
  name: string;
  email: string;
  passwordHash: string;
  pack: RedesPack;
  active: boolean;
  contractAcceptedAt?: string;
  contractVersion?: string;
  strategyStart: string; // ISO date of month 1
  strategy: StrategyMonth[];
  folders: PanelFolder[];
  files: PanelFile[];
  createdAt: string;
  updatedAt: string;
};

type PanelStore = {
  clients: Record<string, PanelClient>;
};

export type PanelSession =
  | { role: "admin"; email: string; exp: number }
  | { role: "client"; clientId: string; email: string; exp: number };

export { CONTRACT_VERSION, SUPER_EMAIL };

function panelSecret() {
  return (
    process.env.PANEL_SECRET ||
    process.env.DASHBOARD_SECRET ||
    process.env.DASHBOARD_PASSWORD ||
    "nfctab-panel-dev"
  );
}

function adminPasswordOk(input: string) {
  const expected = process.env.DASHBOARD_PASSWORD || "nfctab";
  return Boolean(input) && input === expected;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

function emptyStore(): PanelStore {
  return { clients: {} };
}

function filePath() {
  if (process.env.VERCEL) return path.join(tmpdir(), "nfctab-panel.json");
  return path.join(process.cwd(), "data", "panel.json");
}

async function readBlob(): Promise<PanelStore | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { get, list } = await import("@vercel/blob");
    const byPath = await get(BLOB_KEY, { access: "private" });
    if (byPath?.statusCode === 200 && byPath.stream) {
      const text = await new Response(byPath.stream).text();
      const raw = JSON.parse(text) as Partial<PanelStore>;
      return { clients: raw.clients || {} };
    }
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 5 });
    const hit = blobs.find((b) => b.pathname === BLOB_KEY || b.pathname.endsWith(BLOB_KEY));
    if (!hit) return null;
    const byUrl = await get(hit.url, { access: "private" });
    if (!byUrl || byUrl.statusCode !== 200 || !byUrl.stream) return null;
    const text = await new Response(byUrl.stream).text();
    const raw = JSON.parse(text) as Partial<PanelStore>;
    return { clients: raw.clients || {} };
  } catch {
    return null;
  }
}

async function writeBlob(data: PanelStore) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

function readDisk(): PanelStore | null {
  try {
    const p = filePath();
    if (!existsSync(p)) return null;
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<PanelStore>;
    return { clients: raw.clients || {} };
  } catch {
    return null;
  }
}

function writeDisk(data: PanelStore) {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2));
  } catch {
    /* ok */
  }
}

declare global {
  var __nfctab_panel: PanelStore | undefined;
}

async function load(): Promise<PanelStore> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const fromBlob = await readBlob();
    const mem = globalThis.__nfctab_panel;
    if (fromBlob) {
      if (mem?.clients) {
        for (const [k, v] of Object.entries(mem.clients)) {
          const blobC = fromBlob.clients[k];
          if (!blobC || v.updatedAt > (blobC.updatedAt || "")) {
            fromBlob.clients[k] = v;
          }
        }
      }
      globalThis.__nfctab_panel = fromBlob;
      return fromBlob;
    }
    return mem ?? emptyStore();
  }
  if (!globalThis.__nfctab_panel) {
    globalThis.__nfctab_panel = readDisk() ?? emptyStore();
  }
  return globalThis.__nfctab_panel;
}

async function persist(data: PanelStore) {
  globalThis.__nfctab_panel = data;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeBlob(data);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("Falta BLOB_READ_WRITE_TOKEN en Vercel para el panel.");
  }
  writeDisk(data);
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

export function slugify(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function slugOk(slug: string) {
  return ID_RE.test(slug);
}

function defaultFolders(now: string): PanelFolder[] {
  return [
    { id: newId("fld"), name: "Recursos (tú subes)", kind: "recursos", createdAt: now },
    { id: newId("fld"), name: "Finales (listos para publicar)", kind: "finales", createdAt: now },
  ];
}

function defaultStrategy(startIso: string): StrategyMonth[] {
  const start = new Date(startIso);
  const y0 = start.getUTCFullYear();
  const m0 = start.getUTCMonth(); // 0-11
  const titles = ["Mes 1 · Arranque", "Mes 2 · Ritmo", "Mes 3 · Consolidar"];
  const focuses = [
    "Publicar cada día · voz del negocio · primeras reseñas y alcance local",
    "Repetir lo que funciona · stories · mensajes · Google Local",
    "Piezas de venta · retención · preparar el siguiente trimestre",
  ];
  return [0, 1, 2].map((i) => {
    const d = new Date(Date.UTC(y0, m0 + i, 1));
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      title: titles[i],
      focus: focuses[i],
      goalViews: i === 0 ? 15000 : i === 1 ? 35000 : 55000,
      progress: 0,
    };
  });
}

export function monthLabel(m: StrategyMonth) {
  const names = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${names[m.month - 1]} ${m.year}`;
}

export function strategyOverallProgress(strategy: StrategyMonth[]) {
  if (!strategy.length) return 0;
  return Math.round(strategy.reduce((a, m) => a + m.progress, 0) / strategy.length);
}

export function currentStrategyMonth(strategy: StrategyMonth[], now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return strategy.find((s) => s.year === y && s.month === m) || strategy[0] || null;
}

export function contractText(clientName: string, pack: RedesPack) {
  const p = REDES_PACKS[pack];
  return `CONTRATO DE SERVICIOS DE REDES · NFCTap
Versión ${CONTRACT_VERSION}

Entre NFCTap (nfctap.tech), con contacto en ${SUPER_EMAIL}, y «${clientName}» (el Cliente).

1. Objeto
Servicio de contenidos para redes sociales según el pack «${p.label}» (${p.euros} €/mes + IVA): ${p.blurb}.
Volumen orientativo: mínimo 1 vídeo/día (≈30/mes), ≈22 s, para Instagram, TikTok, Facebook y YouTube Shorts, con estrategia a 3 meses.

2. Panel del cliente
El Cliente dispone de un acceso privado en nfctap.tech/panel para:
- Subir recursos (vídeos, referencias) en carpetas propias.
- Descargar los vídeos finales preparados por NFCTap.
- Ver la estrategia del mes y el progreso del trimestre.
Los datos de un Cliente no son accesibles por otros clientes (aislamiento multi-tenant).

3. Duración y pago
Facturación mes a mes, sin permanencia. El pago se realiza por Polar (factura). El servicio se inicia tras el primer pago y la aceptación de este contrato.

4. Propiedad y uso
Los recursos que sube el Cliente siguen siendo suyos. Los finales entregados pueden usarse en las redes del negocio. NFCTap puede mostrar piezas anonimizadas en su portfolio salvo pacto contrario por escrito.

5. Protección de datos (RGPD · España)
Responsable: NFCTap · ${SUPER_EMAIL}.
Finalidad: prestar el servicio de redes y gestionar el panel.
Base jurídica: ejecución del contrato y consentimiento.
Conservación: mientras dure el servicio y los plazos legales de facturación.
Derechos: acceso, rectificación, supresión, limitación, portabilidad y oposición escribiendo a ${SUPER_EMAIL}.
No se ceden datos a terceros ajenos al servicio salvo obligaciones legales o procesadores necesarios (alojamiento Vercel, Blob, Polar).
El Cliente se compromete a no subir contenidos ilícitos ni datos de terceros sin base legal.

6. Confidencialidad
Ambas partes guardarán confidencialidad sobre credenciales, materiales y estrategia.

7. Limitación
Las estimaciones de views son orientativas (orgánico, sin ads). NFCTap no garantiza un número concreto de visualizaciones.

Al aceptar, el Cliente confirma haber leído estas condiciones y el tratamiento de datos personales.`;
}

function signSession(payload: PanelSession) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", panelSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function parseSession(raw: string | undefined): PanelSession | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expect = createHmac("sha256", panelSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PanelSession;
    if (!data.exp || data.exp < Date.now()) return null;
    if (data.role === "admin" && data.email === SUPER_EMAIL) return data;
    if (data.role === "client" && data.clientId && data.email) return data;
    return null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function getPanelSession(): Promise<PanelSession | null> {
  const jar = await cookies();
  return parseSession(jar.get(SESSION_COOKIE)?.value);
}

export async function setPanelSession(session: PanelSession) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(session), sessionCookieOptions());
}

export async function clearPanelSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export function publicClient(c: PanelClient) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    email: c.email,
    pack: c.pack,
    packMeta: REDES_PACKS[c.pack],
    active: c.active,
    contractAccepted: Boolean(c.contractAcceptedAt && c.contractVersion === CONTRACT_VERSION),
    contractAcceptedAt: c.contractAcceptedAt || null,
    contractVersion: CONTRACT_VERSION,
    strategyStart: c.strategyStart,
    strategy: c.strategy,
    overallProgress: strategyOverallProgress(c.strategy),
    currentMonth: currentStrategyMonth(c.strategy),
    folders: c.folders,
    files: c.files.map((f) => ({
      id: f.id,
      folderId: f.folderId,
      name: f.name,
      size: f.size,
      contentType: f.contentType,
      uploadedBy: f.uploadedBy,
      dayKey: f.dayKey || null,
      createdAt: f.createdAt,
      downloadPath: `/api/panel/files/${f.id}/download`,
    })),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export async function loginPanel(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) return { ok: false as const, error: "Email y contraseña" };

  if (email === SUPER_EMAIL) {
    if (!adminPasswordOk(password)) {
      return { ok: false as const, error: "Credenciales incorrectas" };
    }
    const session: PanelSession = {
      role: "admin",
      email: SUPER_EMAIL,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
    };
    return { ok: true as const, session, redirect: "/panel/admin" };
  }

  const data = await load();
  const client = Object.values(data.clients).find((c) => c.email === email && c.active);
  if (!client || !verifyPassword(password, client.passwordHash)) {
    return { ok: false as const, error: "Credenciales incorrectas" };
  }
  const session: PanelSession = {
    role: "client",
    clientId: client.id,
    email: client.email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  const needsContract = !(
    client.contractAcceptedAt && client.contractVersion === CONTRACT_VERSION
  );
  return {
    ok: true as const,
    session,
    redirect: needsContract ? "/panel/contrato" : "/panel/app",
  };
}

export async function listClients() {
  const data = await load();
  return Object.values(data.clients)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicClient);
}

export async function getClient(id: string) {
  const data = await load();
  return data.clients[id] || null;
}

export async function getClientForSession(session: PanelSession) {
  if (session.role === "admin") return null;
  return getClient(session.clientId);
}

export async function createClient(input: {
  name: string;
  email: string;
  password: string;
  pack: RedesPack;
  slug?: string;
}) {
  const name = input.name.replace(/\s+/g, " ").trim().slice(0, 80);
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!name || !email || password.length < 8) {
    throw new Error("Nombre, email y contraseña (mín. 8) obligatorios");
  }
  if (email === SUPER_EMAIL) throw new Error("Ese email es del superadmin");
  if (!Object.keys(REDES_PACKS).includes(input.pack)) throw new Error("Pack inválido");

  const data = await load();
  if (Object.values(data.clients).some((c) => c.email === email)) {
    throw new Error("Ya existe un cliente con ese email");
  }

  let slug = slugify(input.slug || name);
  if (!slugOk(slug)) slug = `cli-${randomBytes(3).toString("hex")}`;
  if (Object.values(data.clients).some((c) => c.slug === slug)) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }

  const now = new Date().toISOString();
  const id = newId("cli");
  const client: PanelClient = {
    id,
    slug,
    name,
    email,
    passwordHash: hashPassword(password),
    pack: input.pack,
    active: true,
    strategyStart: now.slice(0, 10),
    strategy: defaultStrategy(now),
    folders: defaultFolders(now),
    files: [],
    createdAt: now,
    updatedAt: now,
  };
  data.clients[id] = client;
  await persist(data);
  return publicClient(client);
}

export async function acceptContract(clientId: string) {
  const data = await load();
  const c = data.clients[clientId];
  if (!c) throw new Error("Cliente no encontrado");
  c.contractAcceptedAt = new Date().toISOString();
  c.contractVersion = CONTRACT_VERSION;
  c.updatedAt = c.contractAcceptedAt;
  await persist(data);
  return publicClient(c);
}

export async function updateStrategyMonth(
  clientId: string,
  year: number,
  month: number,
  patch: Partial<Pick<StrategyMonth, "title" | "focus" | "goalViews" | "progress">>,
) {
  const data = await load();
  const c = data.clients[clientId];
  if (!c) throw new Error("Cliente no encontrado");
  const m = c.strategy.find((s) => s.year === year && s.month === month);
  if (!m) throw new Error("Mes no encontrado");
  if (patch.title !== undefined) m.title = patch.title.trim().slice(0, 80);
  if (patch.focus !== undefined) m.focus = patch.focus.trim().slice(0, 280);
  if (patch.goalViews !== undefined) {
    m.goalViews = Math.max(0, Math.min(5_000_000, Math.round(Number(patch.goalViews) || 0)));
  }
  if (patch.progress !== undefined) {
    m.progress = Math.max(0, Math.min(100, Math.round(Number(patch.progress) || 0)));
  }
  c.updatedAt = new Date().toISOString();
  await persist(data);
  return publicClient(c);
}

export async function addFolder(clientId: string, name: string, kind: PanelFolderKind) {
  const data = await load();
  const c = data.clients[clientId];
  if (!c) throw new Error("Cliente no encontrado");
  const n = name.replace(/\s+/g, " ").trim().slice(0, 60);
  if (!n) throw new Error("Nombre vacío");
  if (c.folders.length >= 40) throw new Error(" demasiadas carpetas");
  const folder: PanelFolder = {
    id: newId("fld"),
    name: n,
    kind,
    createdAt: new Date().toISOString(),
  };
  c.folders.unshift(folder);
  c.updatedAt = folder.createdAt;
  await persist(data);
  return { client: publicClient(c), folder };
}

export async function registerFile(
  clientId: string,
  input: {
    folderId: string;
    name: string;
    size: number;
    contentType: string;
    blobUrl: string;
    uploadedBy: "client" | "admin";
    dayKey?: string;
  },
) {
  const data = await load();
  const c = data.clients[clientId];
  if (!c) throw new Error("Cliente no encontrado");
  const folder = c.folders.find((f) => f.id === input.folderId);
  if (!folder) throw new Error("Carpeta no encontrada");
  if (c.files.length >= 500) throw new Error("Límite de archivos");
  if (input.size > 500 * 1024 * 1024) throw new Error("Archivo demasiado grande (máx. 500 MB)");

  const safeName = input.name.replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]+/gi, "_").slice(0, 120) || "video.mp4";
  const file: PanelFile = {
    id: newId("fil"),
    folderId: input.folderId,
    name: safeName,
    size: input.size,
    contentType: input.contentType || "application/octet-stream",
    blobUrl: input.blobUrl,
    uploadedBy: input.uploadedBy,
    dayKey: input.dayKey?.match(/^\d{4}-\d{2}-\d{2}$/) ? input.dayKey : undefined,
    createdAt: new Date().toISOString(),
  };
  c.files.unshift(file);
  c.updatedAt = file.createdAt;
  await persist(data);
  return { client: publicClient(c), file };
}

export async function findFile(fileId: string) {
  const data = await load();
  for (const c of Object.values(data.clients)) {
    const f = c.files.find((x) => x.id === fileId);
    if (f) return { client: c, file: f };
  }
  return null;
}

export async function deleteFile(clientId: string, fileId: string) {
  const data = await load();
  const c = data.clients[clientId];
  if (!c) throw new Error("Cliente no encontrado");
  const file = c.files.find((f) => f.id === fileId);
  if (!file) throw new Error("Archivo no encontrado");
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { del } = await import("@vercel/blob");
      await del(file.blobUrl);
    } catch {
      /* ok */
    }
  }
  c.files = c.files.filter((f) => f.id !== fileId);
  c.updatedAt = new Date().toISOString();
  await persist(data);
  return publicClient(c);
}

export function assertClientAccess(session: PanelSession, clientId: string) {
  if (session.role === "admin") return true;
  return session.role === "client" && session.clientId === clientId;
}

export function blobPathForUpload(clientId: string, folderId: string, filename: string) {
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const stamp = createHash("sha256")
    .update(`${clientId}:${folderId}:${Date.now()}:${randomBytes(4).toString("hex")}`)
    .digest("hex")
    .slice(0, 12);
  return `panel/${clientId}/${folderId}/${stamp}-${safe}`;
}

export function calendarDaysForMonth(year: number, month: number, files: PanelFile[]) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayFiles = files.filter((f) => f.dayKey === key);
    days.push({
      day: d,
      key,
      hasFinal: dayFiles.some((f) => f.uploadedBy === "admin"),
      hasRecurso: dayFiles.some((f) => f.uploadedBy === "client"),
      count: dayFiles.length,
    });
  }
  return days;
}
