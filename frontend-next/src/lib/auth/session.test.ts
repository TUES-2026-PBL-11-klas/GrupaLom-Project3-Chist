import { describe, expect, it, vi, beforeEach } from "vitest";
import { setSessionCookie, getSessionToken, clearSessionCookie, MOCK_DEV_TOKEN } from "./session";

const cookieStore = new Map<string, { value: string; options?: Record<string, unknown> }>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const entry = cookieStore.get(name);
      return entry ? { name, value: entry.value } : undefined;
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieStore.set(name, { value, options });
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

describe("auth session helpers", () => {
  beforeEach(() => cookieStore.clear());

  it("setSessionCookie writes cw_token with httpOnly + sameSite=lax", async () => {
    await setSessionCookie("jwt-abc", 3600);
    const entry = cookieStore.get("cw_token");
    expect(entry?.value).toBe("jwt-abc");
    expect(entry?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
  });

  it("setSessionCookie respects AUTH_COOKIE_SECURE=true", async () => {
    const prev = process.env.AUTH_COOKIE_SECURE;
    process.env.AUTH_COOKIE_SECURE = "true";
    await setSessionCookie("jwt-xyz", 3600);
    process.env.AUTH_COOKIE_SECURE = prev;
    expect(cookieStore.get("cw_token")?.options).toMatchObject({ secure: true });
  });

  it("setSessionCookie defaults secure=false when AUTH_COOKIE_SECURE unset", async () => {
    const prev = process.env.AUTH_COOKIE_SECURE;
    delete process.env.AUTH_COOKIE_SECURE;
    await setSessionCookie("jwt-xyz", 3600);
    process.env.AUTH_COOKIE_SECURE = prev;
    expect(cookieStore.get("cw_token")?.options).toMatchObject({ secure: false });
  });

  it("getSessionToken returns the cookie value or undefined", async () => {
    expect(await getSessionToken()).toBeUndefined();
    cookieStore.set("cw_token", { value: "jwt-123" });
    expect(await getSessionToken()).toBe("jwt-123");
  });

  it("clearSessionCookie removes cw_token", async () => {
    cookieStore.set("cw_token", { value: "jwt-123" });
    await clearSessionCookie();
    expect(cookieStore.get("cw_token")).toBeUndefined();
  });

  it("exports the mock token sentinel", () => {
    expect(MOCK_DEV_TOKEN).toBe("mock-dev-token");
  });
});
