# Treeseed Workspace Guide

This repository is the unified development workspace for the Treeseed system and the canonical integration environment for the package repositories in `packages/`.

## Package Roles

- `@treeseed/sdk`: platform, config, plugin, data, and shared non-UI runtime substrate
- `@treeseed/core`: integrated Treeseed platform starter for Astro/Starlight web runtime, Hono API integration surfaces, integrated local orchestration, content model, and forms
- `@treeseed/agent`: processing runtime, Agent API server, manager, worker, role dispatcher, built-in handlers, agent testing harnesses, and runtime support modules
- `@treeseed/cli`: operator and developer CLI workflows

## Boundary Rules

- `sdk` must not import from `core`.
- `core` may depend on `sdk`, not `cli`.
- `cli` may depend on `sdk` and `core`.
- `agent` owns runtime processing code and may depend on `sdk`; tenant-specific Market content remains in the top-level app.
- Shared fixture references do not imply package ownership.
- Prefer canonical SDK import paths. Do not reintroduce alias exports or compatibility paths in unreleased packages.

## Shared Fixture Model

- `.fixtures/treeseed-fixtures` is the canonical integrated Treeseed project.
- The fixture is intentionally shared across `sdk`, `core`, and `cli`.
- Package-local verification must adapt to the fixture. Do not rewrite the fixture to satisfy one package.
- Fixture shims and package injection exist only to make isolated package verification behave like the canonical integrated project.
- SDK owns the shared fixture support model and the narrow contracts-only Core agent shim used when package-only verification only needs the agent contract subpaths.

### Shared Fixture Purpose

The shared fixture exists to validate the full Treeseed project shape in one canonical place:

- content and platform configuration from `sdk`
- Astro/Starlight site runtime, integrated API starter surfaces, and agent/worker runtime surfaces from `core`
- package and deployment workflows exercised by `cli`

The fixture is not package-specific. It is the integrated reference project for the system.

### Package Verification Intent

- `sdk`
  - owns fixture resolution and package injection support
  - validates shared runtime, config, and fixture support behavior
- `core`
  - validates Research Hub, Astro/Starlight, API, agent, worker, and forms behavior
  - may inject a narrow Core agent contracts shim so the integrated fixture can typecheck and build when only the contract subpaths are required
- `cli`
  - validates operator workflows while still targeting the same integrated fixture

### Package Injection Modes

The shared fixture support layer uses explicit package injection modes:

- `workspace-link`: use the sibling package checkout when working in the full workspace
- `installed-link`: use the installed package when the sibling checkout is absent
- `contracts-only`: synthesize a minimal fixture-local package exposing only the contract surfaces needed for compilation or typechecking

The canonical `contracts-only` shim currently exists for the `@treeseed/core` agent contract subpaths used by the shared fixture.

### Allowed Fixture Imports

The shared fixture may import:

- `@treeseed/sdk` surfaces used by content, runtime, and platform config
- `@treeseed/core` site, API, and runtime surfaces
- `@treeseed/cli` surfaces only where the canonical fixture genuinely models those workflows

What matters is that package-local verification adapts correctly, not that the fixture stays artificially minimal.

### What Must Not Happen

- package-specific fixture forks
- ad hoc package-local fixture rewrites hidden inside verification scripts
- multiple incompatible fake Agent shims in different packages
- package boundary violations justified by fixture convenience

## Recommended Workflows

### Treeseed Development Commands

Treeseed development commands are the preferred interface for humans and agents working in this repository. They coordinate the root market repo, checked-out package repos, task branches, workspace links, verification, CI gates, and cleanup.

Managed executables:

- Run `npx trsd install --json` before assuming a required executable is missing. The install command downloads or verifies Treeseed-managed tools and reports their exact locations in JSON.
- Run `npx trsd tools --json` to inspect managed executable locations without installing. This is the first command to run when an executable such as `gh`, `wrangler`, `railway`, `docker`, Copilot, or `gh-act` appears to be missing from the shell.
- Do not expect Treeseed-managed tools to be on the global `PATH`. Use the JSON returned by `npx trsd tools --json` or `npx trsd install --json`, especially top-level `toolsHome`, `ghConfigDir`, `auth.github`, and each `tools[]` entry.
- Each `tools[]` entry reports `name`, `kind`, `status`, `binaryPath`, and `invocation`. For direct tools, call `invocation.command` with `invocation.argsPrefix` plus your tool arguments. For npm-backed tools, `invocation.mode` is usually `node`; call `invocation.command` followed by `invocation.argsPrefix` and then your tool arguments.
- The default managed tools home is `$TREESEED_TOOLS_HOME` when set, then `$XDG_CACHE_HOME/treeseed/tools`, otherwise `$HOME/.cache/treeseed/tools`.
- Managed GitHub CLI is installed at `<toolsHome>/gh/2.90.0/<platform>-<arch>/bin/gh`; on this Linux x64 workspace that is usually `$HOME/.cache/treeseed/tools/gh/2.90.0/linux-x64/bin/gh`.
- Managed GitHub CLI configuration and extensions live in `$TREESEED_GH_CONFIG_DIR` when set, otherwise `<toolsHome>/gh-config`. The `gh-act` integration is a `gh` extension, so invoke it through the managed `gh` binary and managed config directory, for example `GH_CONFIG_DIR=<ghConfigDir> <managed-gh> act ...`.
- `npx trsd tools --json` also reports GitHub auth under `auth.github`, including the managed `binaryPath`, the exact `command` used to check auth, whether it is `authenticated`, and remediation steps. Use this before concluding that GitHub auth or `gh` is unavailable.
- On this Linux x64 workspace, current tool discovery usually reports `gh` at `/home/adrian/.cache/treeseed/tools/gh/2.90.0/linux-x64/bin/gh`, `ghConfigDir` at `/home/adrian/.cache/treeseed/tools/gh-config`, npm-backed Wrangler at `node node_modules/wrangler/bin/wrangler.js`, and npm-backed Railway at `node node_modules/@railway/cli/bin/railway.js`; still prefer the live JSON over hard-coding these paths.
- Npm-backed Treeseed tools such as Wrangler, Railway, GitHub Copilot, and the Copilot language server resolve through the local package graph. Prefer Treeseed commands that resolve these paths for you; when scripting directly, read the tool's `invocation` object and use `node <binaryPath> ...` only when the invocation reports `mode: "node"`.
- Use the Treeseed provider wrappers when a tool needs decrypted machine configuration values. `npx trsd gh`, `npx trsd railway`, and `npx trsd wrangler` load the selected Treeseed environment scope, inject unencrypted provider credentials into the child process environment, resolve the managed executable, and then forward arguments to the real CLI.
- Provider wrappers default to `--environment staging`. Pass `--environment local`, `--environment staging`, or `--environment prod` before the forwarded command when you need a specific scope. The Railway wrapper also selects the matching Railway environment (`staging` or `production`) before forwarding the command, so `--environment prod` does not accidentally inspect the locally linked staging environment. Put target CLI flags after `--`, for example `npx trsd railway --environment staging -- status`, `npx trsd railway --environment prod -- status`, `npx trsd railway --environment staging -- whoami`, `npx trsd gh --environment staging -- run view <run-id> --repo <owner/repo> --log-failed`, and `npx trsd wrangler --environment staging -- whoami`.
- Do not print or echo wrapper environments. The wrappers intentionally pass decrypted values such as `GH_TOKEN`, `RAILWAY_API_TOKEN`, and `CLOUDFLARE_API_TOKEN` only to the child process so provider CLIs can authenticate without exposing secrets in shell history or logs.

Capacity provider runtime:

- Root Market deploys only the Market web/API plane. Capacity-provider runtime, container assets, templates, and lifecycle behavior are owned by `@treeseed/agent`.
- Use `trsd capacity build`, `trsd capacity up`, `trsd capacity status`, `trsd capacity logs`, `trsd capacity down`, and `trsd capacity test-local` for provider lifecycle work.
- Provider secrets must be stored through `trsd config` or host secret managers. Do not create plaintext provider env files or render provider API keys into Compose.
- The package-owned provider image starts `node ./dist/provider/entrypoint.js` with `api`, `manager`, and `runner` roles.

For agents and automation:

- Start with `npx trsd status --json` to inspect branch role, dirty state, locks, package state, and next safe actions.
- For provider runtime work, use `npm -w packages/agent run test:capacity-provider-runtime`, `npm -w packages/agent run capacity-provider:test-local`, and the package-local `npm -w packages/agent run verify:local` closure smoke.
- For local UI iteration, prefer `npx trsd dev --web-runtime local --force --json`. `--web-runtime local` uses the Astro dev server for hot reload instead of rebuilding the Cloudflare/Wrangler runtime, while still sharing the local API/control-plane state. `--force` is intentional for agent/dev loops: it terminates overlapping Treeseed dev supervisors and listeners on required ports before startup.
- Treeseed dev supervisors always mirror their output into `.treeseed/logs/dev-<surfaces>.jsonl`, for example `.treeseed/logs/dev-web-api.jsonl` or `.treeseed/logs/dev-manager-worker.jsonl`. Start them directly or daemonize them with normal shell job control, then follow the stable log path with `tail -f`.
- Use `npx trsd switch <task-branch> --json`; when the result includes `payload.worktreePath`, run all future commands from that worktree path.
- Use `npx trsd save --json` for checkpoints. Save is optimized for fast local iteration by default. Add `--verify-deployed-resources` on staging or production branches when the checkpoint should wait for hosted deploy checks that verify provider resources.
- Use `npx trsd stage "message" --json` when the task is ready for staging. Stage waits for required hosted CI/CD gates before cleanup; add `--verify-deployed-resources` when the staging promotion must force deployed resource verification even if another option would skip waiting.
- Use `npx trsd close "reason" --json` when abandoning a task. Close archives the branch and cleans up managed worktrees.
- Use `npx trsd recover --json`, `npx trsd recover --prune-stale --json`, and `npx trsd resume <run-id> --json` after interrupted workflow commands.

For humans:

- The default in-place workflow remains valid: `switch`, edit, `save`, then `stage` or `close`.
- Use `--worktree on` when isolating risky or parallel work. Agents use managed worktrees automatically when agent environment markers are present.
- Use `--json` whenever another tool needs stable structured output.

For releases:

- Release only after staging is green.
- Release waits for production CI/CD and the deployment monitor must verify managed provider resources and settled Railway deployment status before returning success.
- Use `npx trsd release --patch --json`, `npx trsd release --minor --json`, or `npx trsd release --major --json`.
- Release waits required hosted package and market workflows and reports active GitHub jobs/steps plus run metadata.

Workflow guidance:

- Avoid manual branch deletion, package tag cleanup, or submodule pointer edits while a Treeseed workflow command is active.
- Treat `stage` and `release` as serialized commands because they mutate shared staging or production state.
- Prefer `--plan --json` before risky operations when an agent needs a non-mutating preview of the command.
- Keep workflow proof branches intentionally small so command behavior stays easy to inspect from commit history and GitHub Actions runs.

### Package-only work

- Run commands from the package root.
- Use `npm run verify` before considering a package change complete.
- Always run `npm run verify:local` after making any changes inside a package and ensure it passes before marking the task complete.
- Use `npm run verify:action` when you need to reproduce isolated package CI behavior.

### Workspace-integrated work

- Initialize submodules before installing.
- Use the root workspace when changing behavior across package boundaries.
- Re-run the affected package verifies after integration changes.
- Treat `treeseed dev` as a `core`-owned integrated runtime entrypoint; the root tenant should only delegate to it.

### Fixture-related debugging

- Start with `npm run fixtures:check`.
- For Astro/Starlight packages, use `npm run check` and `npm run build` against the shared fixture.
- If a package-only verification fails, inspect whether the issue is:
  - a real package boundary violation
  - a missing package injection in isolated verification
  - a stale package export or missing contract shim

## Guidance For Contributors And Coding Agents

- Keep package ownership sharp. Move shared infrastructure into SDK instead of copying it into multiple packages.
- Do not mutate the shared fixture just to make one package pass.
- Do not add backward-compatibility aliases or temporary public API shortcuts in these unreleased packages.
- Keep test harness shims private, minimal, and structurally aligned with the real package contracts.
- Prefer package-scoped verification semantics:
  - `core` validates Research Hub, API, and worker buildability against the integrated fixture
  - `sdk` validates shared runtime, config, and fixture support infrastructure

## Verification Expectations

- `verify`: package verification in the normal environment
- `verify:local`: required completion check after package changes; use this before marking work complete
- `verify:action`: package-only isolated verification through `gh act`
- `check`: typecheck and framework validation against the shared fixture
- `test:smoke`: packed-install or runtime smoke coverage for the package

Common failure patterns:

- missing fixture submodule
- package-only verification missing a required injected package surface
- stale export maps after moving code between packages
- accidental cross-package imports that violate the package boundaries above
