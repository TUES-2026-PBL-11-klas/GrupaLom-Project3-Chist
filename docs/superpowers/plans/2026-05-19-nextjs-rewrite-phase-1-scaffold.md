# Next.js Rewrite — Phase 1: Scaffold

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an empty `frontend-next/` Next.js 15 app that boots locally, routes `/` → `/bg`, renders a placeholder at `/[locale]`, exposes a `/api/health` route handler, and has the Dockerfile + Helm overlay needed for staging deploys later.

**Architecture:** Greenfield app in a sibling directory; the old `frontend/` is untouched. Next.js 15 App Router, TypeScript, Tailwind v4 with brand tokens lifted from the current app's `global.css`. next-intl middleware composes with a placeholder auth gate (real auth lands in Phase 2). MapLibre/shadcn deps are installed but not used yet — installing them now means later phases don't have to think about it.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind v4, shadcn/ui, next-intl, lucide-react, maplibre-gl, vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md`

---

## File Structure

**Created in this phase:**

```
frontend-next/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx              # locale-aware HTML, wraps all pages
│   │   │   └── page.tsx                # placeholder "CHIST" landing
│   │   ├── api/
│   │   │   └── health/
│   │   │       └── route.ts            # GET 200 {status:"ok"}
│   │   ├── layout.tsx                  # root layout (font setup, html shell)
│   │   └── globals.css                 # Tailwind imports + @theme brand tokens
│   ├── i18n/
│   │   ├── routing.ts                  # locales + defaultLocale
│   │   └── request.ts                  # next-intl server config
│   ├── lib/
│   │   └── fonts.ts                    # next/font loaders for Bebas Neue, DM Sans, Space Mono
│   └── middleware.ts                   # next-intl middleware (auth gate added in Phase 2)
├── messages/
│   ├── bg.json                         # empty {} for now
│   └── en.json                         # empty {} for now
├── src/app/api/health/route.test.ts    # vitest for health endpoint
├── public/                             # empty, future static assets
├── components.json                     # shadcn config
├── next.config.ts                      # output: "standalone"
├── tailwind.config.ts                  # minimal (most config is in @theme)
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── Dockerfile                          # multi-stage, node:20-alpine, standalone

helm/
└── values-next.yaml                    # staging overlay (new image, port 3000, BACKEND_URL env)
```

**Not touched in this phase:** `frontend/` (the existing Vite app keeps running).

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `frontend-next/` (whole directory tree from `create-next-app`)

- [ ] **Step 1: Run create-next-app**

From `/home/perro/proj/poChist/Grupa-Lom-Project3-poChist/`:

```bash
npx create-next-app@latest frontend-next \
  --typescript \
  --app \
  --tailwind \
  --src-dir \
  --import-alias "@/*" \
  --eslint \
  --no-turbopack \
  --use-npm
```

When prompted about Turbopack, answer No (matches the `--no-turbopack` flag). The flag list is intentional: `--src-dir` for `src/`, `--import-alias "@/*"` so the spec's `@/lib/...` paths work, no Turbopack to keep dev tooling vanilla for now.

- [ ] **Step 2: Verify the scaffold boots**

```bash
cd frontend-next
npm run dev
```

Expected: Next.js dev server listens on `http://localhost:3000`, the default `create-next-app` landing page renders without errors. Stop the server (`Ctrl+C`) after confirming.

- [ ] **Step 3: Commit the scaffold**

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git add frontend-next
git commit -m "chore(next): scaffold Next.js 15 app via create-next-app"
```

---

## Task 2: Install additional dependencies

**Files:**
- Modify: `frontend-next/package.json`

- [ ] **Step 1: Install runtime deps**

From `frontend-next/`:

```bash
npm install next-intl maplibre-gl lucide-react
```

`next-intl` powers Phase 6 i18n but its middleware lands in this phase. `maplibre-gl` is installed now so future installs don't surprise CI. `lucide-react` replaces the same package from the old app.

- [ ] **Step 2: Install dev deps**

```bash
npm install -D vitest @vitejs/plugin-react @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Verify install**

```bash
npm ls next-intl maplibre-gl lucide-react vitest
```

Expected: all four resolved at top level, no `UNMET DEPENDENCY` warnings.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/package.json frontend-next/package-lock.json
git commit -m "chore(next): add next-intl, maplibre-gl, lucide-react, vitest"
```

---

## Task 3: Initialize shadcn/ui

**Files:**
- Create: `frontend-next/components.json`
- Modify: `frontend-next/src/app/globals.css` (shadcn appends its base layer)

- [ ] **Step 1: Run shadcn init**

From `frontend-next/`:

```bash
npx shadcn@latest init -d
```

The `-d` flag accepts the recommended defaults (Tailwind v4, CSS variables on, base color slate, components in `@/components/ui`). This creates `components.json` and adds `@import "tw-animate-css";` plus a `@theme` block to `globals.css`.

- [ ] **Step 2: Sanity-check the generated files**

```bash
cat frontend-next/components.json
grep -E '(@import|@theme)' frontend-next/src/app/globals.css | head
```

Expected: `components.json` exists and lists Tailwind/aliases. `globals.css` contains `@import "tailwindcss";` and a `@theme` block (we will replace this block's contents in Task 4).

- [ ] **Step 3: Install a smoke-test primitive**

```bash
npx shadcn@latest add button
```

Creates `src/components/ui/button.tsx`. We don't render it yet — just confirming the pipeline works.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/components.json frontend-next/src/components frontend-next/src/app/globals.css frontend-next/package.json frontend-next/package-lock.json
git commit -m "chore(next): init shadcn/ui and add Button primitive"
```

---

## Task 4: Port brand tokens into `globals.css`

**Files:**
- Modify: `frontend-next/src/app/globals.css`
- Reference (read-only): `frontend/src/styles/global.css`

- [ ] **Step 1: Replace the `@theme` block with the brand tokens**

Open `frontend-next/src/app/globals.css`. Replace the `@theme` block that `shadcn` generated with the block below. Keep the `@import "tailwindcss";` line and any `@import "tw-animate-css";` shadcn added above it.

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  /* Pink / magenta accents */
  --color-pink-primary: #FF4D94;
  --color-magenta: #C026D3;
  --color-pink-light: #F472B6;
  --color-pink-glow: rgba(255, 77, 148, 0.3);
  --color-accent-pink: #FF4D94;
  --color-accent-pink-dim: rgba(255, 77, 148, 0.12);
  --color-accent-pink-border: rgba(255, 77, 148, 0.35);
  --color-accent-pink-glow: rgba(255, 77, 148, 0.4);

  /* Neutrals */
  --color-primary: #ffffff;
  --color-primary-dim: rgba(255, 255, 255, 0.07);
  --color-primary-border: rgba(255, 255, 255, 0.18);
  --color-primary-glow: rgba(255, 255, 255, 0.15);
  --color-secondary: #cccccc;
  --color-secondary-dim: rgba(255, 255, 255, 0.06);
  --color-accent: #999999;
  --color-accent-dim: rgba(255, 255, 255, 0.05);

  /* Status */
  --color-red: #ff4444;
  --color-red-dim: rgba(255, 68, 68, 0.1);
  --color-green-ok: #aaaaaa;
  --color-green-dim: rgba(255, 255, 255, 0.06);
  --color-orange: #cccccc;

  /* Backgrounds */
  --color-bg-base: #000000;
  --color-bg-surface: #0f0f0f;
  --color-bg-card: rgba(255, 255, 255, 0.04);
  --color-bg-card-hover: rgba(255, 255, 255, 0.07);
  --color-bg-input: rgba(255, 255, 255, 0.05);
  --color-bg-glass: rgba(255, 255, 255, 0.03);

  /* Text */
  --color-text-1: #ffffff;
  --color-text-2: rgba(255, 255, 255, 0.55);
  --color-text-3: rgba(255, 255, 255, 0.3);

  /* Borders */
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-md: rgba(255, 255, 255, 0.15);

  /* Fonts (the actual @font-face / next/font wiring lives in Task 5) */
  --font-display: "Bebas Neue", sans-serif;
  --font-mono: "Space Mono", monospace;
  --font-body: "DM Sans", sans-serif;

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;
}

body {
  background: var(--color-bg-base);
  color: var(--color-text-1);
  font-family: var(--font-body);
}
```

If there are any leftover `--color-*` lines from shadcn's default palette below this block, leave them — they'll be reviewed and pruned in Phase 6 when shadcn primitives get themed against the brand.

- [ ] **Step 2: Cross-check token coverage against the source**

```bash
diff <(grep -oE '\-\-[a-z0-9-]+' frontend/src/styles/global.css | sort -u) \
     <(grep -oE '\-\-color-[a-z0-9-]+|\-\-radius-[a-z]+|\-\-font-[a-z]+' frontend-next/src/app/globals.css | sed 's/-color-//;s/-radius-/r-/;s/-font-/font-/' | sort -u)
```

This is a rough sanity check — names changed (`--bg-base` → `--color-bg-base`, `--r-sm` → `--radius-sm`). Manually skim and confirm every brand token in `frontend/src/styles/global.css` (other than `--nav-h` and similar layout vars — those belong in component CSS, not the theme) has an equivalent in the new `@theme`. There should be no missing colors. If something is missing, add it.

- [ ] **Step 3: Verify Tailwind picks up the tokens**

Edit `frontend-next/src/app/page.tsx` temporarily to render:

```tsx
export default function Home() {
  return (
    <div className="p-8 bg-bg-base text-text-1">
      <h1 className="text-accent-pink text-4xl">CHIST</h1>
    </div>
  );
}
```

Run `npm run dev` and visit `http://localhost:3000`. Expected: black background, white body text, pink "CHIST" heading. Stop the server. (Revert the file — Task 9 writes the real placeholder.)

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/app/globals.css
git commit -m "feat(next): port CHIST brand tokens to Tailwind @theme"
```

---

## Task 5: Wire up brand fonts via `next/font`

**Files:**
- Create: `frontend-next/src/lib/fonts.ts`
- Modify: `frontend-next/src/app/layout.tsx`

- [ ] **Step 1: Create the font loader module**

`frontend-next/src/lib/fonts.ts`:

```ts
import { Bebas_Neue, DM_Sans, Space_Mono } from "next/font/google";

export const fontDisplay = Bebas_Neue({
  subsets: ["latin", "cyrillic"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const fontBody = DM_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

export const fontMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});
```

Note: Bebas Neue doesn't have a Cyrillic subset on Google Fonts. If `npm run dev` later fails on that subset, change `subsets: ["latin"]` for `Bebas_Neue` only — Cyrillic text on display headings will fall back to the system stack, acceptable for now.

- [ ] **Step 2: Apply the fonts in the root layout**

Replace `frontend-next/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { fontDisplay, fontBody, fontMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHIST",
  description: "Sofia · Cleaner City",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

The `lang="bg"` is a placeholder — Task 6's `[locale]/layout.tsx` will override it per-locale.

- [ ] **Step 3: Verify fonts load**

```bash
cd frontend-next && npm run dev
```

Visit `http://localhost:3000`. Expected: page still renders, no console errors about font loading. DevTools → Network → filter `fonts` should show woff2 files served from `/_next/static/media/`. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/lib/fonts.ts frontend-next/src/app/layout.tsx
git commit -m "feat(next): load Bebas Neue, DM Sans, Space Mono via next/font"
```

---

## Task 6: next-intl scaffolding

**Files:**
- Create: `frontend-next/src/i18n/routing.ts`
- Create: `frontend-next/src/i18n/request.ts`
- Create: `frontend-next/src/middleware.ts`
- Create: `frontend-next/src/app/[locale]/layout.tsx`
- Create: `frontend-next/messages/bg.json`
- Create: `frontend-next/messages/en.json`
- Modify: `frontend-next/next.config.ts` (add the next-intl plugin)
- Move: `frontend-next/src/app/page.tsx` → `frontend-next/src/app/[locale]/page.tsx`

- [ ] **Step 1: Create routing config**

`frontend-next/src/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["bg", "en"],
  defaultLocale: "bg",
  localePrefix: "always",
});
```

`localePrefix: "always"` means even the default locale gets `/bg/...` in the URL — matches the spec's `/bg/reports`, `/en/reports` design.

- [ ] **Step 2: Create the server request config**

`frontend-next/src/i18n/request.ts`:

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create the middleware**

`frontend-next/src/middleware.ts`:

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except Next internals, static assets, and api/health
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

Note: `/api/*` is excluded so route handlers (including `/api/health`) bypass locale resolution. Phase 2 will replace this file to compose locale + auth middleware.

- [ ] **Step 4: Wire the next-intl plugin into `next.config.ts`**

Replace `frontend-next/next.config.ts` with:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withNextIntl(nextConfig);
```

`output: "standalone"` is required for the Dockerfile in Task 11; the spec calls for self-hosted Node runtime.

- [ ] **Step 5: Create empty message catalogs**

`frontend-next/messages/bg.json`:

```json
{
  "Home": {
    "title": "CHIST",
    "subtitle": "Sofia · Cleaner City"
  }
}
```

`frontend-next/messages/en.json`:

```json
{
  "Home": {
    "title": "CHIST",
    "subtitle": "Sofia · Cleaner City"
  }
}
```

These exist so Task 8's placeholder page has something to display in both locales.

- [ ] **Step 6: Create the `[locale]` layout**

`frontend-next/src/app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
```

This file does NOT render its own `<html>` or `<body>` — the root layout from Task 5 handles that. The `lang` attribute on the root `<html>` will stay as `"bg"`; per-locale `<html lang>` requires moving font wiring into this layout, which we'll do in Phase 6 alongside the locale switcher.

- [ ] **Step 7: Move the root page to the locale segment**

```bash
mv frontend-next/src/app/page.tsx frontend-next/src/app/[locale]/page.tsx
```

(Contents are still the `create-next-app` default — Task 8 replaces them.)

- [ ] **Step 8: Verify the locale routing works**

```bash
cd frontend-next && npm run dev
```

- Visit `http://localhost:3000` → expected: redirect to `/bg`
- Visit `http://localhost:3000/en` → expected: 200, renders the default Next page
- Visit `http://localhost:3000/de` → expected: 404 (`notFound()`)

Stop the server.

- [ ] **Step 9: Commit**

```bash
git add -A frontend-next/src/app frontend-next/src/i18n frontend-next/src/middleware.ts frontend-next/messages frontend-next/next.config.ts
git commit -m "feat(next): set up next-intl with /[locale] routing"
```

`git add -A` on the `src/app` path stages both the new `[locale]/page.tsx` and the deletion of the old `src/app/page.tsx` from the `mv` in step 7.

---

## Task 7: Set up vitest

**Files:**
- Create: `frontend-next/vitest.config.ts`
- Create: `frontend-next/src/test/setup.ts`
- Modify: `frontend-next/package.json` (add test scripts)

- [ ] **Step 1: Create vitest config**

`frontend-next/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 2: Create test setup**

`frontend-next/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Add test scripts**

Modify `frontend-next/package.json` — under `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Sanity check vitest runs**

```bash
cd frontend-next && npm test
```

Expected: `No test files found` (exit 0 is fine — no tests yet, that's the point of Task 8's first test).

- [ ] **Step 5: Commit**

```bash
git add frontend-next/vitest.config.ts frontend-next/src/test frontend-next/package.json
git commit -m "chore(next): configure vitest with jsdom"
```

---

## Task 8: `/api/health` route handler (TDD)

**Files:**
- Create: `frontend-next/src/app/api/health/route.ts`
- Create: `frontend-next/src/app/api/health/route.test.ts`

- [ ] **Step 1: Write the failing test**

`frontend-next/src/app/api/health/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd frontend-next && npm test -- src/app/api/health/route.test.ts
```

Expected: FAIL with `Cannot find module './route'` (or similar — the route file doesn't exist yet).

- [ ] **Step 3: Implement the route handler**

`frontend-next/src/app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- src/app/api/health/route.test.ts
```

Expected: PASS, 1 test passed.

- [ ] **Step 5: Manually verify against the dev server**

```bash
npm run dev
# in another terminal:
curl -i http://localhost:3000/api/health
```

Expected: `HTTP/1.1 200 OK`, body `{"status":"ok"}`. The middleware matcher from Task 6 excludes `/api`, so this should not be locale-rewritten. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/app/api/health
git commit -m "feat(next): add /api/health route handler for k8s probes"
```

---

## Task 9: Placeholder landing page at `/[locale]`

**Files:**
- Modify: `frontend-next/src/app/[locale]/page.tsx`

- [ ] **Step 1: Replace the page contents**

`frontend-next/src/app/[locale]/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("Home");
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
      <h1 className="text-accent-pink text-6xl tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
        {t("title")}
      </h1>
      <p className="text-text-2 text-sm tracking-wider uppercase">{t("subtitle")}</p>
    </main>
  );
}
```

The inline `style={{ fontFamily: ... }}` is intentional and temporary — once Tailwind v4's `--font-display` token mapping is verified working (Phase 6), this becomes a Tailwind utility class.

- [ ] **Step 2: Verify both locales render**

```bash
cd frontend-next && npm run dev
```

- Visit `http://localhost:3000` → redirects to `/bg`, renders "CHIST" in pink Bebas Neue + "Sofia · Cleaner City" in DM Sans.
- Visit `http://localhost:3000/en` → identical content (catalogs are identical at this stage).
- DevTools → Inspect the H1 → `font-family: "Bebas Neue", sans-serif` resolved, color `rgb(255, 77, 148)`.

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/app/[locale]/page.tsx
git commit -m "feat(next): placeholder /[locale] landing page using brand fonts and tokens"
```

---

## Task 10: Dockerfile

**Files:**
- Create: `frontend-next/Dockerfile`
- Create: `frontend-next/.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

`frontend-next/.dockerignore`:

```
node_modules
.next
.git
.gitignore
README.md
Dockerfile
.dockerignore
.env*.local
npm-debug.log*
.vscode
.idea
```

- [ ] **Step 2: Create the Dockerfile**

`frontend-next/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Build the image locally**

```bash
cd frontend-next
docker build -t chist-frontend-next:phase1 .
```

Expected: build succeeds, three stages, final image around 200-300MB.

If you don't have docker available locally, skip the build step but inspect the Dockerfile manually and commit. The Helm chart in Task 11 still works — the image just gets built in CI.

- [ ] **Step 4: Smoke-test the image**

```bash
docker run --rm -p 3000:3000 chist-frontend-next:phase1
```

Visit `http://localhost:3000/bg`. Expected: "CHIST" page renders identically to dev mode.

```bash
curl -i http://localhost:3000/api/health
```

Expected: `200 OK`, `{"status":"ok"}`.

Stop the container.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/Dockerfile frontend-next/.dockerignore
git commit -m "feat(next): multi-stage Dockerfile with standalone output"
```

---

## Task 11: Helm staging overlay

**Files:**
- Create: `helm/values-next.yaml`

First, check the existing Helm chart layout to fit the conventions:

- [ ] **Step 1: Inspect the current Helm chart**

```bash
ls helm/
find helm -name "values*.yaml" -maxdepth 3 | head
cat helm/Chart.yaml 2>/dev/null | head -20
```

Note the existing structure. The new file follows the existing values-overlay pattern. **If the existing chart structure differs from the assumptions below** (for example, it's a chart-per-service layout, or `values.yaml` has nested keys not shown), adapt the contents to fit — keep the *spirit* of "new image, port 3000, BACKEND_URL env" rather than the exact YAML shape.

- [ ] **Step 2: Create the staging overlay**

`helm/values-next.yaml`:

```yaml
# Staging overlay for the Next.js rewrite (Phase 1 — scaffold only).
# Activate with: helm upgrade ... -f values.yaml -f values-next.yaml

frontend:
  enabled: true
  image:
    repository: chist-frontend-next
    tag: phase1
    pullPolicy: IfNotPresent
  containerPort: 3000
  service:
    port: 80
    targetPort: 3000
  env:
    NODE_ENV: production
    NEXT_TELEMETRY_DISABLED: "1"
    # BACKEND_URL is set in Phase 2; not needed for the scaffold.
  probes:
    liveness:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 10
    readiness:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

- [ ] **Step 3: Lint the chart with the overlay**

```bash
helm lint helm/ -f helm/values.yaml -f helm/values-next.yaml 2>&1 | tail -20
```

(Substitute the correct base values file path if it differs.) Expected: `0 chart(s) failed`, possibly with `INFO` messages. **If lint reports `ERROR`s because the existing chart templates don't reference the keys we added**, that's expected for Phase 1 — the templates get updated in Phase 7 (cutover). Note the errors so Phase 7's plan knows to address them. Do not modify templates in this phase.

- [ ] **Step 4: Commit**

```bash
git add helm/values-next.yaml
git commit -m "feat(helm): staging overlay for Next.js rewrite (phase 1)"
```

---

## Task 12: README pointer

**Files:**
- Create: `frontend-next/README.md`

- [ ] **Step 1: Write a minimal README**

Create `frontend-next/README.md` with the following content (using `~~~` as the outer fence below so the inner triple-backticks render correctly in this plan; the actual file content is just the README, no outer wrapper):

~~~markdown
# frontend-next

Next.js 15 rewrite of `frontend/`. Work in progress — see `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md` for the design and `docs/superpowers/plans/` for per-phase plans.

## Status

Phase 1 — scaffold complete. App boots, redirects `/` → `/bg`, renders a placeholder page in both locales, exposes `/api/health`. No auth, no data fetching, no real UI yet.

## Local development

```bash
npm install
npm run dev
# http://localhost:3000
```

## Tests

```bash
npm test
```

## Docker

```bash
docker build -t chist-frontend-next:dev .
docker run --rm -p 3000:3000 chist-frontend-next:dev
```
~~~

- [ ] **Step 2: Commit**

```bash
git add frontend-next/README.md
git commit -m "docs(next): add README pointing at design + plans"
```

---

## Task 13: End-to-end manual verification

This task has no code — it's the gate that says Phase 1 is done.

- [ ] **Step 1: Fresh install + boot**

```bash
cd frontend-next
rm -rf node_modules .next
npm ci
npm run dev
```

Expected: dev server boots in <10s, no errors.

- [ ] **Step 2: Browser checks**

Open these URLs and confirm the expected behavior:

| URL | Expected |
|---|---|
| `http://localhost:3000` | Redirects to `/bg`, "CHIST" page renders |
| `http://localhost:3000/bg` | Pink "CHIST" + "SOFIA · CLEANER CITY", no console errors |
| `http://localhost:3000/en` | Same content (catalogs match) |
| `http://localhost:3000/de` | 404 page |
| `http://localhost:3000/api/health` | JSON `{"status":"ok"}` |

- [ ] **Step 3: Production build**

```bash
# Stop dev server first
npm run build
```

Expected: build succeeds. Output mentions the `[locale]` segment, the `/api/health` route, and standalone output. No type errors, no missing-translation warnings.

- [ ] **Step 4: Test suite**

```bash
npm test
```

Expected: 1 test file (`route.test.ts`), 1 test, all pass.

- [ ] **Step 5: Verify the old app still works**

```bash
cd ../frontend
npm install   # if needed
npm run dev   # different port if 3000 is taken
```

Visit it — confirm the existing Vite app is unaffected by anything in Phase 1. Stop the server.

- [ ] **Step 6: Final tag**

If everything above passes, mark Phase 1 done with an annotated tag for traceability:

```bash
cd /home/perro/proj/poChist/Grupa-Lom-Project3-poChist
git tag -a nextjs-phase-1-complete -m "Phase 1 (scaffold) complete: frontend-next/ boots, locale routing works, /api/health responds, Dockerfile + Helm overlay ready."
```

---

## Phase 1 Definition of Done

Every checkbox in Tasks 1–13 ticked, and:

- `frontend-next/` boots in dev mode.
- Visiting `/` redirects to `/bg`; `/bg` and `/en` both render the placeholder.
- Brand tokens (`text-accent-pink`, `bg-bg-base`, the font CSS vars) work as Tailwind utilities.
- `/api/health` returns `{"status":"ok"}`.
- `npm test` passes; `npm run build` produces a standalone output.
- Docker image builds and serves the same content as dev.
- `helm/values-next.yaml` exists and lints cleanly against the chart (template integration is Phase 7's job).
- The old `frontend/` app still works unchanged.

## What's NOT in Phase 1 (handled in later phases)

- Auth (Phase 2): no login UI, no cookie, no middleware gate.
- Data fetching (Phase 3): no `serverFetch`, no API wrappers, no mock data port.
- Real pages (Phase 4-5): no reports, leaderboard, profile, rewards.
- Real i18n content (Phase 6): catalogs are placeholders, no `useTranslations` call sites beyond the landing page.
- Cutover (Phase 7): old app still deployed; new app's Helm overlay is staging-only and not yet wired into the cluster's main release.
