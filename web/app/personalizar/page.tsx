import { Designer } from "@/components/Designer";
import { MetaViewContent } from "@/components/MetaPixel";
import { parseKind, parseModels, PRICE } from "@/lib/catalog";
import { getShipping } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Encarga tu NFCTap" };

export default async function PersonalizarPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; model?: string; models?: string }>;
}) {
  const q = await searchParams;
  const initial = parseKind(q.kind);
  const models = parseModels(q.models || q.model);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-3 sm:py-10">
      <MetaViewContent contentName="NFCTap" value={PRICE.generica.first} />
      <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-tight sm:text-5xl">
        Encarga tu NFCTap
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[#5c564c] sm:text-base">
        WhatsApp, Instagram o Google, con logo, o TAP Wi‑Fi de pared. Lo añades al carrito
        y pagas todo junto. La primera de barra 20 €, cada una más 15 €. Con logo 30 €.
        Wi‑Fi 15 €, adhesivo incluido.
      </p>
      <div className="mt-5">
        <Designer initialKind={initial} initialModels={models} shipping={await getShipping()} />
      </div>
    </div>
  );
}
