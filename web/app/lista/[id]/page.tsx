import { ListaApp, ListaLocked } from "@/components/ListaApp";
import {
  assertListaHome,
  clientIpFromHeaders,
  getLista,
  listaIdOk,
  registerListaHome,
} from "@/lib/lista";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activar?: string; ok?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Lista de la compra",
    description: "Lista privada de la nevera. Solo en la Wi‑Fi de casa.",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ListaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!listaIdOk(id)) notFound();

  const ip = clientIpFromHeaders(await headers());
  let activateError: string | undefined;
  let justActivated = sp.ok === "1";

  // Activar desde ?activar=… y abrir la lista YA (sin redirect, que perdía la cookie).
  if (sp.activar?.trim()) {
    const result = await registerListaHome(id, ip, sp.activar.trim());
    if (result.ok) {
      return (
        <ListaApp listId={id} initial={await getLista(id)} justActivated />
      );
    }
    activateError = result.error;
  }

  const access = await assertListaHome(id, ip);
  if (!access.ok) {
    return (
      <ListaLocked listId={id} reason={access.reason} activateError={activateError} />
    );
  }

  return <ListaApp listId={id} initial={await getLista(id)} justActivated={justActivated} />;
}
