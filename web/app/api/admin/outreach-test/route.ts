import { isAdmin } from "@/lib/auth";
import { sendNfctapOutreach } from "@/lib/business-leads/send-resend";
import { notifyTelegram } from "@/lib/business-leads/telegram";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST { to?, telegram? } — solo admin.
 * Envía un mail de prueba (Resend) y/o un ping a Telegram.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    to?: string;
    telegram?: boolean;
    mail?: boolean;
  };

  const to = (body.to || "").trim();
  const wantMail = body.mail !== false;
  const wantTg = body.telegram !== false;

  const out: {
    mail?: { ok: boolean; id?: string; error?: string; from?: string };
    telegram?: { ok: boolean; error?: string };
  } = {};

  if (wantMail) {
    if (!to || !to.includes("@")) {
      return NextResponse.json({ error: "Indica un email válido en `to`" }, { status: 400 });
    }
    const from =
      process.env.RESEND_FROM?.trim() ||
      `NFCTap <hola@${process.env.NEXT_PUBLIC_SITE_DOMAIN || "nfctap.tech"}>`;
    const r = await sendNfctapOutreach(to, {
      businessName: "Prueba NFCTap",
      city: "Fuengirola",
    });
    out.mail = r.ok
      ? { ok: true, id: r.id, from }
      : { ok: false, error: r.error, from };
  }

  if (wantTg) {
    const tg = await notifyTelegram(
      [
        "NFCTap · prueba Telegram",
        "Si lees esto, el bot de oleadas está listo.",
        `Mail test: ${out.mail?.ok ? "ok" : out.mail?.error || "omitido"}`,
        new Date().toISOString(),
      ].join("\n"),
    );
    out.telegram = tg;
  }

  const ok = (!wantMail || out.mail?.ok) && (!wantTg || out.telegram?.ok);
  return NextResponse.json({ ok, ...out }, { status: ok ? 200 : 502 });
}
