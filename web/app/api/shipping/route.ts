import { isAdmin } from "@/lib/auth";
import { DEFAULT_SHIPPING } from "@/lib/shipping";
import { getShipping, setShipping } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ shipping: await getShipping() });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const next = { ...DEFAULT_SHIPPING, ...(await getShipping()) };
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (body[key] !== undefined) next[key] = Number(body[key]);
  }
  return NextResponse.json({ shipping: await setShipping(next) });
}
