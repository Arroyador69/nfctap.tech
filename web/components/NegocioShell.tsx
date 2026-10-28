"use client";

import { NegocioOrder } from "@/components/NegocioOrder";
import { NegocioViewer } from "@/components/NegocioViewer";
import type { AccentColor, BodyColor } from "@/lib/types";
import { useState } from "react";

/** Visor 3D (logo en el círculo) + pedido. */
export function NegocioShell() {
  const [bodyColor, setBody] = useState<BodyColor>("negro");
  const [accentColor, setAccent] = useState<AccentColor>("blanco");
  const [logoDataUrl, setLogo] = useState("");

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <NegocioViewer
          bodyColor={bodyColor}
          accentColor={accentColor}
          onBody={setBody}
          onAccent={setAccent}
          logoDataUrl={logoDataUrl}
          onLogo={setLogo}
        />
      </section>
      <NegocioOrder bodyColor={bodyColor} accentColor={accentColor} logoDataUrl={logoDataUrl} />
    </>
  );
}
