/**
 * Contrato peer Delfín ↔ NFCTap (header X-Sales-Call-Sync).
 * GET  → huecos ocupados locales
 * POST → espejo de reserva del peer
 * DELETE → liberar espejo
 */
import { authorizePeerSync } from "@/lib/sales-calls/peer-sync";
import {
  cancelPeerMirror,
  listLocalBusy,
  upsertPeerMirror,
} from "@/lib/sales-calls/peer-store";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!authorizePeerSync(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const from = req.nextUrl.searchParams.get("from") || "";
  const to = req.nextUrl.searchParams.get("to") || "";
  if (!from || !to) {
    return NextResponse.json({ error: "from/to required" }, { status: 400 });
  }
  const busy = await listLocalBusy(from, to);
  return NextResponse.json({ busy });
}

export async function POST(req: NextRequest) {
  if (!authorizePeerSync(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const startAt = String(body.startAt || "");
  const endAt = String(body.endAt || "");
  const remoteId = String(body.remoteId || body.id || "");
  if (!startAt || !endAt || !remoteId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  try {
    const row = await upsertPeerMirror({
      startAt,
      endAt,
      remoteId,
      name: body.name ? String(body.name) : undefined,
      email: body.email ? String(body.email) : undefined,
      project: body.project ? String(body.project) : undefined,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error("[peer-busy POST]", e);
    return NextResponse.json({ error: "mirror_failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!authorizePeerSync(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const remoteId = String(body.remoteId || body.id || "");
  const startAt = body.startAt ? String(body.startAt) : undefined;
  if (!remoteId && !startAt) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  await cancelPeerMirror({ remoteId, startAt });
  return NextResponse.json({ ok: true });
}
