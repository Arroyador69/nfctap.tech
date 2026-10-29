"use client";

/**
 * Mockup 2D sobre foto real de la placa.
 * Círculo calibrado (detección): cx≈48.1% · cy≈37.6% · Ø≈20.2% del ancho.
 * El 3D aparte sirve para girar y ver la aleta.
 */

import { useEffect, useRef } from "react";

/** Fracciones sobre negocio-placa.jpg (1080×1440). */
const CIRCLE = {
  cx: 0.4806,
  cy: 0.3757,
  r: 0.1009, // radio / ancho
} as const;

const PLATE_SRC = "/stock/negocio-placa.jpg";

export function NegocioMockup({
  logoDataUrl,
  line1,
}: {
  logoDataUrl: string;
  line1?: string;
  accentHex?: string;
  bodyHex?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    function loadImage(src: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    (async () => {
      try {
        const plate = await loadImage(PLATE_SRC);
        if (cancelled) return;

        const W = plate.naturalWidth;
        const H = plate.naturalHeight;
        canvas.width = W;
        canvas.height = H;

        ctx.drawImage(plate, 0, 0, W, H);

        const cx = W * CIRCLE.cx;
        const cy = H * CIRCLE.cy;
        const r = W * CIRCLE.r;

        // disco de acento + clip del logo
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = "#f4f1ea";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "#111113";
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2);
        ctx.clip();

        if (logoDataUrl) {
          try {
            const logo = await loadImage(logoDataUrl);
            if (cancelled) return;
            const side = r * 1.88;
            const scale = Math.max(side / logo.width, side / logo.height);
            const dw = logo.width * scale;
            const dh = logo.height * scale;
            ctx.drawImage(logo, cx - dw / 2, cy - dh / 2, dw, dh);
          } catch {
            // sin logo usable
          }
        } else {
          ctx.fillStyle = "#f4f1ea";
          ctx.font = `600 ${Math.round(r * 0.34)}px Georgia, serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Tu logo", cx, cy - r * 0.08);
          ctx.fillStyle = "#8a8173";
          ctx.font = `${Math.round(r * 0.22)}px Georgia, serif`;
          ctx.fillText("súbelo abajo", cx, cy + r * 0.3);
        }
        ctx.restore();

        if (line1?.trim()) {
          ctx.fillStyle = "#f4f1ea";
          ctx.font = `500 ${Math.round(W * 0.028)}px Georgia, serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.shadowColor = "rgba(0,0,0,0.55)";
          ctx.shadowBlur = 6;
          ctx.fillText(line1.trim().slice(0, 22), cx, cy + r + 18);
          ctx.shadowBlur = 0;
        }
      } catch {
        // foto no disponible
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logoDataUrl, line1]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-[#f3eee4]">
      <canvas
        ref={canvasRef}
        className="mx-auto block h-auto w-full"
        style={{ aspectRatio: "1080 / 1440" }}
      />
    </div>
  );
}
