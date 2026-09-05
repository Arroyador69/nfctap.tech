export const dynamic = "force-dynamic";

import { isAdmin } from "@/lib/auth";
import { productLabel } from "@/lib/catalog";
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
  const order = getOrder(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/dashboard" className="text-sm text-[#7a7266] hover:text-[#1c1915]">
        ← Pedidos
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{order.id}</h1>
      <p className="text-[#6f675c]">
        {productLabel(order.kind, order.qty)} · {euros(order.total)} ·{" "}
        {ZONE_LABEL[order.address.zone]}
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
          v={`${order.address.line1}, ${order.address.postalCode} ${order.address.city} (${order.address.province})`}
        />
        <Item k="Texto" v={`${order.design.line1} / ${order.design.line2}`} />
        <Item k="Google" v={order.design.googleUrl || "Pendiente de pedir"} />
        <Item k="Cuerpo" v={order.design.bodyColor} />
        <Item k="Acento" v={order.design.accentColor} />
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
