# TreeSeed Overlay Editing Architecture

## Canonical Status

This document specifies the authenticated Knowledge Hub content management overlay.

It supports [TreeSeed UI Architecture](./ui-architecture.md), [Content Runtime Architecture](./content-runtime-architecture.md), [Auth And Content Proxy](./auth-and-content-proxy.md), and [UI Migration](./ui-migration.md).

## Core Rule

The overlay is an authenticated enhancement layer for project team members who update Knowledge Hub content in place as part of the knowledge-update/distribution journey. It is not part of the anonymous display experience and must not become a second admin application inside Core.

```text
anonymous or unauthorized visitor
  -> normal display site
  -> no editor bundle
  -> no toolbar
  -> no write-path client logic

authenticated project team member with edit policy
  -> display page plus authenticated overlay
  -> toolbar, create actions, inline editor overlays, draft/preview/publish actions
```

## Eligible Pages

The overlay may be enabled on Core content pages such as:

- public pages
- notes
- questions
- objectives
- proposals
- decisions
- people
- agents
- books
- book pages
- published runtime `/knowledge/*` pages

Capability metadata and UI schemas declare which pages and fields are editable.

## Implementation Boundary

Overlay editing must begin as one narrow proof on one public content resource and one book/page route. It must not become a full in-hub admin app before draft save, preview overlay, policy filtering, editor bundle lazy loading, safe Market handoff, contextual help, and feedback screenshot safety are proven.

## Non-Goals

The overlay must not own:

- authentication
- user/account management
- team administration
- publishing governance
- billing
- host configuration
- capacity configuration
- sensitive project settings
- independent admin navigation

Those flows route to the configured Market admin interface.

## Activation

Overlay activation must be policy-gated. A page controller or lightweight overlay bootstrap endpoint resolves:

- configured Market
- shared Market session
- principal
- owning team
- project
- resource identity
- membership
- content permissions
- current content source
- draft/preview state
- allowed overlay actions

The overlay may activate through explicit edit mode, authenticated bootstrap, or a policy-resolved page model. Anonymous public pages must remain CDN-first and must not call Market auth just to decide that editing is unavailable.

## Overlay UI

Required overlay surfaces:

- authenticated toolbar
- create menu for supported UI schemas
- edit current page action
- metadata editor
- rich Markdown/MDX editor overlay
- preview toggle
- draft status
- review/publish action area
- open in Market admin action
- permission-denied state for signed-in users without access

The contextual help action remains available when the overlay is active. Overlay help must explain edit mode, draft state, preview overlays, review/publish handoff, and why a field or action is unavailable using resolved policy/action state.

The global feedback action remains available when the overlay is active. Feedback capture must understand overlay state so users can report editor bugs, preview issues, and content-management problems with the current route, draft/preview id, and editor state attached when policy allows.

The rich editor must reuse the shared `@treeseed/ui` editor system, such as `RichMarkdownEditor` and canonical Markdown field components. A separate editor stack is allowed only if promoted into the UI package as a reusable primitive, component, or pattern.

## Write Path

The overlay write path is:

```text
overlay editor
  -> Market API or approved content proxy write endpoint
  -> TreeDX workspace, draft store, or content revision service
  -> preview overlay or review state
  -> publish operation
  -> R2 published/private manifests and artifacts
  -> targeted CDN/cache purge
```

The overlay must not write directly to R2 from browser code. It must not expose raw private object keys, private R2 URLs, service credentials, TreeDX credentials, provider credentials, or publish credentials.

All writes must be authenticated, policy-checked, audited, and associated with a project/team/resource.

## Feedback And Screenshot Safety

Overlay UI must mark sensitive editing surfaces for feedback redaction when they can contain secrets, unpublished private content, private object keys, protected metadata, or credential-like values.

Feedback screenshots taken while the overlay is active must:

- show a preview before submission
- preserve enough visual context to debug editor/display issues
- redact sensitive editor regions and secret fields
- store private draft or preview screenshots as private attachments
- avoid exposing draft ids, private object keys, raw R2 paths, or write endpoint details to unauthorized users

## Contextual Help Safety

Overlay contextual help must be policy-filtered. It may link to public editing help for anonymous users, but authenticated edit-mode help, private draft explanations, review-state details, and publish remediation must require team/project authorization.

Help shown inside the overlay must not expose unpublished private content, private object keys, draft ids, raw R2 paths, write endpoints, or publish credentials to unauthorized users.

## First Minimal Vertical

The first overlay implementation should prove only the narrow path:

- enabled on one public content resource
- enabled on one book/page route
- edit title, summary, and body only
- write through Market/API or approved content proxy
- generate preview overlay
- support open-in-Market handoff
- exclude release governance unless the content change affects distributed assets

## Required Tests

Implementations must add tests proving:

- anonymous users do not receive the editor bundle
- non-team users do not receive overlay bootstrap data
- authorized team members can load the overlay
- save draft writes through an approved path
- browser code cannot write directly to R2
- denied states do not leak private metadata
- open-in-Market uses a safe return URL
- contextual help in edit mode is policy-filtered and does not reveal private draft or publish metadata
- feedback screenshot capture while editing redacts sensitive regions and does not expose draft/private metadata
