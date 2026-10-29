import { isAdmin } from "@/lib/auth";
import { syncEngagementFromResend } from "@/lib/business-leads/sync-engagement";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronOk(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const q = url.searchParams.get("secret") || "";
  return bearer === secret || q === secret;
}

/** POST { maxPages? } — sincroniza opens/clicks desde Resend API (admin o CRON_SECRET). */
export async function POST(req: Request) {
  if (!(await isAdmin()) && !cronOk(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { maxPages?: number };
  const result = await syncEngagementFromResend({
    maxPages: typeof body.maxPages === "number" ? body.maxPages : 15,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

/** GET ?secret= — mismo sync (para lanzarlo ya desde cron/curl). */
export async function GET(req: Request) {
  if (!cronOk(req) && !(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = new URL(req.url);
  const maxPages = Number(url.searchParams.get("maxPages") || "15");
  const result = await syncEngagementFromResend({
    maxPages: Number.isFinite(maxPages) ? maxPages : 15,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
