"use client";

import { useEffect, useMemo, useState } from "react";

type BookingView = {
  id: string;
  status: string;
  name: string;
  email: string;
  whenLabel: string;
  durationMin: number;
  meetingUrl: string | null;
  slotKey: string;
};

type Slot = {
  slotKey: string;
  timeLabel: string;
  dateLabel: string;
  label: string;
};

async function fetchBooking(token: string): Promise<BookingView> {
  const res = await fetch(`/api/calls/manage?token=${encodeURIComponent(token)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "No encontrada");
  return json.booking as BookingView;
}

export function CallManage({ token }: { token: string }) {
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(token.trim()));
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState("");
  const [slotKey, setSlotKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = token.trim();
    if (!t) return;
    let dead = false;
    fetchBooking(t)
      .then((b) => {
        if (!dead) setBooking(b);
      })
      .catch((e) => {
        if (!dead) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => {
      dead = true;
    };
  }, [token]);

  const byDate = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const s of slots) {
      const d = s.slotKey.slice(0, 10);
      (map[d] ||= []).push(s);
    }
    return map;
  }, [slots]);

  const days = Object.keys(byDate);
  const daySlots = byDate[day] || [];

  async function reload() {
    setBusy(true);
    setError("");
    try {
      setBooking(await fetchBooking(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm("¿Cancelar esta llamada? Liberamos el hueco.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/calls/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "cancel" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cancelar");
      setMessage(json.message || "Cancelada.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function openReschedule() {
    setMode("reschedule");
    setError("");
    const res = await fetch("/api/calls/slots?days=10");
    const json = await res.json();
    const list = (json.slots || []) as Slot[];
    setSlots(list);
    const first = list[0]?.slotKey.slice(0, 10) || "";
    setDay(first);
  }

  async function confirmReschedule() {
    if (!slotKey) {
      setError("Elige una hora nueva.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/calls/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "reschedule", slotKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cambiar");
      setMessage(json.message || "Hora cambiada.");
      setMode("view");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!token.trim()) {
    return <p className="text-[#a33]">Falta el enlace de gestión.</p>;
  }
  if (loading) return <p className="text-[#6f675c]">Cargando reserva…</p>;
  if (error && !booking) {
    return <p className="text-[#a33]">{error}</p>;
  }
  if (!booking) return null;

  if (booking.status === "cancelled") {
    return (
      <div className="rounded-[28px] border border-[#e6ddd0] bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#b0892c]">Cancelada</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          Esta llamada ya no está activa
        </h2>
        <p className="mt-3 text-[#5c564c]">Era: {booking.whenLabel} (Madrid).</p>
        <a
          href="/llamar"
          className="mt-6 inline-block rounded-full bg-[#1c1915] px-5 py-3 text-sm font-semibold text-[#f6f1e7]"
        >
          Reservar otra hora
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#e6ddd0] bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#b0892c]">Tu reserva</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          {booking.whenLabel}
        </h2>
        <p className="mt-2 text-sm text-[#5c564c]">
          {booking.durationMin} minutos · hora de Madrid · no se puede atrasar
        </p>
        {booking.meetingUrl ? (
          <p className="mt-3 text-sm">
            Videollamada:{" "}
            <a className="font-semibold underline" href={booking.meetingUrl}>
              {booking.meetingUrl}
            </a>
          </p>
        ) : null}
        {message ? <p className="mt-4 text-sm text-[#2a6]">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-[#a33]">{error}</p> : null}

        {mode === "view" ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void openReschedule()}
              className="rounded-full bg-[#1c1915] px-5 py-3 text-sm font-semibold text-[#f6f1e7]"
            >
              Cambiar hora
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancel()}
              className="rounded-full border border-[#e6ddd0] px-5 py-3 text-sm font-semibold text-[#5c564c]"
            >
              Cancelar llamada
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm font-medium">Nueva hora</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDay(d);
                    setSlotKey("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm ${
                    d === day
                      ? "bg-[#1c1915] text-[#f6f1e7]"
                      : "border border-[#e6ddd0] bg-[#f7f3eb]"
                  }`}
                >
                  {byDate[d]?.[0]?.dateLabel || d}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {daySlots.map((s) => (
                <button
                  key={s.slotKey}
                  type="button"
                  onClick={() => setSlotKey(s.slotKey)}
                  className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
                    s.slotKey === slotKey
                      ? "bg-[#1c1915] text-[#f6f1e7]"
                      : "border border-[#e6ddd0]"
                  }`}
                >
                  {s.timeLabel}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || !slotKey}
                onClick={() => void confirmReschedule()}
                className="rounded-full bg-[#1c1915] px-5 py-3 text-sm font-semibold text-[#f6f1e7] disabled:opacity-50"
              >
                {busy ? "Guardando…" : "Confirmar nueva hora"}
              </button>
              <button
                type="button"
                onClick={() => setMode("view")}
                className="rounded-full border border-[#e6ddd0] px-5 py-3 text-sm"
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
