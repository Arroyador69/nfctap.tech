"use client";

import {
  CalendarStrip,
  FolderBoard,
  ProgressRail,
  type PanelClientView,
} from "@/components/panel/PanelWorkspace";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ClientHome({
  initial,
  role,
}: {
  initial: PanelClientView;
  role: "admin" | "client";
}) {
  const [client, setClient] = useState(initial);
  const router = useRouter();
  const now = new Date();
  const y = client.currentMonth?.year || now.getFullYear();
  const m = client.currentMonth?.month || now.getMonth() + 1;

  useEffect(() => {
    setClient(initial);
  }, [initial]);

  async function logout() {
    await fetch("/api/panel/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.replace("/panel");
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg space-y-5 px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">
            Pack {client.packMeta.label} · {client.packMeta.euros} €/mes
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
            {client.name}
          </h1>
          <p className="mt-1 text-sm text-[#7a7266]">{client.packMeta.blurb}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="shrink-0 rounded-full border border-[#e6ddd0] px-3 py-1.5 text-xs font-semibold text-[#5c564c]"
        >
          Salir
        </button>
      </header>

      <ProgressRail strategy={client.strategy} overall={client.overallProgress} />
      <CalendarStrip year={y} month={m} files={client.files} />

      <section className="rounded-3xl border border-[#e6ddd0] bg-[#1c1915] px-4 py-4 text-[#f6f1e7]">
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[#e2b43a]">Facturación</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-xl">
          {client.packMeta.euros} €/mes + IVA · {client.packMeta.label}
        </p>
        <p className="mt-1 text-sm text-[#d5cbb8]">
          Factura y cobro con Polar (próximo paso). Mientras, el panel ya guarda contrato y
          materiales. Dudas: contacto@nfctap.tech
        </p>
      </section>

      <div>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[#1c1915]">
          Carpetas y vídeos
        </h2>
        <FolderBoard client={client} role={role} onChange={setClient} />
      </div>

      <p className="text-center text-xs text-[#8a8173]">
        Datos privados · RGPD · nfctap.tech/panel
      </p>
    </div>
  );
}
