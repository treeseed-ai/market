# Production Readiness Migration Ledger

This document is the durable execution ledger for the Platform, Market gateway, repository, and content-authority migration. Update it whenever a migration checkpoint changes live state, exposes a blocker, or closes a production-readiness gate. Architectural intent remains in `docs/project-architecture-migration.md` and `docs/package-ownership.md`; this ledger records execution status and evidence.

## Destination

The completed system has two operational domains:

- `treeseed-ai/platform` is the public Apache-2.0 installer and manager for customer deployments. It composes independent Admin, API, Agent, AI, CLI, Core, Reviewer, SDK, TreeDX, UI, fixture, and template repositories. It cannot check out or provision Market or Market API.
- `api.treeseed.dev` is the singleton gateway. Private Market API owns `/v1/market/**`; all declared hosted Admin routes pass through to a separately deployed public AGPL-3.0 Admin API service.
- Default deployments use the singleton URL for both control-plane and Market traffic. Sovereign deployments use a customer control plane for tenant data and the singleton gateway only for registry, commerce, licensing, and ecosystem governance.
- Every product project has an independently governed content repository. Git is durable history, TreeDX is the operational content plane, and immutable R2 releases are the runtime plane. Content repositories are never Platform workset checkouts.

## Seed, Portfolio, Workset, and Receipt Roles

The seed is the logical successor to the old parent-repository submodule map, but it is not itself a lockfile:

1. A seed declares the project bundle, repository identities, visibility, content pairing, provider resources, and policy.
2. `treeseed.portfolio.json` resolves the Platform-managed software subset to exact Git commits.
3. `trsd platform workset` materializes those commits as independent local repositories. The directory layout is disposable development state.
4. `trsd save` creates a repository-scoped checkpoint by default.
5. `trsd save --federated` records exact pushed commits, dependency edges, contract digests, and remote proof in a `treeseed.integration-change-set/v1` receipt.
6. Stage and release consume verified receipts. Gitlinks are not promotion authority.

The remaining transition is to stop using the Market workspace's compatibility gitlinks after active development moves to Platform worksets and the Platform snapshot can be promoted from reviewed federation evidence.

### Submodule-to-seed transition map

| Capability | State | Remaining cutover |
| --- | --- | --- |
| Logical project bundle | Current architecture | Seeds own repository identity, role, visibility, content pairing, and policy. |
| Exact integrated version | Current architecture | Portfolio snapshots and federation receipts own commits and contract digests instead of gitlinks. |
| Disposable local checkout | Proven | Platform worksets materialize 13 independent repositories with no `.gitmodules`; make this the normal developer entry point. |
| Repository save | Implemented | Repository-scoped saves and federated receipts work; remove reliance on the compatibility parent checkout. |
| Stage authority | Implemented, promotion proof pending | Execute a reviewed real staging promotion using only a verified federation receipt. |
| Release authority | Designed, suspended | Restore only after reviewed OpenTofu topology and release guarantees permit it. |
| Legacy Market gitlinks | Transitional | Remove after Platform becomes the normal integration workspace and the filtered snapshot is receipt-promoted. |

The seed is therefore already the canonical successor to submodule configuration. The architecture is not fully cut over because the old Market checkout still provides compatibility materialization and some operator habits, while production promotion has not yet consumed a reviewed receipt end to end.

## Current Checkpoint

Updated: 2026-08-11

### Live GitHub portfolio

- All 31 required repositories exist in `treeseed-ai` with `main` and `staging` branches.
- Public/private policy is applied: only `market-api` and `market-api-content` are private and proprietary.
- `information-hub` is absent from active repository policy and seeds.
- Templates use `template-engineering` and `template-research`.
- `TREESEED_GITHUB_TOKEN` is the sole first-party credential path.
- Repository reconciliation for the API project reached an all-`noop` plan after live read-back.

### Platform extraction

- Verified Platform snapshot immediately before this ledger update: main `a86a73ef3723ef20ff70e054929be611ce66637d`; staging `25ebbff2ab83117b27369a05316b2c508b9fdc3d`.
- The latest Platform refs are intentionally authoritative in `.treeseed/repository-migrations/treeseed-ai--platform--platform-workspace.json` and fresh GitHub read-back rather than copied back into this file: this ledger is itself part of the filtered Platform snapshot, so embedding its post-update target commit would be self-referential.
- Both branches have verified migration receipts and the extraction replay is all `noop`.
- A clean Platform clone passes `npm run verify`.
- A live workset materializes 13 exact, detached repositories and replays as 13 `noop` actions.
- The workset contains no `.gitmodules`, Market, Market API, or content repository.
- Platform configuration fixes the external Market profile to `https://api.treeseed.dev`, defaults to `market-passthrough`, and declares no hosted singleton resources.

### Repository federation

- Latest verified full federation after the API runtime-plane gate: `9239393aed7436a965c5a0321ab5baff5f2ac26e649c5c9e4d4866e7c6586c0f`; root `cd599155ba61cfbdb0d8d79d92d1fd2314710365`; 14 repositories with fresh remote proof.
- Latest verified full federation before the ledger-only checkpoint: `acc41b230fc5f37d22bc5fb6c05e713f0518b4210e1dc33854b9ec070b8edf02`; root `0d4c3e94de21d17953876aad15930c468150a305`; 14 repositories with fresh remote proof.
- Latest verified full federation before the singleton gateway reconciliation: `2e3726da4242bfb170862911150f6d6be36b86ebac531db25a61ed8d91739178`.
- Transitional integration root ref at that checkpoint: `ee852d4b5cdd94184b9b22497535e159abc8254b`.
- Receipt scope: `federated`; repository count: 14; every remote proof verified.
- Market API and content repositories are absent from the receipt checkout graph.
- Repository-scoped saves cannot stage; stage verifies a federated receipt against live refs; release verifies staged refs.
- Save, stage, close, release-plan, interruption, retry, and no-gitlink lifecycle scenarios pass.

### API licensing

- `treeseed-ai/api` is public and GitHub recognizes `AGPL-3.0`.
- Source metadata is `AGPL-3.0-only`; `COMMERCIAL.md` describes the alternative commercial subscription license without misrepresenting AGPL commercial-use rights.
- Contributor provenance and a contributor-grant workflow are present.
- `api-content` remains public Apache-2.0.
- License migration replay is `noop` on `main` and `staging`.

### Control-plane and singleton gateway

- Public Admin API feature ref `25807b1371e4493da467de617e8da330cdbc31ad` classifies every descriptor route by runtime plane. The generated 579-route artifact currently reports 429 Admin routes, 150 Market routes, and `migrationReady: false`; full local verification passed 504 tests with 4 intentional skips plus the isolated acceptance matrix.
- The Platform compiler supports `market-passthrough`, `external`, and `managed` modes and rejects inconsistent explicitly declared topology. Managed mode requires API, database, operations runner, and public TreeDX federation; pass-through and external modes reject those Platform-owned control-plane resources.
- Market operations remain fixed to the immutable `treeseed` singleton profile and customer plans cannot declare a Market API service.
- Bounded SDK staging gateway contract: `93690c1bcb569ac11554c16a03ba253dd8a8a141`; bounded CLI staging migration contract: `5e1b165814e22b81726cb2e68743a5c3bd4eac06`.
- Private Market API main: `200d08c55e78254d2ccd4bf49d9329adde3b1368`; staging: `d221c7b6a41c7cef7af726665eeb7c3a3e7e3286`.
- The singleton manifest pins Admin API `76508e4d55a179340899a58cb1bafc1dab7c8be4` and descriptor `sha256:a1db527487273f6a531551cfdc6d1be2ae84353a9e0dc37391729983c98a2090`.
- A clean private staging clone passes `npm ci`, TypeScript build, and all five gateway/descriptor tests. The managed lockfile pins the exact SDK commit and CI uses the lockfile.
- A built-server acceptance run against a disposable local Admin upstream proves exact descriptor routing, HTTP `429` and structured body propagation, two independent `Set-Cookie` headers, rate-limit propagation, internal-secret stripping, signed identity forwarding, and a real `101` WebSocket upgrade through the generated private server.
- SDK transport coverage proves streaming request/response bounds, immediate SSE delivery, client cancellation distinct from timeout, contained assertion failure, hop-by-hop removal, exact method/path admission, WebSocket route rejection, bidirectional socket data, and structured upgrade timeout. The complete fast suite passes 1,394 tests across 367 files.
- SDK feature `57c333a3d8ceb38dcf60dbbfe41c427a5fdf6ff5` and repository receipt `984c7dbc4014d631741cea5f1d19bfbb94e3c93f169c74d54c75c287d93552c9` separate capacity-provider `TREESEED_MARKET_API_BASE_URL` from the resolved `TREESEED_API_BASE_URL`. Pass-through, external, and managed reconciliation cases pass; the bounded staging overlay includes the resolver and test.
- This is repository and contract acceptance only. No hosted Railway or Cloudflare deployment occurred.

### Content repositories

- Platform-managed content history audit currently reports all 38 observed branch migrations as `noop` across 13 projects.
- `ui-content` feature history was created and verified at `329d9e8b74e7078a1cc1f20201a484236ebcb84b`.
- Admin staging content cutover is verified: source and target tree `a9e3c0520a9aba9a19b49aa2ba5c9721c36f1510`, R2 publication verified, TreeDX ref verified, and the software path removed.
- Admin feature history now replays as `noop` after software-path removal. The history planner requires the exact verified cutover contract, project/repository/path identity, Git tree digest, R2 verification, and TreeDX verification, and preserves the original authoritative path in its journal.
- Singleton Market content migration is declared separately in `seeds/market-singleton.yaml`; its independent live replay is 5/5 `noop`. Market feature content is verified at `76cce13fa82763a2edf19987d8d62f550b5dd72c`, while private proprietary Market API content remains isolated from the public content plane.
- History verification does not by itself authorize software-path removal; TreeDX, R2, runtime, and cutover receipts remain mandatory.

### Local runtime and verification

- Integrated local reconciliation rebuilt the exact agent manager/runner images and reconciled PostgreSQL, TreeDX, API, Market web, seed bootstrap, both capacity providers, and the Cloudflare connector.
- API replay converged with every selected unit ready and verified after correcting its source-closure receipt.
- Hosted deployment remains suspended. No push-triggered hosted deployment or production release was restored.
- Root tests: 102 passed.
- CLI tests: 200 passed.
- SDK lifecycle tests: 55 passed.
- SDK fast suite at the cutover-replay checkpoint: 1,384 passed across 366 test files.
- API suite: 503 passed and 4 skipped.
- File-size, architecture, and TypeScript-source policies pass.

## Phase Progress

| Area | Status | Exit condition |
| --- | --- | --- |
| Architecture docs and seeds | In progress | Ledger and canonical docs agree; Market singleton and Platform seeds remain disjoint. |
| GitHub repository reconciliation | In progress | Full portfolio acceptance covers create/adopt, branches, rules, environments, secrets, workflows, recovery, cleanup, and final `noop`. |
| Central GitHub authentication | Implemented, acceptance pending | Cross-repository live acceptance proves only the central token is used and artifacts contain no secrets. |
| Standalone Platform root | Operational, cutover pending | Normal development starts from Platform; transitional Market gitlinks and orchestration are removed. |
| Receipt-based federation | Implemented | Stage consumes the reviewed receipt in a real promotion and repeat execution remains `noop`. |
| Control-plane modes | In progress | Typed routing and explicit topology validation compile; full managed reconciliation and sovereignty acceptance remain. |
| Market gateway/Admin pass-through | In progress | Repository-level HTTP, cookie, SSE, WebSocket, timeout, cancellation, size-bound, error, idempotency, rate-limit, descriptor, health/readiness, and clean-clone acceptance pass; hosted integration remains suspended and unproven. |
| Market/Admin UI split | Not complete | Admin contains no Market implementation; Market owns commerce and ecosystem-governance routes. |
| Routed SDK transport | Not complete | One client routes Market and control-plane methods correctly in every control-plane mode. |
| Sovereign migration | Not complete | Journaled export/import/digest verification and atomic configuration switch pass without commerce-data migration. |
| Licensing | API implemented; portfolio pending | Provenance checks and correct licenses are complete for every public/private repository. |
| Content authority | In progress | Every pair has verified history, TreeDX binding, immutable R2 staging publication, runtime proof, cutover receipt, and no software publication workflow. |
| Singleton deployment authority | Designed, suspended | Protected manual staging/prod workflows exist only in private Market API after OpenTofu review lifts suspension. |
| Provider acceptance | In progress | GitHub, Cloudflare, Railway, and local acceptance plus cleanup pass; final plans are `noop`. |

## Production Blockers

1. Hosted Railway/Cloudflare topology remains intentionally suspended pending reviewed OpenTofu design.
2. Market API gateway transport is live and independently verified at repository and local built-server boundaries, but hosted Railway/Cloudflare integration remains suspended and unproven.
3. Market/Admin UI and API ownership extraction is incomplete.
4. Customer control-plane modes and sovereign-data migration are incomplete.
5. Content cutover remains incomplete across the portfolio, although the Admin cutover-aware replay gap is closed.
6. Stable Platform promotion is still derived from stable branch heads rather than a reviewed feature federation receipt.
7. Full GitHub and Cloudflare isolated acceptance, cleanup, and repeated `noop` evidence remain outstanding.
8. Railway project/environment resolution must be proven against the rebuilt topology before hosted readiness can be claimed.
9. The public Admin API descriptor currently contains Market-owned commerce, catalog, registry-seed, commons-governance, Market-profile, and template routes. Each route now carries an explicit `runtimePlane`, and the built descriptor reports `adminRouteCount`, `marketRouteCount`, and `migrationReady`; sovereign migration apply must remain blocked until `marketRouteCount` is zero and those routes are owned by the private Market API.

## Issues and Incident Log

### Seed existence was mistaken for live authority

Early migration work could describe repositories that did not yet exist. The correction was to create/adopt all live GitHub repositories early, verify their branches/visibility, and make provider read-back authoritative. Seeds are desired configuration, not evidence of existence.

### Save invoked from a package selected the Market root

CLI cwd resolution promoted `save` to the nearest tenant manifest. Package saves could therefore sweep the parent workspace. The CLI now preserves the invoking repository for `save`, while tenant-scoped commands still resolve the project root. A regression test covers nested repository invocation.

### Unrelated design work entered a federation checkpoint

The cwd defect temporarily captured `design/agent-manager.html`. Forward corrective commits removed it; the exact user version is preserved as the sole local modification and is not present at the current remote feature head.

### Supervisor update raced restoration of a local edit

The persistent Platform supervisor began `trsd update` while the root was clean, then `commitRootUpdateIfNeeded` used `git add -A` after a local edit appeared. The update commit swept that edit. The SDK now commits only reconciliation-owned managed paths with `git commit --only`, returns preserved paths, and has a regression proving concurrent operator edits remain uncommitted. A forward correction and replacement federation receipt were issued.

### Raw Git output changed license digest interpretation

Leading spaces in the canonical GNU license were treated as output formatting and caused false drift. Raw content reads were corrected; repeated API licensing reconciliation is now `noop`.

### Local platform stop was restarted by systemd

`trsd platform stop` terminated the supervisor process, but its enabled user unit restarted it. Work proceeded under workflow locks and dirty-worktree fail-closed behavior. The stop contract still needs explicit systemd persistence semantics and acceptance coverage.

### First local restart recorded a pre-build API source digest

The integrated restart rebuilt dependencies after computing the first API closure. API remained healthy but read-back reported digest drift. An API-only replay converged. Reconciliation must continue to require post-build read-back and idempotent replay.

### Content-history apply initially lost replay context

The first cutover-aware plan correctly retained Admin's original `docs/src/content` path, but after apply the source receipt pointed at a commit where that path no longer existed. Replay therefore lacked a readable prior tree and blocked. Classification now uses the immutable cutover tree as the authority after removal, requires the live target tree to match it, and treats an available prior tree as an additional equality check. Apply preserves the original path in the migration journal; live Admin apply and the subsequent 38-branch portfolio plan are entirely `noop`.

### Generated Market API repository was live but not reproducible

The first private repository reconciliation reached `noop`, but a clean clone could not run `npm ci` because the generated overlay had no lockfile. The workspace reconciler now generates one lockfile per changed plan from the exact SDK ref, verifies npm v3 structure and manifest parity, manages it through the singleton manifest, and reuses immutable receipts for network-free replay. Unused direct dependencies were removed.

### Bounded SDK gateway migration omitted its public export

After the lockfile fix, a clean clone installed but could not resolve `@treeseed/sdk/market-gateway`. The bounded staging overlay had copied implementation files without `package.json` and `package-lock.json`. Those package contracts are now part of the gateway migration inventory and have regression coverage.

### CI suppressed the pinned SDK build

The next clone had the correct export but `npm ci --ignore-scripts` suppressed the exact Git SDK dependency's required prepare/build step, leaving no `dist/gateway` export. Generated CI now uses `npm ci`; lockfile generation continues to use `--ignore-scripts`. Clean-clone build and five tests pass. npm reports 12 transitive audit findings (1 low, 1 moderate, 9 high, 1 critical); dependency provenance and upgrade impact require a separate bounded security audit rather than an unreviewed lock rewrite.

### WebSocket support was declared but not bound to the generated server

The HTTP proxy exposed an injectable WebSocket callback, but the generated Node singleton server never handled the `upgrade` event. Real clients therefore had no operational pass-through despite interface-level tests. SDK now owns a descriptor-gated Node WebSocket bridge with shared header/secret policy, assertion forwarding, timeout and cancellation behavior, raw multi-cookie handshake propagation, and bidirectional socket piping. The generated private server binds it explicitly. A real local handshake and echo path passes through the built clean clone.

### Managed control-plane configuration is ahead of its lifecycle command

The typed deploy configuration and generic reconciler already distinguish `market-passthrough`, `external`, and `managed`, reject customer-owned Market resources, and can compile API, PostgreSQL, operations-runner, public TreeDX, DNS, secrets, and runtime variables. The audit found no journaled `trsd control-plane migrate` workflow yet. Capacity-provider deployment variables now preserve the central Market URL separately from the resolved control plane, including root-managed API domains. Agent provider manifests and persisted connection state still use the legacy `marketUrl` name for control-plane connectivity; that terminology and end-to-end protocol wiring must be migrated atomically before sovereignty guarantees can become active.

### Admin route inventory still contains singleton Market behavior

The route audit found that the artifact named `admin-api-descriptor.json` still inventories `/v1/commerce/**`, catalog, registry seeds, templates, commons governance, and Market profile routes from the public API repository. The private Market API is currently a verified gateway over that full descriptor, not yet the owner of those implementations. Enabling sovereign export/import in this state could migrate commerce data into a customer control plane. Route descriptors now classify every route as `admin` or `market` and publish split counts plus a fail-closed migration-readiness bit. The Market API must adopt the Market-classified implementations and persistence before the Admin export contract or migration apply can be enabled. Admin-facing `/v1/ui/**` projections remain on the Admin plane because they expose project governance and operations rather than Market implementation.

### Receipt graph refreshes cascade by exact dependency

Federation advanced CLI dependency pointers after the first gateway staging overlay. Gateway reconciliation correctly reported bounded CLI drift, advanced CLI staging to `da8bf211fa65410c1a5d4bb855703af753c954c4`, and replayed as `noop`. Platform then detected that exact downstream ref change and advanced only its staging snapshot to `bd9fa82a901dfa66ec8758547398749d8e5fb3cc`. This is expected receipt-graph behavior and demonstrates why a final plan must be taken after all upstream receipts settle.

## Ordered Next Work

1. Extract Market API ownership and persistence from Admin until the Admin descriptor reports zero Market routes; preserve exact route ownership and gateway coverage during the move.
2. Complete full managed control-plane reconciliation and sovereign traffic/data-separation acceptance, including explicit provider-protocol URL separation and the journaled migration command.
3. Complete TreeDX/R2 content authority project by project, then remove software content workflows and paths only through verified cutover receipts.
4. Run isolated GitHub and Cloudflare acceptance with cleanup before and after; repair lifecycle drift and require final `noop` plans. Include a bounded dependency security audit for the generated Market API graph.
5. Execute a reviewed receipt-only staging promotion after all non-hosted guarantees pass; do not use gitlinks as authority.
6. Finish and review OpenTofu topology, then explicitly restore protected singleton hosted staging and run the same gateway suite through `api.treeseed.dev`. Production release remains fail-closed until that review completes.

## Update Discipline

When changing this ledger:

- record exact receipt IDs and live commits, never credentials;
- distinguish implemented code, live provider evidence, and planned work;
- do not mark a phase complete from unit tests alone when live acceptance is required;
- add incidents when recovery exposes a cross-system contract defect;
- keep hosted-deployment suspension visible until it is explicitly lifted by reviewed architecture;
- ensure the Platform filtered snapshot copies the updated ledger and replays to `noop`.
