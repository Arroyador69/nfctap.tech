import { ListaApp } from "@/components/ListaApp";
import { listaIdOk } from "@/lib/lista";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Lista de la compra",
    description: "Lista compartida de la nevera. TAP para añadir lo que falte.",
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title: "Lista de la compra", url: `https://nfctap.tech/lista/${id}` },
  };
}

export default async function ListaPage({ params }: Props) {
  const { id } = await params;
  if (!listaIdOk(id)) notFound();
  return <ListaApp listId={id} />;
}
