import { AdminClients } from "@/components/panel/AdminClients";
import { getPanelSession, listClients } from "@/lib/panel";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin panel redes",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PanelAdminPage() {
  const session = await getPanelSession();
  if (!session) redirect("/panel");
  if (session.role !== "admin") redirect("/panel/app");

  return <AdminClients initial={await listClients()} />;
}
