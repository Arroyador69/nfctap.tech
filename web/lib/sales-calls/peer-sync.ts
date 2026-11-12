/**
 * Protocolo peer con Delfín (mismo contrato que delfincheckin peer-sync).
 * Header: X-Sales-Call-Sync: CALLS_SYNC_SECRET | SALES_CALL_SYNC_SECRET
 */

import { callsSyncSecret } from "./secrets";

export type BusyInterval = { startAt: string; endAt: string };

export function authorizePeerSync(req: Request): boolean {
  const secret = callsSyncSecret();
  if (!secret) return false;
  const header = req.headers.get("X-Sales-Call-Sync") || "";
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const q = new URL(req.url).searchParams.get("secret") || "";
  return header === secret || bearer === secret || q === secret;
}

function peerBase() {
  return (
    process.env.SALES_CALL_PEER_URL?.trim() ||
    process.env.CALLS_PEER_URL?.trim() ||
    "https://admin.delfincheckin.com"
  ).replace(/\/+$/, "");
}

/** NFCTap → Delfín: leer ocupados allí. */
export async function fetchPeerBusy(fromIso: string, toIso: string): Promise<BusyInterval[]> {
  const base = peerBase();
  const secret = callsSyncSecret();
  if (!base || !secret) return [];
  try {
    const url = new URL(`${base}/api/public/sales-calls/peer-busy`);
    url.searchParams.set("from", fromIso);
    url.searchParams.set("to", toIso);
    const res = await fetch(url.toString(), {
      headers: { "X-Sales-Call-Sync": secret },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { busy?: BusyInterval[] };
    return Array.isArray(j.busy) ? j.busy : [];
  } catch {
    return [];
  }
}

/** NFCTap reserva → espejo en Delfín. */
export async function mirrorBookingToPeer(opts: {
  startAt: string;
  endAt: string;
  bookingId: string;
  name: string;
  email: string;
}): Promise<{ ok: boolean }> {
  const base = peerBase();
  const secret = callsSyncSecret();
  if (!base || !secret) return { ok: true };
  try {
    const res = await fetch(`${base}/api/public/sales-calls/peer-busy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sales-Call-Sync": secret,
      },
      body: JSON.stringify({
        startAt: opts.startAt,
        endAt: opts.endAt,
        remoteId: opts.bookingId,
        name: opts.name,
        email: opts.email,
        project: "nfctap",
      }),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** NFCTap cancela → liberar espejo en Delfín. */
export async function mirrorCancelToPeer(opts: {
  remoteId: string;
  startAt?: string;
}): Promise<boolean> {
  const base = peerBase();
  const secret = callsSyncSecret();
  if (!base || !secret) return true;
  try {
    const res = await fetch(`${base}/api/public/sales-calls/peer-busy`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Sales-Call-Sync": secret,
      },
      body: JSON.stringify({
        remoteId: opts.remoteId,
        startAt: opts.startAt,
        action: "cancel",
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
