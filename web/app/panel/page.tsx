import { PanelLoginForm } from "@/components/panel/PanelLoginForm";
import { getPanelSession } from "@/lib/panel";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel de cliente",
  description: "Acceso privado NFCTap Redes. Solo para clientes con contrato.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PanelLoginPage() {
  const session = await getPanelSession();
  if (session?.role === "admin") redirect("/panel/admin");
  if (session?.role === "client") redirect("/panel/app");

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 pb-[env(safe-area-inset-bottom)] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">
        NFCTap · Redes · privado
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1c1915]">
        Tu panel
      </h1>
      <p className="mt-3 text-base leading-relaxed text-[#5c564c]">
        Sube materiales, descarga los vídeos finales y sigue la estrategia a 3 meses.
        Acceso cifrado, solo tu negocio.
      </p>
      <PanelLoginForm />
      <p className="mt-6 text-sm text-[#8a8173]">
        ¿Problemas? Escribe a{" "}
        <a className="underline" href="mailto:contacto@nfctap.tech">
          contacto@nfctap.tech
        </a>
      </p>
    </div>
  );
}
