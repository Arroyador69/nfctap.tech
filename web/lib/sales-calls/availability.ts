import { fetchPeerBusy } from "./peer-sync";
import { listOpenSlots, type BusyIntervalMs, type CallSlot } from "./slots";
import { loadSalesCalls, type SalesCallsFile } from "./store";

async function peerBusyMs(fromIso: string, toIso: string): Promise<BusyIntervalMs[]> {
  const peer = await fetchPeerBusy(fromIso, toIso);
  const out: BusyIntervalMs[] = [];
  for (const b of peer) {
    const s = new Date(b.startAt).getTime();
    const e = new Date(b.endAt).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
      out.push({ startMs: s, endMs: e });
    } else if (Number.isFinite(s)) {
      out.push({ startMs: s, endMs: s + 15 * 60_000 });
    }
  }
  return out;
}

/** Disponibilidad pública: Blob local + ocupados del peer Delfín. */
export async function listOpenSlotsWithPeer(opts?: {
  weekdays?: number;
  file?: SalesCallsFile;
}): Promise<CallSlot[]> {
  const file = opts?.file || (await loadSalesCalls());
  const weekdays = opts?.weekdays ?? 14;
  // Rango amplio para pedir busy al peer (≈ 3 semanas)
  const from = new Date();
  const to = new Date(Date.now() + 25 * 24 * 60 * 60_000);
  const peerBusy = await peerBusyMs(from.toISOString(), to.toISOString());
  return listOpenSlots(file, { weekdays, peerBusy });
}
