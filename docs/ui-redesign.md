# TreeSeed UI Route and Ecommerce Redesign

Status: implementation plan  
Planning inputs: /home/adrian/Downloads/ui-routes.csv and /home/adrian/Downloads/chat-ecommerce.md  
Scope: Market tenant, Admin package, UI package, Core public routes, SDK commerce contracts, and API commerce/provisioning behavior

## 1. Purpose

This plan defines the clean implementation that follows the separate top-level route cleanup. It standardizes routes by UI archetype, establishes one canonical owner for every route and backend capability, and replaces the current cart-oriented, connected-account commerce topology with contextual purchases built around team billing, Stripe Billing/Invoicing, Stripe Connect, an internal ledger, durable entitlements, and payment-gated provisioning.

The redesign is a replacement, not an additive migration of page variants. Each route category must be completed as a vertical slice—contract, API, view model, controller, template, navigation, tests, and guarantees—before the next category begins.

## 2. Preconditions and cleanup handoff

The route cleanup occurs before this plan is implemented. Cleanup is authorized separately and is not an implementation phase in this document.

### 2.1 Routes retained through cleanup

The cleanup must preserve working authentication, account management, active-team selection, and team management behavior. At minimum, preserve:

- Authentication controllers and flows under /auth, including registration, verification, sign-in, sign-out, password reset, and device approval.
- The authenticated /app shell and active-team selector.
- /app/account and all account-management behavior that exists at cleanup time.
- /app/teams, team creation, team settings, membership/invitation management, team deletion, and active-team selection.
- Public user and team profile behavior if it is required by the preserved identity/team flows.
- Shared auth/session middleware, CSRF handling, Admin API facades, policy checks, layouts, and error handling used by those routes.

Preservation means behavior remains operational; it does not freeze the current filenames or prevent later migration to the canonical paths in this plan.

### 2.2 Routes removed by cleanup

Except for the preserved set above, top-level Market and Admin pages should be removed before implementation, including old host, project, deployment, capacity, work, knowledge, seller-market, marketplace, cart, checkout, commons, services, and overlapping detail/edit variants. Remove their navigation entries, route-registry entries, page-specific view models, route-specific tests, and guarantees when those items have no preserved consumer.

The cleanup must not casually remove backend domain behavior. API, SDK, schema, reconciliation, operation, and content-runtime capabilities remain until their owning redesign phase explicitly migrates or retires them.

### 2.3 Cleanup exit gate

Implementation may begin only when:

- The remaining human-facing Astro routes exactly match the documented preserved set.
- Admin still builds and tests independently.
- Market composes Admin and Core without route collisions.
- Authentication, account, active-team, and team-management guarantees pass.
- The generated UI inventory contains no deleted route.
- There are no orphan navigation targets, imports, view models, or active guarantees for removed pages.
- No second or compatibility route has been added in anticipation of this plan.

## 3. Audit findings that shape the redesign

### 3.1 Route composition is distributed

Human routes currently come from root Market pages, the Admin plugin route contribution, and Core public runtime pages. The root treeseed.site.yaml composes Core and Admin. A filesystem-only or Market-only route list is therefore not authoritative.

The current inventory script infers semantics from pathnames and hard-codes legacy paths such as /cart, /checkout, and /marketplace. Tests repeat those assumptions. The replacement must make route metadata the input and generated reports the output.

### 3.2 UI labels mix presentation, behavior, and layout

The CSV UI column contains JSON, Redirect, Message, Dashboard, Form, Confirm Form, List, List Ops, List Ops with Create, Card Search, Integrated Display, Form with Notes, Display with Notes, Stripe Forms, Marketing Display, and Book Viewer.

These are not one consistent abstraction. Some are response types, some are layouts, and some are traits. The redesign separates:

- Response kind: data, redirect, or page.
- Page archetype: message, dashboard, collection, settings, wizard, detail, workspace, profile, reader, or marketing.
- Traits: create, operations, search, cards, notes, danger, Stripe purchasing, or Stripe selling.

### 3.3 Existing UI architecture is reusable but incomplete

The UI package already provides useful provider-neutral templates including CollectionTemplate, SettingsTemplate, DashboardTemplate, DetailTemplate, and WorkspaceTemplate. Profile and Wizard templates are architectural concepts but are not complete canonical implementation surfaces. Existing templates should be tightened and reused; no route family should build its own parallel shell.

### 3.4 Current commerce conflicts with the target topology

The current schema and API are vendor-account-centric:

- Buyer customers may be created per vendor.
- Stripe products, prices, customers, PaymentIntents, and subscriptions are often created in connected-account context.
- Cart checkout is split into vendor payment groups.
- Browser confirmation can use a connected-account Stripe context.
- Refund behavior is coupled to direct connected-account charges.

The target is platform-centric:

- One buyer billing identity per team on the platform.
- A connected seller account only when a team enables selling.
- Platform-owned catalog prices, invoices, subscriptions, and buyer charges.
- Destination transfers or explicit transfers to sellers.
- Contextual quote and confirmation flows instead of a cart.
- An application ledger and entitlement store as the searchable product record.

These models cannot safely coexist as two canonical paths.

### 3.5 Project launch already has a canonical execution path

The API launch endpoint persists project and launch state before asynchronous bootstrap. The operations runner owns durable operation execution, while provider reconciliation owns infrastructure lifecycle. Existing tests cover recovery and the rule that provider credentials do not move through the operations runner.

Commerce must place an order/provisioning gate in front of this path. It must not add Stripe calls to reconciliation adapters, launch directly from a webhook, or create a second project bootstrap implementation.

### 3.6 Existing guarantees promise the legacy checkout

Active cart and checkout guarantees, UI inventory tests, Admin route tests, SDK commerce schema tests, and the API commerce tests encode the current payment-group behavior. Redesign work is incomplete until those contracts are deliberately replaced, not merely made to pass with aliases.

## 4. Canonical ownership

| Owner | Responsibilities in the redesign | Must not own |
| --- | --- | --- |
| @treeseed/ui | Provider-neutral shells, templates, form/collection/detail primitives, modal and sheet behavior, activity tables, status presentation, theme tokens | Stripe SDKs, API calls, tenant policy, route controllers |
| @treeseed/core | Public informational routes, people/agent/book pages, public reader runtime, content resolution | Authenticated operations, commerce policy, Stripe |
| @treeseed/admin | Authenticated shell, authentication/session/RBAC glue, account/team/host/project/capacity/work routes, API client facades, route view models | Root Market policy, Stripe implementation, API persistence, scheduling |
| @treeseed/market | Root tenant composition, public catalog, seller authoring routes, contextual purchase UI, Stripe Elements and Connect embedded-component controllers, product/business policy | Backend implementation imports, reusable Admin internals |
| @treeseed/sdk | Portable route and commerce contracts, enums, validators, client contracts, database schema declarations, provider-neutral helpers | UI controllers, Stripe client/server calls, API orchestration |
| @treeseed/api | Commerce persistence, Stripe gateway, webhooks, idempotency, ledger, orders, subscriptions, transfers, refunds, disputes, entitlements, outbox, provisioning coordination | Astro pages, provider UI, direct content mutation |
| @treeseed/agent | Existing agent runtime and workday execution | Commerce or Admin scheduling |

Market may consume only public exports from Admin/Core/UI/SDK and call API behavior over HTTP/client surfaces. Admin must remain independently buildable and must not import root Market source. UI must remain Stripe-free.

## 5. Route contract and UI standardization

### 5.1 Typed route capability registry

Create a portable route capability contract in SDK and package-owned registries in Core, Admin, and Market. The root composition merges registries, validates collisions, and generates route documentation and inventory.

Each human route record must include:

- Stable capability ID.
- Route pattern and response kind.
- Owning package and category.
- Scope: site, authenticated account, active team, or public content.
- Page archetype and traits.
- Shell and template.
- Policy capability and accepted actors.
- View-model owner and data dependencies.
- Navigation placement and label, or an explicit reason it is hidden.
- Error, empty, loading, and unavailable states.
- Stable scene/test selector.
- Implementation status and guarantee references.

API endpoints may use the same capability vocabulary but must be stored separately from the human route registry. Astro controller files remain explicit. The registry must not become a generic page factory.

### 5.2 Canonical archetypes

| Archetype | Replaces CSV UI values | Required behavior |
| --- | --- | --- |
| data | JSON | API response only; never registered as a human page |
| redirect | Redirect | Validates action/token, performs one transition, redirects to a stable result |
| message | Message | Focused state, recovery action, no operational chrome |
| dashboard | Dashboard | Summary, alerts, recent activity, and next actions |
| collection | List, List Ops, List Ops with Create, Card Search | Search/filter/sort/pagination, empty/error states, optional create and row actions |
| settings | Form, Confirm Form | Section navigation, validation, save state; danger trait for destructive confirmation |
| wizard | Major creation forms | Server-backed steps, review, idempotent submit, resumable state where needed |
| detail | Integrated Display | Identity, metadata, status, actions, related resources |
| workspace | Form with Notes, Display with Notes | Detail plus linked notes/activity and domain actions |
| profile | Public Integrated Display | Public identity and published relationships |
| reader | Book Viewer | Nested navigation, reading state, access boundary |
| marketing | Marketing Display | Editorial public content and calls to action |

Traits are composable. For example, the template catalog is collection + search + cards; team deletion is settings + danger; project launch is wizard + quote; team payment is settings + Stripe purchasing + Stripe selling.

### 5.3 URL rules

- Use plural resource collections: /projects, /hosts, /workdays, /templates.
- Use the stable resource ID in the URL. Host type is data, not a path segment.
- Use the resource base path for its default settings/detail view; avoid /edit and /settings aliases.
- Use tabs only for persistent peer sections beneath one resource.
- Use /new only for creation; creation is a wizard when it has consequential review or provisioning.
- Keep public profiles short: /u/:username, /t/:name, /p/:project.
- Use slug for public catalog/content identity and opaque ID for private mutable resources.
- Use catch-all /knowledge/:bookSlug/:pagePath* for nested book pages.
- Data lookup routes live under /v1, never under /auth UI paths.
- Payment return/cancel routes are hidden controller routes, not application navigation.
- Do not keep aliases for unreleased routes. If a released inbound URL must move, use a measured redirect with removal criteria.

### 5.4 Corrections to the source CSV

- /auth/check-email currently names an HTML check-your-inbox state in the implementation, while the CSV defines availability JSON there and at /auth/check-username. Replace those CSV data paths with /v1/auth/availability/email and /v1/auth/availability/username. Preserve the HTML verification message under an unambiguous UI path.
- /auth/device/approve is a human form/controller. Its mutation endpoint is data; the page is not JSON.
- /knowledge/[bookSlug]/[pagePath] must be a catch-all route so nested paths work.
- Dependency index 40 points to capacity provider row 44 and appears incorrect; project workday detail depends on the project workday collection.
- The decision collection dependency points forward to proposal creation and should be removed or replaced with its actual domain dependency.
- The invoices label should be Commerce activity in the UI even if /invoices remains the stable URL.

## 6. Target route catalog

The tables below are the implementation manifest. The Owner and UI columns are normative; scopes and policy are enforced by the registry and API.

### 6.1 Authentication and application entry

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| /v1/auth/availability/email | API | data | Admin consumer; email availability is rate-limited and privacy-safe |
| /v1/auth/availability/username | API | data | Admin consumer; username availability |
| /auth/register | Admin | settings | Preserved flow; registration form |
| /auth/confirm-email | Admin | message | Verification result/recovery |
| /auth/forgot-password | Admin | settings | Password reset request |
| /auth/reset-password | Admin | settings | Token-bound password reset |
| /auth/sign-in | Admin | settings | Internal and configured provider sign-in |
| /auth/logout | Admin | redirect | CSRF-safe termination then redirect |
| /auth/device/approve | Admin | settings | Device authorization page |
| /app | Admin | dashboard | Active-team summary and next actions |

OAuth callbacks and auth API mutations remain hidden support routes documented in the auth contract, not navigation.

### 6.2 Account and team

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| /app/account | Admin | settings | Identity, verified email, name, password |
| /app/account/sessions | Admin | collection + operations | Revoke sessions with current-session protection |
| /app/account/notifications | Admin | settings | Content/project subscriptions, cadence, aggregation |
| /app/account/appearance | Admin | settings | Themes and accessible color editor modal |
| /app/account/delete | Admin | settings + danger | Typed confirmation and reauthentication |
| /u/[username] | Admin | profile | Public user profile |
| /app/teams | Admin | collection + create | Team list and active-team selection |
| /app/teams/new | Admin | wizard | Team creation |
| /app/teams/[teamId] | Admin | settings | Team identity/settings |
| /app/teams/[teamId]/delete | Admin | settings + danger | Team deletion |
| /app/teams/[teamId]/members | Admin | collection + create + operations | Invites, roles, removal |
| /app/teams/[teamId]/payment | Market | settings + Stripe purchasing + Stripe selling | Billing methods and Connect |
| /app/teams/[teamId]/invoices | Market | collection + search + operations | UI label: Commerce activity |
| /app/team-invites/[token]/accept | Admin | redirect | Idempotent accept and safe destination |
| /t/[name] | Admin | profile | Public team profile |

The Market-owned payment/activity tabs are contributed to the Admin team navigation through a public extension contract. Admin must render a useful team experience when Market commerce is absent.

### 6.3 Hosts

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| /app/hosts | Admin | collection + create + operations | Managed hosts and deployment targets |
| /app/hosts/new | Admin | wizard | Provider choice, credentials, validation, review |
| /app/hosts/[hostId] | Admin | settings | Host settings/status; type comes from data |
| /app/hosts/[hostId]/delete | Admin | settings + danger | Impact preview and exact-state removal |

Host credentials stay in the canonical secret/config flow. No UI controller invokes provider CLIs or APIs directly.

### 6.4 Projects and deployments

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| /app/projects | Admin | collection + create + operations | Active-team projects |
| /app/projects/new | Admin | wizard + quote | Free launch works without commerce; Market contributes the catalog/price extension |
| /app/projects/[projectId] | Admin | settings | Project settings and status |
| /app/projects/[projectId]/delete | Admin | settings + danger | Dependency/hosting impact |
| /app/projects/[projectId]/deploys | Admin | detail | Readiness, current state, deploy controls/history |
| /app/projects/[projectId]/deploys/[deployId] | Admin | detail | One durable deployment operation |
| /app/projects/[projectId]/agents | Admin | collection + create + operations | Project agents |
| /app/projects/[projectId]/agents/new | Admin | wizard | Agent definition/class/runtime posture |
| /app/projects/[projectId]/agents/[agentSlug] | Admin | settings | Edit agent configuration |
| /app/projects/[projectId]/workdays | Admin | collection + operations | Project workdays |
| /app/projects/[projectId]/workdays/[workdayId] | Admin | workspace | Context, mode runs, artifacts, outcomes |
| /p/[project] | Admin | profile | Published project profile |

Deploy is plural because it is a history and control surface. Deployment detail is keyed by the durable operation/deployment identifier.

### 6.5 Capacity

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| /app/capacity | Admin | dashboard/settings | Team policy, provider readiness, allocation, runtime summary |
| /app/capacity/allocation/[projectId] | Admin | settings | Project allocation and mode policy |
| /app/capacity/providers | Admin | collection + operations | Registration token, approve/revoke, provider state |
| /app/capacity/providers/[providerId] | Admin | detail | Capabilities, availability, assignments, diagnostics |
| /app/capacity/workdays | Admin | collection + operations | Capacity-backed workdays |
| /app/capacity/workdays/[workdayId] | Admin | workspace | Mode-run/runtime diagnostics |

These are operator surfaces over SDK/API/Agent contracts. Admin must not become the assignment function, provider manager, or operations runner.

### 6.6 Work

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| /app/work/objectives | Admin | collection + create + operations | Objectives |
| /app/work/objectives/new | Admin | settings | Create through TreeDX-backed operation |
| /app/work/objectives/[slug] | Admin | workspace + notes | View/edit and linked progress |
| /app/work/questions | Admin | collection + create + operations | Questions and answer posture |
| /app/work/questions/new | Admin | settings | Ask through TreeDX-backed operation |
| /app/work/questions/[slug] | Admin | workspace + notes | Question, answers, linked context |
| /app/work/proposals | Admin | collection + create + operations | Proposals |
| /app/work/proposals/new | Admin | settings | Create proposal |
| /app/work/proposals/[slug] | Admin | workspace + notes | Proposal review and linked decisions |
| /app/work/decisions | Admin | collection + operations | Decisions |
| /app/work/decisions/[slug] | Admin | workspace + notes | Immutable posture and related work |

Do not recreate separate /edit routes. The workspace decides whether edit controls are available from content state and policy. Notes remain linked Astro content models and all real content access/mutation stays TreeDX-backed.

### 6.7 Seller authoring

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| /app/market/templates | Market | collection + create + operations | Team templates and publication state |
| /app/market/templates/new | Market | wizard | Create immutable product/version from project |
| /app/market/templates/[templateId] | Market | settings/workspace | Metadata, versions, offer, review, sales |
| /app/market/packs | Market | collection + create + operations | Team knowledge packs |
| /app/market/packs/new | Market | wizard | Create pack from project/release |
| /app/market/packs/[packId] | Market | settings/workspace | Metadata, versions, offer, delivery, sales |

Seller authoring is Market business policy. It may reuse Admin shell extension points and UI templates but must not live in the distributable Admin package.

### 6.8 Public market

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| /market | Market | detail/marketing | Catalog landing and category entry |
| /market/knowledge | Market | collection + search + cards | Public packs |
| /market/knowledge/[slug] | Market | detail | Access state and direct purchase/subscribe action |
| /market/templates | Market | collection + search + cards | Public templates |
| /market/templates/[slug] | Market | detail | Architecture, terms, price, and launch action |

There is no /cart or /checkout. Purchase begins from a product detail or project launch context. A hidden /app/commerce/orders/[orderId]/return controller may restore state after redirect-based payment authentication; it is not a shopping destination.

### 6.9 Core information and reader

| Route | Owner | UI | Notes |
| --- | --- | --- | --- |
| / | Core | marketing | Market may supply tenant content/override presentation through the documented Core extension |
| /contact | Core | settings | Configured contact form |
| /404 | Core | message | Not found and recovery |
| /people | Core | collection | Published people |
| /people/[slug] | Core | profile | Contributor |
| /agents | Core | collection | Published agents |
| /agents/[slug] | Core | detail/profile | Agent definition and context |
| /books | Core | collection | Published books |
| /books/[slug] | Core | detail | Book landing and references |
| /knowledge/[bookSlug]/[...pagePath] | Core | reader | Nested book content |
| /[slug] | Core | marketing | Tenant informational content; lowest route precedence |

## 7. UI foundation work

Before rebuilding domain pages:

1. Implement the typed route capability and registry merge in SDK/Core/Admin/Market.
2. Make route collision and precedence failures build-time errors.
3. Generate docs/ui-routes.md and the UI architecture inventory from registries.
4. Refactor inventory enforcement so it validates declared metadata and the physical controller, rather than guessing semantics from path strings.
5. Complete provider-neutral ProfileTemplate and WizardTemplate in UI.
6. Define shared contracts for Collection, Settings, Detail, Workspace, Dashboard, Profile, Wizard, Reader, Message, and Marketing view models.
7. Add consistent loading, empty, forbidden, unavailable, validation, conflict, and retry states.
8. Add accessible modal/sheet primitives for color editing, destructive confirmation, price confirmation, and redirect recovery.
9. Add provider-neutral quote summary, money display, activity table, status timeline, entitlement status, and provision-status components.
10. Define a TreeSeed visual direction: an editorial “living systems instrument panel” that combines organic TreeSeed identity with dense operational clarity. Use deliberate typography, restrained natural color tokens, strong hierarchy, diagrammatic state cues, and subtle motion for transitions/status—not generic dashboard cards or decorative gradients.
11. Validate keyboard behavior, focus restoration, reduced motion, semantic headings, contrast, error association, and narrow-screen layouts at template level.

Market mounts Stripe Elements and Connect embedded components inside provider-neutral slots. UI components accept safe display models and events; they never import Stripe.

## 8. Target ecommerce architecture

### 8.1 Business and accounting decisions

The initial contract assumes:

- The platform is merchant/business of record for buyer transactions.
- Each team has one platform buyer billing identity.
- Seller capability is activated lazily and maps to a Connect account.
- Buyer invoices are issued by the platform.
- Seller proceeds are earnings/remittance records backed by transfers, not seller invoices.
- Hosting is platform revenue.
- Template and knowledge-pack seller proceeds are transferred according to immutable offer terms.
- Prices, fees, tax behavior, currency, seller share, refund policy, and entitlement terms are snapshotted onto quote/order items.
- Stripe is the payment rail and financial processor; the TreeSeed ledger is the application read model.

Legal/tax review must confirm merchant-of-record, Connect account type, supported countries/currencies, tax registrations, refund allocation, dispute liability, and seller agreement before production activation.

### 8.2 Team commerce profile

SDK/API should model:

- teamId.
- Platform Stripe customer identifier or Accounts v2 equivalent.
- Optional connected seller account identifier.
- Buyer billing readiness and default currency.
- Seller state: not-enabled, onboarding, restricted, active, disabled.
- Charges/payouts requirements and capability snapshots.
- Tax/billing profile state.
- Last Stripe reconciliation timestamp.

Keep Stripe identity details behind an internal gateway so Accounts v2 or Customer-plus-Account can be selected without changing route contracts.

### 8.3 Internal data model

Replace or reshape legacy commerce tables around:

- commerce_team_profiles: buyer and seller identity mapping.
- commerce_products: template or knowledge-pack identity and seller ownership.
- commerce_product_versions: immutable deliverable/version metadata.
- commerce_offers: active commercial terms and platform Stripe price references.
- commerce_quotes: short-lived server-calculated selection, tax, terms, and fulfillment plan.
- commerce_orders: immutable accepted quote and aggregate state.
- commerce_order_items: hosting, template, pack, or subscription line snapshots.
- commerce_invoices: Stripe invoice projection and buyer-facing status.
- commerce_subscriptions: platform subscription projection and cancellation state.
- commerce_transfers: intended/created/reversed seller proceeds.
- commerce_refunds and commerce_disputes: allocation and resolution state.
- commerce_ledger_entries: append-only team-facing purchases, sales, fees, refunds, adjustments, and payouts.
- commerce_payouts: connected-account payout projection.
- commerce_entitlements: team, product/version, acquisition mode, access window, source item.
- commerce_provisioning_jobs: order-to-project/import fulfillment state.
- commerce_webhook_events: verified, idempotent raw-event receipt and processing status.
- commerce_outbox: durable application commands/events.

Financial amounts use integer minor units plus currency. Store immutable Stripe IDs and snapshots, but never use live Stripe product metadata as the sole source for historical terms.

### 8.4 State machines

Order:

draft quote -> awaiting confirmation -> processing payment -> paid -> provisioning -> fulfilled

Terminal/exception states:

expired, payment failed, canceled, provisioning failed, refund pending, partially refunded, refunded, disputed.

Provisioning:

pending -> claimed -> invoking canonical command -> observing -> succeeded

Recovery states:

retryable failure, blocked, compensating, permanently failed.

Entitlement:

pending payment -> active -> expired/canceled/revoked, with the acquired immutable version retained for a completed one-time purchase.

All transitions must compare the current state, be idempotent, record actor/source/time, and tolerate duplicate or out-of-order webhooks.

### 8.5 API service boundaries

Implement focused API services rather than Stripe calls in route handlers:

- Commerce profile service.
- Catalog and offer service.
- Quote/pricing/tax service.
- Order service.
- Stripe gateway.
- Webhook inbox/projector.
- Ledger service.
- Entitlement service.
- Transfer/refund/dispute service.
- Provisioning coordinator and outbox dispatcher.

The Stripe gateway is the only module that calls the Stripe server SDK. API handlers authenticate, authorize, validate, call domain services, and serialize SDK contracts.

### 8.6 API surface

Exact names should be finalized in API route descriptors, but the capability surface should include:

- Get/update team commerce profile.
- Create SetupIntent and CustomerSession for buyer methods.
- Create/refresh Connect onboarding or AccountSession for authorized seller managers.
- Search team commerce activity with cursor pagination and typed filters.
- Fetch invoice/receipt/remittance download links through authorized API responses.
- Create a project-launch quote.
- Accept a quote and create/finalize an order invoice/subscription.
- Fetch order and provisioning status.
- Create direct knowledge purchase or update-subscription quote/order.
- Cancel eligible subscriptions.
- Request and inspect refunds.
- Author product/version/offer and publication transitions.
- Deliver authorized artifact metadata and short-lived signed download URLs.
- Receive Stripe webhooks at one verified service endpoint.

Every mutation requires team-scoped RBAC, CSRF where browser-session based, an idempotency key, a version/precondition where state can race, and an audit record.

Commerce authorization must be capability-based. Define at least commerce.billing.manage, commerce.selling.manage, commerce.activity.read, commerce.refunds.manage, and commerce.catalog.manage. Team owners receive the appropriate defaults; a billing-manager role or grant receives purchasing/activity permissions without automatically receiving seller, catalog, membership, project, or destructive-team authority. Do not silently equate the existing teamOperator role with billing manager.

### 8.7 Stripe client surfaces

Buyer payment settings:

- API creates a SetupIntent for off-session reuse.
- Market renders Payment Element with a CustomerSession where supported.
- Default method, billing address, tax IDs, and removal behavior reconcile through the API.
- Never expose secret keys or trust client-supplied price/seller amounts.

Seller settings:

- API creates the connected identity only when selling is enabled.
- API returns a short-lived Connect AccountSession secret.
- Market mounts onboarding, account management, notification, balances, and payouts embedded components according to server-enabled capabilities.
- Market RBAC decides who may request the session; Connect status is projected into the API.

Contextual confirmation:

- The server calculates a quote and persists immutable terms.
- A confirmation modal shows line items, cadence, tax estimate, seller/platform identity, refund terms, and provisioning effect.
- Free orders follow the same order/provisioning lifecycle without Stripe.
- Paid orders confirm the invoice/subscription payment with Payment Element.
- Redirect authentication returns to the hidden order return controller.
- The client observes API order status; it never treats the client confirmation result alone as fulfillment authorization.

### 8.8 Stripe transaction mapping

| Scenario | Platform object | Seller movement | Fulfillment |
| --- | --- | --- | --- |
| Free template + customer host | Zero-total order | None | Canonical project launch after order acceptance |
| Paid template + customer host | One-time platform invoice | Destination or explicit transfer after paid | Template entitlement then project launch |
| Private hosting only | Platform Billing subscription | None | Launch after initial invoice paid; renew from subscription |
| Private hosting + paid template | Hosting subscription with one-time template item on first invoice | One template transfer after first invoice paid | Launch once; renewals remain platform hosting revenue |
| One-time knowledge pack | One-time platform invoice | Seller transfer after paid | Permanent entitlement to purchased version |
| Knowledge update subscription | Platform Billing subscription | Transfer per paid invoice according to terms | Current/new versions while active; previously paid artifacts retained |

Prefer invoice-based one-time purchases because buyer invoices are a product requirement. Final destination-charge versus separate-transfer mechanics should be chosen per refund/dispute and cross-border requirements, behind the gateway.

### 8.9 Payment-gated project launch

The project wizard is an orchestration UI, not the provisioning owner:

1. Admin collects project identity, host selection, and launch configuration.
2. Market extension contributes template selection and commercial pricing.
3. API validates team policy, host/template availability, seller readiness, price, tax, and launch inputs.
4. API persists an immutable quote.
5. User reviews and accepts.
6. API creates an order. Free orders become paid-equivalent immediately; paid orders create/finalize the platform invoice or subscription.
7. Only verified invoice.paid or subscription initial-invoice payment writes the durable provisioning outbox command.
8. The provisioning coordinator invokes the same canonical project-launch service used by /v1/teams/:teamId/projects/launch.
9. Existing launch/job/operation records drive bootstrap, reconciliation, deploy observation, retry, and recovery.
10. The UI observes order and operation state and routes to the created project when ready.

The outbox command must carry stable order, quote, team, project-request, host, template-version, and entitlement identifiers. It must not carry raw host credentials. A repeated event must resolve to the same project and operation.

If permanent provisioning failure occurs after payment, policy drives retry, operator intervention, credit, or refund. Compensation must reverse the applicable seller transfer and ledger entries. Do not refund automatically for a transient provider delay.

### 8.10 Knowledge delivery

- A pack version is immutable and references a TreeDX-backed release/artifact contract.
- One-time purchase grants permanent access to that purchased version.
- Subscription grants access to eligible versions while active.
- Canceling a subscription stops future updates but does not erase versions separately and permanently purchased.
- Download links are short-lived, authorized, and generated on demand.
- Entitlement checks occur in API/Core delivery boundaries, not only in the product page.
- Webhooks update subscription/entitlement state; the browser cannot grant access.

### 8.11 Commerce activity

/app/teams/[teamId]/invoices is a searchable ledger projection with UI tabs:

- Purchases: invoices, receipts, subscriptions, refunds.
- Sales and earnings: orders, gross, tax, platform/processor effects, seller net.
- Payouts: connected balance-to-bank movements.
- Adjustments: disputes, reversals, credits, chargebacks.

Search and filters operate on internal indexed data by date, type, status, product, order, invoice, and amount/currency. Stripe links/downloads are supplementary. Ledger entries must reconcile to projected Stripe objects and internal orders without querying Stripe for every page load.

### 8.12 Refunds, disputes, tax, and disconnects

- Define refund authority and windows per product type.
- Allocate partial refunds across order items deterministically.
- Reverse or offset seller transfers as required.
- Project disputes and evidence deadlines into activity/notifications.
- Prevent new sales when seller requirements or payouts are disabled.
- Define whether existing subscriptions pause, redirect proceeds, or cancel after seller disconnect.
- Use automatic tax only after product tax codes, addresses, registrations, and liability are configured.
- Add reconciliation jobs/reports for Stripe balances, invoices, transfers, refunds, disputes, payouts, and internal ledger totals.

## 9. Migration and legacy retirement

The current connected-account catalog/payment-group data must not silently become the new canonical record.

1. Inventory legacy customers, vendor accounts, products, prices, carts, checkouts, payment groups, orders, subscriptions, refunds, and entitlements.
2. Classify each table and record as migrate, historical-read-only, expire, or delete in non-production fixtures.
3. Create one platform customer identity per team and reconcile duplicates.
4. Recreate platform-owned products/prices where connected-account Stripe IDs cannot be reused.
5. Snapshot legacy completed orders into the new activity/ledger read model with provenance; do not rewrite external financial history.
6. Migrate valid entitlements and subscription references with explicit compatibility status.
7. Expire open carts/checkouts/payment groups at cutover.
8. Use a bounded read adapter only if historical UI access requires it. Do not dual-write old and new purchase paths.
9. Remove cart, checkout, payment-group, per-vendor buyer-customer, connected-context browser confirmation, and direct-charge code after cutover verification.
10. Generate SDK schema migrations through the package-owned workflow and verify API migration/rollback expectations against representative snapshots.

Because packages are independently releasable, SDK contracts/schema must be published or intentionally injected before API/Admin/Market consumers rely on them.

## 10. Vertical implementation sequence

Every phase follows the same internal order:

contract -> schema/API -> view model -> explicit controller -> template composition -> navigation -> tests -> guarantee -> generated docs -> independent package verification.

### Phase 0 — Cleanup acceptance

Verify the cleanup handoff in Section 2. Record the precise retained route set and removed backend/UI artifacts. No redesign route is created in this phase.

### Phase 1 — Route and UI foundation

Implement the typed capability registry, generated inventory, archetype contracts, missing templates, state patterns, accessibility baseline, and extension points. Convert preserved routes to declared metadata without changing their behavior.

Exit: every retained route is registered; generated docs equal discovered controllers; collision tests pass; UI/Admin/Core/Market build independently as applicable.

### Phase 2 — Hosts

Build the four host routes as one slice. Reuse canonical config, secret-manager, and reconciliation operations. Include validation, drift/readiness, dependent-project impact, and deletion recovery.

Exit: no hostType URL remains; create/edit/delete and failure/retry guarantees pass locally.

### Phase 3 — Projects, agents, deployments, and free launch

Build project collection/settings/deletion, agent routes, deploy history/detail, and project workdays. First deliver the free-template/customer-host launch through the existing API/operations path so provisioning is proven without payment complexity.

Exit: repeated/interrupted/stale/partial launch and deploy cases converge; no alternate launch path exists.

### Phase 4 — Capacity

Build capacity dashboard, allocation, providers, and capacity workdays using public SDK/API/Agent contracts and precise provider-manager terminology.

Exit: Admin is observability/control only; assignment and provider execution remain in their canonical owners; focused capacity guarantees pass.

### Phase 5 — Work

Build objective, question, proposal, and decision collections and workspaces. Consolidate edit behavior into detail workspaces and prove TreeDX-backed reads/mutations and linked-note contracts.

Exit: no direct content write exists; every generated/edited note links to its subject; content guarantees pass.

### Phase 6 — Public profiles and Core information

Build user/team/project profiles, Core collections/details, public reader catch-all, marketing page resolution, contact, and not-found. Establish route precedence before the root /[slug] catch-all.

Exit: public/private/entitled/not-found states are distinct and tested; Core builds standalone.

### Phase 7 — Seller catalog authoring

Implement the platform-neutral product/version/offer model and Market seller routes without activating payments. Prove immutable version terms, review/publication transitions, project/release sourcing, and seller policy.

Exit: a team can author and publish a free template or pack; Admin has no Market business logic.

### Phase 8 — Commerce foundation

Implement team profiles, platform catalog prices, quotes, orders, invoice/subscription projections, ledger, webhook inbox/projector, transfers, refunds/disputes, entitlements, outbox, and Stripe gateway. Migrate schema/contracts and replace legacy focused tests.

Exit: webhook duplication/order tests, quote tamper tests, ledger reconciliation tests, and zero-total order tests pass; old cart path is not active.

### Phase 9 — Team payment and commerce activity

Implement /payment and /invoices, buyer SetupIntent/CustomerSession, seller AccountSession/embedded components, activity search, downloads, subscriptions, payouts, and adjustments.

Exit: owner/billing-manager RBAC, session-secret isolation, accessibility, seller restricted states, and searchable activity guarantees pass.

### Phase 10 — Public market and direct knowledge acquisition

Build catalog/detail routes, free import, one-time pack purchase, update subscription, entitlement-gated delivery, cancellation, and seller earnings projections.

Exit: paid content is inaccessible before verified payment; duplicate events produce one entitlement/transfer; cancellation preserves acquired-version rules.

### Phase 11 — Paid template and private-hosting launch

Extend the proven project wizard with quotes, confirmation, Payment Element, platform hosting subscriptions, first-invoice template item, payment-gated outbox, compensation, and order/operation observation.

Exit: no project provision occurs before verified payment; combined first invoice creates one seller template transfer; hosting renewals do not repay the template seller; permanent failure compensation is auditable.

### Phase 12 — Legacy closure and architecture audit

Remove remaining legacy schema/API/client/UI paths, hard-coded inventory rules, aliases, fixtures, active guarantees, and documentation. Re-run the comprehensive cross-package audit against the resulting graph.

Exit: one route registry, one commerce topology, one project-launch path, one ledger, and no contradictory active documentation or tests.

## 11. Verification strategy

### 11.1 Package tests

- SDK: route/commerce contract validators, schema constraints, transition functions, money/currency rules, migration snapshots.
- UI: template rendering, focus/failure/empty states, responsive behavior, accessibility, no Stripe dependency.
- Core: content resolution, route precedence, profiles, nested reader, access/not-found behavior.
- Admin: standalone route registry, policy/view models, CSRF/actions, API facade contracts, shell/nav, no root imports.
- API: service tests with a strict Stripe gateway fake, webhook signature/idempotency/order, SQL transitions, ledger, entitlement, outbox, launch recovery, refund/reversal/dispute cases.
- Market: registry composition, Stripe controller boundaries, quote/confirmation state, catalog/product pages, payment return recovery.

Avoid tests that only assert strings or call order. State tests must inspect durable rows and postconditions after interrupted, resumed, stale, partial, duplicate, and repeated execution.

### 11.2 Integration and local acceptance

- Run the narrow package-local checks first.
- Run root route inventory and UI architecture conformance.
- Run Market composition typecheck/build/tests.
- Use npx trsd dev start --web-runtime local --json for browser and API acceptance.
- Exercise Stripe test-mode flows only through configured API/Market surfaces, including 3DS redirect recovery and webhook replay.
- Verify no provider mutation occurs outside canonical reconciliation and no hosted deployment workflow is introduced while deployment is suspended.
- Run the narrowest relevant guarantee validate/plan/run commands per phase.

### 11.3 Required scenario matrix

At minimum:

- Anonymous, signed-in wrong team, viewer, operator, billing manager, owner, and platform steward.
- No active team, stale active team, and deleted team.
- Empty/loading/unavailable/API timeout/conflict/retry.
- Free and paid template; customer and private host; each combined case.
- One-time and subscription knowledge acquisition.
- Missing payment method, declined payment, 3DS, async processing.
- Duplicate/out-of-order/missing webhook followed by reconciliation.
- Seller onboarding incomplete/restricted/disconnected.
- Provisioning transient failure, resumed success, permanent failure.
- Full and partial refund, transfer reversal, dispute, negative seller balance.
- Subscription initial payment, renewal, failure, cancellation, reactivation.
- Multi-currency rejection or correct support according to policy.

## 12. Guarantee plan

Add guarantees near the owning package and keep them planned until repeatable evidence exists.

### Admin

- Canonical route registry and active-team policy.
- Host lifecycle and deletion impact.
- Project free launch, resume, and deployment observation.
- Capacity operator boundaries.
- TreeDX-backed work workspace and linked notes.

### Market

- Team payment-method management.
- Seller onboarding/restricted-state handling.
- Searchable commerce activity terminology and authorization.
- Direct template and pack acquisition without cart.
- Paid project launch confirmation and status recovery.
- Public catalog/detail access states.

### API

- Verified payment before provisioning.
- Webhook idempotency and out-of-order convergence.
- One template transfer on combined initial invoice and none on hosting renewal.
- Permanent one-time version entitlement.
- Subscription update entitlement and cancellation behavior.
- Refund/transfer-reversal/ledger balance.
- Seller disconnect and dispute handling.
- Idempotent project launch/outbox recovery.

Retire or replace root guarantees under checkout/cart and checkout/checkout. Never leave an active guarantee referring to /cart, /checkout, payment groups, or connected-account browser confirmation after its phase is removed.

## 13. Documentation and generated artifacts

Update in the owning phase:

- docs/package-ownership.md for the final commerce boundary and removal of the old “not included” exclusions.
- docs/ui-architecture.md for typed registries, archetypes, traits, and explicit controller rules.
- docs/ui-routes.md as generated output.
- docs/ui-architecture-inventory.md as generated output.
- docs/ecommerce.md to replace grouped cart checkout and direct-charge assumptions.
- docs/market_ui_spec.md for navigation, page behavior, and visual language.
- docs/ui-foundation-baseline.md for template/accessibility baselines.
- Project launch, operations-runner, notifications, and reconciliation docs where their public contracts change.
- Package README/API contract docs and guarantee indexes.

Generated CSV/JSON/Markdown reports are outputs and must not be hand-edited as canonical sources.

## 14. Decisions required before production activation

These do not block route foundation work, but they block live commerce:

- Merchant/business-of-record legal decision and seller agreement.
- Accounts v2 versus Customer plus connected Account implementation baseline.
- Connect account type, countries, currencies, and cross-border transfer support.
- Platform commission, processor-fee allocation, reserves, negative balances, and payout schedule.
- Tax registrations, product tax codes, tax-inclusive/exclusive pricing, and invoice identity.
- Refund windows and entitlement/provisioning compensation policy by product.
- Subscription price/version change policy.
- Seller disconnect and death-of-project continuity policy.
- Historical production data migration and retention requirements.

Record each as a decision artifact rather than hiding policy in Stripe adapter code.

## 15. Definition of done

The redesign is complete when:

- The composed human route set matches the target catalog plus explicitly documented hidden support routes.
- Every route declares one archetype, owner, policy, data source, template, navigation posture, and guarantee.
- UI inventory and route docs are generated from package-owned registries.
- Admin, Core, UI, SDK, API, and Market preserve their independent build/test boundaries.
- There is no cart, checkout destination, payment-group checkout, per-vendor buyer customer, or connected-account browser confirmation path.
- Each team has one canonical buyer billing profile and an optional seller profile.
- Buyer invoices, seller earnings, transfers, payouts, refunds, disputes, and adjustments are represented with correct terminology.
- The internal ledger and entitlement records are authoritative application projections.
- Free and paid project launches converge on the same canonical provisioning path.
- No paid fulfillment occurs before verified server-side payment state.
- Duplicate, stale, interrupted, partial, and repeated execution converges safely.
- Hosting renewals cannot repeat a one-time template seller transfer.
- Knowledge delivery enforces permanent-version and active-update-subscription rules.
- Legacy routes, APIs, schema paths, tests, guarantees, and contradictory docs are removed or explicitly historical.
- The post-change comprehensive audit finds no duplicate owner, hidden mutation, contradictory documentation, or untested fallback.

## 16. Audited implementation hotspots

The implementation audit for this plan included these canonical or conflicting surfaces. Re-audit them immediately before their owning phase because package history may have changed:

- Root composition and manifests: package.json and treeseed.site.yaml.
- Ownership and architecture: docs/package-ownership.md, docs/ui-architecture.md, docs/ecommerce.md, docs/operations-runner.md, docs/project-deployment.md, and notification architecture documentation.
- Route composition: packages/admin/src/plugin.ts, packages/admin/src/routes.ts, root src/pages, packages/admin/src/pages, and packages/core/src/pages.
- Route enforcement: scripts/ui-architecture/inventory.ts, scripts/check-ui-architecture.ts, test/ui-architecture-inventory.test.ts, test/lib/operational-ia.test.ts, and test/lib/ui-architecture-conformance.test.ts.
- UI templates and contracts: packages/ui/src/components/astro/templates and the package UI tests.
- Current commerce schema/contracts: packages/sdk/src/db/market-schema.ts, SDK market client/contracts, packages/sdk/test/utils/commerce-schema.test.ts, and SDK commerce-contract tests.
- Current Stripe/API behavior: packages/api/src/api/stripe-connect.ts, packages/api/src/api/app.ts, packages/api/src/api/route-descriptors.ts, API boundary tests, API commerce tests, and root src/scripts/commerce-checkout.ts.
- Canonical launch/recovery behavior: the /v1/teams/:teamId/projects/launch implementation, SDK project launch client/contracts, project deployment route contracts, and packages/api/src/operations-runner/entrypoint.ts.
- Legacy guarantees: guarantees/checkout/cart and guarantees/checkout/checkout plus their scenes and selectors.
- Recent package history around the UI shell, ecommerce closure, route registries, launch recovery, and deployment suspension.

This inventory is not permission to edit every listed surface in one change. Each phase changes only the canonical owner and its required consumers, then repeats the audit against the resulting dependency graph and diff.
