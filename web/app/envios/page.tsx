import { ZONE_LABEL } from "@/lib/shipping";
import { getShipping } from "@/lib/store";
import { euros } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const metadata = { title: "Envíos" };

export default async function EnviosPage() {
  const s = await getShipping();
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Envíos a España</h1>
      <p className="mt-4 text-[#5c564c]">
        Enviamos con Correos en sobre o paquete pequeño. Las tarifas de abajo son las que
        cobra la web ahora mismo. El código postal decide la zona.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        <li className="flex justify-between rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
          <span>{ZONE_LABEL.peninsula}</span>
          <span>{euros(s.peninsula)}</span>
        </li>
        <li className="flex justify-between rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
          <span>{ZONE_LABEL.baleares}</span>
          <span>{euros(s.baleares)}</span>
        </li>
        <li className="flex justify-between rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
          <span>{ZONE_LABEL.canarias}</span>
          <span>{euros(s.canarias)}</span>
        </li>
        <li className="flex justify-between rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
          <span>{ZONE_LABEL.ceuta_melilla}</span>
          <span>{euros(s.ceuta_melilla)}</span>
        </li>
      </ul>
      <p className="mt-6 text-sm text-[#7a7266]">
        En península, envío gratis a partir de {euros(s.freePeninsulaFrom)} (dos
        personalizadas o la pieza única).
      </p>
    </div>
  );
}
