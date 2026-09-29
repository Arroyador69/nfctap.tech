"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PanelLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/panel/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo entrar");
      router.replace(data.redirect || "/panel/app");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <label className="block text-sm font-medium text-[#5c564c]" htmlFor="panel-email">
        Email
      </label>
      <input
        id="panel-email"
        type="email"
        autoComplete="username"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@negocio.com"
        className="w-full rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3.5 text-base text-[#1c1915]"
      />
      <label className="block text-sm font-medium text-[#5c564c]" htmlFor="panel-pass">
        Contraseña
      </label>
      <input
        id="panel-pass"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3.5 text-base text-[#1c1915]"
      />
      {err ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !email.trim() || !password}
        className="w-full rounded-2xl bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
      >
        {busy ? "Entrando…" : "Entrar al panel"}
      </button>
    </form>
  );
}
