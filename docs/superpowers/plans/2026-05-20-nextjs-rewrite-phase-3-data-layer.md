# Next.js Rewrite — Phase 3: Data Layer + Mock

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the server-side data layer that Phase 4's pages will consume. Build `serverFetch` (the single function that reads the cookie, attaches `Authorization: Bearer`, calls the Spring Boot backend, throws typed errors), port all the existing `authApi` / `reportsApi` / `usersApi` / etc. wrapper functions on top of it, port the mock data from `frontend/src/data/mockData.ts`, and add a mock dispatcher so the `mock-dev-token` session returns mock JSON without hitting any backend. Verify by replacing the Phase 2 reports placeholder with a real `usersApi.getMe()` + `reportsApi.list()` server fetch and confirming it renders mock data.

**Architecture:** Three layers, each with one purpose (matches the design doc §4):

1. `lib/api/server.ts` — `serverFetch(path, init?)`. The only function that touches the backend. Reads `cw_token` via `getSessionToken()`. If token is `mock-dev-token`, dispatches to `lib/mock/dispatcher.ts` instead of calling `fetch`. On 401 throws `UnauthorizedError`. On 4xx/5xx throws `ApiError`. Returns the parsed JSON body for 200/201; returns null for 204.
2. `lib/api/index.ts` — port of the old `frontend/src/services/api.ts` namespaces (`authApi`, `reportsApi`, `usersApi`, `leaderboardApi`, `aiApi`, `verificationsApi`, `statsApi`, `notificationsApi`) reimplemented on `serverFetch`. Same function names so future code reads the same. Note: `authApi.login/register/logout` are now route handlers (Phase 2) — `authApi` exports `refresh` only here (the only auth call from server components).
3. `lib/actions/*.ts` — `"use server"` mutation functions (createReport, claimReport, completeReport, updateMe). Each calls `serverFetch` then `revalidatePath`. Phase 3 lays the skeletons; Phase 4 wires them into the UI.

The mock dispatcher covers the read paths Phase 4 will hit (`/users/me`, `/reports`, `/reports/{id}`, `/users/leaderboard`). Mutations in mock mode return `null` (no-op success) — full mock-mutation state lives in client state in Phase 4.

**Tech Stack:** Next.js 16 App Router, TypeScript, vitest. No new deps.

**Spec reference:** `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md` §4 (Data Layer)
**Prior plan:** `docs/superpowers/plans/2026-05-19-nextjs-rewrite-phase-2-auth.md`
**Source of truth for ports:** `frontend/src/services/api.ts` and `frontend/src/data/mockData.ts` (both already in the repo).

---

## File Structure

**Created in this phase:**

```
frontend-next/src/
├── lib/
│   ├── api/
│   │   ├── errors.ts                # UnauthorizedError, ApiError
│   │   ├── errors.test.ts
│   │   ├── server.ts                # serverFetch + getMe shortcut
│   │   ├── server.test.ts
│   │   └── index.ts                 # authApi/reportsApi/usersApi/... namespace ports
│   ├── mock/
│   │   ├── data.ts                  # MOCK_ME, MOCK_USERS, MOCK_REPORTS
│   │   └── dispatcher.ts            # mockResponse(path, init) -> Response
│   └── actions/
│       ├── auth.ts                  # (already exists from Phase 2 — unchanged)
│       └── reports.ts               # createReport / claimReport / completeReport stubs
└── app/[locale]/(app)/reports/page.tsx  # MODIFIED: real fetch instead of placeholder text
```

**Not touched in this phase:** `frontend/` (old app). Phase 2's `/api/auth/*` route handlers (they keep using direct `fetch` — they're not authenticated and don't need `serverFetch`).

---

## Task 1: Typed errors (TDD)

**Files:**
- Create: `frontend-next/src/lib/api/errors.ts`
- Create: `frontend-next/src/lib/api/errors.test.ts`

- [ ] **Step 1: Write the failing tests**

`frontend-next/src/lib/api/errors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ApiError, UnauthorizedError, isUnauthorized } from "./errors";

describe("ApiError", () => {
  it("captures status, message, and optional body", () => {
    const err = new ApiError(500, "Internal Server Error", { detail: "boom" });
    expect(err.status).toBe(500);
    expect(err.message).toBe("Internal Server Error");
    expect(err.body).toEqual({ detail: "boom" });
    expect(err).toBeInstanceOf(Error);
  });

  it("works without a body", () => {
    const err = new ApiError(404, "Not Found");
    expect(err.body).toBeUndefined();
  });
});

describe("UnauthorizedError", () => {
  it("is an ApiError with status 401", () => {
    const err = new UnauthorizedError();
    expect(err.status).toBe(401);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it("isUnauthorized narrows correctly", () => {
    expect(isUnauthorized(new UnauthorizedError())).toBe(true);
    expect(isUnauthorized(new ApiError(500, "boom"))).toBe(false);
    expect(isUnauthorized(new Error("plain"))).toBe(false);
    expect(isUnauthorized("not even an error")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd frontend-next && npm test -- src/lib/api/errors.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`frontend-next/src/lib/api/errors.ts`:

```ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(body?: unknown) {
    super(401, "Unauthorized", body);
    this.name = "UnauthorizedError";
  }
}

export function isUnauthorized(err: unknown): err is UnauthorizedError {
  return err instanceof UnauthorizedError;
}
```

- [ ] **Step 4: Tests pass**

```bash
npm test -- src/lib/api/errors.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git add frontend-next/src/lib/api
git commit -m "feat(next): typed ApiError + UnauthorizedError for the data layer"
```

---

## Task 2: Port mock data

**Files:**
- Create: `frontend-next/src/lib/mock/data.ts`
- Reference (read-only): `frontend/src/data/mockData.ts`

Direct verbatim port — same exports, same data, just relocated.

- [ ] **Step 1: Copy mock data**

`frontend-next/src/lib/mock/data.ts`:

```ts
// Mock data used when logged in with the mock dev token (test@chist.bg / test1234).
// Shapes match the Spring Boot API responses, so they pass through the same
// mapping functions (Phase 4) as real backend data.

export const MOCK_ME = {
  id: "mock-1",
  username: "TestUser",
  email: "test@chist.bg",
  points: 250,
  streak: 3,
  role: "VerifiedUser",
  cleanings: 2,
  reports: 4,
  createdAt: "2025-09-12T10:00:00Z",
};

export const MOCK_USERS = [
  MOCK_ME,
  {
    id: "mock-2",
    username: "EcoMaria",
    email: "maria@example.com",
    points: 5420,
    streak: 18,
    role: "VerifiedUser",
    cleanings: 27,
    reports: 41,
    createdAt: "2024-11-03T08:00:00Z",
  },
  {
    id: "mock-3",
    username: "GreenIvan",
    email: "ivan@example.com",
    points: 3180,
    streak: 9,
    role: "VerifiedUser",
    cleanings: 19,
    reports: 22,
    createdAt: "2025-01-22T14:30:00Z",
  },
  {
    id: "mock-4",
    username: "CleanerNiki",
    email: "niki@example.com",
    points: 1840,
    streak: 4,
    role: "User",
    cleanings: 11,
    reports: 14,
    createdAt: "2025-03-15T09:15:00Z",
  },
  {
    id: "mock-5",
    username: "SofiaHero",
    email: "hero@example.com",
    points: 980,
    streak: 2,
    role: "User",
    cleanings: 6,
    reports: 8,
    createdAt: "2025-06-01T11:45:00Z",
  },
  {
    id: "mock-6",
    username: "DanailDimitrov",
    email: "danail@example.com",
    points: 420,
    streak: 1,
    role: "User",
    cleanings: 2,
    reports: 5,
    createdAt: "2025-08-20T16:20:00Z",
  },
  {
    id: "mock-7",
    username: "VeselaP",
    email: "vesela@example.com",
    points: 150,
    streak: 0,
    role: "User",
    cleanings: 1,
    reports: 2,
    createdAt: "2025-10-04T12:00:00Z",
  },
];

export const MOCK_REPORTS = [
  {
    reportId: "r-101",
    description: "Препълнен контейнер пред блок 24, отпадъци разпилени по тротоара",
    latitude: 42.6977,
    longitude: 23.3219,
    district: "Лозенец",
    status: "OPEN",
    severity: "high",
    reporterName: "EcoMaria",
    createdAt: "2026-05-17T09:12:00Z",
    photoUrl: null,
  },
  {
    reportId: "r-102",
    description: "Изоставена строителна тор в парка на Заимов",
    latitude: 42.6953,
    longitude: 23.3402,
    district: "Оборище",
    status: "IN_PROGRESS",
    severity: "critical",
    reporterName: "GreenIvan",
    createdAt: "2026-05-16T15:40:00Z",
    photoUrl: null,
  },
  {
    reportId: "r-103",
    description: "Счупени стъкла на детска площадка",
    latitude: 42.6841,
    longitude: 23.3185,
    district: "Триадица",
    status: "OPEN",
    severity: "critical",
    reporterName: "CleanerNiki",
    createdAt: "2026-05-18T08:20:00Z",
    photoUrl: null,
  },
  {
    reportId: "r-104",
    description: "Графити по новата спирка на бул. Витоша",
    latitude: 42.6912,
    longitude: 23.3199,
    district: "Триадица",
    status: "OPEN",
    severity: "low",
    reporterName: "SofiaHero",
    createdAt: "2026-05-18T11:05:00Z",
    photoUrl: null,
  },
  {
    reportId: "r-105",
    description: "Чували с боклук оставени до контейнерите за рециклиране",
    latitude: 42.7050,
    longitude: 23.3300,
    district: "Изгрев",
    status: "DONE",
    severity: "medium",
    reporterName: "EcoMaria",
    createdAt: "2026-05-14T18:30:00Z",
    photoUrl: null,
  },
  {
    reportId: "r-106",
    description: "Разляно масло на паркинга на метростанция НДК",
    latitude: 42.6864,
    longitude: 23.3194,
    district: "Триадица",
    status: "OPEN",
    severity: "medium",
    reporterName: "TestUser",
    createdAt: "2026-05-19T07:55:00Z",
    photoUrl: null,
  },
  {
    reportId: "r-107",
    description: "Изхвърлен матрак до контейнерите на ул. Г.С. Раковски",
    latitude: 42.6926,
    longitude: 23.3251,
    district: "Оборище",
    status: "IN_PROGRESS",
    severity: "low",
    reporterName: "GreenIvan",
    createdAt: "2026-05-17T13:18:00Z",
    photoUrl: null,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend-next/src/lib/mock/data.ts
git commit -m "feat(next): port MOCK_ME + MOCK_USERS + MOCK_REPORTS to frontend-next"
```

---

## Task 3: Mock dispatcher (TDD)

**Files:**
- Create: `frontend-next/src/lib/mock/dispatcher.ts`
- Create: `frontend-next/src/lib/mock/dispatcher.test.ts`

The dispatcher maps backend paths to mock data. Returns a `Response` object so `serverFetch` can treat the mock and real branches identically.

- [ ] **Step 1: Write the failing tests**

`frontend-next/src/lib/mock/dispatcher.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mockResponse } from "./dispatcher";
import { MOCK_ME, MOCK_USERS, MOCK_REPORTS } from "./data";

describe("mock dispatcher", () => {
  it("GET /users/me returns MOCK_ME with 200", async () => {
    const res = mockResponse("/users/me");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_ME);
  });

  it("GET /users/leaderboard returns MOCK_USERS with 200", async () => {
    const res = mockResponse("/users/leaderboard");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_USERS);
  });

  it("GET /reports returns MOCK_REPORTS with 200", async () => {
    const res = mockResponse("/reports");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_REPORTS);
  });

  it("GET /reports with query string still returns MOCK_REPORTS", async () => {
    const res = mockResponse("/reports?district=Лозенец");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_REPORTS);
  });

  it("GET /reports/r-101 returns the matching report", async () => {
    const res = mockResponse("/reports/r-101");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reportId).toBe("r-101");
  });

  it("GET /reports/missing returns 404", async () => {
    const res = mockResponse("/reports/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("POST mutation returns 200 with null body (no-op in mock mode)", async () => {
    const res = mockResponse("/reports/r-101/claim", { method: "PATCH" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("null");
  });

  it("unmapped GET path returns 501 Not Implemented", async () => {
    const res = mockResponse("/this/path/has/no/mock");
    expect(res.status).toBe(501);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/lib/mock/dispatcher.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`frontend-next/src/lib/mock/dispatcher.ts`:

```ts
import { MOCK_ME, MOCK_USERS, MOCK_REPORTS } from "./data";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function mockResponse(path: string, init?: RequestInit): Response {
  const method = (init?.method ?? "GET").toUpperCase();
  const pathOnly = path.split("?")[0];

  // Mutations: no-op success in mock mode. State for "added" reports etc. lives
  // in client state in Phase 4.
  if (method !== "GET") {
    return json(null);
  }

  if (pathOnly === "/users/me") return json(MOCK_ME);
  if (pathOnly === "/users/leaderboard") return json(MOCK_USERS);
  if (pathOnly === "/reports") return json(MOCK_REPORTS);

  const reportDetail = pathOnly.match(/^\/reports\/([^/]+)$/);
  if (reportDetail) {
    const id = reportDetail[1];
    const found = MOCK_REPORTS.find((r) => r.reportId === id);
    return found ? json(found) : json({ message: "Not Found" }, 404);
  }

  return json({ message: `Mock not implemented for ${method} ${pathOnly}` }, 501);
}
```

- [ ] **Step 4: Tests pass**

```bash
npm test -- src/lib/mock/dispatcher.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/lib/mock/dispatcher.ts frontend-next/src/lib/mock/dispatcher.test.ts
git commit -m "feat(next): mock dispatcher for /users/me, /reports, /users/leaderboard"
```

---

## Task 4: `serverFetch` (TDD)

**Files:**
- Create: `frontend-next/src/lib/api/server.ts`
- Create: `frontend-next/src/lib/api/server.test.ts`

- [ ] **Step 1: Write the failing tests**

`frontend-next/src/lib/api/server.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const cookieStore = new Map<string, { value: string }>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name) && { name, value: cookieStore.get(name)!.value },
    set: () => {},
    delete: () => {},
  }),
}));

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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/lib/api/server.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`frontend-next/src/lib/api/server.ts`:

```ts
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
      (typeof body === "object" && body && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : undefined) ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}
```

`"server-only"` is a tiny `next` package marker — it errors at build time if imported from a client component. Confirms `serverFetch` never ships to the browser.

- [ ] **Step 4: Tests pass**

```bash
npm test -- src/lib/api/server.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/lib/api/server.ts frontend-next/src/lib/api/server.test.ts
git commit -m "feat(next): serverFetch wrapper with mock short-circuit + typed errors"
```

---

## Task 5: Port API namespaces

**Files:**
- Create: `frontend-next/src/lib/api/index.ts`
- Reference (read-only): `frontend/src/services/api.ts`

Mechanical port — same function names and shapes, all built on `serverFetch`. No individual tests; correctness is exercised in Task 7 verification.

- [ ] **Step 1: Write the port**

`frontend-next/src/lib/api/index.ts`:

```ts
import "server-only";
import { serverFetch } from "./server";

export { serverFetch } from "./server";
export { ApiError, UnauthorizedError, isUnauthorized } from "./errors";

export const authApi = {
  refresh: (refreshToken: string) =>
    serverFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  // login / register / logout live in /api/auth/* route handlers — not here.
};

export const reportsApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][]
    ).toString();
    return serverFetch(`/reports${qs ? `?${qs}` : ""}`);
  },
  getById: (id: string | number) => serverFetch(`/reports/${id}`),
  create: (formData: FormData) =>
    serverFetch("/reports", { method: "POST", body: formData }),
  claim: (id: string | number) =>
    serverFetch(`/reports/${id}/claim`, { method: "PATCH" }),
  complete: (id: string | number, formData: FormData) =>
    serverFetch(`/reports/${id}/complete`, { method: "POST", body: formData }),
  confirm: (id: string | number) =>
    serverFetch(`/reports/${id}/confirm`, { method: "POST" }),
  flag: (id: string | number, reason: string) =>
    serverFetch(`/reports/${id}/flag`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  mapPins: (bounds: string) =>
    serverFetch(`/reports/map?bounds=${encodeURIComponent(bounds)}`),
};

export const usersApi = {
  getMe: () => serverFetch("/users/me"),
  updateMe: (p: Record<string, unknown>) =>
    serverFetch("/users/me", { method: "PATCH", body: JSON.stringify(p) }),
  getById: (id: string) => serverFetch(`/users/${id}`),
  getBadges: () => serverFetch("/users/me/badges"),
  getActivity: (page = 0) =>
    serverFetch(`/users/me/activity?page=${page}&size=20`),
  getStats: () => serverFetch("/users/me/stats"),
  getLeaderboard: () => serverFetch("/users/leaderboard"),
};

export const leaderboardApi = {
  get: (period = "week", page = 0) =>
    serverFetch(`/leaderboard?period=${period}&page=${page}&size=20`),
};

export const aiApi = {
  verifyImage: (fd: FormData) =>
    serverFetch("/verifications/check-image", { method: "POST", body: fd }),
  compareImages: (fd: FormData) =>
    serverFetch("/verifications", { method: "POST", body: fd }),
};

export const verificationsApi = {
  verify: (body: Record<string, unknown>) =>
    serverFetch("/verifications", { method: "POST", body: JSON.stringify(body) }),
  getById: (id: number) => serverFetch(`/verifications/${id}`),
  getByTaskId: (taskId: number) => serverFetch(`/verifications/task/${taskId}`),
};

export const statsApi = {
  getGlobal: () => serverFetch("/stats/global"),
  getByDistrict: () => serverFetch("/stats/districts"),
};

export const notificationsApi = {
  list: (unread = false) =>
    serverFetch(`/notifications${unread ? "?unread=true" : ""}`),
  markRead: (id: number) =>
    serverFetch(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () =>
    serverFetch("/notifications/read-all", { method: "PATCH" }),
};
```

- [ ] **Step 2: Sanity-build to catch type errors**

```bash
npx tsc --noEmit
```

Expected: clean. (If `server-only` isn't installed, `npm install server-only` first — it's a 1-line shim provided by Next itself but distributed as a tiny package.)

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/lib/api/index.ts
git commit -m "feat(next): port API namespaces on top of serverFetch"
```

---

## Task 6: Action skeletons for reports

**Files:**
- Create: `frontend-next/src/lib/actions/reports.ts`

Server actions for the mutation surface Phase 4 will need. Each is a thin wrapper around `serverFetch` + `revalidatePath`. No UI calls them yet.

- [ ] **Step 1: Write the actions**

`frontend-next/src/lib/actions/reports.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { reportsApi } from "@/lib/api";

export async function createReport(formData: FormData): Promise<void> {
  await reportsApi.create(formData);
  revalidatePath("/[locale]/reports", "page");
}

export async function claimReport(id: string | number): Promise<void> {
  await reportsApi.claim(id);
  revalidatePath("/[locale]/reports", "page");
  revalidatePath(`/[locale]/reports/${id}`, "page");
}

export async function completeReport(id: string | number, formData: FormData): Promise<void> {
  await reportsApi.complete(id, formData);
  revalidatePath("/[locale]/reports", "page");
  revalidatePath(`/[locale]/reports/${id}`, "page");
}

export async function confirmReport(id: string | number): Promise<void> {
  await reportsApi.confirm(id);
  revalidatePath(`/[locale]/reports/${id}`, "page");
}
```

`revalidatePath("/[locale]/reports", "page")` invalidates the cache for the dynamic route segment across all locales — Next.js documentation pattern for App Router with dynamic segments.

- [ ] **Step 2: Sanity-build**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/lib/actions/reports.ts
git commit -m "feat(next): server-action skeletons for create/claim/complete/confirm report"
```

---

## Task 7: Wire mock data into the reports placeholder (verification)

**Files:**
- Modify: `frontend-next/src/app/[locale]/(app)/reports/page.tsx`

Replace the Phase 2 placeholder with a real `usersApi.getMe()` + `reportsApi.list()` call. Renders a short summary so we can eyeball the mock data flowing through `serverFetch`.

- [ ] **Step 1: Update the page**

`frontend-next/src/app/[locale]/(app)/reports/page.tsx`:

```tsx
import { getSessionToken, MOCK_DEV_TOKEN } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";
import { usersApi, reportsApi, isUnauthorized } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

interface ApiUser {
  id: string;
  username: string;
  points: number;
  reports: number;
  cleanings: number;
}

interface ApiReport {
  reportId: string;
  description: string;
  district: string;
  status: string;
  severity: string;
}

export default async function ReportsPlaceholder({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const token = await getSessionToken();
  const isMock = token === MOCK_DEV_TOKEN;

  let me: ApiUser | null = null;
  let reports: ApiReport[] = [];
  let fetchError: string | null = null;
  try {
    [me, reports] = await Promise.all([
      usersApi.getMe() as Promise<ApiUser>,
      reportsApi.list() as Promise<ApiReport[]>,
    ]);
  } catch (err) {
    if (isUnauthorized(err)) {
      redirect(`/${locale}/login`);
    }
    fetchError = err instanceof Error ? err.message : "Unknown error";
  }

  const logoutAction = logout.bind(null, locale);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 py-16">
      <h1 className="text-accent-pink text-5xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
        CHIST
      </h1>
      <p className="text-text-3 text-xs uppercase tracking-wider">
        {isMock ? "Mock session" : "Real session"}
      </p>

      {fetchError && (
        <p className="text-status-red text-sm">Fetch error: {fetchError}</p>
      )}

      {me && (
        <div className="text-text-1 text-center">
          <p className="text-lg">@{me.username}</p>
          <p className="text-text-2 text-sm">
            {me.points} pts · {me.reports} reports · {me.cleanings} cleanings
          </p>
        </div>
      )}

      {reports.length > 0 && (
        <div className="w-full max-w-md mt-4">
          <p className="text-text-3 text-xs uppercase tracking-wider mb-2">
            {reports.length} reports
          </p>
          <ul className="flex flex-col gap-2">
            {reports.map((r) => (
              <li key={r.reportId} className="rounded-lg border border-brand-border bg-bg-card px-3 py-2">
                <div className="text-text-1 text-sm">{r.description}</div>
                <div className="text-text-3 text-[10px] uppercase tracking-wider mt-1">
                  {r.district} · {r.status} · {r.severity}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-text-3 text-xs mt-4">Full reports UI lands in Phase 4.</p>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">Log out</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Smoke-test against the mock cookie**

```bash
npm run dev > /tmp/next-dev.log 2>&1 &
until curl -s -f http://localhost:3000/api/health > /dev/null; do sleep 1; done

# Login as mock user
rm -f /tmp/cookies.txt
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@chist.bg","password":"test1234"}' \
  -c /tmp/cookies.txt > /dev/null

# Visit reports
echo "Reports page content:"
curl -s -b /tmp/cookies.txt http://localhost:3000/bg/reports | grep -oE "(@TestUser|7 reports|250 pts|Препълнен|Mock session|r-101|r-107)" | sort -u

pkill -f "next dev"
```

Expected: at least these strings appear in the output: `@TestUser`, `Mock session`, `250 pts`, `7 reports` (or "7" near "reports"), and at least one Cyrillic snippet from the mock report descriptions.

If the page renders an error like "Fetch error: ..." instead, that's a clue something is wrong with `serverFetch` or the dispatcher — STOP and diagnose.

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/app/\[locale\]/\(app\)/reports/page.tsx
git commit -m "feat(next): wire usersApi.getMe + reportsApi.list into reports placeholder"
```

---

## Task 8: End-to-end verification

- [ ] **Step 1: Full test suite**

```bash
cd frontend-next && npm test
```

Expected: all tests pass. Phase 2 left us at 21; this phase adds:
- 5 errors tests
- 8 dispatcher tests
- 8 serverFetch tests

Total = 42 passing tests.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: green build. Routes the same as Phase 2 (no new pages — Phase 4 adds those).

- [ ] **Step 3: Manual mock walkthrough**

Open the dev server in a browser:
- `/bg/login` → log in as `test@chist.bg / test1234`
- Land on `/bg/reports` → expect to see `@TestUser`, `250 pts · 4 reports · 2 cleanings`, "7 reports" header, list of 7 Bulgarian-described reports, "Mock session" label, Log out button
- Click Log out → back to `/bg/login`, cookie cleared

- [ ] **Step 4: Tag Phase 3**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git tag -a nextjs-phase-3-complete -m "Phase 3 (data layer + mock) complete: serverFetch + API namespace ports + mock dispatcher render mock data on the reports placeholder."
```

---

## Phase 3 Definition of Done

Every checkbox in Tasks 1–8 ticked, and:
- `serverFetch` is the single backend entrypoint; route handlers in Phase 2 stay untouched (they don't go through it).
- Mock token short-circuits to `mockResponse` — 0 backend calls happen when logged in as `test@chist.bg / test1234`.
- Reports placeholder renders 7 mock reports + TestUser summary.
- All 42 tests pass, build green, old `frontend/` untouched.

## What's NOT in Phase 3 (later)

- **Phase 4:** Navbar, real reports/map UI, server actions wired into UI, photo upload, claim/complete flows.
- **Phase 5:** Leaderboard, Profile, Rewards pages.
- **Phase 6:** i18n migration of the rest of the dictionary, locale switcher.
- **Phase 7:** Helm template integration + cutover.
