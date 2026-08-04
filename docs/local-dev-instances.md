# Worktree-Scoped Dev Instances

Treeseed has two local development modes:

- `trsd dev` runs the existing foreground supervisor in the current shell.
- `trsd dev start` runs the same web/API/operations-runner runtime as a managed background instance for the current worktree.

Use the foreground form when you want terminal-owned logs and Ctrl-C lifecycle. Use the managed form when humans or AI agents need a discoverable server that survives shell changes and can be inspected or stopped later.

## Current Runtime Ownership

- SDK owns managed background process supervision, instance records, Git worktree discovery, repository-family indexes, port allocation, stale PID handling, conflict handling, log reads, and restart/stop semantics.
- Core owns foreground web runtime composition and delegates managed actions to SDK.
- The web process runs from the root market app and layers `@treeseed/core`, `@treeseed/admin`, and `@treeseed/ui`.
- API and operations-runner processes run from `packages/api`.
- Reusable components/styles are consumed from `@treeseed/ui`.
- Capacity providers are not started by default; use `trsd capacity ...` for `@treeseed/agent` runtime work.
- TreeDX is not an ordinary web dev process; it is consumed by SDK/API when configured.

See [Package Ownership](./package-ownership.md) for the full package map.

## Project Architecture And Local Content

`trsd dev` should plan from logical project architecture, not from a submodule-dependent layout. A project is identified by repository plus `rootPath`, optional `sitePath`, optional `contentPath`, `contentRuntimeSource`, and `localContentMaterialization`.

For the root Market project, the default `sitePath` is `.`. For first-party package projects, the default `sitePath` is `docs`; a missing docs site should produce a `site_not_prepared` diagnostic instead of blocking unrelated package workflows.

Local content files appear only when the selected materialization requires them:

- `existing_path` uses content already present in the repository.
- `managed_clone` is reserved for split content repositories when a human requests local editing or preview.
- `submodule` is supported for existing workspaces, but it is not the canonical project model.
- `none` means local dev should use TreeDX, API, or R2-backed content access instead.

CI/CD, hosted deploys, and capacity-provider operations should not clone large content repositories by default. They should use API, TreeDX, or R2 content sources unless a workflow explicitly asks for local content.

`trsd dev` exposes that choice through `--local-content <auto|none|preview|edit>`:

- `auto` is the default. It reports project architecture and uses existing local paths when present, but it does not clone split content repositories.
- `none` never clones or initializes local content and reports the intended TreeDX/API/R2 runtime source.
- `preview` materializes managed local content when a human needs local read/preview files.
- `edit` materializes managed local content for local editing. Dirty managed clones are never reset or overwritten.

Managed clones live under `.treeseed/local-content/<team-slug>/<project-slug>/<role>` by default. GitHub credentials come from canonical Treeseed environment names such as `TREESEED_GITHUB_TOKEN` or `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>` and are translated only inside the immediate Git/GitHub child process environment.

## Commands

```bash
npx trsd dev --web-runtime local
npx trsd dev --web-runtime local --local-content none --plan --json
npx trsd dev --web-runtime local --local-content preview --plan --json
npx trsd dev start --web-runtime local --json
npx trsd dev start --web-runtime local --local-content edit --json
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
.treeseed/config/machine.yaml
```

For the Market root, the normal scope is `web-api`, which includes the web UI, API, managed local PostgreSQL setup, API migrations, and the Treeseed operations runner. The web process runs from the root repo; the API and runner processes run from `packages/api`. Other scopes are possible for package-local or focused development surfaces.

Managed workflow worktrees seed `.treeseed/config/machine.yaml` from the primary checkout when the worktree is created. Once present, the worktree-local config is authoritative for `trsd config`, launch environment resolution, provider wrappers, and status checks, so changing provider variables in one feature worktree does not rewrite the credentials used by sibling worktrees.

Local Cloudflare callback tunnels use the manifest's tunnel name and hostname as base identities. SDK desired-state compilation appends a stable, opaque deployment scope derived from the machine identity and absolute worktree root to both the Tunnel name and the first DNS label. For example, `treeseed-local-connectors` and `connect.local.treeseed.dev` become `treeseed-local-connectors-<scope>` and `connect-<scope>.local.treeseed.dev`. This prevents developers, worktrees, and local deployments from adopting or rewriting one another's Tunnel and DNS resources. Legacy unscoped resources are retained with an explicit reconciliation warning because their ownership may have become shared before scoped identities were introduced.

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

## Managed Workflow Worktrees

`trsd switch <branch> --worktree --json` creates a managed task worktree under:

```text
.treeseed/worktrees/<branch-slug>
```

The directory name intentionally mirrors the branch slug. That makes human inspection, process ownership, and cleanup easier than hash-first worktree names. A branch may have only one active managed worktree at a time; if another worktree already owns the branch, `switch` must report that owner instead of creating a second checkout.

Commands run inside `.treeseed/worktrees/*` fail closed when the directory is stale, unregistered, or missing its worktree marker. They must not resolve upward into the parent root repository and accidentally save, stage, or stop processes for the wrong checkout.

Successful `trsd stage` from a managed task worktree merges current `staging` down into the task branch, promotes exact verified refs through the workflow engine, and preserves the staged branch/worktree by default. Use `--cleanup success` only when source cleanup is intentionally safe after promotion. Interrupted runs should be recovered with `trsd recover --json` or resumed with `trsd resume <run-id> --json`, not by manually deleting branches or worktree directories.

## Worktrees And Ports

Runtime ownership is worktree-scoped. Main, staging, and every feature worktree can run its own managed dev instance at the same time.

Workflow checkpoint ownership follows the same worktree boundary for ordinary task saves. `trsd save` records its workflow lock and journal in the current physical worktree so a checkpoint in one feature worktree does not block unrelated work in another feature worktree, even while a sibling worktree is staging. Promotion commands remain repository-family serialized: `trsd stage` and `trsd release` use the shared primary checkout workflow lock because they mutate shared staging or production state.

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

Managed dev Git discovery goes through SDK GitRunner-backed helpers. If Git lock diagnostics are needed, use:

```bash
npx trsd recover --git-locks --json
```

Recovery is safe-only. Active or recent lock files are reported with owner evidence and are not deleted automatically.
