"use client";

import { upload } from "@vercel/blob/client";
import { useMemo, useRef, useState } from "react";

export type PanelFileView = {
  id: string;
  folderId: string;
  name: string;
  size: number;
  contentType: string;
  uploadedBy: "client" | "admin";
  dayKey: string | null;
  createdAt: string;
  downloadPath: string;
};

export type PanelFolderView = {
  id: string;
  name: string;
  kind: "recursos" | "finales";
  createdAt: string;
};

export type StrategyMonthView = {
  year: number;
  month: number;
  title: string;
  focus: string;
  goalViews: number;
  progress: number;
};

export type PanelClientView = {
  id: string;
  slug: string;
  name: string;
  email: string;
  pack: string;
  packMeta: { label: string; euros: number; tag: string; blurb: string };
  contractAccepted: boolean;
  strategy: StrategyMonthView[];
  overallProgress: number;
  currentMonth: StrategyMonthView | null;
  folders: PanelFolderView[];
  files: PanelFileView[];
};

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function monthNames(m: number) {
  return [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ][m - 1];
}

export function ProgressRail({
  strategy,
  overall,
}: {
  strategy: StrategyMonthView[];
  overall: number;
}) {
  return (
    <section className="rounded-3xl border border-[#e6ddd0] bg-white p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[#b0892c]">
            Estrategia 3 meses
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
            {overall}% del trimestre
          </h2>
        </div>
        <p className="text-sm tabular-nums text-[#7a7266]">{overall}/100</p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#f0ebe3]">
        <div
          className="h-full rounded-full bg-[#e2b43a] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, overall))}%` }}
        />
      </div>
      <ol className="mt-5 grid gap-3">
        {strategy.map((m, i) => (
          <li key={`${m.year}-${m.month}`} className="rounded-2xl bg-[#faf6ee] px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#1c1915]">
                {m.title || `Mes ${i + 1}`}
              </p>
              <p className="text-xs text-[#7a7266]">
                {monthNames(m.month)} · {m.progress}%
              </p>
            </div>
            <p className="mt-1 text-sm leading-snug text-[#5c564c]">{m.focus}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6ddd0]">
              <div
                className="h-full rounded-full bg-[#1c1915]"
                style={{ width: `${m.progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[#8a8173]">
              Meta ~{m.goalViews.toLocaleString("es-ES")} views (orgánico)
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CalendarStrip({
  year,
  month,
  files,
}: {
  year: number;
  month: number;
  files: PanelFileView[];
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayFiles = files.filter((f) => f.dayKey === key);
      return {
        d,
        key,
        hasFinal: dayFiles.some((f) => f.uploadedBy === "admin"),
        hasRecurso: dayFiles.some((f) => f.uploadedBy === "client"),
      };
    });
  }, [daysInMonth, year, month, files]);

  return (
    <section className="rounded-3xl border border-[#e6ddd0] bg-white p-4">
      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[#b0892c]">Calendario</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[#1c1915]">
        {monthNames(month)} {year} · 1 vídeo / día
      </h2>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {days.map((day) => {
          const isToday = isThisMonth && day.d === today.getDate();
          return (
            <div
              key={day.key}
              className={`flex h-14 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-xs ${
                isToday
                  ? "bg-[#1c1915] text-[#f6f1e7]"
                  : day.hasFinal
                    ? "bg-[#e2b43a]/35 text-[#1c1915]"
                    : day.hasRecurso
                      ? "bg-[#f0ebe3] text-[#1c1915]"
                      : "bg-[#faf6ee] text-[#8a8173]"
              }`}
              title={day.key}
            >
              <span className="font-semibold">{day.d}</span>
              <span className="text-[9px] opacity-80">
                {day.hasFinal ? "OK" : day.hasRecurso ? "mat" : "·"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[#8a8173]">
        Dorado = final listo · gris = recurso · negro = hoy
      </p>
    </section>
  );
}

export function FolderBoard({
  client,
  role,
  onChange,
}: {
  client: PanelClientView;
  role: "admin" | "client";
  onChange: (c: PanelClientView) => void;
}) {
  const [folderId, setFolderId] = useState(client.folders[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState("");
  const [newName, setNewName] = useState("");
  const [dayKey, setDayKey] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const folder = client.folders.find((f) => f.id === folderId) || client.folders[0];
  const files = client.files.filter((f) => f.folderId === (folder?.id || ""));

  const canUpload =
    folder &&
    (role === "admin" || (role === "client" && folder.kind === "recursos"));

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/panel/clients/${client.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "addFolder",
          name: newName,
          kind: role === "admin" ? "recursos" : "recursos",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      onChange(data.client);
      setFolderId(data.folder.id);
      setNewName("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(file: File | null) {
    if (!file || !folder) return;
    setBusy(true);
    setErr("");
    setProgress("Subiendo…");
    try {
      const pathname = `panel/${client.id}/${folder.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80)}`;
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/panel/upload",
        clientPayload: JSON.stringify({ clientId: client.id, folderId: folder.id }),
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: (p) => {
          if (p.percentage != null) setProgress(`Subiendo… ${Math.round(p.percentage)}%`);
        },
      });
      const res = await fetch(`/api/panel/clients/${client.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "registerFile",
          folderId: folder.id,
          name: file.name,
          size: file.size,
          contentType: file.type || "video/mp4",
          blobUrl: blob.url,
          dayKey: dayKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar");
      onChange(data.client);
      setProgress("Listo");
      setTimeout(() => setProgress(""), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al subir");
      setProgress("");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeFile(id: string) {
    if (!confirm("¿Borrar este archivo?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/panel/files/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      onChange(data.client);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {client.folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFolderId(f.id)}
            className={`shrink-0 rounded-2xl px-3 py-2 text-sm font-semibold ${
              folder?.id === f.id
                ? "bg-[#1c1915] text-[#f6f1e7]"
                : "border border-[#e6ddd0] bg-white text-[#5c564c]"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <form onSubmit={createFolder} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva carpeta…"
          className="min-w-0 flex-1 rounded-2xl border border-[#e6ddd0] bg-white px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded-2xl border border-[#1c1915] px-3 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          Crear
        </button>
      </form>

      {canUpload ? (
        <div className="rounded-3xl border border-dashed border-[#c9b89a] bg-[#faf6ee] p-4">
          <p className="text-sm font-semibold text-[#1c1915]">
            {folder?.kind === "finales" ? "Subir vídeo final" : "Subir recurso / material"}
          </p>
          <p className="mt-1 text-xs text-[#7a7266]">
            Desde el móvil: vídeo o foto. Máx. 500 MB. Subida directa y segura.
          </p>
          <label className="mt-3 block text-xs font-medium text-[#5c564c]">
            Día del calendario (opcional)
            <input
              type="date"
              value={dayKey}
              onChange={(e) => setDayKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#e6ddd0] bg-white px-3 py-2 text-sm"
            />
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="video/*,image/*,application/pdf"
            capture="environment"
            className="mt-3 block w-full text-sm"
            disabled={busy}
            onChange={(e) => void onPick(e.target.files?.[0] || null)}
          />
          {progress ? <p className="mt-2 text-sm text-[#b0892c]">{progress}</p> : null}
        </div>
      ) : (
        <p className="rounded-2xl bg-[#f0ebe3] px-3 py-2 text-sm text-[#5c564c]">
          Esta carpeta es de finales: solo NFCTap sube aquí. Tú descargas.
        </p>
      )}

      {err ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <ul className="space-y-2">
        {files.length === 0 ? (
          <li className="text-sm text-[#8a8173]">Carpeta vacía.</li>
        ) : (
          files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-2xl border border-[#e6ddd0] bg-white px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1c1915]">{f.name}</p>
                <p className="text-xs text-[#8a8173]">
                  {fmtSize(f.size)} · {f.uploadedBy === "admin" ? "NFCTap" : "Cliente"}
                  {f.dayKey ? ` · ${f.dayKey}` : ""}
                </p>
              </div>
              <a
                href={f.downloadPath}
                className="rounded-xl bg-[#1c1915] px-3 py-2 text-xs font-semibold text-[#f6f1e7]"
              >
                Bajar
              </a>
              {(role === "admin" || f.uploadedBy === "client") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeFile(f.id)}
                  className="px-2 text-sm text-[#b42318]"
                >
                  ✕
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
