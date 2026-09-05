import { Designer } from "@/components/Designer";
import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import { getShipping } from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo pedido" };

export default async function NuevoPedidoPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-6">
      <DashboardNav />
      <p className="text-xs uppercase tracking-[0.18em] text-[#b0892c]">Admin</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        Editor para un cliente
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[#5c564c]">
        El mismo editor de la web. Lo montas delante suya, lo guardas y bajas el ZIP para Orca.
      </p>
      <div className="mt-6">
        <Designer mode="admin" shipping={await getShipping()} />
      </div>
    </div>
  );
}
