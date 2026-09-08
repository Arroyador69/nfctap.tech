import { isAdmin } from "@/lib/auth";
import { lookupReviewPlaces } from "@/lib/google-reviews";
import { NextResponse } from "next/server";

const hits = new Map<string, { n: number; t: number }>();

function ipOf(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function limited(ip: string) {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now - row.t > 60 * 60 * 1000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  row.n += 1;
  return row.n > 40;
}

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

async function run(q: string, req: Request) {
  if (limited(ipOf(req))) {
    return cors(NextResponse.json({ error: "Demasiadas búsquedas. Espera un rato." }, { status: 429 }));
  }
  const query = q.trim().slice(0, 200);
  if (query.length < 3) {
    return cors(NextResponse.json({ error: "Escribe al menos 3 letras o pega el enlace de Google." }, { status: 400 }));
  }
  const places = await lookupReviewPlaces(query);
  return cors(NextResponse.json({ places, admin: await isAdmin() }));
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  return run(q, req);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { q?: string };
  return run(body.q || "", req);
}
