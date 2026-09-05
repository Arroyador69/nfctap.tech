import { isAdmin } from "@/lib/auth";
import { getOrder, updateOrder } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";
import { NextResponse } from "next/server";

const STATUSES: OrderStatus[] = [
  "pendiente_pago",
  "pagado",
  "en_impresion",
  "enviado",
  "entregado",
  "cancelado",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const patch: { status?: OrderStatus; tracking?: string; notes?: string } = {};
  if (STATUSES.includes(body.status)) patch.status = body.status;
  if (typeof body.tracking === "string") patch.tracking = body.tracking;
  if (typeof body.notes === "string") patch.notes = body.notes;
  const order = updateOrder(id, patch);
  if (!order) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ order });
}
