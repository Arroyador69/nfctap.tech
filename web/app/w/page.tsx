"use client";

import { useCallback, useEffect, useState } from "react";

type Creds = { ssid: string; password: string; open: boolean };

function parseHash(): Creds | null {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  const src = `${u.hash.replace(/^#/, "")}&${u.search.replace(/^\?/, "")}`;
  const p = new URLSearchParams(src);
  const ssid = (p.get("s") || "").trim();
  if (!ssid) return null;
  const t = (p.get("t") || "WPA").toLowerCase();
  const open = t === "nopass" || t === "open";
  return { ssid, password: p.get("p") || "", open };
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = value;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

export default function WifiPage() {
  const [creds, setCreds] = useState<Creds | null>(null);
  const [copied, setCopied] = useState<"ssid" | "password" | "">("");

  useEffect(() => {
    const apply = () => setCreds(parseHash());
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const copy = useCallback(async (what: "ssid" | "password", value: string) => {
    if (!value) return;
    const ok = await copyText(value);
    if (ok) {
      setCopied(what);
      window.setTimeout(() => setCopied(""), 2000);
    }
  }, []);

  if (!creds) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <p className="text-xs uppercase tracking-[0.18em] text-[#b0892c]">NFCTap</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
          No hay red en este enlace
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#6f675c]">
          Vuelve a grabar la pegatina en NFCTap Config con el nombre y la contraseña del Wi‑Fi.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-[#b0892c]">Acerca el móvil · Wi‑Fi</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Conectar a la red
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#6f675c]">
        Copia la clave, ve a Ajustes → Wi‑Fi, elige la red y pégala. El iPhone no se une solo al
        tocar NFC.
      </p>

      <section className="mt-8 rounded-[24px] border border-[#e6ddd0] bg-white p-5">
        <p className="text-xs text-[#8a8173]">Red</p>
        <p className="mt-1 break-all text-2xl font-semibold text-[#1c1915]">{creds.ssid}</p>
        <button
          type="button"
          onClick={() => copy("ssid", creds.ssid)}
          className="mt-3 text-sm font-medium text-[#b0892c]"
        >
          {copied === "ssid" ? "Nombre copiado" : "Copiar nombre"}
        </button>
      </section>

      <section className="mt-4 rounded-[24px] border border-[#1c1915] bg-[#1c1915] p-5 text-[#f6f1e7]">
        <p className="text-xs text-[#b9ae99]">{creds.open ? "Red abierta" : "Contraseña"}</p>
        <p className="mt-1 break-all text-2xl font-semibold">
          {creds.open ? "Sin clave" : creds.password || "—"}
        </p>
        {!creds.open && creds.password ? (
          <button
            type="button"
            onClick={() => copy("password", creds.password)}
            className="mt-4 w-full rounded-full bg-[#e2b43a] py-3 text-sm font-semibold text-[#1c1915]"
          >
            {copied === "password" ? "Contraseña copiada" : "Copiar contraseña"}
          </button>
        ) : null}
      </section>

      <p className="mt-8 text-xs leading-5 text-[#8a8173]">
        La clave viaja en el enlace del chip, no la guardamos en el servidor.
      </p>
    </div>
  );
}
