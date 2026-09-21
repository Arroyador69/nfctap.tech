import { CartCheckout } from "@/components/CartCheckout";
import { MetaViewContent } from "@/components/MetaPixel";
import { PRICE } from "@/lib/catalog";
import { pageMeta } from "@/lib/seo";
import { getShipping } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({
  title: "Carrito",
  description: "Tu pedido NFCTap. Atriles, logo y TAP Wi‑Fi juntos.",
  path: "/carrito",
  index: false,
});

export default async function CarritoPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-3 sm:py-10">
      <MetaViewContent contentName="Carrito" value={PRICE.generica.first} />
      <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-tight sm:text-5xl">
        Carrito
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[#5c564c] sm:text-base">
        Lo que añadas se queda aquí. Pagas atriles, logo y TAP Wi‑Fi juntos. Envío Correos
        según el código postal.
      </p>
      <div className="mt-8">
        <CartCheckout shipping={await getShipping()} />
      </div>
    </div>
  );
}
