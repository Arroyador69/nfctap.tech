import type { CallProject } from "./constants";
import { CALL_BLOB_KEY } from "./constants";

export type SalesCallBooking = {
  id: string;
  project: CallProject;
  /** Inicio en ISO UTC. */
  startsAt: string;
  endsAt: string;
  /** Clave local Madrid YYYY-MM-DDTHH:mm */
  slotKey: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  meetingUrl?: string;
  /** Token opaco para cancelar / cambiar hora (mail). */
  manageToken: string;
  /** Id remoto cuando es espejo del peer (Delfín). */
  peerMirrorId?: string;
  /** ISO cuando se envió el recordatorio ~1 h antes. */
  reminderSentAt?: string;
  createdAt: string;
  status: "booked" | "cancelled";
};

export type SalesCallsFile = {
  updatedAt: string;
  bookings: SalesCallBooking[];
};

function blobOk() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function loadSalesCalls(): Promise<SalesCallsFile> {
  const empty: SalesCallsFile = { updatedAt: new Date().toISOString(), bookings: [] };
  if (!blobOk()) return empty;
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(CALL_BLOB_KEY, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return empty;
    const text = await new Response(result.stream).text();
    if (!text) return empty;
    const parsed = JSON.parse(text) as SalesCallsFile;
    return {
      updatedAt: parsed.updatedAt || empty.updatedAt,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
    };
  } catch {
    return empty;
  }
}

export async function saveSalesCalls(file: SalesCallsFile) {
  if (!blobOk()) throw new Error("Falta BLOB_READ_WRITE_TOKEN");
  const { put } = await import("@vercel/blob");
  const next: SalesCallsFile = {
    ...file,
    updatedAt: new Date().toISOString(),
  };
  await put(CALL_BLOB_KEY, JSON.stringify(next), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return next;
}

export function activeBookings(file: SalesCallsFile) {
  return file.bookings.filter((b) => b.status === "booked");
}
