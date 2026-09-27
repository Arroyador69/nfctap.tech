import {
  addListaItem,
  assertListaHome,
  clearDoneLista,
  clearListaItemPhoto,
  clientIpFromHeaders,
  getLista,
  listaHomeCookieName,
  listaHomeCookieOptions,
  listaHomeCookieValue,
  listaIdOk,
  listaPublicView,
  patchListaItem,
  registerListaHome,
  removeListaItem,
  setListaItemPhoto,
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
  return assertListaHome(id, clientIpFromHeaders(req.headers));
}

function okLista(lista: Awaited<ReturnType<typeof getLista>>) {
  return NextResponse.json(listaPublicView(lista), {
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) return badId();
  const access = await gate(req, id);
  if (!access.ok) return denied(access.reason);
  return okLista(await getLista(id));
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) return badId();

  const contentType = req.headers.get("content-type") || "";

  // Subida de foto: multipart
  if (contentType.includes("multipart/form-data")) {
    const access = await gate(req, id);
    if (!access.ok) return denied(access.reason);
    try {
      const form = await req.formData();
      const itemId = String(form.get("itemId") || "");
      const file = form.get("photo");
      if (!itemId || !(file instanceof File)) {
        return NextResponse.json({ error: "falta foto o ítem" }, { status: 400 });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "solo imágenes" }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      return okLista(await setListaItemPhoto(id, itemId, buf, file.type || "image/jpeg"));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
    }
  }

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
      return okLista(await clearDoneLista(id));
    }
    if (body.action === "clearPhoto") {
      if (!body.itemId) return NextResponse.json({ error: "falta itemId" }, { status: 400 });
      return okLista(await clearListaItemPhoto(id, body.itemId));
    }
    if (body.action === "add" || !body.action) {
      return okLista(await addListaItem(id, body.text || "", body.qty ?? 1));
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
    return okLista(
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
    return okLista(await removeListaItem(id, itemId));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
