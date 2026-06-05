# Next.js Rewrite — Phase 2: Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `frontend-next/` log-in-able. Add httpOnly cookie auth backed by the existing Spring Boot backend, a working `/[locale]/login` UI restyled in shadcn, an auth-gate in `proxy.ts` that redirects unauthenticated requests to login, and a logout server action. Keep the `mock-dev-token` flow working so dev/demo doesn't need a running backend.

**Architecture:** Login is a client form that POSTs to a Next route handler under `/api/auth/login`. The route handler proxies to Spring Boot `${BACKEND_URL}/auth/login`, reads the JWT from the JSON response, and stores it in an httpOnly cookie (`cw_token`). Register and logout follow the same shape. `proxy.ts` (Next 16's renamed middleware file) composes next-intl's locale resolution with an auth gate that redirects unauthenticated visitors of any `(app)/*` route to `/[locale]/login`. Server components and server actions read the cookie via `cookies()` to attach `Authorization: Bearer` headers when calling the backend; the dedicated `serverFetch` wrapper lands in Phase 3.

The mock branch — `test@chist.bg` / `test1234` — sets `cw_token=mock-dev-token` without any backend call. Phase 3's `serverFetch` will short-circuit to mock data when it sees that token value.

**Tech Stack:** Next.js 16, App Router, next-intl 4 (`proxy.ts`), shadcn/ui (`Button`, `Input`, `Label`, `Tabs`), server actions, vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md` §3, §7
**Prior plan:** `docs/superpowers/plans/2026-05-19-nextjs-rewrite-phase-1-scaffold.md` (must be complete before starting)

---

## File Structure

**Created in this phase:**

```
frontend-next/
├── .env.example                                # BACKEND_URL, AUTH_COOKIE_SECURE
├── src/
│   ├── app/[locale]/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                      # centered card shell for unauth routes
│   │   │   └── login/page.tsx                  # login + register tabs UI
│   │   ├── (app)/
│   │   │   ├── layout.tsx                      # protected-route shell (Navbar lands here in Phase 4)
│   │   │   ├── page.tsx                        # /[locale] redirect → /[locale]/reports
│   │   │   └── reports/page.tsx                # placeholder "Logged in" page
│   │   ├── layout.tsx                          # unchanged from Phase 1
│   │   └── page.tsx                            # DELETED (moves into (app)/)
│   ├── app/api/auth/
│   │   ├── login/route.ts + route.test.ts
│   │   ├── logout/route.ts + route.test.ts
│   │   └── register/route.ts + route.test.ts
│   ├── lib/
│   │   ├── auth/session.ts + session.test.ts   # cookie helpers
│   │   └── actions/auth.ts                     # logout server action
│   └── proxy.ts                                # extended: locale + auth composition
└── messages/
    ├── bg.json                                 # + Auth namespace
    └── en.json                                 # + Auth namespace
```

**Not touched in this phase:** `frontend/` (old Vite app). `helm/values-next.yaml` (will get `BACKEND_URL` env in Phase 7 cutover). Reports / Leaderboard / Profile / Rewards (Phases 4–5).

---

## Task 1: Env configuration

**Files:**
- Create: `frontend-next/.env.example`
- Create: `frontend-next/.env.local` (gitignored — local dev only)

- [ ] **Step 1: Write `.env.example`**

```
# URL where the Spring Boot backend is reachable from the Node runtime.
# Server-side only — never NEXT_PUBLIC_.
BACKEND_URL=http://localhost:8080/api

# httpOnly cookie security flag. Set to "true" in prod (HTTPS), "false" in local dev.
AUTH_COOKIE_SECURE=false
```

- [ ] **Step 2: Write `.env.local` (gitignored)**

Same content as `.env.example`. `create-next-app` puts `.env*.local` in `.gitignore` by default — verify with `grep '.env' frontend-next/.gitignore` before relying on it. If `.env.local` would be tracked, STOP and report.

- [ ] **Step 3: Verify the values are reachable**

```bash
cd frontend-next
node -e 'require("dotenv").config({path:".env.local"}); console.log(process.env.BACKEND_URL)'
```

Expected: `http://localhost:8080/api`. (If `dotenv` isn't installed — it shouldn't be; Next loads `.env.local` automatically at runtime — verify by adding a `console.log(process.env.BACKEND_URL)` to a route handler during step 4 of Task 3 instead.)

- [ ] **Step 4: Commit**

```bash
git add frontend-next/.env.example
git commit -m "chore(next): add .env.example for BACKEND_URL + AUTH_COOKIE_SECURE"
```

`.env.local` stays uncommitted (gitignored).

---

## Task 2: Session cookie helpers (TDD)

**Files:**
- Create: `frontend-next/src/lib/auth/session.ts`
- Create: `frontend-next/src/lib/auth/session.test.ts`

The helpers wrap Next 16's `cookies()` API (which returns a Promise in App Router) so route handlers and server actions don't repeat cookie config.

- [ ] **Step 1: Write the failing tests**

`frontend-next/src/lib/auth/session.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend-next && npm test -- src/lib/auth/session.test.ts
```

Expected: FAIL — module `./session` doesn't exist.

- [ ] **Step 3: Implement the helpers**

`frontend-next/src/lib/auth/session.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/lib/auth/session.test.ts
```

Expected: 6 tests, all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/lib/auth
git commit -m "feat(next): session cookie helpers (cw_token, httpOnly, sameSite=lax)"
```

---

## Task 3: `/api/auth/login` route handler (TDD)

**Files:**
- Create: `frontend-next/src/app/api/auth/login/route.ts`
- Create: `frontend-next/src/app/api/auth/login/route.test.ts`

The handler accepts `{email, password}` JSON, branches on mock credentials, otherwise POSTs to `${BACKEND_URL}/auth/login`. On success: set cookie, return `{ok:true}`. On failure: return `{ok:false, message}` with appropriate status.

- [ ] **Step 1: Write the failing tests**

`frontend-next/src/app/api/auth/login/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/app/api/auth/login/route.test.ts
```

Expected: FAIL — module `./route` doesn't exist.

- [ ] **Step 3: Implement the route handler**

`frontend-next/src/app/api/auth/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { setSessionCookie, MOCK_DEV_TOKEN } from "@/lib/auth/session";

const MOCK_EMAIL = "test@chist.bg";
const MOCK_PASSWORD = "test1234";
const DEFAULT_MAX_AGE = 60 * 60 * 24; // 24h fallback when backend doesn't return expiresIn

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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/app/api/auth/login/route.test.ts
```

Expected: 5 tests, all pass.

- [ ] **Step 5: Manual smoke test against dev server**

```bash
npm run dev &
until curl -s -f http://localhost:3000/api/health > /dev/null; do sleep 1; done

# Mock creds — expect 200
echo "Mock: "
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@chist.bg","password":"test1234"}' \
  -c /tmp/cookies.txt -w " | HTTP %{http_code}\n"

# Cookie should be set
echo "Cookie: "
grep cw_token /tmp/cookies.txt

# Bad creds (no backend) — expect 502
echo "No backend: "
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"someone@example.com","password":"x"}' \
  -w " | HTTP %{http_code}\n"

pkill -f "next dev"
```

Expected: mock returns 200 + cookie set; real attempt with no backend returns 502 (or whatever happens when `BACKEND_URL` isn't reachable).

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/app/api/auth/login
git commit -m "feat(next): POST /api/auth/login with mock-creds branch + JWT cookie"
```

---

## Task 4: `/api/auth/logout` route handler (TDD)

**Files:**
- Create: `frontend-next/src/app/api/auth/logout/route.ts`
- Create: `frontend-next/src/app/api/auth/logout/route.test.ts`

- [ ] **Step 1: Write the failing tests**

`frontend-next/src/app/api/auth/logout/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/app/api/auth/logout/route.test.ts
```

Expected: FAIL — `./route` doesn't exist.

- [ ] **Step 3: Implement**

`frontend-next/src/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getSessionToken, clearSessionCookie, MOCK_DEV_TOKEN } from "@/lib/auth/session";

export async function POST() {
  const token = await getSessionToken();

  if (token && token !== MOCK_DEV_TOKEN) {
    try {
      await fetch(`${process.env.BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Backend unreachable — still clear our cookie so the user can log in again.
    }
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Tests pass**

```bash
npm test -- src/app/api/auth/logout/route.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/app/api/auth/logout
git commit -m "feat(next): POST /api/auth/logout (best-effort backend call + cookie clear)"
```

---

## Task 5: `/api/auth/register` route handler (TDD)

**Files:**
- Create: `frontend-next/src/app/api/auth/register/route.ts`
- Create: `frontend-next/src/app/api/auth/register/route.test.ts`

Mirrors login but for `{username, email, password}` against `${BACKEND_URL}/auth/register`. The mock branch fires when `email === "test@chist.bg"` (any password length ≥8) — useful for offline demo of the register flow.

- [ ] **Step 1: Write the failing tests**

`frontend-next/src/app/api/auth/register/route.test.ts`:

```ts
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

  it("mock-mode register: email matches sentinel → cookie set, no backend call", async () => {
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/app/api/auth/register/route.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`frontend-next/src/app/api/auth/register/route.ts`:

```ts
import { NextResponse } from "next/server";
import { setSessionCookie, MOCK_DEV_TOKEN } from "@/lib/auth/session";

const MOCK_EMAIL = "test@chist.bg";
const DEFAULT_MAX_AGE = 60 * 60 * 24;
const MIN_PASSWORD = 8;

export async function POST(req: Request) {
  let body: { email?: string; username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const { email, username, password } = body;
  if (!email || !username || !password) {
    return NextResponse.json({ ok: false, message: "All fields are required" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, message: `Password must be at least ${MIN_PASSWORD} characters` },
      { status: 400 }
    );
  }

  if (email === MOCK_EMAIL) {
    await setSessionCookie(MOCK_DEV_TOKEN, DEFAULT_MAX_AGE);
    return NextResponse.json({ ok: true });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${process.env.BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
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
```

- [ ] **Step 4: Tests pass**

```bash
npm test -- src/app/api/auth/register/route.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/app/api/auth/register
git commit -m "feat(next): POST /api/auth/register with mock-creds + validation"
```

---

## Task 6: Auth-aware `proxy.ts`

**Files:**
- Modify: `frontend-next/src/proxy.ts`

The current `proxy.ts` is only the next-intl middleware. We extend it: after locale resolution, check the cookie; if missing and the path is inside `(app)/*` (i.e., not the login page), redirect to `/[locale]/login`.

Route groups `(auth)` and `(app)` don't appear in URLs. We identify "public" paths by name: `/[locale]/login` (and future `/[locale]/register` if we add it as its own route).

- [ ] **Step 1: Replace `src/proxy.ts`**

```ts
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATH_PATTERNS = [/^\/login(\/.*)?$/];

export default function proxy(req: NextRequest) {
  // Let next-intl handle locale resolution / redirect first.
  const intlResponse = intlMiddleware(req);
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  const { pathname } = req.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return intlResponse;

  const locale = segments[0];
  const rest = "/" + segments.slice(1).join("/");

  const isPublic = PUBLIC_PATH_PATTERNS.some((p) => p.test(rest));
  if (isPublic) return intlResponse;

  const hasSession = req.cookies.has("cw_token");
  if (hasSession) return intlResponse;

  const loginUrl = new URL(`/${locale}/login`, req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match all paths except Next internals, static assets, and api routes (so /api/* bypasses locale + auth gating).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Verify with manual smoke test**

From `frontend-next/`:

```bash
npm run dev &
until curl -s -f http://localhost:3000/api/health > /dev/null; do sleep 1; done

echo "Unauth /bg (no cookie): "
curl -s -o /dev/null -w "HTTP %{http_code} -> %{redirect_url}\n" http://localhost:3000/bg

echo "Unauth /bg/reports: "
curl -s -o /dev/null -w "HTTP %{http_code} -> %{redirect_url}\n" http://localhost:3000/bg/reports

echo "Unauth /bg/login (should NOT redirect): "
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/bg/login

echo "API health (always public): "
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/api/health

pkill -f "next dev"
```

Expected: unauth `/bg` and `/bg/reports` both redirect (307/308) to `/bg/login`. `/bg/login` returns 200 (or 404 if Task 8 hasn't built the page yet — that's fine, the point is no redirect). `/api/health` returns 200.

Note: `/bg/login` will 404 in isolation because Task 8 hasn't created it yet. The smoke test just needs to confirm there's NO redirect on `/bg/login` — the response code can be 404, that's expected at this point.

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/proxy.ts
git commit -m "feat(next): auth gate in proxy.ts — redirect unauth to /[locale]/login"
```

---

## Task 7: Restructure routes around `(app)` and `(auth)` groups

**Files:**
- Create: `frontend-next/src/app/[locale]/(app)/layout.tsx`
- Create: `frontend-next/src/app/[locale]/(app)/page.tsx`
- Create: `frontend-next/src/app/[locale]/(app)/reports/page.tsx`
- Create: `frontend-next/src/app/[locale]/(auth)/layout.tsx`
- Delete: `frontend-next/src/app/[locale]/page.tsx` (the CHIST placeholder — moves into `(app)`)

After this task, the route tree is:
- `/[locale]/` → renders `(app)/page.tsx` (protected — redirects to `/[locale]/reports` once authenticated; the proxy bounces unauth to login first)
- `/[locale]/reports` → renders `(app)/reports/page.tsx` (placeholder until Phase 4)
- `/[locale]/login` → renders `(auth)/login/page.tsx` (built in Task 8)

- [ ] **Step 1: Create `(app)/layout.tsx`**

`frontend-next/src/app/[locale]/(app)/layout.tsx`:

```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
```

Minimal for now. Phase 4 adds the Navbar here.

- [ ] **Step 2: Create `(app)/page.tsx` (redirect)**

`frontend-next/src/app/[locale]/(app)/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default async function LocaleRoot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/reports`);
}
```

This handles `/bg` and `/en` post-auth: server-side redirects them to `/[locale]/reports`.

- [ ] **Step 3: Create the reports placeholder**

`frontend-next/src/app/[locale]/(app)/reports/page.tsx`:

```tsx
import { getSessionToken, MOCK_DEV_TOKEN } from "@/lib/auth/session";

export default async function ReportsPlaceholder() {
  const token = await getSessionToken();
  const isMock = token === MOCK_DEV_TOKEN;
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-accent-pink text-5xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
        CHIST
      </h1>
      <p className="text-text-1 text-base">Logged in.</p>
      <p className="text-text-3 text-xs uppercase tracking-wider">
        {isMock ? "Mock session — no backend" : "Real session"}
      </p>
      <p className="text-text-3 text-xs">Reports list arrives in Phase 4.</p>
    </main>
  );
}
```

- [ ] **Step 4: Create `(auth)/layout.tsx`**

`frontend-next/src/app/[locale]/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
```

- [ ] **Step 5: Delete the old `[locale]/page.tsx`**

```bash
rm frontend-next/src/app/[locale]/page.tsx
```

The CHIST landing it rendered now lives inside `(app)/page.tsx` (as a redirect) and `(app)/reports/page.tsx` (placeholder).

- [ ] **Step 6: Commit**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git add -A frontend-next/src/app/\[locale\]
git commit -m "feat(next): split routes into (auth) and (app) groups with locale-aware redirect"
```

`git add -A` on the `[locale]` path stages both the new files and the deletion of the old `page.tsx`.

---

## Task 8: Auth namespace i18n + Login UI page

**Files:**
- Modify: `frontend-next/messages/bg.json` — add `Auth` namespace
- Modify: `frontend-next/messages/en.json` — add `Auth` namespace
- Create: `frontend-next/src/app/[locale]/(auth)/login/page.tsx`
- Create: `frontend-next/src/components/auth/LoginCard.tsx`

shadcn primitives needed: `Input`, `Label`, `Tabs`, `Button` (Button is already installed from Phase 1 Task 3).

- [ ] **Step 1: Install shadcn primitives**

From `frontend-next/`:

```bash
npx shadcn@latest add input label tabs
```

Creates `src/components/ui/input.tsx`, `label.tsx`, `tabs.tsx`. Accept defaults.

- [ ] **Step 2: Extend bg.json**

Add the `Auth` block to `frontend-next/messages/bg.json` (preserve the existing `Home` block):

```json
{
  "Home": {
    "title": "CHIST",
    "subtitle": "Sofia · Cleaner City"
  },
  "Auth": {
    "tabs": { "login": "ВХОД", "register": "РЕГИСТРАЦИЯ" },
    "email": "Имейл",
    "emailPlaceholder": "you@example.com",
    "password": "Парола",
    "passwordPlaceholder": "••••••••",
    "username": "Потребителско име",
    "usernamePlaceholder": "GreenWarrior99",
    "confirmPassword": "Потвърди парола",
    "minPasswordHint": "минимум 8 символа",
    "submitLogin": "ВХОД",
    "submitRegister": "СЪЗДАЙ АКАУНТ",
    "submitting": "Изпращане...",
    "errorRequired": "Попълнете всички полета.",
    "errorMismatch": "Паролите не съвпадат.",
    "errorMinLength": "Паролата трябва да е минимум 8 символа.",
    "errorGeneric": "Възникна грешка. Опитайте отново.",
    "switchToRegister": "Нямате акаунт? РЕГИСТРАЦИЯ →",
    "switchToLogin": "← ВЕЧЕ ИМАМ АКАУНТ"
  }
}
```

- [ ] **Step 3: Extend en.json**

Add the same `Auth` namespace in English:

```json
{
  "Home": {
    "title": "CHIST",
    "subtitle": "Sofia · Cleaner City"
  },
  "Auth": {
    "tabs": { "login": "LOG IN", "register": "REGISTER" },
    "email": "Email",
    "emailPlaceholder": "you@example.com",
    "password": "Password",
    "passwordPlaceholder": "••••••••",
    "username": "Username",
    "usernamePlaceholder": "GreenWarrior99",
    "confirmPassword": "Confirm password",
    "minPasswordHint": "min. 8 characters",
    "submitLogin": "LOG IN",
    "submitRegister": "CREATE ACCOUNT",
    "submitting": "Submitting...",
    "errorRequired": "Fill in all fields.",
    "errorMismatch": "Passwords don't match.",
    "errorMinLength": "Password must be at least 8 characters.",
    "errorGeneric": "Something went wrong. Try again.",
    "switchToRegister": "Don't have an account? REGISTER →",
    "switchToLogin": "← ALREADY HAVE AN ACCOUNT"
  }
}
```

- [ ] **Step 4: Build the LoginCard client component**

`frontend-next/src/components/auth/LoginCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Leaf } from "lucide-react";

type Mode = "login" | "register";

export function LoginCard() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirm, setConfirm] = useState("");

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError(t("errorRequired"));
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? t("errorGeneric"));
        return;
      }
      router.push(`/${locale}/reports`);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !email || !password) return setError(t("errorRequired"));
    if (password !== confirm) return setError(t("errorMismatch"));
    if (password.length < 8) return setError(t("errorMinLength"));
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? t("errorGeneric"));
        return;
      }
      router.push(`/${locale}/reports`);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-bg-card backdrop-blur p-8 shadow-2xl">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="rounded-full bg-accent-pink-dim border border-accent-pink-border p-3 text-accent-pink">
          <Leaf size={28} strokeWidth={1.8} />
        </div>
        <div className="text-text-1 text-3xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
          CHIST
        </div>
        <div className="text-text-3 text-[10px] uppercase tracking-[0.3em]">Sofia · Cleaner City</div>
      </div>

      <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(null); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login">{t("tabs.login")}</TabsTrigger>
          <TabsTrigger value="register">{t("tabs.register")}</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={submitLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email" className="text-text-2 text-xs uppercase tracking-wider">{t("email")}</Label>
              <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")} autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password" className="text-text-2 text-xs uppercase tracking-wider">{t("password")}</Label>
              <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")} autoComplete="current-password" required />
            </div>
            {error && <div className="text-status-red text-sm">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? t("submitting") : t("submitLogin")}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={submitRegister} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-username" className="text-text-2 text-xs uppercase tracking-wider">{t("username")}</Label>
              <Input id="reg-username" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder={t("usernamePlaceholder")} autoComplete="username" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-email" className="text-text-2 text-xs uppercase tracking-wider">{t("email")}</Label>
              <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")} autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-password" className="text-text-2 text-xs uppercase tracking-wider">{t("password")}</Label>
              <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t("minPasswordHint")} autoComplete="new-password" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-confirm" className="text-text-2 text-xs uppercase tracking-wider">{t("confirmPassword")}</Label>
              <Input id="reg-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("passwordPlaceholder")} autoComplete="new-password" required />
            </div>
            {error && <div className="text-status-red text-sm">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? t("submitting") : t("submitRegister")}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 5: Build the login page (server component shell)**

`frontend-next/src/app/[locale]/(auth)/login/page.tsx`:

```tsx
import { LoginCard } from "@/components/auth/LoginCard";

export default function LoginPage() {
  return <LoginCard />;
}
```

The page is intentionally tiny — the whole form lives in `LoginCard` (a client component, since it needs `useState` and `useRouter`).

- [ ] **Step 6: Manual UI smoke test**

```bash
npm run dev &
until curl -s -f http://localhost:3000/api/health > /dev/null; do sleep 1; done

# Visit the login page — should render 200 (no redirect, public)
curl -s -o /dev/null -w "/bg/login: %{http_code}\n" http://localhost:3000/bg/login
curl -s -o /dev/null -w "/en/login: %{http_code}\n" http://localhost:3000/en/login

# Visit /bg/reports without cookie — should redirect to login
curl -s -o /dev/null -w "/bg/reports unauth: %{http_code} -> %{redirect_url}\n" http://localhost:3000/bg/reports

pkill -f "next dev"
```

Expected: both `/login` pages return 200; `/bg/reports` redirects to `/bg/login`.

Also: open `http://localhost:3000/bg/login` in a browser and confirm the login card renders — pink Leaf icon, "CHIST" display heading, both tabs working, error states fire on empty submit. (Visual verification optional but recommended.)

- [ ] **Step 7: Commit**

```bash
git add frontend-next/messages frontend-next/src/components frontend-next/src/app/\[locale\]/\(auth\)/login
git commit -m "feat(next): login + register UI with shadcn Tabs/Input/Label and i18n"
```

---

## Task 9: Logout server action

**Files:**
- Create: `frontend-next/src/lib/actions/auth.ts`
- Modify: `frontend-next/src/app/[locale]/(app)/reports/page.tsx` (add a logout button so we can verify end-to-end)

- [ ] **Step 1: Create the server action**

`frontend-next/src/lib/actions/auth.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function logout(locale: string): Promise<void> {
  // Call the route handler so logout logic (backend revoke + cookie clear) lives in one place.
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  await fetch(`${process.env.AUTH_INTERNAL_URL ?? "http://localhost:3000"}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
  }).catch(() => {
    // If the internal fetch fails, fall back to clearing the cookie directly.
    jar.delete("cw_token");
  });

  redirect(`/${locale}/login`);
}
```

Note on `AUTH_INTERNAL_URL`: in a containerized k8s deployment, `localhost:3000` works because the Next.js server is in the same pod calling itself. In other deployment topologies this might need a different value — add it to `.env.example` as an optional override.

Also update `.env.example`:

```
# Internal URL the Next.js server uses to call its own route handlers from server actions.
# Defaults to http://localhost:3000 (works inside a single pod/container).
# AUTH_INTERNAL_URL=
```

- [ ] **Step 2: Wire a logout button into the reports placeholder**

Edit `frontend-next/src/app/[locale]/(app)/reports/page.tsx`:

```tsx
import { getSessionToken, MOCK_DEV_TOKEN } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default async function ReportsPlaceholder({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const token = await getSessionToken();
  const isMock = token === MOCK_DEV_TOKEN;

  const logoutAction = logout.bind(null, locale);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-accent-pink text-5xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
        CHIST
      </h1>
      <p className="text-text-1 text-base">Logged in.</p>
      <p className="text-text-3 text-xs uppercase tracking-wider">
        {isMock ? "Mock session — no backend" : "Real session"}
      </p>
      <p className="text-text-3 text-xs">Reports list arrives in Phase 4.</p>
      <form action={logoutAction} className="mt-4">
        <Button type="submit" variant="outline">Log out</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Smoke-test the full login → reports → logout loop**

```bash
npm run dev &
until curl -s -f http://localhost:3000/api/health > /dev/null; do sleep 1; done

# 1. Unauth /bg/reports → redirect to /bg/login
echo "1) "
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/bg/reports

# 2. Login with mock creds → 200, cookie set
echo "2) "
rm -f /tmp/cookies.txt
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@chist.bg","password":"test1234"}' \
  -c /tmp/cookies.txt -w "HTTP %{http_code}\n"
grep cw_token /tmp/cookies.txt

# 3. Visit /bg/reports WITH cookie → 200
echo "3) "
curl -s -o /dev/null -w "HTTP %{http_code}\n" -b /tmp/cookies.txt http://localhost:3000/bg/reports

# 4. Logout → cookie cleared
echo "4) "
curl -s -X POST http://localhost:3000/api/auth/logout -b /tmp/cookies.txt -c /tmp/cookies.txt -w "HTTP %{http_code}\n"
grep cw_token /tmp/cookies.txt && echo "BAD: cookie still set" || echo "good: cookie cleared"

# 5. Visit /bg/reports again → redirect to login (no cookie)
echo "5) "
curl -s -o /dev/null -w "HTTP %{http_code} -> %{redirect_url}\n" http://localhost:3000/bg/reports

pkill -f "next dev"
```

Expected output sequence:
1. `307 -> http://localhost:3000/bg/login`
2. `HTTP 200`, then a line showing the `cw_token` cookie in the cookie jar
3. `HTTP 200`
4. `HTTP 200`, then `good: cookie cleared`
5. `307 -> http://localhost:3000/bg/login`

If any step deviates significantly, STOP and investigate before committing.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/lib/actions frontend-next/src/app/\[locale\]/\(app\)/reports/page.tsx frontend-next/.env.example
git commit -m "feat(next): logout server action + logout button in reports placeholder"
```

---

## Task 10: End-to-end verification

This task has no code — it's the gate that says Phase 2 is done.

- [ ] **Step 1: Run the full test suite**

```bash
cd frontend-next && npm test
```

Expected: all tests pass — session helpers (6), login route (5), logout route (4), register route (5), plus the existing `/api/health` test (1). Total = 21 passing tests.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: build succeeds. Routes listed should include `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, `/[locale]/login`, `/[locale]/reports`, and the Proxy middleware.

- [ ] **Step 3: Browser walkthrough (manual — recommended)**

```bash
npm run dev
```

Visit each of these in a browser:

| URL | Expected |
|---|---|
| `http://localhost:3000/` | redirects to `/bg/login` (unauth) |
| `http://localhost:3000/bg/reports` | redirects to `/bg/login` |
| `http://localhost:3000/bg/login` | renders login card with brand styling |
| Submit empty form | shows "Fill in all fields" error |
| Submit `test@chist.bg` / `test1234` | redirects to `/bg/reports`, shows "Mock session" |
| Click "Log out" | redirects to `/bg/login`, cookie cleared |
| Switch to Register tab | renders register form with 4 fields |
| Submit register with `test@chist.bg`, any username, `test1234`, `test1234` | redirects to `/bg/reports` |
| Visit `/en/login` | English copy ("LOG IN", "REGISTER", etc.) |

Stop the dev server.

- [ ] **Step 4: Tag Phase 2**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git tag -a nextjs-phase-2-complete -m "Phase 2 (auth) complete: login + register + logout work end-to-end with mock and real credential paths; proxy.ts gates protected routes."
```

---

## Phase 2 Definition of Done

Every checkbox in Tasks 1–10 ticked, and:

- Visiting any `(app)/*` path while unauthenticated redirects to `/[locale]/login`.
- `test@chist.bg / test1234` logs in offline, sets `cw_token=mock-dev-token`, lands on `/[locale]/reports` placeholder.
- Real credentials proxy through to Spring Boot when `BACKEND_URL` is reachable.
- Logout clears the cookie and redirects back to `/[locale]/login`.
- Register flow works for both mock and real paths.
- All 21 vitest tests pass.
- Production build succeeds.
- The old `frontend/` directory is untouched.

## What's NOT in Phase 2 (handled later)

- **Phase 3:** the `serverFetch` data-layer wrapper and mock data port. The reports placeholder will keep showing "Logged in" until Phase 3 wires real data calls and Phase 4 builds the reports UI.
- **Phase 4:** Navbar with logout button (currently inline on the placeholder), real reports list, MapView.
- **Phase 6:** locale switcher in the navbar, proper `<html lang>` per locale.
- **Phase 7:** Helm template updates so `BACKEND_URL` and the auth cookie flag are wired into the deployed pod.
