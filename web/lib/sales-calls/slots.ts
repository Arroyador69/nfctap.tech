import {
  CALL_BUFFER_MIN,
  CALL_DURATION_MIN,
  CALL_SLOT_STEP_MIN,
  CALL_TZ,
  CALL_WINDOWS,
} from "./constants";
import { activeBookings, type SalesCallBooking, type SalesCallsFile } from "./store";

export type CallSlot = {
  slotKey: string;
  startsAt: string;
  endsAt: string;
  label: string;
  dateLabel: string;
  timeLabel: string;
};

export function madridParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Instant UTC for Madrid wall clock YYYY-MM-DD + HH:mm. */
export function madridWallToUtc(date: string, hour: number, minute: number): Date {
  const guess = new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+01:00`,
  );
  for (let i = 0; i < 4; i++) {
    const p = madridParts(guess);
    const wantMin = hour * 60 + minute;
    const gotMin = p.hour * 60 + p.minute;
    const delta = wantMin - gotMin;
    if (delta === 0 && p.date === date) return guess;
    guess.setTime(guess.getTime() + delta * 60_000);
  }
  return guess;
}

function isWeekdayMadrid(date: string) {
  const utc = madridWallToUtc(date, 12, 0);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: CALL_TZ,
    weekday: "short",
  }).format(utc);
  return wd !== "Sat" && wd !== "Sun";
}

function addDays(date: string, n: number) {
  const d = madridWallToUtc(date, 12, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return madridParts(d).date;
}

function todayMadrid() {
  return madridParts(new Date()).date;
}

export type BusyIntervalMs = { startMs: number; endMs: number };

function overlapsBusy(
  startsAt: Date,
  endsAt: Date,
  bookings: SalesCallBooking[],
  extra?: BusyIntervalMs[],
) {
  const s = startsAt.getTime();
  const e = endsAt.getTime();
  for (const b of bookings) {
    const bs = new Date(b.startsAt).getTime();
    // Tras cada llamada hay buffer bloqueado
    const be = new Date(b.endsAt).getTime() + CALL_BUFFER_MIN * 60_000;
    if (s < be && e > bs) return true;
  }
  if (extra) {
    for (const b of extra) {
      const be = b.endMs + CALL_BUFFER_MIN * 60_000;
      if (s < be && e > b.startMs) return true;
    }
  }
  return false;
}

function formatSlot(startsAt: Date, endsAt: Date, slotKey: string): CallSlot {
  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    timeZone: CALL_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(startsAt);
  const timeLabel = new Intl.DateTimeFormat("es-ES", {
    timeZone: CALL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(startsAt);
  return {
    slotKey,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    label: `${dateLabel} · ${timeLabel}`,
    dateLabel,
    timeLabel,
  };
}

/** Genera huecos libres los próximos `weekdays` días laborables. */
export function listOpenSlots(
  file: SalesCallsFile,
  opts?: { weekdays?: number; now?: Date; peerBusy?: BusyIntervalMs[] },
) {
  const weekdaysWanted = Math.min(20, Math.max(1, opts?.weekdays ?? 14));
  const now = opts?.now ?? new Date();
  const leadMs = 60 * 60_000;
  const busy = activeBookings(file);
  const peer = opts?.peerBusy || [];
  const out: CallSlot[] = [];
  const start = todayMadrid();
  let weekdaysSeen = 0;

  for (let offset = 0; offset < 45 && weekdaysSeen < weekdaysWanted; offset++) {
    const day = addDays(start, offset);
    if (!isWeekdayMadrid(day)) continue;
    weekdaysSeen++;

    for (const win of CALL_WINDOWS) {
      let mins = win.startHour * 60 + win.startMin;
      const endMins = win.endHour * 60 + win.endMin;
      while (mins + CALL_DURATION_MIN <= endMins) {
        const hour = Math.floor(mins / 60);
        const minute = mins % 60;
        const startsAt = madridWallToUtc(day, hour, minute);
        const endsAt = new Date(startsAt.getTime() + CALL_DURATION_MIN * 60_000);
        const slotKey = `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        mins += CALL_SLOT_STEP_MIN;

        if (startsAt.getTime() < now.getTime() + leadMs) continue;
        if (overlapsBusy(startsAt, endsAt, busy, peer)) continue;
        out.push(formatSlot(startsAt, endsAt, slotKey));
      }
    }
  }

  return out;
}

export function findSlotByKey(
  file: SalesCallsFile,
  slotKey: string,
  now = new Date(),
  peerBusy?: BusyIntervalMs[],
) {
  return (
    listOpenSlots(file, { weekdays: 20, now, peerBusy }).find((s) => s.slotKey === slotKey) ||
    null
  );
}
