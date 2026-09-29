import {
  clearPanelSession,
  getPanelSession,
  loginPanel,
  sessionCookieOptions,
} from "@/lib/panel";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "nfctap_panel";

function panelSecret() {
  return (
    process.env.PANEL_SECRET ||
    process.env.DASHBOARD_SECRET ||
    process.env.DASHBOARD_PASSWORD ||
    "nfctab-panel-dev"
  );
}

function signSession(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", panelSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export async function GET() {
  const session = await getPanelSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    role: session.role,
    email: session.email,
    clientId: session.role === "client" ? session.clientId : null,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string; action?: string };
    if (body.action === "logout") {
      await clearPanelSession();
      const res = NextResponse.json({ ok: true });
      res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
      return res;
    }
    const result = await loginPanel(body.email || "", body.password || "");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    const res = NextResponse.json({
      ok: true,
      redirect: result.redirect,
      role: result.session.role,
    });
    res.cookies.set(SESSION_COOKIE, signSession(result.session), sessionCookieOptions());
    return res;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
