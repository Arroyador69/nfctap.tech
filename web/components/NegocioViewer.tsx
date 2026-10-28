"use client";

import { Negocio3D } from "@/components/Negocio3D";
import { ACCENT_COLORS, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import type { ReactNode } from "react";

const BODIES = BODY_COLORS.filter((c) => c.id === "negro" || c.id === "blanco");
const ACCENTS = ACCENT_COLORS.filter(
  (c) => c.id === "blanco" || c.id === "amarillo" || c.id === "negro",
);

export function NegocioViewer({
  bodyColor,
  accentColor,
  onBody,
  onAccent,
}: {
  bodyColor: BodyColor;
  accentColor: AccentColor;
  onBody: (c: BodyColor) => void;
  onAccent: (c: AccentColor) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">La pieza en 3D</h2>
          <p className="mt-1 max-w-xl text-sm text-[#6f675c]">
            Gírala: aleta detrás, «Acerque el móvil», chips hacia dentro y{" "}
            <span className="font-medium text-[#1c1915]">nfctap.tech</span> en el pie. Colores de
            stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
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
      <Negocio3D bodyColor={bodyColor} accentColor={accentColor} />
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
