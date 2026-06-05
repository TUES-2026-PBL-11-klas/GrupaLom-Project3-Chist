import { NextResponse } from "next/server";
import { getSessionToken, clearSessionCookie, MOCK_DEV_TOKEN } from "@/lib/auth/session";

export async function POST() {
  const token = await getSessionToken();

  if (token && token !== MOCK_DEV_TOKEN) {
    try {
      await fetch(`${process.env.BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Backend unreachable — still clear the cookie below so the user can log in again.
    }
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
