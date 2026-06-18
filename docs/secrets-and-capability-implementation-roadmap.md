# Secrets And Capability Implementation Roadmap

**Status:** First-version implementation roadmap  
**Date:** 2026-06-17  
**Audience:** Treeseed SDK, API, CLI, Admin, agent runtime, TreeDX, operators, and package maintainers  

This roadmap turns [Secrets And Capability Architecture](./secrets-and-capability-architecture.md) into an ordered implementation plan. It is documentation-only and does not replace the architecture document.

Related architecture:

- [Secrets And Capability Architecture](./secrets-and-capability-architecture.md)
- [Package Ownership](./package-ownership.md)
- [Agent Capacity Implementation Roadmap](./agent-capacity-implementation-roadmap.md)
- [Agent Capacity Domain Model](./agent-capacity-domain-model.md)
- [Capacity Provider Agent Coordination Architecture](./capacity_provider_agent_coordination_architecture.md)
- [Agent Kernel Mode Runtime](./agent-kernel-mode-runtime.md)
- [Agent Capacity Operator Surfaces](./agent-capacity-operator-surfaces.md)

## Target Outcome

Treeseed should support project and host secrets without making customer project secrets decryptable by Treeseed services.

The first-version target is:

- GitHub App is the only supported repository credential adapter.
- GitHub repository or environment secrets are the default project-secret store once a GitHub target exists.
- Client-encrypted escrow stores ciphertext only for draft host/project configuration before a final target exists.
- Secret-backed runtime operations dispatch protected, allowlisted GitHub Actions workflows.
- TreeDX receives short-lived GitHub App credentials for connected git operations.
- Capacity providers receive handles and workspace policy, not reusable credentials or project secrets.

## Package Ownership

- `@treeseed/sdk` owns shared contracts, environment registry schema, reconciliation secret references, workflow operation contracts, custody modes, repository authority defaults, and provider-neutral helpers.
- `@treeseed/api` owns persistence, audit records, GitHub App adapter, GitHub Actions workflow dispatch, GitHub grant observation, TreeDX credential authorization, and assignment-time handle validation.
- `@treeseed/cli` owns `trsd config`, local passphrase handling, client-side encryption, GitHub secret deployment, escrow migration, and JSON-first diagnostics.
- `@treeseed/admin` owns browser encryption UX, host configuration, escrow status, GitHub secret deployment UI, warnings, drift diagnostics, and rotation/re-entry flows.
- `@treeseed/agent` owns provider runner handle consumption, `AgentContext` integration, workflow-operation handle use, provider workspace access modes, and local out-of-scope rejection.
- `packages/treedx` owns connected credential bridge consumption, repository workspace mechanics, git operations, and product-neutral repository behavior.
- `@treeseed/ui` owns reusable UI controls only when Admin needs generic components.
- `@treeseed/core` and root `@treeseed/market` compose public surfaces and API clients; they do not own secret custody.

## Phase 1: Contracts And Registry Shape

Status: implemented in `@treeseed/sdk/secrets-capability`.

Goal: define portable contracts before persistence or UI work.

Implementation scope:

- Add SDK-owned contract types for custody modes, secret classes, secret metadata, client-encrypted escrow metadata, GitHub App adapter config, GitHub Actions secret-store config, workflow operation contracts, trusted execution sets, repository authority defaults, and provider workspace defaults.
- Add environment registry shape for `repositoryCredentialProviders.githubApp`, `githubActionsSecretStore`, `workflowOperations`, `clientEncryptedEscrow`, `treeDxCredentialBridge`, `secretWrapping`, `repositoryAuthorityDefaults`, and `capacityProviderWorkspaceDefaults`.
- Add validation helpers that preserve the first-version rule: customer project secrets are not API-service-decryptable.

Acceptance criteria:

- SDK exports canonical contracts without importing API, Admin, CLI, Agent, TreeDX, UI, Core, or root market code.
- Registry validation rejects non-GitHub repository credential providers in v1.
- Registry validation can represent GitHub App, GitHub Actions secret store, client-encrypted escrow, and TreeDX bridge settings.

Verification:

- `npm -w packages/sdk run verify:local`

## Phase 2: API Persistence And Audit

Status: implemented through `MarketControlPlaneStore` secret-capability persistence methods and SDK-owned market migration `0010_secrets_capability_persistence.sql`.

Goal: persist metadata, policy, and audit evidence without storing decryptable customer project secrets.

Implementation scope:

- Add API records for secret metadata, custody mode, GitHub secret target, client-encrypted escrow metadata, GitHub App installation grants, workflow operation contracts, workflow dispatch records, trusted execution set references, TreeDX credential issuance records, and audit events.
- Persist escrow ciphertext only when custody mode is `client_encrypted_escrow`.
- Persist GitHub secret metadata only for `github_actions_secret_enclave`; do not persist customer project secret plaintext or API-service-decryptable ciphertext.
- Add fail-closed status for revoked grants, expired handles, missing GitHub environments, workflow drift, and revoked assignment leases.

Acceptance criteria:

- API can create/read/update metadata records without requiring plaintext project secrets.
- Audit records can bind secret-adjacent operations to project, repository, workflow, provider, assignment, and actor context.
- API denies any v1 request that would store a customer project secret as service-decryptable ciphertext.

Verification:

- `npm -w packages/api run verify:local`

## Phase 3: GitHub App Adapter

Status: implemented in `packages/api/src/api/github-app-adapter.ts`, `MarketControlPlaneStore`, API environment registry entries, and SDK market migration `0011_github_app_adapter.sql`.

Goal: establish GitHub App as the only v1 repository credential adapter.

Implementation scope:

- Implement GitHub App installation onboarding, repository grant discovery, permission observation, webhook validation, installation revocation handling, and repository grant drift through `createGitHubAppAdapter`.
- Add `POST /v1/internal/github/app/webhook` for signed GitHub App installation and repository grant events.
- Add API environment registry entries for `TREESEED_GITHUB_APP_ID`, `TREESEED_GITHUB_APP_PRIVATE_KEY`, and `TREESEED_GITHUB_APP_WEBHOOK_SECRET`.
- Add durable GitHub App installation records and GitHub App token issuance evidence records in SDK-owned market schema and migrations.
- Mint short-lived installation tokens for approved operations only, after repository, branch/ref, path, workday, assignment, provider, and operation policy checks pass.
- Record credential issuance metadata through `recordGitHubAppTokenIssuance` with token hash/prefix only; never persist raw token values.

Acceptance criteria:

- GitHub App installation and repository grants can be discovered and observed.
- Missing installations, removed repositories, reduced permissions, or mismatched account ids fail closed.
- Short-lived token issuance is auditable and never appears in logs, assignment payloads, UI reports, or provider reports.
- Invalid GitHub App webhook signatures are rejected before payload state is trusted.

Verification:

- `npm -w packages/api run test:unit -- test/lib/github-app-adapter.test.ts`
- `npm -w packages/api run verify:local`
- `npm -w packages/sdk run verify:local`

## Phase 4: GitHub Actions Secret Enclave

Status: implemented API/SDK-first through `packages/api/src/api/github-actions-secret-enclave.ts`, project-scoped API routes, SDK secret deployment contracts, existing workflow operation/dispatch records, and the existing `github-workflow-dispatch` reconciliation unit.

Goal: make GitHub Secrets and protected workflows the first-version project-secret execution boundary.

Implementation scope:

- Fetch GitHub repository or environment Actions public-key metadata through short-lived GitHub App authority.
- Deploy customer project secrets only as GitHub-encrypted payloads with `encryptedValue` and `keyId`; the API does not encrypt plaintext customer project secrets.
- Add SDK validation for encrypted GitHub Actions secret deployment metadata and secret-bearing workflow trust policy.
- Add project-scoped API routes for public-key metadata, encrypted secret deployment, and operation-id workflow dispatch:
  - `GET /v1/projects/:projectId/secrets/github-actions/public-key`
  - `POST /v1/projects/:projectId/secrets/github-actions/deploy`
  - `POST /v1/projects/:projectId/workflow-operations/:operationId/dispatch`
- Dispatch only stored, allowlisted workflow operation records through GitHub App authority and the existing `github-workflow-dispatch` reconciliation unit.
- Reject workflows that run arbitrary provider-supplied commands, use untrusted refs/workflow files, omit required protected environments, or fail operation input validation while secrets are present.
- Observe workflow dispatch state through existing workflow dispatch records without requiring plaintext secret access.

Acceptance criteria:

- Secret-backed operations are invoked by operation id, not arbitrary workflow name/input pairs.
- GitHub Actions secret-bearing workflows require protected refs and trusted execution sets.
- `trsd` and API secret-backed operations can use workflow dispatch handles instead of local project secrets.
- GitHub Actions secret deployment payloads are GitHub-encrypted before the API receives them.
- Route descriptors and acceptance statuses cover all new enclave API routes.

Verification:

- `npm -w packages/api run test:unit -- test/lib/github-actions-secret-enclave.test.ts`
- `npm -w packages/api run verify:local`
- `npm -w packages/cli run verify:local`
- For live proof, plan first with `npx trsd workflow dispatch --repo <owner/name> --workflow <file> --branch <ref> --plan --json`.

## Phase 5: Client-Encrypted Escrow

Goal: preserve draft host/project configuration without making Treeseed a decrypting custodian.

Status: implemented as narrow SDK/API/CLI/Admin primitives. Full `trsd config` and Admin form workflows remain Phase 8.

Implementation scope:

- Extend `@treeseed/sdk/secrets-capability` with client-encrypted escrow envelope contracts, ciphertext-only validation, `buildTreeseedClientEncryptedEscrowEnvelope`, and `summarizeTreeseedClientEncryptedEscrowStatus`.
- Add API escrow primitives in `packages/api/src/api/client-encrypted-escrow.ts` around existing escrow persistence: create, list, get, update, migrate, and tombstone.
- Add project-scoped API routes:
  - `GET /v1/projects/:projectId/secrets/escrow`
  - `POST /v1/projects/:projectId/secrets/escrow`
  - `GET /v1/projects/:projectId/secrets/escrow/:escrowId`
  - `PATCH /v1/projects/:projectId/secrets/escrow/:escrowId`
  - `POST /v1/projects/:projectId/secrets/escrow/:escrowId/migrate`
  - `DELETE /v1/projects/:projectId/secrets/escrow/:escrowId`
- Store ciphertext, KDF parameters, nonce, salt, wrapping key id, metadata, custody mode, escrow state, and deployment intent as ciphertext-only escrow records.
- Support migration from escrow to GitHub Secrets, host injection, or metadata-only re-entry after a target exists.
- Tombstone escrow records after deletion/migration decisions; escrow remains a draft custody record, not a deployment target.
- Add minimal `MarketClient` methods and CLI/Admin helper functions that produce ciphertext-only escrow bodies and safe status labels.
- Recovery policy is v1 re-entry only; no team recovery key or external vault reference is implemented.

Acceptance criteria:

- API never receives passphrases, plaintext values, derived keys, or decrypted deployment payloads.
- Escrow records are not treated as deployment targets.
- Admin and CLI can show escrow status, migration status, rotation status, and re-entry requirements without revealing secrets.
- Route descriptors and acceptance status rows cover the escrow API routes.

Verification:

- `npm -w packages/api run test:unit -- test/lib/client-encrypted-escrow.test.ts`
- `npm -w packages/sdk run test:unit -- test/utils/secrets-capability.test.ts`
- `npm -w packages/cli run verify:local`
- `npm -w packages/admin run verify:local`
- `npm -w packages/api run verify:local`

## Phase 6: TreeDX Connected Credential Bridge

Goal: let TreeDX perform connected private git operations with short-lived GitHub App credentials.

Status: implemented as an API-owned bridge plus product-neutral TreeDX credential-provider consumption.

Implementation scope:

- Extend `@treeseed/sdk/secrets-capability` with the TreeDX credential bridge operation vocabulary and request/credential contracts for clone, fetch, save, commit, push, pull request, and repository update operations.
- Add `packages/api/src/api/treedx-credential-bridge.ts` as the API bridge service. It validates TreeDX credential requests, rejects plaintext-looking material, maps operations to GitHub App permissions, routes issuance through the GitHub App adapter, and records `treedx_credential_issuance_records` evidence.
- Add `POST /v1/internal/treedx/credentials/github-app` as the service-authenticated internal route. The route returns the raw short-lived token only in the immediate response and stores/audits only token prefix, hash, expiry, repository, operation, and requester metadata.
- Add TreeDX `TREEDX_REMOTE_CREDENTIAL_PROVIDER=treeseed_bridge` support in `TreeDx.Git.Credentials`. TreeDX calls the configured TreeSeed API endpoint at credential resolution time and returns the same token-shaped credential already consumed by authenticated external Git transport.
- Keep TreeDX product-neutral: TreeDX knows about a configured bridge endpoint, credential ids, repository operation names, and git credential shapes; Treeseed owns project, assignment, provider, workday, GitHub App, and repository grant policy.
- Preserve standalone TreeDX `none`, `env_file`, and `external_command` credential modes.

Acceptance criteria:

- TreeDX can request short-lived GitHub App authority only for approved connected-mode operations.
- TreeDX does not receive GitHub App private key or durable repository credentials.
- TreeDX rejects or fails closed when the repository grant, assignment handle, or service-principal trust is invalid.
- TreeDX does not place credentials in remote URLs, audit payloads, route metadata, or persisted records.
- API credential issuance records and audit events never store raw GitHub installation tokens.

Verification:

- `npm -w packages/api run test:unit -- test/lib/treedx-credential-bridge.test.ts`
- `npm -w packages/api run test:unit -- test/lib/github-app-adapter.test.ts test/lib/github-actions-secret-enclave.test.ts test/lib/secrets-capability-persistence.test.ts test/lib/client-encrypted-escrow.test.ts test/lib/treedx-credential-bridge.test.ts test/lib/api-route-descriptors.test.ts`
- `npm -w packages/sdk run test:unit -- test/utils/secrets-capability.test.ts`
- `npm -w packages/sdk run verify:local`
- `cd packages/treedx/apps/api && mix test test/treedx/git_credentials_test.exs`
- `cd packages/treedx && ./scripts/test-treedx-fast.sh`
- `npm -w packages/api run verify:local` remains the full API package gate, but this implementation used the focused API regression suite after the full verify run became CPU-active and silent for several minutes with stable file-descriptor counts.

## Phase 7: Capacity And Agent Integration

Goal: connect secret and repository authority to assignments without revealing secrets.

Status: implemented as SDK assignment capability-handle contracts, API assignment-time handle derivation/validation, a provider assignment workflow-operation dispatch route, and AgentContext/provider-runner handle consumption.

Implementation scope:

- Add `@treeseed/sdk/agent-capacity` assignment workspace modes: `context_only`, `brokered_workspace`, `full_workspace_no_credentials`, and `trusted_direct`.
- Add SDK provider-safe repository access handles, TreeDX workspace handles, workflow-operation handles, secret-use handles, redaction helpers, and fail-closed validation for raw secret/token/deploy-key fields.
- Extend API provider assignment creation to derive and persist redacted `capabilityHandles` inside existing assignment JSON state without adding a new table.
- Add `POST /v1/provider/assignments/:assignmentId/workflow-operations/:operationId/dispatch` as the provider-only assignment-scoped workflow dispatch route. It requires provider auth, assignment ownership, active lease token, a matching workflow-operation handle, and rejects arbitrary workflow scope fields before calling the Phase 4 GitHub Actions enclave.
- Add `dispatchAssignmentWorkflowOperation` to the capacity-provider SDK client.
- Hydrate `AgentContext.capacity.capabilityHandles` and `AgentContext.capacity.workspaceAccessMode`; the provider runner locally rejects secret-like handle payloads and dispatches workflow operations only through assignment-scoped handles.

Acceptance criteria:

- Provider assignments can perform approved repository or workflow operations through handles.
- Provider assignments cannot receive customer project secret values, GitHub installation tokens, deploy keys, or TreeDX node credentials by default.
- Acting assignments require readiness and accepted/scheduled/active capacity-plan provenance before write-capable handles are issued.
- External providers may receive `full_workspace_no_credentials` repository workspaces for testing/building without receiving push credentials or project runtime secrets.

Verification:

- `npm -w packages/sdk run test:unit -- test/utils/agent-capacity.test.ts test/utils/secrets-capability.test.ts`
- `npm -w packages/api run test:unit -- test/lib/treedx-credential-bridge.test.ts test/lib/github-actions-secret-enclave.test.ts test/lib/provider-assignment-capability-handles.test.ts`
- `npm -w packages/agent run test:unit -- test/provider/capacity-provider-runtime.test.ts`
- `npm -w packages/sdk run verify:local`
- `npm -w packages/agent run verify:local`
- `npm -w packages/api run verify:local`
- `npx trsd ready local --json`

## Phase 8: CLI And Admin UX

Goal: provide safe operator workflows for configuration, deployment, drift, and rotation.

Status: implemented as CLI/Admin operator diagnostics, ciphertext-only helper bodies, Admin host escrow metadata, and fail-closed Admin project-host operations that no longer submit unlock passphrases to project host action routes.

Implementation scope:

- Extend `@treeseed/sdk` Market client with narrow methods for the existing GitHub Actions public-key metadata route, encrypted secret deployment route, and allowlisted project workflow-operation dispatch route.
- Extend `trsd config` output with a `secretCapability` report covering metadata-only, escrowed, GitHub-backed, host-injected, bootstrap, provider-owned, migrated, expired, tombstoned, and re-entry-required states.
- Extend `packages/cli/src/cli/secrets-escrow.ts` with ciphertext-only GitHub Actions deployment body validation and reusable secret capability summaries.
- Extend Admin secret-manager helpers with ciphertext-only GitHub Actions deployment validation and safe secret capability status labels.
- Adapt Admin host credential encryption output to client-encrypted escrow metadata using the existing browser-side `secretbox` payload; host submissions include safe `secretCapability` metadata but do not send passphrases, derived keys, or plaintext credential values.
- Update Admin project-host operation UX to show GitHub App/protected-ref/protected-environment guidance and fail closed instead of submitting unlock passphrases for rotate/resync/team-owned secret operations.

Acceptance criteria:

- Users can configure draft host secrets without repeated entry and without server-side decryptability.
- Users can migrate draft escrow secrets to GitHub Secrets or explicit host secret stores.
- CLI/Admin clearly distinguish metadata-only, escrowed, GitHub-backed, host-injected, bootstrap, and provider-owned secrets.
- Admin project-host operations do not submit `sensitivePassphrase`; secret-bearing rotate/resync flows require re-entry or migration before execution.

Verification:

- `npm -w packages/sdk run test:unit -- test/utils/agent-capacity.test.ts test/utils/secrets-capability.test.ts`
- `npm -w packages/api run test:unit -- test/lib/treedx-credential-bridge.test.ts test/lib/github-actions-secret-enclave.test.ts test/lib/provider-assignment-capability-handles.test.ts test/lib/api-route-descriptors.test.ts`
- `npm -w packages/agent run verify:local`
- `npm -w packages/cli run verify:local`
- `npm -w packages/admin run verify:local`
- `npm -w packages/ui run verify:local` only if reusable UI controls change
- `npm -w packages/sdk run verify:local` when SDK Market client type surfaces change
- `npx trsd ready local --json`

## Phase 9: Verification And Hardening

Goal: prove the end-to-end model and close documentation drift.

Status: implemented as API passphrase rejection hardening, SDK workflow trust-policy checks, API enclave/store regression tests, and final v1 boundary documentation.

Implementation scope:

- Reject `sensitivePassphrase`, `passphrase`, `credentialSessions`, and `providerCredentialSessions` on public project launch, launch retry/recovery, project host rotate/resync/replace, and project deletion routes with stable fail-closed code `sensitive_passphrase_rejected`.
- Keep draft/team host encrypted payload records, but remove API customer/team host secret decrypt use from project operations. Users must re-enter, rotate, or migrate through CLI/Admin client-side flows before those operations can run.
- Add SDK workflow trust-policy hardening for secret-bearing operations: protected refs, protected environments, allowlisted workflow files, no provider-supplied commands, no untrusted checkout, no repository-local actions, and metadata-only/disabled artifact-cache exposure.
- Add SDK OIDC-preferred cloud access diagnostics through `summarizeTreeseedWorkflowCloudAccessDiagnostics` without blocking explicit v1 host-env injection.
- Preserve GitHub App and GitHub Actions secret storage as the only v1 project-secret adapters.
- Guard live GitHub proof behind environment/config availability; use reconciler-backed `npx trsd workflow dispatch --repo <owner/name> --workflow <file> --branch <ref> --plan --json` before any execution.

Acceptance criteria:

- First-version secret architecture can be demonstrated without storing decryptable customer project secrets in Treeseed.
- Workflow proof uses `--plan --json` before execution and records live observation.
- Docs and implementation agree on supported adapters, custody modes, and exclusions.
- API project operations cannot be used as passphrase unlock/decrypt endpoints for customer or team host secrets.
- Secret-bearing workflow operation records fail closed when they can execute provider commands, untrusted branch code, local actions, arbitrary workflow files, or broad cache/artifact leak paths.

Verification:

- `npm -w packages/sdk run test:unit -- test/utils/secrets-capability.test.ts test/utils/agent-capacity.test.ts`
- `npm -w packages/api run test:unit -- test/lib/github-actions-secret-enclave.test.ts test/lib/api-boundaries.test.ts`
- `npm -w packages/api run test:unit -- test/api/api.test.ts`
- `npm -w packages/sdk run verify:local`
- `npm -w packages/api run verify:local`
- `npm -w packages/cli run verify:local`
- `npm -w packages/admin run verify:local`
- `npm -w packages/agent run verify:local`
- `npm run check`
- `npm run build`
- `npx trsd ready local --json`
- Optional guarded live proof: run the plan-only workflow dispatch command above when a configured GitHub App test repository and allowlisted workflow are available; report skipped proof with missing config when they are not available.

Verification closure note:

- The root `libsodium-sumo` physical install blocker was resolved by refreshing the root install and workspace bootstrap; `npm run build` now completes with only the existing allowed browser-external/libsodium warning.
- The slow agent knowledge-pack scenario keeps full coverage with an explicit 30 second per-test timeout; `npm -w packages/agent run verify:local` passes.
- API local verification now passes after the GitHub Actions enclave routes were aligned with standard fail-closed JSON error envelopes and SDK acceptance fixtures were updated for GitHub App-gated public-key/deploy probes.
- Completed local proof commands: SDK focused/unit and `verify:local`, API focused suites and `verify:local`, CLI `verify:local`, Admin `verify:local`, Agent `verify:local`, root `npm run check`, root `npm run build`, and `npx trsd ready local --json`.
- Plan-only live proof was skipped because `TREESEED_SECRET_CAPABILITY_PROOF_REPO`, `TREESEED_SECRET_CAPABILITY_PROOF_WORKFLOW`, and `TREESEED_SECRET_CAPABILITY_PROOF_REF` were not configured; no workflow dispatch execution was attempted.

Environment registry and service credential translation closure:

- Treeseed-managed service credentials use canonical `TREESEED_*` names in registries, config storage, readiness reports, diagnostics, audit metadata, GitHub Secrets/variables, and user-facing setup guidance.
- Service-native names are translation outputs, not Treeseed configuration inputs. `TREESEED_GITHUB_TOKEN` and repository-scoped `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>` may become `GH_TOKEN`/`GITHUB_TOKEN` only for GitHub child processes or SDK clients; `TREESEED_CLOUDFLARE_API_TOKEN` and `TREESEED_CLOUDFLARE_ACCOUNT_ID` may become `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` only for Wrangler or Cloudflare clients; `TREESEED_RAILWAY_API_TOKEN` may become `RAILWAY_API_TOKEN` only for Railway clients; `TREESEED_DOCKERHUB_TOKEN`/`TREESEED_DOCKERHUB_USERNAME` may become Docker-native names only for Docker workflows; and `TREESEED_CODEX_API_KEY` may become `CODEX_API_KEY` only inside Codex adapter execution.
- SDK owns the shared service-credential translation helpers and registry coverage; CLI wrappers, API adapters, reconciliation adapters, GitHub Actions jobs, and agent provider adapters call those helpers or apply the same boundary rule immediately before invoking a provider tool/client.
- TreeDX keeps product-neutral `TREEDX_*` runtime configuration in `packages/treedx/env.yaml`; Treeseed orchestration variables for public TreeDX deployment stay in Treeseed-owned registries.
- External ambient variables such as `PORT`, `CI`, `HOME`, `XDG_CACHE_HOME`, `GITHUB_ACTIONS`, and `GITHUB_REF_NAME` remain host/tool conventions and do not become Treeseed registry entries unless Treeseed itself defines the setting.

## Migration Risks

- GitHub Actions workflows can leak secrets if they execute untrusted branch code, package scripts, local actions, or provider-supplied commands.
- Admin browser encryption depends on hosted JavaScript integrity, CSP, deployment provenance, and review practices.
- The GitHub App private key becomes a bootstrap crown-jewel secret and requires narrow KMS/signing-service custody.
- Client-encrypted escrow has no recovery unless a team recovery key or external vault reference is configured.
- GitHub-only v1 limits non-GitHub repository onboarding.
- Host env injection is still required for true runtime secrets and must remain explicit.
- TreeDX connected mode must not silently fall back to durable repository credentials.
- Workflow drift can weaken the secret boundary without changing stored secret metadata.

Containment defaults:

- fail closed on missing GitHub grants, missing environments, unprotected refs, unknown workflow operation ids, or modified trusted execution sets;
- prefer re-entry over recovery when recovery policy is unset;
- use GitHub OIDC for cloud access when available instead of long-lived cloud API keys;
- require reconciler-backed plans before live workflow dispatch proof.

## Must Not Implement Yet

- SSH deploy key, HTTPS token, GitLab, Bitbucket, or non-GitHub credential adapters.
- Direct provider/customer secret delegation as a normal workflow.
- API-service-decryptable customer project secrets.
- Generic arbitrary GitHub workflow dispatch with secrets.
- Running provider-supplied commands or untrusted branch code inside secret-bearing workflows.
- TreeDX-specific understanding of Treeseed teams, workdays, capacity providers, or assignment semantics.
- Reconciliation mutations outside canonical `trsd` workflows.
- Long-lived repository credentials in capacity-provider environments.
- UI-owned secret custody outside Admin client-side encryption and metadata display.

## Documentation And Completion Rules

Architecture-changing secret work is not complete until the relevant docs are updated:

- contract or registry changes update this roadmap and [Secrets And Capability Architecture](./secrets-and-capability-architecture.md);
- package boundary changes update [Package Ownership](./package-ownership.md);
- capacity assignment changes update the capacity architecture docs;
- CLI/Admin behavior changes update operator-surface docs or runbooks;
- TreeDX credential bridge changes update TreeDX service docs where applicable.

For this roadmap itself, no package tests are required because it is documentation-only. Verify structure with targeted searches such as:

```bash
rg -n "Package Ownership|Phase 1|Acceptance criteria|Verification|Migration Risks|Must Not Implement Yet" docs/secrets-and-capability-implementation-roadmap.md
```
