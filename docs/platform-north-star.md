# TreeSeed Platform in a Box

## A North-Star Architecture for Governed, Continuously Learning, Private AI Systems

**Status:** Architectural and philosophical north star
**Primary deployment target:** Affordable unified-memory AI computers such as NVIDIA DGX Spark
**Reference model family:** Qwen3.5-27B and future compatible open-weight models
**Inference system:** vLLM
**Training system:** Axolotl, PyTorch, Transformers, PEFT, and related post-training libraries
**Control plane:** TreeSeed governance, knowledge, capacity, and agent-management platform

---

## 1. Vision

TreeSeed Platform in a Box is a compact, privately operated AI institution.

It combines:

* Local AI computation.
* Persistent project knowledge.
* Continuously improving specialized models.
* Governed autonomous agents.
* Verifiable work execution.
* Human and machine decision-making.
* Modular capacity that can expand from one computer to a cluster.

The objective is not merely to run a language model locally. The objective is to create an evolving system in which:

1. Projects accumulate structured knowledge.
2. Agents perform useful work within explicit roles and permissions.
3. Their work produces evidence, outcomes, and experience.
4. Specialized teacher agents convert that experience into better training material.
5. Project and agent adapters are retrained, evaluated, merged, and promoted.
6. Improved agents return to service with stronger project awareness and more effective operating behavior.

The system alternates between two primary computational states:

* **Awake:** models serve agents, users, tools, and project workloads.
* **Dreaming:** accumulated knowledge and experience are consolidated into improved adapters.

This daily cycle creates a privately controlled learning system without requiring continuous access to a remote frontier model.

---

## 2. Core Thesis

A general-purpose model should not be required to reconstruct the complete context of a project during every request.

Instead, project knowledge and operational experience should be compiled into several complementary forms:

* Structured source-of-truth knowledge.
* Searchable repository and document indexes.
* Project-specific QLoRA adapters.
* Role- and capability-specific QLoRA adapters.
* Training and validation packages.
* Governance records and decisions.
* Executable guarantees and evaluations.

The resulting model does not replace the repository, documentation, or governance record. It gains a persistent mental model of them.

The target relationship is:

```text
Parametric memory
    provides broad understanding, conventions, and learned behavior

Structured TreeSeed knowledge
    provides persistent concepts, decisions, objectives, and provenance

Targeted retrieval
    provides exact current evidence

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

* Defined objectives.
* Approved decisions.
* Project histories.
* Explicit roles.
* Permission boundaries.
* Capacity allocations.
* Work directives.
* Verifiable completion conditions.

The primary unit of AI work is not the conversation. It is the governed project activity.

### 3.2 Knowledge should have multiple representations

No single representation is sufficient.

A project should exist simultaneously as:

* Human-readable documentation.
* Executable code.
* Structured entities and relationships.
* Searchable source material.
* Model training data.
* Parametric model memory.
* Testable guarantees.
* Historical decisions.

Each representation serves a different purpose.

### 3.3 Models are compressed interpretations, not authoritative databases

A project adapter may understand the architecture and accurately identify where behavior resides, but it should not be trusted to reproduce exact current code or configuration values from memory.

The repository remains authoritative for code.
The governance record remains authoritative for decisions.
The knowledge store remains authoritative for structured project facts.
The adapter provides learned comprehension and operating competence.

### 3.4 Experience should be curated, not merely accumulated

An agent trace is not automatically good training data.

It may contain:

* Incorrect assumptions.
* Inefficient tool usage.
* Accidental successes.
* Outdated project facts.
* Unauthorized actions.
* Misleading reasoning.
* Unverified conclusions.

Experience becomes knowledge only after evidence-based review, correction, classification, and validation.

### 3.5 Continuous learning must remain reversible

Every model, adapter, dataset, merge, and promotion must be versioned.

A continuously learning system without immutable lineage and rollback is an uncontrolled drifting system.

### 3.6 Governance precedes autonomy

Agents may propose, analyze, estimate, implement, and verify work. They should not silently acquire authority.

TreeSeed must determine:

* Which objectives are active.
* Which decisions are approved.
* Which agents may act.
* Which tools they may use.
* Which projects receive capacity.
* Which model updates enter production.
* Which risks require human review.

### 3.7 Locality is an architectural capability

Private local operation provides more than reduced API cost.

It enables:

* Persistent private model state.
* Rapid adapter replacement.
* Continuous background learning.
* Offline operation.
* Low-latency tool loops.
* Sensitive project processing.
* User-controlled retention and deletion.
* Predictable capacity allocation.

---

## 4. System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                       TreeSeed UI                           │
│ Governance │ Portfolios │ Agents │ Knowledge │ Training     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  TreeSeed Control Plane                     │
│ Objectives │ Decisions │ Proposals │ Work Directives        │
│ Capacity │ Scheduling │ Permissions │ Guarantees             │
│ Adapter Registry │ Dataset Registry │ Model Governance       │
└──────────────┬───────────────────────┬───────────────────────┘
               │                       │
        Awake workloads          Dream workloads
               │                       │
┌──────────────▼────────────┐  ┌───────▼──────────────────────┐
│       vLLM Inference      │  │       Axolotl Training       │
│ Quantized base model      │  │ QLoRA / SFT / DPO / GRPO    │
│ Compiled LoRA adapters    │  │ Pretraining and replay       │
│ KV-cache scheduling       │  │ Candidate adapter output     │
│ OpenAI-compatible APIs    │  └────────────┬─────────────────┘
└──────────────┬────────────┘               │
               │                    ┌────────▼─────────────────┐
               │                    │ Adapter Compiler         │
               │                    │ Validate │ Merge │ SVD    │
               │                    │ TIES │ Polish │ Package   │
               │                    └────────┬─────────────────┘
               │                             │
┌──────────────▼─────────────────────────────▼─────────────────┐
│                     Agent Runtime                            │
│ Planner │ Researcher │ Architect │ Engineer │ Reviewer       │
│ Tool execution │ Context construction │ Project isolation    │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│               Projects and Evidence                         │
│ Git │ Documents │ Tests │ Logs │ Metrics │ Decisions         │
│ Knowledge graph │ Retrieval indexes │ Artifact storage       │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Hardware Foundation

### 5.1 Unified-memory AI computers

The reference appliance is an affordable AI computer with:

* A capable integrated GPU.
* A large unified CPU/GPU memory pool.
* Fast local NVMe storage.
* High-speed networking.
* A Linux operating environment.
* Sufficient memory to serve and fine-tune a useful open-weight model.

The NVIDIA DGX Spark provides 128 GB of LPDDR5X unified system memory, approximately 273 GB/s of memory bandwidth, an Arm-based 20-core CPU, Blackwell GPU architecture, local NVMe storage, 10 GbE, and ConnectX-7 networking.

Unified memory is particularly valuable because it allows a compact system to accommodate models and training workloads that would exceed the dedicated VRAM of ordinary consumer GPUs.

It does not eliminate physical limits. The following all consume the same memory pool:

* Model weights.
* KV caches.
* Training activations.
* Optimizer state.
* CPU services.
* Filesystem cache.
* Container overhead.
* Data preprocessing.
* Operating-system memory.

TreeSeed must therefore schedule memory as a governed resource rather than treating all reported memory as freely available GPU capacity.

### 5.2 Hardware should be abstracted as capacity

TreeSeed should not encode assumptions about one specific appliance.

Every participating machine should register a **capacity provider** that declares:

```yaml
provider:
  id: spark-01
  type: unified-memory-ai-node
  architecture: arm64
  operating_system: dgx-os
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

* Total physical memory.
* Reserved operating-system memory.
* Maximum inference allocation.
* Maximum training allocation.
* Current model residency.
* Supported adapter ranks.
* Context limits.
* Expected throughput.
* Supported distributed-training modes.
* Energy or scheduling restrictions.

### 5.3 Memory is governed capacity

TreeSeed should allocate memory through workload reservations:

```text
Inference reservation
Training reservation
Evaluation reservation
Adapter-compilation reservation
System reserve
Emergency reserve
```

No component should independently consume all available memory.

A capacity reservation should specify:

* Maximum resident memory.
* Expected duration.
* Preemption policy.
* Priority.
* Project allocation.
* Mode compatibility.
* Required model.
* Required adapters.
* Whether requests may queue.

### 5.4 Clustering

Multiple unified-memory computers may form a training or serving cluster, but their memory does not become one transparent flat address space.

Distributed systems such as FSDP and DeepSpeed shard model states across nodes and exchange tensors over the network. Axolotl supports multi-GPU and multi-node strategies including FSDP and DeepSpeed, with FSDP documented as its recommended PyTorch-native sharding approach.

The first scaling strategy should normally be functional separation:

```text
Node A: production inference
Node B: training and adapter compilation
Node C: evaluation and teacher generation
```

Distributed training should be introduced when:

* A model or context length cannot fit on one node.
* Training duration becomes unacceptable.
* Full or partial base-model training is required.
* Online reinforcement learning needs separate rollout and training capacity.

---

## 6. Linux Operating-System Layer

DGX OS is a Linux distribution based on Ubuntu 24.04 LTS with NVIDIA-specific drivers, libraries, diagnostics, and platform integration.

Linux is not merely the host for the application. It is the resource and security boundary beneath the AI institution.

### 6.1 Host responsibilities

The host operating system should provide:

* NVIDIA drivers and CUDA runtime.
* Container runtime.
* Encrypted storage.
* User and service isolation.
* Firewalling.
* Network policy.
* Device monitoring.
* Process supervision.
* Time synchronization.
* Filesystem snapshots.
* Backup and restore.
* Audit logging.
* Secure boot and update policy where supported.

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
  event queue

awake:
  vLLM
  inference gateway
  agent kernel
  embedding service
  reranking service

dream:
  Axolotl trainer
  dataset compiler
  teacher coordinator
  adapter compiler
  evaluation workers

storage:
  PostgreSQL or equivalent metadata store
  object storage
  Git repositories
  model cache
  adapter store
  dataset store
  log and metric store
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

### 6.4 Filesystem layout

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
├── projects/
├── evidence/
├── evaluations/
├── manifests/
└── backups/
```

Large artifacts should be content-addressed and immutable. Human-readable aliases such as `stable` or `candidate` should resolve to immutable versions rather than mutable directories.

---

## 7. TreeSeed as the Governance and Control Plane

TreeSeed provides the institutional structure surrounding the models.

Its responsibilities include:

* Project portfolio management.
* Objectives and priorities.
* Proposals and decisions.
* Work directives.
* Capacity allocation.
* Agent definitions.
* Tool permissions.
* Workday scheduling.
* Project knowledge.
* Model and adapter governance.
* Training-data governance.
* Evaluation and promotion.
* Auditability.

### 7.1 Governance objects

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
Evaluation Suite
Guarantee
Promotion Decision
```

### 7.2 Decisions govern model changes

A model update should be treated as a governed deployment artifact.

A promotion decision should record:

* Candidate adapter.
* Parent version.
* Base model lineage.
* Dataset versions.
* Teacher versions.
* Merge recipe.
* Evaluation results.
* Regressions.
* Security checks.
* Approver or automated policy.
* Rollback target.

### 7.3 Two primary interface modes

#### Focused research and governance

This mode minimizes stimulation and interruption.

It emphasizes:

* Objectives.
* Questions.
* Evidence.
* Documents.
* Proposals.
* Decisions.
* Training-data review.
* Model evaluations.
* Long-form analysis.

#### Command center

This mode provides operational awareness.

It emphasizes:

* Active agents.
* Work queues.
* Capacity utilization.
* Model residency.
* Adapter assignments.
* Current tool activity.
* Guarantee status.
* Training progress.
* Incidents.
* Required interventions.

The two modes should use the same underlying state but optimize for different cognitive tasks.

### 7.4 Training studio

A dedicated training interface should expose:

* Project snapshot selected for training.
* New source changes.
* Accumulated agent experience.
* Teacher review status.
* Dataset composition.
* Replay proportions.
* Candidate adapter lineage.
* Merge recipe.
* Evaluation comparisons.
* Promotion and rollback controls.

The UI should allow a human to inspect why a training record exists and which evidence supports it.

---

## 8. Inference Architecture with vLLM

Qwen3.5-27B is distributed in Transformers format and is documented as compatible with both Transformers and vLLM.

vLLM provides the awake-mode inference engine because it offers:

* An OpenAI-compatible HTTP service.
* Concurrent request scheduling.
* KV-cache management.
* Continuous batching.
* LoRA adapter loading.
* Adapter unloading.
* Prefix caching where supported.
* Streaming responses.
* Integration with common agent clients.

vLLM supports OpenAI-compatible chat, completion, response, embedding, and other API surfaces.

### 8.1 Serving model

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

### 8.2 Adapter loading

vLLM supports dynamic LoRA loading and unloading through management endpoints and can resolve adapters through filesystem, Hugging Face, or custom resolver plugins.

TreeSeed should place an authenticated adapter-management service in front of these operations.

Inference clients must not be able to arbitrarily load paths or replace production adapters.

### 8.3 Adapter identity

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

### 8.4 Stable prompt layout

Where prefix caching is supported, prompts should place stable material first:

```text
TreeSeed operating protocol
Role and permission definition
Tool schemas
Project identity
Stable project conventions
Current objective
Current directive
Retrieved evidence
Recent tool observations
```

vLLM automatic prefix caching can reuse prior KV-cache computation when requests share the same prefix.

Prefix caching must be treated as an optimization rather than a required architectural property because support can vary by model architecture and runtime version.

### 8.5 Inference gateway

TreeSeed should not expose vLLM directly as the primary public API.

The inference gateway should enforce:

* Project identity.
* Agent identity.
* Adapter eligibility.
* Context budget.
* Tool permissions.
* Output limits.
* Request priority.
* Cost and capacity accounting.
* Schema validation.
* Tool-call validation.
* Trace collection.
* Cancellation and timeout policy.

---

## 9. Adapter Taxonomy

TreeSeed should distinguish adapter types by purpose.

### 9.1 Core adapter

Contains behavior shared by all TreeSeed agents:

* TreeSeed concepts.
* Tool protocol.
* Governance semantics.
* Evidence requirements.
* Permission awareness.
* Work-directive lifecycle.
* General reasoning discipline.
* Guarantee interpretation.

The core adapter may periodically be merged into a new canonical TreeSeed base model.

### 9.2 Project adapter

Contains a compressed semantic representation of a project:

* Architecture.
* Packages and responsibilities.
* APIs and schemas.
* Data and control flows.
* Code conventions.
* Testing conventions.
* Stable project terminology.
* Important historical decisions.

A project adapter is not the authoritative repository.

### 9.3 Role adapter

Contains stable operating behavior for a class of agent:

* Planner.
* Researcher.
* Architect.
* Backend engineer.
* Frontend engineer.
* Test engineer.
* Security reviewer.
* Technical editor.

### 9.4 Capability adapter

Contains a bounded reusable competency:

* Tool recovery.
* Repository navigation.
* Security analysis.
* Performance diagnosis.
* Documentation synthesis.
* Test design.
* Proposal estimation.

### 9.5 Policy adapter

Contains governed operating constraints that are appropriate for parametric learning:

* Escalation rules.
* Evidence standards.
* Approval boundaries.
* Privacy practices.
* Restricted tool behavior.

Hard security controls must remain outside the model even when policy behavior is trained into an adapter.

### 9.6 Agent-instance state

Individual agent memories should not normally become separate adapters.

They belong in:

* Project knowledge.
* Structured observations.
* Work history.
* Retrieval stores.
* Current plans.
* Decision records.

Adapters encode durable capability and understanding, not ephemeral personal state.

---

## 10. The Adapter Compiler and Merge Layer

vLLM should receive one ordinary deployable LoRA adapter for a request.

The modular training architecture may produce several conceptual layers:

```text
Core
+ Project
+ Role
+ Capability
+ Policy
```

The adapter compiler converts selected layers into one validated deployable adapter.

### 10.1 Merge process

```text
Source adapters
    ↓
Lineage validation
    ↓
Scaling normalization
    ↓
Exact composition
    ↓
Compression or conflict-aware merge
    ↓
Post-merge polish training
    ↓
Evaluation
    ↓
PEFT-compatible adapter package
    ↓
vLLM registration
```

### 10.2 Compatibility validation

Adapters may be merged only when they have compatible:

* Base-model lineage.
* Model architecture.
* Tokenizer.
* Target-module dimensions.
* Module naming.
* LoRA variants.
* Vocabulary.
* Chat template.
* Precision expectations.

The compiler must detect parent-child relationships to avoid double-counting.

For example:

```text
engineer-v13 derived from engineer-v12
```

means `v13` replaces `v12`; they must not be added together.

### 10.3 Exact concatenation

For compatible LoRA updates, adapter deltas can be concatenated exactly. The resulting rank is the sum of the input ranks.

This provides a reference composition with no approximation loss, but may produce an adapter too large for efficient serving.

PEFT documents concatenation and warns that the resulting rank grows with the sum of the source-adapter ranks.

### 10.4 SVD compression

The exact combined low-rank update can be compressed to a selected serving rank:

```text
Exact rank 128
    ↓
SVD compression
    ↓
Deployable rank 32 or 64
```

The compiler should report:

* Retained singular-value energy.
* Per-layer reconstruction error.
* Total adapter size.
* Expected vLLM rank allocation.
* Capability-regression results.

### 10.5 Conflict-aware merges

PEFT provides adapter-merging approaches including TIES and related techniques intended to reduce interference among independently trained adapters.

The compiler should support experiments with:

* Weighted linear composition.
* Concatenation.
* SVD.
* TIES.
* TIES-SVD.
* DARE variants.
* Magnitude pruning.
* Custom per-layer weights.

No merge strategy should be assumed best globally.

### 10.6 Merge and polish

The recommended production process is:

```text
Mathematical merge
    +
Small balanced training corpus
    ↓
Short QLoRA polish run
```

The polish corpus should contain examples that exercise interactions among the merged capabilities.

For example, a project-engineer-tool-recovery adapter should be tested and polished on tasks requiring all three:

* Project-specific architecture.
* Engineering behavior.
* Recovery from failed tools.

### 10.7 Integration with vLLM

The compiler output must be a normal PEFT-compatible adapter directory:

```text
adapter_model.safetensors
adapter_config.json
manifest.json
merge-recipe.yaml
evaluation-report.json
checksums.txt
```

TreeSeed registers the compiled artifact and instructs vLLM to load it through the standard LoRA interface.

vLLM does not need to understand that the adapter was produced from several conceptual layers.

### 10.8 Avoiding combination explosion

Compiling every possible project, role, and capability combination can create an unmanageable matrix.

TreeSeed should use:

* A small number of stable role classes.
* A limited set of approved capability bundles.
* On-demand compilation.
* Usage-based adapter caching.
* Expiration of unused combinations.
* Recompilation only when an input layer changes.
* Shared evaluation suites.

A practical initial arrangement is:

```text
TreeSeed core behavior baked into canonical base
    +
One project-role compiled adapter
```

Capabilities that can be expressed safely through prompts, tools, or workflow configuration should not automatically become separate adapter layers.

---

## 11. Training Architecture with Axolotl

Axolotl is the training orchestration layer over PyTorch, Transformers, PEFT, TRL, quantization libraries, and distributed-training systems.

Axolotl currently documents Qwen3.5 support, including the `qwen3_5` chat template, LoRA and QLoRA optimizations, multimodal handling, distributed training, preference optimization, and reinforcement-learning workflows.

### 11.1 Training responsibilities

Axolotl should perform:

* Enhanced project pretraining.
* Supervised conversation training.
* Continued role training.
* Preference optimization.
* Selective reinforcement learning.
* Replay-balanced continual learning.
* Adapter checkpointing.
* Distributed QLoRA when required.

### 11.2 Language-first training

Qwen3.5-27B includes multimodal components. Project and agent adapters should initially target the language backbone while freezing vision components unless a project explicitly requires visual understanding.

This reduces memory use and simplifies vLLM compatibility.

### 11.3 Training stages

#### Stage 1: Enhanced project pretraining

Train on generated source-derived sequences:

* Code and related tests.
* Interfaces and implementations.
* Documentation and corresponding modules.
* Schemas and consumers.
* Call graphs.
* Decisions and resulting implementation.
* Commit-diff neighborhoods.

Axolotl supports ordinary pretraining records as well as conversational formats. Its conversational datasets use chat templates so the training representation can match inference formatting.

#### Stage 2: Factual conversational learning

Train the model to answer:

* What exists?
* Where is it implemented?
* Why is it structured this way?
* Which component owns a responsibility?
* How do components interact?
* What is not present?
* What changed between revisions?

#### Stage 3: Experiential conversational learning

Train on verified and corrected agent trajectories:

* Planning.
* Tool selection.
* Tool results.
* Recovery.
* Implementation.
* Testing.
* Completion.
* Escalation.

#### Stage 4: Preference optimization

Train on chosen and rejected alternatives:

* Verified versus unsupported plans.
* Efficient versus wasteful tool use.
* Correct versus fabricated arguments.
* Authorized versus unauthorized actions.
* Grounded versus speculative conclusions.

Axolotl exposes several preference and reinforcement-learning methods through TRL, including DPO, KTO, ORPO, GRPO, and related methods, although some RLHF features remain beta and should be adopted conservatively.

#### Stage 5: Outcome-based learning

Use objective rewards where a reliable executable environment exists:

* Tests pass.
* Build succeeds.
* Guarantee passes.
* Schema validates.
* Performance improves.
* No unauthorized files change.
* Required evidence is attached.
* Deployment remains healthy.

### 11.4 Axolotl and vLLM during online learning

For ordinary SFT and DPO:

```text
Axolotl trains adapter
    ↓
Adapter is evaluated
    ↓
Adapter is loaded into vLLM
```

vLLM does not participate in the training loop.

For GRPO and other rollout-based training, Axolotl can use a vLLM server for generation and synchronize LoRA weights through filesystem and HTTP rather than repeatedly moving a complete merged model.

On a single DGX Spark, this online arrangement is unlikely to be the preferred 27B configuration because rollout serving and training compete for the same unified memory. A second capacity provider should normally host the rollout server.

---

## 12. Project Cognition Packages

The durable asset should not be the adapter alone.

Each project revision should produce a **project cognition package**:

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
├── adapters/
├── merge-recipes/
└── provenance.json
```

This package allows the project to be:

* Recompiled against a future base model.
* Audited.
* Corrected.
* Partially deleted.
* Retaught by stronger teachers.
* Split into project domains.
* Used to train different agent roles.
* Evaluated consistently across models.

The adapter is a compiled deployment artifact.
The cognition package is the reusable source asset.

---

## 13. Teacher-Agent System

Teacher agents are specialized agents whose product is not project code or documentation. Their product is improved learning material.

They should be first-class TreeSeed agent classes with explicit tools, evidence requirements, and evaluation criteria.

### 13.1 Evidence teacher

Purpose:

* Verify factual claims.
* Associate claims with files, symbols, documents, tests, and commits.
* Reject unsupported training records.
* Detect stale statements.

Inputs:

* Candidate training record.
* Frozen repository revision.
* Relevant project documents.
* Tool outputs.

Outputs:

* Verified claims.
* Unsupported claims.
* Evidence references.
* Confidence.
* Validity interval.

### 13.2 Architecture teacher

Purpose:

* Determine whether a trajectory respects project architecture.
* Identify misplaced responsibilities.
* Detect dependency violations.
* Generate architecture-aware alternatives.

Outputs:

* Architectural critique.
* Correct ownership.
* Expected dependency direction.
* Relevant design decisions.
* Better implementation plan.

### 13.3 Engineering teacher

Purpose:

* Review technical correctness.
* Evaluate tests.
* Identify performance, reliability, and security issues.
* Generate corrected solutions.

Outputs:

* Corrected patch strategy.
* Missing tests.
* Technical risks.
* Preferred implementation.
* Chosen and rejected alternatives.

### 13.4 Agent-process teacher

Purpose:

* Evaluate how the agent worked.
* Identify unnecessary tool calls.
* Detect premature conclusions.
* Assess recovery from failures.
* Improve completion criteria.

Outputs:

* Process critique.
* Corrected tool sequence.
* Decision boundaries.
* Escalation examples.
* Efficiency score.

### 13.5 Pedagogy teacher

Purpose:

* Convert evidence and corrected experience into effective learning records.

Outputs:

* Factual question-and-answer examples.
* Multiple phrasings.
* Corrected conversations.
* Preference pairs.
* Negative examples.
* Failure-recovery records.
* Cross-component reasoning tasks.

### 13.6 Adversarial teacher

Purpose:

* Produce difficult nearby examples.
* Detect overgeneralization.
* Test unsupported confidence.

Examples:

* Similar tools with different semantics.
* Stale documentation.
* Renamed symbols.
* Removed capabilities.
* Ambiguous directives.
* Partial test success.
* Requests that should not trigger action.
* Permission-boundary cases.

### 13.7 Security and privacy teacher

Purpose:

* Detect secrets and sensitive data.
* Generate extraction probes.
* Review whether a training record should exist.
* Verify project and tenant boundaries.
* Detect information leakage across adapters.

### 13.8 Evaluation teacher

Purpose:

* Generate held-out tests.
* Maintain benchmark diversity.
* Search for regressions.
* Compare candidate and stable adapters.
* Identify where evaluation has become too easy.

The evaluation teacher must not train on the hidden answers of the final test set.

### 13.9 Curator teacher

Purpose:

* Manage long-term dataset health.
* Deduplicate records.
* retire stale examples.
* Preserve rare critical cases.
* Balance replay categories.
* Detect stylistic homogenization.
* Recommend clean adapter rebuilds.

---

## 14. Experience Compilation

Every agent run should produce an immutable raw record.

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
```

Teacher agents derive additional views without altering the raw record.

### 14.1 Three representations of experience

#### Raw trajectory

What actually occurred.

#### Annotated trajectory

What was correct, incorrect, inefficient, unsupported, or unsafe.

#### Pedagogical trajectory

The best realistic training sequence derived from the event.

A corrected trajectory must not falsely imply that the original agent succeeded.

### 14.2 Observation, interpretation, and lesson

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

Each level receives a separate confidence and evidence status.

### 14.3 Teacher collaboration

A training record should pass through a workflow:

```text
Raw experience
    ↓
Evidence teacher
    ↓
Architecture or engineering teacher
    ↓
Agent-process teacher
    ↓
Pedagogy teacher
    ↓
Adversarial teacher
    ↓
Final verifier
    ↓
Candidate training set
```

Teachers may disagree. TreeSeed should preserve disagreement and route material for additional review rather than forcing an artificial consensus.

---

## 15. Dataset Management Over Time

### 15.1 Dataset classes

TreeSeed should maintain separate datasets for:

* Source-derived pretraining.
* Factual SFT.
* Procedural SFT.
* Successful trajectories.
* Corrected failures.
* Failure recovery.
* Preference pairs.
* Adversarial examples.
* Permission boundaries.
* General capability retention.
* Project retention.
* Role retention.
* Evaluation.
* Final hidden testing.

### 15.2 Immutable dataset versions

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
    replay: engineer-replay-v12
    preferences: engineer-preferences-v9
  validation: engineer-validation-v14
  hidden_test: engineer-hidden-v7
```

### 15.3 Temporal splits

Random train/test splitting is insufficient for evolving projects.

The evaluation strategy should include:

* Files excluded from training.
* Tasks excluded from training.
* Later commits.
* New issues.
* Changed APIs.
* Unseen combinations of known components.
* Stale-information tests.

A key temporal test is:

```text
Train on project revision N.
Evaluate understanding of revision N.
Then evaluate work on revision N+1.
```

### 15.4 Validation-set evolution

Validation sets should evolve, but not simply absorb every failed production example immediately.

Maintain:

* A stable long-term benchmark.
* A rotating current-project benchmark.
* A recent-regression benchmark.
* A hidden adversarial benchmark.
* A temporal-generalization benchmark.

### 15.5 Replay

Continual training must include replay to reduce forgetting.

Replay should be stratified rather than purely random:

```text
Core TreeSeed behavior
Tool protocol
Role capability
Project architecture
Permission boundaries
Failure recovery
General language and reasoning
Rare safety-critical cases
```

### 15.6 Stale knowledge

When a project changes, records should be classified as:

* Current.
* Superseded.
* Historically useful.
* Invalid.
* Unverifiable.

Superseded facts may become temporal examples rather than being silently removed.

### 15.7 Dataset promotion

Training records should have their own promotion states:

```text
raw
generated
teacher-reviewed
evidence-verified
accepted
deprecated
revoked
```

A model may train only on records permitted by the selected policy.

---

## 16. Awake and Dream Lifecycle

### 16.1 Awake mode

During awake mode:

* vLLM serves the quantized base.
* Approved adapters are available.
* Agents accept work.
* Tool activity is recorded.
* Evidence is attached.
* Candidate experiences accumulate.
* Teacher work may run on spare capacity or external providers.

### 16.2 Entering dream mode

```text
Close admission for new GPU work
    ↓
Drain or checkpoint active agent runs
    ↓
Persist unresolved directives
    ↓
Freeze project revisions
    ↓
Finalize experience manifests
    ↓
Stop or sleep vLLM
    ↓
Release inference memory
    ↓
Start Axolotl workflow
```

vLLM includes a sleep mode intended to release model weights and KV-cache memory for training or cost-saving workflows.

On unified-memory systems, TreeSeed must verify actual physical-memory release rather than assuming CPU offload creates a separate memory tier.

### 16.3 Dream sequence

```text
Compile source changes
    ↓
Review new experience
    ↓
Run teacher workflows
    ↓
Update training datasets
    ↓
Train candidate adapters
    ↓
Compile adapter combinations
    ↓
Run validation and hidden tests
    ↓
Run vLLM serving-parity tests
    ↓
Promote or reject
```

### 16.4 Waking

```text
Stop training workloads
    ↓
Start vLLM
    ↓
Load quantized canonical base
    ↓
Register accepted adapters
    ↓
Run health and smoke tests
    ↓
Resume queued directives
```

TreeSeed remains operational throughout. User requests and work directives may queue while inference is unavailable.

---

## 17. Capacity Providers and Modular Workloads

Every inference, training, teacher, evaluation, or compilation resource should implement a common capacity-provider interface.

### 17.1 Provider types

```text
Inference provider
Training provider
Teacher provider
Evaluation provider
Adapter compiler
Embedding provider
Retrieval provider
Tool execution provider
External frontier-model provider
```

### 17.2 Provider capabilities

A provider advertises:

* Models.
* Context limits.
* Quantizations.
* Adapter support.
* Maximum adapter rank.
* Training methods.
* Distributed-training compatibility.
* Tool support.
* Security classification.
* Tenant restrictions.
* Availability schedule.
* Throughput.
* Cost.
* Energy policy.

### 17.3 Workload declaration

```yaml
workload:
  type: agent-inference
  project: project-alpha
  agent_role: backend-engineer
  adapter: project-alpha-engineer-stable
  minimum_context: 16384
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

### 17.4 Scheduling

The scheduler considers:

* Governance priority.
* Project allocation.
* Provider compatibility.
* Model residency.
* Adapter residency.
* Memory availability.
* Context requirements.
* Queue age.
* Deadline.
* Energy schedule.
* Awake or dream state.
* Preemption cost.

### 17.5 Portable agents

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

This permits the same agent to run on:

* A local DGX Spark.
* A larger local cluster.
* A remote private server.
* A frontier-model API.
* A future inference engine.

---

## 18. Security and Trust

### 18.1 Adapters are sensitive artifacts

A proprietary project adapter may encode recoverable information about the project.

It should receive protections comparable to the repository:

* Encryption at rest.
* Access controls.
* Tenant isolation.
* Signed manifests.
* Audit trails.
* Export restrictions.
* Revocation.
* Secure deletion processes.

### 18.2 Secret exclusion

Training preparation must exclude:

* `.env` files.
* API keys.
* Tokens.
* Credentials.
* Private keys.
* Production customer data.
* Unnecessary personal information.
* Generated secrets in logs.
* Sensitive database exports.

### 18.3 Model controls are not security controls

Training a model not to perform an action is useful but insufficient.

Actual enforcement belongs in:

* Tool permissions.
* Filesystem isolation.
* Network policy.
* Authentication.
* Authorization.
* Sandbox boundaries.
* Governance approvals.
* Capacity-provider policy.

### 18.4 Provenance

Every artifact must record:

* Origin.
* Base lineage.
* Project revision.
* Training inputs.
* Teacher versions.
* Validation results.
* Compiler version.
* Merge method.
* Operator or decision.
* Artifact digest.

---

## 19. Reliability and Guarantees

The model is a probabilistic worker. TreeSeed must provide deterministic boundaries around its work.

### 19.1 Guarantee examples

* Build succeeds.
* Unit tests pass.
* Integration tests pass.
* Schema remains compatible.
* Required files changed.
* Prohibited files unchanged.
* Performance does not regress.
* Security checks pass.
* Documentation updated.
* Citations resolve.
* Tool arguments validate.
* Deployment remains healthy.

### 19.2 Model promotion guarantees

A candidate adapter should be rejected when it:

* Improves one benchmark but causes a critical regression.
* Produces invalid tool calls.
* Violates permissions.
* Leaks project information.
* Loses general language competence.
* Becomes overconfident on missing functionality.
* Requires materially more tools or tokens for the same work.
* Fails vLLM serving parity.

### 19.3 Deployment stages

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

Rollback should require changing an adapter registry pointer, not retraining.

---

## 20. Reference Deployment Topologies

### 20.1 One-box deployment

```text
One DGX Spark

Awake:
vLLM + TreeSeed agents

Dream:
Axolotl + teachers + compiler + evaluation
```

Best for:

* Initial implementation.
* Private individual or small-team use.
* Scheduled inference/training cycles.
* QLoRA experimentation.

### 20.2 Two-box deployment

```text
Spark A:
Production vLLM and agents

Spark B:
Axolotl, teachers, compilation, staging evaluation
```

Best for:

* Continuous inference.
* Nightly training without service interruption.
* Online rollout generation.
* Safer adapter promotion.

### 20.3 Small cluster

```text
Node 1:
Production inference

Node 2:
Staging inference and rollout generation

Nodes 3–4:
Distributed training

Additional CPU/storage node:
TreeSeed control plane and artifact registry
```

Best for:

* Larger models.
* Longer training contexts.
* Parallel role training.
* GRPO and executable environments.
* Multiple project portfolios.

---

## 21. Recommended Initial Implementation

### Phase 1: Stable local inference

* Deploy TreeSeed control plane.
* Register one DGX Spark capacity provider.
* Serve Qwen3.5-27B through vLLM.
* Implement static project adapters.
* Validate tool-call reliability.
* Add adapter registry and rollback.

### Phase 2: Project cognition package

* Parse repositories and documents.
* Construct symbol and dependency graphs.
* Generate project pretraining sequences.
* Generate factual question-and-answer data.
* Train one project QLoRA adapter.
* Measure context reduction and task improvement.

### Phase 3: Experience compiler

* Record complete agent trajectories.
* Introduce evidence and engineering teachers.
* Produce corrected and preference datasets.
* Run nightly replay-balanced SFT.
* Establish promotion guarantees.

### Phase 4: Adapter compiler

* Implement lineage validation.
* Implement exact concatenation.
* Implement SVD compression.
* Integrate PEFT merge methods.
* Add post-merge polish.
* Publish compiled adapters to vLLM.

### Phase 5: Specialized teacher institution

* Add process, pedagogy, adversarial, security, and evaluation teachers.
* Govern teacher permissions and budgets.
* Track teacher quality.
* Reprocess historical experience with improved teachers.

### Phase 6: Multi-provider scaling

* Add second inference or training appliance.
* Separate awake and dream workloads.
* Introduce rollout-based learning.
* Add FSDP or distributed training only when justified.

---

## 22. Success Metrics

The platform should not be judged primarily by conventional model benchmark scores.

Its central metrics are operational.

### Project understanding

* Architecture-question accuracy.
* Correct file and symbol localization.
* Change-impact prediction.
* Stale-fact rejection.
* Cross-component reasoning.

### Context efficiency

* Retrieved tokens per completed task.
* Prompt tokens per task.
* Time to first useful action.
* Reduction in repeated project context.

### Agent effectiveness

* Directive completion rate.
* Guarantee pass rate.
* Tool-call validity.
* Tool-call efficiency.
* Recovery success.
* Escalation accuracy.
* Rework introduced.

### Continual learning

* Improvement after each dream cycle.
* Regression rate.
* Adapter promotion rate.
* Historical capability retention.
* Decline in repeated frontier-teacher escalations.
* Time required to incorporate a project change.

### Governance

* Traceability of model changes.
* Percentage of training records with verified evidence.
* Rollback reliability.
* Unauthorized-action rate.
* Human-review burden.
* Capacity allocation adherence.

---

## 23. Non-Goals

TreeSeed Platform in a Box is not intended to:

* Store source code losslessly inside adapters.
* Eliminate repositories or documentation.
* Allow models to self-authorize.
* Train indiscriminately on every interaction.
* Replace deterministic testing with model judgment.
* Guarantee that continual training always improves performance.
* Compose unlimited adapters without interference.
* Treat unified memory as unlimited memory.
* Remove the need for retrieval.
* Create an ungoverned self-modifying intelligence.

---

## 24. North-Star Operating Model

The complete system should eventually behave as follows:

```text
Humans and agents maintain project objectives.

Agents research, propose, estimate, implement, and verify work.

TreeSeed records evidence, outcomes, and decisions.

Project artifacts are transformed into persistent project cognition.

Teacher agents inspect experience and generate better learning material.

Axolotl trains candidate project, role, and capability adapters.

The adapter compiler assembles modular capabilities into deployable adapters.

Guarantees and evaluations determine whether candidates improve the system.

TreeSeed governs promotion.

vLLM serves the accepted base and adapters.

The improved agents begin the next workday.
```

The cycle repeats, but not blindly.

Every cycle should increase one or more of:

* Understanding.
* Reliability.
* Efficiency.
* Specialization.
* Evidence quality.
* Institutional memory.
* Autonomy within governance.

---

## 25. Final Principle

The central product is not a model, an adapter, or an agent.

It is a **governed learning institution that fits inside an affordable computer**.

The hardware provides capacity.
Linux provides the operating foundation.
vLLM provides efficient cognition during active work.
Axolotl provides learning during consolidation.
QLoRA adapters provide modular specialization.
Teacher agents convert experience into education.
The adapter compiler turns modular learning into deployable capability.
TreeSeed provides memory, authority, coordination, and accountability.

The system should remain useful even when any individual model becomes obsolete.

Models will change.
Quantization formats will change.
Training frameworks will change.
Hardware will change.

The durable architecture is the cycle:

```text
Evidence
→ Experience
→ Teaching
→ Learning
→ Validation
→ Governance
→ Action
→ New evidence
```

That cycle is the foundation of the evolving platform in a box.
