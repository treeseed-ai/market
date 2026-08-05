# UI Architecture Inventory

Generated from `scripts/ui-architecture/inventory.ts`. This is the canonical current route and component inventory. Team service-management architecture is documented in [service-management.md](./service-management.md).

Market currently owns no route files. Admin owns authentication, accounts, teams, active-team services, invitations, and public user/team profiles. Core owns public content routes, while reusable visual composition remains in `@treeseed/ui`.

## Human-facing routes

| Owner | Route | Source | Context | Shell | Template | Policy |
| --- | --- | --- | --- | --- | --- | --- |
| admin | `/app` | `packages/admin/src/pages/app/index.astro` | personal | AuthenticatedAppShell | dashboard | signed-in principal |
| admin | `/app/account` | `packages/admin/src/pages/app/account/index.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/account/appearance` | `packages/admin/src/pages/app/account/appearance.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/account/delete` | `packages/admin/src/pages/app/account/delete.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/account/notifications` | `packages/admin/src/pages/app/account/notifications.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/account/sessions` | `packages/admin/src/pages/app/account/sessions.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/capacity` | `packages/admin/src/pages/app/capacity/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/command` | `packages/admin/src/pages/app/command/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/command/agents` | `packages/admin/src/pages/app/command/agents/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/command/assignments/[assignmentId]` | `packages/admin/src/pages/app/command/assignments/[assignmentId].astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/feedback` | `packages/admin/src/pages/app/feedback/index.astro` | personal | AuthenticatedAppShell | collection | platform_admin |
| admin | `/app/feedback/[feedbackId]` | `packages/admin/src/pages/app/feedback/[feedbackId].astro` | personal | AuthenticatedAppShell | collection | platform_admin |
| admin | `/app/focus` | `packages/admin/src/pages/app/focus/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/focus/decisions` | `packages/admin/src/pages/app/focus/decisions.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/focus/proposals` | `packages/admin/src/pages/app/focus/proposals/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/focus/proposals/[proposalId]` | `packages/admin/src/pages/app/focus/proposals/[proposalId].astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/focus/questions` | `packages/admin/src/pages/app/focus/questions.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/knowledge` | `packages/admin/src/pages/app/knowledge/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/knowledge/packs/[buildId]/download` | `packages/admin/src/pages/app/knowledge/packs/[buildId]/download.ts` | personal | AuthenticatedAppShell | action | signed-in principal |
| admin | `/app/market` | `packages/admin/src/pages/app/market.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/projects` | `packages/admin/src/pages/app/projects/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/projects/[projectId]` | `packages/admin/src/pages/app/projects/[projectId]/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/projects/[projectId]/agents` | `packages/admin/src/pages/app/projects/[projectId]/agents/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/projects/[projectId]/agents/[agentId]` | `packages/admin/src/pages/app/projects/[projectId]/agents/[agentId].astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/projects/[projectId]/books` | `packages/admin/src/pages/app/projects/[projectId]/books/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/projects/[projectId]/workflows` | `packages/admin/src/pages/app/projects/[projectId]/workflows.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/services` | `packages/admin/src/pages/app/services/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/services/[connectionId]` | `packages/admin/src/pages/app/services/[connectionId].astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/services/new` | `packages/admin/src/pages/app/services/new.astro` | personal | AuthenticatedAppShell | wizard | signed-in principal |
| admin | `/app/services/vault` | `packages/admin/src/pages/app/services/vault.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/teams` | `packages/admin/src/pages/app/teams/index.astro` | team | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/teams/[teamId]` | `packages/admin/src/pages/app/teams/[teamId]/index.astro` | team | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/teams/[teamId]/delete` | `packages/admin/src/pages/app/teams/[teamId]/delete.astro` | team | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/teams/[teamId]/edit` | `packages/admin/src/pages/app/teams/[teamId]/edit.astro` | team | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/teams/[teamId]/members` | `packages/admin/src/pages/app/teams/[teamId]/members.astro` | team | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/teams/active` | `packages/admin/src/pages/app/teams/active.ts` | team | AuthenticatedAppShell | action | signed-in principal |
| admin | `/app/teams/new` | `packages/admin/src/pages/app/teams/new.astro` | team | AuthenticatedAppShell | wizard | signed-in principal |
| admin | `/app/work` | `packages/admin/src/pages/app/work/index.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/[runId]` | `packages/admin/src/pages/app/work/[runId].astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/agents` | `packages/admin/src/pages/app/work/entity-overview.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/artifacts` | `packages/admin/src/pages/app/work/entity-overview.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/assignments` | `packages/admin/src/pages/app/work/entity-overview.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/build` | `packages/admin/src/pages/app/work/build.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/decisions` | `packages/admin/src/pages/app/work/decisions.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/direction` | `packages/admin/src/pages/app/work/direction.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/events` | `packages/admin/src/pages/app/work/entity-overview.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/executions` | `packages/admin/src/pages/app/work/entity-overview.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/find` | `packages/admin/src/pages/app/work/find.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/inbox` | `packages/admin/src/pages/app/work/inbox.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/results` | `packages/admin/src/pages/app/work/results.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/work/workdays` | `packages/admin/src/pages/app/work/workdays.astro` | personal | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/auth/callback/[provider]` | `packages/admin/src/pages/auth/callback/[provider].ts` | auth | AuthShell | redirect | anonymous principal only; configured provider; one-time database state; nonce and PKCE validation; safe return URL |
| admin | `/auth/check-email` | `packages/admin/src/pages/auth/check-email.astro` | auth | AuthShell | detail | anonymous principal only; safe return URL |
| admin | `/auth/confirm-email` | `packages/admin/src/pages/auth/confirm-email.astro` | auth | AuthShell | detail | valid one-time confirmation token; anonymous or signed-in principal; safe return URL |
| admin | `/auth/device/approve` | `packages/admin/src/pages/auth/device/approve.astro` | auth | AuthShell | auth-form | signed-in principal; valid pending device request |
| admin | `/auth/forgot-password` | `packages/admin/src/pages/auth/forgot-password.astro` | auth | AuthShell | auth-form | anonymous principal only; safe return URL |
| admin | `/auth/logout` | `packages/admin/src/pages/auth/logout.ts` | auth | AuthShell | redirect | GET is non-mutating; POST requires signed-in session and double-submit CSRF |
| admin | `/auth/register` | `packages/admin/src/pages/auth/register.astro` | auth | AuthShell | auth-form | anonymous principal only; safe return URL |
| admin | `/auth/reset-password` | `packages/admin/src/pages/auth/reset-password.astro` | auth | AuthShell | auth-form | anonymous principal only; safe return URL |
| admin | `/auth/sign-in` | `packages/admin/src/pages/auth/sign-in.astro` | auth | AuthShell | auth-form | anonymous principal only; safe return URL |
| admin | `/auth/username` | `packages/admin/src/pages/auth/username.astro` | auth | AuthShell | auth-form | restricted provider-onboarding session; username not already assigned; safe return URL |
| admin | `/t/[name]` | `packages/admin/src/pages/t/[name].astro` | team | PublicSingleColumnShell | detail | public read |
| admin | `/team-invites/[token]/accept` | `packages/admin/src/pages/team-invites/[token]/accept.astro` | auth | PublicSingleColumnShell | collection | signed-in principal |
| admin | `/u/[username]` | `packages/admin/src/pages/u/[username].astro` | public | PublicSingleColumnShell | detail | public read |
| core | `/` | `packages/core/src/pages/index.astro` | content | CoreContentLayout | dashboard | public read |
| core | `/[slug]` | `packages/core/src/pages/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/404` | `packages/core/src/pages/404.astro` | content | CoreContentLayout | collection | public read |
| core | `/agents` | `packages/core/src/pages/agents/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/agents/[slug]` | `packages/core/src/pages/agents/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/books` | `packages/core/src/pages/books/index.astro` | content | CoreReaderLayout | reader | public books; authorized authenticated books |
| core | `/contact` | `packages/core/src/pages/contact.astro` | content | CoreContentLayout | auth-form | public read |
| core | `/decisions` | `packages/core/src/pages/decisions/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/decisions/[slug]` | `packages/core/src/pages/decisions/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/notes` | `packages/core/src/pages/notes/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/notes/[slug]` | `packages/core/src/pages/notes/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/objectives` | `packages/core/src/pages/objectives/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/objectives/[slug]` | `packages/core/src/pages/objectives/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/people` | `packages/core/src/pages/people/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/people/[slug]` | `packages/core/src/pages/people/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/proposals` | `packages/core/src/pages/proposals/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/proposals/[slug]` | `packages/core/src/pages/proposals/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/questions` | `packages/core/src/pages/questions/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/questions/[slug]` | `packages/core/src/pages/questions/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/t/[teamSlug]/books/[bookSlug]` | `packages/core/src/pages/t/[teamSlug]/books/[bookSlug]/index.astro` | team | CoreReaderLayout | reader | public book; authorized authenticated book |
| core | `/t/[teamSlug]/books/[bookSlug]/[...pageSlug]` | `packages/core/src/pages/t/[teamSlug]/books/[bookSlug]/[...pageSlug].astro` | team | CoreReaderLayout | reader | public page; authorized authenticated page |
| core | `/ui` | `packages/core/src/pages/ui/index.astro` | content | CoreContentLayout | collection | public read |

## Component groups

| Owner | Group | Source | Current use | Architecture target |
| --- | --- | --- | --- | --- |
| admin | Authenticated identity shell | `packages/admin/src/layouts/AppLayout.astro` | Account and team navigation | Canonical package-owned composition. |
| admin | Identity/team view models | `packages/admin/src/view-models` | Principal, active-team, and membership projections | Canonical package-owned composition. |
| admin | Public identity shell | `packages/admin/src/layouts/PublicLayout.astro` | Public user/team profiles and invitations | Canonical package-owned composition. |
| core | Core layouts | `packages/core/src/layouts` | Unchanged public content composition | Canonical package-owned composition. |
| ui | Reusable Astro components | `packages/ui/src/astro` | Canonical layout-down templates and auth/account compound components | Canonical reusable package-owned primitives. |
| ui | Reusable React components | `packages/ui/src/react` | Shared interactive components available to package-owned surfaces | Canonical reusable package-owned primitives. |
| ui | Theme and CSS primitives | `packages/ui/src/styles` | Shared tokens, theme compiler, validation, and styles | Canonical reusable package-owned primitives. |
