"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type TallerSection = "filamento" | "adhesivos" | "recambios" | "embalaje";
export type TallerUnit = "uds" | "bobinas" | "ml";
export type TallerColor = "" | "negro" | "blanco" | "amarillo" | "otro";

export type TallerItemView = {
  id: string;
  text: string;
  qty: number;
  unit: TallerUnit;
  section: TallerSection;
  color: TallerColor;
  done: boolean;
};

export type TallerView = {
  id: string;
  title: string;
  items: TallerItemView[];
  updatedAt: string;
};

const SECTIONS: { id: TallerSection; label: string }[] = [
  { id: "filamento", label: "Filamento" },
  { id: "adhesivos", label: "Adhesivos" },
  { id: "recambios", label: "Recambios" },
  { id: "embalaje", label: "Embalaje" },
];

const COLORS: { id: TallerColor; label: string }[] = [
  { id: "", label: "—" },
  { id: "negro", label: "Negro" },
  { id: "blanco", label: "Blanco" },
  { id: "amarillo", label: "Amarillo" },
  { id: "otro", label: "Otro" },
];

function normalizeItem(it: TallerItemView): TallerItemView {
  return {
    ...it,
    unit: it.unit === "bobinas" || it.unit === "ml" ? it.unit : "uds",
    section:
      it.section === "adhesivos" || it.section === "recambios" || it.section === "embalaje"
        ? it.section
        : "filamento",
    color:
      it.color === "negro" || it.color === "blanco" || it.color === "amarillo" || it.color === "otro"
        ? it.color
        : "",
  };
}

function formatQty(qty: number, unit: TallerUnit) {
  if (unit === "ml") return `${qty} ml`;
  if (unit === "bobinas") return qty > 1 ? `${qty} bob.` : "1 bob.";
  return qty > 1 ? `×${qty}` : "";
}

function itemLine(it: TallerItemView) {
  const q = formatQty(it.qty, it.unit);
  const color = it.section === "filamento" && it.color ? ` (${it.color})` : "";
  return q ? `• ${it.text}${color} ${q}` : `• ${it.text}${color}`;
}

function shareText(items: TallerItemView[]) {
  const pending = items.filter((it) => !it.done).map(normalizeItem);
  if (!pending.length) return "Nada pendiente de comprar.";
  const lines = ["Material taller · NFCTap"];
  for (const { id, label } of SECTIONS) {
    const group = pending.filter((it) => it.section === id);
    if (!group.length) continue;
    lines.push("", label);
    for (const it of group) lines.push(itemLine(it));
  }
  return lines.join("\n");
}

function defaultUnit(section: TallerSection): TallerUnit {
  if (section === "filamento") return "bobinas";
  if (section === "adhesivos") return "ml";
  return "uds";
}

/** Atajos AD5X + consumibles frecuentes del taller NFCTap. */
const QUICK_ADDS: {
  label: string;
  text: string;
  section: TallerSection;
  unit: TallerUnit;
  color: TallerColor;
  qty: number;
}[] = [
  { label: "PLA negro", text: "PLA", section: "filamento", unit: "bobinas", color: "negro", qty: 1 },
  { label: "PLA blanco", text: "PLA", section: "filamento", unit: "bobinas", color: "blanco", qty: 1 },
  { label: "PLA amarillo", text: "PLA", section: "filamento", unit: "bobinas", color: "amarillo", qty: 1 },
  { label: "3M", text: "Cinta 3M", section: "adhesivos", unit: "uds", color: "", qty: 1 },
  { label: "Boquilla 0,4", text: "Boquilla 0,4", section: "recambios", unit: "uds", color: "", qty: 1 },
  { label: "Cajas", text: "Cajas envío", section: "embalaje", unit: "uds", color: "", qty: 10 },
];

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-2.5 py-2 text-xs font-semibold transition sm:text-sm ${
        active ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-transparent text-[#5c564c]"
      }`}
    >
      {children}
    </button>
  );
}

export function TallerLocked({
  listId,
  reason,
  activateError,
}: {
  listId: string;
  reason: "fuera_casa" | "sin_activar";
  activateError?: string;
}) {
  const [clave, setClave] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(activateError || "");
  const router = useRouter();

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/taller/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "registerHome", secret: clave }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo activar");
      router.replace(`/taller/${listId}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">Taller · privado</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#1c1915]">
        Material taller
      </h1>
      <p className="mt-3 text-base leading-relaxed text-[#5c564c]">
        {reason === "sin_activar"
          ? "Primera vez: introduce la clave en la Wi‑Fi de casa. Luego el TAP del botón NFCTap abre directo."
          : "Este móvil aún no está activado. Conéctate a la Wi‑Fi de casa e introduce la clave una sola vez."}
      </p>

      <form onSubmit={onUnlock} className="mt-6 flex flex-col gap-3">
        <label className="text-sm font-medium text-[#5c564c]" htmlFor="clave-taller">
          Clave (solo la primera vez)
        </label>
        <input
          id="clave-taller"
          type="password"
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Clave del dashboard"
          className="rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3.5 text-base text-[#1c1915]"
        />
        <button
          type="submit"
          disabled={busy || !clave.trim()}
          className="rounded-2xl bg-[#1c1915] px-5 py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
        >
          {busy ? "Abriendo…" : "Abrir taller"}
        </button>
      </form>

      {err ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-[#8a8173]">
        Filamento, pegamento, recambios y embalaje de NFCTap. Solo en tu red.
      </p>
    </div>
  );
}

export function TallerApp({
  listId,
  initial,
  justActivated,
}: {
  listId: string;
  initial: TallerView;
  justActivated?: boolean;
}) {
  const [taller, setTaller] = useState<TallerView>({
    ...initial,
    items: initial.items.map(normalizeItem),
  });
  const [text, setText] = useState("");
  const [section, setSection] = useState<TallerSection>("filamento");
  const [unit, setUnit] = useState<TallerUnit>("bobinas");
  const [color, setColor] = useState<TallerColor>("negro");
  const [qtyDraft, setQtyDraft] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(justActivated ? "Dispositivo listo · Wi‑Fi de casa" : "");
  const [err, setErr] = useState("");

  const pending = useMemo(
    () => taller.items.filter((i) => !i.done).map(normalizeItem),
    [taller],
  );
  const done = useMemo(
    () => taller.items.filter((i) => i.done).map(normalizeItem),
    [taller],
  );

  const pendingBySection = useMemo(() => {
    return SECTIONS.map(({ id, label }) => ({
      id,
      label,
      items: pending.filter((it) => it.section === id),
    })).filter((g) => g.items.length > 0);
  }, [pending]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  }

  function applyTaller(data: TallerView) {
    setTaller({ ...data, items: data.items.map(normalizeItem) });
  }

  async function mutate(fn: () => Promise<Response>) {
    setBusy(true);
    setErr("");
    try {
      const res = await fn();
      const data = await res.json();
      if (res.status === 403) {
        setErr(data.error || "Solo en la Wi‑Fi de casa");
        return null;
      }
      if (!res.ok) throw new Error(data.error || "Error");
      applyTaller(data as TallerView);
      return data as TallerView;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function onSection(s: TallerSection) {
    setSection(s);
    const u = defaultUnit(s);
    setUnit(u);
    setQtyDraft(u === "ml" ? 50 : 1);
    if (s !== "filamento") setColor("");
    else if (!color) setColor("negro");
  }

  async function addItem(input: {
    text: string;
    qty: number;
    unit: TallerUnit;
    section: TallerSection;
    color: TallerColor;
  }) {
    const t = input.text.trim();
    if (!t) return;
    await mutate(() =>
      fetch(`/api/taller/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add",
          text: t,
          qty: Math.max(1, input.qty || 1),
          unit: input.unit,
          section: input.section,
          color: input.section === "filamento" ? input.color : "",
        }),
      }),
    );
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    setQtyDraft(unit === "ml" ? 50 : 1);
    await addItem({
      text: t,
      qty: qtyDraft || 1,
      unit,
      section,
      color: section === "filamento" ? color : "",
    });
  }

  async function onQuick(q: (typeof QUICK_ADDS)[number]) {
    await addItem({
      text: q.text,
      qty: q.qty,
      unit: q.unit,
      section: q.section,
      color: q.color,
    });
    flash(`+ ${q.label}`);
  }

  async function bump(item: TallerItemView, dir: 1 | -1) {
    const step = item.unit === "ml" ? 50 : 1;
    const next = item.qty + dir * step;
    if (next < 1) {
      await mutate(() =>
        fetch(`/api/taller/${listId}?itemId=${encodeURIComponent(item.id)}`, {
          method: "DELETE",
        }),
      );
      return;
    }
    await mutate(() =>
      fetch(`/api/taller/${listId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id, qty: next }),
      }),
    );
  }

  async function toggleDone(item: TallerItemView) {
    await mutate(() =>
      fetch(`/api/taller/${listId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id, done: !item.done }),
      }),
    );
  }

  async function remove(item: TallerItemView) {
    await mutate(() =>
      fetch(`/api/taller/${listId}?itemId=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      }),
    );
  }

  async function clearDone() {
    await mutate(() =>
      fetch(`/api/taller/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearDone" }),
      }),
    );
    flash("Comprados borrados");
  }

  async function copyList() {
    try {
      await navigator.clipboard.writeText(shareText(taller.items));
      flash("Lista copiada");
    } catch {
      setErr("No se pudo copiar");
    }
  }

  async function shareWhatsApp() {
    const body = shareText(taller.items);
    const url = `https://wa.me/?text=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-5 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">NFCTap · taller</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Material a comprar
      </h1>
      <p className="mt-2 text-sm text-[#6f675c]">
        Filamento, pegamento, recambios y embalaje. Solo en tu Wi‑Fi.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {QUICK_ADDS.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={busy}
            onClick={() => onQuick(q)}
            className="rounded-full border border-[#e6ddd0] bg-white px-3 py-1.5 text-xs font-semibold text-[#1c1915] disabled:opacity-40"
          >
            + {q.label}
          </button>
        ))}
      </div>

      <form onSubmit={onAdd} className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-1 rounded-2xl border border-[#e6ddd0] bg-[#faf6ee] p-1">
          {SECTIONS.map((s) => (
            <SegBtn key={s.id} active={section === s.id} onClick={() => onSection(s.id)}>
              {s.label}
            </SegBtn>
          ))}
        </div>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            section === "filamento"
              ? "PLA mate, PETG…"
              : section === "adhesivos"
                ? "3M, laca para cama…"
                : section === "recambios"
                  ? "Boquilla 0,4, PEI…"
                  : "Caja, cinta, etiqueta…"
          }
          className="w-full rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3.5 text-base text-[#1c1915]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[#e6ddd0] bg-white p-0.5">
            {(["bobinas", "uds", "ml"] as TallerUnit[]).map((u) => (
              <SegBtn
                key={u}
                active={unit === u}
                onClick={() => {
                  setUnit(u);
                  setQtyDraft(u === "ml" ? 50 : 1);
                }}
              >
                {u === "bobinas" ? "Bobinas" : u === "ml" ? "ml" : "Uds"}
              </SegBtn>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-[#e6ddd0] bg-white px-2 py-1">
            <button
              type="button"
              className="px-2 text-lg font-bold text-[#1c1915]"
              onClick={() =>
                setQtyDraft((q) => Math.max(1, q - (unit === "ml" ? 50 : 1)))
              }
            >
              −
            </button>
            <span className="min-w-[2.5rem] text-center text-sm font-semibold">{qtyDraft}</span>
            <button
              type="button"
              className="px-2 text-lg font-bold text-[#1c1915]"
              onClick={() =>
                setQtyDraft((q) => q + (unit === "ml" ? 50 : 1))
              }
            >
              +
            </button>
          </div>
        </div>

        {section === "filamento" ? (
          <div className="flex flex-wrap gap-1 rounded-2xl border border-[#e6ddd0] bg-[#faf6ee] p-1">
            {COLORS.filter((c) => c.id).map((c) => (
              <SegBtn key={c.id} active={color === c.id} onClick={() => setColor(c.id)}>
                {c.label}
              </SegBtn>
            ))}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="w-full rounded-2xl bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
        >
          Añadir a comprar
        </button>
      </form>

      {toast ? (
        <p className="mt-3 rounded-2xl bg-[#1c1915] px-4 py-2 text-center text-sm text-[#f6f1e7]">
          {toast}
        </p>
      ) : null}
      {err ? (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="mt-6 space-y-5">
        {pendingBySection.length === 0 ? (
          <p className="text-sm text-[#8a8173]">Nada pendiente. Añade lo que falte en el taller.</p>
        ) : (
          pendingBySection.map((g) => (
            <section key={g.id}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#b0892c]">
                {g.label}
              </h2>
              <ul className="space-y-2">
                {g.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-2 rounded-2xl border border-[#e6ddd0] bg-white px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDone(it)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#1c1915] text-xs"
                      aria-label="Marcar comprado"
                    >
                      ✓
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#1c1915]">
                        {it.text}
                        {it.color ? (
                          <span className="font-normal text-[#8a8173]"> · {it.color}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[#8a8173]">{formatQty(it.qty, it.unit) || "1"}</p>
                    </div>
                    <button type="button" className="px-2 text-lg" onClick={() => bump(it, -1)}>
                      −
                    </button>
                    <button type="button" className="px-2 text-lg" onClick={() => bump(it, 1)}>
                      +
                    </button>
                    <button
                      type="button"
                      className="px-1 text-sm text-[#b42318]"
                      onClick={() => remove(it)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {done.length > 0 ? (
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8173]">
              Ya comprado
            </h2>
            <button type="button" onClick={clearDone} className="text-xs font-semibold text-[#b0892c]">
              Limpiar
            </button>
          </div>
          <ul className="space-y-1 opacity-60">
            {done.map((it) => (
              <li key={it.id} className="flex items-center gap-2 px-1 py-1 text-sm line-through">
                <button type="button" onClick={() => toggleDone(it)} className="text-[#1c1915]">
                  ↩
                </button>
                {it.text}
                {it.color ? ` · ${it.color}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#e6ddd0] bg-[#f6f1e8]/95 px-5 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg gap-2">
          <button
            type="button"
            onClick={copyList}
            className="flex-1 rounded-2xl border border-[#1c1915] py-3 text-sm font-semibold text-[#1c1915]"
          >
            Copiar
          </button>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex-1 rounded-2xl bg-[#1c1915] py-3 text-sm font-semibold text-[#f6f1e7]"
          >
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
