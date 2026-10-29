import { addOptOut, loadOptOut } from "@/lib/business-leads/queue";
import { BRAND } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Baja RGPD one-click / GET con ?email= */
export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() || "";
  if (!email.includes("@")) {
    return new NextResponse(page("Falta el email.", false), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  await addOptOut(email);
  return new NextResponse(page(`Te has dado de baja: ${email}`, true), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email || "").trim().toLowerCase();
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  await addOptOut(email);
  const set = await loadOptOut();
  return NextResponse.json({ ok: true, optedOut: set.has(email) });
}

function page(msg: string, ok: boolean) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Baja · NFCTap</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:Georgia,serif;background:#f7f3eb;color:#1c1915;padding:48px 20px;text-align:center}
a{color:#1c1915}</style></head><body>
<h1>${ok ? "Baja registrada" : "Baja"}</h1>
<p>${msg}</p>
<p><a href="${BRAND.url}">${BRAND.domain}</a> · <a href="${BRAND.url}/legal">Aviso legal</a></p>
</body></html>`;
}
