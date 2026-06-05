import "server-only";
import { getSessionToken, MOCK_DEV_TOKEN } from "@/lib/auth/session";
import { mockResponse } from "@/lib/mock/dispatcher";
import { ApiError, UnauthorizedError } from "./errors";

export async function serverFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();

  let res: Response;
  if (token === MOCK_DEV_TOKEN) {
    res = mockResponse(path, init);
  } else {
    const isFormData = init?.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init?.headers ?? {}) as Record<string, string>),
    };
    res = await fetch(`${process.env.BACKEND_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  }

  if (res.status === 401) {
    const body = await res.json().catch(() => undefined);
    throw new UnauthorizedError(body);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    const message =
      typeof body === "object" && body && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}
