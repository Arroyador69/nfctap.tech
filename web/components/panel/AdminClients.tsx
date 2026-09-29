"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { PanelClientView } from "@/components/panel/PanelWorkspace";

const PACKS = [
  { id: "barrio", label: "Barrio · 150 €" },
  { id: "calle", label: "Calle · 450 €" },
  { id: "plaza", label: "Plaza · 590 €" },
  { id: "faro", label: "Faro · 790 €" },
] as const;

export function AdminClients({ initial }: { initial: PanelClientView[] }) {
  const [clients, setClients] = useState(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pack, setPack] = useState<(typeof PACKS)[number]["id"]>("calle");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState("");
  const router = useRouter();

  async function logout() {
    await fetch("/api/panel/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.replace("/panel");
    router.refresh();
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setCreated("");
    try {
      const res = await fetch("/api/panel/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, pack }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setClients((prev) => [data.client, ...prev]);
      setCreated(
        `Cliente creado. Dile que entre en nfctap.tech/panel con ${email} y la contraseña que pusiste.`,
      );
      setName("");
      setEmail("");
      setPassword("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg space-y-5 px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">
            Superadmin · contacto@nfctap.tech
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
            Clientes redes
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full border border-[#e6ddd0] px-3 py-1.5 text-xs font-semibold"
        >
          Salir
        </button>
      </header>

      <form onSubmit={onCreate} className="space-y-3 rounded-3xl border border-[#e6ddd0] bg-white p-4">
        <p className="text-sm font-semibold text-[#1c1915]">Nuevo cliente</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del negocio"
          className="w-full rounded-2xl border border-[#e6ddd0] px-3 py-3 text-sm"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@negocio.com"
          className="w-full rounded-2xl border border-[#e6ddd0] px-3 py-3 text-sm"
          required
        />
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña temporal (mín. 8)"
          className="w-full rounded-2xl border border-[#e6ddd0] px-3 py-3 text-sm"
          minLength={8}
          required
        />
        <select
          value={pack}
          onChange={(e) => setPack(e.target.value as typeof pack)}
          className="w-full rounded-2xl border border-[#e6ddd0] bg-white px-3 py-3 text-sm"
        >
          {PACKS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-[#1c1915] py-3 font-semibold text-[#f6f1e7] disabled:opacity-40"
        >
          {busy ? "Creando…" : "Crear acceso"}
        </button>
        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        {created ? <p className="text-sm text-[#5c564c]">{created}</p> : null}
      </form>

      <ul className="space-y-2">
        {clients.length === 0 ? (
          <li className="text-sm text-[#8a8173]">Aún no hay clientes.</li>
        ) : (
          clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/panel/admin/${c.id}`}
                className="block rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3"
              >
                <p className="font-semibold text-[#1c1915]">{c.name}</p>
                <p className="text-xs text-[#7a7266]">
                  {c.packMeta.label} · {c.email} · {c.overallProgress}% trimestre
                  {c.contractAccepted ? " · contrato OK" : " · falta contrato"}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
