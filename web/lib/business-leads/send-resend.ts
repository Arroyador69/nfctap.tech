import { BRAND } from "@/lib/catalog";
import {
  nfctapOutreachHtml,
  nfctapOutreachSubject,
  nfctapOutreachText,
  type OutreachVars,
} from "./template";

export type SendResult =
  | { ok: true; id: string; provider: "resend" }
  | { ok: false; error: string };

/**
 * Envía un cold email vía Resend.
 * Requiere RESEND_API_KEY y dominio nfctap.tech verificado (SPF/DKIM).
 * From: NFCTap (marca), nunca un nombre personal.
 */
export async function sendNfctapOutreach(
  to: string,
  vars: OutreachVars,
): Promise<SendResult> {
  const key = (process.env.RESEND_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!key) return { ok: false, error: "Falta RESEND_API_KEY" };

  const from =
    (process.env.RESEND_FROM || "").trim().replace(/^["']|["']$/g, "") ||
    (process.env.SMTP_FROM_OUTREACH || "").trim().replace(/^["']|["']$/g, "") ||
    `NFCTap <hola@${BRAND.domain}>`;

  const optOut =
    vars.optOutUrl?.trim() ||
    `mailto:${BRAND.email}?subject=${encodeURIComponent("baja")}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: BRAND.email,
      subject: nfctapOutreachSubject(vars),
      html: nfctapOutreachHtml(vars),
      text: nfctapOutreachText(vars),
      headers: {
        "List-Unsubscribe": `<${optOut}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "campaign", value: "nfctap_local_es" },
        { name: "city", value: (vars.city || "es").slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "_") },
      ],
      // Opens/clicks → webhook /api/webhook/resend

    }),
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: data.message || `Resend HTTP ${res.status}` };
  }
  return { ok: true, id: data.id || "", provider: "resend" };
}
