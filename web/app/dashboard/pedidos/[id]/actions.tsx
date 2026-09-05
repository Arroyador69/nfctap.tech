"use client";

import type { OrderStatus } from "@/lib/types";
import { useState } from "react";

const STATUSES: OrderStatus[] = [
  "pendiente_pago",
  "pagado",
  "en_impresion",
  "enviado",
  "entregado",
  "cancelado",
];

export function OrderActions({
  id,
  status,
  tracking,
}: {
  id: string;
  status: OrderStatus;
  tracking: string;
}) {
  const [s, setS] = useState(status);
  const [t, setT] = useState(tracking);
  const [msg, setMsg] = useState("");

  async function save() {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s, tracking: t }),
    });
    setMsg(res.ok ? "Actualizado" : "Error al guardar");
  }

  return (
    <div className="mt-8 space-y-3 rounded-3xl border border-[#e6ddd0] bg-white p-5">
      <label className="block text-sm">
        Estado
        <select
          className="mt-1 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3 py-2"
          value={s}
          onChange={(e) => setS(e.target.value as OrderStatus)}
        >
          {STATUSES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Seguimiento Correos
        <input
          className="mt-1 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3 py-2"
          value={t}
          onChange={(e) => setT(e.target.value)}
        />
      </label>
      <button
        onClick={save}
        className="rounded-full bg-[#1c1915] px-5 py-2 text-sm font-medium text-[#f6f1e7]"
      >
        Guardar
      </button>
      {msg && <span className="ml-3 text-sm text-[#6f675c]">{msg}</span>}
    </div>
  );
}
