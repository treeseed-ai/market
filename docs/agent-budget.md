# Agent Budget Architecture

**Status:** Canonical pointer
**Last updated:** 2026-07-17

Agent budgets are governed by the capacity allocation, admission, workday, reservation, and settlement architecture. The former lane-based scheduling plan in this file was removed because it described tables and runtime paths that no longer exist.

Use these current sources of truth:

- [Agent Capacity Completion Plan](./agent-capacity-completion.md)
- [Agent Capacity Domain Model](./agent-capacity-domain-model.md)
- [Capacity Provider and Agent Coordination Architecture](./capacity_provider_agent_coordination_architecture.md)
- [Agent Kernel Mode Runtime](./agent-kernel-mode-runtime.md)
- [Agent Capacity Operator Surfaces](./agent-capacity-operator-surfaces.md)

The governing rules are:

1. Teams publish versioned allocation sets; active allocation policy is immutable and can only be superseded.
2. Approved provider membership does not authorize work. A matching active grant is required.
3. Every billable assignment is admitted through the SDK evaluator and atomically creates its reservation and counter claims.
4. Workdays are bounded by duration and credits, keep scheduling useful eligible planning work while both remain, and require decision/readiness/capacity-plan provenance for acting.
5. Usage is calculated centrally and settled exactly once into an append-only ledger.
6. Provider-native limits and provider-global runner concurrency are declared by the provider manifest and current availability snapshot; they are not team-owned inventory rows.

Do not add compatibility modes, manually entered provider-credit inventory, lane tables, or a second scheduling implementation here.
