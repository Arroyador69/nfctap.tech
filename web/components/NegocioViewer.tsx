"use client";

import { Negocio3D } from "@/components/Negocio3D";
import { NegocioMockup } from "@/components/NegocioMockup";
import { ACCENT_COLORS, ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

const BODIES = BODY_COLORS.filter((c) => c.id === "negro" || c.id === "blanco");
const ACCENTS = ACCENT_COLORS.filter(
  (c) => c.id === "blanco" || c.id === "amarillo" || c.id === "negro",
);

/**
 * Preview principal = mockup 2D con logo (fiable).
 * 3D = girar pieza / aleta (círculo en blanco, sin pelear coords del sello).
 */
export function NegocioViewer({
  bodyColor,
  accentColor,
  onBody,
  onAccent,
  logoDataUrl,
  onLogo,
  line1 = "",
}: {
  bodyColor: BodyColor;
  accentColor: AccentColor;
  onBody: (c: BodyColor) => void;
  onAccent: (c: AccentColor) => void;
  logoDataUrl: string;
  onLogo: (dataUrl: string) => void;
  line1?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [show3d, setShow3d] = useState(true);
  const bodyHex = BODY_COLORS.find((c) => c.id === bodyColor)?.hex ?? "#0e0e10";
  const accentHex = ACCENT_HEX[accentColor] ?? "#f4f1ea";

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
          <h2 className="text-xl font-semibold sm:text-2xl">Así queda con tu logo</h2>
          <p className="mt-1 max-w-xl text-sm text-[#6f675c]">
            Sube el logo y se ve en el círculo. Luego puedes girar la pieza en 3D para ver la aleta
            y <span className="font-medium text-[#1c1915]">nfctap.tech</span>.
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <NegocioMockup
            logoDataUrl={logoDataUrl}
            line1={line1}
            bodyHex={bodyHex}
            accentHex={accentHex}
          />
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
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#1c1915]">Pieza en 3D · aleta y volumen</p>
            <button
              type="button"
              onClick={() => setShow3d((v) => !v)}
              className="text-sm text-[#6f675c] underline"
            >
              {show3d ? "Ocultar 3D" : "Mostrar 3D"}
            </button>
          </div>
          {show3d ? (
            <Negocio3D bodyColor={bodyColor} accentColor={accentColor} />
          ) : (
            <button
              type="button"
              onClick={() => setShow3d(true)}
              className="flex h-[280px] w-full items-center justify-center rounded-[24px] border border-dashed border-[#e6ddd0] bg-[#faf6ee] text-sm text-[#6f675c] sm:h-[360px]"
            >
              Clic para girar la pieza en 3D (aleta detrás)
            </button>
          )}
        </div>
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
