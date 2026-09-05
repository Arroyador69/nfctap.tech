"use client";

import { CardFace } from "@/components/CardFace";
import type { CardDesign } from "@/lib/types";
import dynamic from "next/dynamic";

const Card3DLazy = dynamic(() => import("@/components/Card3D").then((m) => m.Card3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-[300px] place-items-center text-sm text-[#7a7266] lg:h-[560px]">
      Cargando el modelo…
    </div>
  ),
});

type Props = {
  design: CardDesign;
  compact?: boolean;
  onReady?: (dataUrl: string) => void;
};

export function CardPreview({ design, compact, onReady }: Props) {
  return (
    <div
      className="overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-[#f3eee4] shadow-[0_16px_40px_rgba(40,28,10,0.08)] select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8173]">Modelo estándar</p>
        <p className="text-[11px] text-[#8a8173]">Gira con el dedo</p>
      </div>
      <Card3DLazy design={design} compact={compact} />
      <div className="pointer-events-none hidden" aria-hidden>
        <CardFace design={design} onReady={onReady} />
      </div>
    </div>
  );
}
