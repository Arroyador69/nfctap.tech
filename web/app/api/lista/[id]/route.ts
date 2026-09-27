import {
  addListaItem,
  assertListaHome,
  clearDoneLista,
  clientIpFromHeaders,
  getLista,
  listaHomeCookieName,
  listaHomeCookieOptions,
  listaHomeCookieValue,
  listaIdOk,
  patchListaItem,
  registerListaHome,
  removeListaItem,
} from "@/lib/lista";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function badId() {
  return NextResponse.json({ error: "id inválido" }, { status: 400 });
}

function denied(reason: "fuera_casa" | "sin_activar") {
  const msg =
    reason === "sin_activar"
      ? "Lista no activada"
      : "Solo se abre en la Wi‑Fi de casa o con dispositivo ya activado";
  return NextResponse.json({ error: msg, code: reason }, { status: 403 });
}

async function gate(req: Request, id: string) {
  const ip = clientIpFromHeaders(req.headers);
  return assertListaHome(id, ip);
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) return badId();
  const access = await gate(req, id);
  if (!access.ok) return denied(access.reason);
  return NextResponse.json(await getLista(id), {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) return badId();
  try {
    const body = (await req.json()) as {
      action?: string;
      text?: string;
      qty?: number;
      itemId?: string;
      secret?: string;
    };
    if (body.action === "registerHome") {
      const ip = clientIpFromHeaders(req.headers);
      const result = await registerListaHome(id, ip, body.secret || "");
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      // Cookie en la respuesta HTTP (fiable en el navegador).
      const res = NextResponse.json({
        ok: true,
        message: "Lista abierta en este dispositivo.",
      });
      res.cookies.set(listaHomeCookieName(id), listaHomeCookieValue(id), listaHomeCookieOptions());
      return res;
    }
    const access = await gate(req, id);
    if (!access.ok) return denied(access.reason);
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
  const access = await gate(req, id);
  if (!access.ok) return denied(access.reason);
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
  const access = await gate(req, id);
  if (!access.ok) return denied(access.reason);
  try {
    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId") || "";
    if (!itemId) return NextResponse.json({ error: "falta itemId" }, { status: 400 });
    return NextResponse.json(await removeListaItem(id, itemId));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
