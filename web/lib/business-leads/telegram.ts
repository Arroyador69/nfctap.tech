/**
 * Avisos de oleadas NFCTap → Telegram.
 * Env: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (tu chat o grupo).
 */

export async function notifyTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chat) {
    return { ok: false, error: "Falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body.slice(0, 200) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "telegram error" };
  }
}

export function waveTelegramMessage(input: {
  sent: number;
  failed: number;
  dayTotal: number;
  dayCap: number;
  salesToday: number;
  salesGoal: number;
  place?: string;
}) {
  const stop = input.salesToday >= input.salesGoal;
  return [
    `NFCTap oleada`,
    `Enviados: ${input.sent} · fallos: ${input.failed}`,
    `Hoy: ${input.dayTotal}/${input.dayCap} mails`,
    `Ventas /negocio hoy: ${input.salesToday}/${input.salesGoal}${stop ? " → STOP oleadas" : ""}`,
    input.place ? `Zona: ${input.place}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
