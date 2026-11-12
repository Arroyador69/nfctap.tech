import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import { orderGoodsLabel, orderPieces } from "@/lib/catalog";
import { formatWhenMadrid } from "@/lib/sales-calls/mail";
import { loadSalesCalls } from "@/lib/sales-calls/store";
import { euros, ZONE_LABEL } from "@/lib/shipping";
import { stripeMissing, stripeReady } from "@/lib/stripe";
import { blobConfigured, getShipping, listOrders } from "@/lib/store";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShippingForm } from "./shipping-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");
  const orders = await listOrders();
  const shipping = await getShipping();
  const callsFile = await loadSalesCalls();
  const now = Date.now();
  const callsUpcoming = callsFile.bookings
    .filter((b) => b.status === "booked" && new Date(b.startsAt).getTime() >= now - 15 * 60_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const callsToday = callsUpcoming.filter((b) => b.slotKey.startsWith(todayKey)).length;
  const paid = orders.filter((o) => o.status !== "cancelado" && o.status !== "pendiente_pago");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "pagado" || o.status === "en_impresion");

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <DashboardNav />
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Cola de impresión</h1>
        <p className="text-sm text-[#6f675c]">
          Web o en persona. Entra, baja el ZIP, ábrelo en Orca-Flashforge.
        </p>
      </div>

      {!blobConfigured() && process.env.VERCEL && (
        <p className="mt-4 rounded-2xl bg-[#fff4d6] px-4 py-3 text-sm">
          En Vercel los pedidos se pierden al redeploy si no hay Blob. Crea un Blob Store y pon
          BLOB_READ_WRITE_TOKEN.
        </p>
      )}

      {!stripeReady() && (
        <p className="mt-4 rounded-2xl bg-[#fff4d6] px-4 py-3 text-sm">
          Stripe no está listo. Falta: {stripeMissing().join(", ") || "STRIPE_SECRET_KEY"}. Guía:{" "}
          <code>web/STRIPE_INTEGRATION_TODO.md</code>.
        </p>
      )}

      {stripeReady() && !process.env.STRIPE_WEBHOOK_SECRET && (
        <p className="mt-4 rounded-2xl bg-[#fff4d6] px-4 py-3 text-sm">
          Stripe puede cobrar, pero falta STRIPE_WEBHOOK_SECRET: el pedido no pasará a pagado
          solo. Endpoint: https://nfctap.tech/api/webhook/stripe
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Pedidos" value={String(orders.length)} />
        <Stat label="En cola" value={String(pending.length)} />
        <Stat label="Cobrado" value={euros(revenue)} />
        <Stat label="Llamadas hoy" value={String(callsToday)} />
        <Stat label="Llamadas próximas" value={String(callsUpcoming.length)} />
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">Próximas llamadas</h2>
            <p className="text-sm text-[#6f675c]">Quien reservó fecha desde el mail o /llamar.</p>
          </div>
          <Link href="/dashboard/llamadas" className="text-sm text-[#9a7420] underline">
            Ver todas
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-3xl border border-[#e6ddd0] bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#faf6ee] text-[#7a7266]">
              <tr>
                <th className="px-4 py-3">Cuándo</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email / teléfono</th>
                <th className="px-4 py-3">Notas</th>
              </tr>
            </thead>
            <tbody>
              {callsUpcoming.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#8a8173]">
                    Aún no hay llamadas reservadas.
                  </td>
                </tr>
              )}
              {callsUpcoming.slice(0, 8).map((b) => (
                <tr key={b.id} className="border-t border-[#eee6da]">
                  <td className="px-4 py-3 capitalize">{formatWhenMadrid(b.startsAt)}</td>
                  <td className="px-4 py-3">
                    <div>{b.name}</div>
                    {b.company && <div className="text-xs text-[#8a8173]">{b.company}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div>{b.email}</div>
                    {b.phone && <div className="text-xs text-[#8a8173]">{b.phone}</div>}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-[#6f675c]">
                    {b.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 overflow-x-auto rounded-3xl border border-[#e6ddd0] bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-[#faf6ee] text-[#7a7266]">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Imprimir</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#8a8173]">
                  Aún no hay pedidos. Crea uno en Nuevo pedido o llega desde la web.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[#eee6da]">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/pedidos/${o.id}`} className="text-[#9a7420]">
                    {o.id.slice(0, 14)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div>{o.address.name}</div>
                  <div className="text-xs text-[#8a8173]">
                    {o.handover === "mano" ? "En mano" : ZONE_LABEL[o.address.zone]}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>{orderGoodsLabel(o.kind, o.qty, orderPieces(o), o.wifiAddon?.qty || 0, o.lines)}</div>
                  {orderPieces(o).map((p, i) => (
                    <div key={`${p.model}-${i}`} className="max-w-[240px] truncate text-xs text-[#8a8173]">
                      {p.nfcUrl}
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3 capitalize">{o.source === "admin" ? "Admin" : "Web"}</td>
                <td className="px-4 py-3">{euros(o.total)}</td>
                <td className="px-4 py-3 capitalize">{o.status.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <a href={`/api/orders/${o.id}/print`} className="text-[#9a7420] underline">
                    ZIP
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShippingForm shipping={shipping} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#e6ddd0] bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-[#8a8173]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
