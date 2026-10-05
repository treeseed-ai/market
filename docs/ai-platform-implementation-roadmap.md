# AI Platform Implementation Roadmap

## Boundary and operating modes

`@treeseed/ai` is an independently installable model data plane. It serves models, diagnoses its host, and supervises model-runtime resources. It does not schedule project work, grant capacity, mutate project repositories, or replace the API operations runner or agent provider manager.

The appliance supports two topology modes through one manifest:

- `joined`: inference and provider runtimes run on this host while durable coordination remains at the canonical Market API, `https://api.treeseed.dev`, unless an operator explicitly selects another registered Market profile or URL.
- `standalone`: the appliance composes a local Market/API/web stack in addition to its model data plane. The local control plane remains a normal Market connection; a separate canonical connection stays configured for global catalog, identity, and team coordination.

A capacity provider may hold multiple approved connections. Each connection has one provider identity, a team membership obtained through a one-time registration key, project grants, allocation policy, and an advertised supply offer. Invite keys are used only during registration and are never persisted in provider manifests.

## Phase 1: installable inference foundation

Implemented foundation:

- SDK-owned appliance and execution-provider module contracts.
- SDK reconciliation of the package-owned vLLM Docker Compose resource.
- Qwen3.5-4B constrained-hardware defaults: one sequence, 16K context, conservative GPU allocation, text-only model loading, Qwen reasoning and tool parsing.
- An authenticated loopback inference gateway exposing `/v1/models`, `/v1/chat/completions`, and `/v1/responses` under the stable `treeseed-qwen3.5-4b` alias.
- A loopback management API for health, topology, hardware, models, and plan/live reconciliation.
- Host, Docker, NVIDIA GPU, virtualization, IOMMU, memory, and disk diagnostics with VM passthrough repair guidance.
- Debian packaging, a systemd supervisor, immutable application files, persistent state/cache paths, and install-time gateway token generation.
- Separate agent and platform-operation provider manifests.
- Agent execution-provider profiles for `codex-sub`, `codex-key`, `codex-treeseed`, `ghcopilot-key`, `ghcopilot-treeseed`, `opencode-sub`, `opencode-key`, and `opencode-treeseed`.
- Provider-instance configuration transport into Codex, Copilot SDK, and OpenCode adapters.
- Market agent chat preferences and Agent Lab scenes defaulting to `codex-treeseed`.

Phase 1 acceptance has two tiers:

1. Hardware-independent acceptance uses a protocol-compatible simulated vLLM upstream to prove authentication, alias mapping, streaming, chat completions, Responses API, provider selection, management, and reconciliation planning.
2. Hardware acceptance uses the packaged service on a supported NVIDIA host and proves model download, container health, tool calling, streaming, repeated inference, provider execution, usage reporting, and an Agent Lab chat/workday through the normal API, assignment, AgentKernel, and TreeDX path.

Hardware acceptance must fail visibly when a VM lacks PCI passthrough, guest NVIDIA drivers, or NVIDIA Container Toolkit. Simulation is not evidence that Qwen loaded on a GPU.

## Execution-provider modules

Built-in profiles are descriptors over package-owned adapters. Subscription profiles consume a host-local auth store; key profiles consume a secret binding; TreeSeed profiles consume the appliance gateway token and endpoint. Secrets enter the provider runtime through `trsd config`, a local protected file, or a service-vault binding and never through a provider manifest.

External execution-provider modules will use signed, digest-pinned `treeseed.execution-provider/v1` manifests. Installation will be an SDK reconciliation operation with refresh, diff, plan, validation, apply, refresh, verification, persistence, removal, and adoption. Modules receive only declared network and credential capabilities. The provider manager loads verified adapters; the API never imports appliance internals.

OpenCode remains a separately supervised tool service behind its adapter. Its TreeSeed profile uses an explicit OpenAI-compatible provider entry pointing to the appliance gateway. Subscription credentials remain in OpenCode's host-local auth store. A later module may own the OpenCode service image without changing assignment contracts.

## Unified development and management process

The end-to-end path is:

1. An operator installs the Debian artifact and runs hardware diagnostics.
2. systemd starts the management and inference gateways; SDK reconciliation converges vLLM from the appliance manifest.
3. The operator initializes agent and platform-operation provider identities and joins one or more teams through `trsd capacity provider-join`. The canonical central Market is the default.
4. A team administrator approves membership and configures project grants, capability allowances, allocation sets, and execution-provider permissions in Admin.
5. Provider managers advertise actual supply, accept API-created leases, dispatch runners, and report usage and settlement.
6. AgentKernel selects the assignment's exact execution-provider profile. TreeSeed profiles call the appliance gateway; subscription and key profiles call their configured upstream.
7. Agents read and write governed project content only through assignment-scoped TreeDX operations. Raw execution traces stay in provider-owned durable storage; curated manifests and approved content enter project history through the existing TreeDX and save workflows.
8. Operator status is assembled from live appliance health plus API-owned provider, assignment, usage, and settlement records. Cached state helps locate resources but never overrides live readiness.

All mutations use plan/live SDK operations. There is no dry-run mode, push-triggered hosted deployment, hidden provider mutation, or appliance-owned Git commit path.

## Phase 2: experience and dataset curation

Planned work:

- Define immutable experience envelopes referencing assignment, mode run, execution provider, model/adapter, prompt/context digests, tool receipts, artifacts, outcomes, reviews, usage, and privacy classification.
- Store raw transcripts and large artifacts outside Git in retention-governed provider storage.
- Add TreeDX-backed teacher and packager activities that select evidence, redact secrets and personal data, deduplicate examples, build dataset manifests, and submit reviewable training candidates.
- Add deterministic train/validation/holdout partitioning and contamination checks.
- Admit curation and packaging as capacity assignments with full usage and audit records.

## Phase 3: Axolotl training and adapter competition

Planned work:

- Add package-owned Axolotl resources through the same SDK reconciliation lifecycle.
- Make training jobs immutable, resumable, budgeted capacity assignments with exact base-model, dataset, recipe, seed, environment, and artifact provenance.
- Run candidate LoRAs against fixed offline evaluations and governed production-shaped Agent Lab tasks.
- Require independent teacher/reviewer evidence and reject candidates that regress safety, tool use, latency, memory, or task success.
- Store weights in an artifact registry; Git receives only small signed manifests and evaluation summaries.

## Phase 4: governed promotion and sleep cycles

Planned work:

- Let the API schedule bounded sleep-cycle workdays when capacity and policy allow; the appliance never wakes itself into project work.
- Compile or select one immutable deployable adapter, stage it behind a separate vLLM instance, and run parity/canary tests.
- Promote by an approved decision and exact artifact digest; support immediate rollback to the previous accepted adapter.
- Track model lineage and performance by agent, activity, project, execution provider, and hardware envelope without allowing one team's private experience to leak into another team's model.

The feedback loop is deliberately gated: experience becomes eligible evidence, evidence becomes a reviewed dataset, a dataset produces competing candidates, evaluations produce a promotion proposal, and only an approved artifact becomes serving state.
