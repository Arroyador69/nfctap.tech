import { BRAND, unicaPrice } from "@/lib/catalog";

export type OutreachVars = {
  /** Nombre del negocio (saludo). */
  businessName: string;
  /** Ciudad / zona del lead — siempre la del negocio al que escribimos. */
  city: string;
  /** Web pública del negocio, si la tenemos. */
  websiteUrl?: string;
  /** Override hero (pieza en barra). */
  heroImageUrl?: string;
  /** Segunda foto de producto. */
  secondImageUrl?: string;
};

const FREDDOS = `${BRAND.url}/stock/freddos.jpg`;
const MARKOS = `${BRAND.url}/stock/markos.jpg`;
const CTA = `${BRAND.url}/negocio`;

/** HTML cold email · conversión → /negocio (80 € · 2 chips). Sin nombres personales. */
export function nfctapOutreachHtml(v: OutreachVars) {
  const name = v.businessName?.trim() || "Hola";
  const city = v.city?.trim() || "tu zona";
  const price = unicaPrice(2);
  const hero = v.heroImageUrl || FREDDOS;
  const second = v.secondImageUrl || MARKOS;
  const web = normalizeWeb(v.websiteUrl);
  const webLine = web
    ? `Hemos visto <a href="${escapeAttr(web)}" style="color:#1c1915;">${escapeHtml(displayHost(web))}</a> y creemos que encaja con lo que hacemos.`
    : `Te escribimos porque encontramos el contacto público de tu negocio en ${escapeHtml(city)}.`;

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f7f3eb;font-family:Georgia,'Times New Roman',serif;color:#1c1915;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3eb;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6ddd0;">
        <tr><td>
          <img src="${escapeAttr(hero)}" alt="Pieza NFC con logo en la barra — NFCTap" width="560" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>
        <tr><td style="padding:28px 28px 4px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#b0892c;">NFCTap · ${escapeHtml(city)}</p>
          <h1 style="margin:12px 0 0;font-size:26px;line-height:1.28;font-weight:700;">
            ${escapeHtml(name)}: una pieza con tu logo que el cliente toca y entra
          </h1>
          <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:#5c564c;">
            Somos <strong>nfctap.tech</strong>. Diseñamos e imprimimos en España atriles NFC con
            <strong>tu marca</strong> y chips que abren lo que tú elijas: tu web, Google reseñas,
            Instagram, WhatsApp o el enlace que necesites.
          </p>
          <p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:#5c564c;">
            ${webLine}
            En la web lo encargas en <strong>menos de 2 minutos</strong>: subes el logo, eliges
            1–3 chips y pagas. Lo fabricamos y lo enviamos en <strong>unos 2 días</strong>.
          </p>
          <p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:#5c564c;">
            Base <strong>${price} €</strong> con 2 chips · puedes añadir más. Sin intermediarios:
            te hemos contactado nosotros para que sea fácil.
          </p>
          <p style="margin:24px 0 0;">
            <a href="${CTA}" style="display:inline-block;background:#1c1915;color:#f6f1e7;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:15px;font-weight:600;letter-spacing:0.02em;">
              Encargar en 2 minutos
            </a>
          </p>
          <p style="margin:10px 0 0;font-size:13px;color:#8a8173;">
            ${BRAND.url}/negocio · desde ${price} € · envío España
          </p>
        </td></tr>
        <tr><td style="padding:20px 28px 8px;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#b0892c;">Así queda en local</p>
          <img src="${escapeAttr(second)}" alt="Pieza NFC con logo — NFCTap" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:14px;" />
        </td></tr>
        <tr><td style="padding:16px 28px 28px;font-size:12px;color:#a39a8c;line-height:1.5;">
          NFCTap · taller en España · ${BRAND.email}<br />
          Contacto de ${escapeHtml(name)} en ${escapeHtml(city)}. Si no quieres más mensajes: responde «baja» o
          <a href="${BRAND.url}/legal" style="color:#8a8173;">aviso legal</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function nfctapOutreachText(v: OutreachVars) {
  const name = v.businessName?.trim() || "Hola";
  const city = v.city?.trim() || "tu zona";
  const price = unicaPrice(2);
  const web = normalizeWeb(v.websiteUrl);
  const webBit = web
    ? `Hemos visto ${displayHost(web)} y creemos que encaja.`
    : `Contacto público de tu negocio en ${city}.`;

  return `${name}: una pieza con tu logo que el cliente toca y entra

Somos nfctap.tech. Diseñamos e imprimimos en España atriles NFC con tu marca y chips que abren tu web, Google, Instagram, WhatsApp o el enlace que necesites.

${webBit}
Lo encargas en la web en menos de 2 minutos (logo + 1–3 chips + pago). Fabricación y envío en unos 2 días.

Desde ${price} € con 2 chips. Puedes añadir más.

Encargar en 2 minutos: ${CTA}

NFCTap · ${BRAND.email} · ${city}
Baja: responde «baja».`;
}

export function nfctapOutreachSubject(v: OutreachVars) {
  const name = v.businessName?.trim() || "Tu negocio";
  const city = v.city?.trim();
  if (city) return `${name} (${city}): tu logo en la barra, el cliente toca y entra`;
  return `${name}: tu logo en la barra, el cliente toca y entra`;
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
