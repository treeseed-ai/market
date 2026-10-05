# Team Service Management

TreeSeed models provider accounts as team service connections. This is the only
product architecture for configuring GitHub, Cloudflare, Railway, and future
providers. “Host” is reserved for infrastructure reconciliation terminology and
is not a product entity.

## Ownership

- `@treeseed/sdk` owns provider definitions, capability definitions, encrypted
  envelope contracts, browser-portable cryptography, and operation-lease
  contracts.
- `@treeseed/api` owns service metadata, encrypted envelope persistence,
  authorization, audit records, vault grants, and single-use operation leases.
- `@treeseed/ui` owns reusable provider, capability, credential, help, and vault
  components.
- `@treeseed/admin` owns authenticated team service routes, view models,
  provider guidance, and browser-side vault ceremonies.
- `@treeseed/cli` exposes non-sensitive inspection and encrypted-envelope
  administration through API contracts.
- The operations runner owns bounded, in-memory consumption of sealed operation
  payloads. It never persists provider plaintext.

No product repository-host, web-host, launch-host binding, credential-session,
or client-escrow compatibility model exists.

## Provider-first model

A `TeamServiceConnection` represents a provider account boundary, such as a
GitHub organization/App installation, Cloudflare account, or Railway workspace.
Connections advertise independent capabilities:

- `repository-hosting`
- `workflow-execution`
- `secret-enclave`
- `frontend-hosting`
- `backend-hosting`
- `dns-management`
- `object-storage`
- `database-hosting`
- `capacity-runtime-hosting`
- `private-knowledge-index-hosting`
- `artifact-hosting`

Capability bindings, rather than provider-specific host records, are the future
selection contract for projects, capacity providers, and private knowledge
planes. This foundation does not provision or deploy those resources.

## Secret custody

Sensitive fields are encrypted in the browser using the versioned SDK envelope
contract. TreeSeed persists ciphertext, wrapped keys, nonces, salts, algorithm
metadata, and fingerprints only. Searchable non-secret identifiers remain
plaintext.

Each administrator has a personal passphrase and keypair. A team vault key is
wrapped separately to each explicitly granted administrator. Role membership
alone does not provide cryptographic access.

The browser keeps unlocked key material in memory only and locks it on
inactivity or sign-out. Passphrases, derived keys, plaintext credentials, and
ephemeral private keys must never enter URLs, storage, logs, audit payloads,
traces, screenshots, or persistent operation state.

Personal passphrase rotation rewraps the administrator private key. Team vault
rotation rewraps credential keys and remaining administrator grants. Forgotten
passphrases are recoverable only through another currently authorized
administrator; a sole administrator must reset the vault and reenter
credentials.

## Operation leases

Interactive provider validation uses a short-lived, single-use operation lease:

1. The API authorizes the actor, team, connection, capability, purpose, and
   required credential fields.
2. The operations runner creates an ephemeral keypair.
3. The browser decrypts only the required fields and seals them to the ephemeral
   public key.
4. The API binds the sealed payload to the lease and operation correlation.
5. The runner consumes it once, performs a read-only validation from memory,
   redacts output, and destroys plaintext and private-key material.

Expiry, cancellation, replay, runner restart, key loss, actor mismatch, team
mismatch, connection mismatch, or capability mismatch fail closed.

Unattended operations require an explicitly configured provider secret enclave
or approved external vault reference. Capacity providers receive only scoped
TreeSeed credentials and operation identifiers.

## Product routes

- `/app/services` lists active-team service connections.
- `/app/services/new` connects a provider through the definition-driven wizard.
- `/app/services/[connectionId]` owns overview, capabilities, credentials,
  activity, and settings.
- `/app/services/vault` owns personal key initialization, unlock, rotation,
  grants, revocation, recovery, team-key rotation, and destructive reset.

Services are active-team scoped in the application sidebar. Team management tabs
remain limited to team identity, membership, settings, lifecycle, and profile
work.

## Persistence

The canonical database model consists of:

- `team_service_connections`
- `team_service_capability_bindings`
- `team_service_credential_profiles`
- `team_vaults`
- `user_vault_keys`
- `team_vault_grants`
- `credential_envelopes`
- `external_vault_bindings`
- `secret_operation_leases`

There are no legacy product host, project deployment, launch plan, server-side
credential decryption, or passphrase session tables.

## Current phase boundary

This phase supports connection metadata, capability configuration, encrypted
credential custody, vault administration, read-only provider validation,
non-sensitive CLI inspection, and operations-runner secret delivery.

Repository creation, project deployment, capacity-provider deployment, DNS
mutation, SMTP configuration, application deployment, and private TreeDX
provisioning are not implemented. Their future designs must consume service
capability bindings and operation leases directly; they must not restore a
parallel host or credential model.
