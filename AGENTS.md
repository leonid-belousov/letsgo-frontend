# AGENTS.md — lets_go_front

**Scope**: only this standalone web repository. Historical `lets_go_front/**` paths denote its root. Shared workspace documents are in `docs/project`. Backend code belongs to the separate `letsgo-backend` repository; do not edit it from here.
**Authoritative**: backend OpenAPI, `PROJECT_ANALYSIS.md`, `OPEN_DECISIONS.md`, approved UI PDF.
**Architecture**: pages in `src/routes`, API access only through `src/api`, shared UI only from `src/design`. Query keys are stable arrays; mutations invalidate precisely.
**Dependencies**: justify each new package (needed, maintained, compatible with React 19/Vite, not solvable by platform). TypeScript is pinned to 5.9 (peer ranges).
**API rules**: use generated types once available; send `Idempotency-Key` for double-apply-sensitive writes; map error codes via `userMessageFor`.
**Security**: no authorization logic, no secrets in `VITE_*`, no token logging.
**Testing**: Vitest; cover error mapping and state components. Run `npm run typecheck && npm run lint && npm test && npm run build` before finishing.
**Forbidden**: hiding private data only visually, inferring permissions from role names, hard-coding mockup data, re-initializing the project, redesigning approved screens.
**Review checklist**: capabilities-driven UI · states handled · a11y target sizes · no `any` · OPEN items untouched.
