import {
  clientIpFromHeaders,
  registerTallerHome,
  tallerHomeCookieName,
  tallerHomeCookieOptions,
  tallerHomeCookieValue,
  tallerIdOk,
} from "@/lib/taller";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Activa el taller (clave) y redirige con cookie. Usado por ?activar= en /taller/[id]. */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!tallerIdOk(id)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const secret = new URL(req.url).searchParams.get("secret")?.trim() || "";
  const result = await registerTallerHome(id, clientIpFromHeaders(req.headers), secret);
  const dest = new URL(`/taller/${id}`, req.url);
  if (!result.ok) {
    dest.searchParams.set("err", result.error);
    return NextResponse.redirect(dest);
  }
  dest.searchParams.set("ok", "1");
  const res = NextResponse.redirect(dest);
  res.cookies.set(tallerHomeCookieName(id), tallerHomeCookieValue(id), tallerHomeCookieOptions());
  return res;
}
