"use client";

import { NegocioOrder } from "@/components/NegocioOrder";
import { NegocioViewer } from "@/components/NegocioViewer";
import type { AccentColor, BodyColor } from "@/lib/types";
import { useState } from "react";

/** Visor 3D + pedido con los mismos colores de filamento. */
export function NegocioShell() {
  const [bodyColor, setBody] = useState<BodyColor>("negro");
  const [accentColor, setAccent] = useState<AccentColor>("blanco");

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <NegocioViewer
          bodyColor={bodyColor}
          accentColor={accentColor}
          onBody={setBody}
          onAccent={setAccent}
        />
      </section>
      <NegocioOrder bodyColor={bodyColor} accentColor={accentColor} />
    </>
  );
}
