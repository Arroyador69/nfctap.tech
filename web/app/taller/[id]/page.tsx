import { TallerApp, TallerLocked } from "@/components/TallerApp";
import {
  assertTallerHome,
  clientIpFromHeaders,
  getTaller,
  tallerIdOk,
  tallerPublicView,
} from "@/lib/taller";
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
    title: "Material taller",
    description: "Lista privada de material NFCTap. Solo en la Wi‑Fi de casa.",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function TallerPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!tallerIdOk(id)) notFound();

  if (sp.activar?.trim()) {
    redirect(
      `/api/taller/${id}/activar?secret=${encodeURIComponent(sp.activar.trim())}`,
    );
  }

  const ip = clientIpFromHeaders(await headers());
  const access = await assertTallerHome(id, ip);
  if (!access.ok) {
    return (
      <TallerLocked
        listId={id}
        reason={access.reason}
        activateError={sp.err || undefined}
      />
    );
  }

  return (
    <TallerApp
      listId={id}
      initial={tallerPublicView(await getTaller(id))}
      justActivated={sp.ok === "1"}
    />
  );
}
