# Worktree-Scoped Dev Instances

Treeseed has two local development modes:

- `trsd dev` runs the existing foreground supervisor in the current shell.
- `trsd dev start` runs the same web/API/operations-runner runtime as a managed background instance for the current worktree.

Use the foreground form when you want terminal-owned logs and Ctrl-C lifecycle. Use the managed form when humans or AI agents need a discoverable server that survives shell changes and can be inspected or stopped later.

## Current Runtime Ownership

- The web process runs from the root market app and layers `@treeseed/core`, `@treeseed/admin`, and `@treeseed/ui`.
- API and operations-runner processes run from `packages/api`.
- Reusable components/styles are consumed from `@treeseed/ui`.
- Capacity providers are not started by default; use `trsd capacity ...` for `@treeseed/agent` runtime work.
- TreeDX is not an ordinary web dev process; it is consumed by SDK/API when configured.

See [Package Ownership](./package-ownership.md) for the full package map.

## Commands

```bash
npx trsd dev --web-runtime local
npx trsd dev start --web-runtime local --json
npx trsd dev status --json
npx trsd dev status --all --json
npx trsd dev logs
npx trsd dev logs --follow
npx trsd dev stop --json
npx trsd dev restart --web-runtime local --json
```

`trsd dev` without a subcommand remains the foreground command. Managed actions are subcommands of `dev`; do not use colon command names for this flow.

## Runtime State

Each physical worktree owns its authoritative runtime files:

```text
.treeseed/dev/instances/<scope>.json
.treeseed/dev/pids/<scope>.pid
.treeseed/logs/dev-<scope>.jsonl
```

For the Market root, the normal scope is `web-api`, which includes the web UI, API, managed local PostgreSQL setup, API migrations, and the Treeseed operations runner. The web process runs from the root repo; the API and runner processes run from `packages/api`. Other scopes are possible for package-local or focused development surfaces.

Validate the plan without starting processes:

```bash
npx trsd dev start --web-runtime local --plan --json
```

Expected Market process ownership:

```text
web cwd: .
api cwd: packages/api
operations-runner cwd: packages/api
```

The instance JSON is safe for tools to read. It includes:

- project root and worktree root
- branch and git common dir when available
- status, PID, process group, start/update timestamps
- selected ports and URLs
- log path
- runtime scope and surfaces
- readiness checks
- stale reason when the process is gone

The repository-family index is only a discovery pointer. It lives under the git common dir when the project is in git:

```text
<git-common-dir>/treeseed/dev-index.json
```

For non-git projects, Treeseed falls back to a user-cache index keyed by project root. The worktree-local instance file remains authoritative; stale or missing index entries are repaired opportunistically by status/start/stop operations.

## Worktrees And Ports

Runtime ownership is worktree-scoped. Main, staging, and every feature worktree can run its own managed dev instance at the same time.

The default worktree keeps the familiar ports when they are free:

- web: `4321`
- API: `3000`
- Treeseed PostgreSQL: `55432`
- Mailpit SMTP: `1025`
- Mailpit UI: `8025`

Additional worktrees receive stable alternate port blocks. The assigned ports are recorded in the worktree instance state and reused by managed restarts. Explicit `--port` and `--api-port` still win.

Managed local backing services also use worktree-specific names:

- PostgreSQL container and volume names include a worktree hash.
- Mailpit container names include a worktree hash.

That lets many agents work in separate worktrees on the same filesystem without fighting over local ports or Docker service names.

## Force Semantics

`--force` is scoped to the current worktree managed instance. It replaces the current worktree's overlapping dev runtime and does not kill sibling worktree instances.

Use `--force-conflicts` only when you intentionally want to stop a sibling process that owns an explicitly requested conflicting port. This is the cross-worktree escape hatch, not the default.

`trsd dev stop` stops only the current worktree instance. `trsd dev stop --all` discovers sibling instances through the repository-family index and stops them.

## AI Agent Workflow

Agents should start by checking status:

```bash
npx trsd ready local --json
npx trsd dev status --json
npx trsd dev status --all --json
```

If the current worktree has a ready instance, reuse its URLs and log path. If it is stale, run:

```bash
npx trsd dev restart --web-runtime local --json
```

For UI work in an isolated worktree, prefer:

```bash
npx trsd dev start --web-runtime local --json
```

Then follow logs through the stable path from the JSON payload or with:

```bash
npx trsd dev logs --follow
```

Foreground `trsd dev --web-runtime local` is still appropriate when the agent is deliberately supervising the process inside the active terminal session.

## Boundaries

`trsd dev` is the Market web/API/control-plane development surface. Capacity-provider runtime is still package-owned by `@treeseed/agent` and runs through `trsd capacity ...`.

Managed dev state is local operational state, not product data. Do not commit `.treeseed/dev`, PID files, logs, generated PostgreSQL data, Mailpit data, or local cache indexes.
