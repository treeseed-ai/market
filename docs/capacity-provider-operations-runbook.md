# Capacity Provider Operations Runbook

This runbook covers production operations for the provider governance and agent-capacity backend. The controlling completion status remains in [Agent Capacity Completion](./agent-capacity-completion.md), and the generated command/route inventory remains in [Agent Capacity Operator Parity](./agent-capacity-operator-parity.md).

Hosted deployment is suspended. Do not run hosted mutation, release, Railway, or Cloudflare procedures until that suspension is formally lifted. Local provider lifecycle changes must use `trsd` reconciliation.

## Routine health and evidence

Run these checks in order:

```bash
npx trsd dev start --web-runtime local --json
npx trsd capacity status --market local --provider local --json
npx trsd capacity provider-connections --json
npx trsd capacity assignments --team <team-id> --status leased --limit 100 --json
npx trsd capacity reservations --team <team-id> --status reserved --limit 100 --json
npx trsd capacity audit-events --team <team-id> --limit 100 --json
```

Healthy local state means:

- API and operations-runner process source closures match their persisted start digests.
- Provider manager status is fresh and every intended connection has an unexpired access token and open availability session.
- Local claims do not exceed provider, execution-provider, lane, connection, credit, or native-unit limits.
- Every leased assignment has one reservation and a renewable lease.
- Terminal assignments have no active local claim or capability handle.
- Every consumed reservation has one explainable settlement ledger entry.

Use `npx trsd capacity logs --market local --provider local --json` for bounded provider logs. Use `assignment`, `assignment-explanation`, `reservation-explanation`, `usage`, `ledger`, and `audit-events` for a single forensic trace. Never copy credentials, access tokens, lease tokens, registration keys, or private-key material into an incident record.

## Registration-key rotation

Rotation is for a broadcast-key exposure or scheduled team ceremony. It cancels pending requests made with the previous generation but does not revoke approved memberships.

```bash
npx trsd capacity registration-key-rotate --team <team-id> --plan --json
npx trsd capacity registration-key-rotate --team <team-id> --execute --yes --json
npx trsd capacity provider-requests --team <team-id> --status cancelled --limit 100 --json
npx trsd capacity audit-events --team <team-id> --audit-action registration_key.rotated --limit 100 --json
```

Do not use broadcast-key rotation to respond to a compromised membership credential or provider identity.

## Membership-credential rotation

For a suspected connection credential leak, suspend the affected membership first. Suspension denies new access-token issuance and new work without affecting the same provider's other team memberships.

```bash
npx trsd capacity provider-suspend --team <team-id> --membership <membership-id> --plan --json
npx trsd capacity provider-suspend --team <team-id> --membership <membership-id> --execute --json
npx trsd capacity provider-team-credential-rotate --team <team-id> --membership <membership-id> --plan --json
npx trsd capacity provider-team-credential-rotate --team <team-id> --membership <membership-id> --execute --json
```

Install the newly revealed credential only through the provider host secret manager or encrypted Treeseed configuration, update its manifest secret reference through the canonical provider-owner command, and reconcile the provider. Resume only after the old credential and child access tokens are denied and the new connection publishes a fresh session.

## Provider identity rotation

Identity rotation is provider-wide and updates every active membership atomically. It requires possession proofs from the old and new Ed25519 identities.

```bash
npx trsd capacity provider-identity-show --json
npx trsd capacity provider-identity-rotate --connection <connection-id> --plan --json
npx trsd capacity provider-identity-rotate --connection <connection-id> --execute --json
npx trsd capacity provider-connections --json
```

Stop if any membership cannot be updated. Do not retain a mixed old/new identity state, create a replacement provider beside the existing identity, or manually rewrite provider ids.

## Incident response

1. Preserve current audit, assignment, usage, and ledger evidence through the bounded export commands.
2. Stop new admission with the narrowest authority:
   - disable the registration key for broadcast abuse;
   - suspend one membership for a connection compromise;
   - pause or revoke one grant for project-specific exposure;
   - revoke the membership for confirmed provider offboarding;
   - reconcile the provider runtime down only for provider-host compromise.
3. Allow a valid in-flight lease to settle or use the canonical assignment cancel/recovery path. Never delete assignment, reservation, usage, or ledger rows.
4. Rotate the affected secret or identity with the ceremonies above.
5. Reconcile and verify fresh health, token/session issuance, provider-local claim recovery, and cross-team isolation.
6. Export the final audit window and record exact ids, timestamps, reason codes, and verification commands without secret material.

## Provider offboarding

Offboard one team connection independently:

```bash
npx trsd capacity provider-suspend --team <team-id> --membership <membership-id> --execute --json
npx trsd capacity assignments --team <team-id> --provider <provider-id> --limit 100 --json
npx trsd capacity provider-revoke --team <team-id> --membership <membership-id> --execute --json
npx trsd capacity provider-leave --connection <connection-id> --execute --json
npx trsd capacity provider-connections --json
```

Before revocation, inspect every nonterminal assignment. Cancel only unleased work; running leases must converge through completion, return, failure, expiry recovery, or the explicit operator path. Remove the connection's secret reference after revocation is verified. Do not delete the global provider identity when other team connections remain.

`provider-leave` always removes the connection from the validated local manifest and deletes its generated local credential, connection state, and cached token. Its JSON result includes `remoteRevocationConfirmed`. If that value is `false`, local offboarding still completed, but the team owner must confirm or perform membership revocation through the team governance command; do not interpret local cleanup as proof of remote revocation.

For full host retirement, repeat the membership procedure for every connection, then use:

```bash
npx trsd capacity down --market local --provider local --execute --json
```

Provider runtime destruction is reconciliation-owned. Audit, assignment, usage, and ledger lineage is retained.

## Retention and cleanup policy

The operations runner executes one coalesced capacity maintenance sweep:

| Record family | Policy |
| --- | --- |
| Active access tokens past `expires_at` | Mark `expired`; retain metadata for audit |
| Open/draining availability sessions past `expires_at` | Mark `expired` and close; retain the snapshot |
| Pending registration requests past `expires_at` | Mark `expired`; retain review lineage |
| Proof nonces after the replay window | Delete |
| Registration rate-limit buckets after their window | Delete |
| Assignments, reservations, usage actuals, ledger entries, audit events | Never deleted by runtime retention |
| Provider-local claims/dispatches | Release only after durable terminal lifecycle confirmation or verified recovery |

The sweep is idempotent and is run by the existing operations-runner maintenance scheduler. A storage failure degrades readiness and is retried; it is never reported as a successful no-op.

## Recovery and cleanup verification

Use canonical recovery and cleanup paths:

```bash
npx trsd reconcile test-live --mode cleanup --provider local --environment local --yes --json
npx trsd reconcile test-live --mode acceptance --provider local --environment local --yes --json
npx trsd reconcile test-live --mode cleanup --provider local --environment local --yes --json
```

Acceptance must finish with terminal workdays, no active assignment/reservation/concurrency/provider-local claims, closed sessions, revoked assignment capability handles, exactly-once settlement, and zero reconciliation cleanup drift. Hosted cleanup/acceptance remains prohibited while deployment suspension is active.
