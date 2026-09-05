"use client";

import { CardFace } from "@/components/CardFace";
import type { CardDesign } from "@/lib/types";
import dynamic from "next/dynamic";
import { useState } from "react";

const Card3DLazy = dynamic(() => import("@/components/Card3D").then((m) => m.Card3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-[560px] place-items-center text-sm text-[#7a7266]">Cargando el modelo 3D…</div>
  ),
});

type Props = {
  design: CardDesign;
  onReady?: (dataUrl: string) => void;
};

export function CardPreview({ design, onReady }: Props) {
  const [mode, setMode] = useState<"3d" | "plana">("3d");

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#e6ddd0] bg-[#f3eee4] shadow-[0_24px_60px_rgba(40,28,10,0.08)]">
      <div className="flex items-center justify-between px-5 pt-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8a8173]">Así se imprime</p>
        <div className="flex rounded-full bg-[#e8e0d2] p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("3d")}
            className={`rounded-full px-3 py-1 ${mode === "3d" ? "bg-white text-[#1c1915]" : "text-[#7a7266]"}`}
          >
            3D
          </button>
          <button
            type="button"
            onClick={() => setMode("plana")}
            className={`rounded-full px-3 py-1 ${mode === "plana" ? "bg-white text-[#1c1915]" : "text-[#7a7266]"}`}
          >
            Plana
          </button>
        </div>
      </div>
      {mode === "3d" ? (
        <Card3DLazy design={design} />
      ) : (
        <div className="flex justify-center px-6 py-8">
          <CardFace design={design} onReady={onReady} className="h-auto w-full max-w-[320px] rounded-[28px] shadow-xl" />
        </div>
      )}
      <div className="hidden">
        <CardFace design={design} onReady={onReady} />
      </div>
      <p className="px-5 pb-4 text-center text-xs text-[#8a8173]">
        Atril vertical. Arrastra para girar. El logo se imprime en un solo color.
      </p>
    </div>
  );
}
