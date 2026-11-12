import { randomBytes, randomUUID } from "crypto";
import type { CallProject } from "./constants";
import { madridParts } from "./slots";
import {
  activeBookings,
  loadSalesCalls,
  saveSalesCalls,
  type SalesCallBooking,
} from "./store";

function slotKeyFromIso(iso: string) {
  const d = new Date(iso);
  const p = madridParts(d);
  return `${p.date}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export async function listLocalBusy(fromIso: string, toIso: string) {
  const file = await loadSalesCalls();
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return activeBookings(file)
    .filter((b) => {
      const s = new Date(b.startsAt).getTime();
      return Number.isFinite(s) && s >= from && s <= to;
    })
    .map((b) => ({ startAt: b.startsAt, endAt: b.endsAt }));
}

/** Espejo desde Delfín → bloquea hueco en Blob NFCTap. */
export async function upsertPeerMirror(opts: {
  startAt: string;
  endAt: string;
  remoteId: string;
  name?: string;
  email?: string;
  project?: string;
}): Promise<{ id: string }> {
  const start = new Date(opts.startAt);
  const end = new Date(opts.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("invalid_range");
  }
  const file = await loadSalesCalls();
  const existing = file.bookings.find(
    (b) =>
      b.status === "booked" &&
      (b.peerMirrorId === opts.remoteId || b.startsAt === start.toISOString()),
  );
  if (existing) return { id: existing.id };

  const project: CallProject =
    opts.project === "delfin" || opts.project === "nfctap" ? opts.project : "delfin";
  const booking: SalesCallBooking = {
    id: randomUUID(),
    project,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    slotKey: slotKeyFromIso(start.toISOString()),
    name: (opts.name || "Reserva externa").slice(0, 80),
    email: (opts.email || "sync@internal.local").toLowerCase().slice(0, 120),
    notes: "peer_mirror",
    manageToken: randomBytes(24).toString("hex"),
    peerMirrorId: opts.remoteId,
    createdAt: new Date().toISOString(),
    status: "booked",
  };
  file.bookings.push(booking);
  await saveSalesCalls(file);
  return { id: booking.id };
}

export async function cancelPeerMirror(opts: {
  remoteId: string;
  startAt?: string;
}) {
  const file = await loadSalesCalls();
  let changed = false;
  for (let i = 0; i < file.bookings.length; i++) {
    const b = file.bookings[i];
    if (b.status !== "booked") continue;
    const byRemote = opts.remoteId && b.peerMirrorId === opts.remoteId;
    const byId = opts.remoteId && b.id === opts.remoteId;
    const byStart =
      opts.startAt &&
      b.peerMirrorId &&
      new Date(b.startsAt).getTime() === new Date(opts.startAt).getTime();
    if (byRemote || byId || byStart) {
      file.bookings[i] = { ...b, status: "cancelled" };
      changed = true;
    }
  }
  if (changed) await saveSalesCalls(file);
  return { ok: true };
}
