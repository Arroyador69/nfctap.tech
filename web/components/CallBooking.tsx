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

const WD = ["L", "M", "X", "J", "V"] as const;

function parseDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m: m - 1, d };
}

function weekdayMon0(key: string) {
  const { y, m, d } = parseDay(key);
  // JS: 0=dom … 6=sáb → mon0: 0=lun … 4=vie
  const js = new Date(Date.UTC(y, m, d, 12)).getUTCDay();
  return (js + 6) % 7;
}

function monthLabel(y: number, m: number) {
  const raw = new Date(Date.UTC(y, m, 1)).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function CallBooking() {
  const [data, setData] = useState<SlotsPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState("");
  const [slotKey, setSlotKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewMonth, setViewMonth] = useState<{ y: number; m: number } | null>(null);
  const [done, setDone] = useState<{
    label: string;
    meetingUrl: string | null;
  } | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await fetch("/api/calls/slots?days=14");
        const json = (await res.json()) as SlotsPayload;
        if (!res.ok) throw new Error("No se pudieron cargar las horas");
        if (dead) return;
        setData(json);
        const firstDay = Object.keys(json.byDate || {})[0] || "";
        setDay(firstDay);
        if (firstDay) {
          const { y, m } = parseDay(firstDay);
          setViewMonth({ y, m });
        } else {
          const now = new Date();
          setViewMonth({ y: now.getFullYear(), m: now.getMonth() });
        }
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

  const availableDays = useMemo(() => new Set(Object.keys(data?.byDate || {})), [data]);
  const daySlots = data?.byDate?.[day] || [];

  const monthGrid = useMemo(() => {
    if (!viewMonth) return [] as Array<Array<{ key: string; dayNum: number } | null>>;
    const { y, m } = viewMonth;
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const weeks: Array<Array<{ key: string; dayNum: number } | null>> = [];
    let week: Array<{ key: string; dayNum: number } | null> = [null, null, null, null, null];
    let weekHas = false;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const col = weekdayMon0(key);
      if (col > 4) continue;
      if (col === 0 && weekHas) {
        weeks.push(week);
        week = [null, null, null, null, null];
        weekHas = false;
      }
      week[col] = { key, dayNum: d };
      weekHas = true;
      if (col === 4) {
        weeks.push(week);
        week = [null, null, null, null, null];
        weekHas = false;
      }
    }
    if (weekHas) weeks.push(week);
    return weeks;
  }, [viewMonth]);

  function shiftMonth(delta: number) {
    if (!viewMonth) return;
    const d = new Date(Date.UTC(viewMonth.y, viewMonth.m + delta, 1));
    setViewMonth({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  }

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
        body: JSON.stringify({ slotKey, name, email, phone, notes }),
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
          Te hemos enviado un email de confirmación y un recordatorio 1 h antes. Sé puntual: la
          hora no se atrasa. Si no puedes, cancela o cambia desde el enlace del mail.
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

  const dayTitle = daySlots[0]?.dateLabel || day;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-[28px] border border-[#e6ddd0] bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#b0892c]">Equipo comercial</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
          Reserva una llamada de 15 min
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5c564c] sm:text-base">
          Te enseñamos NFCTap en videollamada corta. Lunes a viernes · 09:00–14:00 y 16:00–19:00
          (Madrid). Entre el final de una cita y el inicio de la siguiente dejamos 30 min.
        </p>
        <div className="mt-4 rounded-2xl border border-[#f0e0a8] bg-[#fff8e6] px-4 py-3 text-sm text-[#5c4a1a]">
          La llamada es puntual (15 min). Huecos cada 45 min para no pisarnos.
        </div>

        {/* Calendario mes L–V */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-full border border-[#e6ddd0] px-3 py-1.5 text-sm text-[#3f3a34] hover:border-[#1c1915]"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <p className="font-[family-name:var(--font-display)] text-xl sm:text-2xl">
              {viewMonth ? monthLabel(viewMonth.y, viewMonth.m) : ""}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-full border border-[#e6ddd0] px-3 py-1.5 text-sm text-[#3f3a34] hover:border-[#1c1915]"
              aria-label="Mes siguiente"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-[#8a8173]">
            {WD.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="mt-1 space-y-2">
            {monthGrid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-5 gap-2">
                {week.map((cell, ci) => {
                  if (!cell) {
                    return <div key={`e-${wi}-${ci}`} className="aspect-square sm:aspect-auto sm:min-h-[3.25rem]" />;
                  }
                  const open = availableDays.has(cell.key);
                  const active = cell.key === day;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      disabled={!open}
                      onClick={() => {
                        setDay(cell.key);
                        setSlotKey("");
                      }}
                      className={`flex aspect-square min-h-[3rem] items-center justify-center rounded-2xl text-base font-semibold transition sm:aspect-auto sm:min-h-[3.5rem] sm:text-lg ${
                        active
                          ? "bg-[#2563eb] text-white shadow-sm"
                          : open
                            ? "border-2 border-[#2563eb] bg-white text-[#1c1915] hover:bg-[#eff6ff]"
                            : "border border-[#eee8de] bg-[#faf7f1] text-[#c4bbb0]"
                      }`}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {availableDays.size === 0 ? (
            <p className="mt-4 text-sm text-[#6f675c]">No hay huecos en los próximos días.</p>
          ) : null}
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium text-[#1c1915]">
            Hora · {dayTitle || "elige un día"} (15 min · puntual)
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {day && daySlots.length === 0 ? (
              <p className="col-span-full text-sm text-[#6f675c]">Sin huecos ese día.</p>
            ) : null}
            {daySlots.map((s) => {
              const active = s.slotKey === slotKey;
              return (
                <button
                  key={s.slotKey}
                  type="button"
                  onClick={() => setSlotKey(s.slotKey)}
                  className={`rounded-2xl px-3 py-3.5 text-sm font-semibold sm:text-base ${
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
              placeholder="Tu nombre"
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
              placeholder="tu@email.com"
              className="mt-1 w-full rounded-2xl border border-[#e6ddd0] bg-[#f7f3eb] px-4 py-3 outline-none focus:border-[#1c1915]"
            />
            <span className="mt-1 block text-xs text-[#8a8173]">
              Obligatorio: aquí enviamos la confirmación y el recordatorio 1 h antes
            </span>
          </label>
          <label className="block text-sm sm:col-span-2">
            Teléfono
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#e6ddd0] bg-[#f7f3eb] px-4 py-3 outline-none focus:border-[#1c1915]"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          ¿Qué te gustaría resolver en la llamada?
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
          className="mt-6 w-full rounded-full bg-[#7eb8e8] px-6 py-3.5 text-sm font-semibold text-[#0f172a] disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Reservando…" : "Confirmar llamada de 15 min"}
        </button>
        <p className="mt-3 text-xs leading-5 text-[#8a8173]">
          Importante: la hora es fija. Si llegas tarde puede que hayamos pasado a la siguiente cita.
        </p>
      </div>
    </form>
  );
}
