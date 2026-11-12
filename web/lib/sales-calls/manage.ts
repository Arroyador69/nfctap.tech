import { notifyTelegram } from "@/lib/business-leads/telegram";
import { bookSalesCall } from "./book";
import { CALL_DURATION_MIN, CALL_PROJECT_LABEL } from "./constants";
import {
  formatWhenMadrid,
  sendBookingCancelledEmail,
  sendBookingConfirmEmail,
} from "./mail";
import { mirrorCancelToPeer } from "./peer-sync";
import { loadSalesCalls, saveSalesCalls, type SalesCallBooking } from "./store";

export async function findBookingByToken(token: string) {
  const t = token.trim();
  if (!t || t.length < 16) return null;
  const file = await loadSalesCalls();
  return file.bookings.find((b) => b.manageToken === t) || null;
}

export async function cancelBookingByToken(token: string) {
  const file = await loadSalesCalls();
  const idx = file.bookings.findIndex((b) => b.manageToken === token.trim());
  if (idx < 0) throw new Error("Reserva no encontrada.");
  const booking = file.bookings[idx];
  if (booking.status === "cancelled") return booking;

  const next: SalesCallBooking = { ...booking, status: "cancelled" };
  file.bookings[idx] = next;
  await saveSalesCalls(file);

  void mirrorCancelToPeer({
    remoteId: booking.id,
    startAt: booking.startsAt,
  });

  const when = formatWhenMadrid(booking.startsAt);
  await notifyTelegram(
    [
      `${CALL_PROJECT_LABEL[booking.project]} · llamada cancelada`,
      `📅 ${when}`,
      `👤 ${booking.name} · ${booking.email}`,
      `id ${booking.id}`,
    ].join("\n"),
  );
  try {
    await sendBookingCancelledEmail(next);
  } catch {
    /* */
  }
  return next;
}

/** Cancela la actual y reserva otra hora (mismo enlace de gestión). */
export async function rescheduleBookingByToken(token: string, slotKey: string) {
  const file = await loadSalesCalls();
  const idx = file.bookings.findIndex((b) => b.manageToken === token.trim());
  if (idx < 0) throw new Error("Reserva no encontrada.");
  const prev = file.bookings[idx];
  if (prev.status !== "booked") throw new Error("Esta reserva ya no está activa.");
  if (new Date(prev.startsAt).getTime() < Date.now() + 30 * 60_000) {
    throw new Error(
      "Faltan menos de 30 minutos: no se puede cambiar. Cancela si no puedes asistir.",
    );
  }

  file.bookings[idx] = { ...prev, status: "cancelled" };
  await saveSalesCalls(file);
  void mirrorCancelToPeer({ remoteId: prev.id, startAt: prev.startsAt });

  const { booking, slot } = await bookSalesCall({
    project: prev.project,
    slotKey,
    name: prev.name,
    email: prev.email,
    phone: prev.phone,
    company: prev.company,
    notes: prev.notes
      ? `${prev.notes}\n(Reprogramada desde ${prev.slotKey})`
      : `Reprogramada desde ${prev.slotKey}`,
    manageToken: prev.manageToken,
    skipTelegram: true,
    skipConfirmEmail: true,
  });

  try {
    await sendBookingConfirmEmail(booking);
  } catch {
    /* */
  }

  await notifyTelegram(
    [
      `${CALL_PROJECT_LABEL[prev.project]} · llamada reprogramada`,
      `Antes: ${formatWhenMadrid(prev.startsAt)}`,
      `Ahora: ${formatWhenMadrid(booking.startsAt)} · ${CALL_DURATION_MIN} min`,
      `👤 ${prev.name} · ${prev.email}`,
    ].join("\n"),
  );

  return { booking, slot, previous: prev };
}
