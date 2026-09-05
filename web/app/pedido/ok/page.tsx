import { getOrder } from "@/lib/store";
import { euros } from "@/lib/shipping";
import Link from "next/link";

export const metadata = { title: "Pedido recibido" };

export default async function OkPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; demo?: string }>;
}) {
  const { id } = await searchParams;
  const order = id ? await getOrder(id) : null;

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">NFCTab</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl">Pedido recibido</h1>
      <p className="mt-3 text-[#5c564c]">
        {order
          ? `Referencia ${order.id}. Total ${euros(order.total)}. Te escribimos a ${order.address.email} cuando salga de imprenta.`
          : "Gracias. Si el pago con Polar aún no está activo, el pedido ya está en el dashboard para producirlo."}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-[#1c1915] px-6 py-3 font-medium text-[#f6f1e7]"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
