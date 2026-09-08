import { DashboardNav } from "@/components/DashboardNav";
import { ReviewLookup } from "@/components/ReviewLookup";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reseña Google" };

export default async function ResenasPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <DashboardNav />
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Enlace de reseña Google</h1>
      <p className="mt-2 max-w-xl text-sm text-[#5c564c]">
        Escribe el negocio y el pueblo, o pega el enlace largo de Maps. El que hay que grabar en el
        NFC es el que sale aquí, no la búsqueda de Google.
      </p>
      <div className="mt-8">
        <ReviewLookup />
      </div>
      <p className="mt-8 text-xs text-[#8a8173]">
        Lo mejor es el enlace de Pedir reseñas (g.page o writereview con Place ID). Si pegas un
        share de Maps, sirve para abrir la ficha. En Vercel puedes poner GOOGLE_PLACES_API_KEY para
        buscar por nombre con el listado oficial.
      </p>
    </div>
  );
}
