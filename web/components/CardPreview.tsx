"use client";

import { CardFace } from "@/components/CardFace";
import type { CardDesign } from "@/lib/types";
import dynamic from "next/dynamic";

const Card3DLazy = dynamic(() => import("@/components/Card3D").then((m) => m.Card3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-[220px] place-items-center text-sm text-[#7a7266] sm:h-[320px] lg:h-[520px]">
      Cargando el modelo…
    </div>
  ),
});

const Wifi3DLazy = dynamic(() => import("@/components/Wifi3D").then((m) => m.Wifi3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-[220px] place-items-center text-sm text-[#7a7266] sm:h-[320px] lg:h-[520px]">
      Cargando el modelo…
    </div>
  ),
});

type Props = {
  design: CardDesign;
  compact?: boolean;
  onReady?: (dataUrl: string) => void;
};

function isWifi(design: CardDesign) {
  return design.kind === "wifi" || design.model === "wifi";
}

export function CardPreview({ design, compact, onReady }: Props) {
  const wifi = isWifi(design);
  return (
    <div
      className="overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-[#f3eee4] shadow-[0_16px_40px_rgba(40,28,10,0.08)] select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8173]">
          {wifi ? "TAP Wi‑Fi pared" : "Atril NFCTap"}
        </p>
        <p className="text-[11px] text-[#8a8173]">{wifi ? "Diseño fijo" : "Como se imprime"}</p>
      </div>
      {wifi ? (
        <Wifi3DLazy bodyColor={design.bodyColor} accentColor={design.accentColor} compact={compact} />
      ) : (
        <Card3DLazy design={design} compact={compact} />
      )}
      {!wifi ? (
        <div className="pointer-events-none hidden" aria-hidden>
          <CardFace design={design} onReady={onReady} />
        </div>
      ) : null}
    </div>
  );
}
