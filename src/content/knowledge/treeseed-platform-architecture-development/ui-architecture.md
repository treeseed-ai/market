---
schemaVersion: treeseed.knowledge-page/v1
id: architecture.ui-architecture
bookId: treeseed-platform-architecture-development
slug: ui-architecture
title: UI architecture
summary: The current package ownership, composition boundaries, and reusable
  interface architecture.
status: published
visibility: public
order: 10
groupIds:
  - architecture
  - ui
contributors: []
relatedBookIds: []
relatedKnowledgeIds:
  - guide.foundation.architecture
  - guide.foundation.frameworks
  - architecture.ui-foundation-baseline
  - architecture.content-runtime-architecture
  - architecture.auth-and-content-proxy
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
  - ui
  - architecture
documentationUrls: []
---

# Current UI Architecture

The Market/Admin presentation layer is now a deliberately small redesign foundation. The full pre-cleanup route surface is preserved in [legacy-routes.md](./legacy-routes.md), and the intended redesign is outlined in [ui-redesign.md](./ui-redesign.md).

## Current composition

- Market owns no tenant route files. Core's `/` and its public/content routes compose without Market overrides.
- Admin owns authentication, account, team management, active-team selection, invitations, public user/team identity profiles, and the shared API proxy.
- Core's route surface is unchanged.
- Every `@treeseed/ui` component, style, theme primitive, and export is unchanged and remains available to the redesign.
- Backend API, SDK, schemas, reconciliation, commerce, capacity, project, content, and operations capabilities remain in their owning packages.

The canonical route source is now the typed SDK `TreeseedRouteCapability` contract plus package-owned Admin and Core registries. `scripts/ui-architecture/inventory.ts` merges those registries and generates [ui-routes.md](./ui-routes.md), [ui-routes.csv](./ui-routes.csv), and [ui-architecture-inventory.md](./ui-architecture-inventory.md). API actions, proxies, and feeds use separate support registries with the same vocabulary.

## Shell ownership

Admin's authenticated layout presents only Start, Teams, Account, active-team selection, the notification bell, theme selector, and team-management actions. Account navigation is one shared section model spanning Identity, Sessions, Notifications, Appearance, and Delete. Auth pages use UI-package shells and compound components; account pages use `SettingsTemplate` and focused UI-package panels. Core continues to use its public content and reader layouts.

No deleted route has a redirect, alias, or compatibility wrapper. Public `/u/[username]` and `/t/[name]` pages show identity/team profile information only; they do not project projects, catalogs, knowledge packs, or operational state.

## Boundaries for redesign work

Route controllers and Admin view models may resolve identity, teams, memberships, and actions. Reusable visual structure, interaction behavior, focus management, validation, dialogs, account panels, and theme compilation stay in `@treeseed/ui`; portable contracts and registries stay in the SDK; persistence and policy stay in the API. Admin calls backend behavior only through focused facades or the CSRF-protected proxy. Market remains the tenant/config/content owner and does not absorb Admin or API implementation.

The architecture check rejects page-local CSS/scripts, direct `fetch`, and bespoke controls in auth/account page controllers. Provider callbacks and the shared proxy remain hidden support controllers. Custom-theme creation never activates a theme; only the authenticated shell selector writes the active appearance preference.

Run `npm run check:ui-architecture` and `npm run audit:ui` when changing the current surface. Refresh generated inventories with `npm run check:ui-architecture -- --write`.
