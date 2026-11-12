"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = {
  slotKey: string;
  startsAt: string;
  endsAt: string;
  label: string;
  dateLabel: string;
  timeLabel: string;
};

type SlotsPayload = {
  ok: boolean;
  durationMin: number;
  bufferMin: number;
  windows: { start: string; end: string }[];
  note: string;
  byDate: Record<string, Slot[]>;
  slots: Slot[];
};

export function CallBooking() {
  const [data, setData] = useState<SlotsPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState("");
  const [slotKey, setSlotKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    label: string;
    meetingUrl: string | null;
  } | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await fetch("/api/calls/slots?days=10");
        const json = (await res.json()) as SlotsPayload;
        if (!res.ok) throw new Error("No se pudieron cargar las horas");
        if (dead) return;
        setData(json);
        const firstDay = Object.keys(json.byDate || {})[0] || "";
        setDay(firstDay);
      } catch (e) {
        if (!dead) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  const days = useMemo(() => Object.keys(data?.byDate || {}), [data]);
  const daySlots = data?.byDate?.[day] || [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!slotKey) {
      setError("Elige una hora.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/calls/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotKey, name, email, phone, company, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo reservar");
      const label =
        daySlots.find((s) => s.slotKey === slotKey)?.label ||
        json.slot?.label ||
        slotKey;
      setDone({
        label,
        meetingUrl: json.booking?.meetingUrl || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-[#6f675c]">Cargando horas libres…</p>;
  }

  if (done) {
    return (
      <div className="rounded-[28px] border border-[#e6ddd0] bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#b0892c]">Confirmado</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          Llamada reservada
        </h2>
        <p className="mt-3 text-[#3f3a34]">
          <strong>{done.label}</strong> · 15 minutos · hora de Madrid.
        </p>
        <p className="mt-3 text-sm leading-6 text-[#5c564c]">
          Te hemos enviado un email de confirmación. Sé puntual: la hora no se atrasa. Si no
          puedes, cancela o cambia desde el enlace del mail (así liberamos el hueco).
        </p>
        {done.meetingUrl ? (
          <p className="mt-4 text-sm">
            Enlace de la videollamada:{" "}
            <a className="font-semibold underline" href={done.meetingUrl}>
              {done.meetingUrl}
            </a>
          </p>
        ) : (
          <p className="mt-4 text-sm text-[#5c564c]">
            El enlace de Zoom va en el email de confirmación.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-[28px] border border-[#e6ddd0] bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#b0892c]">
          Atención comercial · 15 min
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          Reserva tu llamada
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5c564c]">
          Lunes a viernes · 09:00–14:00 y 16:00–19:00 (Madrid). Cada llamada dura{" "}
          <strong>15 minutos</strong>. Entre citas dejamos margen: la hora es fija y{" "}
          <strong>no se puede atrasar</strong>.
        </p>
        {data?.windows ? (
          <p className="mt-2 text-xs text-[#8a8173]">
            Ventanas: {data.windows.map((w) => `${w.start}–${w.end}`).join(" · ")}
          </p>
        ) : null}

        <div className="mt-6">
          <p className="text-sm font-medium text-[#1c1915]">Día</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {days.length === 0 ? (
              <p className="text-sm text-[#6f675c]">No hay huecos en los próximos días.</p>
            ) : (
              days.map((d) => {
                const label = data?.byDate[d]?.[0]?.dateLabel || d;
                const active = d === day;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDay(d);
                      setSlotKey("");
                    }}
                    className={`rounded-full px-4 py-2 text-sm ${
                      active
                        ? "bg-[#1c1915] text-[#f6f1e7]"
                        : "border border-[#e6ddd0] bg-[#f7f3eb] text-[#3f3a34]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-[#1c1915]">Hora (15 min)</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {daySlots.map((s) => {
              const active = s.slotKey === slotKey;
              return (
                <button
                  key={s.slotKey}
                  type="button"
                  onClick={() => setSlotKey(s.slotKey)}
                  className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
                    active
                      ? "bg-[#1c1915] text-[#f6f1e7]"
                      : "border border-[#e6ddd0] bg-white text-[#1c1915] hover:border-[#1c1915]"
                  }`}
                >
                  {s.timeLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[#e6ddd0] bg-white p-6 sm:p-8">
        <p className="text-sm font-medium">Tus datos</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Nombre *
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#e6ddd0] bg-[#f7f3eb] px-4 py-3 outline-none focus:border-[#1c1915]"
            />
          </label>
          <label className="block text-sm">
            Email *
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#e6ddd0] bg-[#f7f3eb] px-4 py-3 outline-none focus:border-[#1c1915]"
            />
          </label>
          <label className="block text-sm">
            Teléfono
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#e6ddd0] bg-[#f7f3eb] px-4 py-3 outline-none focus:border-[#1c1915]"
            />
          </label>
          <label className="block text-sm">
            Negocio
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#e6ddd0] bg-[#f7f3eb] px-4 py-3 outline-none focus:border-[#1c1915]"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          Comentarios para la llamada
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Qué usáis ahora (QR, Google…), cuántos puntos de toque, dudas…"
            className="mt-1 w-full rounded-2xl border border-[#e6ddd0] bg-[#f7f3eb] px-4 py-3 outline-none focus:border-[#1c1915]"
          />
        </label>

        {error ? <p className="mt-4 text-sm text-[#a33]">{error}</p> : null}

        <button
          type="submit"
          disabled={busy || !slotKey}
          className="mt-6 w-full rounded-full bg-[#1c1915] px-6 py-3.5 text-sm font-semibold text-[#f6f1e7] disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Reservando…" : "Confirmar llamada de 15 min"}
        </button>
        <p className="mt-3 text-xs leading-5 text-[#8a8173]">
          Al reservar aceptas que te contactemos sobre esta cita. La hora elegida es fija.
        </p>
      </div>
    </form>
  );
}
