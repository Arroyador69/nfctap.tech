import { isAdmin } from "@/lib/auth";
import { customerIp } from "@/lib/polar";
import {
  classifyVisit,
  cleanPath,
  isVisitBot,
  madridDate,
  recordVisit,
  visitDevice,
  visitorKey,
} from "@/lib/visits";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (await isAdmin()) return NextResponse.json({ ok: true, skipped: true });

  const ua = req.headers.get("user-agent") || "";
  if (!ua || isVisitBot(ua)) return NextResponse.json({ ok: true, skipped: true });

  let body: { path?: string; referrer?: string; href?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }

  const path = cleanPath(typeof body.path === "string" ? body.path : "");
  if (!path) return NextResponse.json({ ok: true, skipped: true });

  const href = typeof body.href === "string" ? body.href.slice(0, 500) : "";
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "";
  const { source, campaign } = classifyVisit(href, referrer);
  const date = madridDate();

  await recordVisit({
    path,
    source,
    campaign,
    device: visitDevice(ua),
    key: visitorKey(customerIp(req), ua, date),
    date,
  });

  return NextResponse.json({ ok: true });
}
