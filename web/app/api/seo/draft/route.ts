import { isAdmin } from "@/lib/auth";
import { draftGuide, openaiConfigured } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!openaiConfigured()) {
    return NextResponse.json(
      { error: "Falta OPENAI_API_KEY en Vercel (la misma del admin de Delfín)." },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { topic?: string };
  const topic = (body.topic || "").trim().slice(0, 200);
  if (topic.length < 8) {
    return NextResponse.json({ error: "Escribe un tema de al menos 8 caracteres." }, { status: 400 });
  }
  try {
    const draft = await draftGuide(topic);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI falló";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
