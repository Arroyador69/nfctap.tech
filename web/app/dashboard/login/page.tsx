"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Contraseña incorrecta");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-24">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Dashboard NFCTap</h1>
      <p className="mt-2 text-sm text-[#6f675c]">Solo tú. Contraseña en DASHBOARD_PASSWORD.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          className="w-full rounded-xl border border-[#e6ddd0] bg-white px-3 py-2"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="w-full rounded-full bg-[#1c1915] py-2.5 font-medium text-[#f6f1e7]">
          Entrar
        </button>
      </form>
    </div>
  );
}
