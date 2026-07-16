# UI Architecture Inventory

Generated from `scripts/ui-architecture/inventory.ts`. This is the current post-cleanup route and component inventory; the removed surface is archived in [legacy-routes.md](./legacy-routes.md), and redesign direction lives in [ui-redesign.md](./ui-redesign.md).

Market currently owns no route files. Admin owns the retained authentication, account, team, active-team, invitation, and public identity/team profile surface. Core routes and every `@treeseed/ui` component remain unchanged.

## Human-facing routes

| Owner | Route | Source | Context | Shell | Template | Policy |
| --- | --- | --- | --- | --- | --- | --- |
| admin | `/app` | `packages/admin/src/pages/app/index.astro` | personal | AuthenticatedAppShell | dashboard | signed-in principal |
| admin | `/app/account` | `packages/admin/src/pages/app/account.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/teams` | `packages/admin/src/pages/app/teams/index.astro` | team | AuthenticatedAppShell | collection | signed-in principal; team membership and management role |
| admin | `/app/teams/:teamId/delete` | `packages/admin/src/pages/app/teams/[teamId]/delete.astro` | team | AuthenticatedAppShell | detail | signed-in principal; team membership and management role |
| admin | `/app/teams/:teamId/edit` | `packages/admin/src/pages/app/teams/[teamId]/edit.astro` | team | AuthenticatedAppShell | detail | signed-in principal; team membership and management role |
| admin | `/app/teams/:teamId/members` | `packages/admin/src/pages/app/teams/[teamId]/members.astro` | team | AuthenticatedAppShell | detail | signed-in principal; team membership and management role |
| admin | `/app/teams/new` | `packages/admin/src/pages/app/teams/new.astro` | team | AuthenticatedAppShell | wizard | signed-in principal; team membership and management role |
| admin | `/auth/check-email` | `packages/admin/src/pages/auth/check-email.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/auth/confirm-email` | `packages/admin/src/pages/auth/confirm-email.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/auth/device/approve` | `packages/admin/src/pages/auth/device/approve.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/auth/forgot-password` | `packages/admin/src/pages/auth/forgot-password.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/auth/logout` | `packages/admin/src/pages/auth/logout.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/auth/register` | `packages/admin/src/pages/auth/register.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/auth/reset-password` | `packages/admin/src/pages/auth/reset-password.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/auth/sign-in` | `packages/admin/src/pages/auth/sign-in.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/auth/username` | `packages/admin/src/pages/auth/username.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/t/:name` | `packages/admin/src/pages/t/[name].astro` | team | PublicSingleColumnShell | detail | public read |
| admin | `/team-invites/:token/accept` | `packages/admin/src/pages/team-invites/[token]/accept.astro` | auth | AuthShell | auth-form | anonymous-safe auth flow; safe return URL |
| admin | `/u/:username` | `packages/admin/src/pages/u/[username].astro` | public | PublicSingleColumnShell | detail | public read |
| core | `/` | `packages/core/src/pages/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/:slug` | `packages/core/src/pages/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/404` | `packages/core/src/pages/404.astro` | content | CoreContentLayout | collection | public read |
| core | `/agents` | `packages/core/src/pages/agents/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/agents/:slug` | `packages/core/src/pages/agents/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/books` | `packages/core/src/pages/books/index.astro` | content | CoreReaderLayout | reader | public read |
| core | `/books/:slug` | `packages/core/src/pages/books/[slug].astro` | content | CoreReaderLayout | reader | public read |
| core | `/contact` | `packages/core/src/pages/contact.astro` | content | CoreContentLayout | collection | public read |
| core | `/decisions` | `packages/core/src/pages/decisions/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/decisions/:slug` | `packages/core/src/pages/decisions/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/docs-runtime` | `packages/core/src/pages/docs-runtime/index.astro` | content | CoreReaderLayout | reader | public read |
| core | `/docs-runtime/:slug*` | `packages/core/src/pages/docs-runtime/[...slug].astro` | content | CoreReaderLayout | reader | public read |
| core | `/notes` | `packages/core/src/pages/notes/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/notes/:slug` | `packages/core/src/pages/notes/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/objectives` | `packages/core/src/pages/objectives/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/objectives/:slug` | `packages/core/src/pages/objectives/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/people` | `packages/core/src/pages/people/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/people/:slug` | `packages/core/src/pages/people/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/proposals` | `packages/core/src/pages/proposals/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/proposals/:slug` | `packages/core/src/pages/proposals/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/questions` | `packages/core/src/pages/questions/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/questions/:slug` | `packages/core/src/pages/questions/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/ui` | `packages/core/src/pages/ui/index.astro` | content | CoreContentLayout | collection | public read |

## Component groups

| Owner | Group | Source | Current use | Architecture target |
| --- | --- | --- | --- | --- |
| admin | Authenticated identity shell | `packages/admin/src/layouts/TreeseedAppLayout.astro` | Account and team navigation | Retained identity/team composition only. |
| admin | Identity/team view models | `packages/admin/src/view-models` | Principal, active-team, and membership projections | Retained identity/team composition only. |
| admin | Public identity shell | `packages/admin/src/layouts/TreeseedPublicLayout.astro` | Public user/team profiles and invitations | Retained identity/team composition only. |
| core | Core layouts | `packages/core/src/layouts` | Unchanged public content composition | Retained identity/team composition only. |
| ui | Reusable Astro components | `packages/ui/src/astro` | Shared layout-down components; unchanged by cleanup | Preserve reusable package-owned primitives for the redesign. |
| ui | Reusable React components | `packages/ui/src/react` | Shared interactive components; unchanged by cleanup | Preserve reusable package-owned primitives for the redesign. |
| ui | Theme and CSS primitives | `packages/ui/src/styles` | Shared tokens and styles; unchanged by cleanup | Preserve reusable package-owned primitives for the redesign. |
