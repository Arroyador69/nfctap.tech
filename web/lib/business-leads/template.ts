import { BRAND, SOCIALS, unicaPrice } from "@/lib/catalog";

export type OutreachVars = {
  /** Nombre real del negocio (OSM). Vacío → copy genérico sin “Café de prueba”. */
  businessName?: string;
  /** Ciudad del lead — siempre la del sitio, nunca fija. */
  city: string;
  websiteUrl?: string;
  heroImageUrl?: string;
  secondImageUrl?: string;
  /** URL de baja RGPD (si no, mailto). */
  optOutUrl?: string;
};

const FREDDOS = `${BRAND.url}/stock/freddos.jpg`;
const MARKOS = `${BRAND.url}/stock/markos.jpg`;
const CTA = `${BRAND.url}/negocio`;

const SOCIAL_LINKS = SOCIALS.map((s) =>
  s.id === "youtube" ? { ...s, href: "https://www.youtube.com/@NFCTap" } : s,
);

function displayName(v: OutreachVars) {
  const n = (v.businessName || "").trim();
  if (!n || /^hola$/i.test(n) || /^tu negocio$/i.test(n) || /^café de prueba$/i.test(n)) {
    return "";
  }
  return n.slice(0, 48);
}

function displayCity(v: OutreachVars) {
  return (v.city || "").trim() || "tu zona";
}

/** HTML cold email · cualquier tipo de negocio · ciudad del lead · RGPD. */
export function nfctapOutreachHtml(v: OutreachVars) {
  const name = displayName(v);
  const city = displayCity(v);
  const price = unicaPrice(2);
  const hero = v.heroImageUrl || FREDDOS;
  const second = v.secondImageUrl || MARKOS;
  const web = normalizeWeb(v.websiteUrl);
  const optOut =
    v.optOutUrl?.trim() ||
    `mailto:${BRAND.email}?subject=${encodeURIComponent("baja")}&body=${encodeURIComponent("Quiero darme de baja de los emails de NFCTap.")}`;
  const webLine = web
    ? `Hemos visto <a href="${escapeAttr(web)}" style="color:#1c1915;">${escapeHtml(displayHost(web))}</a>.`
    : `Contacto público de un negocio en ${escapeHtml(city)}.`;
  const greet = name
    ? `<strong>${escapeHtml(name)}</strong> · `
    : "";

  const socialHtml = SOCIAL_LINKS.map(
    (s) =>
      `<a href="${escapeAttr(s.href)}" style="color:#1c1915;text-decoration:underline;margin-right:12px;">${escapeHtml(s.label)}</a>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f7f3eb;font-family:Georgia,'Times New Roman',serif;color:#1c1915;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3eb;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6ddd0;">
        <tr><td>
          <img src="${escapeAttr(hero)}" alt="Pieza NFC con logo — NFCTap" width="560" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>
        <tr><td style="padding:28px 28px 4px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#b0892c;">nfctap.tech · ${escapeHtml(city)}</p>
          <h1 style="margin:12px 0 0;font-size:26px;line-height:1.25;font-weight:700;">
            Tu logo en la barra.<br />El cliente toca y entra.
          </h1>
          <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:#5c564c;">
            ${greet}Somos <strong>nfctap.tech</strong>. Fabricamos en España una pieza NFC con tu marca
            para <strong>cualquier negocio</strong>: peluquería, hotel, clínica, tienda, oficina, bar o el que sea.
            El cliente acerca el móvil y abre web, Google, Instagram, WhatsApp o el enlace que elijas.
            ${webLine}
            Encargo en <strong>menos de 2 minutos</strong> · fabricación y envío en <strong>unos 2 días</strong>.
            Desde <strong>${price} €</strong> con 2 chips.
          </p>
          <p style="margin:22px 0 0;">
            <a href="${CTA}" style="display:inline-block;background:#1c1915;color:#f6f1e7;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:15px;font-weight:600;">
              Encargar en 2 minutos
            </a>
          </p>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#6f675c;">
            Otros servicios (web, redes, app móvil):
            <a href="mailto:${BRAND.email}?subject=${encodeURIComponent("Otros servicios NFCTap")}" style="color:#1c1915;">póngase en contacto</a>
            · ${BRAND.email}
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px 8px;">
          <img src="${escapeAttr(second)}" alt="Pieza NFC — NFCTap" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:14px;" />
        </td></tr>
        <tr><td style="padding:12px 28px 8px;font-size:13px;color:#5c564c;">
          ${socialHtml}
        </td></tr>
        <tr><td style="padding:8px 28px 28px;font-size:12px;color:#a39a8c;line-height:1.55;">
          NFCTap · España · <a href="${BRAND.url}" style="color:#8a8173;">${BRAND.domain}</a><br />
          Te escribimos por un email de contacto público${name ? ` de ${escapeHtml(name)}` : ""} en ${escapeHtml(city)}.
          Base legal: interés legítimo (art. 6.1.f RGPD) · prospección B2B con datos públicos.
          Si no quieres más mensajes:
          <a href="${escapeAttr(optOut)}" style="color:#1c1915;font-weight:600;">darse de baja</a>
          · responde «baja» ·
          <a href="${BRAND.url}/legal" style="color:#8a8173;">aviso legal / RGPD</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function nfctapOutreachText(v: OutreachVars) {
  const name = displayName(v);
  const city = displayCity(v);
  const price = unicaPrice(2);
  const web = normalizeWeb(v.websiteUrl);
  const optOut = v.optOutUrl?.trim() || `mailto:${BRAND.email}?subject=baja`;
  const webBit = web
    ? `Hemos visto ${displayHost(web)}.`
    : `Contacto público en ${city}.`;
  const socials = SOCIAL_LINKS.map((s) => `${s.label}: ${s.href}`).join("\n");
  const who = name ? `${name} · ` : "";

  return `Tu logo en la barra. El cliente toca y entra.

${who}Somos nfctap.tech (${city}). Pieza NFC con tu marca para cualquier negocio
(peluquería, hotel, clínica, tienda, oficina, bar…).
${webBit}
Encargo en menos de 2 minutos · envío en unos 2 días. Desde ${price} € con 2 chips.

Encargar: ${CTA}

Otros servicios (web, redes, app): ${BRAND.email}

${socials}

Baja (RGPD · interés legítimo B2B): ${optOut}
O responde «baja». Aviso legal: ${BRAND.url}/legal`;
}

export function nfctapOutreachSubject(v: OutreachVars) {
  const name = displayName(v);
  const city = displayCity(v);
  if (name) return `${name} (${city}): tu logo en la barra`;
  return `${city}: tu logo en la barra. El cliente toca y entra`;
}

function normalizeWeb(raw?: string) {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
  return "";
}

function displayHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
