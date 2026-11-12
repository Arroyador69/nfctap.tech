import { randomBytes, randomUUID } from "crypto";
import { notifyTelegram } from "@/lib/business-leads/telegram";
import {
  CALL_DURATION_MIN,
  CALL_PROJECT_LABEL,
  type CallProject,
} from "./constants";
import { formatWhenMadrid, manageUrl, sendBookingConfirmEmail } from "./mail";
import { listOpenSlotsWithPeer } from "./availability";
import { mirrorBookingToPeer } from "./peer-sync";
import { findSlotByKey } from "./slots";
import {
  activeBookings,
  loadSalesCalls,
  saveSalesCalls,
  type SalesCallBooking,
} from "./store";

export type BookCallInput = {
  project: CallProject;
  slotKey: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  /** Reutilizar token al reprogramar. */
  manageToken?: string;
  skipTelegram?: boolean;
  skipConfirmEmail?: boolean;
};

function meetingUrl() {
  return (
    process.env.SALES_CALL_MEETING_URL?.trim() ||
    process.env.NEXT_PUBLIC_SALES_CALL_MEETING_URL?.trim() ||
    ""
  );
}

function cleanEmail(raw: string) {
  return raw.trim().toLowerCase().slice(0, 120);
}

function looksEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function newManageToken() {
  return randomBytes(24).toString("hex");
}

export async function bookSalesCall(input: BookCallInput) {
  const name = input.name.trim().slice(0, 80);
  const email = cleanEmail(input.email);
  const phone = (input.phone || "").trim().slice(0, 40);
  const company = (input.company || "").trim().slice(0, 80);
  const notes = (input.notes || "").trim().slice(0, 800);
  const slotKey = input.slotKey.trim();

  if (!name || name.length < 2) throw new Error("Pon tu nombre.");
  if (!looksEmail(email)) throw new Error("Email no válido.");
  if (!slotKey) throw new Error("Elige una hora.");

  const file = await loadSalesCalls();
  if (activeBookings(file).some((b) => b.slotKey === slotKey)) {
    throw new Error("Esa hora ya está ocupada. Elige otra.");
  }
  // Revalidar contra peer (Delfín) para no pisar
  const open = await listOpenSlotsWithPeer({ file, weekdays: 20 });
  const slot = open.find((s) => s.slotKey === slotKey) || findSlotByKey(file, slotKey);
  if (!slot) throw new Error("Esa hora ya no está disponible.");

  const booking: SalesCallBooking = {
    id: randomUUID(),
    project: input.project,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    slotKey: slot.slotKey,
    name,
    email,
    phone: phone || undefined,
    company: company || undefined,
    notes: notes || undefined,
    meetingUrl: meetingUrl() || undefined,
    manageToken: input.manageToken?.trim() || newManageToken(),
    createdAt: new Date().toISOString(),
    status: "booked",
  };

  file.bookings.push(booking);
  await saveSalesCalls(file);

  // Espejo en Delfín (silencioso; el cliente no lo ve)
  if (input.project === "nfctap") {
    void mirrorBookingToPeer({
      startAt: booking.startsAt,
      endAt: booking.endsAt,
      bookingId: booking.id,
      name: booking.name,
      email: booking.email,
    });
  }

  const when = formatWhenMadrid(booking.startsAt);
  const label = CALL_PROJECT_LABEL[input.project];
  if (!input.skipTelegram) {
    await notifyTelegram(
      [
        `${label} · nueva llamada ${CALL_DURATION_MIN} min`,
        `📅 ${when} (Madrid)`,
        `👤 ${name}${company ? ` · ${company}` : ""}`,
        `✉️ ${email}${phone ? ` · ${phone}` : ""}`,
        notes ? `💬 ${notes}` : "",
        booking.meetingUrl ? `🔗 ${booking.meetingUrl}` : "🔗 Pon SALES_CALL_MEETING_URL en Vercel",
        `Gestionar: ${manageUrl(booking)}`,
        `id ${booking.id}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (!input.skipConfirmEmail) {
    try {
      await sendBookingConfirmEmail(booking);
    } catch {
      /* no bloquea */
    }
  }

  return { booking, slot };
}
