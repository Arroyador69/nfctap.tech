"use client";

/**
 * Mockup 2D canvas (patrón de configuradores de producto).
 * No depende de coords 3D: el logo siempre queda en el círculo.
 * El visor 3D aparte sirve para girar y ver la aleta.
 */

import { useEffect, useRef } from "react";

export function NegocioMockup({
  logoDataUrl,
  line1,
  accentHex = "#f4f1ea",
  bodyHex = "#0e0e10",
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

    const W = 720;
    const H = 920;
    canvas.width = W;
    canvas.height = H;

    let cancelled = false;

    const paint = (logo?: HTMLImageElement) => {
      if (cancelled) return;
      ctx.clearRect(0, 0, W, H);

      // atmósfera
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#faf6ee");
      bg.addColorStop(1, "#ebe3d4");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const plateX = W * 0.18;
      const plateW = W * 0.64;
      const plateY = H * 0.14;
      const plateH = H * 0.62;
      const r = 28;

      // sombra
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      roundRect(ctx, plateX + 8, plateY + 14, plateW, plateH + 36, r);
      ctx.fill();

      // placa
      ctx.fillStyle = bodyHex;
      roundRect(ctx, plateX, plateY, plateW, plateH, r);
      ctx.fill();

      // pie / bandeja
      const footY = plateY + plateH - 8;
      ctx.fillStyle = bodyHex;
      roundRect(ctx, plateX + 24, footY, plateW - 48, 52, 12);
      ctx.fill();
      ctx.fillStyle = accentHex;
      ctx.globalAlpha = 0.85;
      ctx.font = `500 ${Math.round(W * 0.028)}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("nfctap.tech", W / 2, footY + 28);
      ctx.globalAlpha = 1;

      // círculo logo (arriba, solapando borde)
      const logoR = plateW * 0.22;
      const logoCx = W / 2;
      const logoCy = plateY + 8;

      ctx.beginPath();
      ctx.arc(logoCx, logoCy, logoR + 6, 0, Math.PI * 2);
      ctx.fillStyle = accentHex;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
      ctx.fillStyle = "#111113";
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoCx, logoCy, logoR * 0.92, 0, Math.PI * 2);
      ctx.clip();
      if (logo) {
        const side = logoR * 1.84;
        // contain-ish: cover circle
        const scale = Math.max(side / logo.width, side / logo.height);
        const dw = logo.width * scale;
        const dh = logo.height * scale;
        ctx.drawImage(logo, logoCx - dw / 2, logoCy - dh / 2, dw, dh);
      } else {
        ctx.fillStyle = "#141416";
        ctx.fill();
        ctx.fillStyle = accentHex;
        ctx.font = `600 ${Math.round(logoR * 0.32)}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Tu logo", logoCx, logoCy - logoR * 0.1);
        ctx.fillStyle = "#8a8173";
        ctx.font = `${Math.round(logoR * 0.2)}px Georgia, serif`;
        ctx.fillText("súbelo abajo", logoCx, logoCy + logoR * 0.32);
      }
      ctx.restore();

      // nombre
      if (line1?.trim()) {
        ctx.fillStyle = accentHex;
        ctx.font = `500 ${Math.round(W * 0.032)}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText(line1.trim().slice(0, 22), W / 2, plateY + logoR + 48);
      }

      // frase
      ctx.fillStyle = accentHex;
      ctx.font = `500 ${Math.round(W * 0.036)}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillText("Acerque el móvil", W / 2, plateY + plateH * 0.42);

      // 3 chips
      const chipY = plateY + plateH * 0.58;
      const gap = plateW * 0.28;
      const labels = ["Google", "App", "Instagram"];
      labels.forEach((lab, i) => {
        const x = W / 2 + (i - 1) * gap;
        ctx.beginPath();
        ctx.arc(x, chipY, 28, 0, Math.PI * 2);
        ctx.strokeStyle = accentHex;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = accentHex;
        ctx.font = `500 14px Georgia, serif`;
        ctx.fillText(lab, x, chipY + 48);
      });
    };

    if (logoDataUrl) {
      const img = new Image();
      img.onload = () => paint(img);
      img.onerror = () => paint();
      img.src = logoDataUrl;
    } else {
      paint();
    }

    return () => {
      cancelled = true;
    };
  }, [logoDataUrl, line1, accentHex, bodyHex]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-[#f3eee4]">
      <canvas ref={canvasRef} className="mx-auto block h-auto w-full" style={{ aspectRatio: "720 / 920" }} />
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
