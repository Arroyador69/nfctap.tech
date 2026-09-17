import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const BLOB_KEY = "nfctab-visits.json";
const KEEP_DAYS = 90;

export type DayVisits = {
  views: number;
  uniques: number;
  keys: string[];
  paths: Record<string, number>;
  sources: Record<string, number>;
  campaigns: Record<string, number>;
  devices: Record<string, number>;
};

export type VisitStore = {
  googleVerification?: string;
  days: Record<string, DayVisits>;
};

export type VisitHit = {
  path: string;
  source: string;
  campaign: string;
  device: string;
  key: string;
  date: string;
};

function emptyDay(): DayVisits {
  return { views: 0, uniques: 0, keys: [], paths: {}, sources: {}, campaigns: {}, devices: {} };
}

function emptyStore(): VisitStore {
  return { days: {} };
}

function filePath() {
  if (process.env.VERCEL) return path.join(tmpdir(), "nfctab-visits.json");
  return path.join(process.cwd(), "data", "visits.json");
}

export function madridDate(d = new Date()) {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
}

function dateShift(from: string, days: number) {
  const [y, m, day] = from.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function lastDates(n: number) {
  const today = madridDate();
  return Array.from({ length: n }, (_, i) => dateShift(today, -(n - 1 - i)));
}

async function readBlob(): Promise<VisitStore | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 5 });
    const hit = blobs.find((b) => b.pathname === BLOB_KEY || b.pathname.endsWith(BLOB_KEY));
    if (!hit) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return (await res.json()) as VisitStore;
  } catch {
    return null;
  }
}

async function writeBlob(data: VisitStore) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function readDisk(): VisitStore | null {
  try {
    const p = filePath();
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")) as VisitStore;
  } catch {
    return null;
  }
}

function writeDisk(data: VisitStore) {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(data));
  } catch {
    /* Vercel /tmp o disco local */
  }
}

declare global {
  var __nfctab_visits: VisitStore | undefined;
}

async function load(): Promise<VisitStore> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return (await readBlob()) ?? emptyStore();
  }
  if (!globalThis.__nfctab_visits) {
    globalThis.__nfctab_visits = readDisk() ?? emptyStore();
  }
  return globalThis.__nfctab_visits;
}

async function persist(data: VisitStore) {
  globalThis.__nfctab_visits = data;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeBlob(data);
    return;
  }
  writeDisk(data);
}

function prune(store: VisitStore) {
  const keep = new Set(lastDates(KEEP_DAYS));
  const today = madridDate();
  for (const d of Object.keys(store.days)) {
    if (!keep.has(d)) delete store.days[d];
    else if (d !== today) store.days[d].keys = [];
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isOwnHost(host: string) {
  return host === "nfctap.tech" || host === "nfctab.tech" || host.endsWith(".nfctap.tech");
}

function prettySource(raw: string) {
  const s = raw.toLowerCase();
  if (s.includes("facebook") || s === "fb" || s === "meta") return "Facebook";
  if (s.includes("instagram") || s === "ig") return "Instagram";
  if (s.includes("tiktok")) return "TikTok";
  if (s.includes("youtube") || s === "yt") return "YouTube";
  if (s.includes("google")) return "Google";
  if (s.includes("bing")) return "Bing";
  if (s.includes("polar")) return "Polar";
  return raw.slice(0, 40) || "Directo";
}

function prettyHost(host: string) {
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("facebook") || host === "fb.com" || host === "m.me") return "Facebook";
  if (host.includes("tiktok")) return "TikTok";
  if (host.includes("youtube") || host === "youtu.be") return "YouTube";
  if (host.includes("google")) return "Google";
  if (host.includes("bing")) return "Bing";
  if (host.includes("polar.sh")) return "Polar";
  if (host.includes("whatsapp")) return "WhatsApp";
  return host.slice(0, 40);
}

export function classifyVisit(href: string, referrer: string) {
  let utmSource = "";
  let utmCampaign = "";
  try {
    const u = new URL(href);
    utmSource = (u.searchParams.get("utm_source") || "").trim();
    utmCampaign = (u.searchParams.get("utm_campaign") || "").trim().slice(0, 80);
    if (!utmSource && u.searchParams.get("fbclid")) utmSource = "facebook";
    if (!utmSource && u.searchParams.get("gclid")) utmSource = "google";
    if (!utmSource && u.searchParams.get("ttclid")) utmSource = "tiktok";
  } catch {
    /* href raro */
  }
  if (utmSource) {
    return { source: prettySource(utmSource), campaign: utmCampaign };
  }
  const host = hostOf(referrer);
  if (!host || isOwnHost(host)) return { source: "Directo", campaign: "" };
  return { source: prettyHost(host), campaign: "" };
}

export function cleanPath(raw: string) {
  let p = raw.split("?")[0].split("#")[0] || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 80) p = p.slice(0, 80);
  if (p.startsWith("/dashboard") || p.startsWith("/api") || p === "/w" || p.startsWith("/w/")) return "";
  return p;
}

export function isVisitBot(ua: string) {
  return /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|lighthouse|pingdom|headless|httpclient/i.test(
    ua,
  );
}

export function visitDevice(ua: string) {
  return /mobile|android|iphone|ipad/i.test(ua) ? "Móvil" : "Ordenador";
}

export function visitorKey(ip: string | undefined, ua: string, date: string) {
  const secret = process.env.DASHBOARD_SECRET || process.env.DASHBOARD_PASSWORD || "nfctab-dev";
  return createHash("sha256")
    .update(`${ip || "0"}|${ua.slice(0, 180)}|${date}|${secret}`)
    .digest("hex")
    .slice(0, 16);
}

function bump(map: Record<string, number>, key: string) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

export async function recordVisit(hit: VisitHit) {
  const data = await load();
  prune(data);
  const day = data.days[hit.date] || emptyDay();
  day.views += 1;
  if (!day.keys.includes(hit.key)) {
    day.keys.push(hit.key);
    day.uniques += 1;
    if (day.keys.length > 4000) day.keys = day.keys.slice(-2000);
  }
  bump(day.paths, hit.path);
  bump(day.sources, hit.source);
  bump(day.campaigns, hit.campaign);
  bump(day.devices, hit.device);
  data.days[hit.date] = day;
  await persist(data);
}

function sumMaps(days: DayVisits[]) {
  const paths: Record<string, number> = {};
  const sources: Record<string, number> = {};
  const campaigns: Record<string, number> = {};
  const devices: Record<string, number> = {};
  let views = 0;
  let uniques = 0;
  for (const d of days) {
    views += d.views;
    uniques += d.uniques;
    for (const [k, v] of Object.entries(d.paths)) paths[k] = (paths[k] || 0) + v;
    for (const [k, v] of Object.entries(d.sources)) sources[k] = (sources[k] || 0) + v;
    for (const [k, v] of Object.entries(d.campaigns)) campaigns[k] = (campaigns[k] || 0) + v;
    for (const [k, v] of Object.entries(d.devices)) devices[k] = (devices[k] || 0) + v;
  }
  return { views, uniques, paths, sources, campaigns, devices };
}

function ranked(map: Record<string, number>, n = 12) {
  return Object.entries(map)
    .filter(([k]) => k)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

export async function getVisitReport() {
  const data = await load();
  const today = madridDate();
  const series = lastDates(30).map((date) => {
    const d = data.days[date];
    return {
      date,
      views: d?.views || 0,
      uniques: d?.uniques || 0,
    };
  });
  const todayDay = data.days[today] || emptyDay();
  const last7 = lastDates(7)
    .map((d) => data.days[d])
    .filter(Boolean) as DayVisits[];
  const last30 = lastDates(30)
    .map((d) => data.days[d])
    .filter(Boolean) as DayVisits[];
  const week = sumMaps(last7);
  const month = sumMaps(last30);
  return {
    today: madridDate(),
    googleVerification: data.googleVerification || "",
    todayStats: {
      views: todayDay.views,
      uniques: todayDay.uniques,
    },
    week: {
      views: week.views,
      uniques: week.uniques,
      sources: ranked(week.sources),
      paths: ranked(week.paths),
      campaigns: ranked(week.campaigns),
      devices: ranked(week.devices),
    },
    month: { views: month.views, uniques: month.uniques },
    series,
  };
}

let verificationCache = { at: 0, code: "" };

export async function googleVerificationCode() {
  const env = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (env) return env;
  if (Date.now() - verificationCache.at < 120_000) return verificationCache.code;
  const data = await load();
  verificationCache = { at: Date.now(), code: data.googleVerification?.trim() || "" };
  return verificationCache.code;
}

export function validGoogleVerification(code: string) {
  return /^[A-Za-z0-9_-]{10,100}$/.test(code.trim());
}

export async function setGoogleVerification(code: string) {
  const data = await load();
  data.googleVerification = code.trim();
  verificationCache = { at: 0, code: data.googleVerification };
  await persist(data);
  return data.googleVerification;
}
