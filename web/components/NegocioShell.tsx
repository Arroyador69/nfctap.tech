"use client";

import { NegocioOrder } from "@/components/NegocioOrder";
import { NegocioViewer } from "@/components/NegocioViewer";
import type { AccentColor, BodyColor } from "@/lib/types";
import { useState } from "react";

/** Mockup con logo + 3D aleta + pedido. */
export function NegocioShell() {
  const [bodyColor, setBody] = useState<BodyColor>("negro");
  const [accentColor, setAccent] = useState<AccentColor>("blanco");
  const [logoDataUrl, setLogo] = useState("");
  const [line1, setLine1] = useState("");

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
          line1={line1}
        />
      </section>
      <NegocioOrder
        bodyColor={bodyColor}
        accentColor={accentColor}
        logoDataUrl={logoDataUrl}
        line1={line1}
        onLine1={setLine1}
      />
    </>
  );
}
