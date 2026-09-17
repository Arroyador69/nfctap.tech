import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import { getVisitReport } from "@/lib/visits";
import { redirect } from "next/navigation";
import { GscForm } from "./gsc-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visitas" };

function fmtDay(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export default async function VisitasPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");
  const report = await getVisitReport();
  const maxViews = Math.max(1, ...report.series.map((d) => d.views));

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <DashboardNav />
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Visitas</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#5c564c]">
        Tráfico de nfctap.tech (día en Madrid). Facebook, Instagram y el anuncio salen por
        el enlace o por utm. Search Console es para búsquedas de Google; el enlace está
        abajo.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Hoy" value={String(report.todayStats.views)} hint={`${report.todayStats.uniques} personas`} />
        <Stat label="7 días" value={String(report.week.views)} hint={`${report.week.uniques} personas`} />
        <Stat label="30 días" value={String(report.month.views)} hint={`${report.month.uniques} personas`} />
        <Stat
          label="Origen (7 d)"
          value={report.week.sources[0]?.label || "—"}
          hint={report.week.sources[0] ? `${report.week.sources[0].count} visitas` : "Aún no hay datos"}
        />
      </div>

      <section className="mt-10 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">Últimos 30 días</h2>
        <div className="mt-4 flex h-36 items-end gap-1">
          {report.series.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${fmtDay(d.date)}: ${d.views}`}>
              <div
                className="w-full rounded-t bg-[#1c1915]"
                style={{ height: `${Math.max(d.views ? 8 : 2, (d.views / maxViews) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[#7a7266]">
              <tr>
                <th className="py-2 pr-3">Día</th>
                <th className="py-2 pr-3">Visitas</th>
                <th className="py-2">Personas</th>
              </tr>
            </thead>
            <tbody>
              {[...report.series].reverse().map((d) => (
                <tr key={d.date} className="border-t border-[#eee6da]">
                  <td className="py-2 pr-3">{fmtDay(d.date)}</td>
                  <td className="py-2 pr-3">{d.views}</td>
                  <td className="py-2">{d.uniques}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Rank title="De dónde (7 días)" rows={report.week.sources} empty="Cuando alguien entre, aquí sale Facebook, Instagram, Google o Directo." />
        <Rank title="Páginas (7 días)" rows={report.week.paths} empty="Home, Encargar, envíos…" />
        <Rank title="Campañas UTM (7 días)" rows={report.week.campaigns} empty="El anuncio manda utm_campaign. Hasta que haya clics, vacío." />
      </div>

      {report.week.devices.length > 0 && (
        <p className="mt-6 text-sm text-[#6f675c]">
          Dispositivo (7 d): {report.week.devices.map((d) => `${d.label} ${d.count}`).join(" · ")}
        </p>
      )}

      <section className="mt-12 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">Google Search Console</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#5c564c]">
          Ahí ves búsquedas, impresiones y qué páginas indexa Google. No sustituye esta
          pantalla: Search Console no cuenta el anuncio de Meta ni Instagram.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#5c564c]">
          <li>
            Abre{" "}
            <a
              className="underline decoration-[#d9cfc0] underline-offset-2"
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noreferrer"
            >
              Search Console
            </a>{" "}
            con la cuenta de Google de NFCTap.
          </li>
          <li>
            Añade propiedad <strong>Prefijo de URL</strong>: <code>https://nfctap.tech</code>
          </li>
          <li>
            Elige <strong>Etiqueta HTML</strong>. Copia solo el código largo de{" "}
            <code>content=&quot;…&quot;</code> (no toda la etiqueta) y pégalo aquí.
          </li>
          <li>Guarda. Vuelve a Google y pulsa Verificar.</li>
          <li>
            Sitemaps → añadir <code>https://nfctap.tech/sitemap.xml</code>
          </li>
        </ol>
        <GscForm current={report.googleVerification} />
        <p className="mt-4 text-xs text-[#8a8173]">
          {report.googleVerification
            ? "Hay un código guardado. Si Verificar falla, espera 1–2 min a que Vercel sirva la web y reintenta."
            : "Hasta que no pegues el código, Google no puede verificar la web."}{" "}
          <a
            className="underline decoration-[#d9cfc0] underline-offset-2"
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noreferrer"
          >
            Abrir Search Console
          </a>
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-[#e6ddd0] bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-[#8a8173]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[#8a8173]">{hint}</p>
    </div>
  );
}

function Rank({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { label: string; count: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-3xl border border-[#e6ddd0] bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[#8a8173]">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between text-sm">
                <span className="truncate pr-3">{r.label}</span>
                <span className="text-[#7a7266]">{r.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f3eee4]">
                <div className="h-full bg-[#c4a35a]" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
