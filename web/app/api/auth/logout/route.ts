import { clearAdminCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await clearAdminCookie();
  return NextResponse.redirect(new URL("/dashboard/login", req.url));
}

export async function GET(req: Request) {
  await clearAdminCookie();
  return NextResponse.redirect(new URL("/dashboard/login", req.url));
}
