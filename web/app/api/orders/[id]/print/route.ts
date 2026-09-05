import { isAdmin } from "@/lib/auth";
import { buildPrintPack } from "@/lib/print-pack";
import { getOrder, updateOrder } from "@/lib/store";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const zip = await buildPrintPack(order);
  if (order.status === "pagado") {
    await updateOrder(id, { status: "en_impresion" });
  }

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${order.id}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
