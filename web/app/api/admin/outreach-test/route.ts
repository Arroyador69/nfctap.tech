import { isAdmin } from "@/lib/auth";
import { sendNfctapOutreach } from "@/lib/business-leads/send-resend";
import { notifyTelegram } from "@/lib/business-leads/telegram";
import { NFC_TEST_CITIES } from "@/lib/business-leads/places";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST { to, city?, businessName?, telegram?, mail? } — solo admin.
 * Prueba el mail real: la ciudad cambia; sin “Café de prueba”.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    to?: string;
    city?: string;
    businessName?: string;
    telegram?: boolean;
    mail?: boolean;
  };

  const to = (body.to || "").trim();
  const wantMail = body.mail !== false;
  const wantTg = body.telegram !== false;
  const cityRaw = (body.city || "").trim();
  const city =
    NFC_TEST_CITIES.find((c) => c.toLowerCase() === cityRaw.toLowerCase()) ||
    cityRaw ||
    "Fuengirola";
  const businessName = (body.businessName || "").trim();

  const out: {
    mail?: { ok: boolean; id?: string; error?: string; from?: string; preview?: { subject: string; city: string } };
    telegram?: { ok: boolean; error?: string };
  } = {};

  if (wantMail) {
    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { error: "Para probar mail indica `to`. Las oleadas reales van solas por cron." },
        { status: 400 },
      );
    }
    const from =
      process.env.RESEND_FROM?.trim() ||
      `NFCTap <hola@${process.env.NEXT_PUBLIC_SITE_DOMAIN || "nfctap.tech"}>`;
    const vars = {
      businessName: businessName || undefined,
      city,
      websiteUrl: undefined as string | undefined,
    };
    const r = await sendNfctapOutreach(to, vars);
    const { nfctapOutreachSubject } = await import("@/lib/business-leads/template");
    out.mail = r.ok
      ? {
          ok: true,
          id: r.id,
          from,
          preview: { subject: nfctapOutreachSubject(vars), city },
        }
      : { ok: false, error: r.error, from };
  }

  if (wantTg) {
    const tg = await notifyTelegram(
      [
        "NFCTap · prueba Telegram",
        `Ciudad de prueba: ${city}`,
        `Mail test: ${out.mail?.ok ? "ok" : out.mail?.error || "omitido"}`,
        new Date().toISOString(),
      ].join("\n"),
    );
    out.telegram = tg;
  }

  const ok = (!wantMail || out.mail?.ok) && (!wantTg || out.telegram?.ok);
  return NextResponse.json({ ok, ...out }, { status: ok ? 200 : 502 });
}
