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

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    cookieStore.clear();
    vi.restoreAllMocks();
    process.env.BACKEND_URL = "http://backend.test/api";
  });

  it("400 when fields missing", async () => {
    const res = await POST(makeRequest({ email: "x@y.z", username: "u" }));
    expect(res.status).toBe(400);
  });

  it("400 when password shorter than 8 chars", async () => {
    const res = await POST(makeRequest({ email: "x@y.z", username: "u", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("mock-mode register: email matches sentinel -> cookie set, no backend call", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const res = await POST(makeRequest({ email: "test@chist.bg", username: "TestUser", password: "test1234" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(cookieStore.get("cw_token")?.value).toBe("mock-dev-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies real registration to backend and sets cookie on success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "jwt-new", expiresIn: 3600 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await POST(makeRequest({ email: "new@example.com", username: "Newbie", password: "supersecret" }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/auth/register",
      expect.objectContaining({ method: "POST" })
    );
    expect(cookieStore.get("cw_token")?.value).toBe("jwt-new");
  });

  it("returns 409 with message when backend rejects (e.g. duplicate)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Email already taken" }), { status: 409 })
    );
    const res = await POST(makeRequest({ email: "dup@example.com", username: "Dup", password: "longenough" }));
    expect(res.status).toBe(409);
    expect((await res.json()).message).toBe("Email already taken");
    expect(cookieStore.get("cw_token")).toBeUndefined();
  });
});
