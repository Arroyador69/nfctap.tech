"use client";

import { parseWifiFragment, type WifiTapCreds } from "@/lib/wifi-tap";
import { useCallback, useEffect, useState } from "react";

type Lang = "es" | "en";

const COPY: Record<
  Lang,
  {
    tap: string;
    title: string;
    hint: string;
    network: string;
    password: string;
    openNet: string;
    noPass: string;
    copyNet: string;
    copiedNet: string;
    copyPass: string;
    copiedPass: string;
    privacy: string;
    emptyTitle: string;
    emptyBody: string;
  }
> = {
  es: {
    tap: "TAP · Wi‑Fi",
    title: "Conectar a la red",
    hint: "Copia la contraseña. Luego Ajustes → Wi‑Fi → esa red → pégala. El iPhone no se une solo al tocar.",
    network: "Red",
    password: "Contraseña",
    openNet: "Red abierta",
    noPass: "Sin clave",
    copyNet: "Copiar nombre",
    copiedNet: "Nombre copiado",
    copyPass: "Copiar contraseña",
    copiedPass: "Contraseña copiada",
    privacy: "La clave va en el chip, no en el servidor. Sin TAP no hay datos.",
    emptyTitle: "Solo funciona con TAP",
    emptyBody: "Esta pantalla no lista redes. Solo se abre al acercar el móvil al atril.",
  },
  en: {
    tap: "TAP · Wi‑Fi",
    title: "Join the network",
    hint: "Copy the password. Then Settings → Wi‑Fi → that network → paste it. iPhone does not join Wi‑Fi from NFC alone.",
    network: "Network",
    password: "Password",
    openNet: "Open network",
    noPass: "No password",
    copyNet: "Copy name",
    copiedNet: "Name copied",
    copyPass: "Copy password",
    copiedPass: "Password copied",
    privacy: "The key is on the chip, not on the server. No TAP, no data.",
    emptyTitle: "TAP only",
    emptyBody: "This screen does not list networks. It only opens when you hold the phone to the stand.",
  },
};

function detectLang(): Lang {
  if (typeof window === "undefined") return "es";
  try {
    const saved = window.localStorage.getItem("nfctap-w-lang");
    if (saved === "en" || saved === "es") return saved;
  } catch {
    /* private mode */
  }
  return /^en\b/i.test(navigator.language) ? "en" : "es";
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

function Flags({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const btn = (id: Lang, flag: string, label: string) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      aria-pressed={lang === id}
      aria-label={label}
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${
        lang === id
          ? "border-[#1c1915] bg-[#1c1915] text-[#f6f1e7]"
          : "border-[#e6ddd0] bg-white text-[#1c1915]"
      }`}
    >
      <span className="text-xl leading-none" aria-hidden>
        {flag}
      </span>
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {btn("es", "🇪🇸", "Español")}
      {btn("en", "🇬🇧", "English")}
    </div>
  );
}

export default function WifiPage() {
  const [creds, setCreds] = useState<WifiTapCreds | null>(null);
  const [lang, setLang] = useState<Lang>("es");
  const [copied, setCopied] = useState<"ssid" | "password" | "">("");

  useEffect(() => {
    setLang(detectLang());
    if (window.location.search) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    }
    const apply = () => setCreds(parseWifiFragment(window.location.hash));
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const setAndStore = useCallback((next: Lang) => {
    setLang(next);
    try {
      window.localStorage.setItem("nfctap-w-lang", next);
    } catch {
      /* private mode */
    }
  }, []);

  const copy = useCallback(async (what: "ssid" | "password", value: string) => {
    if (!value) return;
    const ok = await copyText(value);
    if (ok) {
      setCopied(what);
      window.setTimeout(() => setCopied(""), 2000);
    }
  }, []);

  const t = COPY[lang];

  return (
    <div className="mx-auto max-w-md px-5 py-8">
      <Flags lang={lang} onChange={setAndStore} />

      {!creds ? (
        <>
          <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">{t.emptyTitle}</h1>
          <p className="mt-4 text-sm leading-6 text-[#6f675c]">{t.emptyBody}</p>
        </>
      ) : (
        <>
          <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[#b0892c]">{t.tap}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">{t.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#6f675c]">{t.hint}</p>

          <section className="mt-8 rounded-[24px] border border-[#e6ddd0] bg-white p-5">
            <p className="text-xs text-[#8a8173]">{t.network}</p>
            <p className="mt-1 select-all break-all text-2xl font-semibold text-[#1c1915]">{creds.ssid}</p>
            <button
              type="button"
              onClick={() => copy("ssid", creds.ssid)}
              className="mt-4 w-full rounded-full border border-[#1c1915] py-3.5 text-base font-semibold text-[#1c1915]"
            >
              {copied === "ssid" ? t.copiedNet : t.copyNet}
            </button>
          </section>

          <section className="mt-4 rounded-[24px] border border-[#1c1915] bg-[#1c1915] p-5 text-[#f6f1e7]">
            <p className="text-xs text-[#b9ae99]">{creds.open ? t.openNet : t.password}</p>
            <p className="mt-1 select-all break-all text-2xl font-semibold">
              {creds.open ? t.noPass : creds.password || "—"}
            </p>
            {!creds.open && creds.password ? (
              <button
                type="button"
                onClick={() => copy("password", creds.password)}
                className="mt-5 w-full rounded-full bg-[#e2b43a] py-4 text-lg font-semibold text-[#1c1915]"
              >
                {copied === "password" ? t.copiedPass : t.copyPass}
              </button>
            ) : null}
          </section>

          <p className="mt-8 text-xs leading-5 text-[#8a8173]">{t.privacy}</p>
        </>
      )}
    </div>
  );
}
