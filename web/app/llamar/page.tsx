import { CallBooking } from "@/components/CallBooking";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "Reserva una llamada de 15 min",
  description:
    "Habla con atención comercial NFCTap. Lunes a viernes, 09:00–14:00 y 16:00–19:00 (Madrid). Videollamada de 15 minutos.",
  path: "/llamar",
});

export default function LlamarPage() {
  return (
    <main className="min-h-screen bg-[#f7f3eb] text-[#1c1915]">
      <section className="mx-auto max-w-4xl px-5 pb-6 pt-12 sm:pt-14">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">nfctap.tech</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          Te lo explicamos en 15 minutos
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#5c564c] sm:text-lg">
          Elige día y hora. Videollamada corta con el equipo comercial: pieza, precios y cómo
          queda en tu barra. Sin compromiso.
        </p>
      </section>
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <CallBooking />
      </section>
    </main>
  );
}
