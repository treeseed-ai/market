# TreeSeed Commons Governance

TreeSeed Commons is the participation layer for registered users who want to help shape TreeSeed priorities through questions, proposals, backing, votes, and bounded steward decisions.

The model is deliberately staged. Registration creates a Commons governance identity and read-only TreeSeed team membership. It does not create legal cooperative membership, equity, patronage rights, payout rights, or authority over every operational decision.

## Cooperative Governance And Ownership Model

The Commons uses the same core principle as the ecommerce system: the cooperative governance and ownership model remains the source of truth for trust, stewardship, contribution attribution, decisions, and historical evidence.

Commons records are advisory governance records:

- Participants may ask questions and submit proposals.
- Participants may back proposals to show priority.
- Participants may vote once per proposal with transparent weight snapshots.
- Delegation is scoped and revocable.
- Stewards convert signal into bounded decisions with public reasons.
- Decisions allocate attention and capacity inside documented constraints.

## Authority Boundaries

Registration grants participation, not unbounded control.

Binding authority is earned, scoped, auditable, and constrained by steward review, safety, architecture, legal, and capacity considerations. A steward decision may accept, reject, defer, schedule, implement, or archive a proposal.

The system does not add:

- legal member ledgers
- patronage or dividend ledgers
- revenue splits
- token credits
- payout allocation
- commission or fee logic
- automatic roadmap promises

## Weighting

Commons voting uses transparent modular weights. The initial `commons-v1` policy includes base participation, verified email, contribution, stakeholder, trust-role, and delegated components. Weights are capped, and every backing or vote stores an immutable snapshot of the participant's weight at that moment.

Money can add signal only if a future policy explicitly models it, but it must not dominate legitimacy. Contribution, affected-stakeholder status, trust, and stewardship remain separate concepts.

## Product Integration

The API persists Commons participants, questions, proposals, backings, votes, delegations, decisions, weight snapshots, and governance events.

Admin owns steward operations under `/app/commons`. Root market owns participant-facing Commons pages under `/commons`.

The Commons layer reuses existing team membership, authentication, route descriptors, API acceptance metadata, and UI package components. It does not create a new ecommerce subsystem and does not change marketplace order, entitlement, Stripe, refund, service, or capacity behavior.

## Release Boundary

Commons is part of the current TreeSeed governance release, not a future legal membership system. It proves the same cooperative governance and ownership model used by ecommerce products can also guide TreeSeed platform priorities.

Release and staging workflows should treat Commons changes like other cross-surface platform changes:

- SDK owns shared contracts and route metadata.
- API owns persistence and steward/participant route behavior.
- UI owns reusable governance components.
- root market owns participant pages.
- Admin owns steward operations.

No Commons release may add legal cooperative member ledgers, equity-like rights, patronage ledgers, payout allocation, revenue split behavior, token credits, or automatic roadmap authority.
