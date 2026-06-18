# Treeseed Secrets And Capability Architecture

**Status:** First-version architecture for implementation planning  
**Date:** 2026-06-17  
**Audience:** Treeseed SDK, API, Admin, CLI, agent runtime, capacity-provider runtime, TreeDX, and package maintainers  

This document defines the target model for handling secrets and repository authority across Treeseed systems, especially when project owners, TreeSeed-operated infrastructure, TreeDX services, and third-party capacity providers are controlled by different parties.

The guiding rule is:

```text
Do not make project secrets portable by default.
Make narrowly scoped authority portable instead.
```

Capacity providers, provider runners, project-bundled agents, and hosted service workers should receive assignment-scoped capability handles whenever possible, not raw repository credentials, deployment tokens, host provider credentials, TreeDX credentials, or project application secrets.

This does not mean engineering agents can only work with small file bundles. Many useful agents and capacity providers need a complete private repository checkout to run package scripts, tests, development servers, build tooling, migrations, and integration workflows. The security boundary is not "never expose private code." The boundary is "do not expose reusable credentials or durable authority by default."

Related architecture:

- [Agent Capacity Implementation Roadmap](./agent-capacity-implementation-roadmap.md)
- [Agent Capacity Domain Model](./agent-capacity-domain-model.md)
- [Capacity Provider Agent Coordination Architecture](./capacity_provider_agent_coordination_architecture.md)
- [Agent Kernel Mode Runtime](./agent-kernel-mode-runtime.md)
- [Package Ownership](./package-ownership.md)

## Problem Statement

The current local secret flow uses a human passphrase to encrypt or decrypt secrets that are then deployed into several downstream stores, including repository secrets, web environment secrets, TreeDX repository secrets, and capacity-provider environment secrets.

That passphrase model is useful for local operator unlocks, but it is not sufficient as the runtime trust model because:

- background systems such as the API operations runner, TreeDX, and capacity-provider runners cannot safely depend on interactive passphrase entry;
- project repository credentials may be needed by multiple systems for import, indexing, commit, test, release, and update workflows;
- capacity providers may be owned by a different person or organization than the project owner;
- project owners may want to use marketplace capacity without exposing sensitive information beyond the project files and approved work context;
- agents must still be able to use ergonomic SDK repository, test, release, and TreeDX functionality.

The most important missing secret class is project remote repository access, especially git read/write authority. This must be handled without turning capacity providers into broad holders of project credentials.

TreeDX is the repository workspace and git mechanics system in Treeseed connected mode. TreeSeed API depends on TreeDX for repository storage, indexing, querying, workspace mutation, and save flows. The target architecture should therefore not pretend that TreeDX never needs repository authority. Instead, connected-mode TreeDX should receive short-lived, operation-scoped repository credentials from TreeSeed when it needs to clone, fetch, save, commit, or push.

## Core Principles

1. **Secrets stay under owner control.** Project-owned secrets should remain controlled by the project or team control plane unless explicitly delegated.
2. **Capabilities cross trust boundaries.** Runtimes outside the owner's trust boundary receive handles that describe what they may do, not credentials that let them decide.
3. **Repository operations are capability-mediated by default.** Git read, write, branch, commit, pull request, import, and release operations should flow through TreeDX, a TreeSeed repository authority layer, or the API operations runner with scoped credentials, not direct credential sharing to capacity providers.
4. **Capacity providers are not secret managers.** Providers supply execution capacity. They do not become custodians for project repository keys, host provider credentials, or project application secrets by default.
5. **Short-lived authority beats long-lived secrets.** Assignment-scoped handles, installation tokens, and operation leases should expire quickly and be revocable.
6. **Every secret use is policy-bound and auditable.** Secret material access, brokered operation use, denied access, and delegated authority must produce durable audit evidence.
7. **Direct secret reveal is exceptional.** When a project intentionally grants a provider or agent direct secret access, it must be explicit, scoped, time-bounded, auditable, and easy to revoke.
8. **Full code access is separate from credential authority.** A provider may receive a full private workspace when the project owner grants an engineering access mode, but it should still not receive reusable push keys, app secrets, host tokens, or unrelated credentials.
9. **SDK ergonomics should hide the security machinery.** Agents should call repository and tool APIs, not manually handle decrypted environment variables.

## Ownership Model

Package ownership should follow existing Treeseed boundaries:

- `@treeseed/api` owns the durable secret metadata, access policy, connected-mode repository credential issuance, capability issuance, API operations runner, audit records, and server-side secret use.
- `@treeseed/sdk` owns portable contracts for secret descriptors, capability handles, repository-operation requests, secret-use policies, reconciliation secret references, and provider-neutral helper logic.
- `@treeseed/admin` owns browser operator surfaces for entering, classifying, approving, rotating, revoking, and auditing secrets and capability grants.
- `@treeseed/cli` owns local operator workflows for secret setup, unlock, import, rotation, verification, and JSON-first diagnostics.
- `@treeseed/agent` owns provider runtime consumption of assignment-scoped handles through `AgentContext`, provider runner enforcement, and local rejection of out-of-scope operations before remote calls.
- `packages/treedx` remains product-neutral. It owns generic repository workspace mechanics, git operations, indexing, querying, and save behavior. In Treeseed connected mode, TreeDX may request short-lived repository credentials from TreeSeed through a configured credential bridge, while Treeseed owns project authorization, assignment semantics, provider access policy, and credential custody policy.
- `@treeseed/core` and root `@treeseed/market` consume public API/admin/sdk surfaces. They do not own secret custody.

## Secret Classes

Treeseed should classify secrets before deciding how they are stored, deployed, revealed, or brokered.

### Bootstrap Secrets

Bootstrap secrets configure Treeseed infrastructure itself.

Examples:

- Cloudflare API token
- Railway API token
- GitHub App private key
- Docker Hub publishing token
- package release tokens

Bootstrap secrets are used by reconciler-backed workflows and deployment operations. They should not be exposed to capacity providers or project agents.

### Project Repository Secrets

Project repository secrets authorize import, clone, branch, commit, push, pull request, release, and update operations.

Initial required provider:

- GitHub App installation id and repository grant metadata
- GitHub App installation token minted server-side

Future provider examples:

- project-scoped SSH deploy key
- project-scoped HTTPS token
- external git host credential

Repository secrets should be held by GitHub App grants and short-lived GitHub App installation tokens for the initial implementation. Future adapters may use a configured secret manager or standalone TreeDX credential store depending on deployment mode. In Treeseed connected mode, TreeDX should prefer short-lived repository credentials issued by TreeSeed at operation time through the GitHub App adapter. Capacity-provider assignment payloads should carry repository access handles or TreeDX workspace handles, not repository credentials.

### Runtime Application Secrets

Runtime application secrets are deployed to project, web, API, worker, or service environments.

Examples:

- application API keys
- database credentials
- webhook signing secrets
- OAuth client secrets

These may be synchronized into host secret stores through reconciliation. The canonical metadata and deployment intent should remain in Treeseed configuration or API control-plane state.

For the initial GitHub-only project model, customer project runtime and tool secrets should be stored in GitHub repository or environment secrets whenever the secret-backed operation can run in GitHub Actions. Direct host secret deployment remains an explicit hosting need, not the default project-secret custody model.

### Agent Tool Secrets

Agent tool secrets allow project-owned agents to call external systems.

Examples:

- third-party API keys
- SaaS integration tokens
- project-specific service credentials

For the initial GitHub-only project model, agent tool secrets should default to GitHub Actions secret storage when the secret-backed operation can be expressed as an allowlisted workflow. Direct reveal to an agent runtime should remain unsupported for normal project work and should require explicit elevated policy if added later.

### Capacity Provider Secrets

Capacity provider secrets are owned by the provider and are used to operate the provider runtime or native execution surfaces.

Examples:

- model provider credentials
- local runner service tokens
- provider-owned GitHub Copilot or OpenRouter credentials
- native budget provider credentials

Project owners should not need access to provider-owned secrets. TreeSeed may store or reconcile provider runtime secrets when the provider operator opts into managed hosting, but provider secrets are not project secrets.

### Capability Handles

Capability handles are not raw secrets. They are short-lived, policy-bound references to allowed operations.

Examples:

- TreeDX proxy handle
- repository access handle
- secret-use handle
- workflow dispatch handle
- release-operation handle

Handles should include enough metadata for local runtime rejection and remote API enforcement:

```json
{
  "handleId": "rah_123",
  "kind": "repository_access",
  "teamId": "team_123",
  "projectId": "project_123",
  "assignmentId": "assignment_123",
  "repoId": "repo_456",
  "allowedOperations": ["read", "write_workspace", "commit_branch"],
  "allowedPaths": ["docs/**", "src/**"],
  "branchPattern": "treeseed/agent-*",
  "expiresAt": "2026-06-17T18:30:00Z"
}
```

## Encryption And Custody Model

Treeseed needs two different secret-custody paths:

- **GitHub-backed project secrets:** once a repository or GitHub Environment exists, customer project secrets should be deployed to GitHub Secrets and not stored decryptably by Treeseed.
- **Client-encrypted escrow:** before a repository, GitHub Environment, or final host target exists, CLI/Admin may store ciphertext in Treeseed so users do not have to repeatedly re-enter host secrets while drafting configuration.

The target encrypted escrow model is envelope encryption where Treeseed stores ciphertext and metadata but cannot decrypt customer project secrets.

```text
secret plaintext
  encrypted by per-secret data encryption key

data encryption key
  encrypted by one or more client-held wrapping keys

wrapping keys
  controlled by human passphrase, local device key, team recovery key, or external vault reference
```

The passphrase remains useful for local CLI/Admin unlock, draft configuration, and recovery, but it should not be a runtime dependency for background systems. Background systems should use GitHub App installation tokens, GitHub Actions workflow dispatch, TreeDX handles, assignment handles, or provider-owned secrets.

Each secret record should store:

- secret id
- owner scope, such as team, project, repository, provider, environment, or package
- secret class
- encrypted payload reference or encrypted value when the record is in client-encrypted escrow
- wrapping key references
- allowed consumers
- allowed operations
- reveal policy
- custody mode
- rotation metadata
- deployment targets
- last verified state
- audit metadata

Supported wrapping authorities may include:

- human passphrase wrapping key for local setup and recovery;
- local CLI keychain or device wrapping key when explicitly enabled;
- team recovery wrapping key when the team chooses recoverability over strict non-recovery;
- external vault reference for customers that bring their own vault.

Treeseed service KMS or service decryptability should be reserved for Treeseed bootstrap secrets, such as the GitHub App private key, signing keys, webhook secrets, and service-to-service trust secrets. Customer project secrets should not use API service-decryptable wrapping in the initial architecture.

### Client-Encrypted Escrow

Client-encrypted escrow exists for host and project drafts that are not attached to a GitHub repository or final host secret target yet.

The normal flow is:

```text
CLI or Admin collects a future host/project secret.
Client derives or retrieves a wrapping key locally.
Client encrypts the secret before sending anything to the API.
Treeseed stores ciphertext, metadata, KDF parameters, and deployment intent.
Later, the user unlocks locally.
Client decrypts locally and deploys to GitHub Secrets or a declared host secret store.
Treeseed deletes, tombstones, or marks the escrow ciphertext migrated.
```

Escrow is allowed only when no target secret store exists yet or when the user explicitly chooses draft-secret retention.

Client-encrypted escrow requirements:

- passphrase and plaintext secret values must never be sent to the API;
- encryption and decryption must happen in the CLI or browser;
- use authenticated encryption, such as XChaCha20-Poly1305 or AES-GCM;
- use a strong KDF for passphrase wrapping, such as Argon2id or scrypt;
- store per-secret salt, nonce, KDF parameters, encryption version, and metadata;
- never log plaintext, derived keys, or decrypted deployment payloads;
- support explicit deletion after migration to GitHub Secrets or host secret stores;
- make recovery policy clear: without a recovery wrapping key, lost passphrases require re-entering secrets.

Admin UI escrow has an additional trust boundary: hosted JavaScript can see the secret before client-side encryption. High-risk bootstrap or operator secrets should prefer CLI configuration unless Admin asset integrity, CSP, deployment provenance, and review practices are strong enough for the target threat model.

### Custody Modes

Every secret-like record should declare one custody mode:

```text
github_actions_secret_enclave
  Preferred for repo-attached customer project secrets. GitHub stores the secret.

client_encrypted_escrow
  Treeseed stores ciphertext only for draft configuration. Treeseed cannot decrypt.

metadata_only_reentry
  Treeseed stores metadata only. User must re-enter the secret at deployment time.

host_env_injection
  A declared host secret store receives the secret because a live runtime needs it.

external_vault_reference
  Future mode. Customer-owned vault stores the secret and Treeseed stores a reference.

bootstrap_service_secret
  Treeseed-operated secret needed to run Treeseed itself, such as the GitHub App private key.

provider_owned_secret
  Capacity provider owns the secret and Treeseed does not need project-owner access.
```

Only `github_actions_secret_enclave`, `client_encrypted_escrow`, `metadata_only_reentry`, `host_env_injection`, `bootstrap_service_secret`, and `provider_owned_secret` are first-version modes. Direct provider secret delegation is not a normal custody mode.

### Plaintext Handling Invariant

Treeseed's first-version project-secret invariant is:

```text
No customer project secret plaintext at rest in Treeseed-controlled storage.
No customer project secret plaintext in API request logs, audit logs, assignment payloads, provider reports, or TreeDX metadata.
No customer project secret plaintext in capacity-provider environments by default.
```

Plaintext may exist transiently only where the operation inherently requires it:

- in CLI memory while the operator enters or deploys a secret;
- in browser memory before client-side encryption, when Admin UI is used;
- inside GitHub's secret upload API boundary after client encryption to GitHub's public key;
- inside GitHub Actions runtime when an allowlisted workflow receives GitHub Secrets;
- inside a declared host secret store or runtime when `host_env_injection` is explicitly required.

Those transient boundaries must never be treated as durable Treeseed custody.

## Repository Authority Layer

Treeseed should define a repository authority layer rather than assuming one API-owned broker performs every git operation.

In connected mode, ownership is split:

- TreeDX owns repository workspace mechanics, git checkouts, indexing, querying, workspace mutation, save behavior, and generic repository operations.
- TreeSeed API owns project policy, secret metadata, connected-mode credential issuance, capability issuance, assignment authorization, and audit records.
- The API operations runner may execute privileged or host-local workflows when TreeDX is not the right execution surface.

The repository authority layer performs approved repository operations using project repository secrets without revealing those secrets to capacity providers or ordinary agent runtimes.

Capability-mediated operations should include:

- repository import
- repository metadata read
- file read
- workspace search
- full workspace checkout for approved engineering access modes
- branch creation
- patch application
- workspace file write
- commit
- push
- pull request creation
- release plan
- test invocation
- repository update

The repository authority layer may execute operations in TreeDX, dispatch GitHub Actions workflows, or enqueue work for the API operations runner. The caller should not need to know which execution path was selected.

The normal path should be:

```text
agent or provider runner
  calls SDK repository API with assignment handle

TreeSeed API
  validates assignment lease and repository access handle
  authorizes the project/repository/workspace operation
  issues or references short-lived repository authority when needed
  records audit evidence

TreeDX
  performs repository workspace and git operations
  uses short-lived connected-mode credentials or standalone TreeDX credentials

operations runner
  performs privileged workflows that are better suited to API-owned execution
```

Capacity providers should not receive project SSH keys, GitHub installation tokens, deploy keys, or TreeDX node credentials in assignment payloads.

## Repository Credential Provider Adapters

TreeSeed API should expose repository credentials through a pluggable provider-adapter layer. The adapter layer is the server-side boundary between project repository grants and short-lived operation credentials.

The initial and only supported adapter is `github_app`. Treeseed should use GitHub repositories for initial project management and should not support SSH deploy keys, HTTPS tokens, GitLab, Bitbucket, or other git credential providers until the GitHub App and GitHub Actions secret boundary is proven. Future adapters should fit the same contract later without changing capacity-provider payloads, AgentContext, TreeDX workspace handles, or SDK repository APIs.

The adapter layer should support this conceptual contract:

```text
resolveGrant(projectId, repositoryId)
  Find the configured repository grant and provider adapter.

authorizeOperation(grant, operation, actor, scope)
  Validate project policy, repository policy, branch/path rules, assignment lease,
  service principal identity, and requested operation.

mintCredential(grant, operation, scope, ttl)
  Return short-lived repository authority for TreeDX or another trusted executor.

describeCredential(credential)
  Return non-secret metadata for audit and debugging.

revokeOrInvalidate(grant, credentialRef)
  Revoke when the provider supports revocation, or mark unusable in TreeSeed policy.

observeGrant(grant)
  Verify that the upstream GitHub App installation and repository grant still exist.
```

Adapter outputs should be usable by trusted repository authority surfaces, not by capacity providers directly:

```json
{
  "credentialRef": "repo_cred_123",
  "provider": "github_app",
  "repositoryId": "repo_456",
  "operation": "push_branch",
  "expiresAt": "2026-06-17T18:30:00Z",
  "transport": {
    "kind": "https_bearer",
    "username": "x-access-token"
  }
}
```

The secret value itself should be returned only to the trusted caller that needs to perform the git operation, such as connected-mode TreeDX or the API operations runner. Audit logs, assignment payloads, provider reports, and UI surfaces should store only the credential reference and redacted metadata.

Initial adapter kinds:

- `github_app`: the only supported initial adapter for GitHub repositories, GitHub repository or environment secrets, workflow dispatch, and connected-mode repository authority.

Future adapter kinds may include:

- SSH deploy keys;
- HTTPS tokens;
- GitLab project or group access tokens;
- GitLab OAuth or app installation style grants if used;
- Bitbucket app passwords or workspace apps;
- self-hosted git providers with vault-backed credentials;
- SSH certificate authorities for hosts that support operation-scoped SSH certificates;
- enterprise vault providers that mint dynamic git credentials.

Adapter records should separate stable grant metadata from short-lived credential material:

```text
repository grant
  project id
  repository id
  provider kind
  provider account/installation/project id
  allowed operations
  branch/path policy
  status and last observed state

short-lived credential issuance
  grant id
  operation
  scope
  actor/service principal
  assignment id when applicable
  credential ref
  expiry
  audit result
```

The adapter abstraction is intentionally below the capacity and agent architecture. Provider assignments should not care whether a repository handle ultimately maps to a GitHub App token, GitHub Actions workflow dispatch, or a future credential provider. They care only about the allowed operation, repository scope, workspace mode, and lease state.

## TreeDX Connected Credential Bridge

TreeDX has two valid deployment modes:

- **Standalone mode:** TreeDX owns its own repository credential store and can clone, fetch, save, commit, and push without depending on TreeSeed.
- **Treeseed connected mode:** TreeDX shares authentication with TreeSeed and requests short-lived repository credentials from TreeSeed at operation time.

Connected mode should use this flow:

```text
TreeDX needs clone, fetch, save, commit, push, or repository update authority.
TreeDX authenticates to TreeSeed as a configured service principal.
TreeSeed validates project, repository, operation, actor, capability, and policy.
TreeSeed selects the repository credential provider adapter.
The adapter mints or unwraps short-lived repository authority.
TreeDX performs the git operation.
TreeSeed and TreeDX record audit evidence.
```

For GitHub repositories, the connected-mode credential must be a short-lived GitHub App installation token when the repository is connected through the `github_app` adapter. Non-GitHub remotes are out of scope for the initial implementation.

TreeDX should not encode Treeseed capacity-provider semantics. It should expose generic credential-provider integration points and generic repository operations. Treeseed owns the mapping from projects, assignments, providers, and capability handles to those generic TreeDX operations.

## GitHub Access Strategy

For GitHub-hosted projects, the required first implementation is a TreeSeed GitHub App installation. This is the default repository credential provider for connected-mode Treeseed projects.

```text
project owner installs TreeSeed GitHub App
TreeSeed stores installation id and repository grant metadata
github_app adapter mints short-lived installation tokens server-side
TreeDX or operations runner performs approved operations
capacity provider receives only repository access handles
```

This model is preferred over shared SSH keys because installation tokens are short-lived, repo-scoped, permission-scoped, revocable, and auditable.

The GitHub App adapter should support:

- installation discovery and repository selection;
- mapping GitHub repositories to Treeseed project repository records;
- storing installation id, account id, repository id, repository name, and selected permissions as grant metadata;
- observing whether the installation and repository grant still exist;
- minting short-lived installation tokens for clone, fetch, branch, commit, push, pull request, workflow dispatch, and metadata operations;
- enforcing Treeseed branch, path, assignment, workday, and provider policy before minting a token;
- recording credential issuance without storing the token in audit logs;
- handling installation revocation or repository removal as fail-closed grant drift.

The GitHub App private key is a bootstrap secret. It should be available only to the `github_app` adapter or a tightly scoped signing service. Capacity providers, project agents, TreeDX assignment payloads, and UI/API reports must not receive the app private key or minted installation tokens.

SSH deploy keys, HTTPS tokens, GitLab credentials, Bitbucket credentials, and non-GitHub repository providers are future adapter work. They are intentionally out of scope for the initial architecture so Treeseed can keep the user experience simple and avoid becoming a decrypting custodian for customer project secrets.

## GitHub Actions Secret Boundary

For the initial implementation, GitHub repository and environment secrets are the preferred project-secret storage and execution boundary. Treeseed should avoid storing decryptable customer project secrets locally, in the API database, in TreeDX, or in capacity-provider environments.

The preferred model is:

```text
configuration time
  CLI config command or Admin host configuration collects the secret
  client encrypts the secret to GitHub's repository or environment public key
  GitHub App writes the encrypted secret to GitHub
  Treeseed stores metadata, policy, and deployment evidence only

runtime
  API operations runner, CLI, agent, or capacity provider requests a secret-backed operation
  Treeseed validates project, assignment, workday, provider, and repository policy
  GitHub App dispatches an approved GitHub Actions workflow
  GitHub Actions receives GitHub Secrets inside the workflow boundary
  Treeseed records run id, inputs, outputs, artifacts, and audit evidence
```

In this mode, Treeseed does not need to store the project secret, even encrypted, after deployment. GitHub stores the secret in GitHub Secrets. Treeseed stores:

- secret name or logical id;
- GitHub repository or environment target;
- workflow operation policy;
- last deployment metadata;
- audit events;
- rotation status;
- whether re-entry is required.

GitHub Actions workflows become protected, typed remote functions. They must not become arbitrary remote shells with secrets attached.

Secret-backed operations should run only through allowlisted workflows. Examples:

- release;
- package publish;
- deployment;
- repository initialization;
- hosted-provider configuration sync;
- secret-backed integration test;
- cloud-provider operation using GitHub OIDC;
- third-party API operation that needs a project secret.

`trsd` commands that require project secrets should dispatch approved GitHub Actions workflows instead of requiring those secrets locally. The CLI may collect and deploy secrets through `trsd config`, but normal `trsd` workflow, release, test, package, and deploy commands should use GitHub workflow dispatch when the operation needs GitHub-stored secrets.

Capacity providers and agents should request secret-backed operations through Treeseed handles. Treeseed decides whether to dispatch a workflow. Providers and agents should not receive the GitHub secret value, repository secret write authority, or generic workflow-dispatch authority.

The secret boundary includes the workflow file and every repository file that the workflow executes while secrets are available. A protected workflow can still leak secrets if it checks out and runs untrusted code, such as an agent-edited package script, local action, shell script, or deployment helper.

### Secure Workflow Requirements

The GitHub Actions secret boundary is only secure if the workflow that receives secrets is protected.

Required controls:

- secret-bearing workflows must be allowlisted by Treeseed operation id;
- secret-bearing workflow files must live on protected branches;
- workflow files must require human review or CODEOWNERS review before changes;
- production secrets should live in protected GitHub Environments with required reviewers where appropriate;
- dispatched workflow refs must be pinned to an approved branch, tag, or commit policy;
- workflow inputs must be typed, validated, and minimal;
- workflows must not execute arbitrary provider-supplied shell commands with secrets present;
- workflows must not run untrusted branch code while secrets are present;
- files executed by secret-bearing workflows must be part of a trusted execution set;
- secret-bearing workflows should avoid `pull_request_target` unless the workflow never checks out or executes untrusted pull request code;
- third-party actions used by secret-bearing workflows should be pinned to immutable SHAs where practical;
- workflow permissions should use the minimum required `GITHUB_TOKEN` scopes;
- secrets should be scoped to GitHub Environments or repositories as narrowly as possible;
- workflow logs, artifacts, summaries, and annotations must not echo secrets or derived credentials;
- workflow caches should not contain secrets or secret-derived build outputs;
- artifacts from secret-bearing workflows should be allowlisted, redacted, and retained for the shortest practical duration;
- cloud deployments should prefer GitHub OIDC with cloud-side trust policy over long-lived cloud API keys stored as GitHub Secrets;
- Treeseed must record dispatch actor, workflow id, ref, inputs hash, run id, assignment id, provider id when relevant, and final run result.

Unsafe pattern:

```text
provider supplies arbitrary command
TreeSeed dispatches workflow with project secrets
workflow runs provider command with secrets in environment
```

Safe pattern:

```text
provider requests approved operation
TreeSeed validates operation and scope
TreeSeed dispatches allowlisted workflow
workflow executes fixed logic with typed inputs
workflow returns bounded result
```

### Trusted Execution Sets

Each secret-backed workflow operation should declare a trusted execution set: the workflow file, local action files, scripts, package scripts, lockfiles, and configuration files that are allowed to execute while secrets are present.

Example:

```yaml
workflowOperation:
  id: package_publish
  workflow: .github/workflows/publish.yml
  refPolicy: protected_default_branch
  environment: production
  trustedExecutionSet:
    - .github/workflows/publish.yml
    - .github/actions/setup-publish/**
    - scripts/publish.mjs
    - package.json
    - package-lock.json
  forbiddenProviderWritePaths:
    - .github/workflows/**
    - .github/actions/**
    - CODEOWNERS
    - scripts/publish.mjs
```

Provider assignments that write code should not be allowed to modify the trusted execution set for secret-backed workflows unless a human review and protected-branch merge updates that trust boundary first.

When a workflow needs to test untrusted code, it should split execution:

```text
untrusted phase
  checkout agent/provider branch
  run tests without production secrets
  produce bounded artifact or test result

trusted secret phase
  checkout protected ref
  verify artifact/result
  use GitHub Secrets only in fixed release/deploy logic
```

### Workflow Operation Contracts

Secret-backed workflows should be addressed by stable operation ids rather than arbitrary workflow names and inputs.

Each operation contract should define:

- operation id;
- workflow file;
- allowed refs or ref policy;
- GitHub Environment;
- required reviewers, if any;
- allowed actor classes, such as CLI, API operation, provider assignment, or admin action;
- input schema and validation rules;
- output schema and artifact allowlist;
- allowed secret names or GitHub Environment;
- timeout and concurrency policy;
- retry policy;
- audit fields;
- whether human approval is required before dispatch.

Treeseed should dispatch only operation ids that pass this contract. Capacity providers should receive operation handles, not raw workflow ids and arbitrary input authority.

### CLI And Admin Configuration

The CLI and Admin UI have different secret configuration responsibilities.

CLI:

- `trsd config` owns local operator entry and deployment of project secrets to GitHub Secrets.
- The CLI should encrypt secrets to GitHub's public key locally and send only GitHub-compatible encrypted payloads.
- `trsd config` should report a `secretCapability` diagnostic summary so operators can distinguish metadata-only, escrowed, GitHub-backed, host-injected, bootstrap, provider-owned, migrated, expired, tombstoned, and re-entry-required states without revealing values.
- When no GitHub repository, GitHub Environment, or final host target exists yet, the CLI may store client-encrypted escrow ciphertext in Treeseed.
- The CLI should avoid storing project secrets locally after deployment.
- The CLI should delete or tombstone migrated escrow ciphertext after successful deployment to GitHub Secrets or a host secret store.
- If a secret must be changed, the operator re-enters it and redeploys it to GitHub.

Admin UI:

- Admin host configuration owns browser-based project secret deployment for hosted users.
- Secret values should be encrypted client-side to GitHub's public key where possible.
- When host configuration is still a draft without a GitHub or host target, Admin may store client-encrypted escrow ciphertext in Treeseed.
- The API should receive only encrypted GitHub secret payloads and metadata for project secrets.
- The API should receive only client-encrypted escrow ciphertext for draft secrets, never passphrases or plaintext values.
- Admin host credential submissions may include safe `secretCapability` metadata derived from browser-side encryption, but project-host rotate/resync actions must fail closed instead of submitting an unlock passphrase to the API. Users should re-enter, rotate, or migrate the host secret through a client-side flow first.
- For highly sensitive bootstrap or operator secrets, CLI configuration remains the safer path because hosted Admin JavaScript integrity is part of the trust boundary.

TreeSeed API:

- stores GitHub secret metadata and policy;
- stores client-encrypted escrow ciphertext and metadata for draft configuration when needed;
- does not store customer project secret plaintext;
- should not store decryptable customer project secret ciphertext for the initial GitHub-only mode;
- rejects passphrases, derived keys, decrypted payloads, provider credential sessions, and equivalent unlock material on public project launch, launch retry/recovery, project host rotate/resync/replace, and project deletion routes;
- dispatches approved workflows through the GitHub App;
- observes workflow results and GitHub secret drift where GitHub APIs allow it.

## TreeDX Access Strategy

TreeDX should remain behind TreeSeed project authorization in connected mode.

Provider assignments may carry TreeDX proxy handles, but they must not carry raw TreeDX service credentials. The API should verify:

- caller identity
- active assignment lease
- provider ownership of the lease
- TreeDX proxy handle id
- project and repository scope
- workspace scope
- operation scope
- path scope
- expiry and revocation state

TreeDX itself should receive only the configured TreeSeed service principal trust token or equivalent product-neutral trust grant plus any short-lived repository credential issued for the current operation. TreeDX must not encode Treeseed capacity-provider semantics.

## Capacity Provider Boundary

Third-party capacity providers should be treated as untrusted with respect to project secrets.

They may receive:

- assignment id
- lease token or provider assignment authorization
- project files and context allowed for the selected access mode
- selected decision or planning context
- output contract
- budget and capability envelope
- repository access handle
- TreeDX proxy handle
- secret-use handles explicitly allowed by project policy

They should not receive by default:

- project repository SSH private keys
- GitHub App private keys
- GitHub installation tokens
- project-wide GitHub tokens
- host provider credentials
- TreeDX node credentials
- runtime application secrets
- unrelated repository contents
- secrets belonging to other projects or teams

Direct provider access to raw credentials should be an elevated grant with explicit owner approval, a narrow scope, short expiry, revocation, and project-visible audit evidence.

Private source visibility and credential authority are separate decisions. A project owner may reasonably grant a trusted engineering capacity provider access to a full private repository workspace, similar to using a CI/CD provider. That does not imply the provider should receive push credentials, deployment credentials, runtime application secrets, host provider tokens, or durable authority outside the assignment.

## Capacity, Workday, And Agent Integration

The secrets system is an authority layer underneath capacity coordination. It does not replace workdays, allocation sets, provider sessions, assignment leases, mode runs, or AgentKernel policy. It answers one question for those systems:

```text
For this assignment, under this workday policy, may this runner perform this operation with this authority?
```

### Workday Policy

Workdays and allocation sets decide whether work is eligible, how much capacity it may consume, and which provider grants may satisfy the demand. They should not directly decrypt or distribute secrets.

A workday may shape secret and repository authority through policy:

```text
team workday
  allocation set
  project allocation
  agent-class allocation
  planning/acting split
  provider grant eligibility
  repository access mode
  write policy
  required approval or readiness state
```

Example:

```text
Project A receives 40 acting units today.
Security Engineering may use Provider X.
Acting requires accepted decision execution input.
Repository writes must target treeseed/agent-* branches.
Pushes must flow through TreeDX connected credential bridge.
Runtime application secrets are forbidden for provider assignments.
```

That policy does not give Provider X a repository key. It gives the API enough context to decide which assignment-scoped handles may be issued when work is leased.

### Provider Sessions And Assignment Leasing

Providers check in with supply, not project secrets.

```text
provider session
  provider id
  availability window
  execution providers
  checked-in grants
  capabilities
  runner concurrency
  native limits
  local pressure
```

During assignment synthesis or lease selection, TreeSeed API matches workday demand to provider supply. If the provider is eligible, the assignment payload carries scoped handles and policy metadata:

```json
{
  "assignmentId": "assignment_123",
  "projectId": "project_123",
  "agentClassId": "security_engineering",
  "mode": "acting",
  "workspaceAccessMode": "full_workspace_no_credentials",
  "repositoryAccessHandleId": "rah_123",
  "treeDxProxyHandleId": "tdxph_123",
  "allowedCommands": ["npm test", "npm run verify"],
  "writePolicy": {
    "branches": ["treeseed/agent-*"],
    "directMainPush": false
  },
  "secretUseHandles": [],
  "leaseExpiresAt": "2026-06-17T18:30:00Z"
}
```

The assignment should not carry raw git credentials, TreeDX node credentials, project application secrets, host provider tokens, or unrelated team secrets.

### Planning And Acting

Planning assignments should normally receive weaker authority than acting assignments.

Typical planning authority:

```text
workspace access: context_only or brokered_workspace
repository access: read summaries, selected files, search, context build
write access: none or draft proposal only
secret access: none by default
push access: none
```

Typical acting authority:

```text
workspace access: brokered_workspace or full_workspace_no_credentials
repository access: full checkout when approved
write access: workspace and assignment branch
test access: approved commands
push access: TreeDX connected credential bridge or pull request flow
secret access: brokered tool handles only when explicitly allowed
```

Acting assignments should require accepted decision execution input, readiness, and capacity-plan provenance before write-capable repository handles are issued.

### Agent Runtime

Project agents consume authority through `AgentContext`, not through manually decrypted environment variables.

The runtime should hydrate context from the assignment:

```text
AgentContext.capacity
  assignment id
  mode
  capacity envelope
  provider id
  project id
  agent class id
  capability handles
  workspace access mode

AgentContext.repository
  local inspection adapter
  no credential injection by default

AgentContext.operations
  assignment-scoped workflow-operation dispatch
  operation id and handle id only
  no arbitrary workflow file/ref/command input

AgentContext.treeDx
  TreeDX proxy handle
  project/repository/workspace scope
  allowed operations

AgentContext.capacity.capabilityHandles.secrets
  explicit secret-use references only
  revealAllowed false by default
```

Before making a remote call, the provider runner and agent runtime should reject obviously out-of-scope requests locally. The API and TreeDX must still enforce the same scope remotely because local checks are convenience and defense-in-depth, not the authority of record.

The implemented v1 provider runner consumes redacted `capabilityHandles` from the assignment. Workflow operations execute through the provider assignment route `POST /v1/provider/assignments/:assignmentId/workflow-operations/:operationId/dispatch`, which validates the provider API key, assignment ownership, active lease token, matching workflow-operation handle, and rejects arbitrary workflow files, refs, commands, repositories, or provider-supplied secret-bearing scope. The route then delegates to the GitHub Actions secret enclave, so the provider never receives a GitHub App token.

### TreeDX Repository Operations

For private repository saves in connected mode, TreeDX uses the credential bridge:

```text
agent requests commit through SDK
provider runner sends request with assignment and repository handle
TreeSeed API validates assignment lease, workday-derived policy, and repository scope
TreeDX prepares workspace commit
TreeDX requests short-lived push authority from TreeSeed
TreeSeed mints or unwraps operation-scoped credential
TreeDX pushes branch or performs approved save
TreeSeed and TreeDX record audit evidence
```

This allows TreeDX to remain the git workspace system while avoiding durable repository credentials in capacity-provider environments.

### Audit Binding

Secret-adjacent audit records should bind back to the capacity model.

Audit records should include these fields when relevant:

- workday id
- allocation set id
- capacity plan id
- provider session id
- assignment id
- mode run id
- provider id
- runner id
- project id
- agent class id
- repository id
- workspace id
- handle id
- secret id
- operation
- decision or planning input reference
- result and denial reason

This gives project owners and operators a complete chain:

```text
workday policy
  assignment lease
  agent mode run
  repository or secret handle
  TreeDX/API operation
  audit result
```

### Failure And Revocation

If a lease expires, a workday closes, a provider grant is revoked, a repository handle expires, or a decision readiness state changes, secret and repository capabilities should fail closed.

Examples:

- a provider cannot renew an expired repository handle without an active assignment lease;
- TreeDX cannot receive a new short-lived push credential for a revoked project repository grant;
- an acting assignment cannot receive write authority after its approved decision input is withdrawn;
- a provider returned assignment should lose workspace write and push authority;
- mode-run failure should not leave valid secret-use handles behind.

## Provider Workspace Access Modes

Capacity-provider grants should declare the workspace access mode that a project owner accepts.

### Context Only

`context_only` providers receive selected files, summaries, search results, issues, proposals, or other bounded context.

This mode is appropriate for:

- planning
- research
- content work
- lightweight review
- summarization
- estimate drafting

The provider does not receive a full repository checkout and cannot run project test suites or development servers unless those operations are brokered elsewhere.

### Brokered Workspace

`brokered_workspace` providers propose edits, patches, commands, or repository operations, but TreeDX, the API operations runner, or another trusted execution surface applies and tests them.

This mode is appropriate for specialized providers that should not receive full private repository contents or local execution authority but can still contribute meaningful changes through a trusted executor.

The normal flow is:

```text
provider proposes patch or command
TreeSeed validates assignment scope
TreeDX or operations runner applies patch in trusted workspace
trusted workspace runs tests or checks
provider receives bounded results
```

### Full Workspace No Credentials

`full_workspace_no_credentials` providers receive a complete repository checkout or workspace snapshot and may run approved project commands.

This mode is appropriate for engineering providers that need to run:

- package scripts
- test suites
- development servers
- build tooling
- static analysis
- migrations
- integration checks

The provider may inspect private code and modify the local workspace, but it should not receive reusable git push credentials or project secrets by default. Writes should return through TreeDX, repository access handles, branch-scoped commits, or pull requests.

Example authority:

```text
read: full repository
workspace: full checkout
commands: npm test, npm run verify, dev server, package scripts
write: workspace and assignment branch
push: through TreeDX connected credential bridge
secrets: none by default
network: scoped by provider grant
```

### Trusted Direct

`trusted_direct` providers may receive broader environment access or direct credentials under explicit policy.

This mode is for internal providers, self-hosted providers, or exceptional cases where the project owner intentionally delegates stronger authority. It should require clear UI/CLI warnings, narrow scopes, short expiry, audit evidence, and revocation controls.

## Encrypted Provider Workspaces

Encrypted provider workspaces can harden full-workspace execution but they do not remove the need to trust a provider that can execute against private code.

Encrypted volumes are useful for:

- protecting private code at rest on provider machines;
- reducing risk from disk snapshots;
- isolating one customer's workspace from another;
- making cleanup safer through key discard;
- supporting marketplace provider compliance tiers.

Encrypted volumes do not prevent the provider runtime, host administrator, or compromised agent process from reading code while the workspace is mounted. They are therefore a hardening layer, not a replacement for project-owner trust decisions.

Providers that support `full_workspace_no_credentials` should preferably use:

- per-assignment encrypted workspace volumes;
- ephemeral mount lifecycle;
- secure deletion or encryption-key discard at completion;
- no persistent git credential helper;
- no project secrets in environment variables by default;
- command, network, and filesystem scope enforcement;
- audit of workspace creation, command execution, outbound repository operations, and cleanup.

## Secret Use Policies

Each secret should declare a use policy. Current project-secret support should default to GitHub Actions secret storage. Other modes are explicit exceptions or future extension points.

```text
forbidden
  The secret cannot be used by agents or providers.

brokered_request
  The API or a trusted service performs an approved operation using the secret.

github_actions_secret_enclave
  GitHub stores the project secret and an approved GitHub Actions workflow uses it.

client_encrypted_escrow
  Treeseed stores ciphertext only for draft configuration before a final target exists.

metadata_only_reentry
  Treeseed stores metadata only and the user must re-enter the secret later.

connected_credential_bridge
  TreeSeed issues short-lived repository authority to TreeDX or another trusted repository authority surface for one approved operation.

host_env_injection
  Reconciliation deploys the secret into a declared runtime host environment.

ephemeral_reveal
  Future or exceptional mode. The secret may be revealed to an approved runtime for a short-lived assignment.

direct_delegation
  Future or exceptional mode. The secret may be delegated to a provider or external runner under an explicit grant.
```

Defaults should be conservative:

- project repository secrets: `connected_credential_bridge` in TreeDX connected mode or `brokered_request` for non-TreeDX trusted executors
- draft host and project secrets before target creation: `client_encrypted_escrow` or `metadata_only_reentry`
- project runtime app secrets: `github_actions_secret_enclave` when the operation can run in GitHub Actions, otherwise explicit `host_env_injection`
- agent tool secrets: `github_actions_secret_enclave` for secret-backed operations, otherwise `brokered_request`
- bootstrap secrets: `forbidden` for agent/provider use
- capacity provider secrets: provider-owned policy

## SDK And Agent Runtime Shape

Agents should use capability-oriented SDK clients.

Preferred shape:

```ts
await context.repo.readFile({
  path: "docs/agent-capacity-implementation-roadmap.md"
});

await context.repo.commit({
  branch: "treeseed/agent-doc-update",
  message: "Update capacity docs",
  files
});

await context.treeDx.searchWorkspace({
  query: "provider assignment lifecycle"
});
```

Engineering agents may receive a full repository workspace when the assignment and provider grant allow it. The SDK should still keep repository credential handling behind capability-aware clients.

Example full-workspace shape:

```ts
const workspace = await context.repo.openWorkspace({
  mode: "full_workspace_no_credentials"
});

await workspace.run({
  command: "npm",
  args: ["test"]
});

await workspace.commit({
  branch: "treeseed/agent-fix",
  message: "Fix failing test"
});
```

Secret-backed work should use operation handles instead of direct secret reveal:

```ts
await context.secrets.runOperation({
  operationId: "third_party_readonly_sync",
  input: { since: "2026-06-01" }
});
```

Most project agents should not know whether repository operations are backed by GitHub App calls, TreeDX, SSH, GitHub Actions, or an API operations runner. The SDK should preserve an easy programming model while TreeSeed and TreeDX enforce scope.

## Environment Registry Configuration

The Treeseed environment registry should declare the desired secret and credential-provider configuration for each environment. It should not rely on ad hoc environment variables scattered across package scripts, provider dashboards, TreeDX settings, or capacity-provider hosts.

The registry should distinguish:

- non-secret configuration values;
- secret references that resolve through `trsd config`, a host secret manager, KMS, or a local encrypted store;
- deployment targets that receive a secret through reconciliation;
- runtime-only credential issuance settings that must not be deployed to capacity providers.

### Required Initial Registry Entries

The initial connected-mode implementation requires entries for:

- repository credential providers;
- the GitHub App adapter;
- GitHub Actions secret storage and workflow dispatch policy;
- workflow operation contracts;
- client-encrypted escrow;
- TreeDX connected credential bridge trust;
- API secret wrapping or KMS;
- repository authority policy defaults;
- capacity-provider workspace access defaults.

Conceptual registry shape:

```yaml
repositoryCredentialProviders:
  githubApp:
    enabled: true
    appIdRef: TREESEED_GITHUB_APP_ID
    clientIdRef: TREESEED_GITHUB_APP_CLIENT_ID
    privateKeySecretRef: TREESEED_GITHUB_APP_PRIVATE_KEY
    webhookSecretRef: TREESEED_GITHUB_APP_WEBHOOK_SECRET
    defaultPermissions:
      contents: write
      metadata: read
      pullRequests: write
      actions: write
      checks: read
    tokenTtlSeconds: 3600
    tokenAudience: treedx-connected-git

githubActionsSecretStore:
  enabled: true
  provider: github_app
  defaultSecretTarget: environment
  defaultEnvironment: treeseed
  requireProtectedEnvironments: true
  requireAllowlistedWorkflows: true
  requireProtectedWorkflowRefs: true
  allowArbitraryCommandsWithSecrets: false
  allowUntrustedCodeWithSecrets: false
  preferGitHubOidcForCloudAccess: true
  dispatchAuditRequired: true

workflowOperations:
  package_publish:
    workflow: .github/workflows/publish.yml
    refPolicy: protected_default_branch
    environment: production
    requireReviewers: true
    inputSchemaRef: treeseed.workflow.package_publish.v1
    outputSchemaRef: treeseed.workflow.package_publish_result.v1
    allowArbitraryCommands: false
    allowUntrustedCheckoutWithSecrets: false
    trustedExecutionSet:
      - .github/workflows/publish.yml
      - .github/actions/setup-publish/**
      - scripts/publish.mjs
      - package.json
      - package-lock.json
    forbiddenProviderWritePaths:
      - .github/workflows/**
      - .github/actions/**
      - CODEOWNERS
      - scripts/publish.mjs

clientEncryptedEscrow:
  enabled: true
  allowedForDraftConfiguration: true
  defaultRecoveryMode: reentry_required
  deleteAfterMigration: true
  kdf: argon2id
  cipher: xchacha20-poly1305

treeDxCredentialBridge:
  enabled: true
  servicePrincipalRef: TREESEED_TREEDX_SERVICE_PRINCIPAL_ID
  trustSecretRef: TREESEED_TREEDX_CONNECTED_TRUST_SECRET
  allowedCredentialProviders:
    - github_app
  maxCredentialTtlSeconds: 3600

secretWrapping:
  provider: kms
  keyRef: TREESEED_SECRET_WRAPPING_KEY_REF
  localPassphraseFallback: true
  customerProjectSecretServiceDecryptable: false

repositoryAuthorityDefaults:
  defaultWritePolicy: pull_request_or_agent_branch
  defaultBranchPattern: treeseed/agent-*
  directMainPush: false
  requireAssignmentLeaseForProviderWrites: true

capacityProviderWorkspaceDefaults:
  defaultAccessMode: context_only
  allowedAccessModes:
    - context_only
    - brokered_workspace
    - full_workspace_no_credentials
  requireEncryptedWorkspaceForFullAccess: true
  directSecretDelegationDefault: forbidden
```

The exact YAML shape may evolve with the SDK config model, but the registry must preserve these boundaries:

- `TREESEED_GITHUB_APP_PRIVATE_KEY` is a bootstrap secret for the `github_app` adapter or signing service only.
- `TREESEED_GITHUB_APP_WEBHOOK_SECRET` is used to verify GitHub App webhook events and installation drift.
- GitHub App installation ids and repository grants are project repository grant records, not capacity-provider environment variables.
- customer project secrets are deployed to GitHub repository or environment secrets and are not stored decryptably by TreeSeed in the initial mode.
- draft host or project secrets may be stored only as client-encrypted escrow ciphertext when no final GitHub or host target exists.
- secret-bearing GitHub Actions workflows must be represented as workflow operation contracts with trusted execution sets.
- TreeDX receives connected-mode trust configuration and short-lived operation credentials, not the GitHub App private key.
- Capacity providers receive assignment handles and workspace policy, not repository credential provider secrets.

### GitHub App Registry Requirements

GitHub App support should be first-class in the environment registry from the initial implementation.

Required values:

- `TREESEED_GITHUB_APP_ID`: GitHub App id used for signing installation token requests.
- `TREESEED_GITHUB_APP_CLIENT_ID`: GitHub App client id used for installation/onboarding flows where needed.
- `TREESEED_GITHUB_APP_PRIVATE_KEY`: secret reference for the app private key.
- `TREESEED_GITHUB_APP_WEBHOOK_SECRET`: secret reference for validating GitHub webhook payloads.
- GitHub App permission policy: declared contents, metadata, pull request, workflow/actions, and checks permissions.
- GitHub App installation grant records: team/project/repository mappings discovered during onboarding.

The registry should also record expected webhook and callback configuration where applicable:

```yaml
githubApp:
  installationCallbackUrl: https://treeseed.example.com/v1/integrations/github/installations/callback
  webhookUrl: https://treeseed.example.com/v1/integrations/github/webhook
  expectedEvents:
    - installation
    - installation_repositories
    - push
    - pull_request
    - check_suite
    - workflow_run
```

GitHub App installation grants should be observed live. Missing installations, removed repositories, reduced permissions, or mismatched account ids are credential drift and should block or revoke new repository credential issuance until reconciled or re-authorized.

### GitHub Actions Secret Store Registry Requirements

The GitHub Actions secret store needs registry entries that define where project secrets are deployed and which workflows may consume them.

Required values:

- GitHub repository or environment target for each logical project secret.
- required GitHub Environment name when environment secrets are used.
- allowlisted workflow ids or filenames for secret-backed operations.
- workflow operation contracts with input/output schemas.
- trusted execution sets for workflows that receive secrets.
- approved refs or branch policies for dispatched workflows.
- required reviewer policy for production or high-risk environments.
- allowed workflow operations, such as release, deploy, publish, integration test, or provider configuration sync.
- disallowance of arbitrary command execution when secrets are present.
- disallowance of untrusted branch checkout or untrusted local script execution while secrets are present.
- artifact, cache, and log redaction policy.
- GitHub OIDC preference for cloud access where available.
- audit metadata requirements for workflow dispatch and completion.

Treeseed should treat missing GitHub secrets, missing environments, disabled required reviewers, modified workflow allowlists, or unprotected secret-bearing workflow refs as drift.

### Client-Encrypted Escrow Registry Requirements

Client-encrypted escrow needs registry entries for draft configuration that cannot yet be deployed to GitHub Secrets or a final host secret store.

Required values:

- whether escrow is enabled for draft host/project configuration;
- allowed secret classes for escrow;
- KDF and cipher versions;
- passphrase recovery policy;
- whether ciphertext must be deleted or tombstoned after migration;
- maximum escrow age before re-entry is required;
- metadata fields allowed beside ciphertext;
- audit events for escrow create, update, unlock attempt, migration, deletion, and recovery failure.

Escrow records must not be deployment targets. They are temporary custody records used to preserve user input until a real target exists.

### TreeDX Connected Bridge Registry Requirements

The TreeDX connected credential bridge needs registry entries that let TreeDX authenticate to TreeSeed and request operation-scoped credentials.

Required values:

- TreeDX connected mode enabled flag.
- TreeDX service principal id or actor reference.
- TreeDX trust secret, signing key, or service-to-service auth reference.
- allowed repository credential provider adapters.
- maximum credential TTL.
- allowed operations, such as clone, fetch, save, commit, push, pull request, and repository update.
- audit sink or audit route configuration.

TreeDX standalone mode should be declared separately. In standalone mode, TreeDX may use its own credential store and does not require the TreeSeed connected credential bridge.

### Secret Deployment Targets

The registry should declare deployment targets separately from secret custody.

Examples:

```yaml
secretDeployments:
  api:
    railway:
      - TREESEED_GITHUB_APP_ID
      - TREESEED_GITHUB_APP_PRIVATE_KEY
      - TREESEED_GITHUB_APP_WEBHOOK_SECRET
      - TREESEED_SECRET_WRAPPING_KEY_REF

  treedx:
    railway:
      - TREESEED_TREEDX_CONNECTED_TRUST_SECRET

  capacityProvider:
    railway:
      - TREESEED_CAPACITY_PROVIDER_API_KEY
```

Repository credential provider secrets and customer project secrets should not be deployed to capacity-provider hosts by default. Customer project secrets should be deployed to GitHub repository or environment secrets for the initial implementation. If a `trusted_direct` provider grant requires direct credential delegation, that deployment must be represented as an explicit elevated grant, not as a default environment registry target.

## Reconciliation And Host Secret Stores

Reconciliation remains the only mutation model for Treeseed-owned hosted infrastructure.

Secret deployment to provider stores should be desired-state:

- repository environment secrets
- GitHub Actions secrets
- Cloudflare secrets
- Railway variables
- TreeDX service trust configuration
- capacity-provider runtime variables

The reconciler should compare desired secret references and deployment targets against live observations where the provider allows verification. It must not treat provider mutation success as proof without postcondition checks.

The canonical secret metadata should identify deployed targets and verification state. Provider secret stores are deployment targets, not the sole source of truth.

## Audit And Revocation

Treeseed should record durable audit events for:

- secret creation
- secret import
- wrapping key changes
- secret rotation
- deployment to host secret stores
- deployment to GitHub repository or environment secrets
- GitHub Actions workflow dispatch
- GitHub Actions workflow result observation
- capability issuance
- capability use
- denied capability use
- brokered repository operations
- direct secret reveal
- direct provider delegation
- revocation
- failed verification

Audit records should include:

- actor
- service principal
- team id
- project id
- provider id when relevant
- assignment id when relevant
- secret id or handle id
- operation
- scope
- result
- timestamp
- reason or policy decision

Revocation should be available at multiple layers:

- revoke a capability handle;
- revoke an assignment lease;
- revoke a provider grant;
- rotate a project repository credential;
- revoke a GitHub App installation or repository grant;
- remove a host secret deployment;
- disable a wrapping key.

## Local Development

Local development may keep a passphrase-backed encrypted secret store because a human operator is present.

However, local flows should still exercise the same conceptual model:

- secrets have classes and owner scopes;
- draft configuration uses client-encrypted escrow when a target does not exist;
- repo-attached project secrets deploy to GitHub Secrets;
- approved background operations use service identity or local dev trust;
- agents receive capability handles;
- direct secret reveal remains unsupported for normal project work and explicit for future elevated grants;
- brokered repository operations are used when possible.

This keeps local behavior close to production and avoids building agent logic that depends on plaintext local environment variables.

## Migration Path

1. Keep passphrase wrapping only for local CLI/Admin setup, draft escrow, re-entry, and recovery. Public API project operations must not accept passphrases or credential-session unlock material for customer/team host secrets.
2. Add secret metadata records with owner scope, class, custody mode, use policy, GitHub secret target, workflow allowlist, escrow state, rotation state, and audit metadata.
3. Implement the `github_app` repository credential provider adapter as the default connected-mode GitHub credential path.
4. Add GitHub App installation onboarding, repository grant discovery, grant observation, token minting, and revocation handling.
5. Implement GitHub Actions secret storage as the only initial customer project-secret adapter.
6. Implement client-encrypted escrow for draft host/project configuration before a GitHub or host target exists.
7. Add allowlisted secret-bearing workflow definitions, workflow operation contracts, trusted execution sets, protected ref policy, environment protection requirements, and dispatch audit records.
8. Add environment registry entries for GitHub App adapter configuration, GitHub Actions secret storage, client-encrypted escrow, TreeDX connected bridge trust, repository authority defaults, and provider workspace defaults.
9. Implement the TreeDX connected credential bridge for short-lived clone, fetch, save, commit, push, and update authority through the GitHub App adapter.
10. Implement repository access handles as a sibling to existing TreeDX proxy handles.
11. Add provider workspace access modes: `context_only`, `brokered_workspace`, `full_workspace_no_credentials`, and `trusted_direct`.
12. Route SDK git, release, test, workspace, and repository helpers through TreeDX or approved GitHub Actions workflows as appropriate.
13. Change provider assignments to carry repository access handles, TreeDX workspace handles, workflow-operation handles, or workspace access modes instead of direct repository credentials.
14. Add secret-backed operation handles that dispatch approved GitHub Actions workflows instead of revealing project secrets.
15. Add explicit elevated direct-secret delegation only after audit, revocation, and UI warnings exist.
16. Extend reconciliation to verify GitHub App grants, GitHub secret targets, workflow allowlists, trusted execution sets, protected refs, GitHub Environment policy, and hosted runtime secret deployments with live observation.

## Open Questions

- Which KMS or vault backend should be canonical for Treeseed bootstrap secrets such as the GitHub App private key?
- Should local passphrase wrapping keys be recoverable through team recovery keys, or should lost passphrases require secret re-entry?
- What is the exact first-version escrow recovery policy for teams: re-entry only, team recovery key, or external vault reference?
- What is the exact SDK-owned environment registry schema for GitHub App, GitHub Actions secret storage, and TreeDX connected bridge trust?
- Which entries belong in central workspace config versus package-local `treeseed.package.yaml` or future project manifests?
- Which repository operations must be supported by TreeDX directly versus the API operations runner?
- What is the first connected credential bridge protocol between TreeSeed and TreeDX?
- Should TreeDX cache short-lived credentials for the duration of an operation, or request per git command?
- What exact adapter interface should `github_app` and the GitHub Actions secret-store adapter implement in the first SDK/API contract?
- Should GitHub App token minting happen inside the API process, the operations runner, or a narrow signing service?
- Which GitHub App permissions are required for the initial repository lifecycle, workflow, pull request, and metadata operations?
- Which workflow operations are safe to expose as secret-backed functions, and which must stay manual?
- Which files belong in each trusted execution set for release, deploy, publish, and integration-test workflows?
- Which GitHub Environment protection settings are required for production or high-risk project secrets?
- How should Treeseed detect drift in secret-bearing workflows without requiring plaintext secret access?
- How should Treeseed verify that provider assignments cannot modify trusted execution set files without protected review?
- Should project owners be able to require that all repository writes go through pull requests, even for trusted internal providers?
- How should branch, path, and release scopes be represented in the first SDK contract version?
- Which provider marketplace compliance tiers require encrypted per-assignment workspaces?
- What command, network, and filesystem controls are required before a provider can advertise `full_workspace_no_credentials`?
- Which agent tool secrets can be safely proxied through brokered requests instead of revealed?
- How much secret metadata belongs in central API persistence versus SDK-managed local configuration for self-hosted deployments?

## Target Outcome

The target state is a Treeseed system where:

- project owners can connect repositories and secrets once;
- customer project secrets are stored in GitHub repository or environment secrets for the initial implementation, not decryptably in TreeSeed;
- draft host and project configuration can retain secrets as client-encrypted escrow until a final target exists;
- background systems can perform approved work without interactive passphrases;
- secret-backed operations run as protected, allowlisted GitHub Actions workflows;
- TreeDX can update private repositories in connected mode through short-lived operation credentials;
- third-party capacity providers can execute useful assignments, including full-workspace engineering work when approved, without receiving durable project credentials;
- agents can use simple SDK repository and TreeDX APIs;
- repository access, secret use, and host secret deployment are auditable and revocable;
- direct secret sharing exists only as an explicit elevated exception.
