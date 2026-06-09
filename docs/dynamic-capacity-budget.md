# Dynamic Centralized Capacity Credits Completion Record

Status: Complete. Phases 1 through 9 are implemented in the Treeseed PostgreSQL control plane, SDK capacity model, agent provider runtime, UI, seed flow, CLI migration surface, and default-mode hardening.
Date: 2026-05-20
Scope: `treeseed/market`, `packages/sdk`, `packages/agent`, `packages/cli`, `packages/core`

## Executive Summary

TreeSeed no longer asks humans to configure provider availability in TreeSeed credits for the native-capacity path. Humans configure only the values they know or can reasonably forecast: seats, monthly dollars, token budgets, work windows, concurrency, provider reset cadence, reserve buffers, and portfolio allocation percentages. TreeSeed derives provider credit availability centrally from those native limits, active reservations, actual native usage, and learned native-to-credit conversion profiles.

The implemented architecture is:

```text
Human-entered native limits
  -> execution provider capacity envelopes
  -> centralized native remaining calculation
  -> learned native-units-per-credit conversion
  -> derived available credits
  -> route and reserve capacity
  -> execution provider reports raw usage facts
  -> centralized actual credit calculation
  -> capacity settlement ledger
  -> learned conversion profile update
```

The only place humans enter credits or percentages is governance and portfolio allocation, not provider inventory. For example: “Project A may use 40% of the team Codex seat” or “this workday may use 100 credits of total organizational capacity” is appropriate. “This Codex seat has 1,300 credits/month” is a derived projection.

## Why Change

The capacity model already has many of the right pieces: capacity providers, lanes, grants, reservations, routing decisions, ledgers, task estimates, usage actuals, and learned task profiles. Dynamic capacity budgeting completes the transition away from manually-entered provider inventory fields such as `daily_credit_budget` and `monthly_credit_budget`.

That forces humans to guess a number they do not actually know. A human usually knows:

```text
I have one Codex subscription.
I am willing to let it run one task at a time.
I am comfortable using it about 4 hours per workday.
I want to hold back 25% as a safety buffer.
```

A human may also know:

```text
I have a $75/month OpenRouter budget.
I want no more than $3/day spent on this project.
I want 20% reserved for incidents or retries.
```

Humans do not naturally know:

```text
This provider has 1,287.5 TreeSeed credits/month.
```

TreeSeed learns that number.

## Core Product Principle

TreeSeed credits are a normalized internal currency for bounded useful work. They are not entered as provider inventory except in explicit static/hybrid compatibility mode.

Humans enter:

```text
native provider capacity
portfolio allocation policy
risk and governance policy
```

TreeSeed derives:

```text
available provider credits
actual task credits
remaining credit balance
provider pressure
route score
estimate confidence
```

## Non-Goals

This plan does not implement external billing, invoices, or customer plan pricing. It does not require perfect provider introspection. Opaque subscription providers such as Codex and some Copilot plans can still work from configured work windows, concurrency, observed throttling, interruptions, and actual task duration.

This plan also does not remove TreeSeed credits from work policies, task estimates, or portfolio governance. Credits remain the central scheduling currency. The change is that provider availability credits become derived rather than manually entered.

## Current Reality To Preserve

TreeSeed preserves the current runtime shape while replacing the source of provider inventory.

Existing concepts to keep:

```text
capacity_providers
capacity_provider_lanes
capacity_grants
capacity_reservations
capacity_routing_decisions
capacity_ledger_entries
task_estimates
task_usage_actuals
task_estimate_profiles
```

Existing SDK functions to preserve and evolve:

```text
reserveCreditsForEstimate
routeAndReserveCapacity
settleCapacityActuals
buildTaskEstimateProfileFromActuals
summarizeCapacityPlan
summarizeProjectCapacityPlan
summarizeTeamCapacityPlan
shouldInterruptForCapacity
```

Existing behavior to preserve:

```text
manager evaluates task admission and capacity budget
worker reserves capacity or records capacity metadata
handler executes work
worker records usage
manager observes completion and may seed follow-up work
UI exposes capacity plans, reservations, ledgers, actuals, and approval thresholds
```

## Target Architecture

### 1. Execution Provider Native Capacity

An execution provider is the real work surface:

```text
Codex subscription seat
Copilot subscription or token budget
OpenRouter API key and budget
local model runner
human review pool
custom automation runner
```

Execution providers expose native capacity facts. Examples:

```yaml
codex-pro-seat:
  kind: codex_subscription
  seats: 1
  maxConcurrentWorkers: 1
  nativeUnit: wall_minute
  workWindowMinutesPerDay: 240
  workdaysPerMonth: 22
  reserveBufferPercent: 25
  quotaVisibility: opaque

openrouter-standard:
  kind: token_metered_api
  nativeUnit: usd
  dailyUsdLimit: 3
  monthlyUsdLimit: 75
  reserveBufferPercent: 10
  quotaVisibility: exact

copilot-team-budget:
  kind: copilot_token_budget
  nativeUnit: token
  monthlyTokenBudget: 10000000
  maxConcurrentWorkers: 2
  reserveBufferPercent: 20
  quotaVisibility: partial
```

### 2. Capacity Provider As Economic/Policy Aggregator

A capacity provider is no longer the place where native provider inventory is manually translated into credits. It is the economic and routing container for one or more execution providers.

A capacity provider answers:

```text
Who owns this capacity?
Which teams/projects may use it?
Which lanes are available?
Which execution providers back those lanes?
What portfolio allocation rules apply?
What overflow and governance policies apply?
```

### 3. Capacity Lanes As Route Surfaces

A lane describes a schedulable route:

```text
codex-implementation
codex-review
openrouter-cheap-summary
openrouter-long-context
copilot-fast-edit
human-approval
```

Each lane links to one or more execution providers and carries routing rules:

```yaml
lane:
  name: codex-implementation
  businessModel: subscription_quota
  modelClass: coding
  nativeUnit: wall_minute
  routingPolicy:
    taskKinds:
      - engineer.small_fix
      - docs.mutation
    requiredCapabilities:
      - repository_write
    maxActiveReservations: 1
    repositoryMutationAllowed: true
    maxRisk: medium
```

### 4. Grants As Governance Allocation

Capacity grants remain the governance allocation surface. They support both credit ceilings and portfolio percentages, but they are not used as the primary provider inventory source.

Grant model:

```yaml
grant:
  scope: project
  project: market
  provider: codex-team-seat
  allocation:
    mode: percent
    percentOfProviderCapacity: 40
  hardCeilings:
    dailyCredits: 80
    dailyUsd: null
    weeklyQuotaMinutes: null
  overflowPolicy: deny
```

The portfolio allocation exception is important: humans may reasonably decide that one project gets 40% of a provider’s derived capacity and another gets 60%. They do not decide how many credits the provider itself has.

### 5. Central Credit Estimator

The canonical estimator lives in `packages/sdk/src/capacity.ts`.

It owns two calculations:

```text
available credit projection
actual credit calculation
```

The same variables and conversion profiles must power both.

## Canonical Concepts

### Native Capacity Envelope

A native capacity envelope is the human-entered or provider-observed source of truth.

```ts
type NativeCapacityEnvelope = {
  executionProviderId: string;
  nativeUnit: 'wall_minute' | 'quota_minute' | 'usd' | 'token' | 'request' | 'gpu_second' | 'human_minute' | 'custom';
  limitScope: 'daily' | 'weekly' | 'monthly' | 'session' | 'rolling_window';
  limitAmount: number;
  reserveBufferPercent: number;
  resetCadence?: 'daily' | 'weekly' | 'monthly' | 'provider_defined' | 'none';
  resetAt?: string | null;
  confidence: 'exact' | 'estimated' | 'opaque';
  source: 'configured' | 'observed' | 'learned' | 'manual_override';
};
```

### Native Usage Observation

Execution adapters report raw usage facts, not precomputed credits.

```ts
type NativeUsageObservation = {
  taskId: string;
  workDayId?: string | null;
  projectId: string;
  executionProviderId: string;
  executionProfileId: string;
  taskSignature: string;
  startedAt?: string | null;
  completedAt?: string | null;
  nativeUsage: {
    wallMinutes?: number | null;
    quotaMinutes?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cachedInputTokens?: number | null;
    usd?: number | null;
    requests?: number | null;
    gpuSeconds?: number | null;
  };
  effortSignals: {
    filesOpened?: number | null;
    filesChanged?: number | null;
    diffLinesAdded?: number | null;
    diffLinesRemoved?: number | null;
    testRuns?: number | null;
    retryCount?: number | null;
    checkpointsCreated?: number | null;
  };
  outcome: {
    completed: boolean;
    interrupted: boolean;
    verificationPassed?: boolean | null;
    continuationRequired?: boolean | null;
    qualityScore?: number | null;
  };
  metadata?: Record<string, unknown>;
};
```

### Credit Conversion Profile

A credit conversion profile is the learned bridge between native usage and TreeSeed credits.

```ts
type CreditConversionProfile = {
  taskSignature: string;
  executionProfileId: string;
  executionProviderKind: string;
  nativeUnit: string;
  sampleCount: number;
  completedSampleCount: number;
  nativeUnitsPerCreditP50: number | null;
  nativeUnitsPerCreditP90: number | null;
  creditsPerNativeUnitP50: number | null;
  creditsPerNativeUnitP90: number | null;
  actualCreditsP50: number | null;
  actualCreditsP90: number | null;
  confidence: 'low' | 'medium' | 'high';
  formulaVersion: string;
  updatedAt: string;
};
```

## Available Credit Projection

Available credits are derived centrally.

### Formula

```text
native_limit
  - native_consumed
  - native_reserved
  - native_safety_buffer
  = native_remaining

native_remaining / learned_native_units_per_credit_p90
  = derived_available_credits
```

Then apply route constraints:

```text
derived_available_credits
  capped by concurrency
  capped by project/workday governance budget
  capped by portfolio allocation percentage
  capped by lane hard limits
  adjusted by provider health/throttle pressure
```

### Generic Algorithm

```ts
function deriveAvailableCredits(input: {
  executionProvider: ExecutionProvider;
  nativeEnvelopes: NativeCapacityEnvelope[];
  activeReservations: CapacityReservation[];
  ledgerEntries: CapacityLedgerEntry[];
  conversionProfiles: CreditConversionProfile[];
  taskSignature?: string;
  executionProfileId?: string;
  grantAllocation?: PortfolioAllocationPolicy;
  workPolicy?: WorkPolicyBudgetEnvelope;
  now: string;
}): DerivedCapacityAvailability {
  // 1. Resolve the relevant native envelope.
  // 2. Sum native consumed usage for the active reset window.
  // 3. Sum native reserved usage for active reservations.
  // 4. Apply reserve buffer.
  // 5. Select learned native-units-per-credit p90.
  // 6. Convert native remaining into credits.
  // 7. Apply concurrency and governance caps.
  // 8. Return explainable availability with all intermediate values.
}
```

### Example: Codex Subscription

Human enters:

```yaml
seats: 1
maxConcurrentWorkers: 1
workWindowMinutesPerDay: 240
workdaysPerMonth: 22
reserveBufferPercent: 25
nativeUnit: wall_minute
quotaVisibility: opaque
```

TreeSeed observes:

```text
used today: 60 wall minutes
reserved: 30 wall minutes
learned p90: 5 wall minutes per credit
```

TreeSeed derives:

```text
usable native day = 240 * 0.75 = 180 minutes
native remaining = 180 - 60 - 30 = 90 minutes
derived available credits = 90 / 5 = 18 credits
concurrency available = 0 or 1 depending active worker
```

No human entered “18 credits.”

### Example: OpenRouter Budget

Human enters:

```yaml
monthlyUsdLimit: 75
dailyUsdLimit: 3
reserveBufferPercent: 10
nativeUnit: usd
quotaVisibility: exact
```

TreeSeed observes:

```text
used today: $0.90
reserved: $0.60
learned p90: $0.03 per credit
```

TreeSeed derives:

```text
usable native day = $3.00 * 0.90 = $2.70
native remaining = $2.70 - $0.90 - $0.60 = $1.20
derived available credits = $1.20 / $0.03 = 40 credits
```

### Example: Copilot Token Budget

Human enters:

```yaml
monthlyTokenBudget: 10000000
reserveBufferPercent: 20
nativeUnit: token
quotaVisibility: partial
```

TreeSeed observes:

```text
used this month: 2,000,000 tokens
reserved: 1,000,000 tokens
learned p90: 8,000 tokens per credit
```

TreeSeed derives:

```text
usable native month = 10,000,000 * 0.80 = 8,000,000 tokens
native remaining = 8,000,000 - 2,000,000 - 1,000,000 = 5,000,000 tokens
derived available credits = 5,000,000 / 8,000 = 625 credits
```

## Actual Credit Calculation

Execution adapters do not report `actualCredits` as an authoritative value. They report usage facts. TreeSeed calculates actual credits centrally.

### Formula Inputs

Use the same normalized usage variables across providers:

```text
taskSignature
executionProfileId
executionProviderKind
wallMinutes
quotaMinutes
inputTokens
outputTokens
cachedInputTokens
usd
requests
filesOpened
filesChanged
diffLinesAdded
diffLinesRemoved
testRuns
retryCount
completed/interrupted
verificationPassed
qualityScore
```

### Calculation Strategy

Actual credits are calculated in layers:

```text
Layer 1: intrinsic work estimate fallback
Layer 2: native usage conversion
Layer 3: effort signal adjustment
Layer 4: outcome adjustment
Layer 5: guardrails and caps
```

Implemented behavior:

```ts
function calculateActualCredits(input: NativeUsageObservation & {
  reservedCredits: number;
  estimateProfile?: TaskEstimateProfile | null;
  conversionProfile?: CreditConversionProfile | null;
  policy?: ActualCreditPolicy;
}): ActualCreditResult {
  // If a high-confidence conversion profile exists, use native usage / nativeUnitsPerCreditP50.
  // If confidence is medium, blend native conversion with effort signals.
  // If confidence is low, use conservative fallback based on reserved credits and effort signals.
  // Interrupted work records partial consumed credits but does not update completed-cost p90 as if complete.
}
```

### Conservative Bootstrap Formula

Before enough learning data exists, use a simple provider-neutral formula:

```text
actualCredits = max(
  minTaskCredits,
  timeCredits + changeCredits + verificationCredits + retryCredits
)
```

Example for Codex:

```text
timeCredits = ceil(wallMinutes / 5)
changeCredits = filesChanged * 2
verificationCredits = testRuns * 1
retryCredits = retryCount * 3
```

Example:

```text
wallMinutes = 18 -> 4 credits
filesChanged = 2 -> 4 credits
testRuns = 1 -> 1 credit
retryCount = 0 -> 0 credits
actualCredits = 9
```

After the system has enough samples, the learned conversion profile dominates.

### Learned Formula

For a high-confidence profile:

```text
actualCredits = nativeUsage / nativeUnitsPerCreditP50
```

For reservation safety and future estimates, use p90:

```text
reservedCredits = expectedNativeUsageP90 / nativeUnitsPerCreditP90
```

This keeps actuals closer to observed reality while reservations remain conservative.

## Central Currency Balance

Every provider exposes a single explainable balance projection:

```text
native limit
native consumed
native reserved
native buffer
native remaining
learned native units per credit
available credits
active reserved credits
consumed credits
portfolio allocation cap
workday cap
schedulable credits
```

The UI never shows only a magic number like “18 credits left.” It shows why:

```text
Codex Pro Seat
Native basis: 240 wall minutes/day, 25% buffer
Used: 60 min
Reserved: 30 min
Remaining native: 90 min
Learned conversion: 5 min/credit p90
Derived availability: 18 credits
Concurrency: 1 worker max, 0 active
Schedulable: 18 credits
```

## Portfolio Credit Percentage Budgeting

Portfolio allocation is the exception where humans enter credit percentages or project-level policy.

A team may configure:

```yaml
portfolioBudget:
  provider: codex-pro-seat
  allocations:
    market: 50%
    customer-hubs: 30%
    maintenance: 15%
    emergency: 5%
```

TreeSeed applies those percentages after deriving provider availability:

```text
provider derived daily availability = 100 credits
market allocation = 50%
market max derived share = 50 credits
```

Portfolio budgeting supports:

```text
percent of derived capacity
minimum reserve percentage
maximum daily project credits
priority weight
emergency override
manual approval for borrowing from reserve
```

## Drizzle Schema Plan

Market control-plane capacity budgeting tables are PostgreSQL tables owned by `packages/sdk/src/db/market-schema.ts`. Do not add hand-authored top-level SQL migrations for this work. Generate the checked-in Treeseed PostgreSQL artifact with `npm run db:generate:market`.

SDK/Core D1 storage is separate and intentionally small. It is only for unauthenticated static knowledge-hub form storage (`runtime_records`, `subscribers`, and `contact_submissions`). D1 migration artifacts are generated with `npm -w packages/sdk run db:generate:d1` and are not used by the API.

The table summaries below are logical review notes only. The implementation source of truth is Drizzle.

### Execution Providers

Implemented in the Treeseed PostgreSQL Drizzle schema as `execution_providers`.
The table stores the execution provider's team, optional capacity provider owner, name,
kind, status, native unit, quota visibility, worker concurrency, reset cadence,
configuration, metadata, and timestamps.

```text
Source of truth: packages/sdk/src/db/market-schema.ts
Generated artifact: packages/sdk/drizzle/market/0000_market_control_plane.sql
```

### Native Capacity Envelopes

Implemented in the Treeseed PostgreSQL Drizzle schema as `execution_provider_native_limits`.
The table stores human-entered native facts: scope, native unit, limit amount, reserve
buffer, reset cadence, reset time, confidence, source, metadata, and timestamps.

```text
Source of truth: packages/sdk/src/db/market-schema.ts
Generated artifact: packages/sdk/drizzle/market/0000_market_control_plane.sql
```

### Provider Observations

Implemented in the Treeseed PostgreSQL Drizzle schema as `execution_provider_observations`.
The table stores observed health, active workers, queued tasks, throttle state, native
remaining facts, reset time, confidence, and metadata.

```text
Source of truth: packages/sdk/src/db/market-schema.ts
Generated artifact: packages/sdk/drizzle/market/0000_market_control_plane.sql
```

### Native Usage Observations

Implemented in the Treeseed PostgreSQL Drizzle schema as `native_usage_observations`.
The table stores raw native usage JSON, effort signals, outcome metadata, formula version,
execution provider, execution profile, task signature, and creation time. It is indexed by
task/profile and provider so learning can aggregate completed work without scanning all
usage actuals.

```text
Source of truth: packages/sdk/src/db/market-schema.ts
Generated artifact: packages/sdk/drizzle/market/0000_market_control_plane.sql
```

### Credit Conversion Profiles

Implemented in the Treeseed PostgreSQL Drizzle schema as `credit_conversion_profiles`.
Rows are keyed by the learned conversion dimensions:

```text
task_signature
execution_profile_id
execution_provider_kind
native_unit
```

The table keeps sample counts, completed/interrupted counts, native-units-per-credit
p50/p90, credits-per-native-unit p50/p90, actual-credit p50/p90, confidence, formula
version, metadata, and timestamps. `id` is the physical primary key for adapter
compatibility, and Drizzle enforces a unique index on the logical learning key above.

```text
Source of truth: packages/sdk/src/db/market-schema.ts
Generated artifact: packages/sdk/drizzle/market/0000_market_control_plane.sql
```

### Link Reservations To Execution Provider

Optional execution-provider columns are present on reservations, ledger entries, routing decisions, and usage actuals.
These columns are Drizzle-owned Treeseed PostgreSQL schema fields, not hand-authored root SQL migrations.

```text
Source of truth: packages/sdk/src/db/market-schema.ts
Generated artifact: packages/sdk/drizzle/market/0000_market_control_plane.sql
```

### Derived Budget Mode

Credit budget columns remain on `capacity_providers` as explicit compatibility fields. `credit_budget_mode` controls whether those fields are used.

```text
capacity_providers.credit_budget_mode defaults to derived.
The column is owned by the Treeseed PostgreSQL Drizzle schema.
```

Allowed values:

```text
static
hybrid
derived
```

Migration behavior:

```text
static: explicit legacy compatibility mode, uses daily/monthly credit budgets
hybrid: explicit compatibility mode, derives provider inventory but still allows a static cap
derived: default mode, provider credit availability is calculated from execution provider native envelopes
```

`static` is legacy-only and must be explicitly selected. Missing persisted modes are migrated to `derived`; runtime code does not infer static behavior from daily/monthly budget fields or metadata.

## SDK Implementation

### Implementation Surface

The dynamic capacity system is intentionally consolidated in the SDK capacity model instead of split into standalone subsystems. `packages/sdk/src/capacity.ts` owns native usage helpers, actual-credit calculation, conversion profile learning, derived availability, routing and reservation decisions, portfolio caps, settlement, and summaries. Shared public types live in `packages/sdk/src/sdk-types.ts`.

### Implemented Functions

```ts
nativeUsageUnit(input): NativeUsageUnit | null
nativeUsageAmount(input, unit): number | null
selectCreditConversionProfile(input): CreditConversionProfile | null
deriveAvailableCredits(input): DerivedCapacityAvailability
calculateActualCredits(input): ActualCreditResult
buildCreditConversionProfileFromActuals(input): CreditConversionProfile
routeAndReserveCapacity(input): CapacityRouteResult
settleCapacityActuals(input): CapacitySettlementResult
```

### Evolved Existing Functions

`reserveCreditsForEstimate` produces central reserve estimates from task profiles, bootstrap estimation, and explicit override context:

```ts
reserveCreditsForEstimate({
  taskSignature,
  executionProfile,
  profiles,
  conversionProfile,
  nativeEstimate,
  confidence,
})
```

`routeAndReserveCapacity` uses derived provider availability for `derived` providers, applies the stricter of derived availability and explicit governance caps for `hybrid`, and preserves static behavior only for explicitly declared `static` providers.

`settleCapacityActuals` accepts centrally calculated actuals and native actuals:

```ts
settleCapacityActuals({
  reservation,
  actualCredits,
  nativeUsage,
  actualUsd,
  providerUnits,
  formulaVersion,
})
```

## Agent Runtime Implementation

### Execution Adapter Contract

Execution adapters return native usage facts.

Adapter result pattern:

```ts
return {
  status: 'completed',
  summary,
  stdout,
  stderr,
};
```

Target pattern:

```ts
return {
  status: 'completed',
  summary,
  stdout,
  stderr,
  usageObservation: {
    executionProviderId,
    executionProfileId,
    taskSignature,
    nativeUsage: {
      wallMinutes,
      quotaMinutes,
      inputTokens,
      outputTokens,
      usd,
    },
    effortSignals: {
      filesOpened,
      filesChanged,
      diffLinesAdded,
      diffLinesRemoved,
      testRuns,
      retryCount,
    },
    outcome: {
      completed: true,
      interrupted: false,
      verificationPassed,
    },
  },
};
```

### Codex Adapter

Codex subscription adapters may not have exact token or quota data. They report:

```text
wall minutes
active session start/end
files opened/changed
diff lines
commands/test runs
retry/interruption state
credential/session health
throttle or provider exhaustion signals
```

### Copilot Adapter

Copilot adapters report:

```text
tokens if available
wall minutes
request count if available
files changed
test runs
retry count
throttle state
```

### OpenRouter Adapter

OpenRouter adapters report:

```text
input tokens
output tokens
cached input tokens
model name
provider USD cost if known
request count
latency/wall minutes
```

## API and Store Implementation

### Store Writes

When a task completes:

```text
1. Store native usage observation.
2. Calculate actual credits centrally.
3. Store task_usage_actuals with actual_credits and native_usage_json.
4. Settle reservation into capacity_ledger_entries.
5. Update task_estimate_profiles.
6. Update credit_conversion_profiles.
7. Regenerate capacity summaries/projections.
```

### Completion API

The task completion API does not trust arbitrary `actualCredits` from request bodies by default.

New behavior:

```text
if usageObservation exists:
  actualCredits = calculateActualCredits(usageObservation)
else if legacy actualCredits exists and legacy override is enabled:
  use legacy value and mark source=legacy_override
else:
  actualCredits = reservedCredits and mark source=fallback_reserved
```

### Capacity Plan API

Capacity plan responses include both native and derived views:

```json
{
  "executionProvider": "codex-pro-seat",
  "native": {
    "unit": "wall_minute",
    "limit": 240,
    "used": 60,
    "reserved": 30,
    "buffer": 60,
    "remaining": 90,
    "confidence": "estimated"
  },
  "conversion": {
    "nativeUnitsPerCreditP90": 5,
    "sampleCount": 18,
    "confidence": "medium"
  },
  "credits": {
    "derivedAvailable": 18,
    "portfolioCap": 9,
    "workdayCap": 12,
    "schedulable": 9
  }
}
```

## UI Implementation

### Capacity Provider Page

Replace manual provider credit inputs with native provider setup.

Human-facing fields:

```text
Provider type
Subscription or API budget
Native unit
Monthly USD/token/minute limit
Daily work window
Workdays per month
Max concurrent workers
Reserve buffer percent
Quota visibility
Reset cadence
```

Hide or de-emphasize:

```text
daily credit budget
monthly credit budget
```

If legacy static mode is still active, show a warning:

```text
This provider uses static credit inventory. Switch to derived capacity to let TreeSeed calculate available credits from native limits and learned usage.
```

### Capacity Dashboard

Show derived capacity with an explanation table:

```text
Native limit
Used native units
Reserved native units
Safety buffer
Native remaining
Learned conversion
Derived available credits
Portfolio allocation
Schedulable credits
```

### Grant UI

Grant UI focuses on allocation:

```text
Which team/project/environment?
Which provider/lane?
Percent of derived provider capacity?
Optional max daily/monthly credit ceiling?
Optional native ceiling, such as daily USD?
Overflow policy?
Priority weight?
```

### Workday UI

Workdays show:

```text
admitted credits
consumed credits
native provider usage
remaining derived provider availability
interruptions due to native exhaustion
portfolio borrowing or denial decisions
```

## CLI Implementation

### `trsd capacity providers new`

Prompt for native facts, not credits.

Example Codex prompt:

```text
Provider kind: Codex subscription
Seats: 1
Max concurrent workers: 1
Work window minutes per day: 240
Workdays per month: 22
Reserve buffer percent: 25
Quota visibility: opaque
```

### `trsd capacity plan`

Show native-to-credit derivation:

```text
trsd capacity plan --project project_123 --environment local

codex_subscription:wall_minute
  limit 480
  observed 300
  reserved 60
  reserve 20%
  conversion 10 native/credit
  derived 24 credits
  confidence high
```

`trsd capacity plan --provider local` remains the provider-runtime dry-run path and now includes a native budget-file summary when the provider budget file declares execution providers and native limits.

### `trsd capacity migrate --to-derived`

For existing providers, require native facts explicitly and preserve existing static provider credit budgets as hybrid fallback caps instead of inventing provider inventory.

```bash
trsd capacity migrate --to-derived \
  --team team_123 \
  --provider provider_123 \
  --kind codex_subscription \
  --native-unit wall_minute \
  --limit 480 \
  --scope daily \
  --reset-cadence daily \
  --quota-visibility opaque \
  --reserve-buffer-percent 20 \
  --max-concurrent-workers 4 \
  --project project_123 \
  --portfolio-allocation-percent 100 \
  --dry-run
```

## Phased Implementation Record

### Phase 0: Decision and Compatibility Guardrails

Deliverables:

```text
Architecture decision record
SDK type skeletons
credit_budget_mode column
derived behavior active by default
```

Acceptance criteria:

```text
Current tests pass with explicit mode coverage.
Static credit providers continue working only when explicitly marked static or hybrid.
Derived types are active by default for new native-capacity providers.
```

### Phase 1: Native Capacity Data Model

Deliverables:

```text
execution_providers table
execution_provider_native_limits table
execution_provider_observations table
store methods
API serialization
seed support
basic UI read model
```

Acceptance criteria:

```text
A Codex execution provider can be configured with native values only.
An OpenRouter execution provider can be configured with USD limits only.
Capacity UI shows native envelopes.
No derived scheduling behavior yet required.
```

### Phase 2: Central Actual Credit Calculator

Implementation status:

```text
Implemented in packages/sdk/src/capacity.ts as calculateActualCredits.
Native usage facts are stored in native_usage_observations through the API store.
task_usage_actuals records credit_formula_version, actual_credit_source, and native_usage_json.
Provider usage and runner capacity settlement calculate actual credits centrally.
Legacy actualCredits remains available only as an explicit override or fallback compatibility path.
```

Deliverables:

```text
NativeUsageObservation type
calculateActualCredits function
native_usage_observations table
completion API calculates actual credits centrally
legacy actualCredits marked as override/fallback
Codex/Copilot/OpenRouter adapters emit usage observations where possible
```

Acceptance criteria:

```text
Execution providers report raw facts, not authoritative actual credits.
Task usage actuals record formula version and native usage.
Interrupted work records partial actuals separately from completed actuals.
Existing settlement logic receives centrally calculated actual credits.
```

### Phase 3: Credit Conversion Learning

Implementation status:

```text
Implemented as Treeseed PostgreSQL credit_conversion_profiles plus SDK conversion helpers.
Profiles learn native-units-per-credit by taskSignature, executionProfileId, executionProviderKind, and nativeUnit.
Completed samples update conversion p50/p90; interrupted samples remain separate pressure/partial metadata.
High-confidence profiles can influence calculateActualCredits; low-confidence profiles keep Phase 2 bootstrap behavior.
```

Deliverables:

```text
credit_conversion_profiles table
buildCreditConversionProfileFromActuals function
profile update job or completion-time update
confidence scoring
outlier handling
interrupted-sample handling
```

Acceptance criteria:

```text
TreeSeed can learn native units per credit by taskSignature + executionProfileId.
Completed samples update completed-cost profiles.
Interrupted samples inform exhaustion/pressure but do not poison completed p90 estimates.
Low-sample profiles remain low confidence.
```

### Phase 4: Derived Available Credit Projection

Implementation status:

```text
Implemented as SDK deriveAvailableCredits plus API capacity summary integration.
Derived availability uses execution providers, native limits, latest observations, active native reservations, reserve buffers, and credit conversion profiles.
Market reservations store execution_provider_id, native_unit, reserved_native_amount, and consumed_native_amount for durable native pressure tracking.
Existing routing and task admission behavior remains unchanged until Phase 5.
```

Deliverables:

```text
deriveAvailableCredits function
native remaining calculation
active native reservation calculation
native buffer calculation
conversion to derived credits
explainable derived availability object
capacity summary integration
```

Acceptance criteria:

```text
For Codex, available credits derive from minutes, buffers, reservations, and learned minutes/credit.
For OpenRouter, available credits derive from USD/token budgets and learned USD/tokens per credit.
Capacity summaries expose native and derived values.
No human-entered provider credit budget is required in derived mode.
```

### Phase 5: Router Integration

Implementation status:

```text
Implemented as derived-capacity-aware SDK routing plus API plan integration.
Project capacity plans include derivedCapacity so task admission can route against the same native availability shown in summaries.
Derived providers route on medium/high-confidence native-derived availability and create native reservations.
Hybrid providers use derived availability when confidence is sufficient while preserving existing grant/static caps as governance limits.
Static providers keep legacy grant/static credit routing.
Phase 5 uses existing capacity grants as the portfolio/governance cap; percent-of-derived-capacity allocation remains Phase 6.
```

Deliverables:

```text
routeAndReserveCapacity reads derived availability in derived mode
reservations include execution_provider_id
reservations include reserved native units where estimable
lane scoring includes derived provider pressure
fallback lanes work across native units
```

Acceptance criteria:

```text
A route can be blocked because native provider capacity is exhausted.
A route can be blocked because the existing grant/governance cap is exhausted.
A route can spill over to another provider/lane when policy allows.
Routing candidates explain native pressure, derived credits, and confidence.
```

### Phase 6: Portfolio Percentage Budgeting

Implementation status:

```text
Implemented through existing capacity grants, not provider inventory.
Grant metadata stores portfolioAllocationPercent, reservePoolPercent, maxDailyProjectCredits, and emergencyOverride.
Derived and hybrid routing apply percent-of-derived-capacity after provider availability is derived from native limits and learned conversion profiles.
Reserve pools hold back part of an allocation unless a grant allows emergency override and the route explicitly requests it.
Provider setup remains native-only; humans allocate portfolio share by understandable percentages and project caps.
```

Deliverables:

```text
portfolio allocation schema in grants or grant metadata
percent-of-derived-capacity calculation
reserve pool support
emergency override policy
UI and CLI grant controls
```

Acceptance criteria:

```text
Humans can allocate provider capacity by percentage across projects.
Provider inventory remains derived from native limits.
Project schedulable credits are capped by allocation percentage.
Portfolio reserve is preserved unless explicitly borrowed.
Emergency override can borrow from reserve only when enabled on the grant and requested by the route.
```

### Phase 7: UI Migration

Implementation status:

```text
Implemented as a UI-only migration over the Phase 1-6 API and SDK behavior.
Provider setup and edit screens prioritize native provider facts: provider kind, native unit, reset window, quota visibility, concurrency, and reserve buffers.
Capacity provider pages explain native limits, active native reservations, learned conversion confidence, derived credits, and portfolio allocation.
Allocation controls live inside the provider workflow instead of restoring standalone grant pages.
Project workday views expose native usage, derived balances, native reservation pressure, and routing explanations through the API facade.
Legacy static credit values remain compatibility data and are not required for derived providers.
Market control-plane data remains PostgreSQL/Drizzle-owned; D1 is unrelated to this work.
```

Deliverables:

```text
Provider setup form uses native inputs
Provider edit form shows static/hybrid/derived mode
Capacity page explains derivation
Provider allocation controls add allocation percentage mode
Workday/project views expose native usage and derived balances
```

Acceptance criteria:

```text
Users can configure a Codex subscription without entering provider credits.
Users can configure OpenRouter with USD/token values without entering provider credits.
Users can still set project allocation percentages and optional governance ceilings.
Legacy static credit fields are available only in advanced/compatibility mode.
```

### Phase 8: CLI and Seed Migration

Implementation status:

```text
Implemented in packages/sdk seed schema/types/normalization.
Implemented in Market seed apply/export through existing Market store execution-provider/native-limit methods.
Implemented in seeds/treeseed.yaml as derived local Codex-style wall-minute capacity with portfolio allocation.
Implemented in packages/cli capacity plan and migrate commands.
No new database schema or routing behavior was added in Phase 8.
```

Deliverables:

```text
Seed format supports executionProviders
Local seed moves local capacity to derived mode
trsd capacity migrate --to-derived
trsd capacity plan explains native-to-credit projection
```

Acceptance criteria:

```text
Local development seed creates derived native capacity.
Staging/prod seeds can represent Codex, Copilot, and OpenRouter without provider credit inventory.
Migration command preserves old static budgets as fallback caps.
```

### Phase 9: Hardening and Removal of Default Static Mode

Implemented as default-mode hardening across Treeseed PostgreSQL, the SDK router, the API/store boundary, UI copy, CLI migration behavior, and tests.

Deliverables:

```text
Derived mode is the database and runtime default for new providers.
Static mode is explicit legacy compatibility only.
Missing persisted credit_budget_mode values migrate to derived.
SDK routing no longer infers static mode from daily/monthly credit budgets or metadata.
Operator surfaces warn about low-confidence or missing conversion as learning.
Property tests cover native-to-credit availability invariants.
Codex, Copilot, and OpenRouter-style provider flows remain covered through native seed, CLI, and API tests.
```

Acceptance criteria:

```text
New providers never require daily/monthly credit budget input.
All capacity plans are explainable in native and credit terms.
Actual credits and available credits use the same central calculation inputs.
Provider-specific adapters cannot silently bypass central credit calculation.
```

## Compatibility Strategy

### Compatibility Modes

The runtime supports three explicit modes:

```text
static: explicit legacy compatibility behavior
hybrid: native-derived availability with an explicit manual credit cap
derived: native-derived availability only, plus governance allocations
```

Current default posture:

```text
local: derived first
staging: derived by default, hybrid only for explicit migration fallback caps
prod: derived by default, static only for explicit legacy compatibility providers
new providers: derived by default
```

### Backfill Existing Providers

For existing capacity providers with only credit budgets:

```text
1. Preserve static credits only as an explicit hybrid fallback cap when requested.
2. Prompt operator for native facts.
3. Create execution_provider record.
4. Create native capacity limit records.
5. Set credit_budget_mode = hybrid.
6. After enough actuals, switch to derived.
```

### Fallback Behavior

If no learning profile exists:

```text
use bootstrap conversion from provider kind and native unit
mark confidence low
apply larger reserve buffer
require approval for high-risk/high-cost tasks
```

If native usage is missing:

```text
use wall time and effort signals
mark observation partial
settle credits conservatively
keep conversion profile low confidence
```

If provider health is unknown:

```text
reduce schedulable credits
block mutation-heavy routes if stale beyond threshold
show provider observation stale warning
```

## Verification Coverage

### SDK Unit Tests

Covered by tests for:

```text
native envelope normalization
derived availability calculation
native buffer calculation
active native reservation subtraction
credit conversion profile selection
actual credit calculation from usage observations
interrupted usage handling
portfolio percent capping
hybrid static cap behavior
```

### Store/API Tests

Covered by tests for:

```text
execution provider CRUD
native limit CRUD
native observation writes
usage observation writes
completion route central actual credit calculation
capacity summary native + derived payload
legacy override behavior
```

### Agent Tests

Covered by tests for:

```text
Codex adapter reports wall minutes and effort signals
Copilot adapter reports available native usage fields
OpenRouter adapter reports tokens/USD where available
worker completion no longer trusts provider actualCredits by default
interrupted task records partial actuals and checkpoint metadata
```

### E2E Tests

Covered by scenarios for:

```text
Codex one-seat provider derives availability from minutes and concurrency
OpenRouter provider derives availability from daily USD
Copilot token provider derives availability from monthly tokens
project allocation percentage limits schedulable provider credits
reservation consumes derived native units
actual usage updates conversion profile
stale provider observation reduces route score
```

## Observability Plan

Every capacity decision includes:

```text
native input values
native consumed values
native reserved values
buffer values
conversion profile id
conversion confidence
formula version
derived available credits
portfolio cap
workday cap
final schedulable credits
routing decision reason
```

Every actual usage record includes:

```text
native usage observation id
actual credit formula version
actual credit source
conversion profile before update
conversion profile after update
whether sample counted as completed or interrupted
```

## Risks and Mitigations

### Risk: Native Estimates Are Wrong

Mitigation:

```text
start with conservative buffers
mark profiles low confidence
require approval for large tasks
increase/decrease derived capacity based on observed usage
```

### Risk: Opaque Providers Hide True Quota

Mitigation:

```text
use wall minutes and interruptions as native signals
track throttle/exhaustion events
reduce availability when provider pressure appears
prefer checkpoint/continuation over raw failure
```

### Risk: Derived Credits Oscillate Too Much

Mitigation:

```text
use rolling windows
smooth conversion profiles
cap per-cycle availability changes
preserve reserve buffer
require minimum samples before high confidence
```

### Risk: Users Lose Control

Mitigation:

```text
keep portfolio percentages
keep project caps
keep workday caps
show explainable derivation
allow manual temporary override with audit trail
```

### Risk: Legacy Behavior Breaks

Mitigation:

```text
static mode remains available only as explicit legacy compatibility
hybrid mode uses manual credit cap as an explicit upper bound
Treeseed PostgreSQL migrations normalize missing modes to derived
seed data changes are reversible
```

## Definition of Done

This work is complete. The implemented system satisfies:

```text
1. New execution providers are configured with native values only.
2. Capacity provider available credits are derived centrally, not entered manually.
3. Execution providers report raw usage facts, not authoritative actual credits.
4. Actual credits are calculated centrally with a versioned formula.
5. Available credits and actual credits use the same native variables and learned conversion profiles.
6. Credit conversion profiles learn by taskSignature + executionProfileId.
7. Portfolio allocation remains human-controlled through percentages and governance caps.
8. Capacity UI explains every derived number.
9. Static provider credit budgets are legacy compatibility, not the default path.
```

## Completion Matrix

| Capability | Implementation Areas | Verification |
| --- | --- | --- |
| Native execution-provider facts | Treeseed PostgreSQL Drizzle schema, API execution-provider routes, seed apply/export, provider setup UI | Drizzle schema tests, API capacity tests, seed tests, operational IA tests |
| Central actual-credit calculation | `packages/sdk/src/capacity.ts`, task completion/usage actual paths, agent telemetry | SDK capacity tests, API usage tests, agent provider tests |
| Conversion learning | `credit_conversion_profiles`, usage actual learning path, SDK profile helpers | Drizzle migration tests, SDK conversion tests, API learning tests |
| Derived availability projection | SDK `deriveAvailableCredits`, Market project/team/provider summaries | SDK availability tests, API summary tests |
| Native reservations and derived routing | SDK `routeAndReserveCapacity`, Market reservation fields/store serialization | SDK router tests, Market task creation/reservation tests |
| Portfolio allocation | Capacity grant metadata, SDK grant caps, embedded provider allocation UI | SDK portfolio tests, Market grant tests, operational IA tests |
| Native-first UI, seeds, and CLI | API facade, provider pages, seed `executionProviders`, `trsd capacity plan`, `trsd capacity migrate --to-derived` | UI boundary tests, seed apply/export tests, CLI capacity tests |
| Migration ownership | Treeseed PostgreSQL Drizzle artifacts, SDK/core static-hub D1 Drizzle artifacts, architecture guardrails | Drizzle tests and no-root-SQL architecture tests |
| Default-mode hardening | `credit_budget_mode` default `derived`, no static inference, explicit static/hybrid compatibility | Drizzle tests, SDK mode tests, API/UI/CLI tests |

## Implementation History

### PR 1: Capacity Decision Record and Types

Added architecture note, SDK types, and `credit_budget_mode`.

### PR 2: Execution Provider Native Schema

Added execution provider, native limit, and provider observation tables plus store/API plumbing.

### PR 3: Native Usage Observation and Actual Credit Calculator

Added central `calculateActualCredits`, native usage table, formula versioning, and completion API integration.

### PR 4: Adapter Telemetry

Updated Codex, Copilot, and OpenRouter-style adapters to emit raw usage observations.

### PR 5: Conversion Learning

Added credit conversion profile table and profile builder from usage actuals.

### PR 6: Derived Availability Projection

Implemented `deriveAvailableCredits`, native reservation persistence, and capacity summary integration.

### PR 7: Router and Reservation Integration

Route using derived provider availability, reserve native units, and settle native + credit ledgers.

### PR 8: Portfolio Allocation

Implemented percent-of-derived-capacity allocation through capacity grant metadata and SDK routing.

### PR 9: UI Migration

Implemented provider setup/edit native inputs, embedded portfolio allocation controls, and project/workday native usage plus derived balance views.

### PR 10: Local Seed and E2E Hardening

Implemented.

Switch local capacity seed to derived mode, add Codex/OpenRouter/Copilot scenarios, and keep explicit static/hybrid compatibility tests.

### PR 11: Default-Mode Hardening

Implemented.

Make `derived` the Treeseed PostgreSQL default, migrate missing provider modes to `derived`, remove metadata/static-budget inference, preserve static/hybrid only as explicit compatibility modes, and add native-to-credit invariant coverage.

## Final Architectural Shape

```text
Human setup
  native execution provider limits
  portfolio percentages
  governance caps

Runtime scheduling
  central derived available credits
  central reservation math
  central routing decisions

Execution
  provider-specific native usage adapters
  no provider-owned credit math

Settlement
  central actual credit calculation
  native and credit ledger entries
  conversion profile learning

Supervision
  explainable provider balances
  explainable project allocations
  explainable route decisions
```

This keeps TreeSeed’s central currency coherent while making the human configuration surface legible: people enter what they actually know, and the system learns the credit balance over time.
