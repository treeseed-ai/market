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

- Live Platform `main`: `b921d2b55d665a9edbfa55cf4fed9e00e8e5b95a`.
- Live Platform `staging`: `a00a62e4e3938576a475ec58e13dc01fdd5aa2ea`.
- Both branches have verified migration receipts and the extraction replay is all `noop`.
- A clean Platform clone passes `npm run verify`.
- A live workset materializes 13 exact, detached repositories and replays as 13 `noop` actions.
- The workset contains no `.gitmodules`, Market, Market API, or content repository.
- Platform configuration fixes the external Market profile to `https://api.treeseed.dev`, defaults to `market-passthrough`, and declares no hosted singleton resources.

### Repository federation

- Verified federation baseline recorded by this ledger: `8504a407213fe35b09dc509a477a860ecc897c29aff27a1228285a958c614a17`.
- Transitional integration root ref at that baseline: `7aa920291c884f5e1b5936b653e2edd6a99d8efa`.
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

### Content repositories

- Platform-managed content history audit currently reports all 38 observed branch migrations as `noop` across 13 projects.
- `ui-content` feature history was created and verified at `329d9e8b74e7078a1cc1f20201a484236ebcb84b`.
- Admin staging content cutover is verified: source and target tree `a9e3c0520a9aba9a19b49aa2ba5c9721c36f1510`, R2 publication verified, TreeDX ref verified, and the software path removed.
- Admin feature history now replays as `noop` after software-path removal. The history planner requires the exact verified cutover contract, project/repository/path identity, Git tree digest, R2 verification, and TreeDX verification, and preserves the original authoritative path in its journal.
- Singleton Market content migration is declared separately in `seeds/market-singleton.yaml` and must be audited independently from the Platform portfolio.
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
| Control-plane modes | Not complete | `market-passthrough`, `external`, and `managed` compile, reconcile, and satisfy sovereignty guarantees. |
| Market gateway/Admin pass-through | Not complete | Descriptor-pinned HTTP, cookie, SSE, WebSocket, timeout, error, and readiness acceptance passes. |
| Market/Admin UI split | Not complete | Admin contains no Market implementation; Market owns commerce and ecosystem-governance routes. |
| Routed SDK transport | Not complete | One client routes Market and control-plane methods correctly in every control-plane mode. |
| Sovereign migration | Not complete | Journaled export/import/digest verification and atomic configuration switch pass without commerce-data migration. |
| Licensing | API implemented; portfolio pending | Provenance checks and correct licenses are complete for every public/private repository. |
| Content authority | In progress | Every pair has verified history, TreeDX binding, immutable R2 staging publication, runtime proof, cutover receipt, and no software publication workflow. |
| Singleton deployment authority | Designed, suspended | Protected manual staging/prod workflows exist only in private Market API after OpenTofu review lifts suspension. |
| Provider acceptance | In progress | GitHub, Cloudflare, Railway, and local acceptance plus cleanup pass; final plans are `noop`. |

## Production Blockers

1. Hosted Railway/Cloudflare topology remains intentionally suspended pending reviewed OpenTofu design.
2. Market API gateway and complete hosted Admin pass-through are not implemented and contract-tested.
3. Market/Admin UI and API ownership extraction is incomplete.
4. Customer control-plane modes and sovereign-data migration are incomplete.
5. Content cutover remains incomplete across the portfolio, although the Admin cutover-aware replay gap is closed.
6. Stable Platform promotion is still derived from stable branch heads rather than a reviewed feature federation receipt.
7. Full GitHub and Cloudflare isolated acceptance, cleanup, and repeated `noop` evidence remain outstanding.
8. Railway project/environment resolution must be proven against the rebuilt topology before hosted readiness can be claimed.

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

## Ordered Next Work

1. Audit and reconcile `market-singleton.yaml` content history independently, preserving Market API privacy and proprietary licensing.
2. Promote this ledger and the cutover-replay fix through repository federation, then refresh the filtered Platform snapshot and verify a clean-clone workset replay.
3. Complete the Platform configuration compiler for `market-passthrough`, `external`, and `managed`, with static rejection of singleton Market resources.
4. Generate the exact Admin API descriptor and implement the private gateway route union and pass-through acceptance suite.
5. Extract Market UI/API ownership from Admin and remove Market implementation dependencies.
6. Complete TreeDX/R2 content authority project by project, then remove software content workflows and paths only through verified cutover receipts.
7. Run isolated GitHub and Cloudflare acceptance with cleanup before and after; repair any lifecycle drift and require final `noop` plans.
8. Finish and review OpenTofu topology, then explicitly restore protected singleton hosted staging only. Production release remains fail-closed until that review completes.

## Update Discipline

When changing this ledger:

- record exact receipt IDs and live commits, never credentials;
- distinguish implemented code, live provider evidence, and planned work;
- do not mark a phase complete from unit tests alone when live acceptance is required;
- add incidents when recovery exposes a cross-system contract defect;
- keep hosted-deployment suspension visible until it is explicitly lifted by reviewed architecture;
- ensure the Platform filtered snapshot copies the updated ledger and replays to `noop`.
