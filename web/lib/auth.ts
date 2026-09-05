import { cookies } from "next/headers";
import { createHmac } from "crypto";

const COOKIE = "nfctab_admin";

function secret() {
  return process.env.DASHBOARD_SECRET || process.env.DASHBOARD_PASSWORD || "nfctab-dev";
}

export function signAdmin() {
  return createHmac("sha256", secret()).update("ok").digest("hex");
}

export async function isAdmin() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === signAdmin();
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(COOKIE, signAdmin(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function checkPassword(input: string) {
  const expected = process.env.DASHBOARD_PASSWORD || "nfctab";
  return input === expected;
}
