import { CardPreview } from "@/components/CardPreview";
import { Designer } from "@/components/Designer";
import { defaultDesign, PRICE } from "@/lib/catalog";
import type { Guide } from "@/lib/guides";
import { euros } from "@/lib/shipping";
import type { ShippingSettings } from "@/lib/types";

export function GuideBuy({ guide, shipping }: { guide: Guide; shipping: ShippingSettings }) {
  const wifi = guide.product.kind === "wifi";
  const first = wifi ? PRICE.wifi.first : PRICE.generica.first;
  const extra = wifi ? PRICE.wifi.extra : PRICE.generica.extra;
  const design = defaultDesign(guide.product.kind, guide.product.preview);

  return (
    <section className="border-t border-[#e6ddd0] pt-12">
      <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">Producto</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
        {wifi ? "TAP Wi‑Fi de pared" : "Este atril NFCTap"}
      </h2>
      <p className="mt-3 text-[15px] leading-7 text-[#5c564c]">
        {wifi
          ? `Lo mismo que ves en el vídeo: placa de pared, ${euros(first)}, adhesivo incluido. Colores de PLA y red al encargar.`
          : `Lo mismo que ves en el vídeo. Primera ${euros(first)}, cada una más ${euros(extra)}. Lo ves en 3D y lo pagas aquí.`}
      </p>
      <div className="mx-auto mt-6 max-w-md">
        <CardPreview design={design} compact />
      </div>
      <div className="mt-8">
        <Designer
          initialKind={guide.product.kind}
          initialModels={guide.product.models}
          shipping={shipping}
        />
      </div>
    </section>
  );
}
