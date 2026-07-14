# Treeseed Workspace Guide

This repository is the unified development workspace for the Treeseed system and the canonical integration environment for the package repositories in `packages/`.

For the canonical current-state package map, see `docs/package-ownership.md`.

## Independent Project Rule

This workspace is an integrated development and verification environment, not a monorepo. Each project under `packages/` is its own package/repository and must remain independently buildable, testable, and releasable from its package checkout.

- Do not assume root-level workspace state is available when package-local verification, builds, release checks, or CI run inside an individual package repository.
- Do not make package-local tests or builds depend on unpublished sibling source checkouts unless the dependency is explicitly declared and intentionally injected by the Treeseed package workflow.
- The Market project may orchestrate integrated saves, dependency pointers, fixture support, and cross-package verification, but that orchestration must preserve independent package operability.
- When fixing package verification, fix the package's standalone path first; integrated Market workflows should consume that capability instead of replacing it.

## Canonical Reconciliation Rules

Treeseed infrastructure is reconciled from exact desired state. The SDK-owned reconciliation platform documented in `docs/reconciliation-platform.md` is the only orchestration model for hosting, config sync, local development infrastructure, package workflows, capacity providers, TreeDX hosting/image consumption, staging, and release.

- Never mutate provider infrastructure outside `trsd` reconciliation. Direct Railway, Wrangler, Docker, GitHub CLI, or provider API calls are diagnostic only unless they are low-level private adapter primitives invoked by the reconciler.
- Never bypass official TreeSeed SDK operations or `trsd` CLI workflows for project work. Saves, commits, pushes, staging promotion, package pointer updates, reconciliation, verification, and release work must flow through existing `trsd` commands such as `trsd save`, `trsd stage`, `trsd release`, `trsd hosting`, `trsd package`, or new/updated SDK operations when capability is missing. Direct `git`, provider, package-manager, or shell orchestration is diagnostic only unless it is executed inside a TreeSeed operation.
- Never trust provider mutation success without a fresh live observation and postcondition verification. `ok: true` is valid only after selected live postconditions pass.
- Never add dry-run behavior anywhere in Treeseed commands, SDK workflows, reconciliation adapters, release flows, package scripts, hosting flows, capacity flows, provider operations, or tests. The only acceptable operation modes are `plan` for non-mutating previews and live execution for real work.
- Never leave the workspace in a state where local Treeseed operator tooling is unusable. Save, stage, release, cleanup, and recovery workflows may switch package manifests and lockfiles into production dependency mode, but they must preserve or immediately restore the local `trsd` operator package closure, validate `node_modules/.bin/trsd`, and fail with a clear repair action if workspace links or lockfiles are stale.
- Never add one-off provider orchestration to CLI handlers, package scripts, release flows, config flows, dev flows, TreeDX flows, capacity flows, or hosting adapters. New mutation paths must compile desired resources and route through the canonical SDK reconciliation engine.
- Every new host, service type, package workflow, secret store, provider resource, or local runtime capability must implement the canonical adapter lifecycle: refresh, diff, plan, validate, apply, refresh, verify, persist, plus destroy and import/adopt where applicable.
- Reconciliation is exact-state infrastructure management. Missing, duplicate, stale, offline, detached, misnamed, wrong-domain, wrong-image, missing-secret, or provider-limited resources are drift and must be planned as create, update, replace, delete, adopt, rename, reattach, retain, taint, or blocked.
- Undeclared Treeseed-owned provider resources are not ignored. They must be deleted, retained with an explicit reason, adopted, renamed, tainted, or reported as blocked drift.
- Cached state may locate resources and preserve lineage, but live provider observation is authoritative for readiness.
- Live tests are part of the platform contract. `trsd reconcile test-live --provider railway|cloudflare|github|local|all --environment staging --json` is the fast read-only smoke test. `trsd reconcile test-live --mode acceptance --provider <provider|all> --environment staging --yes --json` is the full periodic acceptance suite that creates, updates, verifies, and destroys isolated resources. `--mode cleanup --yes` removes leftover isolated live-test resources. Run cleanup before and after full provider acceptance; hosted, release, capacity, or adapter changes are not complete until acceptance and final cleanup pass.
- Providers with project/container creation limits must test project-scoped resources inside one live-test container. Railway acceptance creates at most one test project per provider run, tests all Railway resources inside it, and cleanup scans the stable `trsd-live-<environment>-railway-` prefix for leftovers.

## Package Roles

- `@treeseed/sdk`: platform, config, plugin, data, managed local dev supervision, and shared non-UI runtime substrate
- `@treeseed/ui`: reusable layout-down Astro/React components, app shells, forms, cards, controls, dashboards, theme tokens, and CSS primitives
- `@treeseed/core`: integrated Treeseed platform starter for Astro/Starlight web runtime, site layering, tenant config, plugin loading, foreground web runtime composition, content model, and forms
- `@treeseed/admin`: distributable AGPLv3 administration portal layered on core/ui; owns admin routes, middleware, auth/session glue, API client facades, admin view models, catalog display, and secret-manager UI/contracts
- `@treeseed/market`: root hosted Treeseed tenant; owns public site, content, docs, page overrides, the root web tenant `treeseed.site.yaml`, Treeseed branding, and future ecommerce/business policy
- `@treeseed/agent`: processing runtime, provider API, provider manager, provider runner, worker runtime, AgentKernel execution, mode scheduling, built-in handlers, agent testing harnesses, provider-local capacity enforcement, runtime images/templates, and runtime support modules
- `@treeseed/api`: Treeseed backend API, package-local backend `treeseed.site.yaml`, Treeseed PostgreSQL adapter, migrations, operation lifecycle, route descriptors, and Treeseed operations runner
- `@treeseed/cli`: operator and developer CLI workflows
- `@treeseed/reviewer`: local-only guarantee run review UI, screenshot/log triage, reviewer notes, evidence bundling, and AI-agent workplan generation
- `packages/treedx`: TreeDX implementation and Docker Hub release image used by Treeseed-hosted TreeDX bootstrap and related platform workflows

## TreeSeed Content Model Rule

Agent definitions, questions, objectives, notes, proposals, and decisions are Astro content models. They must be Markdown/MDX entries with SDK-contract frontmatter and content bodies. Root Market content lives under `src/content/**`; package project content lives under `docs/src/content/**`.

Agent definitions must live in `src/content/agents/` for the root Market project and `docs/src/content/agents/` for package projects.

Notes linked to other content must live under `src/content/notes/{classification}/` or `docs/src/content/notes/{classification}/` and must link to their subject through SDK-supported frontmatter fields such as `about`, `relatedObjectives`, `relatedQuestions`, `relatedProposals`, or `relatedDecisions`.

Agents and operations must use TreeDX-backed content operations for real content access and mutation. Do not add direct local-content reads or writes for agent work except fixture inspection that proves a TreeDX-backed operation.

## Package Integration Manifests

- Checked-out package repositories should declare package-local Treeseed metadata in `treeseed.package.yaml`.
- `treeseed.package.yaml` is the preferred extension point for package repository slug, workflow names, image targets, source-build policy, production image workflow, hosting source mode, and package credential needs.
- `trsd config` discovers checked-out package manifests and merges their environment registry entries into the central workspace `.treeseed/config` state.
- Repository-scoped GitHub tokens use `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>` with uppercase names and single underscores, for example `TREESEED_GITHUB_TOKEN_TREESEED_AI_ADMIN` and `TREESEED_GITHUB_TOKEN_TREESEED_AI_TREEDX`; `TREESEED_GITHUB_TOKEN` is the canonical fallback for repositories without a scoped token.
- `packages/admin` is an npm package with release gate `packages/admin/.github/workflows/deploy.yml`; publishing expects the package repository GitHub `production` environment secret `NPM_TOKEN`.
- Use `treeseed.site.yaml` for hostable application manifests and hosting ownership. The root manifest owns the Market web tenant; package-local manifests such as `packages/api/treeseed.site.yaml` own independently released runtime surfaces. Add package-local app manifests only when the package itself owns deployable app surfaces.
- Project architecture is logical: repository identity plus `rootPath`, optional `sitePath`, optional `contentPath`, `contentRuntimeSource`, and `localContentMaterialization`. The Market project uses `sitePath: "."`; first-party package projects use `sitePath: "docs"` even before docs sites are prepared. Submodules are supported local materialization/workspace mechanics, not the canonical project model. The operating principle is that projects should be easy to create from templates and easy to import from live projects without restructuring.
- If a package needs local development topology beyond package scripts, prefer a future package-local `treeseed.dev.yaml` style manifest over bespoke CLI logic; the CLI/SDK should discover and merge these manifests instead of hard-coding package names.
- TreeDX staging deployments build from GitHub source at exact commits through Railway reconciliation. Prefer `npx trsd package image --package treedx --branch staging --plan --json` for policy inspection; `npx trsd db image` remains a TreeDX-domain wrapper.
- TreeDX tagged release images are cut only from merges to `main`; production consumes semantic Docker image tags.
- Node package prebuild and public release order is `@treeseed/sdk`, `@treeseed/ui`, `@treeseed/core`, `@treeseed/admin`, `@treeseed/cli`, `@treeseed/agent`. `@treeseed/api` is deploy-only/private for now, and `packages/treedx` follows the image/service workflow declared in its package manifest.

## Boundary Rules

- `sdk` must not import from `core`, `admin`, `api`, `agent`, `ui`, `cli`, TreeDX source, or root market source.
- `ui` must not import from root, `admin`, `core`, `api`, `agent`, or `cli`; it may depend on UI/runtime libraries only.
- `core` may depend on `sdk` and `ui`; it must not depend on `admin`, `api`, `cli`, or `agent`.
- `admin` may depend on `sdk`, `core`, and `ui`; it must not import root `src/**`; `api` is allowed only as optional/dev/test-local support when no runtime package boundary is crossed.
- `market` may consume public exports from `admin`, `core`, `ui`, and `sdk`, and may call API behavior through HTTP/proxy/client surfaces; it must not import backend implementation from `api`.
- `api` may depend on `sdk`; it must not import root/admin/core UI implementation.
- `cli` may depend on `sdk`, `core`, and narrow public surfaces from `agent` when command execution requires them.
- `reviewer` may depend on `cli`, `sdk`, and `ui`; it must remain local-only and must not own guarantee execution, scene execution, release gates, provider orchestration, or hosted control-plane behavior.
- `agent` may depend on `sdk`; it must not depend on `core`, `admin`, root market, or `api` implementation.
- `treedx` remains product-neutral and must not encode Treeseed product semantics.
- Shared fixture references do not imply package ownership.
- Prefer canonical SDK import paths. Do not reintroduce alias exports or compatibility paths in unreleased packages.
- Type and lint failures must be fixed at the source. Do not silence them with `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, relaxed compiler settings, disabled lint rules, declaration-build exclusions, or no-op placeholder shims unless the user explicitly approves a temporary exception with a removal plan.
- Source code must be TypeScript-first. Do not add checked-in `.js` or `.d.ts` files outside `dist`/generated/vendor outputs unless the file is absolutely required, such as a tiny runtime loader or ambient declaration that cannot be represented as normal `.ts`; document that reason and prefer converting existing scripts to `.ts` whenever touched.

## Guarantee Planning And Maintenance

TreeSeed guarantees are package-local YAML product contracts integrated by the root Market project. They are the canonical source for release-blocking product promises; generated CSV, JSON, and Markdown outputs are reports only and must not be hand-edited.

- During planning, identify affected guarantees or recommend new guarantees.
- Use lowercase kebab-case `type` and `subtype` values, for example `project` and `question`.
- Use the `surface` field to distinguish where a promise is verified, such as `admin-ui`, `agent-runtime`, or `api-control-plane`.
- Keep guarantee files under `guarantees/<type>/<subtype>/` in the package or root project that owns the behavior.
- When implementing a feature, update or add the package-local guarantee YAML near the owning implementation.
- When changing API behavior, update verifier references or API acceptance cases.
- When changing UI behavior, update guarantee scene manifests and stable `data-scene` or `testId` selectors.
- When fixing a bug, add or strengthen a guarantee if the bug represents a product promise that should not regress.
- Do not add TreeSeed guarantee manifests to `packages/treedx`; TreeDX remains product-neutral. TreeSeed TreeDX routing and authorization guarantees belong in `packages/api`.
- Agent runtime guarantees belong in `packages/agent`, durable agent control-plane guarantees belong in `packages/api`, and Admin observability guarantees belong in `packages/admin`.
- If a guarantee cannot be implemented yet, mark it `planned`, `blocked`, or `backlog` with explicit notes and do not rely on it as an active release gate.
- Do not mark a guarantee `active` until required scene/API/content/audit verifier refs resolve and can produce repeatable evidence.
- Use focused guarantee commands while developing:

```bash
npx trsd guarantees validate --type project --subtype question --json
npx trsd guarantees plan --type capacity --json
npx trsd guarantees run --owner-package @treeseed/agent --environment local --json
```

- Before completing substantial work, run the narrowest relevant guarantee validation, plan, or active guarantee run.
- Before release work, use the release CLI path so full release guarantees are executed and enforced.
- Never bypass release guarantees by editing GitHub Actions directly.

## Agent Capacity Architecture

Canonical implementation docs:

- `docs/agent-capacity-implementation-roadmap.md`
- `docs/agent-capacity-domain-model.md`
- `docs/capacity_provider_agent_coordination_architecture.md`
- `docs/agent-kernel-mode-runtime.md`
- `docs/agent-capacity-operator-surfaces.md`

Package ownership for the capacity rearchitecture is fixed:

- `@treeseed/agent` owns provider runtime, provider API, provider manager, provider runner, AgentKernel execution, mode scheduling, provider-local lifecycle, runtime images/templates, and runtime tests.
- `@treeseed/sdk` owns portable capacity contracts, reconciliation contracts, config, and provider-neutral helper logic.
- `@treeseed/api` owns durable provider availability sessions, assignment leases, reservations, mode-run records, usage actuals, ledger settlement, and project-scoped TreeDX proxy authorization.
- `@treeseed/admin` and `@treeseed/cli` own operator surfaces over SDK/API/agent public contracts; they must not become schedulers.
- `@treeseed/core` owns web runtime composition only. It does not own AgentKernel execution, provider scheduling, provider runtime, or capacity assignment.
- `packages/treedx` remains product-neutral. Treeseed assignment semantics, agent classes, capacity policy, and provider grants belong outside TreeDX.

Use precise terms:

- Use `provider manager` for the provider-local supervisor that checks in, receives leases, dispatches runners, and renews/completes/returns assignments.
- Use `assignment function` for API-side deterministic provider/project matching.
- Use `team capacity policy` or `allocation set` for human/admin budget policy.
- Use `operations runner` for `packages/api` platform operation execution.
- Do not use unqualified `manager` when writing new capacity-provider or agent architecture docs.

Projects own agents, agent classes, handlers, prompts, planning/acting permissions, output contracts, and project work semantics. Capacity providers supply execution providers, native budgets, runner concurrency, availability windows, capabilities, and provider-local constraints. Providers must not approve decisions, mutate allocation policy, define project agent classes, or widen assigned work.

`trsd capacity build`, `trsd capacity up`, `trsd capacity status`, `trsd capacity logs`, `trsd capacity down`, and `trsd capacity test-local` manage provider runtime lifecycle and diagnostics through reconciliation. Provider check-ins, assignment leases, mode runs, usage actuals, and ledger entries are API control-plane records, not reconciled infrastructure resources.

Architecture-changing capacity work must update the canonical docs above and `docs/package-ownership.md` before it is considered complete.

### Real Workday And Agent Content Rules

- Workday verification runs are real TreeSeed workdays, not scripted smoke tests. They must exercise the same API, provider, execution-provider, TreeDX, assignment, mode-run, usage, and settlement paths used by normal workdays.
- A workday is duration- and budget-bounded. It must not stop merely because a fixed assignment count completed. While the workday window is open and capacity remains, the system should keep scheduling useful eligible planning work.
- Planning mode must involve every eligible configured project agent before repeating agents. With no approved decisions, planning is still productive: agents propose work, ask questions, produce estimates, review proposals, generate notes, structure knowledge, and summarize the workday.
- Acting mode must not run without approved decisions, readiness, and accepted/scheduled/active capacity-plan provenance.
- Generated agent content must be real TreeSeed Knowledge Hub content, never dummy or test-shaped content. Workday observation reports belong under `.treeseed/workday-reports`; agent artifacts belong in the proper content collections.
- TreeDX is the only way agents and operations may access, query, and update content model instances. Do not add direct local-content reads or writes for agent work, except fixture inspection that proves a TreeDX-backed operation.
- Proposals, questions, notes, knowledge pages, books, and workday summaries must follow the SDK content model and land in the correct collections. Feedback, estimates, answers, reviews, release-readiness observations, and implementation/planning commentary are linked notes unless an agent's configured output explicitly creates another model.
- Every generated note must link to its subject with frontmatter such as `about`, `relatedObjectives`, `relatedQuestions`, `relatedProposals`, or `relatedDecisions`.
- Agent handoff must be configuration-driven. Handlers may deterministically validate, route, and serialize content, but agent prompts/configuration decide which subject is being handled and which artifact type is expected.
- Every agent execution must be forensically traceable: agent, mode, class, handler, assignment, workday, provider, runner, execution-provider config, inputs, TreeDX context refs, generated artifacts, signals, diagnostics, token counts, durations, usage, and errors must be inspectable from CLI/Admin/API logs.

## Shared Fixture Model

- `.fixtures/treeseed-fixtures` is the canonical integrated Treeseed project.
- The fixture is intentionally shared by package verification wherever an integrated Treeseed project shape is required. It commonly exercises `sdk`, `core`, and `cli`, and may reference `ui`, `admin`, `api`, or `agent` contracts when the canonical project genuinely uses those surfaces.
- Package-local verification must adapt to the fixture. Do not rewrite the fixture to satisfy one package.
- Fixture shims and package injection exist only to make isolated package verification behave like the canonical integrated project.
- SDK owns the shared fixture support model and the narrow contracts-only Core agent shim used when package-only verification only needs the agent contract subpaths.

### Shared Fixture Purpose

The shared fixture exists to validate the full Treeseed project shape in one canonical place:

- content and platform configuration from `sdk`
- Astro/Starlight site runtime and plugin layering from `core`
- reusable component/style surfaces from `ui`
- admin routes and view-model contracts from `admin` when the integrated project uses them
- backend/API and agent contract surfaces where the integrated project needs them for typechecking or runtime smoke coverage
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
- `@treeseed/core` site and runtime surfaces
- `@treeseed/ui` components/styles used by the integrated site
- `@treeseed/admin` public exports when the integrated site layers admin behavior
- API or agent contract/public surfaces only when the fixture genuinely models those workflows
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
- Do not print or echo wrapper environments. Treeseed-managed configuration uses canonical names such as `TREESEED_GITHUB_TOKEN`, `TREESEED_RAILWAY_API_TOKEN`, and `TREESEED_CLOUDFLARE_API_TOKEN`; wrappers translate them to service-native child-process names such as `GH_TOKEN`, `RAILWAY_API_TOKEN`, and `CLOUDFLARE_API_TOKEN` only at the provider CLI boundary so provider CLIs can authenticate without exposing secrets in shell history or logs.
- Cloudflare tokens should use the dashboard permission names, not only the API-doc names. Account-wide permissions for live Treeseed web reconciliation are Pages Write, Workers Scripts Write, Workers KV Storage Write, Workers R2 Storage Write, D1 Write, Queues Write, Turnstile Sites Write, Account Rulesets Write, and Account Rule Lists Write. The target zone needs Zone Read, DNS Write, Cache Settings Write, and SSL and Certificates Write. Cloudflare API docs may call Cache Settings the Cache Rules permission, and Account Rule Lists the Account Filter Lists permission.

Hosting and capacity-provider runtime:

- Treat hosted infrastructure as desired-state reconciliation, not a sequential provider-command flow. The source of truth is the discovered Treeseed manifests, package/application environment registries, and central machine config; `trsd` commands should derive, reconcile, verify, and report provider state from that ideal model.
- Do not manually repair Railway or Cloudflare resources with provider CLIs as a substitute for fixing Treeseed reconciliation. Direct provider wrapper usage is acceptable for read-only inventory/debugging, but mutating hosted resources should flow through `trsd` reconcile/bootstrap/hosting/destroy workflows so the result is reproducible.
- The root app deploys only the hosted web tenant: public site, knowledge hub, admin UI surfaces contributed by `@treeseed/admin`, reusable UI from `@treeseed/ui`, and `/v1/*` proxy/client surfaces.
- `packages/api` deploys the API, Treeseed operations runner, Treeseed PostgreSQL service, and public TreeDX federation on Railway in the `treeseed-api` project. The canonical services are `treeseed-api`, `treeseed-api-operations-runner-01`, `treeseed-api-postgres`, and indexed `public-treedx-node-01` services. Stateful volumes must match the service name with a `-volume` suffix so scale-down and scale-up can reclaim storage.
- Railway source isolation is an absolute release invariant. The staging `treeseed-api`, operations-runner, and public TreeDX services must always build from their GitHub `staging` branch Dockerfiles and must never consume Docker Hub image refs, including as a temporary repair. Production API-owned services must use separate Railway service identities and immutable released Docker Hub image tags; they must never share a Railway service identity with staging because Railway service source connections are global across environments. Any observed staging image source, production Git source, or shared staging/production source identity is blocking drift: fix the desired state and reconcile through `trsd hosting`, then require live source-mode verification. Never report a deployment successful from mutation output alone.
- TreeDX container images are produced by tagged releases in `packages/treedx` and pushed to Docker Hub as `treeseed/treedx:<tag>`. Hosted TreeDX reconciliation should deploy an explicit tagged image when proving staging or production, not an unverified moving image.
- TreeDX semantic release tags must only be cut from merges to `main`, matching the release discipline used by the other packages and projects. Do not create release tags from staging, feature, or repair branches.
- TreeDX staging builds from source through Railway reconciliation and must not publish registry images for routine staging validation.
- Railway service identities are project-wide and must remain identical across staging and production. Configure environment-specific Git or image sources on the same canonical API, operations-runner, PostgreSQL, and TreeDX services; never create `-production` service aliases.
- Non-Node package projects such as TreeDX should declare Treeseed development/release metadata in a package-local `treeseed.package.yaml`. The SDK package adapter reads this file to discover the package id, repository, image target, verify commands, source-build policy, production image workflow, and hosting source mode. Prefer extending this declarative manifest pattern for new package projects instead of adding package-specific CLI logic.
- Package repositories may require repository-scoped GitHub credentials when they live outside the root repository owner. The canonical key format is `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>`, uppercased with single underscores; for TreeDX this is `TREESEED_GITHUB_TOKEN_TREESEED_AI_TREEDX`. `TREESEED_GITHUB_TOKEN` is the canonical fallback for repositories without a scoped token; `GH_TOKEN` is emitted only for GitHub tooling at execution boundaries.
- Use `npx trsd db image --branch staging --plan --json` to inspect TreeDX source-build policy for staging. Production image credentials and image refs are reconciled only during semantic release flows.
- Capacity-provider runtime, provider API, provider manager, provider runner, AgentKernel execution, mode scheduling, container assets, templates, and lifecycle behavior are owned by `@treeseed/agent`.
- Use `trsd capacity build`, `trsd capacity up`, `trsd capacity status`, `trsd capacity logs`, `trsd capacity down`, and `trsd capacity test-local` for provider lifecycle work.
- Provider secrets must be stored through `trsd config` or host secret managers. Do not create plaintext provider env files or render provider API keys into Compose.
- The package-owned provider image starts `node ./dist/provider/entrypoint.js` with provider API (`api`), provider manager (`manager`), and provider runner (`runner`) roles.
- Provider assignments should carry project-scoped TreeDX proxy handles rather than raw TreeDX credentials. Provider runners call the TreeSeed API with the provider API key; the API owns project authorization, TreeDX node credential handling, and forwarding allowed `/v1/dx/projects/:projectId/...` operations.

For agents and automation:

- Start with `npx trsd status --json` to inspect branch role, dirty state, locks, package state, and next safe actions.
- Use `npx trsd ready local --json` before local save/stage work. Use `npx trsd ready staging --json` or `npx trsd ready prod --json` before expensive hosted deploys when provider credentials are configured.
- Use targeted hosting plans before repairs: `npx trsd hosting plan --environment staging --service api --json` and `npx trsd hosting plan --environment staging --service operationsRunner --json`.
- Use targeted live verification when debugging hosted drift: `npx trsd hosting verify --environment staging --service api --live --json` and `npx trsd hosting verify --environment staging --service operationsRunner --live --json`.
- Use `npx trsd operations smoke --environment staging --service operationsRunner --json` before TreeDX bootstrap or whenever a platform operation remains queued. It proves the Treeseed runner can claim and complete a diagnostic operation.
- For provider runtime work, use `npm -w packages/agent run test:capacity-provider-runtime`, `npm -w packages/agent run capacity-provider:test-local`, and the package-local `npm -w packages/agent run verify:local` closure smoke.
- For local UI iteration, prefer the managed worktree dev instance: `npx trsd dev start --web-runtime local --json`. `--web-runtime local` uses the Astro dev server for hot reload instead of rebuilding the Cloudflare/Wrangler runtime, while still sharing the local API/control-plane state.
- The managed local dev plan should start web from the root repo and start API plus runner from `packages/api`. If `npx trsd dev start --web-runtime local --plan --json` shows root backend paths, treat that as a regression.
- `npx trsd dev` without a subcommand still runs the foreground supervisor in the current shell. Use it when you intentionally want terminal-owned process lifecycle and Ctrl-C shutdown.
- Managed dev instances are worktree-scoped and discoverable. Use `npx trsd dev status --json` for the current worktree, `npx trsd dev status --all --json` for sibling worktrees in the same repository family, `npx trsd dev logs --follow` for logs, and `npx trsd dev stop --json` to stop only the current worktree instance.
- Treeseed dev supervisors mirror output into stable log files under `.treeseed/logs/dev-<surfaces>.jsonl`, for example `.treeseed/logs/dev-web-api.jsonl`. Managed instances also write `.treeseed/dev/instances/<scope>.json` and `.treeseed/dev/pids/<scope>.pid` in the current worktree, plus a non-authoritative repository-family discovery index under the git common dir.
- `--force` on managed dev replaces only the current worktree instance. Use `--force-conflicts` only when you intentionally want to stop a sibling worktree's process that owns an explicitly requested conflicting port.
- See `docs/local-dev-instances.md` for the worktree-scoped dev instance architecture, port allocation, state files, and AI-agent workflow.
- Use `npx trsd switch <task-branch> --json`; when the result includes `payload.worktreePath`, run all future commands from that worktree path.
- Use `npx trsd update --from staging --json` from a task branch or managed worktree when staging has advanced and you need those changes merged into the current branch. This is the inverse of `stage`: `update` merges staging down into the task branch; `stage` merges the task branch up into staging.
- `update` requires a clean root and package repos. Run `npx trsd save --json "checkpoint before update"` first when you have local changes.
- `update` handles root, package repos, and manifest-only packages such as TreeDX through GitRunner. Do not manually merge package submodules unless recovering from a conflict.
- Use `npx trsd save --json "message"` for normal checkpoints. This is the default fast save lane: it saves package repos in dependency order, updates internal refs and lockfiles, restores workspace links, and does not run release-candidate or wait for hosted GitHub Actions, Cloudflare, Railway, or strict clean-install release rehearsal unless explicitly requested. Prefer this for ordinary development saves, documentation updates, focused code checkpoints, and any frequent AI-agent checkpoint where hosted proof would be wasteful.
- Use `npx trsd save --verify local --json "message"` when a fast-lane checkpoint also needs local package/project verification before it is pushed. This is stronger than the default fast checkpoint and can take substantially longer because dirty packages and dependents may run package-local verify scripts, but it still avoids hosted CI/deploy gates unless those are explicitly requested.
- Use `npx trsd save --lane promotion --json "message"` only when a save should behave like a promotion rehearsal. Promotion lane defaults to hosted CI gates on staging and strict release-candidate checks, so it is appropriate before a risky staging handoff, after dependency topology or release workflow changes, before asking another person to trust staged infrastructure, or when debugging hosted CI/CD behavior. Do not use promotion lane for routine iteration.
- Use `--verify-deployed-resources` only when the checkpoint should wait for hosted provider resource checks. Use `--release-candidate strict` when you specifically need strict release-candidate rehearsal without switching the whole save to promotion lane.
- Use `npx trsd release-candidate --strict --json` whenever you need full package graph proof. Use `--verify-driver action` for managed `gh act` parity, `--verify-driver local` for faster package-local proof, and `--package <id>` for a targeted package proof that does not satisfy production release. Run release-candidate for dependency topology changes, package export map changes, workflow changes, risky lockfile/package manifest changes, and production promotion preparation. Do not run it for every routine checkpoint.
- Use `npx trsd workflow dispatch --repo <owner/name> --workflow <file> --branch <ref> --plan --json` whenever you need to test a `workflow_dispatch` workflow without pushing a new commit. Execute with `--execute --json` only after the plan shows the selected `github-workflow-dispatch` resource and credential routing are correct. This command is reconciler-backed and should be preferred for package image, release-gate, and diagnostic workflow testing over ad hoc `gh workflow run` calls.
- Use `npx trsd stage --plan --json "message"` to inspect staging promotion before executing.
- Plain `npx trsd stage --json "message"` is a fully monitored staging promotion command. It merges current `staging` down into the feature branch first, stops for conflict resolution before staging is mutated, runs local proof, promotes exact verified root/package heads to staging, and then requires the exact-SHA `verify.yml` gates plus applicable staging `deploy.yml` gates to complete successfully before reporting success.
- Stage must stop at the first conclusive hosted verification or deployment failure and report that failing run. It must not report success while required GitHub Actions, Railway reconciliation, Cloudflare reconciliation, or live staging verification are pending or unsuccessful.
- If stage stops with conflicts or local verification failures, stay on the preserved feature branch/worktree, fix the issue, run `npx trsd save --verify local --json "message"`, then rerun `npx trsd stage --json "message"` or `npx trsd resume <runId>`.
- Never manually delete feature branches, package branches, or managed worktrees after a failed stage. Use `npx trsd recover --json` and `npx trsd resume <runId>` so cleanup and ref verification remain consistent.
- Successful stage runs delete the exact merged local and remote feature branches and managed worktrees after every required staging gate succeeds. Use explicit manual cleanup only for exceptional forensic retention; failed stage runs must preserve the feature branch for repair and resume.
- `release` is the strict production promotion command. It must use a valid strict release-candidate proof for the exact staging state being promoted, and should run or require fresh proof before production mutation completes.
- Use `npx trsd close "reason" --json` when abandoning a task. Close archives the branch and cleans up managed worktrees.
- Use `npx trsd recover --json`, `npx trsd recover --prune-stale --json`, and `npx trsd resume <run-id> --json` after interrupted workflow commands.

For humans:

- The default in-place workflow remains valid: `switch`, edit, `save`, then `stage` or `close`.
- Use `npx trsd switch <branch> --worktree --json` when isolating risky or parallel work. After switching into a managed worktree, commands such as `save`, `update`, `stage`, and `close` auto-detect the worktree from `.treeseed/worktree.json`; do not pass a worktree mode to those commands. Agents use managed worktrees automatically when agent environment markers are present.
- Use `--json` whenever another tool needs stable structured output.

For releases:

- Release only after staging is green.
- Run `npx trsd release --patch --verify-deployed-resources --plan --json` before a production promotion. Execute with `--verify-deployed-resources` when production live resource checks are required.
- Release waits for production CI/CD and, when requested, strict live hosted-service verification before returning success.
- Use `npx trsd release --patch --verify-deployed-resources --json`, `npx trsd release --minor --verify-deployed-resources --json`, or `npx trsd release --major --verify-deployed-resources --json`.
- If a `--minor` release attempt has already created version bumps or tags and then fails, do not run a second `--minor`. Resume the recorded workflow or use `--patch` after repairing the failure.
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

## Starter And Guarantee Rules

- The active first-party starters are `engineering` and `research`.
- `information-hub` is folded into `research`; do not re-add it to catalogs, release graphs, starter tests, or submodules without a new product decision and distinct deterministic knowledge-pack packaging workflow.
- Engineering starter agents should mirror the root Market activity-profile agent definitions.
- Research starter active agents are research/review/writer oriented: researcher, reviewer, technical-writer, and deterministic reporter.
- API endpoint reliability belongs to `@treeseed/api` endpoint-family guarantees backed by complete route descriptor matrices.
- UI/Admin guarantees should use `dependsOnGuarantees` to depend on API endpoint guarantees instead of duplicating endpoint reliability checks.
- Agent guarantee runs must support deterministic mock execution for CI and live Codex proof for local/staging. Explicit live Codex runs must fail closed with `missing_codex_auth` when Codex auth is unavailable.
