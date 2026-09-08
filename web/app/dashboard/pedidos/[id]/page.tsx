export const dynamic = "force-dynamic";

import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import { productLabel } from "@/lib/catalog";
import { ATRIL } from "@/lib/atril-geom";
import { orderToSpec } from "@/lib/print-spec";
import { euros, ZONE_LABEL } from "@/lib/shipping";
import { getOrder } from "@/lib/store";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderActions } from "./actions";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/dashboard/login");
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const spec = orderToSpec(order);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <DashboardNav />
      <Link href="/dashboard" className="text-sm text-[#7a7266] hover:text-[#1c1915]">
        ← Pedidos
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{order.id}</h1>
      <p className="text-[#6f675c]">
        {productLabel(order.kind, order.qty)} · {euros(order.total)} ·{" "}
        {order.handover === "mano" ? "En mano" : ZONE_LABEL[order.address.zone]} ·{" "}
        {order.source === "admin" ? "Admin" : "Web"}
      </p>

      <a
        href={`/api/orders/${order.id}/print`}
        className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#1c1915] px-5 font-semibold text-[#f6f1e7]"
      >
        Descargar ZIP para Flash
      </a>
      <p className="mt-2 text-sm text-[#6f675c]">
        Mismo atril que la web: 01_cuerpo + 02_acento, hueco NFC abierto Ø{ATRIL.WELL_D} (sin
        pausa) y URL del chip. Lo que se ve es lo que se imprime.
      </p>

      {order.previewDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={order.previewDataUrl}
          alt="Diseño a imprimir"
          className="mt-6 w-full max-w-sm rounded-2xl border border-[#e6ddd0]"
        />
      )}

      <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
        <Item k="Cliente" v={order.address.name} />
        <Item k="Email" v={order.address.email} />
        <Item k="Teléfono" v={order.address.phone || "—"} />
        <Item
          k="Dirección"
          v={
            order.handover === "mano"
              ? "Entrega en mano"
              : `${order.address.line1}, ${order.address.postalCode} ${order.address.city} (${order.address.province})`
          }
        />
        <Item k="Cara" v={`${order.kind === "generica" ? "G de Google" : order.design.line1 || "Logo"} · TAP / RESEÑA`} />
        <Item k="Google / NFC" v={order.design.googleUrl || "Pendiente"} />
        <Item k="Cuerpo" v={spec.colores.cuerpo} />
        <Item k="Acento" v={spec.colores.acento} />
        <Item k="Envío" v={euros(order.shippingPrice)} />
        <Item k="Estado" v={order.status} />
      </dl>

      <OrderActions id={order.id} status={order.status} tracking={order.tracking || ""} />
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-[#8a8173]">{k}</dt>
      <dd className="mt-1 break-all">{v}</dd>
    </div>
  );
}
