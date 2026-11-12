/**
 * Hub compartido NFCTap ↔ Delfín.
 * El cliente nunca ve “sincronizado con…”.
 * Auth: Authorization Bearer CALLS_SYNC_SECRET o ?secret=
 */
import { bookSalesCall } from "@/lib/sales-calls/book";
import type { CallProject } from "@/lib/sales-calls/constants";
import { listOpenSlots } from "@/lib/sales-calls/slots";
import { activeBookings, loadSalesCalls } from "@/lib/sales-calls/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CALLS_SYNC_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const q = url.searchParams.get("secret") || "";
  return bearer === secret || q === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const weekdays = Number(new URL(req.url).searchParams.get("days") || "10");
  const file = await loadSalesCalls();
  const slots = listOpenSlots(file, { weekdays: Number.isFinite(weekdays) ? weekdays : 10 });
  const busy = activeBookings(file).map((b) => ({
    slotKey: b.slotKey,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    project: b.project,
  }));
  return NextResponse.json({
    ok: true,
    slots,
    busy,
    timezone: "Europe/Madrid",
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      project?: string;
      slotKey?: string;
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      notes?: string;
    };
    const project: CallProject = body.project === "delfin" ? "delfin" : "nfctap";
    const { booking, slot } = await bookSalesCall({
      project,
      slotKey: String(body.slotKey || ""),
      name: String(body.name || ""),
      email: String(body.email || ""),
      phone: body.phone ? String(body.phone) : undefined,
      company: body.company ? String(body.company) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    });
    return NextResponse.json({
      ok: true,
      booking: {
        id: booking.id,
        project: booking.project,
        slotKey: booking.slotKey,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        meetingUrl: booking.meetingUrl || null,
      },
      slot,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo reservar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
