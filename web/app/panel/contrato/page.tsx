import { ContractAccept } from "@/components/panel/ContractAccept";
import {
  CONTRACT_VERSION,
  contractText,
  getClient,
  getPanelSession,
  REDES_PACKS,
} from "@/lib/panel";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contrato",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PanelContratoPage() {
  const session = await getPanelSession();
  if (!session) redirect("/panel");
  if (session.role === "admin") redirect("/panel/admin");

  const client = await getClient(session.clientId);
  if (!client) redirect("/panel");
  if (client.contractAcceptedAt && client.contractVersion === CONTRACT_VERSION) {
    redirect("/panel/app");
  }

  return (
    <ContractAccept
      clientId={client.id}
      clientName={client.name}
      packLabel={REDES_PACKS[client.pack].label}
      text={contractText(client.name, client.pack)}
    />
  );
}
