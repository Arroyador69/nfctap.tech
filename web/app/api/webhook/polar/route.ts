import { polarMarksPaid, verifyPolarWebhook } from "@/lib/polar-webhook";
import { updateOrder } from "@/lib/store";
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
    data?: { status?: string; metadata?: { orderId?: string } };
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }
  const orderId = payload.data?.metadata?.orderId;
  const type = String(payload.type ?? "");
  if (typeof orderId === "string" && polarMarksPaid(type, payload.data?.status)) {
    await updateOrder(orderId, { status: "pagado" });
  }

  return NextResponse.json({ ok: true });
}
