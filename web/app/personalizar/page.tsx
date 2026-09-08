import { Designer } from "@/components/Designer";
import { getShipping } from "@/lib/store";
import { parseKind } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Encarga tu NFCTap" };

export default async function PersonalizarPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const initial = parseKind(kind);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-3 sm:py-10">
      <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-tight sm:text-5xl">
        Encarga tu NFCTap
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[#5c564c] sm:text-base">
        Gíralo en 3D. Es lo que se imprime. Luego pones a dónde lo enviamos. Sale en 24 h.
      </p>
      <div className="mt-5">
        <Designer initialKind={initial} shipping={await getShipping()} />
      </div>
    </div>
  );
}
