import { Designer } from "@/components/Designer";
import { getShipping } from "@/lib/store";
import type { ProductKind } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crea tu tarjeta" };

export default async function PersonalizarPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const initial: ProductKind = kind === "generica" ? "generica" : "personalizada";

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-3 sm:py-10">
      <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-tight sm:text-5xl">
        Crea tu propia tarjeta
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[#5c564c] sm:text-base">
        En el móvil, delante del cliente. Un modelo estándar. Se encarga: no se descarga.
      </p>
      <div className="mt-5">
        <Designer initialKind={initial} shipping={await getShipping()} />
      </div>
    </div>
  );
}
