import { describe, expect, it, vi, beforeEach } from "vitest";

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

import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    cookieStore.clear();
    vi.restoreAllMocks();
    process.env.BACKEND_URL = "http://backend.test/api";
  });

  it("clears the cookie and returns 200 even when there's no session", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(cookieStore.get("cw_token")).toBeUndefined();
  });

  it("clears the cookie and calls backend /auth/logout for real session", async () => {
    cookieStore.set("cw_token", { value: "jwt-real" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    const res = await POST();
    expect(res.status).toBe(200);
    expect(cookieStore.get("cw_token")).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-real" }),
      })
    );
  });

  it("clears cookie but does NOT call backend for mock session", async () => {
    cookieStore.set("cw_token", { value: "mock-dev-token" });
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const res = await POST();
    expect(res.status).toBe(200);
    expect(cookieStore.get("cw_token")).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still returns 200 and clears cookie if backend logout fails", async () => {
    cookieStore.set("cw_token", { value: "jwt-real" });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await POST();
    expect(res.status).toBe(200);
    expect(cookieStore.get("cw_token")).toBeUndefined();
  });
});
