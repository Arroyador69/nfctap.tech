import { ListaApp } from "@/components/ListaApp";
import { listaIdOk } from "@/lib/lista";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activar?: string }>;
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
  const { activar } = await searchParams;
  if (!listaIdOk(id)) notFound();
  return <ListaApp listId={id} activateSecret={activar?.trim() || undefined} />;
}
