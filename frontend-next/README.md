# frontend-next

Next.js 16 rewrite of `frontend/`. Work in progress — see `docs/superpowers/specs/2026-05-19-nextjs-rewrite-design.md` for the design and `docs/superpowers/plans/` for per-phase plans.

## Status

Phase 1 — scaffold complete. App boots, redirects `/` to `/bg`, renders a placeholder page in both locales (`bg`, `en`), exposes `/api/health`. No auth, no data fetching, no real UI yet.

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

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · next-intl · MapLibre GL · lucide-react · vitest.
