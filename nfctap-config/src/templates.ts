import { encodeWifiWsc, wifiQrLine, type WifiAuth } from "./wifi";

export type Field = {
  key: string;
  label: string;
  placeholder: string;
  keyboard?: "url" | "email" | "phone" | "default";
  multiline?: boolean;
  optional?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string;
};

export type Template = {
  id: string;
  title: string;
  blurb: string;
  group: "negocio" | "redes" | "contacto" | "conexion" | "extra";
  fields: Field[];
};

export type Built = {
  uri?: string;
  text?: string;
  vcard?: string;
  androidId?: string;
  wifi?: number[];
  label: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "uri",
    title: "Cualquier enlace",
    blurb: "Pega la URL que quieras: web, PDF, Maps, reserva, PayPal…",
    group: "negocio",
    fields: [{ key: "url", label: "Enlace", placeholder: "https://…", keyboard: "url" }],
  },
  {
    id: "google",
    title: "Reseña Google",
    blurb: "Busca el negocio o pega g.page. El cliente toca y opina.",
    group: "negocio",
    fields: [
      {
        key: "query",
        label: "Negocio (nombre y pueblo)",
        placeholder: "Casa Vacacional Alberto Fuengirola",
        optional: true,
      },
      { key: "url", label: "Enlace de reseña", placeholder: "https://g.page/r/…/review", keyboard: "url" },
    ],
  },
  {
    id: "web",
    title: "Página web",
    blurb: "Abre la web. iPhone y Android, sin app.",
    group: "negocio",
    fields: [{ key: "url", label: "URL", placeholder: "https://tudominio.com", keyboard: "url" }],
  },
  {
    id: "pdf",
    title: "PDF / carta / menú",
    blurb: "Enlace https al PDF. El chip no guarda el archivo.",
    group: "negocio",
    fields: [{ key: "url", label: "Enlace del PDF", placeholder: "https://…/carta.pdf", keyboard: "url" }],
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    blurb: "Chat directo al número. Prefijo España 34.",
    group: "negocio",
    fields: [
      { key: "prefix", label: "Prefijo país", placeholder: "34", keyboard: "phone", defaultValue: "34" },
      { key: "phone", label: "Número (sin el 0 ni el +)", placeholder: "600111222", keyboard: "phone" },
      { key: "text", label: "Mensaje (opcional)", placeholder: "Hola, quiero reservar", optional: true },
    ],
  },
  {
    id: "app",
    title: "Aplicación",
    blurb: "Play Store, App Store o enlace de la app.",
    group: "negocio",
    fields: [
      { key: "url", label: "Enlace de la app", placeholder: "https://play.google.com/store/apps/details?id=…", keyboard: "url" },
      { key: "androidId", label: "Id Android (opcional)", placeholder: "com.ejemplo.app", optional: true },
    ],
  },
  {
    id: "tripadvisor",
    title: "TripAdvisor",
    blurb: "Opiniones del local.",
    group: "negocio",
    fields: [{ key: "url", label: "URL", placeholder: "https://www.tripadvisor.es/…", keyboard: "url" }],
  },
  {
    id: "booking",
    title: "Reservas / Calendly",
    blurb: "Calendly, Booksy, TheFork, tu web de reserva.",
    group: "negocio",
    fields: [{ key: "url", label: "URL de reserva", placeholder: "https://calendly.com/…", keyboard: "url" }],
  },
  {
    id: "paypal",
    title: "PayPal / Bizum web",
    blurb: "Enlace de pago (paypal.me o la pasarela).",
    group: "negocio",
    fields: [{ key: "url", label: "URL de pago", placeholder: "https://paypal.me/…", keyboard: "url" }],
  },
  {
    id: "instagram",
    title: "Instagram",
    blurb: "Perfil o reel. @ o URL.",
    group: "redes",
    fields: [{ key: "handle", label: "Usuario o URL", placeholder: "@tunegocio" }],
  },
  {
    id: "tiktok",
    title: "TikTok",
    blurb: "Perfil con @.",
    group: "redes",
    fields: [{ key: "handle", label: "Usuario o URL", placeholder: "@tunegocio" }],
  },
  {
    id: "facebook",
    title: "Facebook",
    blurb: "Página o perfil.",
    group: "redes",
    fields: [{ key: "handle", label: "Página o URL", placeholder: "tunegocio" }],
  },
  {
    id: "telegram",
    title: "Telegram",
    blurb: "Usuario o canal.",
    group: "redes",
    fields: [{ key: "handle", label: "Usuario o URL", placeholder: "@tunegocio" }],
  },
  {
    id: "maps",
    title: "Google Maps",
    blurb: "Ficha del negocio.",
    group: "redes",
    fields: [{ key: "url", label: "Enlace de Maps", placeholder: "https://maps.app.goo.gl/…", keyboard: "url" }],
  },
  {
    id: "youtube",
    title: "YouTube",
    blurb: "Canal o vídeo.",
    group: "redes",
    fields: [{ key: "url", label: "URL", placeholder: "https://youtube.com/@…", keyboard: "url" }],
  },
  {
    id: "linkedin",
    title: "LinkedIn",
    blurb: "Empresa o perfil.",
    group: "redes",
    fields: [{ key: "url", label: "URL", placeholder: "https://linkedin.com/company/…", keyboard: "url" }],
  },
  {
    id: "x",
    title: "X / Twitter",
    blurb: "Perfil.",
    group: "redes",
    fields: [{ key: "handle", label: "Usuario o URL", placeholder: "@tunegocio" }],
  },
  {
    id: "spotify",
    title: "Spotify",
    blurb: "Lista, canción o artista.",
    group: "redes",
    fields: [{ key: "url", label: "URL", placeholder: "https://open.spotify.com/…", keyboard: "url" }],
  },
  {
    id: "phone",
    title: "Llamar",
    blurb: "Abre el marcador.",
    group: "contacto",
    fields: [{ key: "phone", label: "Teléfono", placeholder: "+34600111222", keyboard: "phone" }],
  },
  {
    id: "email",
    title: "Email",
    blurb: "Correo con asunto.",
    group: "contacto",
    fields: [
      { key: "email", label: "Email", placeholder: "hola@negocio.com", keyboard: "email" },
      { key: "subject", label: "Asunto (opcional)", placeholder: "Reserva", optional: true },
    ],
  },
  {
    id: "sms",
    title: "SMS",
    blurb: "Mensaje listo para enviar.",
    group: "contacto",
    fields: [
      { key: "phone", label: "Teléfono", placeholder: "+34600111222", keyboard: "phone" },
      { key: "text", label: "Texto (opcional)", placeholder: "Quiero mesa para 2", optional: true },
    ],
  },
  {
    id: "vcard",
    title: "Contacto",
    blurb: "vCard para la agenda.",
    group: "contacto",
    fields: [
      { key: "name", label: "Nombre", placeholder: "Bar Pepe" },
      { key: "phone", label: "Teléfono (opcional)", placeholder: "+34600111222", keyboard: "phone", optional: true },
      { key: "email", label: "Email (opcional)", placeholder: "hola@barpepe.es", keyboard: "email", optional: true },
      { key: "url", label: "Web (opcional)", placeholder: "https://barpepe.es", keyboard: "url", optional: true },
    ],
  },
  {
    id: "wifi",
    title: "Wi‑Fi con contraseña",
    blurb: "Android se une solo. En iPhone se ve la red y la clave.",
    group: "conexion",
    fields: [
      { key: "ssid", label: "Nombre de la red (SSID)", placeholder: "BarPepe_WiFi" },
      { key: "password", label: "Contraseña (si la red tiene)", placeholder: "la clave", optional: true },
      {
        key: "auth",
        label: "Seguridad",
        placeholder: "wpa2",
        defaultValue: "wpa2",
        options: [
          { value: "wpa2", label: "WPA2 / WPA3 (normal)" },
          { value: "wpa", label: "WPA" },
          { value: "open", label: "Abierta (sin clave)" },
        ],
      },
    ],
  },
  {
    id: "text",
    title: "Texto",
    blurb: "Texto plano en el chip.",
    group: "extra",
    fields: [{ key: "text", label: "Texto", placeholder: "Horario: …", multiline: true }],
  },
  {
    id: "geo",
    title: "Ubicación",
    blurb: "Abre el mapa en esas coordenadas.",
    group: "extra",
    fields: [
      { key: "lat", label: "Latitud", placeholder: "40.4168" },
      { key: "lng", label: "Longitud", placeholder: "-3.7038" },
    ],
  },
];

export const GROUPS: { id: Template["group"]; title: string }[] = [
  { id: "negocio", title: "Negocio" },
  { id: "redes", title: "Redes y apps" },
  { id: "contacto", title: "Contacto" },
  { id: "conexion", title: "Conexión" },
  { id: "extra", title: "Extra" },
];

function asUrl(value: string) {
  const t = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  return `https://${t}`;
}

function handle(value: string, host: string) {
  const t = value.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${host}/${t.replace(/^@/, "")}`;
}

export function defaultsFor(template: Template) {
  const out: Record<string, string> = {};
  for (const f of template.fields) {
    if (f.defaultValue) out[f.key] = f.defaultValue;
  }
  return out;
}

export function buildPayload(id: string, values: Record<string, string>): Built {
  const v = Object.fromEntries(Object.entries(values).map(([k, val]) => [k, val.trim()]));
  switch (id) {
    case "google":
    case "web":
    case "pdf":
    case "maps":
    case "youtube":
    case "linkedin":
    case "tripadvisor":
    case "booking":
    case "paypal":
    case "spotify":
    case "uri":
      return { uri: asUrl(v.url), label: asUrl(v.url) };
    case "app":
      return { uri: asUrl(v.url), androidId: v.androidId || undefined, label: asUrl(v.url) };
    case "instagram":
      return { uri: handle(v.handle, "instagram.com"), label: handle(v.handle, "instagram.com") };
    case "tiktok": {
      const uri = /^https?:\/\//i.test(v.handle)
        ? v.handle
        : `https://www.tiktok.com/@${v.handle.replace(/^@/, "")}`;
      return { uri, label: uri };
    }
    case "facebook":
      return { uri: handle(v.handle, "facebook.com"), label: handle(v.handle, "facebook.com") };
    case "x":
      return { uri: handle(v.handle, "x.com"), label: handle(v.handle, "x.com") };
    case "telegram": {
      const uri = /^https?:\/\//i.test(v.handle)
        ? v.handle
        : `https://t.me/${v.handle.replace(/^@/, "")}`;
      return { uri, label: uri };
    }
    case "whatsapp": {
      const prefix = (v.prefix || "34").replace(/\D/g, "");
      const n = v.phone.replace(/\D/g, "").replace(new RegExp(`^${prefix}`), "");
      const full = `${prefix}${n}`;
      const q = v.text ? `?text=${encodeURIComponent(v.text)}` : "";
      return { uri: `https://wa.me/${full}${q}`, label: `WhatsApp +${full}` };
    }
    case "phone":
      return { uri: `tel:${v.phone.replace(/\s/g, "")}`, label: v.phone };
    case "email": {
      const q = v.subject ? `?subject=${encodeURIComponent(v.subject)}` : "";
      return { uri: `mailto:${v.email}${q}`, label: v.email };
    }
    case "sms":
      return {
        uri: `sms:${v.phone.replace(/\s/g, "")}${v.text ? `?body=${encodeURIComponent(v.text)}` : ""}`,
        label: v.phone,
      };
    case "geo":
      return { uri: `geo:${v.lat},${v.lng}`, label: `${v.lat}, ${v.lng}` };
    case "text":
      return { text: v.text, label: v.text.slice(0, 40) };
    case "wifi": {
      const auth = (v.auth || "wpa2") as WifiAuth;
      return {
        wifi: encodeWifiWsc(v.ssid, v.password, auth),
        text: wifiQrLine(v.ssid, v.password, auth),
        label: `Wi‑Fi ${v.ssid}`,
      };
    }
    case "vcard": {
      const card = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${v.name}`,
        v.phone ? `TEL:${v.phone}` : "",
        v.email ? `EMAIL:${v.email}` : "",
        v.url ? `URL:${asUrl(v.url)}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
      return { vcard: card, label: v.name };
    }
    default:
      return { uri: asUrl(v.url || ""), label: v.url || "" };
  }
}
