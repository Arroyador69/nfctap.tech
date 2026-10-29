import { markLeadByResendId } from "@/lib/business-leads/queue";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ResendEvent = {
  type?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    to?: string[] | string;
  };
};

/**
 * Webhook Resend → opens / clicks / bounces en la cola.
 * Resend → Webhooks → https://nfctap.tech/api/webhook/resend
 * Eventos: email.opened, email.clicked, email.bounced, email.complained
 *
 * Opcional: RESEND_WEBHOOK_SECRET en ?secret= o header x-nfctap-secret
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (secret) {
    const q = url.searchParams.get("secret") || "";
    const h = req.headers.get("x-nfctap-secret") || "";
    if (q !== secret && h !== secret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const body = (await req.json().catch(() => null)) as ResendEvent | null;
  if (!body?.type || !body.data?.email_id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const id = body.data.email_id;
  const at = body.data.created_at || new Date().toISOString();
  const toRaw = body.data.to;
  const toEmail = Array.isArray(toRaw) ? toRaw[0] : toRaw;
  let matched = false;

  if (body.type === "email.opened") {
    matched = await markLeadByResendId(id, { openedAt: at }, toEmail);
  } else if (body.type === "email.clicked") {
    matched = await markLeadByResendId(id, { clickedAt: at, openedAt: at }, toEmail);
  } else if (body.type === "email.bounced" || body.type === "email.complained") {
    matched = await markLeadByResendId(
      id,
      { bouncedAt: at, status: "failed" },
      toEmail,
    );
  }

  return NextResponse.json({ ok: true, matched, type: body.type });
}
