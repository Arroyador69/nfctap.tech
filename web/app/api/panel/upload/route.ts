import {
  assertClientAccess,
  getClient,
  getPanelSession,
} from "@/lib/panel";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Token de subida directa a Blob (móvil → Blob, sin pasar por el límite de body de Vercel).
 * pathname: panel/{clientId}/{folderId}/…
 */
export async function POST(req: Request) {
  const session = await getPanelSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob no configurado" }, { status: 500 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let meta: { clientId?: string; folderId?: string } = {};
        try {
          meta = clientPayload ? (JSON.parse(clientPayload) as typeof meta) : {};
        } catch {
          throw new Error("Payload inválido");
        }
        const clientId = meta.clientId || "";
        const folderId = meta.folderId || "";
        if (!clientId || !folderId) throw new Error("Falta cliente o carpeta");
        if (!assertClientAccess(session, clientId)) throw new Error("Sin acceso");
        const client = await getClient(clientId);
        if (!client?.active) throw new Error("Cliente no encontrado");
        const folder = client.folders.find((f) => f.id === folderId);
        if (!folder) throw new Error("Carpeta no encontrada");
        if (session.role === "client" && folder.kind === "finales") {
          throw new Error("Los finales solo los sube NFCTap");
        }
        const expectedPrefix = `panel/${clientId}/${folderId}/`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("Ruta de subida inválida");
        }
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-m4v",
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            clientId,
            folderId,
            by: session.role,
          }),
        };
      },
      onUploadCompleted: async () => {
        /* el cliente registra el archivo vía /api/panel/clients/[id] */
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error de subida" },
      { status: 400 },
    );
  }
}
