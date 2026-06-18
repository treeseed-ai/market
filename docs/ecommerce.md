# TreeSeed Ecommerce Platform

## Purpose

TreeSeed ecommerce is a unified commerce, governance, ownership, and entitlement layer for public knowledge distribution, professional hosting, vendor products, scoped services, and future trust-gated capacity listings.

The platform should not be a checkout widget bolted onto the catalog. A commercial action in TreeSeed must answer:

- who owns the product, service, project, or resource
- who contributed to it
- who stewards it
- who is allowed to buy or use it
- what terms were approved
- what payment or subscription state backs the access
- what entitlement was granted
- what fulfillment occurred
- what governance evidence exists
- how future ownership, stewardship, transfer, succession, or community governance can be resolved

The first implementation goal is a strong vendor marketplace foundation that supports different products and services, one-time purchases, recurring subscriptions, subscription updates, contact/scope flows, public/free publishing, professional hosting, and vendor sales tracking.

Marketplace commissions, platform application fees, seller payout ledgers, and generalized capacity credit resale are intentionally out of scope for this phase.

## Authority Boundaries

TreeSeed is authoritative for product identity, catalog state, governance, ownership, stewardship, contribution attribution, orders, entitlements, fulfillment, and internal audit records.

Stripe is authoritative for payment collection, payment method handling, connected account onboarding, payment confirmation, subscriptions, invoices, disputes, and seller payout rails.

Vendors must not paste raw Stripe secret keys into TreeSeed. Vendors connect payment accounts through Stripe Connect hosted or embedded onboarding. TreeSeed stores only connected account identifiers, account status, capability flags, and reconciliation metadata.

Buyers purchase through TreeSeed-managed checkout. Phase 5 uses Stripe Elements for native payment collection, while TreeSeed creates checkout runs and server-side payment or subscription objects from TreeSeed offer IDs.

The frontend must never be authoritative for Stripe price IDs, seller IDs, amounts, entitlement scope, or fulfillment terms.

## Cooperative Ownership Foundation

TreeSeed ecommerce should be built so products and services can be owned by individuals, teams, organizations, cooperatives, or communities without redesigning commerce later.

Every product should have an explicit ownership model. A simple vendor-owned product is only one case. TreeSeed must also support products where:

- multiple contributors have attribution
- a steward team maintains the product
- a community governs future releases
- a cooperative owns the product collectively
- ownership can be transferred or succeeded
- revenue or non-cash benefits can be attributed separately from legal ownership
- buyers can see enough ownership and stewardship context to understand who is accountable

The foundational rule is:

```text
Seller account handles payment.
Ownership records describe who owns, stewards, governs, and benefits from the product.
Entitlements describe who can use it.
Governance events describe how those states changed.
```

These are related but distinct. The Stripe connected account receiving money may belong to a vendor team, while product ownership may include contributors, stewards, or community governance records. This phase does not implement commission splitting or payout allocation, but the data model must preserve future benefit attribution and collective ownership decisions.

### Ownership Models

Initial ownership model values:

| Model | Meaning |
| --- | --- |
| `team_owned` | A single team owns and sells the product. |
| `individual_contributor_owned` | A product is owned by one creator but sold through an approved vendor/team account. |
| `multi_contributor_attributed` | Multiple contributors are credited; one owner or steward remains accountable. |
| `steward_maintained` | A steward team maintains a product on behalf of an owner, community, or upstream source. |
| `cooperative_owned` | A defined cooperative or member group owns the product collectively. |
| `community_governed` | Governance rules, maintainers, and public process control future product changes. |
| `foundation_or_trust_held` | Ownership is held by a foundation, fiscal host, trust, or similar stewarding body. |
| `transferred_or_succeeded` | Ownership has moved from an original owner to a successor under recorded terms. |

### Stewardship Roles

Products and services should distinguish ownership from stewardship. Stewardship roles may include:

- `owner`: holds legal or canonical ownership authority
- `seller`: operates the marketplace vendor account
- `maintainer`: maintains product quality and releases
- `governance_steward`: manages approval and decision process
- `support_steward`: handles support obligations
- `security_steward`: handles vulnerability, abuse, or incident response
- `community_steward`: represents community governance and contributor process
- `successor`: named fallback steward if the current steward becomes unavailable

One team may hold all roles for a simple product. Cooperative or community-governed products should record each role explicitly.

### Contributor Attribution

Contribution records should support:

- contributor identity or team identity
- role, such as author, maintainer, reviewer, funder, designer, security reviewer, knowledge curator, or governance steward
- contribution summary
- attribution visibility
- license or contributor agreement reference
- effective date
- optional weight or share field for future benefit attribution

The weight/share field is not used for payouts in this phase. It exists so future cooperative benefit distribution, credits, recognition, or revenue allocation can be reconciled from historical contribution records.

### Collective Approval Rules

Cooperative or community-governed products should be able to define approval rules for:

- first publication
- major version release
- license change
- price change
- support policy change
- steward change
- ownership transfer
- archival
- private access grants
- capacity or service access escalation

Rules may start as metadata and governance events, then become enforceable workflow policies later. Even when rules are metadata-only, state transitions must record the rule snapshot used at the time of approval.

### Transfer and Succession

Products must be able to survive contributor, vendor, or steward turnover.

Transfer and succession records should capture:

- prior owner or steward
- next owner or steward
- triggering reason
- approval evidence
- effective timestamp
- affected products, offers, entitlements, support obligations, and fulfillment responsibilities
- buyer-visible impact summary

A transfer must not silently rewrite purchase history. Existing orders and entitlements keep their historical seller, offer, price, license, and support terms. New ownership or stewardship applies prospectively unless a governed migration explicitly updates active obligations.

### Path From Team-Owned To Community-Owned

The architecture should allow a product to evolve through these states:

```text
team_owned
  -> multi_contributor_attributed
  -> steward_maintained
  -> community_governed
  -> cooperative_owned
```

This path lets a simple vendor listing grow into a cooperatively governed resource without changing checkout, entitlement, catalog, or fulfillment foundations.

## Package Ownership

The root `@treeseed/market` app owns Treeseed-specific ecommerce policy and marketplace implementation.

`@treeseed/admin` is not an ecommerce package. Admin may display catalog, free, private, contact, one-time, subscription, professional-hosting, scoped-contract, and external offer metadata. Commercial offers remain display-only unless a commerce provider is registered by the host tenant.

`@treeseed/ui` may own generic reusable marketplace controls when they become product-neutral.

`@treeseed/api` owns backend persistence, API routes, webhook processing, and operation state needed by the hosted marketplace.

`@treeseed/sdk` owns shared contracts, catalog/entitlement primitives, reconciliation helpers, and typed client surfaces.

Existing `catalog_items`, `catalog_artifact_versions`, and `entitlements` remain part of the unreleased marketplace foundation. Ecommerce tables should extend or link to these records by stable IDs rather than replacing them.

## Commercial Lanes

### Free Public Knowledge Distribution

Anyone can create a free public team.

Free public teams may:

- publish free public knowledge and resources
- operate a public profile or public knowledge site
- distribute free templates, knowledge packs, and public artifacts
- use shared public TreeDX portfolio infrastructure where available

Free public teams may not:

- sell commercial products
- host private projects
- operate a private hosted TreeDX instance
- list commercial services
- list capacity offerings

This lane exists to grow the knowledge commons and make public resource distribution cheap to host.

### Professional Hosting Subscription

Professional hosting is a recurring paid team entitlement.

Professional teams may receive:

- private projects
- private hosted TreeDX
- private storage and indexing envelope
- team members and roles
- custom domains where supported
- vendor capability request eligibility
- support tier and optional SLA
- private hosted TreeSeed API/platform options

Professional hosting can be priced by a combination of:

- members
- projects
- private TreeDX/storage/indexing envelope
- support tier
- SLA tier
- private hosted API/platform surfaces
- capacity provider configuration count, only for configuration/support limits, not capacity resale

A Professional subscription is required before a team can sell through the marketplace. Not every Professional team is required to sell.

### Vendor Marketplace

Professional teams may request vendor capability.

Approved vendors may sell:

- templates
- knowledge packs
- UI libraries
- administrative interfaces
- API platforms
- hosted project packages
- scoped services
- future trust-gated capacity listings

TreeSeed tracks product records, offers, orders, customers or buyer teams, entitlements, fulfillment, subscription state, sales, and governance events. Stripe handles payment and subscription processing through the vendor's connected account.

No marketplace commission is charged in this phase. TreeSeed monetizes vendors through Professional hosting and optional vendor subscription tiers.

### Scoped Services

Vendors may offer quote-driven services.

Scoped service flow:

1. Buyer submits request.
2. Vendor scopes terms, deliverables, timeline, access needs, and price.
3. TreeSeed records governance evidence.
4. Buyer approves the scoped contract.
5. Checkout or external tracked payment occurs.
6. Vendor fulfills manually or through TreeSeed-linked workdays.
7. TreeSeed records fulfillment events, artifacts, support outcomes, and entitlement state.

Scoped services may later bridge into workdays, projects, support contracts, and knowledge artifacts.

## Product Kinds

TreeSeed should model these product and service kinds first:

| Kind | Description |
| --- | --- |
| `template` | Starter projects containing knowledge, agents, policies, configuration, and launch structure. |
| `knowledge_pack` | Compacted or processed knowledge files suitable for humans and machines. |
| `ui_library` | Reusable UI components, themes, dashboards, or design systems. |
| `admin_interface` | Packaged operational admin surfaces or interfaces. |
| `api_platform` | Hosted or installable TreeSeed API/control-plane surfaces. |
| `hosted_project` | Private or public hosted TreeSeed project offering. |
| `professional_hosting` | TreeSeed-hosted professional team subscription. |
| `scoped_service` | Quote-driven service engagement. |
| `capacity_listing` | Future trust-gated execution, human, research, AI, or development capacity listing. Modeled now, not fully monetized in this phase. |

## Offer Modes

TreeSeed offer modes should include:

| Mode | Meaning |
| --- | --- |
| `free` | Public/free access. |
| `private` | Visible only to owning team or invited users. |
| `contact` | Inquiry or scope approval is required before purchase. |
| `one_time` | One-time purchase for a product/version. |
| `one_time_current_version` | Buyer receives only the purchased/current version. |
| `subscription` | Recurring subscription for ongoing access. |
| `subscription_updates` | Recurring subscription that grants updates while active. |
| `professional_hosting` | Recurring hosted team entitlement. |
| `scoped_contract` | Quoted service contract with manual approval. |
| `external` | Externally fulfilled offer tracked by TreeSeed. |

These modes are the complete unreleased offer vocabulary. Do not add compatibility aliases or broad fallback modes. `CommerceOfferMode` is canonical. Existing unreleased code should be updated in place to this vocabulary, and `paid` is not part of the model.

`CatalogItemOfferMode` may remain as a semantic alias to `CommerceOfferMode` where catalog records already use that name, but it must not become an independent legacy type.

## Public Contract Shape

The shared SDK/API contract should expose stable ecommerce vocabulary. Names below are the intended contract shape, not a requirement to place all code in one package.

```ts
export type CommerceProductKind =
  | 'template'
  | 'knowledge_pack'
  | 'ui_library'
  | 'admin_interface'
  | 'api_platform'
  | 'hosted_project'
  | 'professional_hosting'
  | 'scoped_service'
  | 'capacity_listing';

export type CommerceOfferMode =
  | 'free'
  | 'private'
  | 'contact'
  | 'one_time'
  | 'one_time_current_version'
  | 'subscription'
  | 'subscription_updates'
  | 'professional_hosting'
  | 'scoped_contract'
  | 'external';

export type CommerceVendorTrustLevel =
  | 'public_publisher'
  | 'verified_seller'
  | 'trusted_service_vendor'
  | 'trusted_capacity_vendor'
  | 'integration_partner';

export type CommerceGovernanceState =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'archived';

export type CommerceEntitlementStatus =
  | 'pending'
  | 'active'
  | 'past_due'
  | 'expired'
  | 'revoked'
  | 'refunded'
  | 'canceled';

export type CommerceOwnershipModel =
  | 'team_owned'
  | 'individual_contributor_owned'
  | 'multi_contributor_attributed'
  | 'steward_maintained'
  | 'cooperative_owned'
  | 'community_governed'
  | 'foundation_or_trust_held'
  | 'transferred_or_succeeded';

export type CommerceStewardshipRole =
  | 'owner'
  | 'seller'
  | 'maintainer'
  | 'governance_steward'
  | 'support_steward'
  | 'security_steward'
  | 'community_steward'
  | 'successor';
```

### `CommerceVendor`

```ts
export interface CommerceVendor {
  id: string;
  teamId: string;
  displayName: string;
  slug: string;
  status: CommerceGovernanceState;
  trustLevel: CommerceVendorTrustLevel;
  professionalEntitlementId: string | null;
  stripeAccountId: string | null;
  salesEnabled: boolean;
  serviceSalesEnabled: boolean;
  capacityListingsEnabled: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `StripeConnectedAccount`

```ts
export interface StripeConnectedAccount {
  id: string;
  vendorId: string;
  teamId: string;
  stripeAccountId: string;
  accountStatus: 'pending' | 'restricted' | 'enabled' | 'disabled';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  capabilities: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceProduct`

```ts
export interface CommerceProduct {
  id: string;
  vendorId: string;
  sellerTeamId: string;
  kind: CommerceProductKind;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: CommerceGovernanceState;
  visibility: 'public' | 'authenticated' | 'team' | 'private';
  catalogItemId: string | null;
  currentVersionId: string | null;
  ownershipModel: CommerceOwnershipModel;
  ownershipRecordId: string | null;
  supportPolicy: string | null;
  license: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceOwnershipRecord`

```ts
export interface CommerceOwnershipRecord {
  id: string;
  productId: string;
  model: CommerceOwnershipModel;
  canonicalOwnerType: 'user' | 'team' | 'organization' | 'cooperative' | 'community' | 'foundation' | 'external';
  canonicalOwnerId: string | null;
  sellerTeamId: string;
  stewardTeamId: string | null;
  governancePolicyId: string | null;
  publicSummary: string | null;
  buyerVisible: boolean;
  effectiveAt: string;
  supersededAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceStewardshipAssignment`

```ts
export interface CommerceStewardshipAssignment {
  id: string;
  ownershipRecordId: string;
  productId: string;
  role: CommerceStewardshipRole;
  assigneeType: 'user' | 'team' | 'organization' | 'community' | 'external';
  assigneeId: string | null;
  displayName: string | null;
  responsibilities: string[];
  visibleToBuyers: boolean;
  startsAt: string;
  endsAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceContribution`

```ts
export interface CommerceContribution {
  id: string;
  productId: string;
  productVersionId: string | null;
  contributorType: 'user' | 'team' | 'organization' | 'external';
  contributorId: string | null;
  displayName: string | null;
  role: string;
  summary: string | null;
  attributionVisibility: 'public' | 'buyer' | 'vendor' | 'private';
  agreementRef: string | null;
  benefitWeight: number | null;
  effectiveAt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceGovernancePolicy`

```ts
export interface CommerceGovernancePolicy {
  id: string;
  productId: string | null;
  teamId: string | null;
  policyKind: 'product' | 'vendor' | 'cooperative' | 'community';
  title: string;
  approvalRules: Record<string, unknown>;
  quorumRules: Record<string, unknown>;
  buyerVisibleSummary: string | null;
  status: 'draft' | 'active' | 'superseded' | 'archived';
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceOwnershipTransfer`

```ts
export interface CommerceOwnershipTransfer {
  id: string;
  productId: string;
  fromOwnershipRecordId: string;
  toOwnershipRecordId: string;
  reason: string;
  approvalEvidence: Record<string, unknown>;
  buyerVisibleImpact: string | null;
  effectiveAt: string;
  createdAt: string;
}
```

### `CommerceProductVersion`

```ts
export interface CommerceProductVersion {
  id: string;
  productId: string;
  version: string;
  status: CommerceGovernanceState;
  catalogArtifactVersionId: string | null;
  manifestKey: string | null;
  artifactKey: string | null;
  integrity: string | null;
  releaseNotes: string | null;
  compatibility: Record<string, unknown>;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceOffer`

```ts
export interface CommerceOffer {
  id: string;
  productId: string;
  productVersionId: string | null;
  vendorId: string;
  sellerTeamId: string;
  mode: CommerceOfferMode;
  status: CommerceGovernanceState;
  title: string;
  termsSummary: string | null;
  accessScope: Record<string, unknown>;
  supportScope: Record<string, unknown>;
  fulfillmentMode: 'automatic' | 'manual' | 'scoped' | 'external';
  activePriceId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommercePrice`

```ts
export interface CommercePrice {
  id: string;
  offerId: string;
  amount: number;
  currency: string;
  billingInterval: 'one_time' | 'month' | 'year' | 'custom';
  status: 'draft' | 'active' | 'archived';
  stripeProductId: string | null;
  stripePriceId: string | null;
  stripeLookupKey: string | null;
  priceVersion: number;
  taxBehavior: 'exclusive' | 'inclusive' | 'unspecified';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceOrder`

```ts
export interface CommerceOrder {
  id: string;
  buyerTeamId: string | null;
  buyerUserId: string | null;
  status: 'draft' | 'pending_payment' | 'paid' | 'partially_refunded' | 'refunded' | 'canceled' | 'failed';
  currency: string;
  subtotalAmount: number;
  totalAmount: number;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceOrderItem`

```ts
export interface CommerceOrderItem {
  id: string;
  orderId: string;
  vendorId: string;
  sellerTeamId: string;
  productId: string;
  productVersionId: string | null;
  offerId: string;
  priceId: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'fulfilled' | 'refunded' | 'revoked' | 'canceled';
  entitlementId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `CommerceEntitlement`

```ts
export interface CommerceEntitlement {
  id: string;
  buyerTeamId: string | null;
  buyerUserId: string | null;
  sellerTeamId: string;
  productId: string;
  productVersionId: string | null;
  offerId: string;
  orderId: string | null;
  subscriptionId: string | null;
  status: CommerceEntitlementStatus;
  accessScope: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  renewalState: 'none' | 'active' | 'past_due' | 'canceling' | 'canceled';
  fulfillmentArtifactRefs: string[];
  projectId: string | null;
  catalogItemId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `ServiceRequest`

```ts
export interface ServiceRequest {
  id: string;
  buyerTeamId: string | null;
  buyerUserId: string | null;
  vendorId: string;
  offerId: string;
  status: 'requested' | 'scoping' | 'quoted' | 'approved' | 'declined' | 'checkout_pending' | 'active' | 'fulfilled' | 'canceled';
  requestedScope: string;
  approvedScope: string | null;
  quotedAmount: number | null;
  quotedCurrency: string | null;
  accessNeeds: Record<string, unknown>;
  relatedWorkdayId: string | null;
  relatedProjectId: string | null;
  orderId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### `FulfillmentEvent`

```ts
export interface FulfillmentEvent {
  id: string;
  orderId: string | null;
  orderItemId: string | null;
  entitlementId: string | null;
  serviceRequestId: string | null;
  actorType: 'system' | 'vendor' | 'buyer' | 'operator';
  actorId: string | null;
  eventType: string;
  status: 'pending' | 'complete' | 'failed' | 'canceled';
  artifactRefs: string[];
  evidence: Record<string, unknown>;
  createdAt: string;
}
```

### `CommerceGovernanceEvent`

```ts
export interface CommerceGovernanceEvent {
  id: string;
  actorType: 'system' | 'user' | 'team' | 'operator';
  actorId: string | null;
  action: string;
  objectType: string;
  objectId: string;
  priorState: string | null;
  nextState: string | null;
  reason: string | null;
  evidence: Record<string, unknown>;
  relatedOrderId: string | null;
  relatedOfferId: string | null;
  relatedProductId: string | null;
  relatedTeamId: string | null;
  createdAt: string;
}
```

## Database Concepts

Add ecommerce-specific tables or equivalent records:

- `commerce_vendors`
- `commerce_vendor_stripe_accounts`
- `commerce_products`
- `commerce_ownership_records`
- `commerce_stewardship_assignments`
- `commerce_contributions`
- `commerce_governance_policies`
- `commerce_ownership_transfers`
- `commerce_product_versions`
- `commerce_offers`
- `commerce_prices`
- `commerce_orders`
- `commerce_order_items`
- `commerce_subscriptions`
- `commerce_entitlements`
- `commerce_fulfillment_events`
- `commerce_governance_events`
- `commerce_service_requests`
- `commerce_refunds`
- `commerce_webhook_events`

Record links:

- `commerce_products.catalog_item_id` links to `catalog_items.id` when a product is marketplace-listed.
- `commerce_products.ownership_record_id` links to the current ownership record.
- `commerce_product_versions.catalog_artifact_version_id` links to `catalog_artifact_versions.id` when the product has versioned artifacts.
- `commerce_entitlements` may mirror or extend the existing `entitlements` table while preserving existing project entitlement behavior.
- Ecommerce is unreleased, so `CommerceOfferMode` is canonical and records should use the clean vocabulary in place. `paid` and other legacy aliases are not supported.

## Stripe Integration

### Vendor Account Setup

Vendors connect Stripe through Stripe Connect hosted onboarding or embedded Connect components.

TreeSeed stores:

- connected account ID
- account readiness status
- charges enabled flag
- payouts enabled flag
- details submitted flag
- currently due requirements
- capability status
- last reconciliation timestamp

TreeSeed does not store:

- vendor Stripe secret keys
- raw card data
- bank account details
- KYC documents
- full payment method details

### Buyer Checkout

Checkout starts from a TreeSeed offer ID.

Flow:

1. Buyer selects TreeSeed offer.
2. TreeSeed server validates offer state, seller readiness, buyer eligibility, price, and entitlement scope.
3. TreeSeed creates an order in `pending_payment` state.
4. TreeSeed creates Stripe checkout/payment/subscription objects using the connected account strategy selected for the offer.
5. Stripe collects payment through Elements or hosted Checkout.
6. Stripe webhook confirms payment or subscription state.
7. TreeSeed verifies the webhook and grants entitlements.
8. Fulfillment starts automatically or waits for vendor action depending on offer mode.

### Stripe Object Mirroring

TreeSeed product records are authoritative. Stripe Product and Price records are mirrors.

Each active commerce price should map to a Stripe Price. Use Stripe metadata and lookup keys to preserve TreeSeed identity:

```text
treeseed_environment
treeseed_vendor_id
treeseed_seller_team_id
treeseed_product_id
treeseed_product_version_id
treeseed_offer_id
treeseed_price_id
treeseed_price_version
```

Price changes create a new `commerce_prices` row and a new Stripe Price. Historical purchase terms must remain immutable.

### Webhook Processing

Stripe webhook processing must be idempotent.

`commerce_webhook_events` should store:

- Stripe event ID
- event type
- received timestamp
- processing status
- related order/subscription/payment IDs when known
- last processing error
- retry count
- raw event body reference or encrypted payload reference where needed

Webhook handlers must verify Stripe signatures before processing.

Entitlements are granted only after verified payment or subscription state. Missing or inconsistent webhook state must be reconciled against Stripe before manual repair.

## Governance Model

Commerce governance gates:

1. Team becomes Professional.
2. Team requests vendor capability.
3. Vendor connects Stripe.
4. Vendor records product ownership, contributor attribution, and stewardship roles.
5. Vendor submits product/listing.
6. Product, version, ownership model, and offer are reviewed.
7. Listing is approved and published.
8. Buyer purchases.
9. Payment is confirmed.
10. Entitlement is granted.
11. Fulfillment is tracked.
12. Refunds or revocations update entitlement state.
13. Ownership transfers, steward changes, or governance-policy changes are approved and recorded.

Governance events must record:

- actor
- action
- object type and ID
- prior state
- next state
- reason
- evidence
- related order, offer, product, and team
- timestamp
- policy snapshot or ownership record snapshot when applicable

Governance should be visible enough for buyers and vendors to understand trust, ownership, access, and fulfillment state without exposing private operational details.

Cooperative and community-governed products must record the approval rule used for major state changes. A rule may be advisory metadata in early phases, but it must still be captured as evidence so later enforcement can preserve historical intent.

Buyer-visible governance should include the seller, owner/steward summary, license, support terms, refund terms, fulfillment terms, trust level, and whether the product is team-owned, cooperatively owned, or community-governed. It should not expose private contributor contact information, private deliberation notes, financial details, or internal operator-only risk assessments.

## Vendor Trust Levels

| Trust level | Capability |
| --- | --- |
| `public_publisher` | Free public resources only. |
| `verified_seller` | Commercial products, no execution capacity. |
| `trusted_service_vendor` | Scoped services with governed access. |
| `trusted_capacity_vendor` | Future capacity listings, no broad secret access by default. |
| `integration_partner` | Explicit high-trust integrations. |

Capacity billing and hosted capacity provider resale are out of scope for this phase except for listing metadata and trust modeling.

Capacity listings must declare:

- human or machine execution
- required data access
- required secret access
- runtime isolation needs
- supported service types
- audit behavior
- support policy
- incident policy
- fulfillment boundaries

No capacity listing may receive private project or secret access without explicit scoped governance approval.

## Entitlement Rules

Entitlements are TreeSeed-native.

An entitlement should capture:

- buyer team and/or buyer user
- seller team
- product and version
- offer
- order and order item
- subscription when applicable
- access scope
- status
- start and end times
- renewal state
- revocation or refund state
- fulfillment artifact references
- linked project, catalog item, or resource

For `one_time_current_version`, the entitlement grants access only to the purchased version unless the seller explicitly grants future versions.

For `subscription_updates`, expiration or cancellation disables future updates while preserving access to already-purchased immutable artifacts according to offer terms.

For `professional_hosting`, subscription state controls private hosting capabilities, private projects, private TreeDX, and vendor capability eligibility.

For `scoped_contract`, entitlement activation may require both payment confirmation and scope approval.

## API Surface Plan

Initial route families:

- `GET /v1/commerce/vendors/:teamId`
- `POST /v1/commerce/vendors/:teamId/request`
- `POST /v1/commerce/vendors/:teamId/stripe/onboarding`
- `GET /v1/commerce/vendors/:teamId/stripe/status`
- `POST /v1/commerce/products`
- `PATCH /v1/commerce/products/:productId`
- `POST /v1/commerce/products/:productId/ownership`
- `POST /v1/commerce/products/:productId/stewards`
- `POST /v1/commerce/products/:productId/contributions`
- `POST /v1/commerce/products/:productId/governance-policy`
- `POST /v1/commerce/products/:productId/ownership-transfer`
- `POST /v1/commerce/products/:productId/versions`
- `POST /v1/commerce/offers`
- `POST /v1/commerce/offers/:offerId/submit`
- `POST /v1/commerce/offers/:offerId/approve`
- `POST /v1/commerce/checkout`
- `POST /v1/commerce/webhooks/stripe`
- `GET /v1/commerce/orders`
- `GET /v1/commerce/entitlements`
- `POST /v1/commerce/services/requests`

Routes must authorize against team membership, role permissions, vendor trust level, and governance state. Operator approval routes must not be exposed to ordinary vendor users.

## Security Requirements

Required controls:

- no raw vendor Stripe secret key storage
- no raw card data handling
- Stripe webhook signature verification
- idempotent webhook processing
- server-side offer and price resolution
- immutable historical purchase terms
- immutable historical ownership, stewardship, and governance snapshots for completed orders
- no client-authoritative amount, price, seller, or entitlement fields
- audit logging for all governance and entitlement transitions
- audit logging for ownership, stewardship, contributor attribution, transfer, and succession changes
- explicit trust rules for capacity listings
- explicit scoped approval before any service or capacity work receives private data or secret access
- least-privilege vendor sales dashboards
- clear buyer-visible seller, owner/steward summary, license, support, refund, trust, and fulfillment terms

## Implementation Phases

### Phase 1: Documentation and Contract Alignment

- Create this document.
- Document package boundaries, data concepts, product kinds, offer modes, governance states, entitlement rules, and Stripe approach.
- Export shared ecommerce, cooperative ownership, stewardship, entitlement, and governance vocabulary from SDK contracts.
- Align Core template offer schema with the SDK commerce vocabulary.
- Align Admin's display-only commerce provider with the SDK commerce vocabulary while keeping Admin checkout-free.
- Remove unreleased legacy offer vocabulary instead of adding compatibility shims.
- Make no runtime behavior changes.
- Add focused tests proving the clean offer set and cooperative governance and ownership model vocabulary.

Phase 1 completion criteria:

- SDK exports canonical commerce constants, type unions, and type-only contracts.
- Core validates template offer modes against SDK vocabulary.
- Admin uses SDK commerce modes and remains Stripe-free and checkout-free.
- `paid` is not accepted as an ecommerce offer mode.
- `CatalogItemOfferMode`, if retained, is only a semantic alias to `CommerceOfferMode`.
- Tests prove the clean offer set and cooperative ownership vocabulary.
- No database migrations, Stripe integration, checkout routes, or entitlement-granting behavior are added.

### Phase 2: Product and Vendor Registry

Phase 2 adds the TreeSeed-owned registry foundation for marketplace commerce. It is persistence and governance only: no Stripe calls, no buyer checkout, no cart, no webhook handling, no entitlement granting, no commissions, and no payout ledger.

Implementation scope:

- Add persistent vendor records for teams requesting marketplace capability.
- Add persistent product records for TreeSeed-native product identity.
- Add product version records that can later map to catalog artifact versions.
- Add offer and price records that can later mirror Stripe Products and Prices.
- Add cooperative ownership, stewardship, contribution, governance policy, ownership transfer, and governance event records.
- Add API routes for vendor requests, vendor approval, product drafts, product submission, product approval, product versions, offer drafts, offer approval, price activation, and governance event inspection.
- Keep admin display surfaces commerce-provider based, checkout-free, and Stripe-free.

Registry rules:

- TreeSeed product records are authoritative.
- Stripe remains out of scope and is not called in this phase.
- Nullable Stripe mirror IDs may exist on price records only so Phase 4 can sync without redesigning prices.
- Vendor approval does not imply payout readiness.
- Vendor approval does not create payout accounts, commissions, application fees, or seller ledgers.
- Product approval may publish or update the existing `catalog_items` row for public catalog discovery.
- Product version approval may publish or update an existing `catalog_artifact_versions` row when an artifact key exists.
- Offer approval may expose the approved `CommerceOfferMode` on the linked catalog item.
- `paid` remains invalid as an offer mode.

Cooperative governance and ownership requirements:

- Every marketplace product must have an ownership record.
- If no ownership record is supplied, the platform creates a default buyer-visible `team_owned` record for the seller team.
- Products may be created as `cooperative_owned`, `community_governed`, or any other canonical `CommerceOwnershipModel`.
- Stewardship assignments identify operational responsibility such as seller, maintainer, support steward, governance steward, security steward, community steward, and successor.
- Contribution records capture attribution and optional benefit weight for future recognition, benefit allocation, cooperative revenue rules, or succession decisions.
- Contribution and stewardship records are not payout ledgers.
- Benefit weights are not commissions and do not calculate revenue distribution in this phase.
- Governance events are immutable audit records for submit, approve, archive, price activation, and other marketplace state transitions.

Phase 2 completion criteria:

- Vendor records persist and can be requested by team managers.
- Market admins can approve vendors and set trust flags.
- Products persist with canonical product kind, offer vocabulary, visibility, and ownership model.
- Ownership, stewardship, contribution, governance policy, and ownership transfer records persist.
- Product versions persist and can sync approved artifacts into catalog artifact versions.
- Offers and prices persist without producing checkout URLs.
- Price activation records a governance event and preserves versioned price history.
- Governance transitions produce immutable events with actor, prior state, next state, reason, evidence, and related team/product/offer IDs.
- Approved public products sync to existing catalog items.
- Approved public product versions with artifacts sync to existing catalog artifact versions.
- Approved offers sync the catalog item offer mode.
- No Stripe, checkout, entitlement, commission, payout, or capacity billing behavior exists.

### Phase 3: Stripe Connect Account Linking

Phase 3 adds seller payment readiness through Stripe Connect Express hosted onboarding. It does not add buyer checkout or seller payout logic.

Implementation notes:

- Use Stripe Connect Express hosted onboarding as the first supported vendor account model.
- Create connected accounts only for TreeSeed-approved commerce vendors.
- Treat TreeSeed vendor approval and Stripe account readiness as separate gates.
- Store connected account IDs, Stripe environment, account status, onboarding status, capability flags, requirements counts, and last sync time in `commerce_vendor_stripe_accounts`.
- Keep `commerce_vendors.stripe_account_id` as a denormalized pointer to the active connected account.
- Never accept or store raw vendor Stripe secret keys.
- Never store Stripe onboarding links or Express Dashboard login links; create them on demand and return them only to an authenticated team manager.
- Stripe stores KYC, external bank account, compliance, and payout details.
- TreeSeed stores marketplace identity, vendor governance, product ownership, product governance, and transparent seller readiness state.
- Account return from Stripe does not imply completion. The API must retrieve account state from Stripe before marking an account enabled.
- Connected account rows are not payout ledgers.
- Connected account linkage identifies seller payment readiness, not product ownership.
- Cooperative ownership records remain the marketplace source of truth for ownership, stewardship, attribution, succession, and buyer-visible governance.
- Future ownership transfer must require governance review before changing the vendor/payment account for an approved product.
- Admin may show seller setup/status and launch hosted onboarding through API calls.
- Admin remains Stripe-free, checkout-free, and display/control oriented.
- No Stripe Products or Prices are created in this phase.
- No checkout, cart, order, subscription, webhook, entitlement, commission, application fee, or payout behavior is implemented in this phase.

Phase 3 completion criteria:

- SDK exports Stripe connected-account status, onboarding status, and environment vocabulary.
- SDK schema includes `commerce_vendor_stripe_accounts`.
- Generated market SQL includes the new connected-account table and indexes.
- API exposes vendor Stripe onboarding, status, return, and login-link routes.
- Approved vendors can start Stripe Connect Express hosted onboarding.
- Unapproved vendors cannot start Stripe onboarding.
- Status refresh persists account readiness from Stripe.
- Governance events are recorded for Stripe account creation, onboarding start, onboarding return, status sync, and login-link creation.
- Admin exposes a team commerce settings page for vendor seller setup and Stripe readiness.
- Admin does not depend on Stripe packages or implement checkout/payment logic.
- No raw Stripe secret keys are accepted or stored.

### Phase 4: Stripe Product and Price Sync

Phase 4 adds Stripe Product and Price mirrors only. TreeSeed remains authoritative for product identity, offer terms, price versions, governance state, cooperative ownership, stewardship, contribution attribution, and buyer-visible ownership records. Stripe mirrors identify seller payment readiness; they do not prove or change ownership.

Implementation notes:

- Extend SDK commerce contracts with Stripe sync status vocabulary: `not_synced`, `pending`, `synced`, `blocked`, `drifted`, and `failed`.
- Store Stripe Product mirror state on `commerce_offers`.
- Store Stripe Price mirror state on immutable `commerce_prices` rows.
- Create Stripe Product and Price objects in the vendor's connected Stripe account.
- Include TreeSeed metadata on Stripe objects: environment, vendor, seller team, product, product version, offer, price, price version, ownership model, and ownership record IDs.
- Attempt automatic Stripe Product sync after a commercial offer is approved.
- Attempt automatic Stripe Price sync after a commercial price is activated, and after offer approval when an active price already exists.
- Do not undo governance approval when Stripe is unavailable or seller readiness is incomplete. Persist `blocked` sync status and record a governance event instead.
- Keep `free`, `private`, `contact`, and `external` offers out of Stripe Price sync.
- Block Phase 4 Price sync for `custom` billing intervals and `scoped_contract` offers until scoped-service checkout is implemented.
- Reconciliation routes may repair mutable Stripe Product metadata/name/description/active state from TreeSeed.
- Reconciliation must detect immutable Stripe Price drift, such as amount, currency, or recurring interval mismatch, and mark the price `drifted` instead of mutating historical terms.
- Price changes create a new `commerce_prices` row and a new Stripe Price. Existing Stripe Price terms remain historical mirrors.
- Future checkout must require a synced Stripe Price for commercial purchase flows.
- Future ownership transfer must require governance review before any approved product changes seller team, vendor, or connected payment account.

Phase 4 does not add checkout, Stripe Elements, Stripe Checkout, carts, orders, subscriptions, webhooks, entitlement granting, fulfillment, refunds, commissions, application fees, payout ledgers, capacity credit billing, or buyer payment UI.

### Phase 5: Buyer Checkout and Entitlements

Phase 5 adds the buyer checkout and entitlement layer while keeping TreeSeed authoritative for marketplace identity, cooperative ownership, order terms, and access rights.

This phase uses Stripe Elements for the buyer payment surface. TreeSeed checkout is not a Stripe Checkout Session. TreeSeed creates and stores a checkout run, groups the cart by vendor/payment type, and returns per-group client secrets only in the checkout API response. Full client secrets are not persisted.

Multi-vendor carts are supported through grouped per-vendor checkout confirmation:

1. The buyer submits a cart or direct item list using TreeSeed `offerId` and optional `priceId`.
2. The server resolves product, offer, price, vendor, connected account, access scope, support scope, current version, and cooperative ownership state.
3. The server rejects client-supplied amount, seller, Stripe Price ID, product version override, entitlement scope, or support terms as authority.
4. TreeSeed creates one checkout run and splits work into payment groups:
   - `free`: no Stripe call.
   - `one_time` and `one_time_current_version`: one PaymentIntent per vendor/currency group.
   - `subscription` and `subscription_updates`: one connected-account subscription group per vendor/currency/billing interval.
5. The buyer confirms each commercial group with Stripe Elements.
6. Stripe sends connected-account webhooks.
7. TreeSeed verifies, stores, and idempotently processes webhook events.
8. TreeSeed updates orders, payment groups, subscriptions, entitlements, and governance events.

Supported checkout modes in this phase:

- `free`
- `one_time`
- `one_time_current_version`
- `subscription`
- `subscription_updates`

Not supported for checkout in this phase:

- `private`
- `contact`
- `professional_hosting`
- `scoped_contract`
- `external`
- capacity listing monetization

Commercial checkout requires:

- approved product
- approved offer
- active TreeSeed price
- Phase 4 `synced` Stripe Price mirror
- approved, sales-enabled vendor
- enabled Stripe connected account

Free checkout grants a TreeSeed-native entitlement immediately after server validation. Commercial one-time checkout grants entitlements only after `payment_intent.succeeded`.

Subscriptions create connected-account Stripe customers and subscriptions. TreeSeed stores subscription mirrors and renewal state. `subscription_updates` grants future update access only while the subscription remains active or trialing. If renewal is canceled, unpaid, or past due, TreeSeed preserves already-purchased immutable artifact references but disables future update access according to the offer terms.

Every order item and entitlement snapshots cooperative ownership and stewardship state at purchase time. Later ownership transfers or succession events apply prospectively unless a governed migration explicitly changes active obligations. Stripe account linkage proves seller payment readiness only; it does not prove or modify ownership.

Stripe webhooks are signature-verified, idempotent, and stored as `commerce_webhook_events` with event ID, type, connected account ID, object ID, payload hash, processing status, and related TreeSeed IDs. Raw webhook payloads, card data, Stripe API keys, and full client secrets are not stored in governance evidence.

Admin remains checkout-free and Stripe-free. Buyer checkout UI belongs to the hosted market layer under root-owned checkout/cart pages, while Admin may link to those pages or display seller setup/readiness state.

Phase 5 does not add Stripe Checkout Sessions, commissions, application fees, destination charges, separate charges and transfers, seller payout ledgers, refunds, scoped-service checkout, professional hosting checkout, capacity credit billing, hosted third-party capacity execution, or vendor sales dashboards.

### Phase 6: Vendor Dashboard and Sales Tracking

Phase 6 adds seller operations on top of the Phase 5 checkout and entitlement foundation. It gives approved vendor teams a practical way to review sales, fulfill artifacts, initiate eligible refunds, and revoke access while keeping TreeSeed authoritative for governance and ownership state.

The seller operations surface lives in Admin at `/app/teams/[teamId]/commerce/sales`. Admin remains a seller setup and operations surface only. It does not initialize Stripe Elements, create buyer checkout flows, own webhooks, or become the buyer payment UI.

Phase 6 adds:

- vendor sales summary views for gross paid amount, refunded amount, net paid amount, paid orders, active subscriptions, active entitlements, and pending fulfillment
- seller-scoped order, subscription, entitlement, refund, and fulfillment event lists
- redacted vendor order summaries that avoid exposing excess buyer-private data
- direct vendor-managed refunds for eligible one-time PaymentIntent-backed orders
- artifact fulfillment events tied to order items and entitlements
- entitlement revocation controls that are separate from monetary refunds
- governance events for refunds, fulfillment, and revocation transitions

Refunds use Stripe refunds against direct charges in the vendor connected account. TreeSeed stores `commerce_refunds` as operational evidence and local state, not as a payout ledger. Refunds require vendor manager access or market admin access, an approved vendor, a paid order owned by that seller team, a connected-account PaymentIntent, and a remaining refundable amount. Refunds use idempotency keys and update order, order item, entitlement, and governance state after Stripe confirms success. Subscription invoice refunds are intentionally deferred until invoice/payment mapping is explicitly modeled.

Fulfillment uses TreeSeed-native `commerce_fulfillment_events`. Artifact fulfillment links paid order items and active entitlements to existing catalog artifact versions or approved artifact references. Fulfillment updates order item status and entitlement `fulfillmentArtifactRefs`; it does not upload binary artifacts in this phase.

Entitlement revocation is state and governance only. It does not automatically create a Stripe refund. If money should be returned, the refund route must be used separately.

Vendor views may show buyer team identifiers or buyer display labels where appropriate, but they must not expose buyer email addresses, full user profiles, card data, full client secrets, KYC details, or internal operator-only risk assessments. Market admins may inspect full governance evidence; vendors receive only the operational and buyer-safe fields needed to support the sale.

Cooperative ownership and stewardship remain foundational. Orders, order items, entitlements, refunds, and fulfillment events must preserve purchase-time ownership snapshots and link back to product, offer, seller team, ownership model, and governance events. Current product ownership, stewardship, contribution attribution, and governance records may be displayed to vendors for context, but historical purchase snapshots remain immutable unless a governed migration explicitly changes active obligations.

Phase 6 does not add commissions, application fees, destination charges, separate charges and transfers, seller payout ledgers, payout reconciliation, capacity credit billing, hosted third-party capacity execution, buyer checkout UI, scoped-service checkout, or legacy `paid` offer compatibility.

### Phase 7: Cooperative Ownership Workflows

Phase 7 makes the cooperative governance and ownership model operational. It extends the existing product registry instead of creating a separate ownership system.

Ownership, seller capability, stewardship, contribution attribution, and Stripe payment readiness are separate concepts:

- `commerce_ownership_records` identify current and historical product ownership authority.
- `commerce_stewardship_assignments` identify operational roles such as owner, seller, maintainer, governance steward, support steward, security steward, community steward, and successor.
- `commerce_contributions` identify contributor attribution and optional `benefitWeight` metadata for future recognition, governance, and possible cooperative benefit rules.
- `commerce_governance_policies` describe approval and quorum expectations for cooperative or community-governed products.
- `commerce_ownership_transfers` record explicit transfer decisions before current ownership changes.
- `commerce_succession_events` record successor naming, acceptance, triggering, completion, or cancellation.

Editable ownership workflows:

- Seller team managers and market admins may update buyer-visible ownership summaries.
- Seller team managers and market admins may update or end stewardship assignments.
- Seller team managers and market admins may update contributor summaries, attribution visibility, and benefit weights.
- Seller team managers and market admins may update governance policy titles, approval rules, quorum rules, buyer-visible summaries, and policy status.
- Every update records an immutable `commerce_governance_events` entry with actor, action, object, prior state, next state, reason, evidence, product, and team linkage.

Ownership transfers are governed state transitions:

- Creating a transfer records intent only.
- Transfer creation does not change the product's current ownership record.
- `draft -> submitted` records readiness for decision.
- `submitted -> approved` applies the transfer, supersedes the prior ownership record where applicable, and sets the product's current ownership record.
- `submitted -> rejected` leaves ownership unchanged.
- `draft|submitted -> canceled` leaves ownership unchanged.
- Transfers do not automatically change `sellerTeamId`, `vendorId`, Stripe connected account, payout account, or payment routing.
- Any future seller/payment-account change must require explicit market-admin review and a separate governed operation.

Succession records are governance evidence. A succession event does not automatically rewrite ownership unless it is paired with an approved ownership transfer. This keeps succession transparent without silently changing product authority or seller payment routing.

Buyer transparency:

- Public approved products may expose buyer-visible ownership records, buyer-visible stewardship assignments, public or buyer-visible contribution attribution, and buyer-visible governance policy summaries.
- Public responses must omit private evidence, internal metadata, private contribution attribution, pending transfers, and succession details.
- Seller teams and market admins may inspect full workflow records.

Purchase snapshots remain immutable:

- Orders, order items, and entitlements keep the cooperative ownership and stewardship snapshot from purchase time.
- Later ownership transfers or succession events apply prospectively.
- Historical snapshots must not be rewritten unless a future governed migration explicitly changes active obligations.

`benefitWeight` remains attribution metadata only in Phase 7. It is not a payout allocation, commission rule, revenue split, application fee, transfer instruction, or seller ledger entry.

Phase 7 adds Admin seller governance pages:

- `/app/teams/[teamId]/commerce/products`
- `/app/teams/[teamId]/commerce/products/[productId]/governance`

These pages are seller governance operations only. Admin remains checkout-free, Stripe-free, payout-free, and commission-free.

Phase 7 does not add revenue splitting, payout allocation, commissions, application fees, seller payout ledgers, capacity credit billing, buyer checkout UI, or legacy `paid` offer compatibility.

### Phase 8: Scoped Services

Phase 8 implements scoped services as a TreeSeed-native contact, scope, quote, approve, checkout, activate, and fulfill workflow. It layers on the existing vendor registry, cooperative ownership records, Stripe connected-account readiness, checkout/order/payment-group records, entitlements, fulfillment events, and governance event log.

`contact` offers create inquiries and scoping workflow only. They do not create payment until a vendor creates a scoped quote and both sides approve the quote. `scoped_contract` offers are quote-driven and cannot be checked out through the generic cart checkout route. This prevents a buyer from bypassing service scoping by submitting an offer ID directly to `/v1/commerce/checkout`.

Scoped service records:

- `commerce_service_requests` store the buyer inquiry, requested scope, approved scope, access needs, buyer-visible summary, seller-private notes, related project/workday references, active quote, approved quote, linked contract, linked order, linked entitlement, and purchase-time cooperative ownership snapshot.
- `commerce_service_quotes` store immutable quote versions. Revisions create new rows with incrementing `quoteVersion`; old active draft/submitted quotes are superseded instead of mutated.
- `commerce_service_contracts` store the accepted quote contract, amount, currency, order/payment/entitlement linkage, project/workday references, fulfillment summary, ownership snapshot, and access approval snapshot.
- `commerce_service_events` store service-specific transition history for request, scoping, quote, approval, checkout, activation, work linkage, fulfillment, decline, and cancellation.

Buyer approval and vendor approval are separate governance steps:

1. Buyer submits a request for an approved `scoped_service` product with an approved `contact` or `scoped_contract` offer.
2. Vendor starts scoping and may update approved scope, buyer-visible summary, seller-private notes, access requirements, and governance requirements.
3. Vendor creates a quote. The quote amount, currency, deliverables, assumptions, access requirements, and governance requirements are server-side authority.
4. Vendor submits the quote.
5. Buyer approves or rejects the submitted quote.
6. Vendor approves the buyer-approved quote.
7. Accepted quote creates a pending service contract.
8. Buyer opens dedicated service contract checkout.
9. Stripe confirms a one-time connected-account PaymentIntent for the accepted quote amount.
10. TreeSeed activates the service contract, order, order item, entitlement, and request after `payment_intent.succeeded`.
11. Vendor manually fulfills the service through Phase 6 fulfillment records.

Scoped contract checkout reuses the Phase 5 Stripe Elements grouped-payment model but does not use Phase 4 Stripe Product/Price sync. The PaymentIntent amount and currency come from the accepted `commerce_service_quote`, not from a Stripe Price or client-supplied amount. Stripe metadata includes service request, quote, contract, product, offer, vendor, seller team, and cooperative ownership identifiers. Full client secrets are returned only in API responses and are not persisted.

TreeSeed owns service identity, quote versions, approvals, contract state, order state, entitlement scope, fulfillment, ownership snapshots, and governance evidence. Stripe owns only payment confirmation for the approved quoted contract.

Project and workday links are references only in Phase 8. Linking `relatedProjectId` or `relatedWorkdayId` does not create projects, create workdays, grant secret access, grant repository access, or start capacity execution. Any private data, project access, secret access, or capacity involvement must be explicitly represented in quote access requirements and governance evidence before work proceeds.

Fulfillment reuses `commerce_fulfillment_events`. A vendor can mark an active service contract fulfilled, attach artifact or delivery references, update the linked entitlement's fulfillment refs, and record service/governance events. Fulfillment does not automatically refund, revoke, upload binary artifacts, or mutate historical ownership snapshots.

Buyer-facing service pages live in the root hosted market layer:

- `/services/[requestId]`
- `/services/[requestId]/checkout`

Admin service pages are seller operations only:

- `/app/teams/[teamId]/commerce/services`
- `/app/teams/[teamId]/commerce/services/[requestId]`

Admin may start scoping, update scope, create and submit quotes, vendor-approve quotes, link project/workday references, fulfill contracts, and cancel where allowed. Admin does not initialize Stripe Elements, create buyer payment flows, process webhooks, or become buyer checkout UI.

Cooperative ownership remains foundational. Service requests and contracts snapshot current ownership and stewardship at request/contract time. Orders and entitlements keep purchase-time ownership snapshots even if ownership transfers or succession events occur later. Seller/payment account changes are not automatic; any future change that could affect payment routing requires explicit market-admin governance review.

Phase 8 completion criteria:

- Service requests persist for approved service products and approved service-enabled vendors.
- Quote versions persist immutably and increment by request.
- Buyer and vendor approval transitions persist separately.
- Accepted quotes create pending service contracts.
- Generic cart checkout rejects direct `scoped_contract` bypass.
- Contract checkout creates a TreeSeed checkout, order, order item, and payment group from the accepted quote amount.
- Payment success activates contract, request, order, order item, entitlement, and governance state.
- Payment failure leaves the contract pending checkout and grants no entitlement.
- Manual fulfillment updates contract/request status and writes fulfillment records.
- Project/workday links are references only.
- Service events and governance events record every transition.
- Historical ownership snapshots remain immutable.
- Admin remains Stripe-free and checkout-free.

Phase 8 does not add capacity marketplace listings, capacity credit billing, hosted third-party capacity execution, automatic project/workday creation, automatic secret access grants, Stripe Checkout Sessions, commissions, application fees, destination charges, separate charges and transfers, seller payout ledgers, payout reconciliation, revenue splits, benefit payout allocation, subscription invoice refunds, new Admin payment UI, legacy `paid` offer mode, or compatibility aliases.

### Phase 9: Capacity Marketplace Foundation

Phase 9 adds trust-gated capacity listings and buyer inquiries. It is a listing and review foundation, not a capacity execution or billing layer.

Capacity listings are catalog-visible marketplace records for vendor capability discovery. They describe the seller's capacity posture, supported service types, runtime expectations, data/secret access posture, support policy, buyer-visible risk summary, and cooperative ownership/stewardship context. Existing capacity provider or lane identifiers may be linked only as disclosure/readiness metadata for future routing context.

Provider and lane links do not create:

- capacity reservations
- capacity grants
- capacity ledgers
- routing decisions
- deployments
- execution jobs
- billing records

Vendors must be approved, capacity-enabled, and trusted before listing capacity. `trusted_capacity_vendor` is a trust level for capacity listing eligibility; it is not a payment status, payout status, ownership model, or blanket access grant. Product ownership, stewardship, seller status, provider readiness, and payment readiness remain separate concepts.

Capacity listing inquiries are governance records for buyer interest and seller review. An inquiry can move through requested, reviewing, approved-for-scoping, declined, or canceled states. Approval means only that the buyer is approved for a scoping conversation. It does not create a service request, quote, checkout, order, entitlement, capacity grant, reservation, routing decision, execution job, or payment obligation.

For `capacity_listing` products, Phase 9 allows only discovery offer modes:

- `contact`
- `private`
- `external`

`scoped_contract` remains quote-driven through Phase 8 scoped services and cannot be checked out through generic cart or capacity listing flows. `one_time`, `one_time_current_version`, `subscription`, `subscription_updates`, `professional_hosting`, and legacy `paid` are not valid capacity listing offer modes in Phase 9.

Public capacity pages live in the root hosted market layer:

- `/capacity`
- `/capacity/[listingId]`

Public pages expose only approved, buyer-visible listing fields: service type summaries, runtime isolation, human/AI involvement, data and secret access posture, risk summary, support policy, availability, and cooperative ownership/stewardship transparency. They do not expose seller private notes, governance evidence, provider credentials, raw secrets, KYC data, payment controls, or backend implementation details.

Admin capacity pages are seller operations and governance only:

- `/app/teams/[teamId]/commerce/capacity`
- `/app/teams/[teamId]/commerce/capacity/[listingId]`

Admin may create/update/submit/archive seller listings and review/decline/approve inquiries for scoping. Market admin approval is required for listing approval/rejection/suspension. Admin does not initialize Stripe Elements, create checkout, mutate capacity provider infrastructure, create reservations/grants, run executions, or expose capacity billing controls.

Phase 9 completion criteria:

- Capacity listing records persist.
- Capacity listing inquiry records persist.
- Seller/admin workflows can submit, approve, reject, suspend, archive, and review inquiries.
- Public approved listings are readable with private metadata omitted.
- Capacity listings can link existing provider/lane metadata without creating execution or billing records.
- Governance events record listing and inquiry transitions.
- Capacity listing offer modes are restricted to non-checkout discovery modes.
- `paid` remains rejected.
- Admin remains Stripe-free, checkout-free, and capacity-execution-free.
- No capacity credit, commission, application fee, payout, revenue split, grant, reservation, ledger, routing, deployment, or execution behavior is added.

Phase 9 does not add capacity credit billing, generalized capacity credits, hosted third-party capacity execution, capacity reservations from listings, capacity grants from listings, marketplace capacity ledger entries, capacity routing decisions, provider deployments from listing actions, automatic project/workday creation, automatic secret access grants, Stripe Checkout Sessions, new buyer payment UI, commissions, Stripe application fees, destination charges, separate charges and transfers, seller payout ledgers, payout reconciliation, revenue splits, benefit payout allocation, subscription invoice refunds, new Admin payment UI, legacy `paid` offer mode, or compatibility aliases.

### Stop Before Commission And Capacity Resale Phases

Do not implement these in the foundational phase:

- TreeSeed commission fees
- Stripe application fees
- seller payout ledger
- payout reconciliation
- generalized capacity credit resale
- hosted arbitrary third-party capacity providers

## Marketplace UI And Operations Experience

The closure pass after Phase 9 makes the buyer and seller surfaces easier to understand without changing the architecture. The root `@treeseed/market` app owns buyer marketplace discovery, cart review, grouped vendor checkout, service request views, service contract checkout, and capacity discovery/inquiry pages. `@treeseed/admin` owns seller setup, seller operations, governance, fulfillment, refunds, readiness, and monitoring. `@treeseed/ui` owns reusable, Stripe-free, theme-native commerce components and styles that both surfaces can consume.

Root marketplace pages use public-safe marketplace aggregation:

- `GET /v1/commerce/marketplace`
- `GET /v1/commerce/marketplace/products/:productId`

These routes expose approved products, approved offers, active public pricing, buyer-visible ownership summaries, visible stewardship records, service eligibility, checkout eligibility, and capacity inquiry eligibility. They do not expose seller private notes, internal governance evidence, provider credentials, KYC details, Stripe secrets, full client secrets, payout data, commission data, capacity billing data, or capacity execution credentials.

Checkout pages use Stripe Elements only in the root buyer surface. Full Stripe client secrets are never persisted. A buyer-authorized payment group refresh may return a transient `clientSecret` in the API response when the group still requires confirmation or action; succeeded, failed, canceled, or non-confirmable groups return `null`. Admin and vendor views do not receive client secrets.

Admin commerce monitoring uses `GET /v1/commerce/vendors/:teamId/monitoring` to summarize seller readiness and operational exceptions:

- Stripe readiness
- blocked or drifted Product/Price sync
- pending fulfillment
- failed refunds
- failed webhooks
- pending service requests
- pending capacity inquiries
- pending governance transfers
- recent governance events

Monitoring is derived from existing commerce records. It is not a payout ledger, commission report, capacity billing system, provider execution control plane, or buyer payment surface.

### Stripe Setup Registry

Stripe configuration is declared in the Treeseed environment registry and set through `trsd config`, not plaintext env files. The canonical variables are:

- `TREESEED_STRIPE_SECRET_KEY`: API-only platform secret key for Connect onboarding, Product/Price mirror sync, PaymentIntents, Customers, Subscriptions, Refunds, and webhook reconciliation.
- `TREESEED_STRIPE_PUBLISHABLE_KEY`: non-secret key returned by `/v1/commerce/stripe/config` for root-market Stripe Elements checkout.
- `TREESEED_STRIPE_WEBHOOK_SECRET`: API-only signing secret for `/v1/commerce/webhooks/stripe`.
- `TREESEED_STRIPE_MODE`: `test` for local and staging; `live` only after production readiness and acceptance verification.
- `TREESEED_STRIPE_CONNECT_ACCOUNT_TYPE`: `express`.

The Stripe webhook endpoint should subscribe to:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Vendors never provide raw Stripe secret keys. TreeSeed creates connected-account onboarding links and uses connected-account request options server-side. This preserves the cooperative governance and ownership model: TreeSeed owns marketplace identity, governance evidence, order terms, entitlement state, service/capacity records, and historical ownership snapshots; Stripe owns payment method handling and connected-account financial rails.

## Current Release Closure

The current release treats the 9 documented phases plus the Marketplace UI and Operations Experience, Stripe Setup Registry, and TreeSeed Commons Governance sections as the ecommerce architecture acceptance boundary.

The completed platform is intentionally split by owner:

- `@treeseed/api` owns persistent marketplace state, route orchestration, PostgreSQL migrations, Stripe server integration, webhooks, refunds, fulfillment, seller monitoring, scoped services, capacity listings/inquiries, and Commons governance records.
- root `@treeseed/market` owns buyer-facing marketplace discovery, cart, checkout, service request/contract views, capacity inquiry, and Commons participant pages.
- `@treeseed/admin` owns seller operations, readiness, governance, fulfillment, refunds, capacity trust gates, service workflows, monitoring, and Commons steward operations.
- `@treeseed/ui` owns reusable, Stripe-free, theme-native commerce and governance components.
- `@treeseed/core` remains web runtime composition only and does not own API, PostgreSQL, migrations, operations-runner, Stripe, or ecommerce backend behavior.

Release, staging, and local-dev commands must preserve these boundaries. Documentation-only releases should still use the same branch/worktree workflow as code releases: switch into a managed worktree, save the branch, plan staging, execute staging, wait for configured gates, and remove the task branch/worktree only after success.

## Testing Plan

## TreeSeed Commons Governance

TreeSeed Commons extends the marketplace governance thesis inward. Registered users can participate in TreeSeed questions, proposals, backing, voting, and bounded steward decisions through the same cooperative governance and ownership model that marketplace products expose to buyers.

Registration creates a Commons governance identity and read-only TreeSeed team membership. It does not create legal cooperative membership, payout rights, patronage rights, equity-like claims, or unbounded roadmap authority. Binding authority is staged through proposal review, voting, steward decision records, and capacity constraints.

Commons governance records are separate from ecommerce orders, entitlements, Stripe payments, refunds, services, and capacity listing workflows. They add participant signal and transparent decision evidence without adding commissions, application fees, payout ledgers, revenue splits, benefit payout allocation, capacity billing, token credits, or legal member ledgers.

The Admin surface at `/app/commons` is steward operations only. Public/root Commons pages under `/commons` are participant-facing and use HTTP API surfaces only.

Required test scenarios:

- product draft creation
- ownership model validation
- steward assignment creation
- contributor attribution visibility
- cooperative governance policy snapshotting
- ownership transfer preserves historical order and entitlement terms
- product version immutability after purchase
- offer mode validation
- vendor cannot sell without Professional entitlement and approval
- vendor cannot publish commercial offer without Stripe readiness
- checkout rejects client-supplied arbitrary Stripe price IDs
- checkout resolves amount and seller from server-side offer state
- webhook signature verification
- webhook idempotency
- payment success grants entitlement
- subscription renewal keeps entitlement active
- subscription cancellation updates entitlement end state
- refund or revocation changes entitlement status
- free public resources remain accessible without authentication
- private resources require entitlement
- scoped service request requires approval before checkout or fulfillment
- capacity listing cannot request privileged access without trust metadata
- admin package remains checkout-free

## Verification Expectations

After implementation work begins, minimum verification should include:

- `npm run check`
- `npm run build`
- API unit tests for commerce store and routes
- SDK contract/type tests
- admin package tests ensuring admin remains checkout-free
- Stripe webhook handler tests with signed fixture payloads
- focused marketplace UI smoke tests once UI routes exist

## Assumptions

- Stripe Connect is the default vendor payment model.
- TreeSeed product records are authoritative.
- Stripe Products and Prices are mirrors.
- Professional subscription is required to sell.
- Not every Professional team must sell.
- Marketplace commissions are intentionally deferred.
- Capacity marketplace billing is deferred.
- Capacity listings are modeled only as trust-gated marketplace foundations in this phase.
- Cooperative ownership records are foundational even before commission splitting, payout allocation, or automated voting exists.
- Ownership, stewardship, contribution, and governance records must be modeled separately from Stripe settlement.
- Root market owns buyer checkout and ecommerce participant pages; `@treeseed/api` owns backend ecommerce state and Stripe server behavior; `@treeseed/admin` remains seller operations and governance only.
