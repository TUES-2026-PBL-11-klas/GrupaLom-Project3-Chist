import { describe, expect, it, vi, beforeEach } from "vitest";

const cookieStore = new Map<string, { value: string }>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name) && { name, value: cookieStore.get(name)!.value },
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock("server-only", () => ({}));

import { serverFetch } from "./server";
import { ApiError, UnauthorizedError } from "./errors";
import { MOCK_ME } from "@/lib/mock/data";

describe("serverFetch", () => {
  beforeEach(() => {
    cookieStore.clear();
    vi.restoreAllMocks();
    process.env.BACKEND_URL = "http://backend.test/api";
  });

  it("calls BACKEND_URL + path with Authorization: Bearer when token present", async () => {
    cookieStore.set("cw_token", { value: "jwt-abc" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const body = await serverFetch("/users/me");
    expect(body).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/users/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer jwt-abc" }),
      })
    );
  });

  it("omits Authorization header when no cookie", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
    );
    await serverFetch("/some/public");
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("mock token short-circuits to mock dispatcher (no fetch call)", async () => {
    cookieStore.set("cw_token", { value: "mock-dev-token" });
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const body = await serverFetch("/users/me");
    expect(body).toEqual(MOCK_ME);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedError on 401", async () => {
    cookieStore.set("cw_token", { value: "jwt-bad" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
    );
    await expect(serverFetch("/users/me")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws ApiError on 5xx", async () => {
    cookieStore.set("cw_token", { value: "jwt-abc" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 })
    );
    await expect(serverFetch("/users/me")).rejects.toBeInstanceOf(ApiError);
  });

  it("returns null for 204", async () => {
    cookieStore.set("cw_token", { value: "jwt-abc" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    expect(await serverFetch("/reports/r-1", { method: "DELETE" })).toBeNull();
  });

  it("uses cache: no-store by default", async () => {
    cookieStore.set("cw_token", { value: "jwt-abc" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
    );
    await serverFetch("/users/me");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("does not set Content-Type when body is FormData (multipart)", async () => {
    cookieStore.set("cw_token", { value: "jwt-abc" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const fd = new FormData();
    fd.append("photo", new Blob(["x"]), "x.jpg");
    await serverFetch("/reports", { method: "POST", body: fd });
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });
});
