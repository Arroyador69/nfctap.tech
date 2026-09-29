import {
  acceptContract,
  addFolder,
  assertClientAccess,
  getClient,
  getPanelSession,
  publicClient,
  registerFile,
  updateStrategyMonth,
  type PanelFolderKind,
} from "@/lib/panel";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function gate(id: string) {
  const session = await getPanelSession();
  if (!session) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  if (!assertClientAccess(session, id)) {
    return { error: NextResponse.json({ error: "Sin acceso" }, { status: 403 }) };
  }
  const client = await getClient(id);
  if (!client || !client.active) {
    return { error: NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 }) };
  }
  return { session, client };
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const g = await gate(id);
  if ("error" in g) return g.error;
  return NextResponse.json(
    { client: publicClient(g.client), role: g.session.role },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const g = await gate(id);
  if ("error" in g) return g.error;
  try {
    const body = (await req.json()) as {
      action?: string;
      name?: string;
      kind?: PanelFolderKind;
      folderId?: string;
      size?: number;
      contentType?: string;
      blobUrl?: string;
      dayKey?: string;
      year?: number;
      month?: number;
      title?: string;
      focus?: string;
      goalViews?: number;
      progress?: number;
    };

    if (body.action === "acceptContract") {
      if (g.session.role !== "client") {
        return NextResponse.json({ error: "Solo el cliente acepta el contrato" }, { status: 403 });
      }
      return NextResponse.json({ client: await acceptContract(id) });
    }

    if (body.action === "addFolder") {
      const kind: PanelFolderKind = body.kind === "finales" ? "finales" : "recursos";
      if (g.session.role === "client" && kind === "finales") {
        // Cliente puede crear carpetas de recursos; finales las gestiona admin o ambos
      }
      const result = await addFolder(id, body.name || "", kind);
      return NextResponse.json(result);
    }

    if (body.action === "registerFile") {
      if (!body.folderId || !body.blobUrl || !body.name) {
        return NextResponse.json({ error: "Faltan datos del archivo" }, { status: 400 });
      }
      const folder = g.client.folders.find((f) => f.id === body.folderId);
      if (!folder) return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
      if (g.session.role === "client" && folder.kind === "finales") {
        return NextResponse.json(
          { error: "Los finales solo los sube NFCTap" },
          { status: 403 },
        );
      }
      const result = await registerFile(id, {
        folderId: body.folderId,
        name: body.name,
        size: body.size || 0,
        contentType: body.contentType || "video/mp4",
        blobUrl: body.blobUrl,
        uploadedBy: g.session.role === "admin" ? "admin" : "client",
        dayKey: body.dayKey,
      });
      return NextResponse.json(result);
    }

    if (body.action === "updateStrategy") {
      if (g.session.role !== "admin") {
        return NextResponse.json({ error: "Solo admin" }, { status: 403 });
      }
      if (!body.year || !body.month) {
        return NextResponse.json({ error: "Falta mes" }, { status: 400 });
      }
      const client = await updateStrategyMonth(id, body.year, body.month, {
        title: body.title,
        focus: body.focus,
        goalViews: body.goalViews,
        progress: body.progress,
      });
      return NextResponse.json({ client });
    }

    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
