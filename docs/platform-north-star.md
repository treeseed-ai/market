# TreeSeed Platform in a Box

## A North-Star Architecture for Governed, Continuously Learning, Private AI Systems

**Status:** Architectural and philosophical north star  
**Updated:** 2026-08-04  
**Primary deployment targets:** Affordable unified-memory AI computers, including NVIDIA DGX Spark and connected dual-Spark systems  
**Reference model family:** Qwen3.5-27B and future compatible open-weight models  
**Bootstrap model:** Qwen3.5-4B for machines with approximately 16 GB of usable accelerator memory
**Inference system:** vLLM  
**Training system:** Axolotl, PyTorch, Transformers, PEFT, TRL, and related post-training libraries  
**Control plane:** TreeSeed governance, knowledge, capacity, and agent-management platform  

---

## 1. Vision

TreeSeed Platform in a Box is a compact, privately operated AI institution.

It combines:

- Local AI computation.
- Persistent project knowledge.
- Continuously improving specialized models.
- Governed autonomous agents.
- Verifiable work execution.
- Human and machine decision-making.
- Modular capacity that can expand from one computer to a connected cluster.

The objective is not merely to run a language model locally. The objective is to create an evolving system in which:

1. Projects accumulate structured knowledge.
2. Agents perform useful work within explicit roles and permissions.
3. Their work produces evidence, outcomes, and experience.
4. Specialized teacher agents convert that experience into better training material.
5. Project, role, capability, and policy adapters are retrained, evaluated, merged, and promoted.
6. Improved agents return to service with stronger project awareness and more effective operating behavior.
7. Long-running agent sessions preserve continuity without indefinitely expanding the active context window.

The system alternates between two computational states:

- **Awake:** models serve agents, users, tools, and project workloads.
- **Dreaming:** accumulated knowledge and experience are consolidated into improved adapters, datasets, summaries, and evaluations.

On a single AI computer, these states are usually time-multiplexed. On a dual-node system, one node can remain awake while the other remains dedicated to dream workloads, evaluation, and adapter production.

### 1.1 Package and process boundary

`@treeseed/ai` is the independently installable appliance boundary for vLLM, future Axolotl training, adapter lifecycle, hardware diagnostics, and machine supervision. The first runtime foundation now supplies a Debian/systemd launcher, an SDK-reconciled Docker Compose vLLM service, an authenticated loopback OpenAI-compatible gateway, and a management/status API. It can operate beside the complete local stack or on a separate GPU host while maintaining one or more capacity-provider connections to the canonical Market control plane. Training, experience curation, adapter competition, and LoRA promotion remain planned and must enter through governed capacity and TreeDX/artifact contracts.

The appliance is a model data plane, not a second scheduler. `@treeseed/api` continues to own workdays, deterministic assignment, leases, usage, and settlement; `@treeseed/agent` owns provider managers, runners, AgentKernel, and execution-provider adapters. The initial provider catalog exposes subscription, key, and TreeSeed-model profiles for Codex, GitHub Copilot, and OpenCode. TreeSeed-model profiles call the authenticated appliance gateway using the stable `treeseed-qwen3.5-4b` alias; raw vLLM stays loopback-only.

The phased implementation and acceptance contract is maintained in [AI Platform Implementation Roadmap](./ai-platform-implementation-roadmap.md).

TreeSeed API remains the durable governance and control-plane scheduler. `@treeseed/agent` remains the capacity-provider manager, runner, and AgentKernel owner. Those systems integrate with the appliance through portable SDK contracts and authenticated HTTP/execution-provider protocols, never imports of appliance internals. The appliance accepts only assignment-scoped work and does not directly mutate project repositories: TreeDX remains the governed knowledge path, while raw experience stays in appliance/provider storage until teachers and packagers produce curated, provenance-bearing artifacts.

The first constrained-hardware profile targets Qwen3.5-4B and roughly 16 GB of usable accelerator memory. Installation diagnostics must distinguish bare-metal access from virtualized hosts and warn when QEMU/KVM or another hypervisor has not exposed the accelerator, IOMMU, drivers, memory, and storage required by the selected profile. Larger models and multi-node layouts remain optional capacity expansions rather than bootstrap requirements.

### 1.2 Application and knowledge separation

The target architecture makes Market, Admin, and the AI appliance separable applications. Market will own ecommerce and the central public market. Admin now has a freestanding build and will connect either to the canonical Market API or to an independently deployed open Admin API. The planned Market API is a private HTTP superset of Admin API; compatibility is a protocol contract rather than a source-code inheritance relationship.

Every project separates its software workbench from its knowledge repository. The paired `{repository}-content` repository stores content history and assets, TreeDX is the governed operational path, and R2 is the runtime publication plane. Software builds never clone content repositories. Local development consumes staging R2 plus an immutable feature preview overlay, so missing remote content is reported as platform drift rather than hidden by a filesystem fallback.

The TreeSeed seed declares both repository identities and both capacity-provider principals. Platform operations and agent work remain different authorities and credential domains even when one local supervisor launches them together.

---

## 2. Core Thesis

A general-purpose model should not be required to reconstruct the complete context of a project during every request.

Instead, project knowledge and operational experience should be compiled into complementary forms:

- Structured source-of-truth knowledge.
- Searchable repository and document indexes.
- Immutable event and execution histories.
- Typed continuation-state capsules.
- Project-specific QLoRA adapters.
- Role- and capability-specific QLoRA adapters.
- Training and validation packages.
- Governance records and decisions.
- Executable guarantees and evaluations.

The resulting model does not replace the repository, documentation, event history, or governance record. It gains a persistent mental model of them.

The target relationship is:

```text
Parametric memory
    provides broad understanding, conventions, and learned behavior

Structured TreeSeed knowledge
    provides persistent concepts, decisions, objectives, and provenance

Typed state capsules
    preserve the active operational state of long-running work

Targeted retrieval
    provides exact current evidence and rehydrates older context

Tools
    provide action and observation

Guarantees
    provide objective verification

Governance
    provides authority, priority, and accountability
```

This architecture allows smaller models to operate with less repetitive context while retaining access to exact evidence whenever precision matters.

---

## 3. Philosophical Principles

### 3.1 AI should operate within institutions, not isolated chat sessions

A chat session is temporary. A project is persistent.

TreeSeed agents should operate within:

- Defined objectives.
- Approved decisions.
- Project histories.
- Explicit roles.
- Permission boundaries.
- Capacity allocations.
- Work directives.
- Verifiable completion conditions.
- Durable execution state.

The primary unit of AI work is not the conversation. It is governed project activity.

### 3.2 Knowledge should have multiple representations

No single representation is sufficient.

A project should exist simultaneously as:

- Human-readable documentation.
- Executable code.
- Structured entities and relationships.
- Searchable source material.
- Model training data.
- Parametric model memory.
- Typed operational state.
- Testable guarantees.
- Historical decisions and events.

Each representation serves a different purpose.

### 3.3 Models are compressed interpretations, not authoritative databases

A project adapter may understand the architecture and accurately identify where behavior resides, but it should not be trusted to reproduce exact current code or configuration values from memory.

The repository remains authoritative for code.  
The governance record remains authoritative for decisions.  
The knowledge store remains authoritative for structured project facts.  
The event store remains authoritative for what happened.  
The adapter provides learned comprehension and operating competence.

### 3.4 Experience should be curated, not merely accumulated

An agent trace is not automatically good training data.

It may contain:

- Incorrect assumptions.
- Inefficient tool usage.
- Accidental successes.
- Outdated project facts.
- Unauthorized actions.
- Misleading reasoning.
- Unverified conclusions.
- Context-management failures.

Experience becomes knowledge only after evidence-based review, correction, classification, and validation.

### 3.5 Continuous learning must remain reversible

Every model, adapter, dataset, merge, summary policy, and promotion must be versioned.

A continuously learning system without immutable lineage and rollback is an uncontrolled drifting system.

### 3.6 Governance precedes autonomy

Agents may propose, analyze, estimate, implement, and verify work. They should not silently acquire authority.

TreeSeed must determine:

- Which objectives are active.
- Which decisions are approved.
- Which agents may act.
- Which tools they may use.
- Which projects receive capacity.
- Which model updates enter production.
- Which context summaries are trusted.
- Which risks require human review.

### 3.7 Locality is an architectural capability

Private local operation provides more than reduced API cost.

It enables:

- Persistent private model state.
- Rapid adapter replacement.
- Continuous background learning.
- Offline operation.
- Low-latency tool loops.
- Sensitive project processing.
- User-controlled retention and deletion.
- Predictable capacity allocation.
- Local control over long-running agent histories.

### 3.8 Context is a governed resource

Long context is useful but not free.

Every additional token consumes:

- Prefill time.
- KV-cache memory.
- Scheduler capacity.
- Attention or recurrent-state compute.
- Opportunity cost for other agents.

TreeSeed should treat context as allocated capacity, not as an unbounded transcript buffer.

### 3.9 Compression must remain reversible

Summaries are interpretations. They can omit or distort information.

Every compressed state should retain pointers to the exact events, files, tool outputs, and decisions from which it was derived.

---

## 4. System Overview

```text
┌───────────────────────────────────────────────────────────────┐
│                         TreeSeed UI                           │
│ Governance │ Portfolios │ Agents │ Knowledge │ Training       │
│ Context │ Capacity │ Evaluations │ Artifact Registry          │
└──────────────────────────────┬────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────┐
│                    TreeSeed Control Plane                     │
│ Objectives │ Decisions │ Proposals │ Work Directives          │
│ Capacity │ Scheduling │ Permissions │ Guarantees               │
│ Adapter Registry │ Dataset Registry │ Context Registry         │
│ Model Governance │ Event Log │ Artifact Manifests              │
└──────────────┬─────────────────────────────┬───────────────────┘
               │                             │
        Awake workloads                Dream workloads
               │                             │
┌──────────────▼────────────┐  ┌─────────────▼──────────────────┐
│       vLLM Inference      │  │         Axolotl Training       │
│ Quantized base model      │  │ QLoRA │ SFT │ DPO │ GRPO       │
│ Compiled LoRA adapters    │  │ Enhanced pretraining │ Replay   │
│ KV-cache scheduling       │  │ Candidate adapter output       │
│ OpenAI-compatible APIs    │  └─────────────┬──────────────────┘
└──────────────┬────────────┘                │
               │                    ┌────────▼───────────────────┐
               │                    │ Adapter Compiler           │
               │                    │ Validate │ Merge │ SVD      │
               │                    │ TIES │ Polish │ Package     │
               │                    └────────┬───────────────────┘
               │                             │
┌──────────────▼─────────────────────────────▼───────────────────┐
│                       Agent Runtime                            │
│ Planner │ Researcher │ Architect │ Engineer │ Reviewer         │
│ Tool execution │ Context construction │ Project isolation      │
│ State capsules │ Retrieval │ Session continuation              │
└──────────────────────────────┬─────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────┐
│                 Projects, Events, and Evidence                 │
│ Git │ Documents │ Tests │ Logs │ Metrics │ Decisions           │
│ Event history │ Knowledge graph │ Retrieval indexes            │
│ Artifact storage │ State capsules │ Evaluation results          │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Hardware Foundation

### 5.1 Unified-memory AI computers

The reference appliance is an affordable AI computer with:

- A capable integrated GPU.
- A large unified CPU/GPU memory pool.
- Fast local NVMe storage.
- High-speed networking.
- A Linux operating environment.
- Sufficient memory to serve and fine-tune a useful open-weight model.

The NVIDIA DGX Spark provides 128 GB of unified memory, an Arm-based CPU, a Blackwell GPU, local NVMe storage, Ethernet, and ConnectX networking.

Unified memory is valuable because it allows a compact system to accommodate models and training workloads that would exceed the dedicated VRAM of ordinary consumer GPUs.

It does not eliminate physical limits. The following consume the same memory pool:

- Model weights.
- KV caches.
- Training activations.
- Optimizer state.
- CPU services.
- Filesystem cache.
- Container overhead.
- Data preprocessing.
- Operating-system memory.

TreeSeed must schedule memory as a governed resource rather than treating all reported memory as freely available GPU capacity.

### 5.2 Hardware should be abstracted as capacity

TreeSeed should not encode assumptions about one specific appliance.

Every participating machine should register a capacity provider:

```yaml
provider:
  id: spark-01
  type: unified-memory-ai-node
  architecture: arm64
  operating_system: linux
  memory:
    total_gb: 128
    reservable_gb: 104
    unified: true
  accelerators:
    - vendor: nvidia
      architecture: blackwell
      count: 1
  storage:
    model_cache_gb: 1000
    adapter_store_gb: 250
    dataset_store_gb: 1000
  network:
    ethernet_gbps: 10
    fabric: connectx-7
  capabilities:
    - inference
    - qlora-training
    - adapter-compilation
    - evaluation
    - teacher-inference
  supported_models:
    - qwen3.5-27b
  supported_precisions:
    inference:
      - nvfp4
      - fp8
      - int4
    training:
      - bf16
      - nf4
```

The provider contract should distinguish:

- Total physical memory.
- Reserved operating-system memory.
- Maximum inference allocation.
- Maximum training allocation.
- Current model residency.
- Supported adapter ranks.
- Context limits.
- Expected throughput.
- Supported distributed-training modes.
- Energy or scheduling restrictions.

### 5.3 Memory is governed capacity

TreeSeed should allocate memory through workload reservations:

```text
Inference reservation
Training reservation
Evaluation reservation
Teacher reservation
Adapter-compilation reservation
System reserve
Emergency reserve
```

No component should independently consume all available memory.

A capacity reservation should specify:

- Maximum resident memory.
- Expected duration.
- Preemption policy.
- Priority.
- Project allocation.
- Mode compatibility.
- Required model.
- Required adapters.
- Whether requests may queue.

### 5.4 Connected dual-Spark systems

A connected dual-Spark system should be understood as:

```text
Node A:
128 GB local unified-memory pool

Node B:
128 GB local unified-memory pool

High-speed interconnect:
NCCL / RoCE / ConnectX communication
```

It is not one transparent 256 GB allocator.

Aggregate capacity is available only when a distributed runtime explicitly shards work across the nodes through mechanisms such as:

- FSDP.
- DeepSpeed ZeRO.
- Pipeline parallelism.
- Tensor parallelism.
- Context or sequence parallelism.
- Distributed vLLM.
- Distributed rollout generation.

This distinction determines whether the nodes can remain functionally separated.

If one node remains permanently awake and one permanently dreaming, each workload is constrained to one 128 GB node. Both nodes can be temporarily combined for a burst job, but the dedicated awake/dream split is suspended during that period.

### 5.5 Reference dual-Spark rental topology

A dual-node rental system such as Enverge’s connected DGX Spark offering can be used as a prototype environment when it provides:

- Two DGX Spark nodes.
- High-speed RoCE between nodes.
- NCCL configuration.
- Worker-node SSH access from the head node.
- Multi-node PyTorch and vLLM support.
- Local storage on each node.

The architecture must not assume:

- Shared persistent storage.
- One flat 256 GB memory pool.
- Independent public ingress to both nodes.
- Permanent local disks after instance deletion.
- Stable node identities without explicit provider guarantees.

Rented node storage should be treated as a replaceable artifact cache unless durable persistence is contractually documented.

---

## 6. Linux Operating-System Layer

Linux is the resource and security boundary beneath the AI institution.

### 6.1 Host responsibilities

The host operating system should provide:

- NVIDIA drivers and CUDA runtime.
- Container runtime.
- Encrypted storage.
- User and service isolation.
- Firewalling.
- Network policy.
- Device monitoring.
- Process supervision.
- Time synchronization.
- Filesystem snapshots.
- Backup and restore.
- Audit logging.
- Secure update policy.

### 6.2 Service organization

The preferred initial deployment is containerized services managed through Docker Compose or systemd.

Kubernetes is not required for a single appliance and should not be introduced until cluster complexity justifies it.

Recommended service groups:

```text
control:
  TreeSeed API
  TreeSeed scheduler
  TreeSeed UI
  governance service
  adapter registry
  dataset registry
  context registry
  event queue

awake:
  vLLM
  inference gateway
  agent kernel
  context manager
  embedding service
  reranking service

dream:
  Axolotl trainer
  dataset compiler
  teacher coordinator
  adapter compiler
  evaluation workers
  staging vLLM

storage:
  metadata database
  object storage gateway
  Git repositories
  model cache
  adapter store
  dataset store
  event and metric store
```

### 6.3 Mutually exclusive GPU profiles

On a single 128 GB system, large-model inference and QLoRA training should normally be mutually exclusive.

```bash
docker compose --profile awake up -d
docker compose --profile awake stop vllm

docker compose --profile dream run --rm trainer

docker compose --profile awake up -d vllm
```

The control plane, UI, databases, queues, and governance services remain active during both modes.

### 6.4 Dual-node service profiles

On two nodes, normal operation can remain functionally separated:

```text
Node A — Awake
  vLLM
  inference gateway
  active context manager
  accepted adapters
  agent bridge

Node B — Dream
  teacher inference
  dataset compilation
  Axolotl
  adapter compiler
  evaluation
  staging vLLM
```

The dream node still contains internal phases. Teacher inference, Axolotl training, adapter compilation, and staging vLLM may be mutually exclusive even though the node remains dedicated to the dream lifecycle.

### 6.5 Filesystem layout

```text
/var/lib/treeseed/
├── models/
│   ├── canonical/
│   ├── quantized/
│   └── cache/
├── adapters/
│   ├── source/
│   ├── compiled/
│   ├── candidates/
│   ├── accepted/
│   └── archived/
├── datasets/
│   ├── raw/
│   ├── generated/
│   ├── replay/
│   ├── validation/
│   └── evaluation/
├── context/
│   ├── events/
│   ├── capsules/
│   └── retrieval/
├── projects/
├── evidence/
├── evaluations/
├── manifests/
└── backups/
```

Large artifacts should be content-addressed and immutable. Human-readable aliases such as `stable` or `candidate` should resolve to immutable versions rather than mutable directories.

---

## 7. Durable Control and Artifact Layer

A rented or replaceable compute cluster should not be the authoritative home of TreeSeed state.

### 7.1 Durable control layer

The durable layer should remain available independently of the GPU nodes:

```text
TreeSeed API
Governance database
Project and capacity metadata
Event history
Artifact manifests
Adapter registry
Dataset registry
Context-capsule registry
Durable object storage
```

This layer can run on inexpensive conventional infrastructure because it does not require accelerator memory.

### 7.2 External object storage

Use durable S3-compatible object storage for:

- Canonical models.
- Quantized serving checkpoints.
- Source adapters.
- Compiled adapters.
- Dataset shards.
- Project cognition packages.
- Evaluation reports.
- Training checkpoints.
- Repository snapshots.
- Teacher outputs.
- Context-capsule archives.

Possible implementations include:

- Amazon S3.
- Cloudflare R2.
- Backblaze B2.
- A durable MinIO deployment.
- Another S3-compatible private store.

### 7.3 Content-addressed node caches

Each compute node should maintain a local content-addressed cache:

```text
/cache/
├── models/sha256-...
├── adapters/sha256-...
├── datasets/sha256-...
├── repositories/sha256-...
├── context/sha256-...
└── evaluations/sha256-...
```

A node downloads an artifact only when the required digest is absent.

### 7.4 Artifact protocol

The TreeSeed artifact service should support operations such as:

```text
GET  /v1/manifests/{digest}
HEAD /v1/blobs/{digest}
GET  /v1/blobs/{digest}
PUT  /v1/blobs/{digest}
POST /v1/candidates
POST /v1/evaluations
POST /v1/promotions
GET  /v1/aliases/{name}
```

Blob transfers should support:

- Range requests.
- Resumable downloads.
- Digest validation.
- Signed upload and download authorization.
- Immutable versioning.

### 7.5 Peer synchronization

The external object store remains authoritative, but connected nodes should use the high-speed private network for peer replication when an artifact is already cached locally.

```text
Node A already has base model
    ↓
Node B requests manifest
    ↓
Node B downloads missing blobs directly from Node A
    ↓
Node B validates digests
    ↓
Node B registers local availability
```

The implementation may use:

- HTTP.
- rsync over SSH.
- OCI artifacts.
- An S3-compatible cache proxy.
- A TreeSeed-specific blob service.

### 7.6 Adapter promotion

```text
Dream node trains candidate
    ↓
Dream node uploads immutable artifact
    ↓
TreeSeed records candidate manifest
    ↓
Evaluation and governance approve candidate
    ↓
Awake node downloads candidate to a temporary path
    ↓
Checksums and lineage are validated
    ↓
Atomic rename places it in the local adapter cache
    ↓
vLLM dynamically loads the adapter
    ↓
Canary evaluation runs
    ↓
Stable alias is updated
```

---

## 8. TreeSeed as the Governance and Control Plane

TreeSeed provides the institutional structure surrounding the models.

Its responsibilities include:

- Project portfolio management.
- Objectives and priorities.
- Proposals and decisions.
- Work directives.
- Capacity allocation.
- Agent definitions.
- Tool permissions.
- Workday scheduling.
- Project knowledge.
- Context and session governance.
- Model and adapter governance.
- Training-data governance.
- Evaluation and promotion.
- Auditability.

### 8.1 Governance objects

Core objects should include:

```text
Objective
Question
Note
Decision
Proposal
Work Directive
Estimate
Agent Definition
Capacity Provider
Workday
Training Package
Model Artifact
Adapter Artifact
Merge Recipe
Adapter Weight Profile
Evaluation Suite
Guarantee
Promotion Decision
Event
Context Capsule
Compression Evaluation
Artifact Manifest
```

### 8.2 Decisions govern model changes

A model update should be treated as a governed deployment artifact.

A promotion decision should record:

- Candidate adapter.
- Parent version.
- Base model lineage.
- Dataset versions.
- Teacher versions.
- Merge recipe.
- Source-adapter weights and normalization policy.
- Exact reference rank and deployed compressed rank.
- Evaluation results.
- Regressions.
- Security checks.
- Context-compression checks.
- Approver or automated policy.
- Rollback target.

### 8.3 Two primary interface modes

#### Focused research and governance

This mode minimizes stimulation and interruption.

It emphasizes:

- Objectives.
- Questions.
- Evidence.
- Documents.
- Proposals.
- Decisions.
- Training-data review.
- Model evaluations.
- Context-capsule inspection.
- Long-form analysis.

#### Command center

This mode provides operational awareness.

It emphasizes:

- Active agents.
- Work queues.
- Capacity utilization.
- Model residency.
- Adapter assignments.
- Current tool activity.
- Context pressure.
- Guarantee status.
- Training progress.
- Incidents.
- Required interventions.

### 8.4 Training studio

A dedicated training interface should expose:

- Project snapshot selected for training.
- New source changes.
- Accumulated agent experience.
- Teacher review status.
- Dataset composition.
- Replay proportions.
- Candidate adapter lineage.
- Merge recipe.
- Source-adapter weights, normalization, and sensitivity analysis.
- Evaluation comparisons.
- Promotion and rollback controls.

### 8.5 Context operations interface

A dedicated context interface should expose:

- Current context occupancy.
- Reserved continuation budget.
- Recent verbatim window.
- Active state capsule.
- Older episode summaries.
- Rehydration operations.
- Compression confidence.
- Omission and contradiction warnings.
- Context-related task failures.

---

## 9. Inference Architecture with vLLM

vLLM provides the awake-mode inference engine because it offers:

- An OpenAI-compatible HTTP service.
- Concurrent request scheduling.
- KV-cache management.
- Continuous batching.
- LoRA adapter loading.
- Adapter unloading.
- Prefix caching where supported.
- Streaming responses.
- Distributed inference options.
- Integration with common agent clients.

### 9.1 Serving model

```text
One quantized base model
    +
A managed inventory of deployable LoRA adapters
    +
Per-request adapter selection
```

A request identifies the selected deployable model:

```json
{
  "model": "treeseed/project-alpha-engineer-v17",
  "messages": [
    {
      "role": "user",
      "content": "Evaluate the failed deployment guarantee."
    }
  ],
  "tools": []
}
```

### 9.2 Adapter loading

TreeSeed should place an authenticated adapter-management service in front of vLLM adapter operations.

Inference clients must not be able to arbitrarily load paths or replace production adapters.

### 9.3 Adapter identity

The external adapter name should resolve through TreeSeed:

```text
treeseed/project-alpha-engineer-stable
    ↓
compiled adapter:
project-alpha-engineer-v17
    ↓
artifact digest:
sha256:...
```

vLLM receives only the resolved immutable artifact.

### 9.4 Stable prompt layout

Where prefix caching is supported, prompts should place stable material first:

```text
TreeSeed operating protocol
Role and permission definition
Tool schemas
Project identity
Stable project conventions
Current objective
Current directive
Typed continuation state
Retrieved evidence
Recent tool observations
```

### 9.5 Inference gateway

TreeSeed should not expose vLLM directly as the primary public API.

The inference gateway should enforce:

- Project identity.
- Agent identity.
- Adapter eligibility.
- Context budget.
- Continuation reserve.
- Tool permissions.
- Output limits.
- Request priority.
- Cost and capacity accounting.
- Schema validation.
- Tool-call validation.
- Trace collection.
- Cancellation and timeout policy.

---

## 10. Long-Context Operation

### 10.1 Native context and operational context

A model may support a large native context, but the system should distinguish:

- Native maximum context.
- Configured runtime maximum.
- Soft compaction threshold.
- Hard prompt ceiling.
- Reserved continuation budget.

For a model with a 262,144-token native window, an initial policy might be:

```text
Native model capacity:       262K
Soft context ceiling:        160K–180K
Compaction threshold:        180K–200K
Hard prompt ceiling:         210K–225K
Reserved continuation:        32K–48K
```

A 250K prompt leaves too little room for further reasoning, tool calls, tool outputs, and final responses.

### 10.2 Long context on one Spark

A quantized 27B model with text-only inference may plausibly serve one near-native-length sequence on a 128 GB Spark.

The principal risks are:

- Prefill latency.
- KV-cache allocation.
- Runtime workspace.
- Unified-memory pressure.
- Competition from other services.
- Reduced concurrency.

The default vLLM behavior of claiming a large fraction of memory should not be accepted without measurement. TreeSeed should use explicit resource envelopes and conservative initial settings.

### 10.3 Context is more than user messages

The context limit includes:

- System prompt.
- Role instructions.
- Tool schemas.
- User messages.
- Assistant messages.
- Tool calls.
- Tool outputs.
- Retrieved evidence.
- Current model output.

Large tool outputs can consume more capacity than ordinary conversation.

### 10.4 Distributed long-context inference

Two connected Sparks may temporarily act as one distributed inference provider through:

- Pipeline parallelism.
- Tensor parallelism where suitable.
- Prefill context parallelism.
- Decode context parallelism.
- Distributed KV-cache strategies.

This can improve:

- Model residency.
- KV-cache capacity.
- Long-prompt prefill.
- Support for larger future models.

It requires both nodes. The dream node is unavailable for training while participating in distributed inference.

### 10.5 Elastic rather than absolute node roles

The recommended topology is:

| Operating mode | Awake node | Dream node |
|---|---|---|
| Normal operation | Production inference | Teachers and training |
| Long-context burst | Distributed inference | Distributed inference |
| Large-training burst | Paused or degraded service | Distributed training |
| Evaluation burst | Production inference | Staging inference |
| Recovery | Production or fallback | Rebuild and restore |

The nodes have primary roles, but TreeSeed may temporarily recompose them into a larger capacity provider.

---

## 11. Context Compression and Continuation

Long-running agents should not depend on a raw transcript remaining in the model window indefinitely.

Every agent run should have two representations:

```text
Immutable execution history
    Complete turns, tool calls, results, files, patches, and evidence

Active cognitive context
    A bounded generated view needed for the current decision
```

### 11.1 Immutable event log

Store each item independently:

```text
User directive
Assistant message
Tool call
Tool response
File read
Patch
Test result
Decision
Observation
Failure
Summary
Context-capsule revision
```

Large tool output should be stored as an object instead of copied into every later prompt.

Example:

```json
{
  "tool_result": "test-run-8391",
  "summary": "Three integration tests failed in the deployment lifecycle.",
  "artifact": "artifact://sha256/...",
  "relevant_ranges": ["lines 380-512"]
}
```

### 11.2 Typed continuation-state capsule

At each compaction boundary, generate a typed capsule:

```yaml
objective:
  id: objective-142
  statement: Implement provider retry policy

current_plan:
  completed:
    - Inspected provider interface
    - Identified retry ownership
  active:
    - Update provider policy
  pending:
    - Add regression tests

decisions:
  - Retry policy belongs to ExecutionProviderPolicy
  - Original timeout must remain causal error

constraints:
  - Do not change AgentKernel public API
  - Maximum three attempts

files:
  inspected:
    - src/providers/execution-provider.ts
  modified:
    - src/providers/retry-policy.ts

tests:
  passing:
    - retry-policy.unit
  failing:
    - provider-timeout.integration

unresolved:
  - Whether backoff configuration belongs in team settings

evidence:
  - event://run-1042/turn-19
  - artifact://sha256/...
```

This is safer than a prose summary because omissions and contradictions are easier to detect.

### 11.3 Hierarchical compression

```text
Raw turns
    ↓
Episode summaries
    ↓
Work-directive state capsule
    ↓
Workday summary
    ↓
Project knowledge proposal
```

Each level retains pointers to lower-level evidence.

### 11.4 Recent verbatim window

Do not summarize everything.

Maintain:

- Recent 32K–64K tokens verbatim.
- Current tool observations verbatim.
- Current plan and constraints verbatim.
- Older episodes as structured capsules.
- Exact older evidence on demand.

### 11.5 Example context budget

```text
System, role, and tool schemas       12K
Current objectives and constraints   16K
Structured state capsules            24K
Recent verbatim interaction          64K
Retrieved source and evidence        40K
Safety and continuation reserve       8K
Generation and future turns          48K
                                    ----
Total                                212K
```

This leaves room beneath a 262K native limit.

### 11.6 Rehydration

When a capsule indicates that exact evidence is needed, the agent should retrieve:

- The original event.
- The original tool output.
- The relevant file range.
- The exact decision record.
- The affected test result.

The model should not improvise missing exact details from the summary.

### 11.7 Compression evaluation

The core evaluation should compare:

```text
Agent with full raw history
versus
Agent with compressed history
```

Both versions should be tested for:

- Same next-tool selection.
- Same constraints.
- Same completion result.
- Avoidance of repeated failed work.
- Correct decision attribution.
- Ability to recover exact evidence.

The principal metric is:

> How many tokens can be removed without reducing verified task completion?

---

## 12. Adapter Taxonomy

### 12.1 Core adapter

Contains behavior shared by all TreeSeed agents:

- TreeSeed concepts.
- Tool protocol.
- Governance semantics.
- Evidence requirements.
- Permission awareness.
- Work-directive lifecycle.
- General reasoning discipline.
- Guarantee interpretation.
- Context-management behavior.

The core adapter may periodically be merged into a new canonical TreeSeed base model.

### 12.2 Project adapter

Contains a compressed semantic representation of a project:

- Architecture.
- Packages and responsibilities.
- APIs and schemas.
- Data and control flows.
- Code conventions.
- Testing conventions.
- Stable project terminology.
- Important historical decisions.

A project adapter is not the authoritative repository.

### 12.3 Role adapter

Contains stable operating behavior for a class of agent:

- Planner.
- Researcher.
- Architect.
- Backend engineer.
- Frontend engineer.
- Test engineer.
- Security reviewer.
- Technical editor.

### 12.4 Capability adapter

Contains a bounded reusable competency:

- Tool recovery.
- Repository navigation.
- Security analysis.
- Performance diagnosis.
- Documentation synthesis.
- Test design.
- Proposal estimation.
- Context compression.
- State rehydration.

### 12.5 Policy adapter

Contains governed operating constraints appropriate for parametric learning:

- Escalation rules.
- Evidence standards.
- Approval boundaries.
- Privacy practices.
- Restricted tool behavior.

Hard security controls must remain outside the model.

### 12.6 Agent-instance state

Individual agent memories should not normally become separate adapters.

They belong in:

- Project knowledge.
- Structured observations.
- Work history.
- Event storage.
- State capsules.
- Current plans.
- Decision records.

Adapters encode durable capability and understanding, not ephemeral instance state.

---

## 13. The Adapter Compiler and Merge Layer

vLLM should receive one ordinary deployable LoRA adapter for a request.

The modular training architecture may produce several conceptual layers:

```text
Core
+ Project
+ Role
+ Capability
+ Policy
```

The adapter compiler converts selected layers into one validated deployable adapter. It is not merely a file merger. It is a governed compilation system that:

- Validates adapter lineage.
- Normalizes their native scaling.
- Applies explicit influence weights.
- Produces an exact mathematical reference.
- Compresses the result for efficient serving.
- Repairs interaction problems through polish training.
- Evaluates the final artifact against the unmerged inputs and stable production adapter.

### 13.1 Merge process

```text
Source adapters
    ↓
Lineage validation
    ↓
Scaling and norm analysis
    ↓
Explicit influence weighting
    ↓
Exact weighted composition
    ↓
Compression or conflict-aware merge
    ↓
Post-merge polish training
    ↓
Evaluation and sensitivity analysis
    ↓
PEFT-compatible adapter package
    ↓
Artifact publication
    ↓
vLLM registration
```

### 13.2 Compatibility validation

Adapters may be merged only when they have compatible:

- Base-model lineage.
- Model architecture.
- Tokenizer.
- Target-module dimensions.
- Module naming.
- LoRA variants.
- Vocabulary.
- Chat template.
- Precision expectations.

The compiler must detect parent-child relationships to avoid double-counting.

For example:

```text
engineer-v13 derived from engineer-v12
```

means that `v13` replaces `v12`; the two versions must not be added together.

The registry should explicitly represent:

```text
replacement-of
derived-from
independent-of
composed-from
```

### 13.3 Weighted adapter composition

A LoRA adapter contributes a learned parameter update to a base-model layer:

\[
\Delta W_i^{(l)} = s_i B_i^{(l)}A_i^{(l)}
\]

where:

- \(A_i\) and \(B_i\) are the low-rank adapter matrices.
- \(s_i\) is the adapter's native LoRA scaling.
- \(l\) identifies the target layer or module.

A weighted compiled adapter represents:

\[
\Delta W_{\text{compiled}}^{(l)}
=
\sum_i \lambda_i \Delta W_i^{(l)}
\]

and the effective layer becomes:

\[
W_{\text{effective}}^{(l)}
=
W_{\text{base}}^{(l)}
+
\Delta W_{\text{compiled}}^{(l)}
\]

The coefficient \(\lambda_i\) controls the magnitude of adapter \(i\)'s contribution.

A compilation recipe may therefore express:

```text
TreeSeed core       × 1.00
Project knowledge   × 0.85
Backend role        × 1.10
Tool recovery       × 0.45
Security behavior   × 1.15
```

This permits compile-time balancing of project knowledge, role specialization, reusable capability, and learned policy behavior.

However, adapter weights are **amplitude controls, not semantic authority controls**.

A weight of `2.0` does not mean that:

- The adapter is twice as intelligent.
- Its facts are twice as reliable.
- It receives twice as much inference compute.
- It always overrides an adapter weighted `1.0`.
- Its learned behavior may supersede current evidence or governance.

Once compiled, the source updates participate in one model calculation. Formal authority remains in TreeSeed governance, current evidence, tool permissions, and deterministic controls.

### 13.4 Native scale, normalized scale, and policy weight

Raw merge coefficients are not directly comparable across adapters.

Two adapters assigned weight `1.0` may have very different behavioral effects because they can differ in:

- Rank.
- LoRA alpha.
- Standard LoRA versus rsLoRA scaling.
- Number and type of target modules.
- Parameter-update norms.
- Training duration.
- Dataset composition.
- Learning rate.
- Degree of convergence.

The compiler should distinguish:

1. **Native adapter scale** — the update implied by its rank, alpha, scaling mode, and learned matrices.
2. **Normalization scale** — an optional adjustment that makes adapter magnitudes more comparable.
3. **Policy weight** — the explicit TreeSeed compile-time preference for stronger or weaker influence.

A normalized merge may be represented as:

\[
\Delta W_{\text{compiled}}^{(l)}
=
\sum_i p_i
\frac{\Delta W_i^{(l)}}{n_i^{(l)}}
\]

where:

- \(p_i\) is the policy weight.
- \(n_i^{(l)}\) is a selected normalization quantity for adapter \(i\) at layer \(l\).

Possible normalization policies include:

- No normalization.
- Global Frobenius-norm normalization.
- Per-layer norm normalization.
- Base-weight-relative normalization.
- Percentile clipping of unusually large layer updates.
- Calibration against a fixed behavioral evaluation set.

No normalization policy should be assumed universally correct. The compiler must preserve both the unnormalized and normalized evaluation results.

### 13.5 Global and per-module weights

The first implementation should assign one global weight per adapter:

```yaml
inputs:
  - adapter: core/v12
    weight: 1.00

  - adapter: project-alpha/v34
    weight: 0.85

  - adapter: backend-engineer/v18
    weight: 1.10

  - adapter: tool-recovery/v7
    weight: 0.45
```

A later implementation may support per-module or per-layer weights:

```yaml
inputs:
  - adapter: project-alpha/v34
    default_weight: 0.80
    module_weights:
      attention: 0.70
      mlp: 1.00

  - adapter: tool-recovery/v7
    default_weight: 0.45
    module_weights:
      attention: 0.80
      mlp: 0.35
```

Per-module weighting greatly enlarges the optimization surface and should not be introduced until global weighting, manifest lineage, and evaluation are stable.

### 13.6 Exact weighted concatenation

Weighted concatenation provides the clean reference composition.

For source adapters with ranks \(r_1, r_2, \ldots, r_n\), the exact adapter rank is:

\[
r_{\text{exact}} = \sum_i r_i
\]

The adapter matrices can be constructed so that:

\[
B_*A_*
=
\sum_i \lambda_i s_i B_iA_i
\]

This preserves the weighted sum exactly, without approximation or unintended cross terms.

The disadvantage is additive rank. For example:

```text
Core:         rank 32
Project:      rank 64
Role:         rank 32
Capability:   rank 16
                         ----
Exact result: rank 144
```

The exact adapter is valuable even when it is too large for production. It becomes the behavioral reference against which compressed candidates are compared.

### 13.7 SVD compression

The exact combined low-rank update can be compressed to a selected serving rank:

```text
Exact weighted adapter, rank 144
              ↓
        truncated SVD
              ↓
Compiled serving adapter, rank 32 or 64
```

The compiler should report:

- Retained singular-value energy.
- Per-layer reconstruction error.
- Total adapter size.
- Exact versus compressed task performance.
- Expected vLLM rank allocation.
- Capability-regression results.

The selected rank should be based on verified task performance, not reconstruction error alone.

### 13.8 Conflict-aware merges

Adapters trained independently may encode conflicting parameter directions or incompatible behavioral preferences.

The compiler should support experiments with:

- Weighted linear composition.
- Exact concatenation.
- SVD.
- TIES.
- TIES-SVD.
- DARE variants.
- Magnitude pruning.
- Custom per-layer weights.

Conflict-aware algorithms can trim low-magnitude updates, resolve sign disagreements, or reduce redundant parameter changes before compression.

No merge strategy should be assumed best globally. A method that preserves project recall may weaken tool behavior, while another may preserve role behavior but reduce general reasoning.

### 13.9 Negative weights and subtraction

A negative source weight can subtract an adapter's learned update:

```text
Compiled update
=
project adapter × 1.0
− deprecated-policy adapter × 0.3
```

This may be useful for experimentation, ablation, or suppressing a known learned tendency.

Negative weighting should be treated as high risk because reversing a learned parameter update does not necessarily cleanly reverse its semantic behavior. It requires the same evaluation and governance as any other compiled candidate.

### 13.10 Merge and polish

The recommended production process is:

```text
Mathematical weighted merge
    +
Small balanced interaction corpus
    ↓
Short QLoRA polish run
```

The polish corpus should contain examples exercising interactions among the merged capabilities.

For example, a project-engineer-tool-recovery adapter should be tested and polished on tasks requiring all three:

- Project-specific architecture.
- Engineering behavior.
- Recovery from failed tools.

Polish training should not obscure the mathematical source lineage. The resulting adapter manifest must identify both the merge recipe and the polish dataset.

### 13.11 Weight selection and sensitivity analysis

Adapter weights should be treated as hyperparameters, not hand-authored truths.

The compiler should evaluate a small neighborhood around each proposed recipe:

```text
Project weight:
0.60, 0.80, 1.00, 1.20

Role weight:
0.80, 1.00, 1.20

Capability weight:
0.25, 0.50, 0.75, 1.00
```

The search should proceed incrementally:

1. Establish a one-adapter baseline.
2. Add one independent adapter.
3. Measure its marginal improvement and regressions.
4. Search a narrow weight range.
5. Add the next adapter.
6. Repeat.
7. Perform a final joint sensitivity test.

The evaluation should measure:

- Project recall.
- Architecture comprehension.
- Role task completion.
- Tool-call validity.
- No-tool accuracy.
- Security and permission behavior.
- General reasoning retention.
- Context-management quality.
- Token and tool efficiency.
- Regression rate.

A recipe should be rejected if its success depends on a very narrow, unstable weight value.

### 13.12 Integration with vLLM

The weighting and merging occur before deployment in the TreeSeed adapter compiler.

```text
Core adapter
Project adapter
Role adapter
Capability adapter
Policy weights
        ↓
Weighted merge
        ↓
Compression
        ↓
Polish training
        ↓
One PEFT-compatible adapter
        ↓
Artifact synchronization
        ↓
vLLM
```

The compiler output must be a normal PEFT-compatible adapter directory:

```text
adapter_model.safetensors
adapter_config.json
manifest.json
merge-recipe.yaml
weight-profile.yaml
evaluation-report.json
checksums.txt
```

TreeSeed registers the compiled artifact, synchronizes it to the awake node, and instructs vLLM to load it through the standard LoRA interface.

vLLM does not need to know the individual source adapters, their weights, or the merge method. It sees one immutable deployable adapter.

### 13.13 Compiled-adapter manifest

A compiled artifact should preserve its complete recipe:

```yaml
compiled_adapter:
  name: project-alpha-backend-v24
  base_model: treeseed-qwen35-core-v6

  inputs:
    - adapter: project-alpha/v34
      digest: sha256:...
      native_rank: 64
      native_alpha: 128
      policy_weight: 0.85

    - adapter: backend-engineer/v18
      digest: sha256:...
      native_rank: 32
      native_alpha: 64
      policy_weight: 1.10

    - adapter: tool-recovery/v7
      digest: sha256:...
      native_rank: 16
      native_alpha: 32
      policy_weight: 0.45

    - adapter: security-policy/v9
      digest: sha256:...
      native_rank: 16
      native_alpha: 32
      policy_weight: 1.15

  normalization:
    method: per_layer_frobenius
    clipping_percentile: 99.5

  merge:
    exact_rank: 128
    method: ties_svd
    density: 0.80
    deployed_rank: 64

  polish:
    dataset: project-alpha-backend-polish-v11
    token_budget: 500000

  evaluation:
    suite: project-alpha-backend-eval-v19
    exact_reference: project-alpha-backend-exact-v24
```

### 13.14 Avoiding combination explosion

TreeSeed should use:

- A small number of stable role classes.
- A limited set of approved capability bundles.
- On-demand compilation.
- Usage-based adapter caching.
- Expiration of unused combinations.
- Recompilation only when an input layer or weight profile changes.
- Shared evaluation suites.
- Reusable approved weight profiles.

A practical initial arrangement is:

```text
TreeSeed core behavior baked into canonical base
    +
One weighted project-role compiled adapter
```

Capabilities that can be expressed safely through prompts, tools, or workflow configuration should not automatically become adapter layers.


---

## 14. Training Architecture with Axolotl

Axolotl is the training orchestration layer over PyTorch, Transformers, PEFT, TRL, quantization libraries, and distributed-training systems.

### 14.1 Training responsibilities

Axolotl should perform:

- Enhanced project pretraining.
- Supervised conversation training.
- Continued role training.
- Preference optimization.
- Selective reinforcement learning.
- Replay-balanced continual learning.
- Adapter checkpointing.
- Distributed QLoRA when required.
- Post-merge adapter polishing.

### 14.2 Language-first training

Project and agent adapters should initially target the language backbone while freezing vision components unless a project explicitly requires visual understanding.

This reduces memory use and simplifies vLLM compatibility.

### 14.3 Training stages

#### Stage 1: Enhanced project pretraining

Train on generated source-derived sequences:

- Code and related tests.
- Interfaces and implementations.
- Documentation and corresponding modules.
- Schemas and consumers.
- Call graphs.
- Decisions and resulting implementation.
- Commit-diff neighborhoods.

#### Stage 2: Factual conversational learning

Train the model to answer:

- What exists?
- Where is it implemented?
- Why is it structured this way?
- Which component owns a responsibility?
- How do components interact?
- What is not present?
- What changed between revisions?

#### Stage 3: Experiential conversational learning

Train on verified and corrected agent trajectories:

- Planning.
- Tool selection.
- Tool results.
- Recovery.
- Implementation.
- Testing.
- Completion.
- Escalation.
- Context compaction and rehydration.

#### Stage 4: Preference optimization

Train on chosen and rejected alternatives:

- Verified versus unsupported plans.
- Efficient versus wasteful tool use.
- Correct versus fabricated arguments.
- Authorized versus unauthorized actions.
- Grounded versus speculative conclusions.
- Loss-aware context capsules versus fluent but incomplete summaries.

#### Stage 5: Outcome-based learning

Use objective rewards where a reliable executable environment exists:

- Tests pass.
- Build succeeds.
- Guarantee passes.
- Schema validates.
- Performance improves.
- No unauthorized files change.
- Required evidence is attached.
- Deployment remains healthy.
- Compressed context preserves task completion.

### 14.4 Training context length

The model’s maximum inference context should not be treated as the default QLoRA sequence length.

A practical curriculum may be:

```text
70%: 8K–16K sequences
20%: 32K sequences
 8%: 64K sequences
 2%: 128K sequences when feasible
```

The long examples should teach:

- Recovering an old decision.
- Maintaining a plan across many tool calls.
- Recognizing invalidated assumptions.
- Compressing completed phases.
- Rehydrating older events.
- Continuing from a prior state capsule.
- Preserving unresolved constraints.

Training at 250K is not required to infer at 250K when the base model already supports the context length.

### 14.5 Maximum-context training limits

Inference and training have different memory characteristics.

Routine 262K QLoRA on one 128 GB Spark is unlikely to be practical because training must retain or recompute activations and calculate gradients through the long sequence.

A planning envelope is:

| Training sequence length | Single 128 GB Spark |
|---:|---|
| 8K–16K | Normal target |
| 32K | Realistic with checkpointing |
| 64K | Plausible with tuning |
| 128K | Experimental and slow |
| 262K | Not a normal target |

Two nodes do not automatically solve this. FSDP primarily shards model states. A single extremely long sequence also requires compatible context or sequence parallelism.

For hybrid architectures such as Qwen3.5, model-specific support for distributed long-sequence training must be validated rather than assumed.

### 14.6 Axolotl and vLLM during online learning

For ordinary SFT and DPO:

```text
Axolotl trains adapter
    ↓
Adapter is evaluated
    ↓
Adapter is loaded into vLLM
```

For GRPO and other rollout-based training, a vLLM server may generate trajectories and synchronize LoRA weights.

On a dual-node system:

```text
Awake node:
production vLLM

Dream node:
Axolotl, or temporary rollout vLLM
```

For larger online-learning runs, both nodes may be recomposed:

```text
Node A:
vLLM rollout generation

Node B:
Axolotl trainer
```

This temporarily changes the normal operating allocation.

---

## 15. Project Cognition Packages

The durable asset should not be the adapter alone.

Each project revision should produce a project cognition package:

```text
project-cognition-package/
├── repository-manifest.json
├── source-graph/
├── project-knowledge/
├── pretraining/
├── conversations/
├── preferences/
├── executable-tasks/
├── replay/
├── validation/
├── evaluation/
├── context-policies/
├── adapters/
├── merge-recipes/
└── provenance.json
```

This package allows the project to be:

- Recompiled against a future base model.
- Audited.
- Corrected.
- Partially deleted.
- Retaught by stronger teachers.
- Split into project domains.
- Used to train different agent roles.
- Evaluated consistently across models.
- Migrated to future context-management systems.

The adapter is a compiled deployment artifact.  
The cognition package is the reusable source asset.

---

## 16. Teacher-Agent System

Teacher agents are specialized agents whose product is improved learning material.

They should be first-class TreeSeed agent classes with explicit tools, evidence requirements, and evaluation criteria.

### 16.1 Evidence teacher

Purpose:

- Verify factual claims.
- Associate claims with files, symbols, documents, tests, events, and commits.
- Reject unsupported training records.
- Detect stale statements.

### 16.2 Architecture teacher

Purpose:

- Determine whether a trajectory respects project architecture.
- Identify misplaced responsibilities.
- Detect dependency violations.
- Generate architecture-aware alternatives.

### 16.3 Engineering teacher

Purpose:

- Review technical correctness.
- Evaluate tests.
- Identify performance, reliability, and security issues.
- Generate corrected solutions.

### 16.4 Agent-process teacher

Purpose:

- Evaluate how the agent worked.
- Identify unnecessary tool calls.
- Detect premature conclusions.
- Assess recovery from failures.
- Improve completion criteria.

### 16.5 Pedagogy teacher

Purpose:

- Convert evidence and corrected experience into effective learning records.

Outputs:

- Factual question-and-answer examples.
- Multiple phrasings.
- Corrected conversations.
- Preference pairs.
- Negative examples.
- Failure-recovery records.
- Cross-component reasoning tasks.

### 16.6 Adversarial teacher

Purpose:

- Produce difficult nearby examples.
- Detect overgeneralization.
- Test unsupported confidence.

### 16.7 Security and privacy teacher

Purpose:

- Detect secrets and sensitive data.
- Generate extraction probes.
- Review whether a training record should exist.
- Verify project and tenant boundaries.
- Detect information leakage across adapters.

### 16.8 Evaluation teacher

Purpose:

- Generate held-out tests.
- Maintain benchmark diversity.
- Search for regressions.
- Compare candidate and stable adapters.
- Identify where evaluation has become too easy.

### 16.9 Curator teacher

Purpose:

- Manage long-term dataset health.
- Deduplicate records.
- Retire stale examples.
- Preserve rare critical cases.
- Balance replay categories.
- Detect stylistic homogenization.
- Recommend clean adapter rebuilds.

### 16.10 Context curator

Purpose:

- Determine which material remains relevant to the active task.
- Recommend what stays verbatim, becomes structured state, or moves to retrievable history.

### 16.11 State extractor

Purpose:

- Convert conversation and tool activity into typed continuation state.
- Preserve objectives, decisions, constraints, unresolved work, and evidence pointers.

### 16.12 Compression teacher

Purpose:

- Generate compact representations that preserve future task performance.
- Produce training examples for reliable context reduction.

### 16.13 Omission critic

Purpose:

- Detect constraints, failures, unresolved questions, and evidence lost during compression.

### 16.14 Contradiction critic

Purpose:

- Compare state capsules against raw events and current project state.
- Detect mutually inconsistent summaries.

### 16.15 Rehydration teacher

Purpose:

- Teach the agent when exact older evidence is needed.
- Generate examples of retrieving and reintegrating historical details.

### 16.16 Context-policy evaluator

Purpose:

- Compare full-history and compressed-history execution.
- Quantify how much context can be removed without degrading verified results.

---

## 17. Experience Compilation

Every agent run should produce an immutable raw record:

```text
Directive
Context
Model and adapter version
Prompt
Tool definitions
Tool calls
Tool outputs
Files read
Files changed
Tests run
Guarantees
Reviews
Final output
Outcome
Resource usage
Context-capsule revisions
```

Teacher agents derive additional views without altering the raw record.

### 17.1 Three representations of experience

#### Raw trajectory

What actually occurred.

#### Annotated trajectory

What was correct, incorrect, inefficient, unsupported, unsafe, or lost during context management.

#### Pedagogical trajectory

The best realistic training sequence derived from the event.

### 17.2 Observation, interpretation, and lesson

Teacher outputs should separate:

```text
Observation:
The retry test failed because timeout metadata was lost.

Interpretation:
The implementation retried before preserving the original failure.

Generalized lesson:
Retry systems should retain the first causal failure and test that later
attempts do not obscure it.
```

### 17.3 Teacher collaboration

```text
Raw experience
    ↓
Evidence teacher
    ↓
Architecture or engineering teacher
    ↓
Agent-process teacher
    ↓
Context teachers where relevant
    ↓
Pedagogy teacher
    ↓
Adversarial teacher
    ↓
Final verifier
    ↓
Candidate training set
```

Teachers may disagree. TreeSeed should preserve disagreement and route material for additional review.

---

## 18. Dataset Management Over Time

### 18.1 Dataset classes

TreeSeed should maintain separate datasets for:

- Source-derived pretraining.
- Factual SFT.
- Procedural SFT.
- Successful trajectories.
- Corrected failures.
- Failure recovery.
- Preference pairs.
- Adversarial examples.
- Permission boundaries.
- Context compression.
- State rehydration.
- General capability retention.
- Project retention.
- Role retention.
- Evaluation.
- Final hidden testing.

### 18.2 Immutable dataset versions

Each training run references immutable versions:

```yaml
training_run:
  id: engineer-dream-0042
  base_model: treeseed-qwen35-core-v5
  parent_adapter: engineer-v41
  datasets:
    pretraining: project-alpha-pretrain-v18
    factual_sft: project-alpha-factual-v21
    experience: engineer-experience-v42
    context: engineer-context-v8
    replay: engineer-replay-v12
    preferences: engineer-preferences-v9
  validation: engineer-validation-v14
  hidden_test: engineer-hidden-v7
```

### 18.3 Temporal splits

The evaluation strategy should include:

- Files excluded from training.
- Tasks excluded from training.
- Later commits.
- New issues.
- Changed APIs.
- Unseen combinations of known components.
- Stale-information tests.
- Long-running sessions not represented in training.

### 18.4 Validation-set evolution

Maintain:

- A stable long-term benchmark.
- A rotating current-project benchmark.
- A recent-regression benchmark.
- A hidden adversarial benchmark.
- A temporal-generalization benchmark.
- A context-compression benchmark.

### 18.5 Replay

Replay should be stratified:

```text
Core TreeSeed behavior
Tool protocol
Role capability
Project architecture
Permission boundaries
Failure recovery
Context continuation
General language and reasoning
Rare safety-critical cases
```

### 18.6 Stale knowledge

Records should be classified as:

- Current.
- Superseded.
- Historically useful.
- Invalid.
- Unverifiable.

Superseded facts may become temporal examples.

### 18.7 Dataset promotion

Training records should have promotion states:

```text
raw
generated
teacher-reviewed
evidence-verified
accepted
deprecated
revoked
```

---

## 19. Awake and Dream Lifecycle

### 19.1 Single-node lifecycle

```text
Awake:
vLLM serves accepted models and adapters

Transition:
drain requests
persist state
stop vLLM

Dream:
teachers
dataset compilation
Axolotl
adapter compilation
evaluation

Transition:
stop training
start vLLM
load accepted adapters
resume work
```

### 19.2 Dual-node lifecycle

Normal operation:

```text
Node A:
Always-available production inference

Node B:
Continuous dream pipeline
```

The dream pipeline is sequential:

```text
Teacher inference
    ↓
Dataset construction
    ↓
Axolotl QLoRA
    ↓
Adapter merge and polish
    ↓
Staging vLLM
    ↓
Evaluation
    ↓
Candidate publication
```

### 19.3 Elastic burst lifecycle

When one workload needs both nodes:

```text
TreeSeed proposes temporary capacity reallocation
    ↓
Governance or policy approves
    ↓
Affected workload is drained
    ↓
Both nodes join distributed provider
    ↓
Burst workload runs
    ↓
Nodes restore primary roles
```

### 19.4 Queue continuity

TreeSeed remains operational throughout.

When inference is unavailable or degraded:

- Requests enter a queue.
- Active work is checkpointed into state capsules.
- Users can inspect pending work.
- The scheduler resumes work when capacity returns.

---

## 20. Capacity Providers and Modular Workloads

Every inference, training, teacher, evaluation, synchronization, or compilation resource should implement a common capacity-provider interface.

### 20.1 Provider types

```text
Inference provider
Training provider
Teacher provider
Evaluation provider
Adapter compiler
Artifact synchronization provider
Embedding provider
Retrieval provider
Tool execution provider
External frontier-model provider
```

### 20.2 Provider capabilities

A provider advertises:

- Models.
- Context limits.
- Quantizations.
- Adapter support.
- Maximum adapter rank.
- Training methods.
- Distributed-training compatibility.
- Distributed-inference compatibility.
- Tool support.
- Security classification.
- Tenant restrictions.
- Availability schedule.
- Throughput.
- Cost.
- Energy policy.
- Local artifact inventory.

### 20.3 Workload declaration

Inference workload:

```yaml
workload:
  type: agent-inference
  project: project-alpha
  agent_role: backend-engineer
  adapter: project-alpha-engineer-stable
  minimum_context: 16384
  preferred_context: 131072
  continuation_reserve: 32768
  maximum_output: 4096
  tools:
    - repository.read
    - repository.patch
    - tests.run
  priority: normal
  preemptible: true
```

Training workload:

```yaml
workload:
  type: qlora-training
  project: project-alpha
  base_model: treeseed-qwen35-core-v5
  parent_adapter: engineer-v41
  sequence_length: 8192
  memory_limit_gb: 104
  method: sft
  distributed:
    required: false
  output:
    candidate_adapter: engineer-v42
```

Distributed burst workload:

```yaml
workload:
  type: distributed-long-context-inference
  project: project-alpha
  providers:
    required_count: 2
  context_length: 262144
  parallelism:
    pipeline: 2
  priority: high
  preempt_dream_provider: true
```

### 20.4 Scheduling

The scheduler considers:

- Governance priority.
- Project allocation.
- Provider compatibility.
- Model residency.
- Adapter residency.
- Artifact locality.
- Memory availability.
- Context requirements.
- Continuation reserve.
- Queue age.
- Deadline.
- Energy schedule.
- Awake or dream state.
- Preemption cost.

### 20.5 Portable agents

An agent definition should not depend directly on vLLM or Axolotl.

```text
Agent definition
    +
Role
    +
Permissions
    +
Context policy
    +
Preferred model capability
    +
Adapter requirement
    ↓
Scheduler selects capacity provider
```

---

## 21. Security and Trust

### 21.1 Adapters are sensitive artifacts

A proprietary project adapter may encode recoverable project information.

It should receive protections comparable to the repository:

- Encryption at rest.
- Access controls.
- Tenant isolation.
- Signed manifests.
- Audit trails.
- Export restrictions.
- Revocation.
- Secure deletion processes.

### 21.2 Secret exclusion

Training preparation must exclude:

- `.env` files.
- API keys.
- Tokens.
- Credentials.
- Private keys.
- Production customer data.
- Unnecessary personal information.
- Generated secrets in logs.
- Sensitive database exports.

### 21.3 Model controls are not security controls

Actual enforcement belongs in:

- Tool permissions.
- Filesystem isolation.
- Network policy.
- Authentication.
- Authorization.
- Sandbox boundaries.
- Governance approvals.
- Capacity-provider policy.

### 21.4 Artifact-transfer security

Node synchronization should require:

- Mutual authentication.
- Signed manifests.
- Digest verification.
- Short-lived credentials.
- Tenant-aware authorization.
- Audit events.
- Restricted peer endpoints.

### 21.5 Provenance

Every artifact must record:

- Origin.
- Base lineage.
- Project revision.
- Training inputs.
- Teacher versions.
- Validation results.
- Compiler version.
- Merge method.
- Context-policy version.
- Operator or decision.
- Artifact digest.

---

## 22. Reliability and Guarantees

### 22.1 Guarantee examples

- Build succeeds.
- Unit tests pass.
- Integration tests pass.
- Schema remains compatible.
- Required files changed.
- Prohibited files unchanged.
- Performance does not regress.
- Security checks pass.
- Documentation updated.
- Citations resolve.
- Tool arguments validate.
- Deployment remains healthy.
- State capsule preserves critical constraints.
- Rehydrated evidence matches original history.

### 22.2 Model promotion guarantees

A candidate adapter should be rejected when it:

- Improves one benchmark but causes a critical regression.
- Produces invalid tool calls.
- Violates permissions.
- Leaks project information.
- Loses general language competence.
- Becomes overconfident on missing functionality.
- Requires materially more tools or tokens for the same work.
- Fails vLLM serving parity.
- Degrades context compression or continuation behavior.
- Allows one source adapter to dominate unintentionally after normalization.
- Performs materially worse than the exact weighted reference after compression.
- Is highly unstable under small source-weight changes.

### 22.3 Deployment stages

```text
Candidate
    ↓
Offline evaluation
    ↓
vLLM staging
    ↓
Shadow evaluation
    ↓
Canary agents
    ↓
Stable
```

Rollback should require changing a registry alias, not retraining.

---

## 23. Reference Deployment Topologies

### 23.1 One-box deployment

```text
One DGX Spark

Awake:
vLLM + TreeSeed agents

Dream:
Axolotl + teachers + compiler + evaluation
```

### 23.2 Permanent dual-node deployment

```text
Durable external layer:
TreeSeed control plane
event history
artifact registry
object storage

Spark A — Awake:
production vLLM
accepted adapters
agent gateway
context manager

Spark B — Dream:
teacher inference
dataset compiler
Axolotl
adapter compiler
staging vLLM
evaluation
```

This is the preferred topology for continuous service.

### 23.3 Elastic dual-node deployment

```text
Normal:
Spark A inference
Spark B dream

Burst:
Spark A + Spark B distributed inference
or
Spark A + Spark B distributed training
```

This preserves the primary split while allowing occasional aggregate workloads.

### 23.4 Small cluster

```text
Node 1:
Production inference

Node 2:
Staging inference and rollout generation

Nodes 3–4:
Distributed training

Conventional service node:
TreeSeed control plane and artifact registry
```

---

## 24. Recommended Initial Implementation

### Phase 1: Stable local inference

- Deploy TreeSeed control plane.
- Register one capacity provider.
- Serve Qwen3.5-27B through vLLM.
- Implement static project adapters.
- Validate tool-call reliability.
- Add adapter registry and rollback.

### Phase 2: Durable artifact plane

- Add S3-compatible artifact storage.
- Add immutable manifests.
- Add content-addressed node caches.
- Add resumable synchronization.
- Add signed promotion events.

### Phase 3: Project cognition package

- Parse repositories and documents.
- Construct symbol and dependency graphs.
- Generate project pretraining sequences.
- Generate factual question-and-answer data.
- Train one project QLoRA adapter.
- Measure context reduction and task improvement.

### Phase 4: Context-continuation system

- Add immutable event logging.
- Add typed state capsules.
- Add hierarchical summaries.
- Add rehydration tools.
- Add context-compression teachers.
- Establish full-history versus compressed-history benchmarks.

### Phase 5: Experience compiler

- Record complete agent trajectories.
- Introduce evidence and engineering teachers.
- Produce corrected and preference datasets.
- Run replay-balanced SFT.
- Establish promotion guarantees.

### Phase 6: Adapter compiler

- Implement lineage validation.
- Normalize native LoRA scaling and record update norms.
- Implement explicit global source-adapter weights.
- Implement exact weighted concatenation as the reference composition.
- Implement SVD compression.
- Integrate conflict-aware merge methods.
- Add weight sensitivity analysis.
- Add post-merge polish.
- Publish weight profiles and compiled adapters to vLLM.
- Add per-module weighting only after global weighting is proven stable.

### Phase 7: Dual-node awake/dream operation

- Keep production inference on node A.
- Run teacher, training, merge, and staging phases on node B.
- Implement peer artifact replication.
- Implement candidate promotion to node A.
- Measure continuous service and training throughput.

### Phase 8: Elastic distributed bursts

- Test two-node pipeline-parallel inference.
- Test long-context prefill and KV-cache strategies.
- Test distributed Axolotl configurations.
- Enable temporary provider recomposition through governance.

---

## 25. Success Metrics

### Project understanding

- Architecture-question accuracy.
- Correct file and symbol localization.
- Change-impact prediction.
- Stale-fact rejection.
- Cross-component reasoning.

### Context efficiency

- Retrieved tokens per completed task.
- Prompt tokens per task.
- Time to first useful action.
- Reduction in repeated project context.
- Compression ratio without task degradation.
- Rehydration success rate.
- Continuation reserve violations.

### Agent effectiveness

- Directive completion rate.
- Guarantee pass rate.
- Tool-call validity.
- Tool-call efficiency.
- Recovery success.
- Escalation accuracy.
- Rework introduced.

### Adapter compilation

- Exact-versus-compressed task-performance gap.
- Retained capability per deployed adapter rank.
- Source-weight sensitivity.
- Unintended adapter dominance.
- Merge-interference regression rate.
- Weight-profile reuse rate.
- Compiled-adapter promotion rate.

### Continual learning

- Improvement after each dream cycle.
- Regression rate.
- Adapter promotion rate.
- Historical capability retention.
- Decline in repeated frontier-teacher escalations.
- Time required to incorporate a project change.

### Infrastructure

- Awake service availability.
- Dream throughput.
- Artifact synchronization latency.
- Cache-hit rate.
- Adapter promotion latency.
- Distributed burst setup time.
- Memory-limit violations.

### Governance

- Traceability of model changes.
- Percentage of training records with verified evidence.
- Rollback reliability.
- Unauthorized-action rate.
- Human-review burden.
- Capacity allocation adherence.

---

## 26. Non-Goals

TreeSeed Platform in a Box is not intended to:

- Store source code losslessly inside adapters.
- Eliminate repositories or documentation.
- Allow models to self-authorize.
- Train indiscriminately on every interaction.
- Replace deterministic testing with model judgment.
- Guarantee that continual training always improves performance.
- Compose unlimited adapters without interference.
- Treat numerical adapter weights as semantic authority, truth priority, or formal governance.
- Assume equal numeric weights create equal behavioral influence without normalization and evaluation.
- Treat unified memory as unlimited memory.
- Treat two connected nodes as one transparent memory allocator.
- Require maximum-context training to support maximum-context inference.
- Preserve raw conversation indefinitely in active context.
- Remove the need for retrieval.
- Create an ungoverned self-modifying intelligence.

---

## 27. North-Star Operating Model

```text
Humans and agents maintain project objectives.

Agents research, propose, estimate, implement, and verify work.

TreeSeed records events, evidence, outcomes, and decisions.

The context manager converts long histories into reversible state capsules.

Project artifacts are transformed into persistent project cognition.

Teacher agents inspect experience and generate better learning material.

Axolotl trains candidate project, role, capability, and context adapters.

The adapter compiler weights, normalizes, merges, compresses, and polishes modular capabilities into deployable adapters.

Guarantees and evaluations determine whether candidates improve the system.

TreeSeed governs promotion.

Artifacts synchronize through durable storage and content-addressed caches.

vLLM serves the accepted base and adapters.

The improved agents continue from their preserved operational state.
```

The cycle repeats, but not blindly.

Every cycle should increase one or more of:

- Understanding.
- Reliability.
- Efficiency.
- Specialization.
- Evidence quality.
- Institutional memory.
- Context efficiency.
- Autonomy within governance.

---

## 28. Final Principle

The central product is not a model, an adapter, a context window, or an agent.

It is a **governed learning institution that fits inside affordable AI computers and can expand across connected capacity providers**.

The hardware provides capacity.  
Linux provides the operating foundation.  
vLLM provides efficient cognition during active work.  
Axolotl provides learning during consolidation.  
QLoRA adapters provide modular specialization.  
Teacher agents convert experience into education.  
The adapter compiler turns modular learning into deployable capability.  
The context system turns long histories into bounded, reversible operational state.  
The artifact plane makes replaceable compute nodes safe to use.  
TreeSeed provides memory, authority, coordination, and accountability.

Models will change.  
Quantization formats will change.  
Training frameworks will change.  
Hardware will change.  
Context limits will change.

The durable architecture is the cycle:

```text
Evidence
→ Experience
→ Teaching
→ Learning
→ Validation
→ Governance
→ Action
→ Compression
→ Continuation
→ New evidence
```

That cycle is the foundation of the evolving platform in a box.

---

## 29. Reference Sources

- NVIDIA DGX Spark hardware documentation: https://docs.nvidia.com/dgx/dgx-spark/hardware.html
- NVIDIA DGX Spark clustering documentation: https://docs.nvidia.com/dgx/dgx-spark/spark-clustering.html
- NVIDIA DGX Spark porting guide: https://docs.nvidia.com/dgx/dgx-spark-porting-guide/overview.html
- Enverge DGX Spark documentation: https://spark.enverge.ai/docs/
- Qwen3.5-27B model documentation: https://huggingface.co/Qwen/Qwen3.5-27B
- vLLM documentation: https://docs.vllm.ai/
- vLLM LoRA documentation: https://docs.vllm.ai/en/latest/features/lora/
- vLLM parallelism and scaling: https://docs.vllm.ai/en/stable/serving/parallelism_scaling/
- Axolotl documentation: https://docs.axolotl.ai/
- Axolotl multi-node documentation: https://docs.axolotl.ai/docs/multi-node.html
- Axolotl sequence and context parallelism: https://docs.axolotl.ai/docs/sequence_parallelism.html
- Hugging Face PEFT documentation: https://huggingface.co/docs/peft/
