import { BRAND } from "@/lib/catalog";
import { CALL_DURATION_MIN, CALL_PROJECT_LABEL, type CallProject } from "./constants";
import { siteUrl } from "./secrets";
import type { SalesCallBooking } from "./store";

function brandOf(project: CallProject) {
  return project === "delfin" ? "Delfín Check-in" : "NFCTap";
}

function fromOf(project: CallProject) {
  if (project === "delfin") {
    return (
      process.env.DELFIN_RESEND_FROM?.trim() ||
      process.env.RESEND_FROM?.trim() ||
      "Delfín Check-in <hola@delfincheckin.com>"
    );
  }
  return (
    process.env.RESEND_FROM?.trim() || `NFCTap <hola@${BRAND.domain}>`
  );
}

async function sendResend(opts: {
  project: CallProject;
  to: string;
  subject: string;
  text: string;
}) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) return { ok: false as const, error: "no_resend" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromOf(opts.project),
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false as const, error: body.slice(0, 200) };
  }
  return { ok: true as const };
}

export function formatWhenMadrid(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function manageUrl(booking: SalesCallBooking) {
  return `${siteUrl()}/llamar/gestionar?token=${encodeURIComponent(booking.manageToken)}`;
}

export async function sendBookingConfirmEmail(booking: SalesCallBooking) {
  const brand = brandOf(booking.project);
  const when = formatWhenMadrid(booking.startsAt);
  const manage = manageUrl(booking);
  const meet = booking.meetingUrl
    ? `Enlace videollamada: ${booking.meetingUrl}\n`
    : "";
  const text = `Hola ${booking.name},

Tu llamada de ${CALL_DURATION_MIN} minutos con ${brand} está confirmada.

📅 ${when} (hora de Madrid)
⏱ Duración: ${CALL_DURATION_MIN} minutos

${meet}
Importante: la hora es fija. No se puede atrasar — invertimos ese hueco en la agenda y si llegas tarde puede que no podamos atenderte.

¿Necesitas cambiar de hora o cancelar?
Hazlo desde este enlace (así liberamos el hueco):
${manage}

Un saludo,
Equipo de atención comercial · ${brand}`;

  return sendResend({
    project: booking.project,
    to: booking.email,
    subject: `${brand}: llamada confirmada · ${when}`,
    text,
  });
}

export async function sendBookingReminderEmail(booking: SalesCallBooking) {
  const brand = brandOf(booking.project);
  const when = formatWhenMadrid(booking.startsAt);
  const manage = manageUrl(booking);
  const meet = booking.meetingUrl
    ? `Enlace: ${booking.meetingUrl}\n`
    : "";
  const text = `Hola ${booking.name},

Recordatorio: tu llamada con ${brand} es en aproximadamente 1 hora.

📅 ${when} (Madrid) · ${CALL_DURATION_MIN} min
${meet}
Sé puntual: la hora no se atrasa.

Si no puedes, cancela o cambia ahora:
${manage}

${CALL_PROJECT_LABEL[booking.project]} · atención comercial`;

  return sendResend({
    project: booking.project,
    to: booking.email,
    subject: `${brand}: tu llamada es en 1 hora · ${when}`,
    text,
  });
}

export async function sendBookingCancelledEmail(booking: SalesCallBooking) {
  const brand = brandOf(booking.project);
  const when = formatWhenMadrid(booking.startsAt);
  const bookAgain =
    booking.project === "delfin"
      ? "https://delfincheckin.com/llamar"
      : `${siteUrl()}/llamar`;
  const text = `Hola ${booking.name},

Tu llamada del ${when} (Madrid) con ${brand} ha quedado cancelada.

Si quieres otra hora:
${bookAgain}

Un saludo,
${brand}`;

  return sendResend({
    project: booking.project,
    to: booking.email,
    subject: `${brand}: llamada cancelada`,
    text,
  });
}
