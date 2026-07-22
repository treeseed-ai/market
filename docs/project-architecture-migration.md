# Project Architecture Migration Roadmap

**Status:** Phases 1-10 implemented; local database apply proof complete  
**Date:** 2026-06-19  
**Audience:** Treeseed SDK, API, CLI, Admin, agent runtime, TreeDX, package maintainers, and operators  

This roadmap defines the migration from a mostly physical site/content/parent workspace model to a logical project architecture that can support existing single-repository engineering projects, split content repositories, TreeDX-backed content operations, local development, and independent software/content release paths.

Related architecture:

- [Package Ownership](./package-ownership.md)
- [Reconciliation Platform](./reconciliation-platform.md)
- [Secrets And Capability Architecture](./secrets-and-capability-architecture.md)
- [Secrets And Capability Implementation Roadmap](./secrets-and-capability-implementation-roadmap.md)
- [Agent Capacity Implementation Roadmap](./agent-capacity-implementation-roadmap.md)
- [Operations Runner](./operations-runner.md)
- [Railway Market Backend Deployment](./api-railway-deploy.md)

## Target Outcome

Treeseed projects should be described by logical repository bindings and runtime responsibilities, not by one required filesystem/submodule layout.

The first-version target is:

- Existing engineering repositories can be imported as `single_repository_site` projects.
- The root Market project uses `sitePath: "."`.
- First-party package projects use `sitePath: "docs"` even when docs-site implementation is added later.
- Content publishing to Cloudflare R2 is independent from software deployment to Cloudflare Pages/Workers or Railway.
- Local development can materialize content when humans need local editing, but CI/CD, hosted deploys, and capacity-provider operations should use API, TreeDX, or R2 content access by default.
- TreeDX remains the hosted repository/content database and indexing layer, while Treeseed owns project topology semantics.
- Seeds can import/edit TreeSeed-owned repositories with `TREESEED_GITHUB_TOKEN` until GitHub App installation support is available.

## Canonical Terms

`single_repository_site` means software, site implementation, and local content path are in one Git repository. The site and content can still be deployed independently.

`split_site_content` means the software/site repository and content repository are separate Git repositories.

`parent_workspace` means an orchestration project references child repositories. It may use submodules, but submodule embedding is not required.

`rootPath` is the repository-relative project root. The default is `.`.

`sitePath` is the repository-relative site implementation path. The Market project uses `.`. First-party package projects use `docs`.

`contentPath` is the repository-relative local content path, usually under `sitePath`. Common values are `src/content`, `docs/src/content`, `docs`, or `content`.

`contentRuntimeSource` is where runtime content is read from: `local_directory`, `treedx_snapshot`, `r2_published_manifest`, or `r2_preview_overlay`.

`localContentMaterialization` is how local content files appear during development: `none`, `existing_path`, `managed_clone`, or `submodule`.

`contentPublishTarget` is the durable content publication destination. The v1 target is Cloudflare R2 through Treeseed content publish workflows.

## Ownership Model

- `@treeseed/sdk` owns project architecture contracts, seed schema, normalization, validation, reconciliation graph integration, local dev planning, and provider-neutral helper logic.
- `@treeseed/api` owns durable project topology records, repository/topology routes, seed application, TreeDX library bindings, content-source records, and platform operation integration.
- `@treeseed/cli` owns `trsd seed`, import/config diagnostics, project architecture reports, and local dev command surfaces.
- `@treeseed/admin` owns browser views for project topology, content source, TreeDX binding, R2 publish state, local materialization policy, and warnings.
- `@treeseed/agent` owns provider portfolio consumption of normalized project architecture and local rejection of out-of-scope workspace/content behavior.
- `packages/treedx` owns product-neutral repository storage, indexing, querying, snapshots, and git workspace mechanics. Treeseed project topology stays outside TreeDX.
- root `@treeseed/market` owns the root web tenant, public docs/content, product messaging, and the canonical TreeSeed team seed.

## Phase 1: Documentation And Vocabulary

Goal: make the new project model explicit before code migration begins.

Status: implemented as a documentation-only alignment pass across package ownership, reconciliation, seed, local dev, operations-runner, demo, API deployment, agent/operator, Admin, and CLI guidance.

Implementation note: the aligned docs now treat project architecture as logical repository bindings plus `rootPath`, `sitePath`, `contentPath`, `contentRuntimeSource`, and `localContentMaterialization`. Submodules remain supported for local materialization and package workspace mechanics, but they are not the canonical project model. The operating principle is that projects should be easy to create from templates and easy to import from live projects without restructuring.

Implementation scope:

- Add this roadmap and link it from package ownership, reconciliation, seed, local dev, operations-runner, and relevant capacity docs.
- Update docs that describe project architecture as submodule-first or parent-workspace-first.
- State that submodules are a supported materialization strategy, not the canonical logical model.
- Clarify that the root Market manifest owns the web tenant while package-local manifests may own independently released runtime surfaces.
- Document the default first-party project layout: Market `sitePath: "."`; packages `sitePath: "docs"`.

Acceptance criteria:

- The project architecture vocabulary is defined in one canonical roadmap.
- Package and reconciliation docs no longer imply a single physical project layout.
- New implementers can distinguish software deploy, content publish, local content materialization, and TreeDX content access.

Verification:

- `rg "single_repository_site|sitePath|contentPath|localContentMaterialization" docs`
- `rg "submodule" docs/project-architecture-migration.md docs/package-ownership.md docs/reconciliation-platform.md`

## Phase 2: SDK Contracts And Seed Schema

Goal: make project architecture first-class in SDK contracts and seed manifests instead of metadata-only.

Status: implemented as a clean SDK seed/schema migration. The canonical SDK surfaces are `packages/sdk/src/seeds/types.ts`, `packages/sdk/src/seeds/schema.ts`, `packages/sdk/src/seeds/normalize.ts`, and `packages/sdk/test/seeds/planner.test.ts`.

Implementation note: unreleased metadata topology such as `metadata.repositoryTopology` and `metadata.contentRoot` is intentionally rejected. Seed project records must use the canonical `architecture` block so projects should be easy to create from templates and easy to import from live projects without restructuring.

Implementation scope:

- Add SDK-owned types for project topology, project repository binding, content source binding, local materialization, and content publish target.
- Extend seed project records with a first-class architecture block containing `topology`, `rootPath`, `sitePath`, `contentPath`, `contentRuntimeSource`, `localContentMaterialization`, and `contentPublishTarget`.
- Keep `checkoutPath` and `submodulePath` as compatibility fields.
- Reject stale metadata topology such as `metadata.repositoryTopology` and `metadata.contentRoot`; repository `submodulePath` remains only a local workspace/materialization compatibility field.
- Validate `single_repository_site` projects can use one Git repository with different logical paths for software, site, and content.
- Validate CI/deploy defaults do not require full content checkout unless a workflow explicitly requests local content.
- Add seed export support so new canonical fields round-trip instead of falling back to opaque metadata.

Acceptance criteria:

- `seeds/treeseed.yaml` can represent single-repository package projects without using submodules.
- Existing seed records use canonical `architecture` fields instead of metadata-based repository topology.
- Invalid combinations, such as missing `sitePath` for a site-enabled project, fail with clear diagnostics.
- Seed plans never persist GitHub tokens or plaintext repository credentials.

Verification:

- `npm -w packages/sdk run test:unit -- test/seeds/planner.test.ts`
- `npm -w packages/sdk run verify:local`

## Phase 3: API Persistence And Project Surfaces

Goal: expose normalized project architecture through durable API/store surfaces.

Status: implemented as the API persistence and projection layer for canonical project architecture.

Implementation note: the API now keeps `architecture` as the canonical project shape through `MarketControlPlaneStore` project architecture methods, project details, seed apply/export, content-source projection, and the existing `/v1/projects/:projectId/repository-topology` route. The route path is retained for operator/API continuity, but the payload is canonical project architecture and legacy `repositoryTopology`, `contentRoot`, `split_software_content`, and `combined_compatibility` inputs are rejected because this architecture is unreleased.

Implementation scope:

- Prefer extending existing project surfaces before adding new tables:
  - `projects` for identity and metadata compatibility.
  - `project_hosting` for source repository and hosting integration.
  - `hub_repositories` for software/site/content repository bindings.
  - `hub_content_sources` for runtime content source and R2 manifest metadata.
  - `treeDxProjectLibraries` for TreeDX repository/content path binding.
  - `hubWorkspaceLinks` for optional parent workspace/submodule links.
- Add serializers and store methods that return one normalized project architecture object from the existing records.
- Update `/v1/projects/:projectId/repository-topology` so it reads and writes canonical project architecture while rejecting stale legacy topology payloads.
- Ensure project creation, launch, seed apply, seed export, portfolio manifests, and project details all use the same normalized architecture.
- Store token references as `credentialRef` metadata only; do not persist token values.

Acceptance criteria:

- Admin, CLI, Agent, and TreeDX proxy routes can read a single normalized architecture object for each project.
- Seed apply creates project records, repository records, content source records, and TreeDX library bindings for single-repository package projects.
- Repository topology updates use the retained route path with canonical architecture payloads, not legacy metadata topology.

Verification:

- `npm -w packages/api run test:unit -- test/lib/seed-apply.test.ts`
- Focused API route tests cover canonical architecture read/write and fail-closed rejection of legacy topology and secret-bearing payloads.
- `npm -w packages/api run verify:local`

## Phase 4: Local Development Materialization

Goal: let humans develop site and content locally without forcing content checkout into every workflow.

Status: implemented as SDK desired-graph diagnostics, a local reconcile unit, and CLI `trsd dev` controls.

Implementation note: `packages/sdk/src/platform/local-content-materialization.ts` reads canonical seed architecture and emits `local-content-materialization` resources into `compileTreeseedDesiredResourceGraph`. The local reconcile adapter observes existing paths, verifies submodule/managed clone state, and performs managed clone/fetch or submodule initialization only when `trsd dev --local-content preview` or `trsd dev --local-content edit` selects explicit materialization. GitHub credentials resolve through canonical `TREESEED_GITHUB_TOKEN` and `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>` names and are translated only into the immediate child process environment.

Implementation scope:

- Update `trsd dev --plan` so each project reports effective `rootPath`, `sitePath`, `contentPath`, `contentRuntimeSource`, and `localContentMaterialization`.
- For `single_repository_site`, default local content to `existing_path`.
- For `split_site_content`, default local content to `none` unless local content editing or preview is requested; then use `managed_clone`.
- Add `--local-content <auto|none|preview|edit>` to `trsd dev`, `trsd dev start`, and `trsd dev restart`.
- For explicit `submodule`, verify the submodule path and ref but do not make it the default architecture.
- For package projects with `sitePath: "docs"`, detect whether a docs site exists. If missing, report `site_not_prepared` instead of failing unrelated software/package workflows.
- Keep CI/CD, hosted deploys, and capacity-provider operations on API/TreeDX/R2 content access unless a command explicitly requests local content files.

Acceptance criteria:

- Local dev can run the Market root site from `.`.
- Package projects can be represented before their docs sites exist.
- Split content repositories are cloned only when local content editing requires them.
- Dev reports make it clear whether content is local, TreeDX-backed, or R2-backed.

Verification:

- `npm -w packages/sdk run test:unit -- test/utils/desired-resource-graph.test.ts test/utils/local-content-materialization.test.ts`
- `npm -w packages/cli run verify:local`
- `npx trsd dev --web-runtime local --plan --json`
- `npx trsd dev --web-runtime local --local-content preview --plan --json`
- `npx trsd dev start --web-runtime local --plan --json`
- `npm -w packages/sdk run verify:local`

## Phase 5: Independent Content Publish And Runtime Loading

Goal: separate content release from software release.

Status: implemented through SDK content runtime planning, project web monitor metadata, and API operations-runner projection.

Implementation note: `packages/sdk/src/platform/content-runtime-source.ts` resolves the effective runtime content source from canonical project architecture, local materialization state, TreeDX snapshot metadata, and R2 manifest/overlay metadata. `buildProjectWebMonitorResult` now reports safe `contentRuntime` metadata and a `content_runtime` check, while `packages/api/src/operations-runner/project-web-deployment-executor.js` carries project architecture and TreeDX/R2 publish artifacts into the monitor. Content publish remains a separate operation from software deploy: TreeDX-to-R2 publish is runner/API driven and explicitly reports that no GitHub Actions software workflow was dispatched.

Implementation scope:

- Define software deploy as site shell/runtime deployment to Cloudflare Pages/Workers or package-specific runtime hosting.
- Define content publish as a TreeDX or local-content snapshot written to Cloudflare R2 as manifests and artifacts.
- Ensure staging/prod site runtime reads content through the secured R2-backed route/proxy/loader path.
- Add local runtime fallback order: local content path when present and requested, TreeDX snapshot when configured, then R2 published manifest or R2 preview overlay fallback.
- Add diagnostics that report `ready`, `missing`, `site_not_prepared`, or `unsupported_structure` for content under `src/content`, `docs/src/content`, `docs`, or package docs paths.
- Keep content publish workflows independent from package release gates and software deploy workflows.

Acceptance criteria:

- Content-only changes can publish to R2 without deploying site software.
- Software-only changes can deploy the site without checking out the full content repository.
- Runtime reports identify the active content source, manifest key, overlay key, snapshot id, and latest content revision when available.
- Content structure diagnostics are actionable for packages that have docs directories but no prepared Treeseed content layout.

Verification:

- `npm -w packages/sdk run test:unit -- test/utils/content-runtime-source.test.ts test/utils/project-web-monitor.test.ts test/utils/published-content.test.ts test/utils/published-content-pipeline.test.ts`
- `npm -w packages/api run test:unit -- test/api/api.test.ts -t "project web deployment"`
- `npm -w packages/sdk run test:unit -- test/utils/desired-resource-graph.test.ts test/utils/local-content-materialization.test.ts`
- `npm -w packages/sdk run verify:local`
- `npm -w packages/api run verify:local`
- `npx trsd dev --web-runtime local --plan --json`
- `npx trsd dev --web-runtime local --local-content preview --plan --json`

## Phase 6: Existing GitHub Repository Import

Goal: import existing TreeSeed repositories and future customer repositories without requiring immediate GitHub App setup.

Status: implemented as an SDK-first safe import planner with CLI plan/apply and API persistence surfaces.

Implementation note: `packages/sdk/src/project-import.ts` exports `planTreeseedRepositoryImport` and safe GitHub credential-ref helpers. `trsd projects import <owner/repo> --team <team> --plan --json` produces a canonical, token-redacted import plan, while `--execute` posts that same plan to `POST /v1/teams/:teamId/projects/import` through `MarketClient.importProjectRepository`. The API applies the plan through existing `MarketControlPlaneStore` project, hub repository, canonical architecture, content source, and TreeDX library binding methods. This phase imports TreeSeed records only; it does not mutate GitHub repositories, create GitHub App grants, or prepare repository files.

Implementation scope:

- Add import planning that discovers:
  - owner/name/default branch.
  - likely `rootPath` values.
  - likely `sitePath` values: `.`, `docs`, `site`, `apps/web`.
  - likely `contentPath` values: `src/content`, `docs/src/content`, `docs`, `content`.
  - existing `treeseed.site.yaml`, `treeseed.package.yaml`, `src/manifest.yaml`, and docs directories.
- Use canonical `TREESEED_GITHUB_TOKEN` for temporary token-backed clone/import, with repo-scoped overrides from `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>`.
- Represent credentials in seeds as `credentialRef: env:TREESEED_GITHUB_TOKEN` or repo-scoped env refs. Never store token values.
- Import should create project records, hub repository records, TreeDX library bindings, content source defaults, and local materialization policy.
- Do not mutate GitHub repositories unless an explicit future `prepare repository` phase is requested.

Acceptance criteria:

- The importer can plan all first-party TreeSeed repositories without GitHub App config.
- Token-backed import is clearly marked temporary and adapter-boundary-only.
- Seed and audit output never reveal token values.

Verification:

- `npm -w packages/sdk run test:unit -- test/utils/project-import.test.ts`
- `npm -w packages/api run test:unit -- test/api/api.test.ts -t "imports existing GitHub repositories"`
- `npm -w packages/api run test:unit -- test/lib/api-route-descriptors.test.ts`
- `node packages/cli/scripts/projects-deploy.test.ts`
- `npx trsd projects import treeseed-ai/sdk --team treeseed --plan --json`
- `npm -w packages/cli run verify:local`
- `npm -w packages/sdk run verify:local`

## Phase 7: First-Party Package Preparation

Goal: make each first-party package representable as a TreeSeed project before all docs sites are fully built.

Status: implemented as package-manifest project architecture metadata and SDK package adapter readiness projection.

Implementation note: every first-party package `treeseed.package.yaml` now declares a `projectArchitecture` block with `topology: single_repository_site`, `rootPath: "."`, `sitePath: "docs"`, `contentPath: "docs"`, hosted `r2_published_manifest` runtime content, and a package-scoped Cloudflare R2 publish prefix. `packages/sdk/src/operations/services/package-adapters.ts` normalizes this metadata, exposes `projectArchitecture`, `docsSiteReadiness`, and `docsSiteDiagnostic` in package adapter metadata, and can derive safe package project resources for the later seed expansion phase. Missing package docs directories report `site_not_prepared`; they do not fail package validation or release workflows.

Implementation scope:

- Ensure each package project has enough metadata to be represented as:
  - `topology: single_repository_site`
  - `rootPath: "."`
  - `sitePath: "docs"`
  - `contentRuntimeSource: r2_published_manifest` for hosted environments
  - `localContentMaterialization: existing_path` when local docs/content exists, otherwise `none`
- Add docs-site readiness notes for packages that do not yet have a Treeseed docs implementation.
- Preserve `treeseed.package.yaml` release ownership and do not mix content publish into package release gates.
- Keep package CI independent from content checkout unless the package docs build explicitly requires local content.

Acceptance criteria:

- API, TreeDX, SDK, UI, CLI, Core, Admin, and Agent can all appear as projects in Admin.
- Missing docs sites are visible as preparation work, not seed failures.
- Package release workflow ownership remains unchanged.
- Package manifests expose `projectArchitecture` for future seed/Admin integration without adding credentials or changing package release gates.

Verification:

- `npm -w packages/sdk run test:unit -- test/utils/desired-resource-graph.test.ts test/utils/content-runtime-source.test.ts`
- `npm -w packages/sdk run verify:local`
- `npm -w packages/cli run verify:local`
- `npm -w packages/api run test:unit -- test/api/api.test.ts -t "imports existing GitHub repositories"`

## Phase 8: Admin, CLI, Agent, And TreeDX Integration

Goal: show and consume project architecture consistently across operator and runtime surfaces.

Status: implemented as operator diagnostics and provider-safe runtime projection.

Implementation note: `trsd seed` and `trsd projects` now report canonical architecture summaries, Admin project settings/hosts pages show topology, site/content paths, runtime source, local materialization, and R2 publish metadata, and provider portfolio processing carries architecture/workspace-access summaries into workday/report payloads without GitHub tokens, content credentials, or push credentials. TreeDX remains product-neutral; Treeseed architecture terms stay in SDK/API/Admin/CLI/Agent surfaces.

Implementation scope:

- CLI:
  - Add architecture diagnostics to `trsd seed` plan/apply output.
  - Add project architecture output to project inspection/import/config commands.
  - Add `trsd dev --plan` materialization diagnostics.
- Admin:
  - Show topology, site path, content path, content runtime source, local materialization policy, TreeDX binding, R2 publish state, and docs-site readiness on project settings/infrastructure pages.
  - Warn when a package has `sitePath: "docs"` but no prepared docs site.
- Agent/capacity:
  - Include normalized architecture in capacity provider portfolio manifests.
  - Ensure agents know whether they have full workspace files, TreeDX content access, or local content paths.
  - Do not give capacity providers GitHub tokens or content repository credentials.
- TreeDX:
  - Store/index repository paths and content paths as generic repository metadata.
  - Avoid Treeseed-specific topology terms in TreeDX internals.

Acceptance criteria:

- Operators can tell whether a project is local-file-backed, TreeDX-backed, or R2-backed.
- Agents receive enough architecture context to operate safely without credentials.
- TreeDX remains product-neutral.

Verification:

- `npm -w packages/cli run verify:local`
- `npm -w packages/admin run verify:local`
- `npm -w packages/agent run verify:local`
- TreeDX focused tests only if TreeDX metadata behavior changes.

## Phase 9: TreeSeed Team Seed Update

Goal: seed the TreeSeed private team with the Market project and all first-party package projects.

Status: implemented as the exact-nine TreeSeed first-party portfolio seed.

Implementation note: `seeds/treeseed.yaml` and the API seed mirror now seed exactly nine TreeSeed projects: the private Market project from `knowledge-coop/market` plus the public API, TreeDX, SDK, UI, CLI, Core, Admin, and Agent package projects from `treeseed-ai/*`. The previous Karyon live-proof project and content repository are intentionally removed from this seed. Repository access is represented only by `credentialRef: env:TREESEED_GITHUB_TOKEN` on the `knowledge-coop` and `treeseed-ai` repository hosts. Package projects use their `treeseed.package.yaml` architecture values with `sitePath: "docs"` and docs readiness as diagnostics, not blockers.

Implementation scope:

- Update `seeds/treeseed.yaml`.
- Keep `team:treeseed` as the private TreeSeed team.
- Add or update repository hosts:
  - `knowledge-coop` with `credentialRef: env:TREESEED_GITHUB_TOKEN`.
  - `treeseed-ai` with `credentialRef: env:TREESEED_GITHUB_TOKEN`.
- Add these projects:

| Project | Visibility | Repository | Site Path | Topology |
| --- | --- | --- | --- | --- |
| TreeSeed Market | private | `knowledge-coop/market` | `.` | `single_repository_site` |
| TreeSeed API | public | `treeseed-ai/api` | `docs` | `single_repository_site` |
| TreeDX | public | `treeseed-ai/treedx` | `docs` | `single_repository_site` |
| TreeSeed SDK | public | `treeseed-ai/sdk` | `docs` | `single_repository_site` |
| TreeSeed UI | public | `treeseed-ai/ui` | `docs` | `single_repository_site` |
| TreeSeed CLI | public | `treeseed-ai/cli` | `docs` | `single_repository_site` |
| TreeSeed Core | public | `treeseed-ai/core` | `docs` | `single_repository_site` |
| TreeSeed Admin | public | `treeseed-ai/admin` | `docs` | `single_repository_site` |
| TreeSeed Agent | public | `treeseed-ai/agent` | `docs` | `single_repository_site` |

- Add content/source metadata so package docs can be integrated later even if docs sites are initially skeletal.
- Add per-project work policies and capacity grants, or document and implement a portfolio-wide local capacity grant that includes all seeded TreeSeed projects.
- Update seed apply/export tests to expect all nine projects.
- Keep the Market project private because it is the top-level hosted tenant/control-plane workspace.
- Mark package projects public because their repositories and package surfaces are public.

Acceptance criteria:

- `trsd seed treeseed --environments local --plan --json` plans all nine projects.
- Applying the local seed creates or updates all nine project records idempotently.
- Project records include normalized topology, site path, content path/source policy, and credential refs without token values.
- The Admin project list shows the TreeSeed team portfolio.

Verification:

- `npm -w packages/api run test:unit -- test/lib/seed-apply.test.ts`
- `npm -w packages/sdk run test:unit -- test/seeds/planner.test.ts`
- `npx trsd seed treeseed --environments local --plan --json`
- `npx trsd ready local --json`

## Phase 10: Integrated Proof And Hardening

Goal: prove the architecture across local, seed, project, content, and capacity surfaces.

Status: implemented as an integrated proof and hardening pass across seed planning, package verification, local dev planning, readiness, and root build gates.

Implementation note: Phase 10 reconfirmed the exact-nine TreeSeed seed, seed mirror parity, token-redacted seed plans, Market `sitePath: "."`, package `sitePath: "docs"`, local content materialization planning, content/runtime monitor separation, provider-safe capacity/agent output, and full SDK/API/CLI/Admin/Agent verification. The normal local development database apply proof now derives `TREESEED_DATABASE_URL` from the managed local API Postgres configuration, so operators do not enter it manually. `npx trsd seed treeseed --environments local --apply --yes --json` completed against the local PostgreSQL control-plane database, and the repeat plan reported `create: 0`, `update: 0`, `unchanged: 39`, `skip: 2`, exactly nine TreeSeed projects, and no Karyon, stale topology, or token-looking output.

Implementation scope:

- Run local seed plan and local seed apply against the normal local development database using the generated local `TREESEED_DATABASE_URL`.
- Confirm all seeded projects appear in Admin and API project listing.
- Confirm Market can run from `sitePath: "."`.
- Confirm package projects with `sitePath: "docs"` report docs readiness without breaking package workflows.
- Confirm content-only publish planning does not trigger software deploy.
- Confirm software deploy planning does not require full content checkout.
- Confirm capacity provider portfolio manifests include normalized architecture for all seeded projects.
- Confirm GitHub token usage is limited to import/clone adapter boundaries until GitHub App is available.

Acceptance criteria:

- The live local environment can be spun up and inspected with the TreeSeed team and first-party projects present.
- No project seed, diagnostic, audit, or Admin surface exposes `TREESEED_GITHUB_TOKEN` values.
- GitHub App migration remains available as the future repository authority path.

Verification:

- `npm -w packages/sdk run test:unit -- test/seeds/planner.test.ts`
- `npm -w packages/api run test:unit -- test/lib/seed-apply.test.ts`
- `cmp -s seeds/treeseed.yaml packages/api/seeds/treeseed.yaml`
- `npx trsd seed treeseed --environments local --plan --json`
- `npx trsd seed treeseed --environments local --apply --yes --json`
- repeat `npx trsd seed treeseed --environments local --plan --json` confirmed idempotence with 39 unchanged resources, 2 skipped resources, exactly nine TreeSeed projects, and no stale topology or token-looking output.
- `npx trsd dev --web-runtime local --plan --json`
- `npx trsd dev --web-runtime local --local-content preview --plan --json`
- `npm -w packages/sdk run verify:local`
- `npm -w packages/api run verify:local`
- `npm -w packages/cli run verify:local`
- `npm -w packages/admin run verify:local`
- `npm -w packages/agent run verify:local`
- `npm run check`
- `npm run build`
- `npx trsd ready local --json`

## Ultimate Completion Gate: Catalog Integration And Linked Repository Initialization

Goal: declare the migration complete only when the exact-nine TreeSeed seed is integrated into the control-plane data catalog and linked repositories can be initialized through API-owned platform operations.

Status: implemented as the final completion gate over Phase 10. The API exposes a project-scoped linked repository initialization route that queues a `repository:initialize_linked_repository` platform operation, and the operations runner executes that operation through the SDK repository operation path. The operation adopts existing imported repositories without restructuring by default and writes only explicit template scaffold files when a template-created project requests them.

Implementation scope:

- Treat the exact-nine TreeSeed seed as complete only when products, catalog artifacts, repository hosts, projects, work policies, capacity grants, content-source bindings, and TreeDX/project bindings are present in the local control-plane catalog.
- Confirm Admin and CLI project/template surfaces can read the seeded catalog and show the TreeSeed portfolio without requiring manual database URL entry or raw credential values.
- Review the project creation path from templates so repository host requirements, architecture defaults, Market `sitePath: "."`, and package `sitePath: "docs"` are visible and easy to accept.
- Queue linked repository initialization from the API instead of mutating repositories in request handlers.
- Execute linked repository initialization in the operations runner with SDK repository primitives, canonical architecture metadata, safe changed-path output, and token-redacted results.
- Adopt imported live repositories without restructuring; template-created repositories may scaffold only template-declared files.

Acceptance criteria:

- Local seed apply populates the TreeSeed data catalog and repeat plan remains idempotent.
- Catalog and template records are queryable through API/Admin/CLI-facing store surfaces.
- `POST /v1/projects/:projectId/repositories/:role/initialize` returns a platform operation handle and never writes a repository from the API process.
- The operations runner advertises `repository:initialize_linked_repository`, claims the job, initializes or adopts the linked repository in its workspace, and reports changed paths without exposing runner paths or credentials.
- Imported repository initialization with no scaffold files produces no repository changes.
- Template scaffold initialization writes only safe repository-relative template files and rejects token-looking or path-traversal payloads.
- No seed, catalog, operation, diagnostic, audit, Admin, or CLI surface exposes GitHub token values, passphrases, deploy keys, or API-decryptable customer secrets.

Verification:

- `npm -w packages/sdk run test:unit -- test/utils/repository-operations.test.ts`
- `npm -w packages/api run test:unit -- test/lib/api-boundaries.test.ts`
- `npm -w packages/api run test:unit -- test/api/api.test.ts -t "linked repository initialization"`
- `npm -w packages/api run test:unit -- test/lib/seed-apply.test.ts`
- `npx trsd seed treeseed --environments local --plan --json`
- `npx trsd seed treeseed --environments local --apply --yes --json`
- repeat `npx trsd seed treeseed --environments local --plan --json`
- `npx trsd ready local --json`
- package-local verifies plus `npm run check` and `npm run build`

## Migration Risks

- Treating `sitePath: "docs"` as immediately runnable for every package would block seeding before docs sites are prepared. Use diagnostics instead.
- Cloning large content repositories during CI or provider execution would erase the value of content/software separation. Default those paths to TreeDX/R2.
- Storing token values in seeds would violate the secrets architecture. Store only `credentialRef` values.
- Moving too much topology into TreeDX would break TreeDX product neutrality. TreeDX should store generic repository/path metadata only.
- Keeping topology only in `projects.metadata_json` would make Admin, CLI, Agent, and API behavior drift. Add normalized store/API surfaces.
- Requiring parent workspaces/submodules would make existing engineering repos harder to import. Parent workspaces and submodules must stay optional.

## Must Not Implement Yet

- Do not require GitHub App installation for the initial TreeSeed team seed.
- Do not store GitHub token values in seed files, project records, audit events, or Admin/CLI output.
- Do not make content repositories mandatory submodules.
- Do not clone content repositories during CI/CD, hosted deploy, or capacity-provider execution by default.
- Do not move Treeseed-specific topology semantics into TreeDX.
- Do not combine package release gates with content publish gates.
- Do not mutate imported repositories during import unless a later explicit prepare-repository phase is approved.

## Assumptions And Defaults

- Canonical temporary GitHub credential is `TREESEED_GITHUB_TOKEN`.
- Repo-scoped overrides use `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>`.
- GitHub App remains the target long-term repository credential model.
- Submodules remain supported but are not the default architecture.
- Content publish to R2 is independent from software deploy.
- CI/CD and capacity provider operations should use API, TreeDX, or R2 content access by default.
- Market keeps `sitePath: "."`.
- All first-party package projects use `sitePath: "docs"`.
- Package docs sites may be prepared incrementally after the projects are seeded.
