"use client";

import { CARD_H, CARD_W, drawCardFace } from "@/lib/draw-card";
import type { CardDesign } from "@/lib/types";
import { useEffect, useRef } from "react";

type Props = {
  design: CardDesign;
  className?: string;
  onReady?: (dataUrl: string) => void;
};

export function CardFace({ design, className, onReady }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paint = (logo?: HTMLImageElement) => {
      drawCardFace(ctx, design, logo);
      onReady?.(canvas.toDataURL("image/jpeg", 0.72));
    };

    if (design.logoDataUrl && design.kind !== "generica") {
      const img = new Image();
      img.onload = () => paint(img);
      img.src = design.logoDataUrl;
    } else {
      paint();
    }
  }, [design, onReady]);

  return (
    <canvas
      ref={ref}
      width={CARD_W}
      height={CARD_H}
      className={className ?? "pointer-events-none h-auto w-full max-w-[340px]"}
      style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
      aria-hidden
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
