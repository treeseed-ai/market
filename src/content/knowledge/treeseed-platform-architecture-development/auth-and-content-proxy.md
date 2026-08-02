---
schemaVersion: treeseed.knowledge-page/v1
id: architecture.auth-and-content-proxy
bookId: treeseed-platform-architecture-development
slug: auth-and-content-proxy
title: Authentication and content proxy
summary: How Knowledge Hubs authenticate and securely serve private content.
status: published
visibility: public
order: 40
tags:
  - architecture
  - auth
  - and
  - content
  - proxy
contributors: []
relatedBookIds: []
relatedKnowledgeIds:
  - guide.foundation.architecture
  - guide.foundation.treedx
  - guide.security.authentication
  - guide.deployment.knowledge
  - architecture.ui-architecture
  - architecture.ui-foundation-baseline
  - architecture.content-runtime-architecture
  - architecture.overlay-editing-architecture
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
capabilityIds: []
routePatterns: []
resourceTypes:
  - platform-architecture
actionIds: []
keywords:
  - auth
  - and
  - content
  - proxy
documentationUrls: []
---

# TreeSeed Auth And Content Proxy

## Canonical Status

This document specifies how Core-based Knowledge Hubs authenticate against the configured Market and how private content is served through the content proxy.

It supports [TreeSeed UI Architecture](./ui-architecture.md), [UI Architecture Inventory](./ui-architecture-inventory.md), and [Content Runtime Architecture](./content-runtime-architecture.md).

## Market As Auth Authority

Knowledge Hubs based on `@treeseed/core` must be authenticatable without owning their own user database, session database, registration pages, password reset pages, or administrative console.

Every hosted Knowledge Hub must authenticate against its configured Market:

- sign-in, registration, account settings, team/project administration, and authorization recovery route to the configured Market UI
- session validation calls or verifies against the configured Market API
- hub-local middleware may read a shared session token
- the Market API remains authoritative for principal, session status, team membership, project access, roles, permissions, and entitlements
- authenticated feedback submissions, private feedback attachments, and screenshot access are authorized through the configured Market/API
- private contextual help topics, help search results, and action remediation content are authorized through the configured Market/API
- the hub must not create an independent auth source of truth
- the hub must not silently fall back to public rendering for private content when Market authentication is unavailable

## Implementation Boundary

The auth/content proxy model must be proven through one private book/page route before it is reused for private generated packs, private artifacts, private contextual help, feedback screenshot attachments, or overlay preview content. Denied/not-found behavior, cache headers, session revocation, safe return URLs, and no raw private R2 URL exposure are promotion requirements.

## Shared Market Session

The shared session token must be usable by all Knowledge Hubs configured to trust the same Market.

The token may be:

- a shared cookie scoped to an approved parent domain
- a Market-issued bearer token
- another explicit Market session artifact

Required properties:

- Market issuer
- audience or hub/project scope
- expiration
- revocation or introspection support
- secure transport
- HttpOnly cookie storage when cookie-based
- SameSite and domain configuration appropriate to the hub topology
- no ability to authorize a hub that is not configured to trust that Market

## Safe Redirects

If a hub receives a browser request for private content without a valid shared Market session, it must redirect to the configured Market sign-in page with a safe return URL.

Safe return URLs must:

- remain inside the configured hub or Market trust boundary
- preserve path/query needed to return to the requested page
- reject absolute untrusted origins
- reject protocol-relative URLs
- avoid leaking private object keys

Non-browser requests should receive a standardized permission-denied response instead of a sign-in page.

## Private Content Proxy

Private project content must be served through a content proxy. The content proxy is the only approved remote serving path for private R2 files, private generated book pages, private generated knowledge packs, private artifacts, and private project reader UI.

The content proxy must:

- accept the hub request
- resolve the configured Market API for the hub
- validate the shared Market session token with the Market API or a Market-issued verification contract
- resolve team, project, resource, and object identity
- evaluate project membership and policy through Market/API authorization
- load the private R2 object with server-side credentials or a Cloudflare binding
- render the private reader page, HTML fragment, source object, or artifact response
- set private/non-public cache headers
- emit audit records for read, download, export, denied, and not-found cases

Private content routes must not expose raw R2 object URLs.

## Feedback And Screenshot Attachments

Feedback from Core-based Knowledge Hubs must follow the same Market trust model.

Public anonymous feedback may be accepted by a small dynamic form endpoint, but connected hubs must forward or record it through the configured Market/API feedback surface so platform feedback remains centralized.

Authenticated feedback from private projects, private Knowledge Hubs, team pages, project pages, authenticated app routes, or operational market routes must:

- validate the shared Market session
- resolve the submitting principal
- resolve team, project, route, capability, and resource context through policy-safe identifiers
- avoid leaking private metadata into unauthenticated acknowledgements or notification previews
- store screenshot attachments as private attachments unless policy explicitly allows public storage
- require authenticated, policy-checked retrieval for private screenshots

Feedback screenshots must not expose raw private R2 URLs, private object keys, service credentials, provider credentials, session tokens, unlock/passphrase values, or secret-manager material. Attachments submitted from private pages must not be served by public CDN URLs.

## Private Contextual Help

Private help topics and help search results must follow the same Market trust model as private content.

Private help includes:

- team/project-specific process help
- private setup and deployment remediation
- private capacity/provider guidance
- entitlement-gated commercial support guidance
- action remediation that reveals private project, member, billing, capacity, or infrastructure details

The help resolver must:

- validate the shared Market session when private help is requested
- policy-filter topic lists, search results, snippets, related actions, and remediation details
- avoid revealing private topic existence to unauthorized users
- route sign-in, setup, billing, project administration, and account recovery to the configured Market UI
- avoid local Knowledge Hub auth or admin surfaces

Public help may explain that sign-in or membership is required. It must not reveal private topic titles, private project names, object keys, deployment state, member identities, or private remediation steps.

## Signed URLs

If a private artifact requires direct transfer, the proxy may mint a short-lived signed URL after policy evaluation.

Knowledge distribution UI depends on this rule for marketplace install/import/download actions. Public listings may describe CDN-backed delivery, but private, paid, team-only, or entitlement-gated artifacts must resolve through the Market/API policy path before a content proxy URL or short-lived signed URL is exposed. UI templates receive the resolved action and entitlement state only; they do not construct artifact URLs.

Commerce checkout and service/capacity actions follow the same authority boundary. Operational market pages may render buyer-visible seller readiness, payment group state, service quote state, capacity inquiry state, and Commons governance signal after authentication, but seller identity, payment amount, connected-account handling, entitlement activation, private artifact delivery, and steward authority are resolved by the Market/API path before the UI renders or submits an action. Public single-column pages may describe these flows, but they must not expose checkout, service request, capacity inquiry, project, team, account, or entitlement actions.

Signed URLs must:

- be scoped to the exact object
- expire quickly
- be non-indexable
- be auditable
- not become the primary navigation model for private knowledge
- avoid revealing unrelated private bucket or prefix structure

## Denied And Not Found Behavior

Denied and not-found states must not reveal private object keys, private titles, snippets, deployment details, membership data, or whether a private object exists beyond what policy allows.

Signed-in users without project access receive a standardized denied state. Anonymous browser users are redirected to Market sign-in when appropriate. Non-browser users receive a policy-safe error response.

## Threat Model Summary

The auth/proxy model must defend against:

- anonymous private object fetches
- cross-hub token reuse against an untrusted hub
- stale, revoked, or expired sessions
- unsafe return URL redirects
- public cache storage of private content
- signed URL oversharing
- private metadata leaks through denied/not-found states
- direct browser access to service credentials or raw R2 object keys

## Required Tests

Implementations must add tests proving:

- unauthenticated private content requests redirect or deny safely
- unauthorized users cannot infer private object metadata
- private R2 objects cannot be fetched anonymously
- expired or revoked sessions fail
- safe return URL validation rejects unsafe origins
- signed URLs are scoped and short-lived
- private responses use conservative cache headers
- private contextual help and help search results are hidden from unauthorized users
