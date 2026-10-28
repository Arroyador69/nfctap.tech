"use client";

import { Negocio3D } from "@/components/Negocio3D";
import { ACCENT_COLORS, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import type { ReactNode } from "react";
import { useRef } from "react";

const BODIES = BODY_COLORS.filter((c) => c.id === "negro" || c.id === "blanco");
const ACCENTS = ACCENT_COLORS.filter(
  (c) => c.id === "blanco" || c.id === "amarillo" || c.id === "negro",
);

export function NegocioViewer({
  bodyColor,
  accentColor,
  onBody,
  onAccent,
  logoDataUrl,
  onLogo,
  logoError,
}: {
  bodyColor: BodyColor;
  accentColor: AccentColor;
  onBody: (c: BodyColor) => void;
  onAccent: (c: AccentColor) => void;
  logoDataUrl: string;
  onLogo: (dataUrl: string) => void;
  logoError?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 900_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      if (data.startsWith("data:image/")) onLogo(data);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Tu pieza en 3D</h2>
          <p className="mt-1 max-w-xl text-sm text-[#6f675c]">
            Sube el logo: aparece en el círculo de arriba (donde iría tu marca). Gira para ver la
            aleta y <span className="font-medium text-[#1c1915]">nfctap.tech</span> en el pie.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SwatchGroup label="Cuerpo">
            {BODIES.map((c) => (
              <Swatch
                key={c.id}
                active={bodyColor === c.id}
                hex={c.hex}
                title={c.label}
                onClick={() => onBody(c.id)}
              />
            ))}
          </SwatchGroup>
          <SwatchGroup label="Acento">
            {ACCENTS.map((c) => (
              <Swatch
                key={c.id}
                active={accentColor === c.id}
                hex={c.id === "amarillo" ? "#e2b43a" : c.id === "blanco" ? "#f7f4ee" : "#141416"}
                title={c.label}
                onClick={() => onAccent(c.id)}
              />
            ))}
          </SwatchGroup>
        </div>
      </div>

      <Negocio3D bodyColor={bodyColor} accentColor={accentColor} logoDataUrl={logoDataUrl} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-[#1c1915] px-5 py-2.5 text-sm text-[#f6f1e7]"
        >
          {logoDataUrl ? "Cambiar logo" : "Subir logo al círculo"}
        </button>
        {logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoDataUrl}
            alt="Logo"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-[#e6ddd0]"
          />
        ) : (
          <span className="text-sm text-[#8a8173]">PNG o JPG · máx. ~900 KB</span>
        )}
        {logoError ? <span className="text-sm text-red-600">{logoError}</span> : null}
      </div>
    </div>
  );
}

function SwatchGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-[#8a8173]">{label}</p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function Swatch({
  active,
  hex,
  title,
  onClick,
}: {
  active: boolean;
  hex: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`h-8 w-8 rounded-full border-2 ${
        active ? "border-[#1c1915] ring-2 ring-[#1c1915]/20" : "border-[#e6ddd0]"
      }`}
      style={{ background: hex }}
    />
  );
}
