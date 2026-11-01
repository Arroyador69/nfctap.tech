import { BRAND } from "@/lib/catalog";
import type { TouchKind } from "./queue";
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
 * Envía cold o follow-up vía Resend.
 * From: NFCTap (marca). Tags: campaign + touch + city.
 */
export async function sendNfctapOutreach(
  to: string,
  vars: OutreachVars,
  touch: TouchKind = "cold",
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

  const touchTag = touch === "cold" ? "cold" : touch;

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
      subject: nfctapOutreachSubject(vars, touch),
      html: nfctapOutreachHtml(vars, touch),
      text: nfctapOutreachText(vars, touch),
      headers: {
        "List-Unsubscribe": `<${optOut}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "campaign", value: "nfctap_local_es" },
        { name: "touch", value: touchTag.slice(0, 40) },
        {
          name: "city",
          value: (vars.city || "es").slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "_"),
        },
      ],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: data.message || `Resend HTTP ${res.status}` };
  }
  return { ok: true, id: data.id || "", provider: "resend" };
}
