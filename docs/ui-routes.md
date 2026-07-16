# Current UI Routes

Generated from `scripts/ui-architecture/inventory.ts`. This inventory contains retained Admin routes and unchanged Core human-facing routes. Market contributes no tenant-owned routes. Non-page support endpoints are listed below the table.

| Owner | Route | Source | Access/policy | Data source |
| --- | --- | --- | --- | --- |
| admin | `/app` | `packages/admin/src/pages/app/index.astro` | signed-in principal | Admin auth/session and generic API facade |
| admin | `/app/account` | `packages/admin/src/pages/app/account.astro` | signed-in principal | Admin auth/session and generic API facade |
| admin | `/app/teams` | `packages/admin/src/pages/app/teams/index.astro` | signed-in principal; team membership and management role | Admin auth/session and generic API facade |
| admin | `/app/teams/:teamId/delete` | `packages/admin/src/pages/app/teams/[teamId]/delete.astro` | signed-in principal; team membership and management role | Admin auth/session and generic API facade |
| admin | `/app/teams/:teamId/edit` | `packages/admin/src/pages/app/teams/[teamId]/edit.astro` | signed-in principal; team membership and management role | Admin auth/session and generic API facade |
| admin | `/app/teams/:teamId/members` | `packages/admin/src/pages/app/teams/[teamId]/members.astro` | signed-in principal; team membership and management role | Admin auth/session and generic API facade |
| admin | `/app/teams/new` | `packages/admin/src/pages/app/teams/new.astro` | signed-in principal; team membership and management role | Admin auth/session and generic API facade |
| admin | `/auth/check-email` | `packages/admin/src/pages/auth/check-email.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/auth/confirm-email` | `packages/admin/src/pages/auth/confirm-email.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/auth/device/approve` | `packages/admin/src/pages/auth/device/approve.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/auth/forgot-password` | `packages/admin/src/pages/auth/forgot-password.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/auth/logout` | `packages/admin/src/pages/auth/logout.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/auth/register` | `packages/admin/src/pages/auth/register.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/auth/reset-password` | `packages/admin/src/pages/auth/reset-password.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/auth/sign-in` | `packages/admin/src/pages/auth/sign-in.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/auth/username` | `packages/admin/src/pages/auth/username.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/t/:name` | `packages/admin/src/pages/t/[name].astro` | public read | Admin auth/session and generic API facade |
| admin | `/team-invites/:token/accept` | `packages/admin/src/pages/team-invites/[token]/accept.astro` | anonymous-safe auth flow; safe return URL | Admin auth/session and generic API facade |
| admin | `/u/:username` | `packages/admin/src/pages/u/[username].astro` | public read | Admin auth/session and generic API facade |
| core | `/` | `packages/core/src/pages/index.astro` | public read | Core content runtime |
| core | `/:slug` | `packages/core/src/pages/[slug].astro` | public read | Core content runtime |
| core | `/404` | `packages/core/src/pages/404.astro` | public read | Core content runtime |
| core | `/agents` | `packages/core/src/pages/agents/index.astro` | public read | Core content runtime |
| core | `/agents/:slug` | `packages/core/src/pages/agents/[slug].astro` | public read | Core content runtime |
| core | `/books` | `packages/core/src/pages/books/index.astro` | public read | Core content runtime |
| core | `/books/:slug` | `packages/core/src/pages/books/[slug].astro` | public read | Core content runtime |
| core | `/contact` | `packages/core/src/pages/contact.astro` | public read | Core content runtime |
| core | `/decisions` | `packages/core/src/pages/decisions/index.astro` | public read | Core content runtime |
| core | `/decisions/:slug` | `packages/core/src/pages/decisions/[slug].astro` | public read | Core content runtime |
| core | `/docs-runtime` | `packages/core/src/pages/docs-runtime/index.astro` | public read | Core content runtime |
| core | `/docs-runtime/:slug*` | `packages/core/src/pages/docs-runtime/[...slug].astro` | public read | Core content runtime |
| core | `/notes` | `packages/core/src/pages/notes/index.astro` | public read | Core content runtime |
| core | `/notes/:slug` | `packages/core/src/pages/notes/[slug].astro` | public read | Core content runtime |
| core | `/objectives` | `packages/core/src/pages/objectives/index.astro` | public read | Core content runtime |
| core | `/objectives/:slug` | `packages/core/src/pages/objectives/[slug].astro` | public read | Core content runtime |
| core | `/people` | `packages/core/src/pages/people/index.astro` | public read | Core content runtime |
| core | `/people/:slug` | `packages/core/src/pages/people/[slug].astro` | public read | Core content runtime |
| core | `/proposals` | `packages/core/src/pages/proposals/index.astro` | public read | Core content runtime |
| core | `/proposals/:slug` | `packages/core/src/pages/proposals/[slug].astro` | public read | Core content runtime |
| core | `/questions` | `packages/core/src/pages/questions/index.astro` | public read | Core content runtime |
| core | `/questions/:slug` | `packages/core/src/pages/questions/[slug].astro` | public read | Core content runtime |
| core | `/ui` | `packages/core/src/pages/ui/index.astro` | public read | Core content runtime |

## Retained support endpoints

| Owner | Route | Source | Purpose |
| --- | --- | --- | --- |
| admin | `/auth/callback/[provider]` | `packages/admin/src/pages/auth/callback/[provider].ts` | OAuth callback |
| admin | `/v1/[...all]` | `packages/admin/src/pages/v1/[...all].ts` | Shared authenticated API facade |
| core | `/api/feedback/submit` | `packages/core/src/pages/api/feedback/submit.ts` | Core feedback forwarding |
| core | `/api/form/submit` | `packages/core/src/pages/api/form/submit.ts` | Core-owned form forwarding |
| core | `/feed.xml` | `packages/core/src/pages/feed.xml.ts` | Content feed |
