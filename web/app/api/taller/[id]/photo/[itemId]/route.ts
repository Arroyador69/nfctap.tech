import {
  assertTallerHome,
  clientIpFromHeaders,
  readTallerItemPhoto,
  tallerIdOk,
} from "@/lib/taller";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  if (!tallerIdOk(id) || !itemId) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }
  const access = await assertTallerHome(id, clientIpFromHeaders(req.headers));
  if (!access.ok) {
    return NextResponse.json({ error: "privado" }, { status: 403 });
  }
  const photo = await readTallerItemPhoto(id, itemId);
  if (!photo) return NextResponse.json({ error: "sin foto" }, { status: 404 });
  return new NextResponse(photo.body, {
    headers: {
      "content-type": photo.contentType,
      "cache-control": "private, no-store",
    },
  });
}
