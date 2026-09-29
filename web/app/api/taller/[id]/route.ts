import {
  addTallerItem,
  assertTallerHome,
  clearDoneTaller,
  clientIpFromHeaders,
  getTaller,
  normalizeTallerColor,
  normalizeTallerSection,
  normalizeTallerUnit,
  patchTallerItem,
  registerTallerHome,
  removeTallerItem,
  tallerHomeCookieName,
  tallerHomeCookieOptions,
  tallerHomeCookieValue,
  tallerIdOk,
  tallerPublicView,
} from "@/lib/taller";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function badId() {
  return NextResponse.json({ error: "id inválido" }, { status: 400 });
}

function denied(reason: "fuera_casa" | "sin_activar") {
  const msg =
    reason === "sin_activar"
      ? "Taller no activado"
      : "Solo se abre en la Wi‑Fi de casa o con dispositivo ya activado";
  return NextResponse.json({ error: msg, code: reason }, { status: 403 });
}

async function gate(req: Request, id: string) {
  return assertTallerHome(id, clientIpFromHeaders(req.headers));
}

function okTaller(taller: Awaited<ReturnType<typeof getTaller>>) {
  return NextResponse.json(tallerPublicView(taller), {
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!tallerIdOk(id)) return badId();
  const access = await gate(req, id);
  if (!access.ok) return denied(access.reason);
  return okTaller(await getTaller(id));
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!tallerIdOk(id)) return badId();
  try {
    const body = (await req.json()) as {
      action?: string;
      text?: string;
      qty?: number;
      unit?: string;
      section?: string;
      color?: string;
      secret?: string;
    };
    if (body.action === "registerHome") {
      const ip = clientIpFromHeaders(req.headers);
      const result = await registerTallerHome(id, ip, body.secret || "");
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      const res = NextResponse.json({
        ok: true,
        message: "Taller abierto en este dispositivo.",
      });
      res.cookies.set(tallerHomeCookieName(id), tallerHomeCookieValue(id), tallerHomeCookieOptions());
      return res;
    }
    const access = await gate(req, id);
    if (!access.ok) return denied(access.reason);
    if (body.action === "clearDone") {
      return okTaller(await clearDoneTaller(id));
    }
    if (body.action === "add" || !body.action) {
      return okTaller(
        await addTallerItem(id, body.text || "", body.qty ?? 1, {
          section: normalizeTallerSection(body.section),
          unit: normalizeTallerUnit(body.unit),
          color: normalizeTallerColor(body.color),
        }),
      );
    }
    return NextResponse.json({ error: "acción desconocida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!tallerIdOk(id)) return badId();
  const access = await gate(req, id);
  if (!access.ok) return denied(access.reason);
  try {
    const body = (await req.json()) as {
      itemId?: string;
      qty?: number;
      done?: boolean;
      text?: string;
      unit?: string;
      section?: string;
      color?: string;
    };
    if (!body.itemId) return NextResponse.json({ error: "falta itemId" }, { status: 400 });
    return okTaller(
      await patchTallerItem(id, body.itemId, {
        qty: body.qty,
        done: body.done,
        text: body.text,
        unit: body.unit !== undefined ? normalizeTallerUnit(body.unit) : undefined,
        section: body.section !== undefined ? normalizeTallerSection(body.section) : undefined,
        color: body.color !== undefined ? normalizeTallerColor(body.color) : undefined,
      }),
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!tallerIdOk(id)) return badId();
  const access = await gate(req, id);
  if (!access.ok) return denied(access.reason);
  try {
    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId") || "";
    if (!itemId) return NextResponse.json({ error: "falta itemId" }, { status: 400 });
    return okTaller(await removeTallerItem(id, itemId));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
