import { PRICE } from "./catalog";

const MODEL = "gpt-4o-mini";

export function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function draftGuide(topic: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Falta OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `Eres el redactor de NFCTap (nfctap.tech). Escribes borradores en español de España, tono directo, sin marketing vacío.

Hechos que no puedes inventar:
- Atril NFC de barra: Google, WhatsApp o Instagram. Primera ${PRICE.generica.first} €, cada una más ${PRICE.generica.extra} €.
- Con logo: primera ${PRICE.personalizada.first} €, cada una más ${PRICE.personalizada.extra} €.
- TAP Wi‑Fi de pared: ${PRICE.wifi.first} €, adhesivo incluido, diseño fijo (Wi‑Fi + TAP HERE). No lleva logo.
- Pieza única a medida: ${PRICE.unica.first} €, por email, no se encarga en la web.
- Impreso en España. Envío Correos 24 h, solo España. Pago Polar (tarjeta, Apple Pay, Bizum).
- Sin app. Chip NTAG con el enlace del negocio. No hay partnership con Google, Meta ni WhatsApp.
- El TAP Wi‑Fi: Android se une al tocar; iPhone enseña red y clave.
- No hables de impresión 3D genérica, filamentos, ni ciudades inventadas. No inventes reseñas, clientes ni direcciones.

Formato del borrador:
1. Título (pregunta o búsqueda real de un dueño de bar, hotel o alquiler).
2. Respuesta de 2-3 frases (para Google y chats de IA).
3. Tres apartados con h2 y 2 párrafos cada uno.
4. Dos preguntas FAQ con respuesta.
5. CTA a /personalizar o /wifi según el tema.

Al final: una línea «Por revisar:» con lo que Alberto debe comprobar (precios, tono, hechos).
Esto es un BORRADOR. No publiques sin editar.`,
        },
        { role: "user", content: topic },
      ],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI ${res.status}`);
  }
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI no devolvió texto");
  return text;
}
