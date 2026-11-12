import { CALL_BUFFER_MIN, CALL_DURATION_MIN, CALL_WINDOWS } from "@/lib/sales-calls/constants";
import { listOpenSlotsWithPeer } from "@/lib/sales-calls/availability";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weekdays = Number(url.searchParams.get("days") || "14");
  const slots = await listOpenSlotsWithPeer({
    weekdays: Number.isFinite(weekdays) ? weekdays : 14,
  });

  const byDate: Record<string, typeof slots> = {};
  for (const s of slots) {
    const day = s.slotKey.slice(0, 10);
    (byDate[day] ||= []).push(s);
  }

  return NextResponse.json({
    ok: true,
    durationMin: CALL_DURATION_MIN,
    bufferMin: CALL_BUFFER_MIN,
    slotStepMin: 45,
    timezone: "Europe/Madrid",
    windows: CALL_WINDOWS.map((w) => ({
      start: `${String(w.startHour).padStart(2, "0")}:${String(w.startMin).padStart(2, "0")}`,
      end: `${String(w.endHour).padStart(2, "0")}:${String(w.endMin).padStart(2, "0")}`,
    })),
    note: "Lunes a viernes. La hora es fija: no se puede atrasar. Entre huecos hay 30 min.",
    slots,
    byDate,
  });
}
