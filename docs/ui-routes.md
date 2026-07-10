# TreeSeed UI Routes

This inventory aggregates UI-rendered routes from the top-level Market project plus the `@treeseed/core` and `@treeseed/admin` packages. API handlers, proxy endpoints, XML feeds, and form submission endpoints are excluded.

## Public Site And Knowledge Hub

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Public site | `/` | Market, Core | Main TreeSeed landing surface. In Market it introduces workflow imports, private teams, public work, and marketplace entry points; in Core it serves the default project knowledge hub home. |
| Public site | `/404` | Core | Not-found page shown when a requested UI route or content entry cannot be resolved. |
| Public pages | `/[slug]` | Core | Renders published page-model content by slug for project or tenant-owned informational pages. |
| Public site | `/contact` | Core | Contact page for submitting inquiries through the configured TreeSeed contact form. |
| Public UI reference | `/ui` | Core | Internal UI foundation reference page for checking shared component styling, controls, cards, and layout primitives. |
| Docs runtime | `/docs-runtime` | Core | Documentation runtime index for project docs content served through the Core site shell. |
| Docs runtime | `/docs-runtime/[...slug]` | Core | Documentation runtime detail route for nested docs pages. |

## Public Content Collections

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Agents | `/agents` | Core | Lists published TreeSeed agents for a project or tenant. |
| Agents | `/agents/[slug]` | Core | Shows one published agent definition, role, responsibilities, and related context. |
| Books | `/books` | Core | Lists published knowledge books. |
| Books | `/books/[slug]` | Core | Shows one book landing page and its assembled knowledge references. |
| Decisions | `/decisions` | Core | Lists published decisions. |
| Decisions | `/decisions/[slug]` | Core | Shows one decision record, rationale, and linked work context. |
| Notes | `/notes` | Core | Lists published notes. |
| Notes | `/notes/[slug]` | Core | Shows one note and its linked subject matter. |
| Objectives | `/objectives` | Core | Lists published objectives. |
| Objectives | `/objectives/[slug]` | Core | Shows one objective, status, context, and linked work. |
| People | `/people` | Core | Lists published people or contributors. |
| People | `/people/[slug]` | Core | Shows one contributor profile and related work. |
| Proposals | `/proposals` | Core | Lists published proposals. |
| Proposals | `/proposals/[slug]` | Core | Shows one proposal, discussion context, and decision state. |
| Questions | `/questions` | Core | Lists published questions and answers. |
| Questions | `/questions/[slug]` | Core | Shows one question, answers, and related context. |

## Public Marketplace And Commerce

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Marketplace | `/marketplace` | Market | Buyer-facing marketplace for discovering governed digital products, services, and capacity offerings. |
| Marketplace | `/market/products/[productId]` | Market | Product detail page for reviewing buyer-visible terms, pricing, ownership, entitlements, and checkout actions. |
| Cart and checkout | `/cart` | Market | Cart surface for reviewing selected marketplace offers and starting checkout. |
| Cart and checkout | `/checkout/[checkoutId]` | Market | Checkout review page for completing a marketplace checkout session. |
| Capacity marketplace | `/capacity` | Market | Public capacity listing index for reviewing buyer-visible execution posture and inquiry options. |
| Capacity marketplace | `/capacity/[listingId]` | Market | Capacity listing detail page for reviewing trust, availability, and submitting an inquiry. |
| Services | `/services/new` | Market | Service request form for creating a scoped buyer inquiry. |
| Services | `/services/[requestId]` | Market | Service request detail page for reviewing request status, seller quote state, and buyer decisions. |
| Services | `/services/[requestId]/checkout` | Market | Service checkout page for starting or completing checkout on an accepted service contract. |

## Public Commons Governance

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Commons | `/commons` | Market | Public advisory governance hub for proposals, questions, participation signals, and steward activity. |
| Commons proposals | `/commons/proposals/new` | Market | Public proposal submission form for signed-in participants. |
| Commons proposals | `/commons/proposals/[proposalId]` | Market | Public proposal detail page for reviewing proposal status and submitting governance actions such as votes. |
| Commons questions | `/commons/questions/new` | Market | Public question submission form for signed-in participants. |

## Public Market Imports

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Imports market | `/market` | Admin | Public market catalog for TreeSeed workflow imports. |
| Knowledge packs | `/market/knowledge-packs` | Admin | Lists public knowledge packs available for import. |
| Knowledge packs | `/market/knowledge-packs/[slug]` | Admin | Shows one public knowledge pack, its contents, and import context. |
| Templates | `/market/templates` | Admin | Lists public project or workflow templates available for import. |
| Templates | `/market/templates/[slug]` | Admin | Shows one public template, included content, and import context. |

## Public Identity And Profile Pages

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Team profile | `/t/[name]` | Admin | Public team profile page. |
| Project profile | `/p/[project]` | Admin | Public project profile page. |
| User profile | `/u/[username]` | Admin | Public user profile page. |
| Team invitations | `/team-invites/[token]/accept` | Admin | Invitation acceptance page for joining a team. |

## Authentication

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Sign in | `/auth/sign-in` | Admin | Sign-in page for email or configured OAuth providers. |
| Registration | `/auth/register` | Admin | User registration page. |
| Email verification | `/auth/check-email` | Admin | Post-registration or sign-in page prompting the user to check email. |
| Email verification | `/auth/confirm-email` | Admin | Email confirmation page for completing account verification. |
| Password recovery | `/auth/forgot-password` | Admin | Starts password reset by collecting account email. |
| Password recovery | `/auth/reset-password` | Admin | Completes password reset using a reset token. |
| Username setup | `/auth/username` | Admin | Account username setup or correction page. |
| Device authorization | `/auth/device/approve` | Admin | Device approval page for authorizing a secondary sign-in flow. |
| Logout | `/auth/logout` | Admin | Logout confirmation and session termination page. |

## App Dashboard And Account

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| App dashboard | `/app` | Admin | Authenticated application home summarizing current team, work, projects, knowledge, capacity, and services. |
| Account | `/app/account` | Admin | Account management page for profile, preferences, sessions, notifications, API tokens, appearance, and deletion controls. |
| Services | `/app/services` | Admin | Authenticated service operations overview. |

## App Work Management

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Work overview | `/app/work` | Admin | Work hub for navigating objectives, questions, proposals, decisions, notes, and review queues. |
| Review | `/app/work/review` | Admin | Review queue for pending or recently changed work records. |
| Decisions | `/app/work/decisions` | Admin | Lists work decisions. |
| Decisions | `/app/work/decisions/new` | Admin | Creates a decision record. |
| Decisions | `/app/work/decisions/[slug]` | Admin | Shows one decision and its related work. |
| Decisions | `/app/work/decisions/[slug]/edit` | Admin | Edits an existing decision. |
| Notes | `/app/work/notes` | Admin | Lists notes. |
| Notes | `/app/work/notes/new` | Admin | Creates a linked note. |
| Notes | `/app/work/notes/[slug]` | Admin | Shows one note. |
| Notes | `/app/work/notes/[slug]/edit` | Admin | Edits an existing note. |
| Objectives | `/app/work/objectives` | Admin | Lists objectives. |
| Objectives | `/app/work/objectives/new` | Admin | Creates an objective. |
| Objectives | `/app/work/objectives/[slug]` | Admin | Shows one objective and related progress. |
| Objectives | `/app/work/objectives/[slug]/edit` | Admin | Edits an existing objective. |
| Proposals | `/app/work/proposals` | Admin | Lists proposals. |
| Proposals | `/app/work/proposals/new` | Admin | Creates a proposal. |
| Proposals | `/app/work/proposals/[slug]` | Admin | Shows one proposal, review state, and linked decisions. |
| Proposals | `/app/work/proposals/[slug]/edit` | Admin | Edits an existing proposal. |
| Questions | `/app/work/questions` | Admin | Lists questions and answers. |
| Questions | `/app/work/questions/new` | Admin | Asks a new question. |
| Questions | `/app/work/questions/[slug]` | Admin | Shows one question and answer context. |
| Questions | `/app/work/questions/[slug]/edit` | Admin | Edits an existing question. |

## App Commons Governance

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Commons | `/app/commons` | Admin | Authenticated commons governance dashboard. |
| Commons participants | `/app/commons/participants` | Admin | Reviews commons participants and participation signals. |
| Commons proposals | `/app/commons/proposals/[proposalId]` | Admin | Reviews a commons proposal in the authenticated app shell. |

## App Projects

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Projects | `/app/projects` | Admin | Lists projects available to the current user or team. |
| Projects | `/app/projects/new` | Admin | Creates a new project. |
| Projects | `/app/projects/[projectId]` | Admin | Project profile and operational overview. |
| Project agents | `/app/projects/[projectId]/agents` | Admin | Lists agents configured for a project. |
| Project agents | `/app/projects/[projectId]/agents/new` | Admin | Creates a project agent. |
| Project agents | `/app/projects/[projectId]/agents/[agentSlug]` | Admin | Views or edits a project agent configuration and runtime posture. |
| Project artifacts | `/app/projects/[projectId]/artifacts` | Admin | Reviews project artifacts produced by workdays or knowledge operations. |
| Project decisions | `/app/projects/[projectId]/decisions` | Admin | Reviews project-scoped decisions. |
| Project lifecycle | `/app/projects/[projectId]/delete` | Admin | Project deletion confirmation and blocking-record review. |
| Project deployment | `/app/projects/[projectId]/deploy` | Admin | Project deployment readiness and deploy controls. |
| Project deployment | `/app/projects/deployment/[id]` | Admin | Deployment detail page for one deployment operation. |
| Project guidance | `/app/projects/[projectId]/guidance` | Admin | Project guidance and operating instructions. |
| Project hosts | `/app/projects/[projectId]/hosts` | Admin | Project host bindings and runtime host posture. |
| Project knowledge | `/app/projects/[projectId]/knowledge` | Admin | Project private knowledge index. |
| Project knowledge | `/app/projects/[projectId]/knowledge/[...slug]` | Admin | Project private knowledge detail route for nested content. |
| Project settings | `/app/projects/[projectId]/settings` | Admin | Project settings and configuration controls. |
| Project workdays | `/app/projects/[projectId]/workdays` | Admin | Lists workdays for a project. |
| Project workdays | `/app/projects/[projectId]/workdays/[workdayId]` | Admin | Workday detail page with run context, artifacts, and outcomes. |

## App Teams

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Teams | `/app/teams` | Admin | Lists teams available to the current account and supports active team selection. |
| Teams | `/app/teams/new` | Admin | Creates a new team. |
| Team settings | `/app/teams/[teamId]/edit` | Admin | Edits team profile and settings. |
| Team settings | `/app/teams/[teamId]/delete` | Admin | Deletes a team when no blocking records prevent removal. |
| Team membership | `/app/teams/[teamId]/members` | Admin | Invites, removes, and changes roles for team members. |

## App Seller And Commerce Operations

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Seller dashboard | `/app/market/seller` | Admin | Seller setup and marketplace readiness dashboard. |
| Seller readiness | `/app/teams/[teamId]/commerce` | Admin | Team-specific seller readiness and commerce governance overview. |
| Products | `/app/teams/[teamId]/commerce/products` | Admin | Reviews seller products. |
| Products | `/app/teams/[teamId]/commerce/products/[productId]/governance` | Admin | Manages cooperative ownership, stewardship, attribution, transfer, and succession for one product. |
| Sales | `/app/teams/[teamId]/commerce/sales` | Admin | Reviews sales, fulfillment, refunds, revocations, and seller operation state. |
| Services | `/app/teams/[teamId]/commerce/services` | Admin | Reviews service requests and seller scoping work. |
| Services | `/app/teams/[teamId]/commerce/services/[requestId]` | Admin | Manages one service request, quote, contract, and fulfillment state. |
| Capacity listings | `/app/teams/[teamId]/commerce/capacity` | Admin | Manages marketplace capacity listings and inquiries for a seller team. |
| Capacity listings | `/app/teams/[teamId]/commerce/capacity/[listingId]` | Admin | Reviews and updates one capacity listing's trust, transparency, and inquiry state. |

## App Capacity Operations

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Capacity overview | `/app/capacity` | Admin | Capacity control surface for providers, allocation, runtime, and workday runs. |
| Allocation | `/app/capacity/allocation` | Admin | Team and project capacity allocation overview. |
| Allocation | `/app/capacity/allocation/projects/[projectId]` | Admin | Project capacity allocation detail. |
| Allocation | `/app/capacity/allocation/projects/[projectId]/modes/[modeId]` | Admin | Allocation controls for one project mode. |
| Allocation | `/app/capacity/allocation/projects/[projectId]/agents/[agentSlug]` | Admin | Allocation controls for one project agent. |
| Runtime | `/app/capacity/runtime` | Admin | Provider runtime and local capacity execution state. |
| Workday runs | `/app/capacity/workday-runs` | Admin | Lists capacity-backed workday runs. |
| Workday runs | `/app/capacity/workday-runs/[runId]` | Admin | Workday run detail page with mode-run and runtime diagnostics. |
| Providers | `/app/capacity/providers` | Admin | Lists capacity providers registered to the current scope. |
| Providers | `/app/capacity/providers/new` | Admin | Registers a new capacity provider. |
| Providers | `/app/capacity/providers/[providerId]` | Admin | Provider detail page for status, capabilities, and assignments. |
| Providers | `/app/capacity/providers/[providerId]/settings` | Admin | Provider settings and configuration controls. |
| Providers | `/app/capacity/providers/[providerId]/keys` | Admin | Provider registration key rotation and credential controls. |

## App Hosts And Knowledge Distribution

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Hosts | `/app/hosts` | Admin | Lists managed hosts and deployment targets. |
| Hosts | `/app/hosts/new` | Admin | Creates a new host. |
| Hosts | `/app/hosts/[hostType]/new` | Admin | Creates a new host of a selected host type. |
| Hosts | `/app/hosts/[hostType]/[hostId]` | Admin | Host detail page for runtime posture and linked resources. |
| Hosts | `/app/hosts/[hostType]/[hostId]/settings` | Admin | Host settings and credential controls. |
| Knowledge library | `/app/hosts/knowledge-library` | Admin | Host-facing knowledge library management surface. |

## App Knowledge Management

| Category | Route path | Source | Purpose and activities |
| --- | --- | --- | --- |
| Knowledge overview | `/app/knowledge` | Admin | Authenticated knowledge dashboard for private content, distribution, imports, and releases. |
| Knowledge detail | `/app/knowledge/[category]/[slug]` | Admin | Generic knowledge detail route for a category and slug. |
| Artifacts | `/app/knowledge/artifacts` | Admin | Reviews generated or imported knowledge artifacts. |
| Books | `/app/knowledge/books` | Admin | Lists private books. |
| Books | `/app/knowledge/books/[slug]` | Admin | Shows one private book. |
| Capabilities | `/app/knowledge/capabilities` | Admin | Lists knowledge capabilities. |
| Capabilities | `/app/knowledge/capabilities/[slug]` | Admin | Shows one knowledge capability. |
| Imports | `/app/knowledge/imports` | Admin | Reviews imported templates, packs, or content bundles. |
| Imports | `/app/knowledge/imports/[slug]` | Admin | Shows one import record. |
| Packs | `/app/knowledge/packs` | Admin | Lists private or managed knowledge packs. |
| Publish | `/app/knowledge/publish` | Admin | Publishing workflow for preparing knowledge distribution. |
| Releases | `/app/knowledge/releases` | Admin | Lists knowledge releases. |
| Releases | `/app/knowledge/releases/[releaseId]` | Admin | Shows one knowledge release. |
| Releases | `/app/knowledge/releases/[releaseId]/review` | Admin | Review page for approving or checking one knowledge release. |
| Templates | `/app/knowledge/templates` | Admin | Lists private or managed templates. |
