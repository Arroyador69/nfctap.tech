import { isAdmin } from "@/lib/auth";
import { setGoogleVerification, validGoogleVerification } from "@/lib/visits";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json()) as { googleVerification?: string };
  const code = String(body.googleVerification || "").trim();
  if (code && !validGoogleVerification(code)) {
    return NextResponse.json({ error: "Ese código no parece de Search Console" }, { status: 400 });
  }
  await setGoogleVerification(code);
  return NextResponse.json({ ok: true });
}
