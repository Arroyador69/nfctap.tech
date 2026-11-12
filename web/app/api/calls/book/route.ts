import { bookSalesCall } from "@/lib/sales-calls/book";
import type { CallProject } from "@/lib/sales-calls/constants";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      slotKey?: string;
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      notes?: string;
      project?: string;
    };

    const project: CallProject =
      body.project === "delfin" ? "delfin" : "nfctap";

    // Público solo NFCTap; Delfín debe usar /api/calls/sync
    if (project === "delfin") {
      return NextResponse.json(
        { error: "Usa /api/calls/sync con secreto." },
        { status: 403 },
      );
    }

    const { booking, slot } = await bookSalesCall({
      project: "nfctap",
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
        slotKey: booking.slotKey,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        meetingUrl: booking.meetingUrl || null,
        name: booking.name,
        email: booking.email,
      },
      slot,
      message:
        "Reserva hecha. Te escribimos al email con la confirmación. Sé puntual: la hora no se puede atrasar.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo reservar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
