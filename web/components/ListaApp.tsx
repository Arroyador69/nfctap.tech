"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

export type ListaSection = "casa" | "limpieza";
export type ListaUnit = "uds" | "g";

export type ListaItemView = {
  id: string;
  text: string;
  qty: number;
  unit: ListaUnit;
  section: ListaSection;
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

const SECTIONS: { id: ListaSection; label: string }[] = [
  { id: "casa", label: "Casa" },
  { id: "limpieza", label: "Limpieza" },
];

function sectionLabel(s: ListaSection) {
  return s === "limpieza" ? "Limpieza" : "Casa";
}

function normalizeItem(it: ListaItemView): ListaItemView {
  return {
    ...it,
    unit: it.unit === "g" ? "g" : "uds",
    section: it.section === "limpieza" ? "limpieza" : "casa",
  };
}

function formatQty(qty: number, unit: ListaUnit) {
  if (unit === "g") return `${qty} g`;
  return qty > 1 ? `×${qty}` : "";
}

function itemLine(it: ListaItemView) {
  const q = formatQty(it.qty, it.unit);
  return q ? `• ${it.text} ${q}` : `• ${it.text}`;
}

function itemCaption(it: ListaItemView) {
  const q = formatQty(it.qty, it.unit);
  return q ? `${it.text} ${q}` : it.text;
}

/** Lista plana para WhatsApp: sin Casa/Limpieza; todos los ítems (también los de foto). */
function shareTextFlat(items: ListaItemView[], title = "Lista de la compra") {
  const pending = items.filter((it) => !it.done).map(normalizeItem);
  if (!pending.length) return "Lista vacía.";
  return [title, ...pending.map(itemLine)].join("\n");
}

function shareText(lista: ListaView) {
  return shareTextFlat(lista.items);
}

/** Foto con el nombre encima: WhatsApp suele tirar el caption del share. */
async function photoWithCaption(blob: Blob, caption: string): Promise<File> {
  const bmp = await createImageBitmap(blob);
  const maxW = 1080;
  const scale = Math.min(1, maxW / Math.max(bmp.width, 1));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const bar = Math.max(64, Math.round(h * 0.14));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h + bar;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo montar la foto");
  ctx.fillStyle = "#1c1915";
  ctx.fillRect(0, 0, w, bar);
  ctx.drawImage(bmp, 0, bar, w, h);
  bmp.close();

  const label = caption.trim().slice(0, 48);
  let size = Math.min(42, Math.max(22, Math.round(w / 18)));
  ctx.fillStyle = "#f6f1e7";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
  while (size > 16 && ctx.measureText(label).width > w - 28) {
    size -= 2;
    ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
  }
  ctx.fillText(label, w / 2, bar / 2);

  const out = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo exportar la foto"))),
      "image/jpeg",
      0.85,
    );
  });
  return new File([out], `${fileSafeName(caption)}.jpg`, { type: "image/jpeg" });
}

async function loadPhotoFile(item: ListaItemView): Promise<File | null> {
  if (!item.photoSrc) return null;
  try {
    const res = await fetch(item.photoSrc, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await photoWithCaption(blob, itemCaption(normalizeItem(item)));
  } catch {
    return null;
  }
}

function fileSafeName(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .slice(0, 40) || "producto"
  );
}

function qtyStep(unit: ListaUnit) {
  return unit === "g" ? 50 : 1;
}

function qtyBump(unit: ListaUnit, current: number, dir: 1 | -1) {
  const step = qtyStep(unit);
  if (unit === "g") {
    const next = current + dir * step;
    if (next < 1) return 0;
    return Math.min(10000, Math.max(1, next));
  }
  return current + dir;
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
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-transparent text-[#5c564c]"
      }`}
    >
      {children}
    </button>
  );
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
      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">Casa · privada</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#1c1915]">
        Lista de la compra
      </h1>
      <p className="mt-3 text-base leading-relaxed text-[#5c564c]">
        {reason === "sin_activar"
          ? "Primera vez: introduce la clave estando en la Wi‑Fi de casa. Luego el TAP abre directo."
          : "Este móvil aún no está activado. Conéctate a la Wi‑Fi de casa e introduce la clave una sola vez."}
      </p>

      <form onSubmit={onUnlock} className="mt-6 flex flex-col gap-3">
        <label className="text-sm font-medium text-[#5c564c]" htmlFor="clave-casa">
          Clave (solo la primera vez)
        </label>
        <input
          id="clave-casa"
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
          {busy ? "Abriendo…" : "Abrir lista"}
        </button>
      </form>

      {err ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-[#8a8173]">
        Se guarda en este dispositivo. Los 4 NFC de casa abren la misma lista.
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
  const [lista, setLista] = useState<ListaView>({
    ...initial,
    items: initial.items.map(normalizeItem),
  });
  const [text, setText] = useState("");
  const [section, setSection] = useState<ListaSection>("casa");
  const [unit, setUnit] = useState<ListaUnit>("uds");
  const [qtyDraft, setQtyDraft] = useState(1);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(justActivated ? "Dispositivo listo · Wi‑Fi de casa" : "");
  const [err, setErr] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const itemCameraRef = useRef<HTMLInputElement>(null);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | {
    kind: "item" | "photo1" | "photo2" | "clearDone";
    item?: ListaItemView;
  }>(null);
  const [viewer, setViewer] = useState<ListaItemView | null>(null);

  const pending = useMemo(
    () => lista.items.filter((i) => !i.done).map(normalizeItem),
    [lista],
  );
  const done = useMemo(
    () => lista.items.filter((i) => i.done).map(normalizeItem),
    [lista],
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

  function applyLista(data: ListaView) {
    setLista({ ...data, items: data.items.map(normalizeItem) });
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
      applyLista(data as ListaView);
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
      applyLista(data as ListaView);
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
    const addQty = unit === "g" ? Math.max(1, qtyDraft || 100) : Math.max(1, qtyDraft || 1);
    setText("");
    setQtyDraft(unit === "g" ? 100 : 1);
    const photo = pendingPhoto;
    setPendingPhoto(null);
    const next = await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add",
          text: t,
          qty: addQty,
          unit,
          section,
        }),
      }),
    );
    if (photo && next) {
      const item = next.items.find(
        (it) =>
          !it.done &&
          it.section === section &&
          it.unit === unit &&
          it.text.toLocaleLowerCase("es") === t.toLocaleLowerCase("es"),
      );
      if (item) await uploadPhoto(item.id, photo);
    }
  }

  async function setQty(item: ListaItemView, qty: number) {
    if (qty < 1) {
      setConfirm({ kind: "item", item });
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

  async function setItemUnit(item: ListaItemView, nextUnit: ListaUnit) {
    if (item.unit === nextUnit) return;
    const nextQty = nextUnit === "g" ? (item.unit === "uds" ? Math.max(100, item.qty * 100) : item.qty) : Math.min(99, Math.max(1, item.qty >= 50 ? 1 : item.qty));
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id, unit: nextUnit, qty: nextQty }),
      }),
    );
  }

  async function moveSection(item: ListaItemView, next: ListaSection) {
    if (item.section === next) return;
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id, section: next }),
      }),
    );
    flash(next === "limpieza" ? "Pasado a Limpieza" : "Pasado a Casa");
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

  async function doRemove(item: ListaItemView) {
    await mutate(() =>
      fetch(`/api/lista/${listId}?itemId=${encodeURIComponent(item.id)}`, { method: "DELETE" }),
    );
  }

  async function doClearDone() {
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearDone" }),
      }),
    );
  }

  async function doClearPhoto(item: ListaItemView) {
    await mutate(() =>
      fetch(`/api/lista/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearPhoto", itemId: item.id }),
      }),
    );
    setViewer(null);
  }

  async function onConfirmYes() {
    if (!confirm) return;
    const c = confirm;
    setConfirm(null);
    if (c.kind === "item" && c.item) {
      await doRemove(c.item);
      return;
    }
    if (c.kind === "clearDone") {
      await doClearDone();
      return;
    }
    if (c.kind === "photo1" && c.item) {
      setConfirm({ kind: "photo2", item: c.item });
      return;
    }
    if (c.kind === "photo2" && c.item) {
      await doClearPhoto(c.item);
    }
  }

  async function refresh() {
    await mutate(() => fetch(`/api/lista/${listId}`, { cache: "no-store" }));
  }

  async function shareLista(destino: "whatsapp" | "notas") {
    const vivos = lista.items.filter((it) => !it.done).map(normalizeItem);
    if (!vivos.length) {
      flash("Lista vacía");
      return;
    }

    const textoCompleto = shareTextFlat(vivos);
    const conFoto = vivos.filter((it) => it.photoSrc || it.hasPhoto);
    const elige =
      destino === "notas"
        ? "Elige Notas (iPhone) o Keep / Notas (Android)"
        : "Elige WhatsApp";

    setBusy(true);
    flash(conFoto.length ? "Preparando fotos con nombre…" : elige);

    const fotos: { file: File; caption: string }[] = [];
    for (const item of conFoto) {
      const file = await loadPhotoFile(item);
      if (file) {
        fotos.push({ file, caption: itemCaption(item) });
      }
    }

    // Escritorio: WhatsApp Web no admite archivos vía wa.me → texto completo + aviso.
    if (!navigator.share) {
      setBusy(false);
      if (destino === "whatsapp") {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(textoCompleto)}`,
          "_blank",
          "noopener,noreferrer",
        );
        flash(
          fotos.length
            ? "Texto enviado. Las fotos con nombre solo se adjuntan desde el móvil."
            : "Lista abierta en WhatsApp",
        );
        return;
      }
      try {
        await navigator.clipboard.writeText(textoCompleto);
        flash("Texto copiado. Las fotos, desde el móvil.");
      } catch {
        flash("Abre la lista en el móvil para compartir con fotos");
      }
      return;
    }

    flash(elige);
    let enviadas = 0;
    try {
      // 1) Primero las fotos (nombre ya va en la imagen). Una por una: WhatsApp las recibe.
      for (let i = 0; i < fotos.length; i++) {
        const { file, caption } = fotos[i];
        flash(
          destino === "whatsapp"
            ? `WhatsApp · foto ${i + 1}/${fotos.length}: ${caption}`
            : `Notas · foto ${i + 1}/${fotos.length}: ${caption}`,
        );
        if (i > 0) await new Promise((r) => setTimeout(r, 350));

        // Solo archivo: WhatsApp ignora text+files juntos; el nombre ya está en la foto.
        const soloFoto = { files: [file] as File[] };
        const conTexto = { title: caption, text: caption, files: [file] as File[] };
        try {
          if (navigator.canShare?.(soloFoto)) {
            // Preferir text+file si el destino lo acepta (Notas); WhatsApp a menudo no.
            if (destino === "notas" && navigator.canShare?.(conTexto)) {
              await navigator.share(conTexto);
            } else {
              await navigator.share(soloFoto);
            }
            enviadas += 1;
          } else if (navigator.canShare?.(conTexto)) {
            await navigator.share(conTexto);
            enviadas += 1;
          }
        } catch (e) {
          // AbortError = usuario canceló esa hoja; seguir con el resto.
          if (e instanceof DOMException && e.name === "AbortError") continue;
          throw e;
        }
      }

      // 2) Lista de texto completa (incluye también los de foto, por si falla alguna).
      flash(destino === "whatsapp" ? "WhatsApp · lista de texto" : "Notas · lista de texto");
      if (fotos.length) await new Promise((r) => setTimeout(r, 350));
      try {
        await navigator.share({ title: "Lista de la compra", text: textoCompleto });
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
      }

      if (destino === "notas") {
        flash(
          enviadas
            ? `Listo: ${enviadas} foto(s) + lista. Elige Notas/Keep en cada paso.`
            : "Listo. Elige Notas / Keep",
        );
      } else {
        flash(
          enviadas
            ? `Listo: ${enviadas} foto(s) con nombre + lista. Elige WhatsApp en cada paso.`
            : conFoto.length && !enviadas
              ? "No se pudieron adjuntar las fotos. La lista de texto sí se ofreció."
              : "Listo. Elige WhatsApp",
        );
      }
    } catch {
      flash("Cancelado o no se pudo compartir");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText(lista));
      flash("Copiada");
    } catch {
      flash("No se pudo copiar");
    }
  }

  function renderItem(item: ListaItemView) {
    const it = normalizeItem(item);
    return (
      <li
        key={it.id}
        className="flex flex-col gap-2 rounded-2xl border border-[#e6ddd0] bg-white px-3 py-2.5"
      >
        <div className="flex items-center gap-2.5">
          {it.photoSrc ? (
            <button
              type="button"
              aria-label="Ver foto en grande"
              onClick={() => setViewer(it)}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f0ebe3] ring-1 ring-[#e6ddd0]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.photoSrc} alt="" className="h-full w-full object-cover" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Añadir foto"
              disabled={busy}
              onClick={() => {
                setPhotoTargetId(it.id);
                itemCameraRef.current?.click();
              }}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#f0ebe3] text-[0.65rem] font-semibold uppercase tracking-wide text-[#5c564c]"
            >
              Foto
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[1.05rem] font-medium leading-snug text-[#1c1915]">{it.text}</p>
            <p className="mt-0.5 text-sm tabular-nums text-[#7a7266]">
              {it.unit === "g" ? `${it.qty} g` : it.qty > 1 ? `${it.qty} uds` : "1 ud"}
            </p>
            <button
              type="button"
              onClick={() => toggleDone(it)}
              className="mt-0.5 text-xs font-medium text-[#b0892c]"
            >
              Marcar comprado
            </button>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Menos"
                onClick={() => setQty(it, qtyBump(it.unit, it.qty, -1))}
                className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0ebe3] text-lg font-bold"
              >
                −
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                {it.unit === "g" ? `${it.qty}g` : it.qty}
              </span>
              <button
                type="button"
                aria-label="Más"
                onClick={() => setQty(it, qtyBump(it.unit, it.qty, 1))}
                className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0ebe3] text-lg font-bold"
              >
                +
              </button>
            </div>
            <button
              type="button"
              aria-label="Quitar"
              onClick={() => setConfirm({ kind: "item", item: it })}
              className="grid h-8 w-8 place-items-center rounded-xl text-[#8a8173]"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-[4.25rem]">
          <button
            type="button"
            onClick={() => setItemUnit(it, "uds")}
            className={`rounded-lg px-2 py-1 text-[0.7rem] font-semibold ${
              it.unit === "uds" ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f0ebe3] text-[#5c564c]"
            }`}
          >
            uds
          </button>
          <button
            type="button"
            onClick={() => setItemUnit(it, "g")}
            className={`rounded-lg px-2 py-1 text-[0.7rem] font-semibold ${
              it.unit === "g" ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f0ebe3] text-[#5c564c]"
            }`}
          >
            g
          </button>
          <button
            type="button"
            onClick={() => moveSection(it, it.section === "casa" ? "limpieza" : "casa")}
            className="rounded-lg bg-[#f0ebe3] px-2 py-1 text-[0.7rem] font-semibold text-[#5c564c]"
          >
            → {it.section === "casa" ? "Limpieza" : "Casa"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-4">
        <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">
          Casa · solo Wi‑Fi · clave 1ª vez
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#1c1915]">
          Lista de la compra
        </h1>
        <p className="mt-1 text-sm text-[#7a7266]">
          WhatsApp: fotos con el nombre encima + lista completa. Casa/Limpieza solo en pantalla.
        </p>
      </header>

      <form onSubmit={onAdd} className="mb-4 flex flex-col gap-2">
        <div className="flex rounded-2xl border border-[#e6ddd0] bg-[#f0ebe3] p-1">
          {SECTIONS.map((s) => (
            <SegBtn key={s.id} active={section === s.id} onClick={() => setSection(s.id)}>
              {s.label}
            </SegBtn>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={section === "limpieza" ? "¿Qué falta de limpieza?" : "¿Qué falta en casa?"}
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

        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-2xl border border-[#e6ddd0] bg-[#f0ebe3] p-1">
            <SegBtn
              active={unit === "uds"}
              onClick={() => {
                setUnit("uds");
                setQtyDraft(1);
              }}
            >
              Unidades
            </SegBtn>
            <SegBtn
              active={unit === "g"}
              onClick={() => {
                setUnit("g");
                setQtyDraft((q) => (q < 50 ? 100 : q));
              }}
            >
              Gramos
            </SegBtn>
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-[#e6ddd0] bg-white px-2 py-1.5">
            <button
              type="button"
              aria-label="Menos cantidad"
              onClick={() =>
                setQtyDraft((q) => {
                  const next = qtyBump(unit, q, -1);
                  return next < 1 ? (unit === "g" ? 50 : 1) : next;
                })
              }
              className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0ebe3] text-base font-bold"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={unit === "g" ? 10000 : 99}
              value={qtyDraft}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setQtyDraft(unit === "g" ? Math.min(10000, Math.max(1, Math.round(n))) : Math.min(99, Math.max(1, Math.round(n))));
              }}
              className="w-14 bg-transparent text-center text-sm font-semibold tabular-nums text-[#1c1915] outline-none"
            />
            <span className="pr-1 text-xs font-semibold text-[#7a7266]">
              {unit === "g" ? "g" : "uds"}
            </span>
            <button
              type="button"
              aria-label="Más cantidad"
              onClick={() => setQtyDraft((q) => qtyBump(unit, q, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0ebe3] text-base font-bold"
            >
              +
            </button>
          </div>
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

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void shareLista("whatsapp")}
            disabled={pending.length === 0 || busy}
            className="flex-1 rounded-2xl bg-[#e2b43a] px-4 py-3 font-semibold text-[#1c1915] disabled:opacity-40"
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => void shareLista("notas")}
            disabled={pending.length === 0 || busy}
            className="flex-1 rounded-2xl border border-[#1c1915] bg-white px-4 py-3 font-semibold text-[#1c1915] disabled:opacity-40"
          >
            Notas
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={pending.length === 0}
            className="flex-1 rounded-2xl border border-[#e6ddd0] px-4 py-2.5 text-sm font-semibold text-[#5c564c] disabled:opacity-40"
          >
            Copiar lista
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            className="rounded-2xl border border-[#e6ddd0] px-4 py-2.5 text-sm text-[#5c564c] disabled:opacity-40"
          >
            ↻
          </button>
        </div>
      </div>

      {toast ? <p className="mb-3 text-sm text-[#b0892c]">{toast}</p> : null}
      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}

      <div className="flex flex-1 flex-col gap-5">
        {pending.length === 0 ? (
          <section>
            <p className="rounded-2xl border border-dashed border-[#e6ddd0] bg-white/50 px-4 py-8 text-center text-sm text-[#8a8173]">
              Lista vacía. Elige Casa o Limpieza y añade lo que falte.
            </p>
          </section>
        ) : (
          pendingBySection.map((group) => (
            <section key={group.id}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#7a7266]">
                {group.label} · por comprar ({group.items.length})
              </h2>
              <ul className="space-y-2">{group.items.map(renderItem)}</ul>
            </section>
          ))
        )}

        {done.length > 0 ? (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#7a7266]">
                Comprado ({done.length})
              </h2>
              <button
                type="button"
                onClick={() => setConfirm({ kind: "clearDone" })}
                className="text-sm text-[#b0892c] underline-offset-2 hover:underline"
              >
                Limpiar
              </button>
            </div>
            <ul className="space-y-2">
              {done.map((item) => {
                const it = normalizeItem(item);
                return (
                  <li
                    key={it.id}
                    className="flex items-center gap-2.5 rounded-2xl border border-[#ece6dc] bg-[#faf7f2] px-3 py-2.5 opacity-70"
                  >
                    {it.photoSrc ? (
                      <button type="button" onClick={() => setViewer(it)} className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.photoSrc}
                          alt=""
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      </button>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8173]">
                        {sectionLabel(it.section)}
                      </p>
                      <p className="text-base line-through">{it.text}</p>
                      <button
                        type="button"
                        onClick={() => toggleDone(it)}
                        className="mt-0.5 text-xs font-medium text-[#b0892c]"
                      >
                        Desmarcar
                      </button>
                    </div>
                    <span className="text-sm tabular-nums text-[#8a8173]">
                      {formatQty(it.qty, it.unit) || "1"}
                    </span>
                    <button
                      type="button"
                      aria-label="Quitar"
                      onClick={() => setConfirm({ kind: "item", item: it })}
                      className="grid h-9 w-9 place-items-center text-[#8a8173]"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      {viewer?.photoSrc ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1c1915] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="mb-3 text-center font-[family-name:var(--font-display)] text-lg text-[#f6f1e7]">
            {viewer.text}
          </p>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewer.photoSrc}
              alt={viewer.text}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>
          <div className="mx-auto mt-4 flex w-full max-w-lg flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPhotoTargetId(viewer.id);
                setViewer(null);
                itemCameraRef.current?.click();
              }}
              className="rounded-2xl bg-[#f6f1e7] px-4 py-3 font-semibold text-[#1c1915]"
            >
              Cambiar foto
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirm({ kind: "photo1", item: viewer });
                setViewer(null);
              }}
              className="rounded-2xl border border-white/35 px-4 py-3 font-semibold text-white"
            >
              Quitar foto
            </button>
            <button
              type="button"
              onClick={() => setViewer(null)}
              className="rounded-2xl px-4 py-3 text-white/75"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-[#f6f1e8] p-5 shadow-xl">
            <p className="font-[family-name:var(--font-display)] text-xl text-[#1c1915]">
              {confirm.kind === "item"
                ? "¿Eliminar de la lista?"
                : confirm.kind === "photo1"
                  ? "¿Quitar la foto?"
                  : confirm.kind === "photo2"
                    ? "¿Seguro del todo?"
                    : "¿Limpiar comprados?"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#5c564c]">
              {confirm.kind === "item"
                ? `Se borrará «${confirm.item?.text || ""}»${confirm.item?.hasPhoto ? " y su foto" : ""}.`
                : confirm.kind === "photo1"
                  ? `Se quitará la foto de «${confirm.item?.text || ""}». El producto sigue en la lista.`
                  : confirm.kind === "photo2"
                    ? "Última confirmación: la foto no se podrá recuperar."
                    : "Se borrarán todos los ítems marcados como comprados."}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-2xl border border-[#1c1915] px-4 py-3 font-semibold text-[#1c1915]"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void onConfirmYes()}
                className="flex-1 rounded-2xl bg-[#1c1915] px-4 py-3 font-semibold text-[#f6f1e7]"
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
