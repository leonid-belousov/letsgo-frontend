# CLAUDE.md — lets_go_front

## 1. Purpose
Let'sGo web client (technical foundation; the docs do not mandate a web product). Renders backend state; **never decides authorization**.

## 2. Stack
React 19 · TypeScript strict · Vite · React Router 7 · TanStack Query · React Hook Form + Zod · Zustand (client-only state) · Vitest + Testing Library · ESLint + Prettier · openapi-typescript (planned).

## 3. Architecture decisions
Server state = TanStack Query; UI/client state = Zustand only when needed. No Redux, no big UI kit — internal design system (`src/design`) built from tokens sampled from the approved UI PDF. API types will be **generated** from `lets_go_back` `/docs/openapi.json` (`npm run api:generate`); until then `src/api/errors.ts` mirrors the error codes.

## 4. Structure
`src/api` (fetch wrapper, errors) · `src/routes` (registry, shell, pages) · `src/design` (tokens.css, components) · `src/i18n` (`t()` seam) · `src/stores` · `src/test`.

## 5. Commands
`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run format:check` · `npm run api:generate` (backend must be running).

## 6. Environment
`VITE_API_BASE_URL` (default http://localhost:3000). Only `VITE_*` reaches the browser — no secrets.

## 7. Conventions
Strict TS, `@/` alias, type-only imports, no `any`. Touch targets ≥ 48px. Required marker `*` stays neutral black; red only for concrete errors. Light theme only (no dark design). Do not hard-code sample data (names, prices, ratings) from mockups.

## 8. Testing
Vitest + Testing Library for components/api client. Test error mapping and disabled/empty/error states.

## 9. Security
No tokens in localStorage without a decided strategy (OPEN for web). Never render private data the API did not send. No secrets in `VITE_*`.

## 10. Business constraints
Buttons/actions render from server **capabilities** (`canJoin`, `canConfirmCash`, …), never from role names or cached UI. Pay is disabled; Pay cash → Cash received → Paid is server-driven. Handle error codes: VALIDATION, ACCESS_DENIED, EXPIRED, CAPACITY_CHANGED, BOOKING_CONFLICT, VERSION_CHANGED, UPLOAD_FAILED with the approved messages.

## 11. Source of truth
Backend API + `../PROJECT_ANALYSIS.md`; visuals: approved UI PDF (newest correction wins).

## 12. MUST NOT
Re-scaffold the app; duplicate backend DTOs by hand once generation exists; implement backend rules client-side; invent product behavior (see `../OPEN_DECISIONS.md`).

## 13. Definition of Done
typecheck + lint + tests + build green; states (loading/empty/error/offline) covered; no client-side authorization.

## 14. Docs
`../PROJECT_ANALYSIS.md`, `../BACKEND_IMPLEMENTATION_REPORT.md`, `/docs/openapi.json` of the backend.

## 15. OPEN
Web token storage strategy, language list, font, dark theme, whether web is a product at all.
