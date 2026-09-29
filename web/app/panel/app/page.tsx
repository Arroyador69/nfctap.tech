import { ClientHome } from "@/components/panel/ClientHome";
import {
  CONTRACT_VERSION,
  getClient,
  getPanelSession,
  publicClient,
} from "@/lib/panel";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu panel",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PanelAppPage() {
  const session = await getPanelSession();
  if (!session) redirect("/panel");
  if (session.role === "admin") redirect("/panel/admin");

  const client = await getClient(session.clientId);
  if (!client || !client.active) redirect("/panel");
  if (!(client.contractAcceptedAt && client.contractVersion === CONTRACT_VERSION)) {
    redirect("/panel/contrato");
  }

  return <ClientHome initial={publicClient(client)} role="client" />;
}
