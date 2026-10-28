import { BRAND, unicaPrice } from "@/lib/catalog";

export type OutreachVars = {
  businessName: string;
  city: string;
  /** Absolute URL to Markos hero (CDN or site). */
  heroImageUrl?: string;
};

/** HTML del cold email. Primera imagen = Markos (referencia producto). */
export function nfctapOutreachHtml(v: OutreachVars) {
  const hero =
    v.heroImageUrl || `${BRAND.url}/stock/markos.jpg`;
  const name = v.businessName?.trim() || "hola";
  const city = v.city?.trim() || "tu zona";
  const price = unicaPrice(2);

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f7f3eb;font-family:Georgia,serif;color:#1c1915;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3eb;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6ddd0;">
        <tr><td>
          <img src="${hero}" alt="Atril NFC con logo — NFCTap" width="560" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#b0892c;">NFCTap · ${city}</p>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">${escapeHtml(name)}, ¿y si el cliente toca y deja reseña?</h1>
          <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:#5c564c;">
            Fabricamos atriles NFC con <strong>tu logo</strong> (como el de la foto). El móvil abre Google, Instagram o el enlace que elijas.
            Desde <strong>${price} €</strong> con 2 chips. Envío a toda España.
          </p>
          <p style="margin:22px 0 0;">
            <a href="${BRAND.url}/negocio" style="display:inline-block;background:#1c1915;color:#f6f1e7;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600;">
              Ver precio y encargar
            </a>
          </p>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#8a8173;">
            O escribe a <a href="mailto:${BRAND.email}" style="color:#1c1915;">${BRAND.email}</a>
            · <a href="${BRAND.url}" style="color:#1c1915;">${BRAND.domain}</a>
          </p>
        </td></tr>
        <tr><td style="padding:8px 28px 28px;font-size:12px;color:#a39a8c;line-height:1.45;">
          Te escribimos porque encontramos el email público de tu negocio en ${escapeHtml(city)}.
          Si no quieres más mensajes: responde «baja» o
          <a href="${BRAND.url}/legal" style="color:#8a8173;">política</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function nfctapOutreachText(v: OutreachVars) {
  const name = v.businessName?.trim() || "hola";
  const city = v.city?.trim() || "tu zona";
  return `${name}, ¿y si el cliente toca y deja reseña?

Atril NFC con tu logo (como Markos / Freddo's). Google, Instagram o el enlace que elijas.
Desde ${unicaPrice(2)} € con 2 chips. Envío a España.

Encargar: ${BRAND.url}/negocio
${BRAND.email}

Email público de tu negocio en ${city}. Baja: responde «baja».`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
