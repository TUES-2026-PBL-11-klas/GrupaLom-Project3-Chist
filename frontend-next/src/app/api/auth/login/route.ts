import { NextResponse } from "next/server";
import { setSessionCookie, MOCK_DEV_TOKEN } from "@/lib/auth/session";

const MOCK_EMAIL = "test@chist.bg";
const MOCK_PASSWORD = "test1234";
const DEFAULT_MAX_AGE = 60 * 60 * 24;

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email and password are required" }, { status: 400 });
  }

  if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
    await setSessionCookie(MOCK_DEV_TOKEN, DEFAULT_MAX_AGE);
    return NextResponse.json({ ok: true });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${process.env.BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Backend unreachable" }, { status: 502 });
  }

  const data = await backendRes.json().catch(() => ({}));

  if (!backendRes.ok) {
    return NextResponse.json(
      { ok: false, message: data.message ?? `HTTP ${backendRes.status}` },
      { status: backendRes.status }
    );
  }

  if (!data.token) {
    return NextResponse.json({ ok: false, message: "Backend response missing token" }, { status: 502 });
  }

  await setSessionCookie(data.token, data.expiresIn ?? DEFAULT_MAX_AGE);
  return NextResponse.json({ ok: true });
}
