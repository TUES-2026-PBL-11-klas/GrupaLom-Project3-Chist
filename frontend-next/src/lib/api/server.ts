import "server-only";
import { cache } from "react";
import { getSessionToken, MOCK_DEV_TOKEN } from "@/lib/auth/session";
import { mockResponse } from "@/lib/mock/dispatcher";
import { resolveBackendBase } from "./backend-url";
import { ApiError, UnauthorizedError } from "./errors";

function extractUuidFromJwt(token: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    );
    return typeof payload.uuid === "string" ? payload.uuid : null;
  } catch {
    return null;
  }
}

// Memoized per request — only hits /users/me once when the JWT lacks the uuid claim (old tokens).
const fetchUserIdFromApi = cache(async (token: string): Promise<string | null> => {
  try {
    const res = await fetch(`${process.env.USER_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.id === "string" ? data.id : null;
  } catch {
    return null;
  }
});

export async function serverFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();

  let res: Response;
  if (token === MOCK_DEV_TOKEN) {
    res = mockResponse(path, init);
  } else {
    const isFormData = init?.body instanceof FormData;
    let userId = token ? extractUuidFromJwt(token) : null;
    if (token && !userId) {
      userId = await fetchUserIdFromApi(token);
    }
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userId ? { "X-User-Id": userId } : {}),
      ...((init?.headers ?? {}) as Record<string, string>),
    };
    res = await fetch(`${resolveBackendBase(path)}${path}`, {
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
