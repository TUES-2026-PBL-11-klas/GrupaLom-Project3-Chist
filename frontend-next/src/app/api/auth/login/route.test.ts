import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

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

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    cookieStore.clear();
    vi.restoreAllMocks();
    process.env.BACKEND_URL = "http://backend.test/api";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 and sets mock cookie for mock credentials", async () => {
    const res = await POST(makeRequest({ email: "test@chist.bg", password: "test1234" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(cookieStore.get("cw_token")?.value).toBe("mock-dev-token");
  });

  it("returns 400 for missing fields", async () => {
    const res = await POST(makeRequest({ email: "x@y.z" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("proxies real credentials to BACKEND_URL/auth/login and sets cookie on success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "jwt-real-123", expiresIn: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await POST(makeRequest({ email: "user@example.com", password: "secret" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "secret" }),
      })
    );

    expect(cookieStore.get("cw_token")?.value).toBe("jwt-real-123");
  });

  it("returns 401 with message when backend rejects credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401 })
    );

    const res = await POST(makeRequest({ email: "user@example.com", password: "wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ ok: false, message: "Invalid credentials" });
    expect(cookieStore.get("cw_token")).toBeUndefined();
  });

  it("returns 502 when backend is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await POST(makeRequest({ email: "user@example.com", password: "secret" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
