import { CALL_BUFFER_MIN, CALL_DURATION_MIN, CALL_WINDOWS } from "@/lib/sales-calls/constants";
import { listOpenSlots } from "@/lib/sales-calls/slots";
import { loadSalesCalls } from "@/lib/sales-calls/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weekdays = Number(url.searchParams.get("days") || "10");
  const file = await loadSalesCalls();
  const slots = listOpenSlots(file, { weekdays: Number.isFinite(weekdays) ? weekdays : 10 });

  // Agrupar por día para la UI
  const byDate: Record<string, typeof slots> = {};
  for (const s of slots) {
    const day = s.slotKey.slice(0, 10);
    (byDate[day] ||= []).push(s);
  }

  return NextResponse.json({
    ok: true,
    durationMin: CALL_DURATION_MIN,
    bufferMin: CALL_BUFFER_MIN,
    timezone: "Europe/Madrid",
    windows: CALL_WINDOWS.map((w) => ({
      start: `${String(w.startHour).padStart(2, "0")}:${String(w.startMin).padStart(2, "0")}`,
      end: `${String(w.endHour).padStart(2, "0")}:${String(w.endMin).padStart(2, "0")}`,
    })),
    note: "Lunes a viernes. La hora es fija: no se puede atrasar.",
    slots,
    byDate,
  });
}
