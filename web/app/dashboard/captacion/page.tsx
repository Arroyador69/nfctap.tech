import { CaptacionPanel } from "@/components/CaptacionPanel";
import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import {
  NFC_LEADS_COLD_DAILY_CAP,
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_FU_DAILY_CAP,
  NFC_LEADS_WAVE_MAX,
  NFC_LEADS_WAVES_PER_DAY,
  NFC_SALES_DAILY_GOAL,
  NFC_SEED_PLACES,
} from "@/lib/business-leads/constants";
import {
  loadOptOut,
  loadQueue,
  queueCounts,
  recentSent,
  todayEngagement,
  type BusinessLead,
  type TouchKind,
} from "@/lib/business-leads/queue";
import { salesGoalReached } from "@/lib/business-leads/sales";
import { sequenceCounts } from "@/lib/business-leads/sequence";
import { effectiveColdFu, getDayStats } from "@/lib/business-leads/stats";
import { loadWebsiteStock, stockCounts } from "@/lib/business-leads/website-stock";
import { polarUnicaReady } from "@/lib/polar";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Captación · Dashboard" };

export default async function CaptacionPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");

  const [stats, sales, qFile, stockFile, optOut] = await Promise.all([
    getDayStats(),
    salesGoalReached(),
    loadQueue(),
    loadWebsiteStock(),
    loadOptOut(),
  ]);
  const queue = queueCounts(qFile.leads);
  const stock = stockCounts(stockFile.items);
  const today = todayEngagement(qFile.leads);
  const seq = sequenceCounts(qFile.leads, optOut);
  const { coldSent, fuSent } = effectiveColdFu(stats);
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
  const coldPct = Math.min(
    100,
    Math.round((coldSent / Math.max(1, NFC_LEADS_COLD_DAILY_CAP)) * 100),
  );
  const fuPct = Math.min(100, Math.round((fuSent / Math.max(1, NFC_LEADS_FU_DAILY_CAP)) * 100));
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
  const webhookReady = true;
  const monthEst = NFC_LEADS_DAILY_HARD_CAP * 30;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <DashboardNav />
      <header className="mt-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Captación clientes
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#6f675c]">
          Meta <strong className="text-[#1c1915]">≥ {NFC_SALES_DAILY_GOAL} ventas /negocio</strong> ·
          tope Resend NFCTap <strong className="text-[#1c1915]">{NFC_LEADS_DAILY_HARD_CAP}/día</strong>{" "}
          (~{NFC_LEADS_COLD_DAILY_CAP} cold + ~{NFC_LEADS_FU_DAILY_CAP} follow-up) · ~{monthEst.toLocaleString("es-ES")}/mes.
          Harvest → extract → oleadas 08:00–17:00 · FU por intención · Telegram 12/16/21.
        </p>
      </header>

      {/* Meta ventas + mix del día */}
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <BigCard
          title="Ventas /negocio hoy"
          value={sales.count}
          denom={NFC_SALES_DAILY_GOAL}
          pct={salesPct}
          ok={sales.stop}
          okLabel={sales.stop ? "Meta OK — STOP" : "En curso"}
          hint={
            sales.stop
              ? "Meta alcanzada: no más envíos hoy."
              : `Objetivo del sistema: cold + FU hasta ${NFC_SALES_DAILY_GOAL} pedidos unica.`
          }
          warn={!sales.stop}
        />
        <BigCard
          title="Cold nuevos hoy"
          value={coldSent}
          denom={NFC_LEADS_COLD_DAILY_CAP}
          pct={coldPct}
          ok={coldSent > 0}
          okLabel={`${Math.max(0, NFC_LEADS_COLD_DAILY_CAP - coldSent)} quedan`}
          hint={`Primer toque a negocios nuevos · ~${NFC_LEADS_WAVE_MAX}/hora mezclado con FU`}
        />
        <BigCard
          title="Follow-up hoy"
          value={fuSent}
          denom={NFC_LEADS_FU_DAILY_CAP}
          pct={fuPct}
          ok={fuSent > 0 || seq.dueTotal > 0}
          okLabel={seq.dueTotal > 0 ? `${seq.dueTotal} due ahora` : "Sin due"}
          hint={`Prioridad A click ${seq.dueClick} · B open ${seq.dueOpen} · C silencio ${seq.dueSilent}`}
        />
      </section>

      {/* Pipeline intención */}
      <section className="mt-4 rounded-[24px] border border-[#e6ddd0] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Pipeline follow-up</h2>
            <p className="mt-0.5 text-xs text-[#8a8173]">
              Quién espera 2º/3º toque · due = listos en la próxima oleada
            </p>
          </div>
          <p className="text-sm tabular-nums text-[#5c564c]">
            Hoy total mails{" "}
            <strong className="text-[#1c1915]">
              {stats.sent}/{NFC_LEADS_DAILY_HARD_CAP}
            </strong>{" "}
            · {stats.waves}/{NFC_LEADS_WAVES_PER_DAY} ticks
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <TierCard
            tier="A · Click"
            due={seq.dueClick}
            scheduled={seq.scheduledClick}
            tone="sky"
            note="+2 días tras click · hasta 2 FU"
          />
          <TierCard
            tier="B · Abierto"
            due={seq.dueOpen}
            scheduled={seq.scheduledOpen}
            tone="amber"
            note="+3 días tras cold · 1 FU"
          />
          <TierCard
            tier="C · Silencio"
            due={seq.dueSilent}
            scheduled={seq.scheduledSilent}
            tone="slate"
            note="+8 días · baja prioridad · 1 FU"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#7a7266]">
          <span>
            Histórico opens <strong className="text-[#1c1915]">{queue.opened}</strong> ({openRate}%)
          </span>
          <span>
            Clicks <strong className="text-[#1c1915]">{queue.clicked}</strong> ({clickRate}%)
          </span>
          <span>
            Ya recibieron FU{" "}
            <strong className="text-[#1c1915]">{seq.fuSentEver}</strong>
          </span>
          <span>
            Compra{" "}
            <strong className="text-[#1c1915]">{seq.stoppedSale}</strong>
          </span>
          <span>
            Baja{" "}
            <strong className="text-[#1c1915]">{seq.stoppedOptout ?? 0}</strong>
          </span>
          <span>
            Agotados <strong className="text-[#1c1915]">{seq.exhausted}</strong>
          </span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#efe8dc]">
          <div
            className="h-full rounded-full bg-[#1c1915] transition-all"
            style={{ width: `${sendPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[#8a8173]">
          Barra = progreso del tope diario {NFC_LEADS_DAILY_HARD_CAP} (cold+FU juntos)
        </p>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigCard
          title="Webs pendientes (fase A)"
          value={stock.pending}
          denom={1500}
          pct={Math.min(100, Math.round((stock.pending / 1500) * 100))}
          ok={stock.pending >= 100}
          okLabel={stock.pending >= 100 ? "Stock OK" : "Hay que cosechar"}
          hint={`Total webs ${stock.total} · con email ${stock.done} · sin mail ${stock.noEmail}`}
        />
        <BigCard
          title="Cola cold (fase B)"
          value={queue.queued}
          denom={queueTarget}
          pct={queuePct}
          ok={queue.queued >= 200}
          okLabel={queue.queued >= 200 ? "OK para oleadas" : "Por debajo"}
          hint={`Nuevos por enviar · descubiertos hoy ${today.discoveredToday} · hist. enviados ${queue.sent}`}
        />
        <MetricTall
          label="Abiertos hoy"
          value={today.openedToday}
          sub={`${today.sentToday} enviados hoy · open ${today.openRatePct}%`}
        />
        <MetricTall
          label="Clicks hoy"
          value={today.clickedToday}
          sub={`Bounce hoy ${today.bouncedToday} · FU enviados hoy (toque) ${today.fuToday}`}
        />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="En cola cold" value={queue.queued} sub={`≥${queueTarget}`} accent />
        <Metric label="FU due" value={seq.dueTotal} sub={`A${seq.dueClick} B${seq.dueOpen} C${seq.dueSilent}`} />
        <Metric label="Enviados total" value={queue.sent} />
        <Metric label="Fallidos/bounce" value={queue.failed + queue.bounced} />
        <Metric label="Abiertos" value={queue.opened} sub={`${openRate}%`} />
        <Metric label="Clicks" value={queue.clicked} sub={`${clickRate}%`} />
      </section>

      <section className="mt-8 overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-white shadow-sm">
        <div className="border-b border-[#efe8dc] px-5 py-4">
          <h2 className="text-lg font-semibold">Mails enviados</h2>
          <p className="mt-0.5 text-xs text-[#8a8173]">
            Últimos {sentRows.length} · toque cold/FU · open/click webhook ·{" "}
            {stats.lastWaveAt
              ? `última oleada ${new Date(stats.lastWaveAt).toLocaleString("es-ES")}`
              : "aún sin oleada"}
            {stats.lastPlace ? ` · ${stats.lastPlace}` : ""}
          </p>
        </div>
        {sentRows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#8a8173]">
            Aún no hay enviados en la cola. Cuando el cron envíe, aparecen aquí.
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#faf7f1] text-xs uppercase tracking-wide text-[#8a8173]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5 font-semibold">Toque</th>
                  <th className="px-4 py-2.5 font-semibold">Negocio</th>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Ciudad</th>
                  <th className="px-4 py-2.5 font-semibold">Enviado</th>
                  <th className="px-4 py-2.5 font-semibold">Próx. FU</th>
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
            <Li ok={webhookReady}>Webhook Resend · /api/webhook/resend</Li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-[#8a8173]">
            Resend NFCTap: tope operativo <strong>{NFC_LEADS_DAILY_HARD_CAP}/día</strong> (~
            {monthEst.toLocaleString("es-ES")}/mes). Plan Pro 50 000/mes deja margen si Delfín usa
            otra cuenta o cuota aparte. Doc: <code>OUTREACH_FOLLOWUP.md</code>.
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
          dueFu={seq.dueTotal}
          coldSent={coldSent}
          fuSent={fuSent}
          coldCap={NFC_LEADS_COLD_DAILY_CAP}
          fuCap={NFC_LEADS_FU_DAILY_CAP}
        />
      </div>
    </div>
  );
}

function LeadRow({ lead }: { lead: BusinessLead }) {
  const badge = statusBadge(lead);
  const touch = touchBadge(lead.lastTouchKind, lead.touchCount);
  return (
    <tr className="border-t border-[#efe8dc] hover:bg-[#faf7f1]/">
      <td className="px-4 py-2.5">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${badge.className}`}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${touch.className}`}
        >
          {touch.label}
        </span>
      </td>
      <td className="max-w-[9rem] truncate px-4 py-2.5 font-medium text-[#1c1915]">
        {lead.businessName || "—"}
      </td>
      <td className="max-w-[12rem] truncate px-4 py-2.5 text-[#5c564c]">{lead.email}</td>
      <td className="px-4 py-2.5 text-[#5c564c]">{lead.city || "—"}</td>
      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[#5c564c]">
        {fmt(lead.sentAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[#5c564c]">
        {lead.nextTouchKind && lead.nextTouchKind !== "cold" && lead.nextTouchAt
          ? `${shortTouch(lead.nextTouchKind)} ${fmt(lead.nextTouchAt)}`
          : "—"}
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

function shortTouch(t: TouchKind) {
  if (t === "fu_click") return "A";
  if (t === "fu_open") return "B";
  if (t === "fu_silent") return "C";
  return "";
}

function touchBadge(
  kind?: TouchKind,
  touchCount?: number,
): { label: string; className: string } {
  const n = touchCount && touchCount > 1 ? ` ·${touchCount}` : "";
  if (kind === "fu_click") {
    return { label: `FU click${n}`, className: "bg-sky-50 text-sky-900 ring-sky-200" };
  }
  if (kind === "fu_open") {
    return { label: `FU open${n}`, className: "bg-amber-50 text-amber-900 ring-amber-200" };
  }
  if (kind === "fu_silent") {
    return { label: `FU sil.${n}`, className: "bg-slate-100 text-slate-700 ring-slate-200" };
  }
  return { label: `Cold${n}`, className: "bg-emerald-50 text-emerald-900 ring-emerald-200" };
}

function statusBadge(lead: BusinessLead): { label: string; className: string } {
  if (lead.sequenceStatus === "stopped_sale") {
    return { label: "Compra", className: "bg-emerald-100 text-emerald-900 ring-emerald-300" };
  }
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

function TierCard({
  tier,
  due,
  scheduled,
  tone,
  note,
}: {
  tier: string;
  due: number;
  scheduled: number;
  tone: "sky" | "amber" | "slate";
  note: string;
}) {
  const bg =
    tone === "sky"
      ? "border-sky-200 bg-sky-50/50"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/50"
        : "border-slate-200 bg-slate-50";
  return (
    <div className={`rounded-[18px] border p-4 ${bg}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6f675c]">
        {tier}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {due}
        <span className="text-sm font-medium text-[#a89f90]"> due</span>
      </p>
      <p className="text-xs text-[#7a7266]">{scheduled} programados</p>
      <p className="mt-2 text-[11px] leading-4 text-[#8a8173]">{note}</p>
    </div>
  );
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

function MetricTall({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-[24px] border border-[#e6ddd0] bg-white p-5">
      <p className="text-sm font-semibold text-[#3d3830]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#7a7266]">{sub}</p>
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
