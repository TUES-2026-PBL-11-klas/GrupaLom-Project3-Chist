import { cookies } from "next/headers";

export const SESSION_COOKIE = "cw_token";
export const MOCK_DEV_TOKEN = "mock-dev-token";

function isSecure(): boolean {
  return process.env.AUTH_COOKIE_SECURE === "true";
}

export async function setSessionCookie(token: string, maxAgeSeconds: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
