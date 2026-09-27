"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  text: string;
  qty: number;
  done: boolean;
};

type Lista = {
  id: string;
  title: string;
  items: Item[];
  updatedAt: string;
};

function shareText(lista: Lista) {
  const pending = lista.items.filter((it) => !it.done);
  if (!pending.length) return "Lista vacía.";
  return [
    "Lista de la compra",
    ...pending.map((it) => (it.qty > 1 ? `• ${it.text} ×${it.qty}` : `• ${it.text}`)),
  ].join("\n");
}

export function ListaApp({ listId }: { listId: string }) {
  const [lista, setLista] = useState<Lista | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/lista/${listId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar");
    setLista((await res.json()) as Lista);
  }, [listId]);

  useEffect(() => {
    load().catch((e) => setErr(e instanceof Error ? e.message : "Error"));
    const t = setInterval(() => {
      load().catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, [load]);

  const pending = useMemo(() => lista?.items.filter((i) => !i.done) ?? [], [lista]);
  const done = useMemo(() => lista?.items.filter((i) => i.done) ?? [], [lista]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  async function mutate(fn: () => Promise<Response>) {
    setBusy(true);
    setErr("");
    try {
      const res = await fn();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setLista(data as Lista);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "add", text: t, qty: 1 }),
      }),
    );
  }

  async function setQty(item: Item, qty: number) {
    if (qty < 1) {
      await mutate(() => fetch(`/api/lista/${listId}?itemId=${encodeURIComponent(item.id)}`, { method: "DELETE" }));
      return;
    }
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id, qty }),
      }),
    );
  }

  async function toggleDone(item: Item) {
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id, done: !item.done }),
      }),
    );
  }

  async function remove(item: Item) {
    await mutate(() =>
      fetch(`/api/lista/${listId}?itemId=${encodeURIComponent(item.id)}`, { method: "DELETE" }),
    );
  }

  async function clearDone() {
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearDone" }),
      }),
    );
  }

  async function share() {
    if (!lista) return;
    const body = shareText(lista);
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Lista de la compra", text: body, url });
        return;
      }
    } catch {
      /* cancelado */
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(`${body}\n\n${url}`)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    if (!lista) return;
    const body = shareText(lista);
    try {
      await navigator.clipboard.writeText(body);
      flash("Copiada");
    } catch {
      flash("No se pudo copiar");
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-4">
        <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">Nevera · TAP</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#1c1915]">
          Lista de la compra
        </h1>
        <p className="mt-1 text-sm text-[#7a7266]">
          Quien toque el botón en la nevera ve y edita esta misma lista.
        </p>
      </header>

      <form onSubmit={onAdd} className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="¿Qué falta?"
          enterKeyHint="done"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3.5 text-base text-[#1c1915] placeholder:text-[#b0a89c]"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-2xl bg-[#1c1915] px-5 py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
        >
          Añadir
        </button>
      </form>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={share}
          disabled={!lista || pending.length === 0}
          className="flex-1 rounded-2xl bg-[#e2b43a] px-4 py-3 font-semibold text-[#1c1915] disabled:opacity-40"
        >
          Enviar / WhatsApp
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!lista || pending.length === 0}
          className="rounded-2xl border border-[#1c1915] px-4 py-3 font-semibold text-[#1c1915] disabled:opacity-40"
        >
          Copiar
        </button>
      </div>

      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}
      {toast ? <p className="mb-3 text-sm text-[#b0892c]">{toast}</p> : null}

      {!lista ? (
        <p className="text-sm text-[#7a7266]">Cargando…</p>
      ) : (
        <div className="flex flex-1 flex-col gap-5">
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#7a7266]">
                Por comprar ({pending.length})
              </h2>
            </div>
            {pending.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e6ddd0] bg-white/50 px-4 py-8 text-center text-sm text-[#8a8173]">
                Lista vacía. TAP y añade lo que falte.
              </p>
            ) : (
              <ul className="space-y-2">
                {pending.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-2xl border border-[#e6ddd0] bg-white px-3 py-2.5"
                  >
                    <button
                      type="button"
                      aria-label="Marcar comprado"
                      onClick={() => toggleDone(item)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#1c1915] text-lg"
                    >
                      {" "}
                    </button>
                    <span className="min-w-0 flex-1 text-[1.05rem] font-medium leading-snug text-[#1c1915]">
                      {item.text}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Menos"
                        onClick={() => setQty(item, item.qty - 1)}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0ebe3] text-lg font-bold"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-base font-semibold tabular-nums">{item.qty}</span>
                      <button
                        type="button"
                        aria-label="Más"
                        onClick={() => setQty(item, item.qty + 1)}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0ebe3] text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label="Quitar"
                      onClick={() => remove(item)}
                      className="grid h-9 w-9 place-items-center rounded-xl text-[#8a8173]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {done.length > 0 ? (
            <section>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#7a7266]">
                  Comprado ({done.length})
                </h2>
                <button type="button" onClick={clearDone} className="text-sm text-[#b0892c] underline-offset-2 hover:underline">
                  Limpiar
                </button>
              </div>
              <ul className="space-y-2">
                {done.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-2xl border border-[#ece6dc] bg-[#faf7f2] px-3 py-2.5 opacity-70"
                  >
                    <button
                      type="button"
                      aria-label="Desmarcar"
                      onClick={() => toggleDone(item)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1c1915] text-sm text-[#f6f1e7]"
                    >
                      ✓
                    </button>
                    <span className="min-w-0 flex-1 text-base line-through">{item.text}</span>
                    {item.qty > 1 ? (
                      <span className="text-sm tabular-nums text-[#8a8173]">×{item.qty}</span>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Quitar"
                      onClick={() => remove(item)}
                      className="grid h-9 w-9 place-items-center text-[#8a8173]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
