import {
  assertClientAccess,
  findFile,
  getPanelSession,
} from "@/lib/panel";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ fileId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { fileId } = await ctx.params;
  const session = await getPanelSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const hit = await findFile(fileId);
  if (!hit) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!assertClientAccess(session, hit.client.id)) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob no configurado" }, { status: 500 });
  }

  try {
    const { get } = await import("@vercel/blob");
    const result = await get(hit.file.blobUrl, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        "content-type": hit.file.contentType || "application/octet-stream",
        "content-disposition": `attachment; filename="${encodeURIComponent(hit.file.name)}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo descargar" }, { status: 500 });
  }
}
