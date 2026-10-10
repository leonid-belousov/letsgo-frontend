# lets_go_front

## 1. Purpose

Let'sGo web client. Consumes `lets_go_back` only; the backend decides what the user may do. (The docs do not mandate a web product — this is a technical foundation.)

## 2. Technology stack

React 19 · TypeScript (strict) · Vite · React Router · TanStack Query · React Hook Form + Zod · Zustand (client-only state) · Vitest + Testing Library · ESLint + Prettier. No UI kit: a small internal design system (`src/design`) built on tokens sampled from the approved UI boards.

## 3. Requirements

Node.js ≥ 20, npm ≥ 10. (TypeScript is pinned to 5.9 for `openapi-typescript`/`typescript-eslint` peer ranges.)

## 4. Installation

```bash
npm install
cp .env.example .env
```

## 5. Environment variables

`VITE_API_BASE_URL` — backend base URL (default `http://localhost:3000`). Only `VITE_*` values reach the browser: no secrets.

## 6. Local development

```bash
npm run dev     # http://localhost:5173 (start lets_go_back first for API status)
```

## 7. Build

`npm run build` (typecheck + production bundle in `dist/`).

## 8. Test

`npm test`

## 9. Lint

`npm run lint` · `npm run typecheck` · `npm run format:check`

## 10. Architecture notes

- `src/api` — fetch wrapper mapping the backend error envelope to `ApiRequestError`; `userMessageFor()` holds the approved user-facing messages. Error codes are currently mirrored by hand — replace with `npm run api:generate` (openapi-typescript against `/docs/openapi.json`) once endpoints exist.
- `src/routes` — route registry (`routes.ts`), app shell with bottom nav (Home, Discovery, +, Chat, Profile), placeholder pages for the route groups in Handoff §11.
- `src/design` — tokens (`tokens.css`), components, states (loading/empty/error). Light theme only: no dark palette is designed. Touch targets ≥ 48px. Required marker `*` stays neutral black; red is only for concrete errors.
- `src/i18n` — `t()` seam; no language list is approved yet.
- Never hard-code sample data (names, prices, ratings) from the mockups.
