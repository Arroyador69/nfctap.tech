import type { DayStats } from "./types-day";

export type { DayStats };

const PREFIX = "nfctap-outreach-day-";

function madridDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function blobOk() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readDay(date: string): Promise<DayStats> {
  const empty: DayStats = { date, sent: 0, failed: 0, waves: 0 };
  if (!blobOk()) return empty;
  try {
    const { get } = await import("@vercel/blob");
    const key = `${PREFIX}${date}.json`;
    const result = await get(key, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return empty;
    const text = await new Response(result.stream).text();
    if (!text) return empty;
    return JSON.parse(text) as DayStats;
  } catch {
    return empty;
  }
}

async function writeDay(stats: DayStats) {
  if (!blobOk()) return;
  const { put } = await import("@vercel/blob");
  await put(`${PREFIX}${stats.date}.json`, JSON.stringify(stats), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getDayStats(date = madridDate()): Promise<DayStats> {
  return readDay(date);
}

export async function bumpDayStats(delta: {
  sent?: number;
  failed?: number;
  place?: string;
}): Promise<DayStats> {
  const date = madridDate();
  const cur = await readDay(date);
  const next: DayStats = {
    date,
    sent: cur.sent + (delta.sent || 0),
    failed: cur.failed + (delta.failed || 0),
    waves: cur.waves + 1,
    lastWaveAt: new Date().toISOString(),
    lastPlace: delta.place || cur.lastPlace,
  };
  await writeDay(next);
  return next;
}

export { madridDate };
