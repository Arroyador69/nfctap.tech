import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import { CALL_PROJECT_LABEL } from "@/lib/sales-calls/constants";
import {
  bookingsTodayCount,
  cancelledBookings,
  pastBookings,
  upcomingBookings,
} from "@/lib/sales-calls/dashboard";
import { formatWhenMadrid } from "@/lib/sales-calls/mail";
import { loadSalesCalls, type SalesCallBooking } from "@/lib/sales-calls/store";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Llamadas · Dashboard" };

export default async function DashboardLlamadasPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");
  const file = await loadSalesCalls();
  const upcoming = upcomingBookings(file);
  const past = pastBookings(file);
  const cancelled = cancelledBookings(file);
  const booked = file.bookings.filter((b) => b.status === "booked");
  const todayCount = bookingsTodayCount(upcoming);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <DashboardNav />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Llamadas</h1>
          <p className="text-sm text-[#6f675c]">
            Reservas de 15 min desde outreach y /llamar. Hora Europe/Madrid.
          </p>
        </div>
        <Link href="/llamar" className="text-sm text-[#9a7420] underline">
          Página pública de reserva
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Próximas" value={String(upcoming.length)} />
        <Stat label="Hoy" value={String(todayCount)} />
        <Stat label="Total activas" value={String(booked.length)} />
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Agenda</h2>
        <CallsTable rows={upcoming} empty="No hay llamadas próximas." />
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Ya pasaron</h2>
          <CallsTable rows={past} empty="" />
        </section>
      )}

      {cancelled.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#8a8173]">
            Canceladas (últimas)
          </h2>
          <CallsTable rows={cancelled} empty="" muted />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#e6ddd0] bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-[#8a8173]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function CallsTable({
  rows,
  empty,
  muted,
}: {
  rows: SalesCallBooking[];
  empty: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`mt-4 overflow-x-auto rounded-3xl border border-[#e6ddd0] ${
        muted ? "bg-[#faf6ee]/80" : "bg-white"
      }`}
    >
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-[#faf6ee] text-[#7a7266]">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Contacto</th>
            <th className="px-4 py-3">Proyecto</th>
            <th className="px-4 py-3">Notas</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-[#8a8173]">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-[#eee6da]">
              <td className="px-4 py-3">
                <div className="font-medium capitalize">{formatWhenMadrid(b.startsAt)}</div>
                <div className="text-xs text-[#8a8173]">{b.slotKey}</div>
              </td>
              <td className="px-4 py-3">
                <div>{b.name}</div>
                {b.company && <div className="text-xs text-[#8a8173]">{b.company}</div>}
              </td>
              <td className="px-4 py-3">
                <a href={`mailto:${b.email}`} className="text-[#9a7420]">
                  {b.email}
                </a>
                {b.phone && (
                  <div>
                    <a href={`tel:${b.phone}`} className="text-xs text-[#8a8173]">
                      {b.phone}
                    </a>
                  </div>
                )}
              </td>
              <td className="px-4 py-3">{CALL_PROJECT_LABEL[b.project] || b.project}</td>
              <td className="max-w-[220px] truncate px-4 py-3 text-[#6f675c]">
                {b.notes || "—"}
              </td>
              <td className="px-4 py-3 capitalize">
                {b.status === "booked" ? (
                  <span className="rounded-full bg-[#eef6e8] px-2.5 py-1 text-xs text-[#3d6b2e]">
                    Confirmada
                  </span>
                ) : (
                  <span className="rounded-full bg-[#f3eee6] px-2.5 py-1 text-xs text-[#8a8173]">
                    Cancelada
                  </span>
                )}
                {b.meetingUrl && b.status === "booked" && (
                  <div className="mt-1">
                    <a
                      href={b.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#9a7420] underline"
                    >
                      Videollamada
                    </a>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
