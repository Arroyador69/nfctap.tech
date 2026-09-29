import { AdminClientDetail } from "@/components/panel/AdminClientDetail";
import { getClient, getPanelSession, publicClient } from "@/lib/panel";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cliente",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ id: string }> };

export default async function PanelAdminClientPage({ params }: Props) {
  const session = await getPanelSession();
  if (!session) redirect("/panel");
  if (session.role !== "admin") redirect("/panel/app");

  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return <AdminClientDetail initial={publicClient(client)} />;
}
