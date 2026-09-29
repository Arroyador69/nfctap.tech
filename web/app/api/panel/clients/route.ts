import {
  createClient,
  getPanelSession,
  listClients,
  type RedesPack,
} from "@/lib/panel";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getPanelSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }
  return NextResponse.json({ clients: await listClients() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const session = await getPanelSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      pack?: RedesPack;
      slug?: string;
    };
    const client = await createClient({
      name: body.name || "",
      email: body.email || "",
      password: body.password || "",
      pack: (body.pack || "barrio") as RedesPack,
      slug: body.slug,
    });
    return NextResponse.json({ client });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
