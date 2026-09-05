import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import { productLabel } from "@/lib/catalog";
import { euros, ZONE_LABEL } from "@/lib/shipping";
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Pedidos" value={String(orders.length)} />
        <Stat label="En cola" value={String(pending.length)} />
        <Stat label="Cobrado" value={euros(revenue)} />
      </div>

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
                <td className="px-4 py-3">{productLabel(o.kind, o.qty)}</td>
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
