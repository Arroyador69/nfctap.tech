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
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">Editor NFCTab</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
        Crea tu propia tarjeta
        <br />
        para que te dejen reviews.
      </h1>
      <p className="mt-3 max-w-2xl text-[#5c564c]">
        Atril vertical, como las de la competencia, pero tú lo montas aquí. Logo en blanco y
        negro, texto, colores de las bobinas, y el modelo 3D que vamos a imprimir.
      </p>
      <div className="mt-8">
        <Designer initialKind={initial} shipping={getShipping()} />
      </div>
    </div>
  );
}
