"use client";

import { CardPreview } from "@/components/CardPreview";
import { FACE_MODELS, defaultDesign } from "@/lib/catalog";
import type { CatalogModel } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export function HomeHero() {
  const [model, setModel] = useState<CatalogModel>("google");

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-8 sm:gap-12 sm:py-14 lg:grid-cols-[1fr_1.05fr] lg:py-20">
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#b0892c]">nfctap.tech</p>
        <h1 className="font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.08] text-[#1c1915] sm:text-5xl lg:text-6xl">
          TAP.
          <br />
          WhatsApp, Instagram o Google.
          <br />
          En la barra.
        </h1>
        <p className="mt-5 max-w-md text-lg text-[#5c564c]">
          Atril NFC impreso en España. El cliente acerca el móvil y se abre el chat, el perfil o
          tu reseña. Lo ves en 3D, lo encargas aquí y sale en 24 h. Pagas con tarjeta, Apple Pay
          o Bizum.
        </p>
        <div className="mt-6 grid max-w-md grid-cols-3 gap-2">
          {FACE_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              className={`rounded-2xl px-2 py-3 text-sm font-medium ${
                model === m.id ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-white text-[#5c564c]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-3 max-w-md text-sm text-[#8a8173]">{FACE_MODELS.find((m) => m.id === model)?.blurb}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/personalizar?models=${model}`}
            className="rounded-full bg-[#1c1915] px-6 py-3 font-semibold text-[#f6f1e7]"
          >
            Encargar esta
          </Link>
          <Link href="/#precios" className="rounded-full border border-[#d9cfc0] px-6 py-3">
            Ver precios
          </Link>
        </div>
      </div>
      <CardPreview design={defaultDesign("generica", model)} />
    </section>
  );
}
