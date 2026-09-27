import {
  clientIpFromHeaders,
  listaHomeCookieName,
  listaHomeCookieOptions,
  listaHomeCookieValue,
  listaIdOk,
  registerListaHome,
} from "@/lib/lista";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Activa la lista (clave) y redirige con cookie. Usado por ?activar= en /lista/[id]. */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!listaIdOk(id)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const secret = new URL(req.url).searchParams.get("secret")?.trim() || "";
  const result = await registerListaHome(id, clientIpFromHeaders(req.headers), secret);
  const dest = new URL(`/lista/${id}`, req.url);
  if (!result.ok) {
    dest.searchParams.set("err", result.error);
    return NextResponse.redirect(dest);
  }
  dest.searchParams.set("ok", "1");
  const res = NextResponse.redirect(dest);
  res.cookies.set(listaHomeCookieName(id), listaHomeCookieValue(id), listaHomeCookieOptions());
  return res;
}
