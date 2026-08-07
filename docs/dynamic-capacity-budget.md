# Dynamic Capacity Budget

**Status:** Retired implementation record
**Last updated:** 2026-07-17

The original dynamic-capacity implementation record was removed because it claimed completion for a team-owned execution-provider and lane model that has been deleted from the clean schema.

Current capacity is derived from:

- provider-global execution-provider declarations in `treeseed.agents-capacity-provider.yaml`;
- membership-scoped, expiring availability snapshots;
- team-owned active grants and versioned allocation sets;
- active workday envelopes and transactional admission counters;
- reservations, centrally calculated usage actuals, and exactly-once ledger settlement;
- learned conversion profiles keyed by execution-provider kind and native unit.

Provider declarations are supply facts, not authorization. Only the API can authorize a project assignment, and it does so through the single admission evaluator documented in [agent-capacity-domain-model.md](./agent-capacity-domain-model.md).

The complete implementation and remaining production gates are tracked in [agent-capacity-completion.md](./agent-capacity-completion.md). Historical table names, migration commands, UI instructions, and compatibility behavior must not be restored from repository history.
