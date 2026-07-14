# Guarantee And Scene System Completion Handoff

Generated: 2026-07-09

This document records the current state of the TreeSeed guarantee, scene, and reviewer closure work. It is intended as a takeover guide for another AI agent. It separates what is already verified from the work still required to reach the requested target of 90% SDK guarantee-critical coverage plus complete local guarantee execution for the guarantee and scene systems.

## Current Verified State

The guarantee registry is structurally clean and the latest full local guarantee execution completed successfully.

Verified full run:

```text
.treeseed/guarantees/runs/2026-07-09T13-51-14-287Z/report.json
```

Full run counts:

```json
{
  "passed": 208,
  "failed": 0,
  "blocked": 0,
  "planned": 0,
  "skipped": 0,
  "releaseBlockingFailures": 0,
  "ok": true
}
```

Static guarantee validation passed:

```bash
npx trsd guarantees validate --json
```

Observed result:

```text
208/208 valid, ok: true
```

Journey audit passed:

```bash
npx trsd guarantees audit-journeys --json
```

Observed totals:

```json
{
  "guarantees": 208,
  "sceneBacked": 139,
  "activeSceneBacked": 139,
  "weakSceneContracts": 0,
  "missingRoutes": 0,
  "missingSelectors": 0,
  "dependencyErrors": 0,
  "activeSceneBackedWeak": 0,
  "activeMissingRoutes": 0,
  "activeMissingSelectors": 0
}
```

No planned or blocked guarantee statuses remain:

```bash
rg "^status:\s*(planned|blocked)" guarantees packages/*/guarantees -g "*.yaml"
```

Observed result: no matches.

No `todo.*` verifier refs remain:

```bash
rg "todo\." guarantees packages/*/guarantees -g "*.yaml"
```

Observed result: no matches.

No `closure.*` verifier refs remain in release guarantee manifests or verifier registries:

```bash
rg "closure\." guarantees packages/*/guarantees -g "*.yaml"
```

Observed result: no matches.

## Completed Work

### Guarantee Registry Closure

- All 208 guarantee manifests validate.
- All guarantees are currently `active`.
- All 139 scene-backed guarantees audit as active service journeys.
- The journey audit reports zero weak active scene contracts.
- The journey audit reports zero active missing routes and zero active missing selectors.
- Placeholder route failures found earlier in the process were mapped or implemented sufficiently for the audit and full run to execute.
- The full local run now reports all 208 guarantees passing.

### Owner Batch Runs

The following owner-level runs were previously verified clean:

```text
@treeseed/admin    2026-07-09T05-33-52-362Z    88 passed
@treeseed/market   2026-07-09T06-18-27-596Z    40 passed
@treeseed/reviewer 2026-07-09T06-18-24-271Z     1 passed
@treeseed/agent    2026-07-08T23-10-22-097Z    44 passed
@treeseed/api      2026-07-09T02-26-28-298Z    59 passed
```

Additional owner-level proof from the closure replacement pass:

```text
@treeseed/market   2026-07-09T12-20-50-661Z    40 passed
```

The full collection run on 2026-07-09 supersedes the older owner batch proof for release confidence. Rerun owner batches only when narrowing regressions by package.

### CLI Guarantee Command Tests

The CLI guarantee command test suite passed:

```bash
npm -w packages/cli run build
npm -w packages/cli exec -- node --import tsx --test --test-concurrency=1 ./scripts/guarantees-command.test.ts
```

Observed result:

```text
8 tests passed
```

Covered behavior includes audit, planning, dependency behavior, run command behavior, and streaming-related guarantee command cases.

The focused CLI command run also passed after adding the scene command suite:

```bash
npm -w packages/cli exec -- node --import tsx --test --test-concurrency=1 ./scripts/guarantees-command.test.ts ./scripts/scene-command.test.ts
```

Observed result:

```text
30 tests passed
```

### Package Builds

The following package builds passed:

```bash
npm -w packages/sdk run build
npm -w packages/ui run build
npm -w packages/admin run build
npm -w packages/api run build
npm -w packages/agent run build
npm -w packages/cli run build
npm -w packages/reviewer run build
```

### Reviewer Application

The reviewer package was implemented and verified through local API and artifact inspection.

Important reviewer fixes completed:

- Reviewer screenshot normalization excludes viewport screenshots from selectable evidence.
- Reviewer expands scene run directories and reads scene `run.json`.
- Reviewer orders screenshots by workflow step instead of filesystem order.
- Reviewer workplan packaging copies evidence, writes directive files, writes context, and generates agent briefs.
- Reviewer critical coverage now passes at 100%.

Reviewer proof workplan:

```text
.treeseed/workplans/2026-07-09T08-58-32-645Z-full-guarantee-run-reviewer-proof/
```

Verified files:

```text
workplan.yaml
workplan.md
agent-brief.md
evidence/manifest.json
commands/reproduce.sh
commands/verify.sh
```

Verified evidence characteristics:

```text
total evidence entries: 116
screenshot entries: 16
viewport screenshot entries: 0
```

The first ordered screenshots in the proof bundle were:

```text
open-registration.png
enter-first-name.png
enter-last-name.png
enter-username.png
enter-email.png
enter-password.png
confirm-password.png
submit-registration.png
```

This confirms that the reviewer is no longer showing viewport duplicates as primary screenshot evidence and that step screenshots are ordered correctly for at least the verified workplan path.

The T3 Code preview browser was not available during this final verification because both `preview_status` and `preview_open` returned an auth-required error. That is a tooling access issue for browser-based reviewer proof only, not a product or guarantee blocker. Reviewer behavior was instead verified through the local server API and generated workplan artifacts.

### Reviewer Coverage

Strict reviewer guarantee coverage passed:

```bash
npm -w packages/reviewer run test:guarantees:coverage
```

Observed result:

```text
100% statements
100% branches
100% functions
100% lines
```

Normal reviewer tests also passed:

```bash
npm -w packages/reviewer run test
```

Observed result:

```text
5 test files passed
24 tests passed
```

Important reviewer files changed during the work:

```text
packages/reviewer/src/shared/guarantee-review.ts
packages/reviewer/src/shared/workplan.ts
packages/reviewer/src/server/guarantee-runs.ts
packages/reviewer/src/server/evidence.ts
packages/reviewer/src/server/workplans.ts
packages/reviewer/src/server/routes.ts
packages/reviewer/test/guarantee-run-discovery.test.ts
packages/reviewer/test/critical-coverage.test.ts
```

### SDK And Runtime Fixes

SDK and runtime fixes already completed include:

- Vitest verifier output validation rejects no-op or skipped-only verifier output.
- The agent heartbeat verifier was changed to target a real executing heartbeat test instead of passing through skipped tests.
- Mailpit confirmation handling was improved for token replacement and local URL normalization.
- Navigation HTTP diagnostics were improved to preserve structured failure data.
- Duplicate state producer behavior was hardened to report diagnostics instead of crashing.
- Scene runtime token replacement coverage was expanded.
- Vite watcher exclusions were added to reduce file watcher pressure from generated artifacts.

Important files touched in this area include:

```text
astro.config.ts
packages/sdk/src/guarantees/index.ts
packages/sdk/src/scenes/builtin-plugins.ts
packages/agent/guarantees/verifiers/runtime.verifiers.yaml
packages/sdk/test/utils/scenes-base-url-and-fixtures.test.ts
packages/sdk/test/utils/scenes-builtin-plugin-handlers.test.ts
```

## Remaining Work

The SDK and Reviewer critical coverage gates are complete. Remaining release work is operational reconfirmation: package regressions, guarantee validation and journey audit, and the final complete guarantee collection against the promoted environment.

### 1. Closure Verifier Replacement Completed

The shallow `closure.*` verifier references were replaced in this pass.

Replacement inventory:

```text
.treeseed/guarantees/closure/inventory.json
.treeseed/guarantees/closure/inventory.md
docs/guarantee-closure-inventory.md
```

Replacement totals:

```text
396 manifest verifier refs replaced
@treeseed/market: 144
@treeseed/admin: 252
api/content/audit/negative: 99 each
```

Current acceptance for this item:

```bash
rg "closure\." guarantees packages/*/guarantees -g "*.yaml"
```

Expected result: no matches.

New guard coverage:

```bash
npm run test:unit -- test/lib/guarantees-workspace.test.ts
npm -w packages/api run test:unit -- test/lib/api-acceptance-framework.test.ts
```

The workspace guard asserts no active guarantee uses `closure.*`, `todo.*`, `manualEvidence`, or an undefined verifier ref. The API guard asserts every workspace `apiAcceptanceCase` verifier maps to an expanded acceptance case.

### 2. SDK Critical 90% Coverage Complete

Reviewer coverage remains complete, and SDK guarantee-critical coverage now passes the configured 90% gate for statements, branches, functions, and lines:

```bash
npm -w packages/sdk run test:guarantees:coverage
```

Measured passing coverage on July 14, 2026:

```text
statements: 95.46%  (2589/2712)
branches:   90.01%  (2343/2603)
functions:  95.20%  (457/480)
lines:      95.77%  (2176/2272)
```

Thresholds remain set to 90 in `packages/sdk/vitest.guarantees.config.ts`, and the critical-file include list remains intact. Do not lower the branch threshold, add coverage ignore comments, or relax TypeScript settings.

Recommended SDK test expansion:

- `src/guarantees/index.ts`
  - malformed YAML
  - schema mismatch
  - duplicate guarantee IDs
  - duplicate journey indexes
  - taxonomy path mismatch
  - package ownership mismatch
  - active missing contract rejection
  - TODO/manual evidence rejection
  - verifier registry resolution success and failure
  - dependency graph expansion from guarantees, journeys, and implicit auth
  - deterministic topological order
  - cycle diagnostics
  - duplicate state producer diagnostics
  - missing state producer diagnostics
  - dependency failure blocking semantics

- `src/scenes/runner.ts`
  - full-page screenshot after each executed step
  - step screenshot paths on reports
  - viewport screenshot exclusion from primary evidence
  - trace, console, network, and app logs
  - HTTP 4xx/5xx navigation failure diagnostics
  - missing state input blocks execution
  - state output emission
  - step assertion failure with artifacts
  - verifier stdout/stderr mapping
  - timeout handling

- `src/scenes/schema.ts`
  - `journey.kind`
  - `journey.proves`
  - `journey.minimumSteps`
  - `journey.requiresInteractiveAction`
  - state input/output parsing
  - invalid state references
  - service journey without interactive action
  - service journey without assertions
  - dynamic route alias validation
  - selector diagnostics

- `src/scenes/builtin-plugins.ts`
  - every built-in action handler success path
  - validation/failure branches
  - token replacement in string inputs
  - Mailpit confirmation success
  - Mailpit missing message failure
  - confirmation URL normalization
  - HTTP diagnostics from confirmation navigation

- `src/scenes/visual-audit-fixtures.ts`
  - all fixture discovery branches
  - package-local and workspace fallback behavior
  - missing fixture diagnostics
  - malformed fixture handling

Acceptance for this item:

```bash
npm -w packages/sdk run test:guarantees:coverage
```

Expected result:

```text
>=90% statements
>=90% branches
>=90% functions
>=90% lines
```

### 3. Add Explicit Integration Tests For The Guarantee System

The full run is passing, but more integration tests should lock in the system-level behavior instead of relying only on ad hoc command execution.

Add tests that assert:

- full registry validates
- audit reports zero active weak journeys
- no `todo.*` refs exist
- no `closure.*` refs exist after real verifier replacement
- all guarantees are active
- all active scene-backed guarantees have service journey metadata
- all active scene-backed guarantees have at least two executable steps
- all active scene-backed guarantees have at least one interactive action
- dependency plan for project creation includes login and team prerequisites before project creation
- dependency plan for question/objective/proposal flows includes project creation first
- failed prerequisite blocks dependent
- skipped prerequisite blocks dependent
- missing state producer blocks consumer
- duplicate state producer reports a diagnostic
- `state.json` is written during a run and includes produced state
- step screenshots are written as full-page evidence
- viewport screenshots are not primary guarantee evidence

Good locations:

```text
packages/sdk/test/utils/guarantees-framework.test.ts
packages/sdk/test/utils/guarantees-dependencies.test.ts
packages/sdk/test/utils/guarantees-audit.test.ts
packages/cli/scripts/guarantees-command.test.ts
```

### 4. Add Browser-Level E2E Proof For Reviewer

The reviewer was verified through API and generated artifacts because the collaborative preview browser was unavailable. A browser-level test should still be added or run when browser automation is available.

Minimum reviewer e2e:

1. Start reviewer against the latest full run.
2. Open the run selector.
3. Open the full run review wizard.
4. Confirm step screenshots are visible and ordered.
5. Confirm viewport screenshots are not selectable primary evidence.
6. Add a note to a guarantee.
7. Add it to the workplan.
8. Package the workplan.
9. Verify `workplan.yaml`, `workplan.md`, `agent-brief.md`, and `evidence/manifest.json`.

Suggested command shape:

```bash
npx trsd-reviewer --workspace . --run-id 2026-07-09T06-38-37-959Z --port 4757
```

If using Playwright directly, keep the test package-local to reviewer and avoid requiring root-only state for package verification unless the test is explicitly an integrated workspace test.

### 5. Strengthen Real Service Journey Evidence

The structural audit is clean, and the full run passes. After replacing `closure.*` refs, the next agent should inspect representative scene-backed guarantees to ensure they are not only structurally valid but genuinely service-level.

Prioritize these journey families:

- auth and account
- teams and membership
- project creation and project work
- questions, objectives, proposals, decisions
- knowledge books and content
- agents, workdays, and mode runs
- capacity providers and host reconciliation
- marketplace, checkout, and services
- commons, feedback, and public profiles
- reviewer workplan generation

Each active scene-backed guarantee should prove:

- real route exists
- workflow uses stable selectors or semantic roles
- at least one interactive action occurs
- assertions follow meaningful acceptance steps
- durable state or visible product result is verified
- full-page screenshots are attached in step order
- verifier refs prove API/content/audit/negative behavior where relevant

## Current Blockers

No true configuration blockers have been confirmed.

The following are not configuration blockers and must be treated as implementation or test-completeness gaps:

- any future `closure.*` structural verifier refs
- any future SDK critical coverage regression below 90%
- missing browser-level reviewer proof due preview auth being unavailable
- any future auth/session/selector/route/verifier/test harness failures

The only observed tooling blocker was T3 Code preview access requiring authentication. That affected browser-based manual reviewer inspection only. It did not block local API verification, full guarantee execution, package builds, or generated workplan inspection.

If a future agent finds a real configuration blocker, document it in:

```text
.treeseed/guarantees/closure/blockers.json
.treeseed/guarantees/closure/blockers.md
```

Each blocker must include:

```ts
{
  guaranteeId: string;
  ownerPackage: string;
  sourcePath: string;
  routeOrSurface: string;
  verifierRefs: string[];
  blockingKind:
    | "local-runtime-configuration"
    | "provider-credential"
    | "external-service-configuration"
    | "seed-fixture-configuration";
  requiredConfig: string[];
  detectionCommand: string;
  verificationCommand: string;
  whyNotProgrammatic: string;
  remediation: string;
}
```

Do not report these as blockers:

- route missing
- selector missing
- auth failed
- session failed
- dependency did not run
- TODO or closure verifier remains
- API endpoint missing
- test skipped
- screenshot missing
- reviewer workplan packaging failed

Those are implementation issues.

## Recommended Takeover Sequence

1. Inspect current dirty worktree:

```bash
git status --short
```

There are many modified and untracked files from the guarantee closure effort, including package manifests, guarantee YAML, scene YAML, reviewer source, SDK source, verifier registries, and generated local `.treeseed` artifacts. Do not revert unrelated user work.

2. Reconfirm structural baseline:

```bash
rg "todo\." guarantees packages/*/guarantees -g "*.yaml"
rg "^status:\s*(planned|blocked)" guarantees packages/*/guarantees -g "*.yaml"
npx trsd guarantees validate --json
npx trsd guarantees audit-journeys --json
```

3. Reconfirm full execution baseline:

```bash
npx trsd guarantees run --environment local --scene-artifacts screenshots --json
```

Expected current target:

```json
{
  "passed": 208,
  "failed": 0,
  "blocked": 0,
  "planned": 0,
  "skipped": 0,
  "releaseBlockingFailures": 0,
  "ok": true
}
```

4. Replace `closure.*` verifier refs with real package-owned verifiers.

Start with an inventory:

```bash
rg "closure\." guarantees packages/*/guarantees -g "*.yaml"
```

Group by owner package and verifier intent. Replace one owner/type family at a time and run the focused owner guarantee command after each batch.

5. Rerun owner batches:

```bash
npx trsd guarantees run --owner-package @treeseed/admin --environment local --scene-artifacts screenshots --json
npx trsd guarantees run --owner-package @treeseed/api --environment local --scene-artifacts screenshots --json
npx trsd guarantees run --owner-package @treeseed/agent --environment local --scene-artifacts screenshots --json
npx trsd guarantees run --owner-package @treeseed/market --environment local --scene-artifacts screenshots --json
npx trsd guarantees run --owner-package @treeseed/reviewer --environment local --scene-artifacts screenshots --json
```

6. Reconfirm SDK 90% critical coverage:

```bash
npm -w packages/sdk run test:guarantees:coverage
```

7. Reconfirm reviewer coverage:

```bash
npm -w packages/reviewer run test:guarantees:coverage
npm -w packages/reviewer run test
```

8. Reconfirm CLI command tests:

```bash
npm -w packages/cli run build
npm -w packages/cli exec -- node --import tsx --test --test-concurrency=1 ./scripts/guarantees-command.test.ts
```

9. Rebuild affected packages:

```bash
npm -w packages/sdk run build
npm -w packages/ui run build
npm -w packages/admin run build
npm -w packages/api run build
npm -w packages/agent run build
npm -w packages/cli run build
npm -w packages/reviewer run build
```

10. Produce final reviewer proof.

Use the latest full passing run:

```bash
npx trsd-reviewer --workspace . --run-id <latest-full-run-id> --open
```

If browser automation is unavailable, verify through local reviewer API and inspect the generated workplan bundle.

## Final Acceptance Checklist

The guarantee and scene system should be considered complete only when every item below is true:

- `rg "todo\." guarantees packages/*/guarantees -g "*.yaml"` returns no matches.
- `rg "closure\." guarantees packages/*/guarantees -g "*.yaml"` returns no shallow structural verifier refs.
- `rg "^status:\s*(planned|blocked)" guarantees packages/*/guarantees -g "*.yaml"` returns no matches.
- `npx trsd guarantees validate --json` passes with 208 valid guarantees.
- `npx trsd guarantees audit-journeys --json` reports 139 active scene-backed guarantees, zero weak contracts, zero missing routes, zero missing selectors, and zero dependency errors.
- `npx trsd guarantees run --environment local --scene-artifacts screenshots --json` reports 208 passed, 0 failed, 0 blocked, 0 planned, 0 skipped, and `ok: true`.
- SDK guarantee-critical coverage is at least 90% statements, branches, functions, and lines.
- Reviewer guarantee-critical coverage is 100% statements, branches, functions, and lines.
- CLI guarantee command tests pass.
- Owner package guarantee runs pass for admin, api, agent, market, and reviewer.
- Reviewer opens the latest full run and packages a workplan with copied evidence.
- Reviewer workplan evidence includes ordered full-page step screenshots and excludes viewport screenshots from selectable screenshot evidence.
- Any remaining non-passing guarantee has a configuration-only blocker report entry with exact required config and verification command.
