import { CallManage } from "@/components/CallManage";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "Gestionar tu llamada",
  description: "Cambia o cancela tu llamada de 15 minutos con NFCTap.",
  path: "/llamar/gestionar",
});

export default async function GestionarLlamadaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="min-h-screen bg-[#f7f3eb] text-[#1c1915]">
      <section className="mx-auto max-w-3xl px-5 pb-6 pt-12 sm:pt-14">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">nfctap.tech</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Gestionar llamada
        </h1>
        <p className="mt-3 max-w-xl text-[#5c564c]">
          Cambia la hora o cancela con tiempo. Así liberamos el hueco: las llamadas son de 15
          minutos y la agenda va llena.
        </p>
      </section>
      <section className="mx-auto max-w-3xl px-5 pb-20">
        {token ? (
          <CallManage token={token} />
        ) : (
          <p className="text-[#a33]">Falta el enlace de gestión del email de confirmación.</p>
        )}
      </section>
    </main>
  );
}
