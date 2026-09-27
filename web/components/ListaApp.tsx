"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

export type ListaItemView = {
  id: string;
  text: string;
  qty: number;
  done: boolean;
  hasPhoto?: boolean;
  photoSrc?: string;
};

export type ListaView = {
  id: string;
  title: string;
  items: ListaItemView[];
  updatedAt: string;
};

function shareText(lista: ListaView) {
  const pending = lista.items.filter((it) => !it.done);
  if (!pending.length) return "Lista vacía.";
  return [
    "Lista de la compra",
    ...pending.map((it) => {
      const qty = it.qty > 1 ? ` ×${it.qty}` : "";
      const foto = it.hasPhoto ? " (foto)" : "";
      return `• ${it.text}${qty}${foto}`;
    }),
  ].join("\n");
}

async function compressImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const max = 720;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la foto");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo comprimir"))),
      "image/jpeg",
      0.72,
    );
  });
}

export function ListaLocked({
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
      const res = await fetch(`/api/lista/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "registerHome", secret: clave }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo activar");
      router.replace(`/lista/${listId}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">Nevera · privada</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#1c1915]">
        Lista de la compra
      </h1>
      <p className="mt-3 text-base leading-relaxed text-[#5c564c]">
        {reason === "sin_activar"
          ? "Activa la lista una vez con la clave del dashboard (estás en casa)."
          : "Este dispositivo aún no tiene acceso. En la Wi‑Fi de casa, introduce la clave una vez."}
      </p>

      <form onSubmit={onUnlock} className="mt-6 flex flex-col gap-3">
        <label className="text-sm font-medium text-[#5c564c]" htmlFor="clave-casa">
          Clave (la misma del dashboard)
        </label>
        <input
          id="clave-casa"
          type="password"
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Clave"
          className="rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3.5 text-base text-[#1c1915]"
        />
        <button
          type="submit"
          disabled={busy || !clave.trim()}
          className="rounded-2xl bg-[#1c1915] px-5 py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
        >
          {busy ? "Abriendo…" : "Abrir lista"}
        </button>
      </form>

      {err ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-[#8a8173]">
        Solo hace falta una vez por móvil/ordenador. Luego el TAP de la nevera abre la lista directo.
      </p>
    </div>
  );
}

export function ListaApp({
  listId,
  initial,
  justActivated,
}: {
  listId: string;
  initial: ListaView;
  justActivated?: boolean;
}) {
  const [lista, setLista] = useState(initial);
  const [text, setText] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(justActivated ? "Wi‑Fi de casa registrada" : "");
  const [err, setErr] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const itemCameraRef = useRef<HTMLInputElement>(null);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);

  const pending = useMemo(() => lista.items.filter((i) => !i.done), [lista]);
  const done = useMemo(() => lista.items.filter((i) => i.done), [lista]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
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
      setLista(data as ListaView);
      return data as ListaView;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(itemId: string, file: File) {
    setBusy(true);
    setErr("");
    try {
      const jpeg = await compressImage(file);
      const form = new FormData();
      form.set("itemId", itemId);
      form.set("photo", new File([jpeg], "foto.jpg", { type: "image/jpeg" }));
      const res = await fetch(`/api/lista/${listId}`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir la foto");
      setLista(data as ListaView);
      flash("Foto añadida");
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
    const photo = pendingPhoto;
    setPendingPhoto(null);
    const next = await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "add", text: t, qty: 1 }),
      }),
    );
    if (photo && next) {
      const item = next.items.find(
        (it) => !it.done && it.text.toLocaleLowerCase("es") === t.toLocaleLowerCase("es"),
      );
      if (item) await uploadPhoto(item.id, photo);
    }
  }

  async function setQty(item: ListaItemView, qty: number) {
    if (qty < 1) {
      await mutate(() =>
        fetch(`/api/lista/${listId}?itemId=${encodeURIComponent(item.id)}`, { method: "DELETE" }),
      );
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

  async function toggleDone(item: ListaItemView) {
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id, done: !item.done }),
      }),
    );
  }

  async function remove(item: ListaItemView) {
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

  async function clearPhoto(item: ListaItemView) {
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearPhoto", itemId: item.id }),
      }),
    );
  }

  async function refresh() {
    await mutate(() => fetch(`/api/lista/${listId}`, { cache: "no-store" }));
  }

  async function share() {
    const body = shareText(lista);
    const files: File[] = [];
    for (const item of pending) {
      if (!item.photoSrc) continue;
      try {
        const res = await fetch(item.photoSrc, { cache: "no-store" });
        if (!res.ok) continue;
        const blob = await res.blob();
        const safe = item.text.replace(/[^\w\-àáäéèëíìïóòöúùüñç ]+/gi, "").slice(0, 40) || "producto";
        files.push(new File([blob], `${safe}.jpg`, { type: blob.type || "image/jpeg" }));
      } catch {
        /* sigue sin esa foto */
      }
    }
    try {
      if (files.length && navigator.canShare?.({ files })) {
        await navigator.share({ title: "Lista de la compra", text: body, files });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "Lista de la compra", text: body });
        return;
      }
    } catch {
      /* cancelado */
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText(lista));
      flash("Copiada");
    } catch {
      flash("No se pudo copiar");
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-4">
        <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">Nevera · solo Wi‑Fi casa</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#1c1915]">
          Lista de la compra
        </h1>
        <p className="mt-1 text-sm text-[#7a7266]">
          Puedes añadir foto del producto. Al enviar, va con la lista si el móvil lo permite.
        </p>
      </header>

      <form onSubmit={onAdd} className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué falta?"
            enterKeyHint="done"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3.5 text-base text-[#1c1915] placeholder:text-[#b0a89c]"
          />
          <button
            type="button"
            aria-label="Foto"
            onClick={() => cameraRef.current?.click()}
            className="shrink-0 rounded-2xl border border-[#e6ddd0] bg-white px-3 py-3 text-sm font-semibold text-[#5c564c]"
          >
            Foto
          </button>
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="shrink-0 rounded-2xl bg-[#1c1915] px-5 py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
          >
            Añadir
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setPendingPhoto(f);
            e.target.value = "";
          }}
        />
        {pendingPhoto ? (
          <p className="text-sm text-[#b0892c]">
            Foto lista: {pendingPhoto.name || "captura"}{" "}
            <button type="button" className="underline" onClick={() => setPendingPhoto(null)}>
              quitar
            </button>
          </p>
        ) : null}
      </form>

      <input
        ref={itemCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const id = photoTargetId;
          e.target.value = "";
          setPhotoTargetId(null);
          if (f && id) void uploadPhoto(id, f);
        }}
      />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={share}
          disabled={pending.length === 0}
          className="flex-1 rounded-2xl bg-[#e2b43a] px-4 py-3 font-semibold text-[#1c1915] disabled:opacity-40"
        >
          Enviar / WhatsApp
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={pending.length === 0}
          className="rounded-2xl border border-[#1c1915] px-4 py-3 font-semibold text-[#1c1915] disabled:opacity-40"
        >
          Copiar
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="rounded-2xl border border-[#e6ddd0] px-3 py-3 text-sm text-[#5c564c] disabled:opacity-40"
        >
          ↻
        </button>
      </div>

      {toast ? <p className="mb-3 text-sm text-[#b0892c]">{toast}</p> : null}
      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}

      <div className="flex flex-1 flex-col gap-5">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#7a7266]">
            Por comprar ({pending.length})
          </h2>
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
                  />
                  {item.photoSrc ? (
                    <button
                      type="button"
                      aria-label="Quitar foto"
                      onClick={() => clearPhoto(item)}
                      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f0ebe3]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.photoSrc} alt="" className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Añadir foto"
                      disabled={busy}
                      onClick={() => {
                        setPhotoTargetId(item.id);
                        itemCameraRef.current?.click();
                      }}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f0ebe3] text-[0.65rem] font-semibold uppercase tracking-wide text-[#5c564c]"
                    >
                      Foto
                    </button>
                  )}
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
              <button
                type="button"
                onClick={clearDone}
                className="text-sm text-[#b0892c] underline-offset-2 hover:underline"
              >
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
                  {item.photoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photoSrc}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
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
    </div>
  );
}
