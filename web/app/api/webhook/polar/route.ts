import { updateOrder } from "@/lib/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!process.env.POLAR_WEBHOOK_SECRET) {
    return NextResponse.json({ ignored: true, reason: "Polar aún no configurado" });
  }

  const payload = await req.json().catch(() => null);
  const orderId = payload?.data?.metadata?.orderId ?? payload?.metadata?.orderId;
  const type = String(payload?.type ?? "");
  if (typeof orderId === "string" && (type.includes("order") || type.includes("checkout"))) {
    updateOrder(orderId, { status: "pagado" });
  }

  return NextResponse.json({ ok: true });
}
