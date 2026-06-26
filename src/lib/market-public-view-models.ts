import type {
	CollectionViewModel,
	DashboardViewModel,
	FeedbackContext,
	HelpContext,
	ResolvedAction,
	ResourceSummary,
} from '@treeseed/ui';

type AstroLike = {
	url: URL;
	request: Request;
	params?: Record<string, string | undefined>;
	locals?: {
		auth?: {
			principal?: {
				id?: string | null;
				displayName?: string | null;
			} | null;
		} | null;
	};
};

type ApiResult<T> =
	| { ok: true; payload: T }
	| { ok: false; error: string; status: number };

export interface MarketPublicPage<T = Record<string, unknown>> {
	title: string;
	description: string;
	helpContext: HelpContext;
	feedbackContext: FeedbackContext;
	actions: ResolvedAction[];
	data: T;
}

const routeSummary: Record<string, string> = {
	commerce: 'TreeSeed marketplace checkout, seller readiness, entitlements, and service scoping are API-authoritative. This page only renders policy-safe state and resolved buyer actions.',
	governance: 'TreeSeed Commons participation is advisory governance. Proposals, votes, questions, and steward decisions are recorded as audit-backed governance events.',
};

export function isSignedIn(Astro: AstroLike): boolean {
	return Boolean(Astro.locals?.auth?.principal);
}

export function routeHelp(Astro: AstroLike, input: {
	capabilityId: string;
	resourceType: string;
	routePattern: string;
	title: string;
	summary: string;
	context?: 'market' | 'public';
}): HelpContext {
	return {
		capabilityId: input.capabilityId,
		topicIds: [input.capabilityId],
		shell: 'public',
		context: input.context ?? 'market',
		resourceType: input.resourceType,
		routePattern: input.routePattern,
		canonicalPath: Astro.url.pathname,
		template: 'dashboard',
		summary: input.summary,
		topics: [
			{
				id: input.capabilityId,
				title: input.title,
				summary: input.summary,
				visibility: 'public',
				source: 'capability',
			},
		],
		relatedDocs: [
			{
				topicId: input.capabilityId,
				title: input.title,
				href: Astro.url.pathname,
				visibility: 'public',
				source: 'capability',
				current: true,
			},
		],
		relatedActions: [],
		searchScope: 'public',
		searchPlaceholder: 'Search TreeSeed help',
		visibility: 'public',
		feedbackType: 'question',
	};
}

export function routeFeedback(Astro: AstroLike, input: {
	capabilityId: string;
	resourceType: string;
	routePattern: string;
	title: string;
	resourceId?: string;
}): FeedbackContext {
	return {
		url: Astro.url.pathname,
		canonicalPath: Astro.url.pathname,
		title: input.title,
		capabilityId: input.capabilityId,
		shell: 'public',
		context: 'market',
		resourceType: input.resourceType,
		resourceId: input.resourceId,
		submissionEndpoint: '/api/feedback/submit',
		allowAnonymous: true,
		screenshotPolicy: 'optional',
		attachmentStoragePolicy: 'public',
		routePattern: input.routePattern,
		policy: 'public',
		source: 'page',
	};
}

export async function marketApi<T>(Astro: AstroLike, path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
	const headers = new Headers(init.headers);
	if (!headers.has('accept')) headers.set('accept', 'application/json');
	if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
	const cookie = Astro.request.headers.get('cookie');
	if (cookie && !headers.has('cookie')) headers.set('cookie', cookie);
	const response = await fetch(new URL(path, Astro.url).href, { ...init, headers });
	const envelope = await response.json().catch(() => null) as { ok?: boolean; payload?: T; error?: string } | null;
	if (!response.ok || !envelope?.ok) {
		return { ok: false, status: response.status, error: envelope?.error ?? `Request failed: ${response.status}` };
	}
	return { ok: true, payload: envelope.payload as T };
}

export function formError(error?: string): ResourceSummary[] {
	return error ? [{ id: 'form-error', title: 'Action needs attention', description: error, status: 'blocked' }] : [];
}

export function allowedOrSignIn(Astro: AstroLike, action: Omit<ResolvedAction, 'state'>): ResolvedAction {
	return {
		...action,
		state: isSignedIn(Astro) ? 'allowed' : 'requiresSignIn',
		reason: isSignedIn(Astro) ? action.reason : 'Sign in to use buyer and participant actions.',
		remediation: isSignedIn(Astro) ? action.remediation : 'Use the sign-in action in the header, then return to this page.',
	};
}

export function requiresEntitlement(action: Omit<ResolvedAction, 'state'>): ResolvedAction {
	return {
		...action,
		state: 'requiresEntitlement',
		reason: action.reason ?? 'This action requires an active marketplace entitlement.',
		remediation: action.remediation ?? 'Complete checkout or ask the seller for entitlement access.',
	};
}

export function money(amount?: number | null, currency = 'usd', interval?: string | null): string {
	if (amount == null) return 'Seller scoped';
	const formatted = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
	}).format(Number(amount) / 100);
	return interval && interval !== 'one_time' ? `${formatted} / ${interval}` : formatted;
}

export function label(value: unknown, fallback = 'Not set'): string {
	const text = String(value ?? '').trim();
	return text ? text.replaceAll('_', ' ') : fallback;
}

function firstText(...values: unknown[]): string | undefined {
	for (const value of values) {
		const text = String(value ?? '').trim();
		if (text) return text;
	}
	return undefined;
}

function metric(labelText: string, value: string | number, description?: string, href?: string) {
	return { label: labelText, value, description, href };
}

function productResource(product: any): ResourceSummary {
	const offer = product.offers?.find((entry: any) => entry.checkoutEligible || entry.serviceEligible || entry.capacityInquiryEligible) ?? product.offers?.[0];
	return {
		id: String(product.id),
		title: String(product.title ?? product.id),
		description: firstText(product.summary, product.buyerVisibleOwnershipSummary, 'Review buyer-visible terms, seller readiness, and ownership before continuing.'),
		href: `/market/products/${encodeURIComponent(String(product.id))}`,
		status: offer ? money(offer.unitAmount, offer.currency, offer.billingInterval) : label(product.kind, 'Listing'),
		meta: `${label(product.kind, 'product')} · ${label(product.vendorDisplayName, 'TreeSeed seller')}`,
	};
}

export async function loadMarketplacePage(Astro: AstroLike): Promise<MarketPublicPage<{
	dashboard: DashboardViewModel;
	collection: CollectionViewModel;
	products: any[];
}>> {
	const result = await marketApi<{ products?: any[] }>(Astro, '/v1/commerce/marketplace');
	const products = result.ok ? result.payload.products ?? [] : [];
	const resources = products.map(productResource);
	const title = 'Marketplace';
	const description = 'Digital products, scoped services, and capacity discovery in one governed market.';
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.public-marketplace', resourceType: 'marketplace', routePattern: '/marketplace', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.public-marketplace', resourceType: 'marketplace', routePattern: '/marketplace', title }),
		actions: [
			{ id: 'marketplace.cart', label: 'Cart', state: 'allowed', href: '/cart' },
			allowedOrSignIn(Astro, { id: 'marketplace.service-request', label: 'Request a service', href: '/services/new' }),
		],
		data: {
			products,
			dashboard: {
				title: 'TreeSeed marketplace',
				description,
				context: {
					id: 'market-context',
					title: 'Governed acquisition',
					description: 'TreeSeed keeps price, entitlement, fulfillment, stewardship, and seller readiness in API-authoritative records.',
					items: [
						metric('Approved listings', products.length),
						metric('Digital products', products.filter((entry) => entry.kind === 'digital_product').length),
						metric('Scoped services', products.filter((entry) => entry.kind === 'scoped_service').length),
						metric('Capacity lanes', products.filter((entry) => entry.kind === 'capacity_listing').length),
					],
				},
				primaryResources: resources.slice(0, 6),
				nextActions: [
					{ id: 'capacity', title: 'Capacity discovery', description: 'Review buyer-visible execution posture before starting any inquiry.', href: '/capacity', status: 'public review' },
					{ id: 'commons', title: 'Commons governance', description: 'See advisory proposals and participation signals that shape TreeSeed.', href: '/commons', status: 'public signal' },
				],
				emptyTitle: result.ok ? 'No approved listings yet' : 'Marketplace unavailable',
				emptyDescription: result.ok ? 'Seller-approved listings appear here after governance review.' : result.error,
			},
			collection: {
				title: 'Marketplace listings',
				description: 'Buyer-visible products, services, and capacity listings.',
				rows: products.map((product) => ({
					title: product.title,
					kind: label(product.kind),
					seller: product.vendorDisplayName ?? 'TreeSeed seller',
					ownership: label(product.ownershipModel, 'documented'),
					offers: product.offers?.length ?? 0,
				})),
				columns: [
					{ key: 'title', label: 'Listing' },
					{ key: 'kind', label: 'Kind' },
					{ key: 'seller', label: 'Seller' },
					{ key: 'ownership', label: 'Ownership' },
					{ key: 'offers', label: 'Offers' },
				],
				resources,
				emptyTitle: result.ok ? 'No approved listings yet' : 'Marketplace unavailable',
				emptyDescription: result.ok ? 'Seller-approved listings appear after governance review.' : result.error,
			},
		},
	};
}

export async function loadMarketplaceProductPage(Astro: AstroLike, productId: string): Promise<MarketPublicPage<{
	product: any | null;
	metadata: Array<{ key: string; value: string }>;
	offers: any[];
}>> {
	const result = await marketApi<any>(Astro, `/v1/commerce/marketplace/products/${encodeURIComponent(productId)}`);
	const product = result.ok ? result.payload : null;
	const title = product?.title ?? 'Marketplace product';
	const description = firstText(product?.summary, product?.buyerVisibleOwnershipSummary, result.ok ? 'Review marketplace terms and cooperative ownership.' : result.error) ?? 'Review marketplace terms.';
	const offers = product?.offers ?? [];
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.market-product', resourceType: 'market-product', routePattern: '/market/products/:productId', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.market-product', resourceType: 'market-product', routePattern: '/market/products/:productId', title, resourceId: productId }),
		actions: [
			{ id: 'product.back', label: 'Marketplace', state: 'allowed', href: '/marketplace' },
			...(product?.capacityListingId ? [{ id: 'product.capacity', label: 'Capacity review', state: 'allowed' as const, href: `/capacity/${encodeURIComponent(String(product.capacityListingId))}` }] : []),
		],
		data: {
			product,
			offers,
			metadata: [
				{ key: 'Seller', value: label(product?.vendorDisplayName, 'TreeSeed seller') },
				{ key: 'Kind', value: label(product?.kind, 'product') },
				{ key: 'Ownership', value: label(product?.ownershipModel, 'documented') },
				{ key: 'Visible stewards', value: String(product?.stewardshipSummary?.length ?? 0) },
				{ key: 'Offers', value: String(offers.length) },
			],
		},
	};
}

export async function createCheckoutFromOffer(Astro: AstroLike, formData: FormData): Promise<ApiResult<any>> {
	const offerId = String(formData.get('offerId') ?? '').trim();
	const priceId = String(formData.get('priceId') ?? '').trim();
	const quantity = Number(formData.get('quantity') ?? 1);
	return marketApi(Astro, '/v1/commerce/checkout', {
		method: 'POST',
		body: JSON.stringify({
			items: [{ offerId, priceId: priceId || null, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1 }],
		}),
	});
}

export function loadCartPage(Astro: AstroLike, error?: string): MarketPublicPage<{ dashboard: DashboardViewModel; error?: string }> {
	const title = 'Cart';
	const description = 'Start governed checkout from an approved offer.';
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.cart', resourceType: 'cart', routePattern: '/cart', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.cart', resourceType: 'cart', routePattern: '/cart', title }),
		actions: [
			{ id: 'cart.marketplace', label: 'Browse marketplace', state: 'allowed', href: '/marketplace' },
			allowedOrSignIn(Astro, { id: 'cart.checkout', label: 'Start checkout' }),
		],
		data: {
			error,
			dashboard: {
				title,
				description: 'TreeSeed resolves seller, price, entitlement, fulfillment, and ownership terms server-side before creating checkout.',
				context: {
					id: 'cart-rules',
					title: 'Checkout rules',
					items: [
						metric('Seller authority', 'API', 'Connected seller accounts are resolved by the backend.'),
						metric('Price authority', 'API', 'Amounts and currencies are never trusted from the browser.'),
						metric('Entitlements', 'after payment', 'Access activates only after payment or subscription succeeds.'),
					],
				},
				nextActions: formError(error),
			},
		},
	};
}

export async function loadCheckoutPage(Astro: AstroLike, checkoutId: string): Promise<MarketPublicPage<{
	checkout: any | null;
	orders: any[];
	groups: any[];
	entitlements: any[];
	metadata: Array<{ key: string; value: string }>;
	error?: string;
}>> {
	const result = await marketApi<any>(Astro, `/v1/commerce/checkouts/${encodeURIComponent(checkoutId)}`);
	const payload = result.ok ? result.payload : null;
	const groups = payload?.paymentGroups ?? [];
	const entitlements = payload?.entitlements ?? [];
	const title = 'Checkout';
	const description = 'Confirm seller payment groups and entitlement activation.';
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.checkout', resourceType: 'checkout', routePattern: '/checkout/:checkoutId', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.checkout', resourceType: 'checkout', routePattern: '/checkout/:checkoutId', title, resourceId: checkoutId }),
		actions: [
			{ id: 'checkout.refresh', label: 'Refresh', state: 'allowed', href: Astro.url.pathname },
			{ id: 'checkout.marketplace', label: 'Marketplace', state: 'allowed', href: '/marketplace' },
		],
		data: {
			checkout: payload?.checkout ?? null,
			orders: payload?.orders ?? [],
			groups,
			entitlements,
			error: result.ok ? undefined : result.error,
			metadata: [
				{ key: 'Checkout', value: checkoutId },
				{ key: 'Orders', value: String(payload?.orders?.length ?? 0) },
				{ key: 'Payment groups', value: String(groups.length) },
				{ key: 'Entitlements', value: String(entitlements.length) },
			],
		},
	};
}

export async function loadCapacityListingsPage(Astro: AstroLike): Promise<MarketPublicPage<{ collection: CollectionViewModel; listings: any[] }>> {
	const result = await marketApi<any[]>(Astro, '/v1/commerce/capacity-listings');
	const listings = result.ok ? result.payload : [];
	const resources = listings.map((listing) => ({
		id: String(listing.id),
		title: firstText(listing.title, listing.productTitle, listing.productId, listing.id) ?? 'Capacity listing',
		description: firstText(listing.buyerVisibleRiskSummary, listing.dataHandlingSummary, listing.availabilitySummary, 'Review execution posture before requesting seller review.'),
		href: `/capacity/${encodeURIComponent(String(listing.id))}`,
		status: label(listing.status, 'review'),
		meta: `${label(listing.runtimeIsolationLevel, 'runtime')} · ${label(listing.accessLevel, 'access')}`,
	}));
	const title = 'Capacity';
	const description = 'Trust-gated TreeSeed capacity listings for buyer review.';
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.capacity', resourceType: 'capacity-listing', routePattern: '/capacity', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.capacity', resourceType: 'capacity-listing', routePattern: '/capacity', title }),
		actions: [{ id: 'capacity.marketplace', label: 'Marketplace', state: 'allowed', href: '/marketplace' }],
		data: {
			listings,
			collection: {
				title: 'Capacity listings',
				description,
				rows: listings.map((listing) => ({
					product: listing.productId,
					status: label(listing.status),
					runtime: label(listing.runtimeIsolationLevel),
					data: label(listing.dataAccessLevel),
					secrets: label(listing.secretAccessLevel),
				})),
				columns: [
					{ key: 'product', label: 'Product' },
					{ key: 'status', label: 'Status' },
					{ key: 'runtime', label: 'Runtime' },
					{ key: 'data', label: 'Data' },
					{ key: 'secrets', label: 'Secrets' },
				],
				resources,
				emptyTitle: result.ok ? 'No public capacity listings yet' : 'Capacity listings unavailable',
				emptyDescription: result.ok ? 'Listings appear after seller trust review and market approval.' : result.error,
			},
		},
	};
}

export async function loadCapacityListingPage(Astro: AstroLike, listingId: string, error?: string): Promise<MarketPublicPage<{ listing: any | null; metadata: Array<{ key: string; value: string }>; error?: string }>> {
	const result = await marketApi<any>(Astro, `/v1/commerce/capacity-listings/${encodeURIComponent(listingId)}`);
	const listing = result.ok ? result.payload : null;
	const title = firstText(listing?.title, listing?.productTitle, listing?.productId, 'Capacity listing') ?? 'Capacity listing';
	const description = firstText(listing?.buyerVisibleRiskSummary, listing?.dataHandlingSummary, result.ok ? 'Review buyer-visible capacity metadata.' : result.error) ?? 'Review buyer-visible capacity metadata.';
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.capacity-detail', resourceType: 'capacity-listing', routePattern: '/capacity/:listingId', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.capacity-detail', resourceType: 'capacity-listing', routePattern: '/capacity/:listingId', title, resourceId: listingId }),
		actions: [
			{ id: 'capacity.back', label: 'All capacity', state: 'allowed', href: '/capacity' },
			allowedOrSignIn(Astro, { id: 'capacity.inquire', label: 'Submit inquiry' }),
		],
		data: {
			listing,
			error: error ?? (result.ok ? undefined : result.error),
			metadata: [
				{ key: 'Status', value: label(listing?.status, 'review') },
				{ key: 'Access', value: label(listing?.accessLevel) },
				{ key: 'Runtime isolation', value: label(listing?.runtimeIsolationLevel) },
				{ key: 'AI involvement', value: label(listing?.aiInvolvementLevel) },
				{ key: 'Human involvement', value: label(listing?.humanInvolvementLevel) },
				{ key: 'Data access', value: label(listing?.dataAccessLevel) },
				{ key: 'Secret access', value: label(listing?.secretAccessLevel) },
			],
		},
	};
}

function parseLooseJson(value: FormDataEntryValue | null): Record<string, unknown> {
	const text = String(value ?? '').trim();
	if (!text) return {};
	try {
		const parsed = JSON.parse(text) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed };
	} catch {
		return { summary: text };
	}
}

export async function submitCapacityInquiry(Astro: AstroLike, listingId: string, formData: FormData): Promise<ApiResult<any>> {
	return marketApi(Astro, `/v1/commerce/capacity-listings/${encodeURIComponent(listingId)}/inquiries`, {
		method: 'POST',
		body: JSON.stringify({
			requestedServiceType: String(formData.get('requestedServiceType') ?? '').trim() || null,
			requestedScope: String(formData.get('requestedScope') ?? '').trim(),
			dataAccessRequested: parseLooseJson(formData.get('dataAccessRequested')),
			secretAccessRequested: parseLooseJson(formData.get('secretAccessRequested')),
			relatedProjectId: String(formData.get('relatedProjectId') ?? '').trim() || null,
			relatedWorkdayId: String(formData.get('relatedWorkdayId') ?? '').trim() || null,
		}),
	});
}

export function loadServiceRequestFormPage(Astro: AstroLike, error?: string): MarketPublicPage<{ offerId: string; error?: string }> {
	const title = 'Request service scope';
	return {
		title,
		description: 'Start a governed scoped service request.',
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.service-request', resourceType: 'service-request', routePattern: '/services/new', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.service-request', resourceType: 'service-request', routePattern: '/services/new', title }),
		actions: [
			{ id: 'service.marketplace', label: 'Marketplace', state: 'allowed', href: '/marketplace' },
			allowedOrSignIn(Astro, { id: 'service.submit', label: 'Create request' }),
		],
		data: { offerId: Astro.url.searchParams.get('offerId') ?? '', error },
	};
}

export async function submitServiceRequest(Astro: AstroLike, formData: FormData): Promise<ApiResult<any>> {
	return marketApi(Astro, '/v1/commerce/services/requests', {
		method: 'POST',
		body: JSON.stringify({
			offerId: String(formData.get('offerId') ?? '').trim(),
			requestedScope: String(formData.get('requestedScope') ?? '').trim(),
			accessNeeds: parseLooseJson(formData.get('accessNeeds')),
			relatedProjectId: String(formData.get('relatedProjectId') ?? '').trim() || null,
			relatedWorkdayId: String(formData.get('relatedWorkdayId') ?? '').trim() || null,
		}),
	});
}

export async function loadServiceRequestPage(Astro: AstroLike, requestId: string, error?: string): Promise<MarketPublicPage<{ request: any | null; quotes: any[]; contract: any | null; events: any[]; metadata: Array<{ key: string; value: string }>; error?: string }>> {
	const result = await marketApi<any>(Astro, `/v1/commerce/services/requests/${encodeURIComponent(requestId)}`);
	const payload = result.ok ? result.payload : null;
	const request = payload?.request ?? payload ?? null;
	const title = 'Service request';
	const description = firstText(request?.buyerVisibleSummary, request?.requestedScope, result.ok ? 'Review scoped service quotes and contract state.' : result.error) ?? 'Review scoped service quotes and contract state.';
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.service-detail', resourceType: 'service-request', routePattern: '/services/:requestId', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.service-detail', resourceType: 'service-request', routePattern: '/services/:requestId', title, resourceId: requestId }),
		actions: [
			{ id: 'service.refresh', label: 'Refresh', state: 'allowed', href: Astro.url.pathname },
			...(request?.contractId ? [{ id: 'service.checkout', label: 'Contract checkout', state: 'allowed' as const, href: `/services/${encodeURIComponent(requestId)}/checkout` }] : []),
		],
		data: {
			request,
			quotes: payload?.quotes ?? [],
			contract: payload?.contract ?? null,
			events: payload?.events ?? [],
			error: error ?? (result.ok ? undefined : result.error),
			metadata: [
				{ key: 'Status', value: label(request?.status, 'requested') },
				{ key: 'Product', value: label(request?.productId, 'not linked') },
				{ key: 'Contract', value: label(request?.contractId, 'not ready') },
				{ key: 'Quotes', value: String(payload?.quotes?.length ?? 0) },
			],
		},
	};
}

export async function submitServiceQuoteDecision(Astro: AstroLike, formData: FormData): Promise<ApiResult<any>> {
	const quoteId = String(formData.get('quoteId') ?? '').trim();
	const decision = String(formData.get('decision') ?? '').trim();
	const suffix = decision === 'reject' ? 'reject' : 'buyer-approve';
	return marketApi(Astro, `/v1/commerce/services/quotes/${encodeURIComponent(quoteId)}/${suffix}`, {
		method: 'POST',
		body: JSON.stringify({ reason: String(formData.get('reason') ?? '').trim() || null }),
	});
}

export async function loadServiceCheckoutPage(Astro: AstroLike, requestId: string, error?: string): Promise<MarketPublicPage<{ request: any | null; contract: any | null; groups: any[]; metadata: Array<{ key: string; value: string }>; error?: string }>> {
	const service = await loadServiceRequestPage(Astro, requestId, error);
	const title = 'Service checkout';
	return {
		...service,
		title,
		description: 'Confirm an accepted scoped service contract.',
		helpContext: routeHelp(Astro, { capabilityId: 'commerce.service-checkout', resourceType: 'service-contract', routePattern: '/services/:requestId/checkout', title, summary: routeSummary.commerce }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commerce.service-checkout', resourceType: 'service-contract', routePattern: '/services/:requestId/checkout', title, resourceId: requestId }),
		data: {
			request: service.data.request,
			contract: service.data.contract,
			groups: [],
			error: service.data.error,
			metadata: service.data.metadata,
		},
	};
}

export async function startServiceContractCheckout(Astro: AstroLike, contractId: string): Promise<ApiResult<any>> {
	return marketApi(Astro, `/v1/commerce/services/contracts/${encodeURIComponent(contractId)}/checkout`, {
		method: 'POST',
		body: '{}',
	});
}

export async function loadCommonsPage(Astro: AstroLike): Promise<MarketPublicPage<{ dashboard: DashboardViewModel; proposals: any[]; events: any[] }>> {
	const result = await marketApi<any>(Astro, '/v1/commons/summary');
	const summary = result.ok ? result.payload : {};
	const proposals = summary?.recentProposals ?? [];
	const events = summary?.recentEvents ?? [];
	const title = 'TreeSeed Commons';
	const description = 'Questions, proposals, voting signal, and bounded steward decisions.';
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commons.public', resourceType: 'commons-governance', routePattern: '/commons', title, summary: routeSummary.governance, context: 'public' }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commons.public', resourceType: 'commons-governance', routePattern: '/commons', title }),
		actions: [
			allowedOrSignIn(Astro, { id: 'commons.propose', label: 'Submit proposal', href: '/commons/proposals/new' }),
			allowedOrSignIn(Astro, { id: 'commons.question', label: 'Ask question', href: '/commons/questions/new' }),
		],
		data: {
			proposals,
			events,
			dashboard: {
				title,
				description,
				context: {
					id: 'commons-signal',
					title: 'Current participation',
					items: [
						metric('Participants', summary?.counts?.activeParticipants ?? 0),
						metric('Active proposals', summary?.counts?.activeProposals ?? 0),
						metric('Open questions', summary?.counts?.openQuestions ?? 0),
						metric('Accepted decisions', summary?.counts?.acceptedDecisions ?? 0),
					],
				},
				primaryResources: proposals.map((proposal: any) => ({
					id: String(proposal.id),
					title: String(proposal.title ?? proposal.id),
					description: firstText(proposal.summary, 'No summary supplied yet.'),
					href: `/commons/proposals/${encodeURIComponent(String(proposal.id))}`,
					status: label(proposal.status, 'draft'),
					meta: label(proposal.scope, 'treeseed commons'),
				})),
				activity: events.map((event: any) => ({
					id: String(event.id ?? `${event.eventType}-${event.createdAt}`),
					title: label(event.eventType, 'Governance event'),
					description: label(event.nextState, ''),
					timestamp: event.createdAt,
					tone: 'info',
				})),
				emptyTitle: result.ok ? 'Commons signal is just getting started' : 'Commons unavailable',
				emptyDescription: result.ok ? 'New questions, proposals, and decisions will appear here.' : result.error,
			},
		},
	};
}

export async function loadCommonsProposalPage(Astro: AstroLike, proposalId: string, error?: string): Promise<MarketPublicPage<{ proposal: any | null; metadata: Array<{ key: string; value: string }>; error?: string }>> {
	const result = await marketApi<any>(Astro, `/v1/commons/proposals/${encodeURIComponent(proposalId)}`);
	const proposal = result.ok ? result.payload : null;
	const title = proposal?.title ?? 'Commons proposal';
	const description = firstText(proposal?.summary, result.ok ? 'Review, back, and vote on a Commons proposal.' : result.error) ?? 'Review, back, and vote on a Commons proposal.';
	return {
		title,
		description,
		helpContext: routeHelp(Astro, { capabilityId: 'commons.proposal', resourceType: 'commons-proposal', routePattern: '/commons/proposals/:proposalId', title, summary: routeSummary.governance, context: 'public' }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commons.proposal', resourceType: 'commons-proposal', routePattern: '/commons/proposals/:proposalId', title, resourceId: proposalId }),
		actions: [
			{ id: 'proposal.commons', label: 'Commons', state: 'allowed', href: '/commons' },
			allowedOrSignIn(Astro, { id: 'proposal.back', label: 'Back proposal' }),
			allowedOrSignIn(Astro, { id: 'proposal.vote', label: 'Vote support' }),
		],
		data: {
			proposal,
			error: error ?? (result.ok ? undefined : result.error),
			metadata: [
				{ key: 'Status', value: label(proposal?.status, 'draft') },
				{ key: 'Scope', value: label(proposal?.scope, 'treeseed commons') },
				{ key: 'Backers', value: String(proposal?.backingCount ?? proposal?.backings?.length ?? 0) },
				{ key: 'Support weight', value: String(proposal?.voteSupportWeight ?? 0) },
				{ key: 'Object weight', value: String(proposal?.voteObjectWeight ?? 0) },
			],
		},
	};
}

export async function submitCommonsProposalAction(Astro: AstroLike, proposalId: string, formData: FormData): Promise<ApiResult<any>> {
	const action = String(formData.get('action') ?? '').trim();
	const endpoint = action === 'vote' ? 'vote' : 'back';
	const body = action === 'vote'
		? { vote: String(formData.get('vote') ?? 'support'), reason: String(formData.get('reason') ?? '').trim() || null }
		: { reason: String(formData.get('reason') ?? '').trim() || null };
	return marketApi(Astro, `/v1/commons/proposals/${encodeURIComponent(proposalId)}/${endpoint}`, {
		method: 'POST',
		body: JSON.stringify(body),
	});
}

export function loadCommonsProposalFormPage(Astro: AstroLike, error?: string): MarketPublicPage<{ error?: string }> {
	const title = 'Submit a Commons proposal';
	return {
		title,
		description: 'Turn a community need into governed advisory signal.',
		helpContext: routeHelp(Astro, { capabilityId: 'commons.proposal-create', resourceType: 'commons-proposal', routePattern: '/commons/proposals/new', title, summary: routeSummary.governance, context: 'public' }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commons.proposal-create', resourceType: 'commons-proposal', routePattern: '/commons/proposals/new', title }),
		actions: [{ id: 'proposal.commons', label: 'Commons', state: 'allowed', href: '/commons' }, allowedOrSignIn(Astro, { id: 'proposal.create', label: 'Create proposal' })],
		data: { error },
	};
}

export async function submitCommonsProposal(Astro: AstroLike, formData: FormData): Promise<ApiResult<any>> {
	return marketApi(Astro, '/v1/commons/proposals', {
		method: 'POST',
		body: JSON.stringify({
			title: String(formData.get('title') ?? '').trim(),
			summary: String(formData.get('summary') ?? '').trim(),
			body: String(formData.get('body') ?? '').trim(),
			scope: 'treeseed_commons',
			decisionType: 'advisory',
		}),
	});
}

export function loadCommonsQuestionFormPage(Astro: AstroLike, error?: string): MarketPublicPage<{ error?: string }> {
	const title = 'Ask a Commons question';
	return {
		title,
		description: 'Ask before proposing so the Commons can clarify needs, evidence, and objections.',
		helpContext: routeHelp(Astro, { capabilityId: 'commons.question-create', resourceType: 'commons-question', routePattern: '/commons/questions/new', title, summary: routeSummary.governance, context: 'public' }),
		feedbackContext: routeFeedback(Astro, { capabilityId: 'commons.question-create', resourceType: 'commons-question', routePattern: '/commons/questions/new', title }),
		actions: [{ id: 'question.commons', label: 'Commons', state: 'allowed', href: '/commons' }, allowedOrSignIn(Astro, { id: 'question.create', label: 'Submit question' })],
		data: { error },
	};
}

export async function submitCommonsQuestion(Astro: AstroLike, formData: FormData): Promise<ApiResult<any>> {
	return marketApi(Astro, '/v1/commons/questions', {
		method: 'POST',
		body: JSON.stringify({
			title: String(formData.get('title') ?? '').trim(),
			body: String(formData.get('body') ?? '').trim(),
		}),
	});
}
