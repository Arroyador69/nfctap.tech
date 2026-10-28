import { DashboardNav } from "@/components/DashboardNav";
import { CaptacionPanel } from "@/components/CaptacionPanel";
import { isAdmin } from "@/lib/auth";
import {
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_WAVE_MAX,
  NFC_LEADS_WAVES_PER_DAY,
  NFC_SALES_DAILY_GOAL,
  NFC_SEED_PLACES,
} from "@/lib/business-leads/constants";
import { salesGoalReached } from "@/lib/business-leads/sales";
import { getDayStats } from "@/lib/business-leads/stats";
import { polarUnicaReady } from "@/lib/polar";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Captación · Dashboard" };

export default async function CaptacionPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");

  const [stats, sales] = await Promise.all([getDayStats(), salesGoalReached()]);
  const resendKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFrom =
    process.env.RESEND_FROM?.trim() || "NFCTap <hola@nfctap.tech> (fallback)";
  const telegram =
    Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) &&
    Boolean(process.env.TELEGRAM_CHAT_ID?.trim());

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <DashboardNav />
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Captación clientes</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#6f675c]">
        Cold email → <code>/negocio</code> · meta <strong>≥ {NFC_SALES_DAILY_GOAL} ventas/día</strong> ·
        tope {NFC_LEADS_DAILY_HARD_CAP} mails ({NFC_LEADS_WAVES_PER_DAY}×{NFC_LEADS_WAVE_MAX}).
        Misma idea que el panel de propietarios de Delfín, aquí negocios locales.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mails hoy" value={`${stats.sent}/${NFC_LEADS_DAILY_HARD_CAP}`} />
        <Stat label="Oleadas hoy" value={`${stats.waves}/${NFC_LEADS_WAVES_PER_DAY}`} />
        <Stat
          label="Ventas /negocio hoy"
          value={`${sales.count}/${sales.goal}`}
          warn={sales.stop}
        />
        <Stat label="Fallos hoy" value={String(stats.failed)} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-[#e6ddd0] bg-white p-5">
          <h2 className="text-lg font-semibold">Estado infra</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#5c564c]">
            <Li ok={resendKey}>Resend API key</Li>
            <Li ok={Boolean(process.env.RESEND_FROM?.trim())}>
              RESEND_FROM · ahora: {resendFrom}
            </Li>
            <Li ok={telegram}>Telegram bot (TOKEN + CHAT_ID)</Li>
            <Li ok={polarUnicaReady()}>Polar producto UNICA (logo + chips)</Li>
            <Li ok={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}>Blob (cola / stats)</Li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-[#8a8173]">
            Correos de marca: <strong>contacto@nfctap.tech</strong> (soporte, perfiles) ·
            outreach preferible <strong>hola@</strong> o dominio Resend verificado. MX del apex =
            Zoho; no mezclar cold masivo con Zoho. SPF apex hoy solo Zoho — Resend necesita DKIM
            verificado (ya hay <code>resend._domainkey</code>) y preferible enviar desde subdominio
            <code> send.</code> o incluir Resend en SPF.
          </p>
          <p className="mt-2 text-xs text-[#8a8173]">
            Cola geográfica: {NFC_SEED_PLACES.join(" → ")}.
          </p>
        </div>

        <CaptacionPanel
          defaultTo=""
          salesStop={sales.stop}
          lastWaveAt={stats.lastWaveAt}
          lastPlace={stats.lastPlace}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      className={`rounded-[20px] border px-4 py-4 ${
        warn ? "border-[#c4a574] bg-[#fff8e8]" : "border-[#e6ddd0] bg-white"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-[#8a8173]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {warn ? <p className="mt-1 text-xs text-[#8a5a12]">Meta alcanzada · stop oleadas</p> : null}
    </div>
  );
}

function Li({ ok, children }: { ok: boolean; children: import("react").ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className={ok ? "text-emerald-700" : "text-[#b45309]"}>{ok ? "✓" : "○"}</span>
      <span>{children}</span>
    </li>
  );
}
