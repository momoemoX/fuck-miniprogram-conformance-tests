# Agent Guide (`AGENTS.md`)

This repository is a black-box conformance test suite for Mini Program base library **3.7.12**.

## Read First (Required for All AI Agents)

Before designing, adding, or reviewing test cases, read the authoritative spec coverage matrix:

1. [`SPEC_MATRIX.md`](SPEC_MATRIX.md) — Human- and agent-readable summary of all **in-scope Mini Program spec clauses**, their `COVERED` / `PARTIAL` / `MISSING` status, mapped cases, and exact remaining gaps.
2. [`fixtures/spec-matrix.json`](fixtures/spec-matrix.json) — Machine-readable single source of truth (JSON schema with domain clauses, contracts, priorities, case IDs, and concrete gaps).

Do **not** invent arbitrary test counts or pad the suite with generic Web/DOM/HTML5 Canvas minutiae already covered by WPT. Always work from the `MISSING` and `PARTIAL` backlog in `SPEC_MATRIX.md` / `fixtures/spec-matrix.json`.

## Standard Workflow for Adding or Updating Cases

1. **Pick a clause** (`MISSING` or `PARTIAL`) from `fixtures/spec-matrix.json` and address the listed `gaps`.
2. **Keep every case strictly isolated**:
   - Mount fixture components on demand with `wx:if` and unmount in `finally`.
   - Restore any mutated `page.data` fields in `finally` so `runSelected` and arbitrary case order never leak state.
   - Use `isolatedNavigation` from `cases/route-harness.js` for navigation cases so the page stack is always restored.
   - Use `waitUntil` from `cases/support.js` instead of fixed `delay()` for positive observations.
   - Never rely on static `require()` literals pointing to non-existent files (DevTools static bundling will fail).
3. **Verify against the official 3.7.12 baseline**:
   - Run `node tools/devtools/run.cjs --appid <AppID> --out /tmp/core.json` (and `--fixtures` with `tools/http-fixture.mjs` + `tools/socket/echo.cjs` for full baseline).
   - Never commit a private AppID anywhere in the repository (`project.config.json` must remain `"touristappid"`).
4. **Update generated & derived artifacts**:
   - Update `fixtures/devtools-3.7.12-observations.json` with verified 3.7.12 results.
   - Run `node tools/reference.cjs` to regenerate `fixtures/reference.js`.
   - Update `fixtures/spec-matrix.json` (map every new case ID, update clause `status` and `gaps`), then run `node tools/spec-matrix.cjs` to regenerate `SPEC_MATRIX.md`. Do **not** edit `SPEC_MATRIX.md` by hand.
   - If you changed `tools/components/generate.cjs`, re-run it and re-verify visual references with `node tools/visual/verify.cjs`.
5. **Run all offline CI checks before finishing**:
   ```sh
   npm run check
   ```
   This verifies JS syntax, component generator idempotency, `reference.js` vs observations consistency, `SPEC_MATRIX.md` vs `spec-matrix.json` + 100% case mapping (0 orphan cases), and visual reference invariants (0 blank false negatives, 0 redundant states).

## Key Files Map

- `fixtures/spec-matrix.json` & `SPEC_MATRIX.md` — Authoritative coverage denominator & gap backlog
- `tools/spec-matrix.cjs` — Spec matrix generator & CI validator
- `cases/` — Test modules (`cases/report.js` handles timeouts, baseline confirmation, and `behavior`/`shape`/`quirk` categorization)
- `pages/suite/index.*` — Main automated runner page
- `fixtures/devtools-3.7.12-observations.json` & `fixtures/reference.js` — Observed 3.7.12 baseline & generated expectations (`tools/reference.cjs`)
- `tools/visual/` & `fixtures/visual/` — Visual reference recorder, comparator & offline self-check (`tools/visual/verify.cjs`)
- `COVERAGE.md` — Historical notes, baseline changes, and profile details
