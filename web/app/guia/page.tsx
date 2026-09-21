import { FaqList } from "@/components/FaqList";
import { GUIDES } from "@/lib/guides";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";

export const metadata = pageMeta({
  title: "Guía NFCTap",
  description:
    "Atril NFC para Google, WhatsApp e Instagram, NFC frente a QR, y TAP Wi‑Fi de pared para alquileres y hoteles. Impreso en España.",
  path: "/guia",
});

export default function GuiaPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">Guía</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
        Cómo se usa un atril NFC en un negocio
      </h1>
      <p className="mt-4 max-w-xl text-[#5c564c]">
        Respuestas cortas para hostelería, alquileres y cualquier barra en España. El mismo
        atril que ves en 3D es el que se imprime.
      </p>
      <div className="mt-10 grid gap-4">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guia/${g.slug}`}
            className="rounded-[24px] border border-[#e6ddd0] bg-white p-5 hover:border-[#1c1915]"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b0892c]">{g.kicker}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#1c1915]">{g.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#5c564c]">{g.answer}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <FaqList
          items={[
            {
              q: "¿Esto es un blog genérico de impresión 3D?",
              a: "No. Solo hablamos de las piezas NFCTap que fabricamos: atril de barra y TAP Wi‑Fi de pared.",
            },
          ]}
        />
      </div>
    </div>
  );
}
