import { BRAND, SOCIALS, unicaPrice } from "@/lib/catalog";
import type { TouchKind } from "./queue";

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

function optOutHref(v: OutreachVars) {
  return (
    v.optOutUrl?.trim() ||
    `mailto:${BRAND.email}?subject=${encodeURIComponent("baja")}&body=${encodeURIComponent("Quiero darme de baja de los emails de NFCTap.")}`
  );
}

function copyForTouch(v: OutreachVars, touch: TouchKind) {
  const name = displayName(v);
  const city = displayCity(v);
  const price1 = unicaPrice(1);
  const price2 = unicaPrice(2);
  const web = normalizeWeb(v.websiteUrl);
  const host = web ? displayHost(web) : "";

  if (touch === "fu_click") {
    return {
      subject: name
        ? `${name}: te faltó un minuto para tu pieza NFC`
        : `${city}: tu pieza NFC sigue a un paso`,
      preheader: `Pasaste por nfctap.tech. Logo + chips NFC desde ${price1} €. Termina el pedido en 1 minuto.`,
      headline: "Te faltó un minuto",
      ctaLabel: "Terminar mi pieza →",
      paragraphs: [
        name
          ? `Hola otra vez — vimos que entrasteis en la web desde el mail de <strong>${escapeHtml(name)}</strong> (${escapeHtml(city)}).`
          : `Hola otra vez — vimos que entrasteis en la web desde nuestro mail a un negocio de ${escapeHtml(city)}.`,
        `Si os encajó la idea: atril con <strong>vuestro logo</strong> y <strong>chips NFC</strong> (el cliente acerca el móvil → web, Google, Instagram o WhatsApp). Sin app.`,
        `Desde <strong>${price1}&nbsp;€</strong> (1 chip) · <strong>${price2}&nbsp;€</strong> (2 chips). Elegís diseño, pagáis e imprimimos en España (~2 días).`,
      ],
      closing:
        "Si no es el momento, no pasa nada. Si preferís no recibir más mensajes, un clic en darse de baja basta (RGPD).",
    };
  }

  if (touch === "fu_open") {
    return {
      subject: name
        ? `${name} (${city}): el chip NFC en 20 segundos`
        : `${city}: el chip NFC en 20 segundos`,
      preheader: `Como el pago sin contacto: acercáis el móvil al atril y abre vuestro enlace. Desde ${price1} €.`,
      headline: "El chip NFC, en 20 segundos",
      ctaLabel: "Ver y crear la pieza →",
      paragraphs: [
        name
          ? `Hola — os escribí por <strong>${escapeHtml(name)}</strong> en ${escapeHtml(city)}.`
          : `Hola — os escribí a un negocio de ${escapeHtml(city)}.`,
        `Un <strong>atril con vuestro logo</strong> lleva dentro chips NFC (igual que el del datáfono): el cliente toca con el móvil y entra en <strong>vuestra web, reseñas, Instagram o WhatsApp</strong>.`,
        web
          ? `Pensé en vosotros al ver <a href="${escapeAttr(web)}" style="color:#1c1915;font-weight:600;">${escapeHtml(host)}</a>. Desde <strong>${price1}&nbsp;€</strong> · se crea en 1 minuto en la web.`
          : `Desde <strong>${price1}&nbsp;€</strong> · se crea en 1 minuto en la web · envío en unos 2 días.`,
      ],
      closing:
        "Si no os interesa, podéis daros de baja abajo (interés legítimo B2B · art. 6.1.f RGPD).",
    };
  }

  if (touch === "fu_silent") {
    return {
      subject: name ? `${name}: última nota sobre el atril NFC` : `${city}: última nota · atril NFC`,
      preheader: `Un toque del móvil → vuestro enlace. Pieza con logo desde ${price1} €. Baja fácil si no aplica.`,
      headline: "Una última nota",
      ctaLabel: "Crear pieza NFC →",
      paragraphs: [
        name
          ? `Hola — os contacté por <strong>${escapeHtml(name)}</strong> (${escapeHtml(city)}) sobre un atril NFC con logo.`
          : `Hola — os contacté por un negocio de ${escapeHtml(city)} sobre un atril NFC con logo.`,
        `Si os puede servir para reseñas Google, Instagram o WhatsApp en barra/mostrador: <strong>desde ${price1}&nbsp;€</strong>, pedido online en un minuto.`,
        `Si no encaja, ignorad este mail o dados de baja — no insistiremos más por esta vía.`,
      ],
      closing: "Cumplimos RGPD: solo email público · baja en un clic · art. 6.1.f interés legítimo B2B.",
    };
  }

  // cold
  const webLine = web
    ? `Vi vuestra web (<a href="${escapeAttr(web)}" style="color:#1c1915;font-weight:600;">${escapeHtml(host)}</a>) y pensé que os puede encajar.`
    : `Os escribo por el email de contacto público del negocio.`;
  return {
    subject: name
      ? `${name}: crea tu pieza NFC en 1 minuto`
      : `${city}: crea tu pieza NFC en 1 minuto`,
    preheader: name
      ? `${name} (${city}): atril con tu logo y chips NFC. El cliente acerca el móvil y abre tu enlace. Crea la pieza en 1 minuto.`
      : `Atril con tu logo y chips NFC · ${city}. Un toque del móvil y entra en web, Instagram o WhatsApp. Crea tu pieza en 1 minuto.`,
    headline: "Crea tu pieza NFC en 1&nbsp;minuto",
    ctaLabel: "Crea tu pieza en 1 minuto →",
    paragraphs: [
      name
        ? `Hola, escribo por <strong>${escapeHtml(name)}</strong> en ${escapeHtml(city)}.`
        : `Hola, escribo a un negocio de ${escapeHtml(city)}.`,
      `Somos <strong>nfctap.tech</strong>. ${webLine}`,
      `Fabricamos un <strong>atril personalizado con el logo de tu negocio</strong> y dentro van <strong>chips NFC</strong> (como el del pago sin contacto): el cliente acerca el móvil y abre <strong>tu web, Google, Instagram o WhatsApp</strong> — el enlace que tú elijas. Sin app. Sin QR borroso.`,
      `En la web eliges logo y chips, pagas, e imprimimos en España. <strong>Desde ${price1}&nbsp;€</strong> (1 chip) · <strong>${price2}&nbsp;€</strong> (2 chips). Envío en unos 2 días.`,
    ],
    closing:
      "Si te encaja, en un minuto dejas el pedido. Si no, no pasa nada — y si prefieres no recibir más mails, basta un clic abajo.",
  };
}

/** Asunto según toque (cold / FU). */
export function nfctapOutreachSubject(v: OutreachVars, touch: TouchKind = "cold") {
  return copyForTouch(v, touch).subject;
}

/** HTML · personalizado · RGPD en todos los toques. */
export function nfctapOutreachHtml(v: OutreachVars, touch: TouchKind = "cold") {
  const name = displayName(v);
  const city = displayCity(v);
  const hero = touch === "fu_click" || touch === "fu_silent" ? MARKOS : v.heroImageUrl || FREDDOS;
  const second =
    touch === "cold" ? v.secondImageUrl || MARKOS : touch === "fu_open" ? FREDDOS : "";
  const optOut = optOutHref(v);
  const copy = copyForTouch(v, touch);
  const socialHtml = SOCIAL_LINKS.map(
    (s) =>
      `<a href="${escapeAttr(s.href)}" style="color:#1c1915;text-decoration:underline;margin-right:12px;">${escapeHtml(s.label)}</a>`,
  ).join("");
  const bodyParas = copy.paragraphs
    .map(
      (p) =>
        `<p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:#3f3a34;">${p}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3eee4;font-family:Georgia,'Times New Roman',serif;color:#1c1915;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(copy.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3eee4;padding:24px 12px;border-collapse:collapse;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5dccf;border-collapse:collapse;">
        <tr><td style="padding:18px 28px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#b0892c;">
          nfctap.tech · ${escapeHtml(city)}${touch !== "cold" ? " · seguimiento" : ""}
        </td></tr>
        <tr><td style="padding:10px 28px 0;">
          <img src="${escapeAttr(hero)}" alt="Atril con logo y chips NFC — NFCTap" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:12px;" />
        </td></tr>
        <tr><td style="padding:22px 28px 8px;">
          <h1 style="margin:0;font-size:24px;line-height:1.28;font-weight:700;color:#1c1915;">
            ${copy.headline}
          </h1>
          ${bodyParas}
          <p style="margin:22px 0 0;">
            <a href="${CTA}" style="display:inline-block;background:#1c1915;color:#f6f1e7;text-decoration:none;padding:15px 28px;border-radius:999px;font-size:16px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
              ${escapeHtml(copy.ctaLabel)}
            </a>
          </p>
          <p style="margin:12px 0 0;font-size:13px;line-height:1.45;color:#8a8173;font-family:Arial,Helvetica,sans-serif;">
            ${CTA.replace("https://", "")} · sin compromiso · ves el diseño antes de pagar
          </p>
        </td></tr>
        ${
          second
            ? `<tr><td style="padding:8px 28px 4px;">
          <img src="${escapeAttr(second)}" alt="Ejemplo de pieza NFC personalizada" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:12px;" />
        </td></tr>`
            : ""
        }
        <tr><td style="padding:16px 28px 4px;font-size:15px;line-height:1.5;color:#3f3a34;">
          ${copy.closing}
        </td></tr>
        <tr><td style="padding:14px 28px 6px;font-size:13px;color:#5c564c;font-family:Arial,Helvetica,sans-serif;">
          ${socialHtml}
        </td></tr>
        <tr><td style="padding:10px 28px 26px;font-size:12px;color:#a39a8c;line-height:1.55;font-family:Arial,Helvetica,sans-serif;">
          Un saludo,<br />
          <strong style="color:#5c564c;">NFCTap</strong> · España ·
          <a href="${BRAND.url}" style="color:#8a8173;">${BRAND.domain}</a><br /><br />
          Te escribimos por un email de contacto público${name ? ` de ${escapeHtml(name)}` : ""} en ${escapeHtml(city)}.
          Base legal: interés legítimo (art. 6.1.f RGPD) · prospección B2B con datos públicos.
          Si no quieres más mensajes:
          <a href="${escapeAttr(optOut)}" style="color:#1c1915;font-weight:600;">darse de baja</a>
          · responde «baja» ·
          <a href="${BRAND.url}/legal" style="color:#8a8173;">aviso legal</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function nfctapOutreachText(v: OutreachVars, touch: TouchKind = "cold") {
  const name = displayName(v);
  const city = displayCity(v);
  const copy = copyForTouch(v, touch);
  const optOut = optOutHref(v);
  const socials = SOCIAL_LINKS.map((s) => `${s.label}: ${s.href}`).join("\n");
  const plainParas = copy.paragraphs
    .map((p) =>
      p
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&"),
    )
    .join("\n\n");

  return `${copy.headline.replace(/&nbsp;/g, " ")}

${plainParas}

${copy.ctaLabel}
${CTA}

${copy.closing.replace(/<[^>]+>/g, "")}

${socials}

Un saludo,
NFCTap · ${BRAND.url}

Te escribimos por email de contacto público${name ? ` de ${name}` : ""} en ${city}.
Base legal: interés legítimo (art. 6.1.f RGPD) · prospección B2B.
Baja: ${optOut}
O responde «baja». Aviso legal: ${BRAND.url}/legal`;
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
