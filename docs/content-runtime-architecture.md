# TreeSeed Content Runtime Architecture

## Canonical Status

This document specifies TreeSeed's runtime content delivery model for public Knowledge Hubs, public pages inside private projects, private content, contextual help content, preview overlays, generated books, generated knowledge packs, and distributed reusable capabilities.

It supports [TreeSeed UI Architecture](./ui-architecture.md) and is implemented incrementally through [UI Migration](./ui-migration.md).

## Core Rule

Content is runtime data outside the local environment.

```text
local
  -> local collections, TreeDX snapshots, or fixture stores are allowed

staging and production
  -> public content is served from R2/CDN-backed runtime storage
  -> private content is served from private runtime storage through authenticated routes
  -> preview content is served from scoped preview overlays
```

`local_collections` must be rejected or ignored for user-facing staging and production content surfaces.

## Implementation Boundary

The content runtime must be proven through the first public R2-backed reader and the first private proxy-backed reader before it is generalized to every content route, generated pack, help topic, marketplace asset, reusable capability, or overlay preview. Public CDN behavior, manifest failure states, targeted purge behavior, and private no-leak behavior are promotion requirements.

## Runtime Sources

Canonical content runtime source values:

```ts
type ContentRuntimeSource =
  | "local_collections"
  | "r2_published_manifest"
  | "r2_preview_overlay"
  | "r2_private_manifest"
  | "treedx_snapshot";
```

Allowed environment behavior:

| Environment | Public content | Private content | Preview/editorial content |
| --- | --- | --- | --- |
| Local | `local_collections`, `treedx_snapshot`, or local fixture store | local fixture/private store | local overlay or TreeDX snapshot |
| Staging | `r2_published_manifest` through R2/CDN | `r2_private_manifest` through authenticated routes | `r2_preview_overlay` through authenticated routes |
| Production | `r2_published_manifest` through R2/CDN | `r2_private_manifest` through authenticated routes | `r2_preview_overlay` only for approved editorial/admin preview flows |

## Published Runtime Flow

The canonical remote content flow is:

```text
TreeDX / editorial source / generated knowledge output
  -> publish or preview operation
  -> content manifest, collection indexes, page objects, runtime objects, and artifacts written to R2
  -> cache metadata and CDN/public object URLs resolved
  -> route context resolves team/project/page scope
  -> policy context resolves visibility and access
  -> page controller loads a view model from the content runtime provider
  -> ReaderTemplate, CollectionTemplate, or DetailTemplate renders the UI
```

The site repository contains route code, templates, UI components, shell configuration, and runtime adapters. It must not require a software build or deploy when public project content, public pages inside private projects, generated book pages, generated knowledge packs, or published marketplace knowledge assets change.

## Public CDN-First Delivery

In staging and production, public content must be published to R2 and served through CDN-backed public delivery.

This includes:

- public projects
- public project pages
- public contextual help topics
- public pages inside private projects
- public books and book pages
- generated public book knowledge packs
- public marketplace knowledge packs
- public templates and release artifacts
- public reusable capability artifacts
- public profile/project knowledge summaries derived from project content

Public anonymous reader traffic must not require fresh server-side rendering on every request when the same page can be served from a published artifact, cached public HTML, a cacheable R2 object, or a cacheable application route.

Public content delivery must optimize for low marginal cost:

- public HTML and reader UI shells should be cacheable at the Cloudflare edge
- public R2 objects should use stable keys or stable public URLs when safe
- changed pages and changed public objects should be purged during content publish
- preview, form, feedback, auth, admin, and private routes must bypass public cache
- public routes must not set cookies
- public reader pages must not call the Market API or content runtime for every anonymous request when a CDN artifact can satisfy the request

## Contextual Help Runtime Content

Published public help topics are runtime content. They must not require a site rebuild when help content changes.

Help manifests may reference:

- topic id
- title
- summary
- body object
- related capability ids
- related resource types
- related route patterns
- related actions
- audience/visibility
- locale
- version/revision
- updated timestamp

Public help topics may be CDN-backed. Private team/project help topics must use private runtime storage and authenticated routes. Help search indexes must be split or filtered so private help topic titles, snippets, and relationships do not leak to unauthorized users.

## Public Pages Inside Private Projects

Public pages inside private projects are still public pages. The project may remain private in navigation, membership, and management context, but the individual published page or artifact must be addressable through a public content manifest entry with explicit public visibility.

Public exposure must be intentional, policy-resolved, auditable, and represented in the content manifest.

## Private Content Storage

Private content in staging and production must also be stored outside the site repository. It must not be compiled into the deployed site.

Approved private storage forms:

- a private R2 bucket used only by the application runtime
- a private prefix within a shared R2 bucket when access is enforced exclusively through application/runtime routes
- a preview overlay namespace scoped by team, project, preview id, and expiration

Private content must not be served through public R2 object URLs. Private content access is specified in [Auth And Content Proxy](./auth-and-content-proxy.md).

## Preview Overlays

Preview overlays are scoped, expiring, non-indexable runtime content layers. They may be used for editorial preview, overlay editing drafts, and review workflows.

Preview overlays must define:

- team id
- project id when available
- preview id
- base manifest key
- base revision
- changed entries
- changed artifacts
- tombstones
- runtime pointers
- expiration
- source branch/ref or operation id when available

Preview overlays must not become a permanent publication state.

## Book Runtime And Starlight-Style Navigation

The traditional Starlight book navigator remains valuable as reader UI, but it must not own remote content deployment.

Canonical reader data flow:

```text
R2 manifest / preview overlay / private manifest
  -> TreeseedBookRuntime view model
  -> ReaderTemplate
  -> Starlight-style sidebar, table of contents, pagination, font controls, and download controls
```

The navigator, table of contents, previous/next links, download controls, and reader frame may reuse existing `@treeseed/ui` docs/Starlight components. Their data must come from the resolved runtime content source in staging and production.

## Generated Knowledge And Capability Packs

Generated book knowledge packs, templates, and reusable capability packages must be runtime artifacts, not bundled site assets.

The content manifest for a book or book page must be able to reference:

- book metadata
- book navigation tree
- page objects
- rendered or source content objects
- generated pack artifacts
- reusable capability artifacts when applicable
- artifact version, revision, checksum, and generated timestamp
- public/private visibility
- download/import/install action metadata

Public packs may use CDN-backed URLs. Private, paid, entitlement-gated, or team-only packs must use authenticated download routes or short-lived signed URLs after policy evaluation.

Phase 10 UI implementation reflects this boundary: app knowledge and public marketplace routes render entitlement and delivery state through view models before any install, import, or download action is exposed. Route templates do not render raw R2 keys, direct private artifact URLs, or editor bundles. Overlay status is display-only until an authorized edit intent lazy-loads the overlay bootstrap.

## Cache And Purge

Content publish must identify and purge:

- changed public pages
- changed public R2 object URLs
- affected listing pages
- affected reader navigation pages
- affected public help topic pages and search indexes
- feed/sitemap freshness pages when applicable
- generated pack artifact URLs when stable URLs are reused

Private content must use conservative cache headers and must never be stored in public CDN cache.

Feedback submission routes and screenshot upload routes are dynamic action routes, not public content runtime routes. They must bypass public cache, validate payload size/type, and store screenshot attachments according to public/private attachment policy.

## Required Tests

Implementations must add tests proving:

- public content is served from CDN-eligible responses in staging/production
- `local_collections` is rejected or ignored for user-facing staging/production content
- R2 manifest load failures produce safe empty/error states
- cache purge targets changed pages and changed objects
- public pages inside private projects require explicit public manifest entries
- generated knowledge/capability pack artifacts are runtime artifacts, not bundled site assets
- contextual help content is served from runtime manifests in staging/production
- private help topics are excluded from public help search indexes
- feedback submission and screenshot upload routes are not cached publicly
