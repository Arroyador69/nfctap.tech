import { CaptacionPanel } from "@/components/CaptacionPanel";
import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import {
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_WAVE_MAX,
  NFC_LEADS_WAVES_PER_DAY,
  NFC_SALES_DAILY_GOAL,
  NFC_SEED_PLACES,
} from "@/lib/business-leads/constants";
import {
  loadQueue,
  queueCounts,
  recentSent,
  todayEngagement,
  type BusinessLead,
} from "@/lib/business-leads/queue";
import { salesGoalReached } from "@/lib/business-leads/sales";
import { getDayStats } from "@/lib/business-leads/stats";
import { polarUnicaReady } from "@/lib/polar";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Captación · Dashboard" };

export default async function CaptacionPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");

  const [stats, sales, qFile] = await Promise.all([
    getDayStats(),
    salesGoalReached(),
    loadQueue(),
  ]);
  const queue = queueCounts(qFile.leads);
  const today = todayEngagement(qFile.leads);
  const sentRows = recentSent(qFile.leads, 80);
  const queueTarget = 1000;
  const sendPct = Math.min(
    100,
    Math.round((stats.sent / Math.max(1, NFC_LEADS_DAILY_HARD_CAP)) * 100),
  );
  const salesPct = Math.min(
    100,
    Math.round((sales.count / Math.max(1, NFC_SALES_DAILY_GOAL)) * 100),
  );
  const queuePct = Math.min(100, Math.round((queue.queued / Math.max(1, queueTarget)) * 100));
  const openRate =
    queue.sent > 0 ? Math.round((queue.opened / queue.sent) * 1000) / 10 : 0;
  const clickRate =
    queue.sent > 0 ? Math.round((queue.clicked / queue.sent) * 1000) / 10 : 0;

  const resendKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFrom =
    process.env.RESEND_FROM?.trim() || "NFCTap <hola@nfctap.tech> (fallback)";
  const telegram =
    Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) &&
    Boolean(process.env.TELEGRAM_CHAT_ID?.trim());
  const webhookSecret = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <DashboardNav />
      <header className="mt-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Captación clientes
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6f675c]">
          Meta <strong className="text-[#1c1915]">≥ {NFC_SALES_DAILY_GOAL} ventas /negocio</strong> ·
          tope <strong className="text-[#1c1915]">{NFC_LEADS_DAILY_HARD_CAP} mails/día</strong> (
          {NFC_LEADS_WAVES_PER_DAY}×{NFC_LEADS_WAVE_MAX}) · cron discover rellena cola · oleadas
          08:00–17:00 Madrid · Telegram 12:00 · 16:00 · 21:00. Sin botones de envío: el cron lo hace.
        </p>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <BigCard
          title="Cola lista (stock)"
          value={queue.queued}
          denom={queueTarget}
          pct={queuePct}
          ok={queue.queued >= 200}
          okLabel={queue.queued >= 200 ? "OK para oleadas" : "Por debajo"}
          hint={`Mails listos · descubiertos hoy ${today.discoveredToday} · total cola ${queue.total}`}
        />
        <BigCard
          title="Ventas /negocio hoy (KPI)"
          value={sales.count}
          denom={NFC_SALES_DAILY_GOAL}
          pct={salesPct}
          ok={sales.stop}
          okLabel={sales.stop ? "Meta OK — STOP oleadas" : "Oleadas activas"}
          hint={
            sales.stop
              ? "Meta alcanzada: no más envíos hoy; cola para mañana."
              : `Cada hora ~${NFC_LEADS_WAVE_MAX} hasta tope o meta.`
          }
          warn={!sales.stop}
        />
        <BigCard
          title="Emails outreach hoy"
          value={stats.sent}
          denom={NFC_LEADS_DAILY_HARD_CAP}
          pct={sendPct}
          ok={stats.sent > 0}
          okLabel={`${stats.waves}/${NFC_LEADS_WAVES_PER_DAY} oleadas`}
          hint={`Abiertos ${today.openedToday} · clicks ${today.clickedToday} · bounce ${today.bouncedToday} · nuevos ${today.discoveredToday}`}
        />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="En cola" value={queue.queued} sub={`≥${queueTarget}`} accent />
        <Metric label="Enviados total" value={queue.sent} />
        <Metric label="Fallidos / bounce" value={queue.failed + queue.bounced} />
        <Metric label="Abiertos" value={queue.opened} sub={`${openRate}%`} />
        <Metric label="Clicks" value={queue.clicked} sub={`${clickRate}%`} />
        <Metric label="Hoy open %" value={today.openRatePct} sub={`${today.openedToday}/${today.sentToday}`} />
      </section>

      <section className="mt-8 overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-white shadow-sm">
        <div className="border-b border-[#efe8dc] px-5 py-4">
          <h2 className="text-lg font-semibold">Mails enviados</h2>
          <p className="mt-0.5 text-xs text-[#8a8173]">
            Últimos {sentRows.length} · estado abierto/click vía webhook Resend ·{" "}
            {stats.lastWaveAt
              ? `última oleada ${new Date(stats.lastWaveAt).toLocaleString("es-ES")}`
              : "aún sin oleada registrada"}
            {stats.lastPlace ? ` · ${stats.lastPlace}` : ""}
          </p>
        </div>
        {sentRows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#8a8173]">
            Aún no hay enviados en la cola Blob (o el contador del día va por stats y la cola se
            regeneró). Cuando el cron envíe, aparecen aquí con ciudad y tracking.
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#faf7f1] text-xs uppercase tracking-wide text-[#8a8173]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5 font-semibold">Negocio</th>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Ciudad</th>
                  <th className="px-4 py-2.5 font-semibold">Enviado</th>
                  <th className="px-4 py-2.5 font-semibold">Abierto</th>
                  <th className="px-4 py-2.5 font-semibold">Click</th>
                </tr>
              </thead>
              <tbody>
                {sentRows.map((l) => (
                  <LeadRow key={l.id} lead={l} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-[#e6ddd0] bg-white p-5">
          <h2 className="text-lg font-semibold">Estado infra</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#5c564c]">
            <Li ok={resendKey}>Resend API key</Li>
            <Li ok={Boolean(process.env.RESEND_FROM?.trim())}>
              RESEND_FROM · {resendFrom}
            </Li>
            <Li ok={telegram}>Telegram (TOKEN + CHAT_ID)</Li>
            <Li ok={polarUnicaReady()}>Polar producto UNICA</Li>
            <Li ok={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}>Blob (cola / stats)</Li>
            <Li ok={webhookSecret}>
              Webhook Resend (opens) · URL /api/webhook/resend
            </Li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-[#8a8173]">
            En Resend → Webhooks:{" "}
            <code className="rounded bg-[#f7f3eb] px-1">https://nfctap.tech/api/webhook/resend</code>
            {webhookSecret ? "?secret=…" : ""} · eventos{" "}
            <code>email.opened</code>, <code>email.clicked</code>, <code>email.bounced</code>. Sin
            webhook, la tabla muestra enviados pero no aperturas.
          </p>
          <p className="mt-2 text-xs text-[#8a8173]">
            Geografía: {NFC_SEED_PLACES.join(" → ")}.
          </p>
        </div>

        <CaptacionPanel
          salesStop={sales.stop}
          lastWaveAt={stats.lastWaveAt}
          lastPlace={stats.lastPlace}
          queued={queue.queued}
        />
      </div>
    </div>
  );
}

function LeadRow({ lead }: { lead: BusinessLead }) {
  const badge = statusBadge(lead);
  return (
    <tr className="border-t border-[#efe8dc] hover:bg-[#faf7f1]/">
      <td className="px-4 py-2.5">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${badge.className}`}
        >
          {badge.label}
        </span>
      </td>
      <td className="max-w-[10rem] truncate px-4 py-2.5 font-medium text-[#1c1915]">
        {lead.businessName || "—"}
      </td>
      <td className="max-w-[14rem] truncate px-4 py-2.5 text-[#5c564c]">{lead.email}</td>
      <td className="px-4 py-2.5 text-[#5c564c]">{lead.city || "—"}</td>
      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[#5c564c]">
        {fmt(lead.sentAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[#5c564c]">
        {fmt(lead.openedAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[#5c564c]">
        {fmt(lead.clickedAt)}
      </td>
    </tr>
  );
}

function statusBadge(lead: BusinessLead): { label: string; className: string } {
  if (lead.bouncedAt || lead.status === "failed") {
    return { label: "Bounce", className: "bg-rose-50 text-rose-900 ring-rose-200" };
  }
  if (lead.clickedAt) {
    return { label: "Click", className: "bg-sky-50 text-sky-900 ring-sky-200" };
  }
  if (lead.openedAt) {
    return { label: "Abierto", className: "bg-amber-50 text-amber-900 ring-amber-200" };
  }
  if (lead.status === "sent") {
    return { label: "Enviado", className: "bg-slate-100 text-slate-700 ring-slate-200" };
  }
  return { label: lead.status, className: "bg-slate-50 text-slate-600 ring-slate-200" };
}

function fmt(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return d;
  }
}

function BigCard({
  title,
  value,
  denom,
  pct,
  ok,
  okLabel,
  hint,
  warn,
}: {
  title: string;
  value: number;
  denom: number;
  pct: number;
  ok: boolean;
  okLabel: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 ${
        warn
          ? "border-[#e8d4a8] bg-[#fff8e8]"
          : ok
            ? "border-[#d6e4d8] bg-[#f4faf5]"
            : "border-[#e6ddd0] bg-white"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#3d3830]">{title}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            ok ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
          }`}
        >
          {okLabel}
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
        <span className="text-lg font-medium text-[#a89f90]"> / {denom}</span>
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#efe8dc]">
        <div
          className={`h-full rounded-full transition-all ${ok ? "bg-emerald-600" : "bg-[#1c1915]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-[#7a7266]">{hint}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] border px-3 py-3 ${
        accent ? "border-indigo-200 bg-indigo-50/40" : "border-[#e6ddd0] bg-white"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8173]">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-[11px] text-[#8a8173]">{sub}</p> : null}
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
