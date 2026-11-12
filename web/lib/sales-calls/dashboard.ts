import type { SalesCallBooking, SalesCallsFile } from "./store";

/** Margen: cuenta como “próxima” si empezó hace menos de 15 min. */
const GRACE_MS = 15 * 60_000;

export function madridTodayKey(nowMs?: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs ?? Date.now()));
}

export function upcomingBookings(file: SalesCallsFile, nowMs?: number) {
  const now = nowMs ?? Date.now();
  return file.bookings
    .filter((b) => b.status === "booked" && new Date(b.startsAt).getTime() >= now - GRACE_MS)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function pastBookings(file: SalesCallsFile, nowMs?: number) {
  const now = nowMs ?? Date.now();
  return file.bookings
    .filter((b) => b.status === "booked" && new Date(b.startsAt).getTime() < now - GRACE_MS)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

export function cancelledBookings(file: SalesCallsFile, limit = 20) {
  return file.bookings
    .filter((b) => b.status === "cancelled")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function bookingsTodayCount(upcoming: SalesCallBooking[], nowMs?: number) {
  const key = madridTodayKey(nowMs);
  return upcoming.filter((b) => b.slotKey.startsWith(key)).length;
}
