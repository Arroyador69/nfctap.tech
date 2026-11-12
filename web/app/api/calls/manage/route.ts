import {
  cancelBookingByToken,
  findBookingByToken,
  rescheduleBookingByToken,
} from "@/lib/sales-calls/manage";
import { formatWhenMadrid, manageUrl } from "@/lib/sales-calls/mail";
import { CALL_DURATION_MIN } from "@/lib/sales-calls/constants";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const booking = await findBookingByToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    booking: {
      id: booking.id,
      status: booking.status,
      name: booking.name,
      email: booking.email,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      slotKey: booking.slotKey,
      whenLabel: formatWhenMadrid(booking.startsAt),
      durationMin: CALL_DURATION_MIN,
      meetingUrl: booking.meetingUrl || null,
      manageUrl: manageUrl(booking),
      project: booking.project,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      action?: string;
      slotKey?: string;
    };
    const token = String(body.token || "");
    const action = String(body.action || "");

    if (action === "cancel") {
      const booking = await cancelBookingByToken(token);
      return NextResponse.json({
        ok: true,
        status: booking.status,
        message: "Llamada cancelada. El hueco queda libre.",
      });
    }

    if (action === "reschedule") {
      const { booking, slot } = await rescheduleBookingByToken(
        token,
        String(body.slotKey || ""),
      );
      return NextResponse.json({
        ok: true,
        booking: {
          id: booking.id,
          startsAt: booking.startsAt,
          slotKey: booking.slotKey,
          whenLabel: formatWhenMadrid(booking.startsAt),
          meetingUrl: booking.meetingUrl || null,
        },
        slot,
        message: "Hora cambiada. Te hemos enviado la confirmación por email.",
      });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
