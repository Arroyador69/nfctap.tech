"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

export type TallerSection = "filamento" | "adhesivos" | "recambios" | "embalaje" | "otro";
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
  hasPhoto?: boolean;
  photoSrc?: string;
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
  { id: "otro", label: "Otro" },
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
      it.section === "adhesivos" ||
      it.section === "recambios" ||
      it.section === "embalaje" ||
      it.section === "otro"
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

function itemCaption(it: TallerItemView) {
  const q = formatQty(it.qty, it.unit);
  const color = it.section === "filamento" && it.color ? ` · ${it.color}` : "";
  return q ? `${it.text}${color} ${q}` : `${it.text}${color}`;
}

function itemLine(it: TallerItemView) {
  const q = formatQty(it.qty, it.unit);
  const color = it.section === "filamento" && it.color ? ` (${it.color})` : "";
  return q ? `• ${it.text}${color} ${q}` : `• ${it.text}${color}`;
}

/** Texto completo (con y sin foto) para copiar. */
function shareTextAll(items: TallerItemView[]) {
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

/** Solo ítems sin foto: tras enviar las fotos con nombre. */
function shareTextSoloTexto(items: TallerItemView[]) {
  const pending = items
    .filter((it) => !it.done && !(it.photoSrc || it.hasPhoto))
    .map(normalizeItem);
  if (!pending.length) return "";
  const lines = ["Material taller · solo texto"];
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

function fileSafeName(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .slice(0, 40) || "material"
  );
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

async function loadPhotoFile(item: TallerItemView): Promise<File | null> {
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
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(justActivated ? "Dispositivo listo · Wi‑Fi de casa" : "");
  const [err, setErr] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const itemCameraRef = useRef<HTMLInputElement>(null);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | {
    kind: "item" | "photo1" | "photo2" | "clearDone";
    item?: TallerItemView;
  }>(null);
  const [viewer, setViewer] = useState<TallerItemView | null>(null);

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

  async function uploadPhoto(itemId: string, file: File) {
    setBusy(true);
    setErr("");
    try {
      const jpeg = await compressImage(file);
      const form = new FormData();
      form.set("itemId", itemId);
      form.set("photo", new File([jpeg], "foto.jpg", { type: "image/jpeg" }));
      const res = await fetch(`/api/taller/${listId}`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir la foto");
      applyTaller(data as TallerView);
      flash("Foto añadida");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
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

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const addQty = Math.max(1, qtyDraft || 1);
    const addUnit = unit;
    const addSection = section;
    const addColor = section === "filamento" ? color : "";
    setText("");
    setQtyDraft(unit === "ml" ? 50 : 1);
    const photo = pendingPhoto;
    setPendingPhoto(null);
    const next = await mutate(() =>
      fetch(`/api/taller/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add",
          text: t,
          qty: addQty,
          unit: addUnit,
          section: addSection,
          color: addColor,
        }),
      }),
    );
    if (photo && next) {
      const item = next.items.find(
        (it) =>
          !it.done &&
          it.section === addSection &&
          it.unit === addUnit &&
          it.color === addColor &&
          it.text.toLocaleLowerCase("es") === t.toLocaleLowerCase("es"),
      );
      if (item) await uploadPhoto(item.id, photo);
    }
  }

  async function onQuick(q: (typeof QUICK_ADDS)[number]) {
    await mutate(() =>
      fetch(`/api/taller/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add",
          text: q.text,
          qty: q.qty,
          unit: q.unit,
          section: q.section,
          color: q.color,
        }),
      }),
    );
    flash(`+ ${q.label}`);
  }

  async function bump(item: TallerItemView, dir: 1 | -1) {
    const step = item.unit === "ml" ? 50 : 1;
    const next = item.qty + dir * step;
    if (next < 1) {
      setConfirm({ kind: "item", item });
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

  async function doRemove(item: TallerItemView) {
    await mutate(() =>
      fetch(`/api/taller/${listId}?itemId=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      }),
    );
  }

  async function doClearDone() {
    await mutate(() =>
      fetch(`/api/taller/${listId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearDone" }),
      }),
    );
    flash("Comprados borrados");
  }

  async function doClearPhoto(item: TallerItemView) {
    await mutate(() =>
      fetch(`/api/taller/${listId}`, {
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

  async function copyList() {
    try {
      await navigator.clipboard.writeText(shareTextAll(taller.items));
      flash("Lista copiada");
    } catch {
      setErr("No se pudo copiar");
    }
  }

  async function shareWhatsApp() {
    const vivos = taller.items.filter((it) => !it.done).map(normalizeItem);
    if (!vivos.length) {
      flash("Nada pendiente");
      return;
    }

    const conFoto = vivos.filter((it) => it.photoSrc || it.hasPhoto);
    const textoSolo = shareTextSoloTexto(vivos);
    const textoCompleto = shareTextAll(vivos);

    setBusy(true);
    flash(conFoto.length ? "Preparando fotos con nombre…" : "Elige WhatsApp");

    const fotos: { file: File; caption: string }[] = [];
    for (const item of conFoto) {
      const file = await loadPhotoFile(item);
      if (file) fotos.push({ file, caption: itemCaption(item) });
    }

    if (!navigator.share) {
      setBusy(false);
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

    flash("Elige WhatsApp");
    let enviadas = 0;
    try {
      for (let i = 0; i < fotos.length; i++) {
        const { file, caption } = fotos[i];
        flash(`WhatsApp · foto ${i + 1}/${fotos.length}: ${caption}`);
        if (i > 0) await new Promise((r) => setTimeout(r, 350));
        const soloFoto = { files: [file] as File[] };
        try {
          if (navigator.canShare?.(soloFoto)) {
            await navigator.share(soloFoto);
            enviadas += 1;
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") continue;
          throw e;
        }
      }

      const textoFinal = textoSolo || (fotos.length === 0 ? textoCompleto : "");
      if (textoFinal) {
        flash("WhatsApp · lista de texto");
        if (fotos.length) await new Promise((r) => setTimeout(r, 350));
        try {
          await navigator.share({ title: "Material taller", text: textoFinal });
        } catch (e) {
          if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
        }
      }

      flash(
        enviadas
          ? `Listo: ${enviadas} foto(s) con nombre${textoSolo ? " + solo texto" : ""}. Elige WhatsApp en cada paso.`
          : conFoto.length && !enviadas
            ? "No se pudieron adjuntar las fotos. La lista de texto sí se ofreció."
            : "Listo. Elige WhatsApp",
      );
    } catch {
      flash("Cancelado o no se pudo compartir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-5 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">NFCTap · taller</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Material a comprar
      </h1>
      <p className="mt-2 text-sm text-[#6f675c]">
        WhatsApp: fotos con el nombre encima, después solo texto. Solo en tu Wi‑Fi.
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

        <div className="flex gap-2">
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
                    : section === "embalaje"
                      ? "Caja, cinta, etiqueta…"
                      : "Guantes, alcohol, herramienta…"
            }
            className="min-w-0 flex-1 rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3.5 text-base text-[#1c1915]"
          />
          <button
            type="button"
            aria-label="Foto"
            onClick={() => cameraRef.current?.click()}
            className="shrink-0 rounded-2xl border border-[#e6ddd0] bg-white px-3 py-3 text-sm font-semibold text-[#5c564c]"
          >
            Foto
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
              onClick={() => setQtyDraft((q) => Math.max(1, q - (unit === "ml" ? 50 : 1)))}
            >
              −
            </button>
            <span className="min-w-[2.5rem] text-center text-sm font-semibold">{qtyDraft}</span>
            <button
              type="button"
              className="px-2 text-lg font-bold text-[#1c1915]"
              onClick={() => setQtyDraft((q) => q + (unit === "ml" ? 50 : 1))}
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
                    {it.photoSrc ? (
                      <button
                        type="button"
                        aria-label="Ver foto"
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
                      onClick={() => setConfirm({ kind: "item", item: it })}
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
            <button
              type="button"
              onClick={() => setConfirm({ kind: "clearDone" })}
              className="text-xs font-semibold text-[#b0892c]"
            >
              Limpiar
            </button>
          </div>
          <ul className="space-y-1 opacity-60">
            {done.map((it) => (
              <li key={it.id} className="flex items-center gap-2 px-1 py-1 text-sm">
                {it.photoSrc ? (
                  <button type="button" onClick={() => setViewer(it)} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.photoSrc}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  </button>
                ) : null}
                <button type="button" onClick={() => toggleDone(it)} className="text-[#1c1915]">
                  ↩
                </button>
                <span className="line-through">
                  {it.text}
                  {it.color ? ` · ${it.color}` : ""}
                </span>
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
            disabled={pending.length === 0}
            className="flex-1 rounded-2xl border border-[#1c1915] py-3 text-sm font-semibold text-[#1c1915] disabled:opacity-40"
          >
            Copiar
          </button>
          <button
            type="button"
            onClick={() => void shareWhatsApp()}
            disabled={pending.length === 0 || busy}
            className="flex-1 rounded-2xl bg-[#1c1915] py-3 text-sm font-semibold text-[#f6f1e7] disabled:opacity-40"
          >
            WhatsApp
          </button>
        </div>
      </div>

      {viewer?.photoSrc ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1c1915] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="mb-3 text-center font-[family-name:var(--font-display)] text-lg text-[#f6f1e7]">
            {viewer.text}
            {viewer.color ? ` · ${viewer.color}` : ""}
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
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
            <p className="font-[family-name:var(--font-display)] text-xl text-[#1c1915]">
              {confirm.kind === "clearDone"
                ? "¿Limpiar comprados?"
                : confirm.kind === "photo1"
                  ? "¿Quitar esta foto?"
                  : confirm.kind === "photo2"
                    ? "Confirma otra vez"
                    : "¿Borrar este material?"}
            </p>
            <p className="mt-2 text-sm text-[#5c564c]">
              {confirm.kind === "clearDone"
                ? "Se quitarán de la lista los ya marcados como comprados."
                : confirm.kind === "item"
                  ? `Se borrará «${confirm.item?.text || ""}»${confirm.item?.hasPhoto || confirm.item?.photoSrc ? " y su foto" : ""}.`
                  : confirm.kind === "photo1"
                    ? "El material se queda; solo se borra la imagen."
                    : "Última confirmación para borrar la foto."}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-2xl border border-[#e6ddd0] py-3 font-semibold text-[#5c564c]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void onConfirmYes()}
                className="flex-1 rounded-2xl bg-[#1c1915] py-3 font-semibold text-[#f6f1e7]"
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
