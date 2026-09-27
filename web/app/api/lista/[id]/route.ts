import {
  addListaItem,
  clearDoneLista,
  getLista,
  listaIdOk,
  patchListaItem,
  removeListaItem,
} from "@/lib/lista";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function badId() {
  return NextResponse.json({ error: "id inválido" }, { status: 400 });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) return badId();
  return NextResponse.json(await getLista(id), {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) return badId();
  try {
    const body = (await req.json()) as { action?: string; text?: string; qty?: number; itemId?: string };
    if (body.action === "clearDone") {
      return NextResponse.json(await clearDoneLista(id));
    }
    if (body.action === "add" || !body.action) {
      return NextResponse.json(await addListaItem(id, body.text || "", body.qty ?? 1));
    }
    return NextResponse.json({ error: "acción desconocida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) return badId();
  try {
    const body = (await req.json()) as {
      itemId?: string;
      qty?: number;
      done?: boolean;
      text?: string;
    };
    if (!body.itemId) return NextResponse.json({ error: "falta itemId" }, { status: 400 });
    return NextResponse.json(
      await patchListaItem(id, body.itemId, {
        qty: body.qty,
        done: body.done,
        text: body.text,
      }),
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) return badId();
  try {
    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId") || "";
    if (!itemId) return NextResponse.json({ error: "falta itemId" }, { status: 400 });
    return NextResponse.json(await removeListaItem(id, itemId));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
