import { randomUUID } from "crypto";
import { notifyTelegram } from "@/lib/business-leads/telegram";
import {
  CALL_DURATION_MIN,
  CALL_PROJECT_LABEL,
  type CallProject,
} from "./constants";
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
  const slot = findSlotByKey(file, slotKey);
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
    createdAt: new Date().toISOString(),
    status: "booked",
  };

  file.bookings.push(booking);
  await saveSalesCalls(file);

  const when = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(booking.startsAt));

  const label = CALL_PROJECT_LABEL[input.project];
  await notifyTelegram(
    [
      `${label} · nueva llamada ${CALL_DURATION_MIN} min`,
      `📅 ${when} (Madrid)`,
      `👤 ${name}${company ? ` · ${company}` : ""}`,
      `✉️ ${email}${phone ? ` · ${phone}` : ""}`,
      notes ? `💬 ${notes}` : "",
      booking.meetingUrl ? `🔗 ${booking.meetingUrl}` : "🔗 Pon SALES_CALL_MEETING_URL en Vercel",
      `id ${booking.id}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  // Confirmación al cliente (best-effort)
  try {
    await sendBookingConfirmEmail(booking, when, input.project);
  } catch {
    /* no bloquea la reserva */
  }

  return { booking, slot };
}

async function sendBookingConfirmEmail(
  booking: SalesCallBooking,
  whenLabel: string,
  project: CallProject,
) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) return;
  const from =
    (process.env.RESEND_FROM || "").trim() ||
    (project === "delfin"
      ? "Delfín Check-in <hola@delfincheckin.com>"
      : "NFCTap <hola@nfctap.tech>");
  const brand = project === "delfin" ? "Delfín Check-in" : "NFCTap";
  const meet = booking.meetingUrl
    ? `\nEnlace videollamada: ${booking.meetingUrl}\n`
    : "\nTe enviaremos el enlace de la videollamada si aún no está en este mail.\n";
  const text = `Hola ${booking.name},

Tu llamada de ${CALL_DURATION_MIN} minutos con ${brand} quedó reservada:

${whenLabel} (hora de Madrid)

Importante: la hora es fija y no se puede atrasar. Si llegas tarde, es posible que no podamos atenderte porque la agenda va llena.
${meet}
Si no pediste esta cita, responde a este correo.

Un saludo,
${brand}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [booking.email],
      subject: `${brand}: llamada ${CALL_DURATION_MIN} min · ${whenLabel}`,
      text,
    }),
  });
}
