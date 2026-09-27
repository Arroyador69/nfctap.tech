import { ListaApp, ListaLocked } from "@/components/ListaApp";
import {
  assertListaHome,
  clientIpFromHeaders,
  getLista,
  listaIdOk,
  listaPublicView,
} from "@/lib/lista";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activar?: string; ok?: string; err?: string }>;
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

  // La cookie solo se puede escribir en un Route Handler, no en este render.
  if (sp.activar?.trim()) {
    redirect(
      `/api/lista/${id}/activar?secret=${encodeURIComponent(sp.activar.trim())}`,
    );
  }

  const ip = clientIpFromHeaders(await headers());
  const access = await assertListaHome(id, ip);
  if (!access.ok) {
    return (
      <ListaLocked
        listId={id}
        reason={access.reason}
        activateError={sp.err || undefined}
      />
    );
  }

  return (
    <ListaApp
      listId={id}
      initial={listaPublicView(await getLista(id))}
      justActivated={sp.ok === "1"}
    />
  );
}
