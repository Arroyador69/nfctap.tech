import {
  assertClientAccess,
  deleteFile,
  findFile,
  getPanelSession,
} from "@/lib/panel";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ fileId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { fileId } = await ctx.params;
  const session = await getPanelSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const hit = await findFile(fileId);
  if (!hit) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!assertClientAccess(session, hit.client.id)) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }
  if (session.role === "client" && hit.file.uploadedBy === "admin") {
    return NextResponse.json({ error: "No puedes borrar finales de NFCTap" }, { status: 403 });
  }

  const client = await deleteFile(hit.client.id, fileId);
  return NextResponse.json({ client });
}
