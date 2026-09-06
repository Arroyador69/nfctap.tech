import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL = "www.nfctap.tech";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  if (host === "nfctab.tech" || host === "www.nfctab.tech") {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
