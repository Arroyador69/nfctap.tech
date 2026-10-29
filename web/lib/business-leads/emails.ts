/** Extracción / filtro de emails públicos (RGPD: solo contacto publicado). */

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24}/g;
const MAILTO_RE =
  /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24})/gi;

const PLAUSIBLE_TLDS = new Set([
  "es",
  "com",
  "net",
  "org",
  "eu",
  "gal",
  "cat",
  "eus",
  "info",
  "biz",
  "online",
  "site",
]);

const JUNK_TLDS = new Set([
  "css",
  "js",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "woff",
  "ttf",
  "php",
  "html",
  "htm",
]);

const BLOCKLIST = [
  /sentry\.io$/i,
  /example\.(com|org)$/i,
  /noreply@/i,
  /no-reply@/i,
  /wix\.com$/i,
  /googleapis\.com$/i,
  /facebook\.com$/i,
  /instagram\.com$/i,
  /\.gob\.es$/i,
];

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase().replace(/^mailto:/i, "");
}

export function isPlausiblePublicEmail(email: string) {
  const e = normalizeEmail(email);
  if (!e.includes("@") || e.length < 6 || e.length > 254) return false;
  if (BLOCKLIST.some((re) => re.test(e))) return false;
  const [local, domain] = e.split("@");
  if (!local || !domain || !domain.includes(".")) return false;
  if (!/^[a-z0-9._%+\-]+$/i.test(local)) return false;
  const tld = domain.split(".").pop()?.toLowerCase() || "";
  if (JUNK_TLDS.has(tld) || !PLAUSIBLE_TLDS.has(tld)) return false;
  return true;
}

export function extractEmailsFromText(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(MAILTO_RE)) {
    const e = normalizeEmail(m[1] || "");
    if (isPlausiblePublicEmail(e)) found.add(e);
  }
  for (const m of html.matchAll(EMAIL_RE)) {
    const e = normalizeEmail(m[0] || "");
    if (isPlausiblePublicEmail(e)) found.add(e);
  }
  return [...found];
}

export function normalizeUrl(raw: string): string {
  let s = (raw || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/^https?:$/i.test(u.protocol)) return "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}
