import { checkPassword, setAdminCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!checkPassword(String(password || ""))) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
