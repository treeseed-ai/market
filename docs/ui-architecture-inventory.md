# UI Architecture Inventory

Generated from `scripts/ui-architecture/inventory.ts`. This is the current post-cleanup route and component inventory; the removed surface is archived in [legacy-routes.md](./legacy-routes.md), and redesign direction lives in [ui-redesign.md](./ui-redesign.md).

Market currently owns no route files. Admin owns the retained authentication, account, team, active-team, invitation, and public identity/team profile surface. Core routes and every `@treeseed/ui` component remain unchanged.

## Human-facing routes

| Owner | Route | Source | Context | Shell | Template | Policy |
| --- | --- | --- | --- | --- | --- | --- |
| admin | `/app` | `packages/admin/src/pages/app/index.astro` | personal | AuthenticatedAppShell | dashboard | signed-in principal |
| admin | `/app/account` | `packages/admin/src/pages/app/account/index.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/account/appearance` | `packages/admin/src/pages/app/account/appearance.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/account/delete` | `packages/admin/src/pages/app/account/delete.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/account/notifications` | `packages/admin/src/pages/app/account/notifications.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/account/sessions` | `packages/admin/src/pages/app/account/sessions.astro` | personal | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/teams` | `packages/admin/src/pages/app/teams/index.astro` | team | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/teams/[teamId]/delete` | `packages/admin/src/pages/app/teams/[teamId]/delete.astro` | team | AuthenticatedAppShell | settings | signed-in principal |
| admin | `/app/teams/[teamId]/edit` | `packages/admin/src/pages/app/teams/[teamId]/edit.astro` | team | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/teams/[teamId]/members` | `packages/admin/src/pages/app/teams/[teamId]/members.astro` | team | AuthenticatedAppShell | collection | signed-in principal |
| admin | `/app/teams/new` | `packages/admin/src/pages/app/teams/new.astro` | team | AuthenticatedAppShell | wizard | signed-in principal |
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
| core | `/books` | `packages/core/src/pages/books/index.astro` | content | CoreReaderLayout | reader | public read |
| core | `/books/[slug]` | `packages/core/src/pages/books/[slug].astro` | content | CoreReaderLayout | reader | public read |
| core | `/contact` | `packages/core/src/pages/contact.astro` | content | CoreContentLayout | auth-form | public read |
| core | `/decisions` | `packages/core/src/pages/decisions/index.astro` | content | CoreContentLayout | collection | public read |
| core | `/decisions/[slug]` | `packages/core/src/pages/decisions/[slug].astro` | content | CoreContentLayout | detail | public read |
| core | `/docs-runtime` | `packages/core/src/pages/docs-runtime/index.astro` | content | CoreReaderLayout | reader | public read |
| core | `/docs-runtime/[...slug]` | `packages/core/src/pages/docs-runtime/[...slug].astro` | content | CoreReaderLayout | reader | public read |
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
| core | `/ui` | `packages/core/src/pages/ui/index.astro` | content | CoreContentLayout | collection | public read |

## Component groups

| Owner | Group | Source | Current use | Architecture target |
| --- | --- | --- | --- | --- |
| admin | Authenticated identity shell | `packages/admin/src/layouts/AppLayout.astro` | Account and team navigation | Retained identity/team composition only. |
| admin | Identity/team view models | `packages/admin/src/view-models` | Principal, active-team, and membership projections | Retained identity/team composition only. |
| admin | Public identity shell | `packages/admin/src/layouts/PublicLayout.astro` | Public user/team profiles and invitations | Retained identity/team composition only. |
| core | Core layouts | `packages/core/src/layouts` | Unchanged public content composition | Retained identity/team composition only. |
| ui | Reusable Astro components | `packages/ui/src/astro` | Canonical layout-down templates and auth/account compound components | Preserve reusable package-owned primitives for the redesign. |
| ui | Reusable React components | `packages/ui/src/react` | Shared interactive components available to package-owned surfaces | Preserve reusable package-owned primitives for the redesign. |
| ui | Theme and CSS primitives | `packages/ui/src/styles` | Shared tokens, theme compiler, validation, and styles | Preserve reusable package-owned primitives for the redesign. |
