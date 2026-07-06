---

title: Dynamic Host Selection Implementation Record
status: implemented
updated: 2026-06-03
scope:

* treeseed/market
* packages/sdk
* packages/cli
* packages/core
* template catalog
* Market project launch UI

---

# Dynamic Host Selection Implementation Record

## Current Package Ownership

- `@treeseed/admin` owns host credential forms, linked secret-manager UX, unlock/passphrase flows, and admin-facing diagnostics.
- `@treeseed/ui` owns reusable form and status primitives.
- `@treeseed/sdk` and `@treeseed/api` own provider mutation/reconciliation primitives, secure read/write adapters, import/adopt behavior, and backend state.
- root `@treeseed/market` owns Treeseed-specific managed-host offerings, public messaging, and future commerce policy.
- `@treeseed/cli` owns equivalent operator commands.

See [Package Ownership](./package-ownership.md) for the full package map.

## Implementation Status

Dynamic host selection is implemented across the shared SDK, Market launch/API/UI,
project host operations, and CLI-facing contracts. The system now treats template
launch requirements as the source of truth, resolves selected hosts through shared
SDK helpers, writes durable non-secret configuration into generated repositories,
and syncs host-bound secrets through the existing provider environment sync
adapters.

Completed behavior:

* `research` is the default launch/init template.
* Product launch cards are limited to `research` and `engineering`.
* The former `information-hub` starter is folded into `research` until knowledge-pack packaging has distinct deterministic workflow semantics.
* The deprecated legacy basic template artifact has been removed rather than
  hidden.
* The active starter manifests and catalog entries carry normalized
  `launchRequirements`.
* `/app/projects/new` renders requirement-driven host cards from template data
  and submits canonical `hostBindings` plus legacy compatibility fields.
* The launch API validates/normalizes dynamic host bindings before project
  creation, records binding metadata, passes binding plans into provider launch,
  writes durable config, and performs metadata-only secret planning.
* Host-bound secret sync reuses the existing GitHub, Cloudflare, and Railway
  environment sync adapters and returns redacted summaries.
* CLI template/init/config/sync paths use the shared SDK launch requirement and
  host binding helpers; `treeseed init --host` remains local/offline.
* `/app/projects/:projectId/hosts` is requirement-driven and supports queued
  audit, resync, replace, and rotate actions through the Market operations
  runner.
* Project-host operations now have executable runner capabilities:
  `project_hosts:host_binding_audit`, `host_binding_resync`,
  `host_binding_replace`, and `host_binding_rotate`.
* Project-host operation failures from host-bound secret sync persist redacted
  diagnostic summaries before the queued platform operation is marked failed.
* A hidden draft `market-control-plane` catalog template models Market control
  plane host/resource/secret requirements, including Railway/Postgres resources,
  but is not exposed as a standard product launch card.
* Current Market control-plane hosting uses `packages/api` for the Railway API
  and `operationsRunner` services. Use `npx trsd ready <environment>
  --json`, `npx trsd hosting plan/apply/verify --environment <environment>
  --service <api|operationsRunner> --json`, and `npx trsd operations
  smoke --environment <environment> --service operationsRunner --json`
  for current hosted readiness and repair flows.

Current boundaries:

* Standard project launch still rejects resource requirements.
* `market-control-plane` resource planning is available only for non-standard
  SDK/template validation and scaffolding flows; it does not create Railway
  services, databases, or lifecycle resources.
* Rotate redeploys current host-bound secrets from current/unlocked credentials;
  it does not rotate upstream team host credential material.
* No host binding database table has been added; persistence remains metadata
  first on project, hosting, connection, deployment, launch job, and operation
  records.
* Secret values are never written to repository config, metadata, operation
  output, events, logs, or test snapshots.

## Historical Plan

The remainder of this document is retained as historical design context. When it
conflicts with the implementation record above, the implementation record is the
current source of truth. In particular, product launch is limited to the active
starter templates `research` and `engineering`,
`market-control-plane` is hidden/draft, resource lifecycle remains outside
standard project launch, and persistence remains metadata-first with no host
binding database table.

## Purpose

TreeSeed project creation should no longer assume that every template has the same fixed hosting shape. Templates should declare **what host and resource capabilities they need**, while the Market UI and CLI should let the user choose **which team-owned or managed hosts satisfy those requirements**.

The selected hosts must then be written into the generated project repository configuration so that:

1. the Market UI can provide a guided project creation and deployment experience;
2. `treeseed config`, `treeseed sync`, `treeseed release`, and CI/CD can operate from the repository;
3. secrets can be deployed to GitHub, Cloudflare, Railway, or other targets without committing secret values;
4. the Market control plane can keep an auditable record of which host records were selected at launch;
5. template producers can publish deployable templates without knowing the end user's eventual GitHub, Cloudflare, Railway, SMTP, or other provider accounts.

Capacity provider deployment remains a separate Capacity workflow. This plan only aligns project and template launch with dynamic host selection. A capacity-provider template may eventually use the same launch requirement contract, but normal project creation should not pull team capacity-provider lifecycle configuration into hosted project launch.

---

## Current Reality

TreeSeed already has most of the required pieces, but they are not connected through a general host requirement contract.

The current app has an operational host inventory with host categories such as repository, web, email, capacity-provider, and AI. Repository hosts are used for project creation, web hosts for project deployment, email hosts for notifications, capacity-provider hosts for capacity provider deployment, and AI hosts for agent/content workflows.

The project creation page already starts from the project and then asks the user to choose hosts. It also loads team defaults, managed hosts, custom hosts, and repository hosts into the launch form.

The starter template already declares managed files such as `treeseed.site.yaml`, `src/env.yaml`, and runtime scaffolding as managed surfaces. The generated starter config currently includes concrete Cloudflare-oriented defaults and a Railway API service, but it does not yet describe template-level host requirements.

The deployment/environment registry already has the right target concepts: values can target local runtime, local Cloudflare, GitHub secrets, GitHub variables, Cloudflare secrets, Cloudflare variables, Railway secrets, Railway variables, and config files.

The project launch code already writes managed launch defaults back into `treeseed.site.yaml`, including project identity, hosting/runtime mode, Cloudflare pages/R2/queue defaults, surfaces, and services. The next step is to generalize this from a fixed managed-project default writer into a template-aware host binding writer.

---

## Product Goal

A template producer should be able to publish a template like this:

```yaml
launchRequirements:
  hosts:
    - key: sourceRepository
      type: repository
      required: true
      compatibleProviders: [github]
      purpose: Create and push the project repository.

    - key: publicWeb
      type: web
      required: true
      compatibleProviders: [cloudflare]
      purpose: Deploy public web, preview, worker, R2, and optional DNS resources.

    - key: transactionalEmail
      type: email
      required: false
      compatibleProviders: [smtp]
      purpose: Send form and account email.

  resources:
    - key: projectApi
      type: service
      required: false
      compatibleProviders: [railway]
      purpose: Deploy the project API service when the template includes an API.

  secrets:
    - key: formTokenSecret
      env: TREESEED_FORM_TOKEN_SECRET
      required: true
      targets: [github-secret, cloudflare-secret]
```

The template should **not** specify the actual GitHub owner, Cloudflare account, Railway workspace, SMTP server, or AI provider credential. During project creation, the Market UI resolves the template's required slots to concrete team host records or managed host offerings. The generated project repository then receives the resolved, portable deployment configuration.

---

## Core Design Principle

Separate three concerns:

```text
Template launch requirements
  = what capabilities the project needs

Market host records
  = reusable team or managed provider accounts and credential sessions

Project repository configuration
  = the portable resolved deployment contract used by CLI and CI/CD
```

This split prevents templates from baking in provider accounts while still ensuring that the generated project is deployable outside the Market UI.

---

## Target User Flow

```text
User selects a template
  -> Market loads template launchRequirements
  -> Market resolves compatible team defaults and managed hosts
  -> Project create form renders one card per required host/resource slot
  -> User selects existing hosts or creates hosts inline
  -> User confirms project launch
  -> API validates host selections against template requirements
  -> Market creates project and records selected host bindings
  -> Template is scaffolded
  -> Host binding writer updates treeseed.site.yaml and src/env.yaml
  -> Secret deployment planner maps selected host credentials to target systems
  -> GitHub/Cloudflare/Railway secrets and variables are synced
  -> CI/CD and CLI can deploy from repository config
```

---

## Data Model

### Template Launch Requirements

Add a versioned requirement contract to `template.config.json` and remote template catalog entries.

```ts
export type TemplateLaunchRequirement =
  | TemplateHostRequirement
  | TemplateResourceRequirement
  | TemplateSecretRequirement;

export interface TemplateHostRequirement {
  kind: 'host';
  key: string;
  type: 'repository' | 'web' | 'email' | 'ai';
  required: boolean;
  compatibleProviders?: string[];
  displayName: string;
  purpose: string;
  defaultSelection?: 'team-default' | 'managed' | 'none';
  configWrites: TemplateConfigWrite[];
  environmentWrites?: TemplateEnvironmentWrite[];
}

export interface TemplateResourceRequirement {
  kind: 'resource';
  key: string;
  type: 'service' | 'database' | 'object-storage' | 'queue' | 'dns-zone';
  required: boolean;
  compatibleProviders?: string[];
  displayName: string;
  purpose: string;
  configWrites: TemplateConfigWrite[];
  environmentWrites?: TemplateEnvironmentWrite[];
}

export interface TemplateSecretRequirement {
  kind: 'secret';
  key: string;
  env: string;
  required: boolean;
  sensitivity: 'secret' | 'plain' | 'derived';
  targets: Array<
    | 'github-secret'
    | 'github-variable'
    | 'cloudflare-secret'
    | 'cloudflare-var'
    | 'railway-secret'
    | 'railway-var'
    | 'config-file'
    | 'local-runtime'
  >;
  source: 'generated' | 'selected-host' | 'user-input' | 'derived';
}
```

### Host Binding

A host binding is the resolved assignment of a template requirement to a concrete Market host or managed provider option.

```ts
export interface ProjectLaunchHostBinding {
  requirementKey: string;
  requirementKind: 'host' | 'resource' | 'secret';
  type: string;
  provider: string;
  hostId?: string;
  managedHostKey?: string;
  displayName: string;
  environmentScopes: Array<'local' | 'staging' | 'prod'>;
  configValues: Record<string, unknown>;
  environmentValues: Record<string, string>;
  secretRefs: Record<string, string>;
  provenance: {
    selectedBy: 'user' | 'team-default' | 'managed-default' | 'template-default';
    selectedAt: string;
  };
}
```

### Project Configuration Output

The generated project repository should store **portable values and derived deployment topology**, not raw Market-only records or secrets.

Recommended `treeseed.site.yaml` additions:

```yaml
hosting:
  kind: hosted_project
  registration: optional
  marketBaseUrl: https://api.treeseed.ai
  teamId: team_123
  projectId: project_123
  hostBindings:
    sourceRepository:
      type: repository
      provider: github
      owner: acme
      repository: acme-docs
      defaultBranch: main
    publicWeb:
      type: web
      provider: cloudflare
      accountId: account_123
      zoneName: example.com
      productionDomain: docs.example.com
      stagingDomain: docs-staging.example.com
    transactionalEmail:
      type: email
      provider: smtp
      enabled: true

surfaces:
  web:
    enabled: true
    provider: cloudflare
    publicBaseUrl: https://docs.example.com
    environments:
      staging:
        domain: docs-staging.example.com
      prod:
        domain: docs.example.com

services:
  api:
    enabled: true
    provider: railway
    railway:
      serviceName: acme-docs-api
```

Recommended `src/env.yaml` additions:

```yaml
entries:
  TREESEED_SMTP_HOST:
    sourceRequirement: transactionalEmail
    targets: [github-variable, railway-var, cloudflare-var]
    scopes: [staging, prod]
  TREESEED_SMTP_PASSWORD:
    sourceRequirement: transactionalEmail
    sensitivity: secret
    targets: [github-secret, railway-secret]
    scopes: [staging, prod]
```

Optional Market-only metadata may remain in the control-plane database:

```json
{
  "hostBindings": {
    "sourceRepository": {
      "hostId": "host_github_123",
      "requirementKey": "sourceRepository"
    },
    "publicWeb": {
      "hostId": "host_cloudflare_456",
      "requirementKey": "publicWeb"
    }
  }
}
```

The repository may include stable host binding keys, but it should not require Treeseed database IDs to deploy.

---

## Configuration Write Contract

Add a normalized write contract so templates can define where host selections land.

```ts
export interface TemplateConfigWrite {
  target: 'treeseed.site.yaml' | 'src/env.yaml' | 'src/manifest.yaml' | 'package.json';
  path: string;
  valueFrom: string;
  writeWhen?: 'always' | 'host-selected' | 'feature-enabled';
  mergeStrategy?: 'replace' | 'deep-merge' | 'append-unique';
}
```

Example:

```yaml
launchRequirements:
  hosts:
    - key: publicWeb
      kind: host
      type: web
      compatibleProviders: [cloudflare]
      required: true
      configWrites:
        - target: treeseed.site.yaml
          path: cloudflare.accountId
          valueFrom: selectedHost.cloudflare.accountId
        - target: treeseed.site.yaml
          path: surfaces.web.provider
          valueFrom: selectedHost.provider
        - target: treeseed.site.yaml
          path: surfaces.web.environments.prod.domain
          valueFrom: launchInput.domains.productionDomain
        - target: treeseed.site.yaml
          path: cloudflare.pages.projectName
          valueFrom: derived.projectSlug
```

---

## Secret Deployment Contract

Host selections should drive a secret deployment plan, but secret values must not be written into the project repository.

```ts
export interface HostSecretDeploymentPlan {
  projectId: string;
  repository: {
    owner: string;
    name: string;
  };
  scopes: Array<'staging' | 'prod'>;
  items: Array<{
    env: string;
    sensitivity: 'secret' | 'plain';
    sourceRequirement: string;
    sourceHostId?: string;
    sourceValueRef: string;
    targets: Array<'github-secret' | 'github-variable' | 'cloudflare-secret' | 'cloudflare-var' | 'railway-secret' | 'railway-var'>;
    scope: 'staging' | 'prod';
  }>;
}
```

The API can execute this immediately during managed launch or queue it as a platform operation. The CLI should be able to recompute the same plan from `treeseed.site.yaml`, `src/env.yaml`, and machine config.

---

## UI Implementation Plan

### 1. Template Selection Loads Requirements

Update `/app/projects/new` so selecting a template loads the template's `launchRequirements`.

The page should render:

* required host slots;
* optional host slots;
* compatible existing team hosts;
* team defaults;
* TreeSeed managed options;
* inline “create host” affordances;
* readiness status per selected host;
* whether each selection writes config, deploys secrets, or both.

### 2. Host Picker Components

Introduce reusable host picker components:

```text
@treeseed/ui/components/astro/app/controls/TemplateHostRequirementPicker.astro
@treeseed/ui/components/astro/app/controls/TemplateResourceRequirementPicker.astro
@treeseed/ui/components/astro/app/controls/TemplateSecretRequirementPanel.astro
@treeseed/ui/components/astro/app/controls/LaunchRequirementSummary.astro
```

Each requirement card should show:

```text
Requirement name
Template purpose
Compatible provider(s)
Default selection
Selected host or managed option
Readiness
Config writes preview
Secret targets preview
```

### 3. Inline Host Creation

Keep `/app/hosts` as operational inventory, but let project creation create hosts inline when a required slot has no matching host.

Inline create should:

1. open the existing host credential form for the required type;
2. create the host through the normal credential/session endpoint;
3. return to the project creation form;
4. auto-select the newly created host for the requirement slot.

### 4. Dynamic Validation

The project launch form should validate:

* every required requirement has a selected host/resource/generated value;
* selected host type matches the requirement type;
* selected provider is compatible;
* selected host is usable for the selected environment scopes;
* required secret values can be resolved or generated;
* the template's config writes are valid and do not target forbidden paths;
* capacity-provider host requirements are rejected for normal project templates unless the flow is explicitly a capacity-provider lifecycle flow.

### 5. Post-Launch Project Hosts Page

Update `/app/projects/:projectId/hosts` to show the resolved host bindings, not just raw host inventory.

Project host bindings should show:

```text
Requirement key
Host type
Provider
Selected host
Config files written
Secret targets synced
Last sync status
Actions: resync secrets, rotate host, replace host, audit config
```

---

## API Implementation Plan

### 1. Extend Launch Payload

Current launch payloads should grow from fixed host mode fields into a general host binding map.

```ts
export interface ProjectLaunchRequest {
  teamId: string;
  templateId: string;
  name: string;
  slug: string;
  coreObjective?: string;
  launchRequirementsVersion?: number;
  hostBindings: Record<string, ProjectLaunchHostBindingInput>;
  domains?: {
    productionDomain?: string;
    stagingDomain?: string;
  };
}
```

Keep compatibility aliases for the old fields during migration:

```text
repositoryHostId -> hostBindings.sourceRepository
cloudflareHostMode / webHostId -> hostBindings.publicWeb
emailHostMode / emailHostId -> hostBindings.transactionalEmail
```

### 2. Resolve Host Bindings Server-Side

Add a server-side resolver:

```text
packages/admin/src/lib/market/launch-requirements.ts
packages/sdk/src/operations/services/template-launch-requirements.ts
```

Responsibilities:

* load template requirements;
* load team host inventory and defaults;
* validate selected host IDs;
* resolve managed host options;
* normalize host binding values;
* produce config write plan;
* produce secret deployment plan;
* produce Market metadata write plan.

### 3. Project Launch Operation

Project launch should execute as a platform operation when repository mutation or secret deployment is required.

```text
POST /v1/teams/:teamId/projects/launch
  -> validate launch requirements
  -> persist project shell and launch job
  -> platform operation scaffolds repository
  -> writes config from host bindings
  -> deploys secrets/variables
  -> records launch events
```

This avoids doing long-running GitHub/Cloudflare/Railway work inside the API request.

### 4. Host Binding Persistence

Persist a normalized binding snapshot in project metadata or a dedicated table.

Option A, metadata first:

```json
project.metadata.hostBindings = {
  "sourceRepository": {
    "type": "repository",
    "provider": "github",
    "hostId": "host_123",
    "selectedBy": "user"
  }
}
```

Option B, future table:

```sql
project_host_bindings (
  id,
  project_id,
  requirement_key,
  requirement_kind,
  host_type,
  provider,
  host_id,
  selected_by,
  config_snapshot_json,
  secret_target_snapshot_json,
  created_at,
  updated_at
)
```

Start with metadata unless the UI needs complex replacement/history behavior immediately.

---

## SDK Implementation Plan

### 1. Template Catalog Contract

Extend the SDK template catalog type with `launchRequirements`.

```ts
export interface SdkTemplateCatalogEntry {
  id: string;
  displayName: string;
  // existing fields...
  launchRequirements?: {
    schemaVersion: 1;
    hosts?: TemplateHostRequirement[];
    resources?: TemplateResourceRequirement[];
    secrets?: TemplateSecretRequirement[];
  };
}
```

Update:

```text
packages/sdk/src/template-catalog.ts
packages/sdk/src/operations/services/template-registry.ts
packages/sdk/src/treeseed/template-catalog/templates/*/template.config.json
```

### 2. Scaffold Host Binding Writer

Create a reusable writer:

```text
packages/sdk/src/operations/services/template-host-bindings.ts
```

Responsibilities:

* apply config writes to `treeseed.site.yaml`;
* apply env entry writes to `src/env.yaml`;
* preserve managed surface boundaries;
* reject writes outside allowed config targets;
* produce a diff summary for launch events and tests.

### 3. Environment Registry Integration

Host binding writes should become first-class context for the environment registry.

The environment registry should understand:

```text
entry.sourceRequirement
entry.sourceHostType
entry.sourceProvider
entry.targets
entry.scopes
entry.sensitivity
```

This lets both Market and CLI compute the same secret/variable plan.

### 4. Backwards Compatibility

Add a compatibility adapter:

```text
fixedProjectLaunchFieldsToHostBindings(input)
```

Map old launch inputs into host binding slots:

```text
repositoryHostId -> sourceRepository
cloudflareHostMode + webHostId -> publicWeb
emailHostMode + emailHostId -> transactionalEmail
```

Remove hardcoding only after project launch tests use the dynamic contract.

---

## CLI Implementation Plan

### 1. `treeseed template show`

Show launch requirements:

```bash
treeseed template show research
```

Output should include:

```text
Required hosts:
  sourceRepository  repository/github
  publicWeb         web/cloudflare
Optional hosts:
  transactionalEmail email/smtp
```

### 2. `treeseed init`

Support host binding input without requiring Market UI:

```bash
treeseed init my-site \
  --template research \
  --host sourceRepository=github:acme \
  --host publicWeb=cloudflare:acme-prod \
  --host transactionalEmail=smtp:postmark
```

For local/offline CLI use, these can resolve against machine config or a host registry file.

### 3. `treeseed config`

Use host-bound `treeseed.site.yaml` and `src/env.yaml` as the source of truth for required values. Host binding metadata should help the config wizard explain where values come from and where they will be synced.

### 4. `treeseed sync`

Managed surface sync must preserve host binding writes, or re-derive them from the selected binding snapshot. Host binding config should not be treated as template drift to overwrite blindly.

### 5. `treeseed release`

Release should continue to read environment targets from the registry and generated config. Dynamic host selection should not introduce a separate release path.

---

## Repository Configuration Rules

### Commit to Repository

Commit these:

```text
treeseed.site.yaml
src/env.yaml
src/manifest.yaml
template-managed scaffold files
non-secret host-derived identifiers
provider kinds
surface/service topology
domains and public URLs
environment variable declarations
```

### Do Not Commit

Do not commit these:

```text
raw provider tokens
SMTP passwords
Railway API tokens
Cloudflare API tokens
GitHub tokens
AI provider keys
Market-only credential session payloads
```

### Optional Generated Metadata

If useful, commit a small non-secret binding summary:

```yaml
# .treeseed/host-bindings.yaml
schemaVersion: 1
bindings:
  sourceRepository:
    type: repository
    provider: github
    configWritten: true
  publicWeb:
    type: web
    provider: cloudflare
    configWritten: true
```

This should be optional. `treeseed.site.yaml` and `src/env.yaml` should remain sufficient for CLI/CI/CD.

---

## Market-Control-Plane Template Shape

A future Market deployable template should use the same mechanism but with richer resource requirements.

```yaml
launchRequirements:
  hosts:
    - key: sourceRepository
      kind: host
      type: repository
      compatibleProviders: [github]
      required: true

    - key: publicWeb
      kind: host
      type: web
      compatibleProviders: [cloudflare]
      required: true

  resources:
    - key: apiDatabase
      kind: resource
      type: database
      compatibleProviders: [railway-postgres]
      required: true
      configWrites:
        - target: treeseed.site.yaml
          path: services.apiDatabase.provider
          valueFrom: literal.railway
        - target: treeseed.site.yaml
          path: services.apiDatabase.railway.resourceType
          valueFrom: literal.postgres

    - key: api
      kind: resource
      type: service
      compatibleProviders: [railway]
      required: true
      configWrites:
        - target: treeseed.site.yaml
          path: services.api.provider
          valueFrom: literal.railway

    - key: operationsRunner
      kind: resource
      type: service
      compatibleProviders: [railway]
      required: true
      configWrites:
        - target: treeseed.site.yaml
          path: services.operationsRunner.provider
          valueFrom: literal.railway
```

This still does not name the user's actual Railway workspace. It only declares the resource roles the UI must resolve and write into the project configuration.

---

## Implementation Phases

### Phase 1: Contract and Compatibility Layer

Deliverables:

* Add `launchRequirements` schema to template config and catalog types.
* Add `TemplateHostRequirement`, `TemplateResourceRequirement`, and `TemplateSecretRequirement`.
* Add compatibility adapter from old fixed launch fields.
* Add validation that rejects unknown requirement types and unsafe config writes.

Acceptance:

* Deprecated legacy basic launches are rejected.
* Templates can declare host requirements without changing UI yet.
* Tests prove old launch payloads normalize to host bindings.

### Phase 2: Host Binding Resolver

Deliverables:

* Add server-side host binding resolver.
* Resolve team defaults and managed options.
* Validate selected hosts against requirements.
* Produce config write and secret deployment plans.
* Persist binding snapshot in project metadata.

Acceptance:

* API can receive dynamic `hostBindings`.
* Missing required host returns a clear validation error.
* Incompatible provider/type returns a clear validation error.
* Capacity-provider host slots are not accepted in standard project launch.

### Phase 3: Config Writer

Deliverables:

* Add SDK config writer for host bindings.
* Write `treeseed.site.yaml` and `src/env.yaml`.
* Generate diff summary.
* Preserve existing managed project defaults as a compatibility case.

Acceptance:

* Generated project repository contains selected host-derived config.
* `src/env.yaml` receives environment entries required by the selected hosts.
* No secret values are written to the repo.
* Existing Cloudflare/Railway starter defaults still pass tests.

### Phase 4: Project Create UI

Deliverables:

* Update `/app/projects/new` to render requirements dynamically.
* Add reusable requirement picker components.
* Add inline host creation and return-to-selection flow.
* Add config/secret preview before launch.

Acceptance:

* User can select hosts in the create form.
* User can create a missing host inline.
* The submitted payload uses `hostBindings`.
* Team defaults are preselected but editable.

### Phase 5: Secret Deployment and Platform Operations

Deliverables:

* Convert launch-time secret deployment into a platform operation where necessary.
* Use host bindings plus environment registry to sync GitHub, Cloudflare, and Railway targets.
* Add launch timeline/status for config write and secret sync.

Acceptance:

* GitHub environment variables/secrets are synced from the resolved project config.
* Cloudflare and Railway targets receive only the relevant values.
* Failed secret sync is visible and retryable.
* Project launch does not block indefinitely inside API request handlers.

### Phase 6: CLI Alignment

Deliverables:

* Show launch requirements in `treeseed template show`.
* Support host binding input in `treeseed init` or a follow-on config command.
* Teach `treeseed config` to explain host-derived values.
* Ensure `treeseed sync` preserves host-bound config.
* Ensure `treeseed release` works from generated config without Market UI.

Acceptance:

* A project created in the Market UI can deploy through CLI/CI.
* A project created from CLI can express the same host bindings.
* Config validation messages point to requirement keys and host providers.

### Phase 7: Project Hosts and Replacement Flow

Deliverables:

* Update `/app/projects/:projectId/hosts` to show requirement bindings.
* Add actions to resync, replace, rotate, and audit.
* Add host replacement operation that updates repo config and redeploys secrets.

Acceptance:

* A user can inspect which host satisfies each template requirement.
* Replacing a web/email/repository host updates the project configuration through a governed operation.
* Audit shows both Market host ID and repository config change.

### Phase 8: Market-Control-Plane Template

Deliverables:

* Add a first draft of a Market-control-plane template requirements file.
* Model `apiDatabase`, `api`, and `operationsRunner` as resource requirements.
* Write `services.apiDatabase`, `services.api`, and `services.operationsRunner` into `treeseed.site.yaml`.
* Ensure `TREESEED_DATABASE_URL` and platform runner secrets are represented as environment entries, not committed secrets.

Acceptance:

* The Market itself can be represented as a template with dynamic host/resource selection.
* The selected Railway/Postgres resources are written into project configuration.
* The API and operations runner services receive the database URL through secret/variable sync.
* The template does not rely on hardcoded user-specific Railway or Cloudflare hosts.

---

## Testing Plan

### Unit Tests

Add or update tests for:

```text
template launchRequirements schema validation
host binding normalization
old launch payload compatibility
host binding resolver
config write path safety
src/env.yaml entry generation
secret deployment plan generation
capacity-provider host exclusion from project launch
```

### API Tests

Add tests for:

```text
launch rejects missing required host binding
launch rejects incompatible host type
launch accepts team default host selections
launch records project host bindings
launch writes selected host config into scaffolded repo
launch creates secret sync operation
```

### UI Tests

Add tests for:

```text
project create form renders requirement cards from template
default hosts are preselected
inline host creation returns to project create
config write preview renders without secrets
submitted payload uses hostBindings
```

### CLI Tests

Add tests for:

```text
treeseed template show includes launch requirements
treeseed init accepts host binding flags
treeseed config reports host-derived values
treeseed sync preserves host-bound config
treeseed release reads config produced by Market UI launch
```

### E2E Scenario

```text
1. Create repository, web, and email hosts.
2. Mark repository and web as team defaults.
3. Launch research.
4. Confirm hostBindings stored on project metadata.
5. Confirm generated treeseed.site.yaml includes selected repository/web/email-derived values.
6. Confirm src/env.yaml includes generated environment entries.
7. Confirm secrets/variables are planned or synced to GitHub/Cloudflare/Railway.
8. Run CLI config validation against the generated repo.
9. Run deploy plan from the generated repo.
```

---

## Migration Strategy

1. Keep old launch fields working through a compatibility adapter.
2. Remove the deprecated legacy basic template artifact.
3. Convert API tests to assert dynamic `hostBindings`.
4. Convert UI to submit dynamic bindings.
5. Remove hardcoded project-create assumptions after starter and Market-control-plane templates use the new contract.
6. Keep capacity-provider host lifecycle separate under Capacity.

---

## Open Questions

1. Should host binding snapshots live only in project metadata for v1, or should they get a first-class `project_host_bindings` table immediately?
2. Should the generated repository include `.treeseed/host-bindings.yaml`, or should `treeseed.site.yaml` and `src/env.yaml` be the only durable config surfaces?
3. Should `treeseed init --host` resolve against local machine config only, or should it optionally authenticate against a Market host inventory?
4. How much of the Market-control-plane template should be supported in the first dynamic-host release after the deprecated template removal?
5. Should host replacement create a PR against the project repository by default, or can managed projects allow direct controlled config mutation?

---

## First PR Recommendation

Build the smallest integrated slice:

1. Add `launchRequirements` to the starter template config.
2. Add SDK types and validation.
3. Add compatibility normalization from fixed launch fields to host bindings.
4. Add server-side host binding resolver for `sourceRepository`, `publicWeb`, and `transactionalEmail`.
5. Add a config write planner that can explain the intended `treeseed.site.yaml` and `src/env.yaml` writes without mutating yet.
6. Add API tests proving current launch payloads and new dynamic host binding payloads produce the same managed starter launch plan.

This gives TreeSeed a typed contract before touching the create form, while preserving the current launch path.
