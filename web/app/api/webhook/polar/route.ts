import { sendMetaCapiPurchase } from "@/lib/meta-capi";
import { polarMarksPaid, polarOrderId, verifyPolarWebhook } from "@/lib/polar-webhook";
import { getOrder, updateOrder } from "@/lib/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ignored: true, reason: "Polar aún no configurado" });
  }

  const raw = await req.text();
  if (!verifyPolarWebhook(raw, req.headers, secret)) {
    return NextResponse.json({ error: "Firma no válida" }, { status: 403 });
  }

  let payload: {
    type?: string;
    data?: {
      status?: string;
      metadata?: { orderId?: string };
      checkout?: { metadata?: { orderId?: string } };
    };
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }
  const orderId = polarOrderId(payload.data);
  const type = String(payload.type ?? "");
  if (orderId && polarMarksPaid(type, payload.data?.status)) {
    const before = await getOrder(orderId);
    const updated = await updateOrder(orderId, { status: "pagado" });
    if (updated && before?.status !== "pagado") {
      try {
        await sendMetaCapiPurchase(updated);
      } catch (err) {
        console.error("Meta CAPI Purchase", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
