import { applyEngagementByResendId } from "@/lib/business-leads/queue";
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
 * Webhook Resend → opens / clicks / bounces + programa follow-up.
 * URL: https://nfctap.tech/api/webhook/resend
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const q = url.searchParams.get("secret") || "";
  if (secret && q) {
    if (q !== secret) {
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
  let event: "opened" | "clicked" | "bounced" | null = null;

  if (body.type === "email.opened") event = "opened";
  else if (body.type === "email.clicked") event = "clicked";
  else if (body.type === "email.bounced" || body.type === "email.complained") {
    event = "bounced";
  }

  if (event) {
    matched = await applyEngagementByResendId(id, event, at, toEmail);
  }

  return NextResponse.json({ ok: true, matched, type: body.type, event });
}
