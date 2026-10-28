import { put, list } from "@vercel/blob";

export type DayStats = {
  date: string; // YYYY-MM-DD Madrid
  sent: number;
  failed: number;
  waves: number;
  lastWaveAt?: string;
  lastPlace?: string;
};

const PREFIX = "outreach/nfctap-day-";

function madridDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function getDayStats(date = madridDate()): Promise<DayStats> {
  try {
    const { blobs } = await list({ prefix: `${PREFIX}${date}`, limit: 1 });
    if (!blobs[0]) return { date, sent: 0, failed: 0, waves: 0 };
    const res = await fetch(blobs[0].url);
    if (!res.ok) return { date, sent: 0, failed: 0, waves: 0 };
    return (await res.json()) as DayStats;
  } catch {
    return { date, sent: 0, failed: 0, waves: 0 };
  }
}

export async function bumpDayStats(delta: {
  sent?: number;
  failed?: number;
  place?: string;
}): Promise<DayStats> {
  const date = madridDate();
  const cur = await getDayStats(date);
  const next: DayStats = {
    date,
    sent: cur.sent + (delta.sent || 0),
    failed: cur.failed + (delta.failed || 0),
    waves: cur.waves + 1,
    lastWaveAt: new Date().toISOString(),
    lastPlace: delta.place || cur.lastPlace,
  };
  try {
    await put(`${PREFIX}${date}.json`, JSON.stringify(next, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch {
    /* blob opcional en local */
  }
  return next;
}

export { madridDate };
