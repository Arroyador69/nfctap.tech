"use client";

import { ClientHome } from "@/components/panel/ClientHome";
import type { PanelClientView } from "@/components/panel/PanelWorkspace";
import Link from "next/link";
import { useState } from "react";

export function AdminClientDetail({ initial }: { initial: PanelClientView }) {
  const [client, setClient] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const cur = client.currentMonth;

  async function saveProgress(progress: number) {
    if (!cur) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/panel/clients/${client.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "updateStrategy",
          year: cur.year,
          month: cur.month,
          progress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setClient(data.client);
      setMsg(`Progreso del mes: ${progress}%`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mx-auto max-w-lg px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link href="/panel/admin" className="text-sm font-semibold text-[#b0892c]">
          ← Todos los clientes
        </Link>
        <div className="mt-3 rounded-3xl border border-[#e6ddd0] bg-white p-4">
          <p className="text-sm font-semibold text-[#1c1915]">Ajustar progreso del mes</p>
          <p className="mt-1 text-xs text-[#7a7266]">
            El cliente lo ve en la barra del trimestre. Solo tú editas esto.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[0, 25, 50, 75, 100].map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy || !cur}
                onClick={() => void saveProgress(n)}
                className="rounded-full border border-[#e6ddd0] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                {n}%
              </button>
            ))}
          </div>
          {msg ? <p className="mt-2 text-sm text-[#5c564c]">{msg}</p> : null}
        </div>
      </div>
      <ClientHome
        key={`${client.id}-${client.overallProgress}-${client.files.length}`}
        initial={client}
        role="admin"
      />
    </div>
  );
}
