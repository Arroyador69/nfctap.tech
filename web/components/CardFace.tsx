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
      onReady?.(canvas.toDataURL("image/png"));
    };

    if (design.logoDataUrl) {
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
      className={className ?? "h-auto w-full max-w-[340px]"}
      style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
      aria-label="Vista de la tarjeta vertical"
    />
  );
}
