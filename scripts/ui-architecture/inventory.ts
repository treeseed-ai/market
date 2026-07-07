import { existsSync, readFileSync, statSync } from 'node:fs';

export type PackageOwner = 'market' | 'admin' | 'core' | 'ui';
export type SurfaceContext = 'auth' | 'public' | 'personal' | 'team' | 'project' | 'market' | 'content' | 'system';
export type ShellName =
	| 'AuthShell'
	| 'PublicSingleColumnShell'
	| 'AuthenticatedAppShell'
	| 'OperationalMarketShell'
	| 'CoreContentLayout'
	| 'CoreReaderLayout'
	| 'Standalone';
export type TargetTemplate =
	| 'auth-form'
	| 'collection'
	| 'dashboard'
	| 'detail'
	| 'public-acquisition'
	| 'reader'
	| 'settings'
	| 'workspace'
	| 'wizard';
export type ImplementationStatus = 'active' | 'wrapped' | 'replaced' | 'deleted';
export type ArchitectureDebt = 'page-local-css' | 'inline-dynamic-style' | 'raw-color-fallback' | 'route-local-script';

export interface RouteInventoryEntry {
	owner: PackageOwner;
	routePattern: string;
	sourcePath: string;
	surfaceContext: SurfaceContext;
	currentShell: ShellName;
	targetShell: ShellName;
	targetTemplate: TargetTemplate;
	resourceType: string;
	policyNeeds: string[];
	dataSource: string;
	pageLocalComponents: string[];
	pageLocalCss: 'none' | 'present';
	reusableComponentsUsed: string[];
	maturityLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
	architectureComplexity: 'low' | 'medium' | 'high';
	userValue: 'low' | 'medium' | 'high';
	risk: 'low' | 'medium' | 'high';
	implementationStatus: ImplementationStatus;
	compatibilityWrapperPath: string | null;
	architectureNotes: string;
	requiredArchitectureChecks: string[];
	architectureStage: string;
	architectureProof: string | null;
	architectureDebt: ArchitectureDebt[];
}

export interface ComponentInventoryEntry {
	owner: PackageOwner;
	name: string;
	sourcePath: string;
	currentUse: string;
	targetPackage: '@treeseed/ui' | '@treeseed/admin' | '@treeseed/core' | '@treeseed/market';
	architectureTarget: string;
	maturityLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
	implementationStatus: ImplementationStatus;
	replacementBlocker: string;
	requiredArchitectureChecks: string[];
	architectureStage: string;
	architectureDebt: ArchitectureDebt[];
}

const adminProductRoutePaths = [
	'packages/admin/src/pages/app/account.astro',
	'packages/admin/src/pages/app/capacity/allocation.astro',
	'packages/admin/src/pages/app/capacity/allocation/projects/[projectId].astro',
	'packages/admin/src/pages/app/capacity/allocation/projects/[projectId]/agents/[agentSlug].astro',
	'packages/admin/src/pages/app/capacity/allocation/projects/[projectId]/modes/[modeId].astro',
	'packages/admin/src/pages/app/capacity/index.astro',
	'packages/admin/src/pages/app/capacity/providers/[providerId].astro',
	'packages/admin/src/pages/app/capacity/providers/[providerId]/keys.astro',
	'packages/admin/src/pages/app/capacity/providers/[providerId]/settings.astro',
	'packages/admin/src/pages/app/capacity/providers/index.astro',
	'packages/admin/src/pages/app/capacity/providers/new.astro',
	'packages/admin/src/pages/app/capacity/runtime.astro',
	'packages/admin/src/pages/app/capacity/workday-runs/[runId].astro',
	'packages/admin/src/pages/app/capacity/workday-runs/index.astro',
	'packages/admin/src/pages/app/commons/index.astro',
	'packages/admin/src/pages/app/commons/participants.astro',
	'packages/admin/src/pages/app/commons/proposals/[proposalId].astro',
	'packages/admin/src/pages/app/hosts/[hostType]/[hostId].astro',
	'packages/admin/src/pages/app/hosts/[hostType]/[hostId]/settings.astro',
	'packages/admin/src/pages/app/hosts/[hostType]/new.astro',
	'packages/admin/src/pages/app/hosts/index.astro',
	'packages/admin/src/pages/app/hosts/knowledge-library.astro',
	'packages/admin/src/pages/app/hosts/new.astro',
	'packages/admin/src/pages/app/index.astro',
	'packages/admin/src/pages/app/knowledge.astro',
	'packages/admin/src/pages/app/knowledge/[category]/[slug].astro',
	'packages/admin/src/pages/app/knowledge/artifacts.astro',
	'packages/admin/src/pages/app/knowledge/books.astro',
	'packages/admin/src/pages/app/knowledge/books/[slug].astro',
	'packages/admin/src/pages/app/knowledge/capabilities.astro',
	'packages/admin/src/pages/app/knowledge/capabilities/[slug].astro',
	'packages/admin/src/pages/app/knowledge/imports.astro',
	'packages/admin/src/pages/app/knowledge/imports/[slug].astro',
	'packages/admin/src/pages/app/knowledge/packs.astro',
	'packages/admin/src/pages/app/knowledge/publish.astro',
	'packages/admin/src/pages/app/knowledge/releases.astro',
	'packages/admin/src/pages/app/knowledge/releases/[releaseId].astro',
	'packages/admin/src/pages/app/knowledge/releases/[releaseId]/review.astro',
	'packages/admin/src/pages/app/knowledge/templates.astro',
	'packages/admin/src/pages/app/market/seller.astro',
	'packages/admin/src/pages/app/projects/[projectId].astro',
	'packages/admin/src/pages/app/projects/[projectId]/agents.astro',
	'packages/admin/src/pages/app/projects/[projectId]/agents/[agentSlug].astro',
	'packages/admin/src/pages/app/projects/[projectId]/agents/new.astro',
	'packages/admin/src/pages/app/projects/[projectId]/artifacts.astro',
	'packages/admin/src/pages/app/projects/[projectId]/decisions.astro',
	'packages/admin/src/pages/app/projects/[projectId]/delete.astro',
	'packages/admin/src/pages/app/projects/[projectId]/deploy.astro',
	'packages/admin/src/pages/app/projects/[projectId]/guidance.astro',
	'packages/admin/src/pages/app/projects/[projectId]/hosts.astro',
	'packages/admin/src/pages/app/projects/[projectId]/knowledge.astro',
	'packages/admin/src/pages/app/projects/[projectId]/knowledge/[...slug].astro',
	'packages/admin/src/pages/app/projects/[projectId]/settings.astro',
	'packages/admin/src/pages/app/projects/[projectId]/workdays.astro',
	'packages/admin/src/pages/app/projects/[projectId]/workdays/[workdayId].astro',
	'packages/admin/src/pages/app/projects/deployment/[id].astro',
	'packages/admin/src/pages/app/projects/index.astro',
	'packages/admin/src/pages/app/projects/new.astro',
	'packages/admin/src/pages/app/services.astro',
	'packages/admin/src/pages/app/teams/[teamId]/delete.astro',
	'packages/admin/src/pages/app/teams/[teamId]/edit.astro',
	'packages/admin/src/pages/app/teams/[teamId]/commerce.astro',
	'packages/admin/src/pages/app/teams/[teamId]/commerce/capacity.astro',
	'packages/admin/src/pages/app/teams/[teamId]/commerce/capacity/[listingId].astro',
	'packages/admin/src/pages/app/teams/[teamId]/commerce/products.astro',
	'packages/admin/src/pages/app/teams/[teamId]/commerce/products/[productId]/governance.astro',
	'packages/admin/src/pages/app/teams/[teamId]/commerce/sales.astro',
	'packages/admin/src/pages/app/teams/[teamId]/commerce/services.astro',
	'packages/admin/src/pages/app/teams/[teamId]/commerce/services/[requestId].astro',
	'packages/admin/src/pages/app/teams/[teamId]/members.astro',
	'packages/admin/src/pages/app/teams/index.astro',
	'packages/admin/src/pages/app/teams/new.astro',
	'packages/admin/src/pages/app/work.astro',
	'packages/admin/src/pages/app/work/decisions.astro',
	'packages/admin/src/pages/app/work/decisions/[slug].astro',
	'packages/admin/src/pages/app/work/decisions/[slug]/edit.astro',
	'packages/admin/src/pages/app/work/decisions/new.astro',
	'packages/admin/src/pages/app/work/notes.astro',
	'packages/admin/src/pages/app/work/notes/[slug].astro',
	'packages/admin/src/pages/app/work/notes/[slug]/edit.astro',
	'packages/admin/src/pages/app/work/notes/new.astro',
	'packages/admin/src/pages/app/work/objectives.astro',
	'packages/admin/src/pages/app/work/objectives/[slug].astro',
	'packages/admin/src/pages/app/work/objectives/[slug]/edit.astro',
	'packages/admin/src/pages/app/work/objectives/new.astro',
	'packages/admin/src/pages/app/work/proposals.astro',
	'packages/admin/src/pages/app/work/proposals/[slug].astro',
	'packages/admin/src/pages/app/work/proposals/[slug]/edit.astro',
	'packages/admin/src/pages/app/work/proposals/new.astro',
	'packages/admin/src/pages/app/work/questions/[slug]/edit.astro',
	'packages/admin/src/pages/app/work/questions/[slug].astro',
	'packages/admin/src/pages/app/work/questions/new.astro',
	'packages/admin/src/pages/app/work/questions.astro',
	'packages/admin/src/pages/app/work/review.astro',
] as const;

const adminAuthRoutePaths = [
	'packages/admin/src/pages/auth/check-email.astro',
	'packages/admin/src/pages/auth/confirm-email.astro',
	'packages/admin/src/pages/auth/device/approve.astro',
	'packages/admin/src/pages/auth/forgot-password.astro',
	'packages/admin/src/pages/auth/register.astro',
	'packages/admin/src/pages/auth/reset-password.astro',
	'packages/admin/src/pages/auth/sign-in.astro',
	'packages/admin/src/pages/auth/username.astro',
] as const;

const adminPublicRoutePaths = [
	'packages/admin/src/pages/market/index.astro',
	'packages/admin/src/pages/market/knowledge-packs/[slug].astro',
	'packages/admin/src/pages/market/knowledge-packs/index.astro',
	'packages/admin/src/pages/market/templates/[slug].astro',
	'packages/admin/src/pages/market/templates/index.astro',
	'packages/admin/src/pages/p/[project].astro',
	'packages/admin/src/pages/t/[name].astro',
	'packages/admin/src/pages/team-invites/[token]/accept.astro',
	'packages/admin/src/pages/u/[username].astro',
] as const;

const coreRoutePaths = [
	'packages/core/src/pages/404.astro',
	'packages/core/src/pages/[slug].astro',
	'packages/core/src/pages/agents/[slug].astro',
	'packages/core/src/pages/agents/index.astro',
	'packages/core/src/pages/books/[slug].astro',
	'packages/core/src/pages/books/index.astro',
	'packages/core/src/pages/contact.astro',
	'packages/core/src/pages/decisions/[slug].astro',
	'packages/core/src/pages/decisions/index.astro',
	'packages/core/src/pages/docs-runtime/[...slug].astro',
	'packages/core/src/pages/docs-runtime/index.astro',
	'packages/core/src/pages/index.astro',
	'packages/core/src/pages/notes/[slug].astro',
	'packages/core/src/pages/notes/index.astro',
	'packages/core/src/pages/objectives/[slug].astro',
	'packages/core/src/pages/objectives/index.astro',
	'packages/core/src/pages/people/[slug].astro',
	'packages/core/src/pages/people/index.astro',
	'packages/core/src/pages/proposals/[slug].astro',
	'packages/core/src/pages/proposals/index.astro',
	'packages/core/src/pages/questions/[slug].astro',
	'packages/core/src/pages/questions/index.astro',
	'packages/core/src/pages/ui/index.astro',
] as const;

const marketRoutePaths = [
	'src/pages/capacity/[listingId].astro',
	'src/pages/capacity/index.astro',
	'src/pages/cart.astro',
	'src/pages/checkout/[checkoutId].astro',
	'src/pages/commons/index.astro',
	'src/pages/commons/proposals/[proposalId].astro',
	'src/pages/commons/proposals/new.astro',
	'src/pages/commons/questions/new.astro',
	'src/pages/index.astro',
	'src/pages/market/products/[productId].astro',
	'src/pages/marketplace/index.astro',
	'src/pages/services/[requestId].astro',
	'src/pages/services/[requestId]/checkout.astro',
	'src/pages/services/new.astro',
] as const;

function readSource(path: string): string {
	return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function routePatternFromPath(sourcePath: string): string {
	const pagesIndex = sourcePath.indexOf('/pages/');
	const rootRelative = pagesIndex >= 0 ? sourcePath.slice(pagesIndex + '/pages/'.length) : sourcePath.replace(/^src\/pages\//u, '');
	const withoutExtension = rootRelative.replace(/\.astro$/u, '');
	const withoutIndex = withoutExtension === 'index' ? '' : withoutExtension.replace(/\/index$/u, '');
	const normalized = withoutIndex
		.replace(/\[\.\.\.([^\]]+)\]/gu, ':$1*')
		.replace(/\[([^\]]+)\]/gu, ':$1');
	return `/${normalized}`.replace(/\/$/u, '') || '/';
}

function detectReusableComponents(sourcePath: string): string[] {
	const source = readSource(sourcePath);
	const matches = [...source.matchAll(/@treeseed\/ui\/components\/astro\/([^'"]+)/gu)].map((match) => match[1]);
	return [...new Set(matches)].sort();
}

function detectPageLocalComponents(sourcePath: string): string[] {
	const source = readSource(sourcePath);
	const matches = [...source.matchAll(/import\s+[^;]+from\s+['"](\.{1,2}\/[^'"]+\.astro)['"]/gu)].map((match) => match[1]);
	return [...new Set(matches)].sort();
}

function detectDebt(sourcePath: string): ArchitectureDebt[] {
	const source = readSource(sourcePath);
	const debt = new Set<ArchitectureDebt>();
	if (/<style(?:\s|>)/u.test(source)) debt.add('page-local-css');
	if (/\sstyle=/u.test(source)) debt.add('inline-dynamic-style');
	if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/u.test(source)) debt.add('raw-color-fallback');
	if (/<script(?:\s|>)/u.test(source)) debt.add('route-local-script');
	return [...debt].sort();
}

function route(sourcePath: string, overrides: Partial<RouteInventoryEntry> = {}): RouteInventoryEntry {
	const routePattern = routePatternFromPath(sourcePath);
	const debt = detectDebt(sourcePath);
	const isAuth = routePattern.startsWith('/auth') || routePattern.startsWith('/team-invites');
	const isProduct = routePattern === '/app' || routePattern.startsWith('/app/');
	const isMarket = routePattern === '/market' || routePattern.startsWith('/market/') || routePattern.startsWith('/templates/');
	const isCore = sourcePath.startsWith('packages/core/');
	const isReader = routePattern.startsWith('/docs-runtime') || routePattern.startsWith('/books');
	const isDetail = /\/:[^/]+(?:\*?)$/u.test(routePattern) || routePattern.includes('/:');
	const isNewOrEdit = routePattern.endsWith('/new') || routePattern.endsWith('/edit');
	const isSettings = routePattern.endsWith('/settings') || routePattern.endsWith('/account');
	const defaultTargetTemplate: TargetTemplate = isAuth
		? 'auth-form'
		: isReader
			? 'reader'
			: isNewOrEdit
				? 'wizard'
				: isSettings
					? 'settings'
					: isProduct && (routePattern === '/app' || /\/:[^/]+$/u.test(routePattern))
						? 'dashboard'
						: isDetail
							? 'detail'
							: isMarket
								? 'public-acquisition'
								: routePattern === '/'
									? 'dashboard'
									: 'collection';
	const defaultSurface: SurfaceContext = isAuth
		? 'auth'
		: isProduct
			? routePattern.includes('/teams')
				? 'team'
				: routePattern.includes('/projects')
					? 'project'
					: routePattern === '/app' || routePattern === '/app/account'
						? 'personal'
						: 'project'
			: isMarket
				? 'market'
				: isCore
					? 'content'
					: 'public';
	const defaultTargetShell: ShellName = isAuth ? 'AuthShell' : isProduct ? 'AuthenticatedAppShell' : 'PublicSingleColumnShell';
	const defaultCurrentShell: ShellName = isAuth
		? 'AuthShell'
		: isProduct
			? 'AuthenticatedAppShell'
			: isCore
				? isReader
					? 'CoreReaderLayout'
					: 'CoreContentLayout'
				: 'PublicSingleColumnShell';
	const defaultDataSource = isProduct
		? 'Market API, admin view models, and local seed store'
		: isCore
			? 'local_collections today; target runtime content source by phase'
			: isMarket
				? 'market catalog projection and public route data'
				: 'tenant content and public route data';
	return {
		owner: sourcePath.startsWith('src/') ? 'market' : sourcePath.startsWith('packages/admin/') ? 'admin' : 'core',
		routePattern,
		sourcePath,
		surfaceContext: defaultSurface,
		currentShell: defaultCurrentShell,
		targetShell: defaultTargetShell,
		targetTemplate: defaultTargetTemplate,
		resourceType: inferResourceType(routePattern),
		policyNeeds: inferPolicyNeeds(routePattern, defaultSurface),
		dataSource: defaultDataSource,
		pageLocalComponents: detectPageLocalComponents(sourcePath),
		pageLocalCss: debt.includes('page-local-css') ? 'present' : 'none',
		reusableComponentsUsed: detectReusableComponents(sourcePath),
		maturityLevel: sourcePath.startsWith('packages/core/') ? 1 : defaultTargetShell === defaultCurrentShell ? 1 : 0,
		architectureComplexity: debt.length > 1 || routePattern.includes('/capacity/') ? 'high' : isProduct ? 'medium' : 'low',
		userValue: routePattern.includes('/questions') || routePattern.includes('/projects') || routePattern.includes('/docs-runtime') ? 'high' : 'medium',
		risk: isProduct || routePattern.includes('/auth') || routePattern.includes('/docs-runtime') ? 'medium' : 'low',
		implementationStatus: 'active',
		compatibilityWrapperPath: null,
		architectureNotes: 'Replacement vertical slice has not passed its required acceptance tests.',
		requiredArchitectureChecks: ['route renders', 'policy state coverage', 'accessibility smoke', 'UI architecture guard'],
		architectureStage: 'none while active; reassess when replacement reaches acceptance',
		architectureProof: null,
		architectureDebt: debt,
		...overrides,
	};
}

function inferResourceType(routePattern: string): string {
	if (routePattern.includes('/questions')) return 'question';
	if (routePattern.includes('/objectives')) return 'objective';
	if (routePattern.includes('/notes')) return 'note';
	if (routePattern.includes('/decisions')) return 'decision';
	if (routePattern.includes('/proposals')) return 'proposal';
	if (routePattern.includes('/workday')) return 'workday';
	if (routePattern.includes('/capacity/providers')) return 'capacity-provider';
	if (routePattern.includes('/capacity')) return 'allocation-capacity';
	if (routePattern.includes('/hosts')) return 'host';
	if (routePattern.includes('/teams')) return 'team';
	if (routePattern.includes('/projects/deployment')) return 'deployment';
	if (routePattern.includes('/projects')) return 'project';
	if (routePattern.includes('/knowledge-packs')) return 'knowledge-pack';
	if (routePattern.includes('/market/products')) return 'market-product';
	if (routePattern.includes('/marketplace')) return 'marketplace';
	if (routePattern.includes('/cart')) return 'cart';
	if (routePattern.includes('/checkout')) return 'checkout';
	if (routePattern.includes('/services')) return 'service-request';
	if (routePattern.includes('/commons')) return 'commons-governance';
	if (routePattern.includes('/templates')) return 'template';
	if (routePattern.includes('/knowledge')) return 'knowledge-artifact';
	if (routePattern.includes('/books') || routePattern.includes('/docs-runtime')) return 'book-page';
	if (routePattern.includes('/agents')) return 'agent';
	if (routePattern.includes('/people') || routePattern.startsWith('/u/') || routePattern.startsWith('/t/') || routePattern.startsWith('/p/')) return 'profile';
	if (routePattern.includes('/auth')) return 'auth-session';
	return 'page';
}

function inferPolicyNeeds(routePattern: string, surfaceContext: SurfaceContext): string[] {
	if (surfaceContext === 'auth') return ['anonymous-safe auth flow', 'safe return URL'];
	if (surfaceContext === 'market') return ['public read', 'entitlement-aware action resolution'];
	if (surfaceContext === 'content') return ['public/private content visibility', 'runtime source gate'];
	if (routePattern.includes('/capacity') || routePattern.includes('/hosts')) return ['team membership', 'sensitive service details', 'resolved actions'];
	if (routePattern.includes('/projects')) return ['team membership', 'project membership', 'resolved actions'];
	if (routePattern.includes('/work')) return ['team membership', 'project work policy', 'resolved actions'];
	if (surfaceContext === 'personal') return ['signed-in principal'];
	return ['public read'];
}

export const routeInventory: RouteInventoryEntry[] = [
	...marketRoutePaths.map((sourcePath) => route(sourcePath, { architectureProof: 'public layout baseline' })),
	...adminAuthRoutePaths.map((sourcePath) => route(sourcePath)),
	...adminPublicRoutePaths.map((sourcePath) => route(sourcePath)),
	...adminProductRoutePaths.map((sourcePath) => route(sourcePath)),
	...coreRoutePaths.map((sourcePath) => route(sourcePath)),
].map((entry) => {
	if (
		entry.sourcePath.startsWith('src/pages/capacity/')
		|| entry.sourcePath === 'src/pages/cart.astro'
		|| entry.sourcePath.startsWith('src/pages/checkout/')
		|| entry.sourcePath.startsWith('src/pages/commons/')
		|| entry.sourcePath.startsWith('src/pages/market/products/')
		|| entry.sourcePath === 'src/pages/marketplace/index.astro'
		|| entry.sourcePath.startsWith('src/pages/services/')
		|| entry.sourcePath.startsWith('packages/admin/src/pages/app/commons/')
		|| entry.sourcePath.includes('/commerce')
	) {
		const isAdmin = entry.sourcePath.startsWith('packages/admin/');
		const isDetail = entry.routePattern.includes('/:');
		const isForm = entry.routePattern.endsWith('/new') || entry.routePattern.endsWith('/checkout') || entry.routePattern.endsWith('/governance');
		return {
			...entry,
			currentShell: isAdmin ? 'AuthenticatedAppShell' : 'OperationalMarketShell',
			targetShell: isAdmin ? 'AuthenticatedAppShell' : 'OperationalMarketShell',
			targetTemplate: isForm
				? 'settings'
				: isDetail
					? 'detail'
					: entry.routePattern === '/cart' || entry.routePattern === '/marketplace' || entry.routePattern.endsWith('/commerce')
						? 'dashboard'
						: 'collection',
			surfaceContext: isAdmin ? 'team' : 'market',
			maturityLevel: 10,
			architectureComplexity: 'medium',
			userValue: 'high',
			risk: entry.routePattern.includes('/checkout') || entry.sourcePath.includes('/commerce') ? 'high' : 'medium',
			architectureProof: 'Marketplace acquisition, seller operations, and Commons governance proof',
			architectureNotes: 'knowledge distribution route is current active marketplace/Commons implementation; replacement must preserve public/private policy, entitlement or governance state, shell help/feedback, and no compatibility redirects.',
			requiredArchitectureChecks: ['UI architecture guard', 'commerce/Commons route guards', 'marketplace action-state tests', 'policy-safe rendering tests'],
			architectureStage: 'none while active; reassess after commerce capability registry reaches acceptance',
			dataSource: isAdmin
				? 'Market API commerce and Commons governance projections mapped through admin route view models'
				: 'authenticated marketplace, checkout, service, capacity, and Commons projections from Market API facades',
			policyNeeds: isAdmin
				? ['team membership', 'seller/governance authority', 'resolved commerce actions', 'shell help/feedback policy']
				: ['signed-in principal', 'team operation context', 'entitlement/governance-aware action resolution', 'shell help/feedback policy'],
		};
	}
	if (
		entry.sourcePath === 'packages/admin/src/pages/app/knowledge.astro'
		|| entry.sourcePath.startsWith('packages/admin/src/pages/app/knowledge/')
		|| entry.sourcePath === 'packages/admin/src/pages/app/market/seller.astro'
		|| entry.sourcePath.startsWith('packages/admin/src/pages/market/knowledge-packs/')
		|| entry.sourcePath.startsWith('packages/admin/src/pages/market/templates/')
	) {
		const isMarketRoute = entry.sourcePath.startsWith('packages/admin/src/pages/market/');
		const isDashboard = entry.routePattern === '/app/knowledge' || entry.routePattern === '/app/market/seller';
		const isSettings = entry.routePattern === '/app/knowledge/publish' || entry.routePattern.endsWith('/review');
		const isDetail = entry.routePattern.includes('/:');
		return {
			...entry,
			currentShell: isMarketRoute ? 'OperationalMarketShell' : 'AuthenticatedAppShell',
			targetShell: isMarketRoute ? 'OperationalMarketShell' : 'AuthenticatedAppShell',
			targetTemplate: isMarketRoute
				? isDetail
					? 'public-acquisition'
					: 'collection'
				: isDashboard
					? 'dashboard'
					: isSettings
						? 'settings'
						: isDetail
							? 'detail'
							: 'collection',
			surfaceContext: isMarketRoute || entry.routePattern === '/app/market/seller' ? 'market' : 'team',
			maturityLevel: 10,
			architectureComplexity: 'low',
			architectureProof: 'Knowledge and capability distribution proof',
			architectureNotes: 'knowledge distribution route is current active distribution implementation; replacement must preserve entitlement resolution, delivery policy, shell help/feedback, overlay gating, audit/action state, and no compatibility redirects.',
			requiredArchitectureChecks: ['UI architecture guard', 'knowledge distribution route/source guards', 'distribution view-model tests', 'UI distribution component tests', 'entitlement/action resolution coverage'],
			architectureStage: 'none while active; reassess after distribution capability registry reaches acceptance',
			dataSource: isMarketRoute
				? 'authenticated marketplace catalog projections mapped through acquisition view models'
				: 'Market API/store knowledge projections and admin distribution view models',
			policyNeeds: isMarketRoute
				? ['signed-in principal', 'team operation context', 'entitlement-aware action resolution', 'policy-resolved delivery']
				: ['team membership', 'distribution action resolution', 'entitlement-aware delivery', 'shell help/feedback policy', 'overlay bootstrap policy'],
			resourceType: isMarketRoute
				? entry.routePattern.includes('templates') ? 'market-template' : 'market-knowledge-pack'
				: entry.routePattern === '/app/market/seller' ? 'seller'
					: entry.routePattern.includes('/books') ? 'book-page'
						: entry.routePattern.includes('/capabilities') ? 'capability'
							: entry.routePattern.includes('/imports') ? 'knowledge-import'
								: entry.routePattern.includes('/releases') ? 'release'
									: entry.routePattern.includes('/templates') ? 'template'
										: entry.routePattern.includes('/packs') ? 'knowledge-pack'
											: 'knowledge-artifact',
			risk: isMarketRoute ? 'medium' : 'high',
		};
	}
	if (
		entry.sourcePath === 'packages/admin/src/pages/app/work.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/work/review.astro'
		|| /^packages\/admin\/src\/pages\/app\/work\/(objectives|notes|proposals|decisions)(\/|\.astro)/u.test(entry.sourcePath)
		|| entry.sourcePath === 'packages/admin/src/pages/app/capacity/allocation.astro'
		|| entry.sourcePath.startsWith('packages/admin/src/pages/app/capacity/allocation/projects/')
		|| entry.sourcePath === 'packages/admin/src/pages/app/capacity/workday-runs/index.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/capacity/workday-runs/[runId].astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId]/workdays.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId]/workdays/[workdayId].astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId]/agents.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId]/agents/[agentSlug].astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId]/agents/new.astro'
	) {
		const isAllocation = entry.routePattern.includes('/capacity/allocation');
		const isWorkday = entry.routePattern.includes('/workday');
		const isAgent = entry.routePattern.includes('/agents');
		const isReview = entry.routePattern === '/app/work/review';
		const isDashboard = entry.routePattern === '/app/work' || entry.routePattern === '/app/capacity/allocation';
		const isForm = entry.routePattern.endsWith('/new') || entry.routePattern.endsWith('/edit');
		return {
			...entry,
			currentShell: 'AuthenticatedAppShell',
			targetShell: 'AuthenticatedAppShell',
			targetTemplate: isDashboard
				? 'dashboard'
				: isReview
					? 'collection'
					: isForm
						? 'settings'
						: entry.routePattern.includes('/:') && !entry.routePattern.endsWith('/workdays')
							? isWorkday || isAgent
								? 'workspace'
								: 'detail'
							: 'collection',
			surfaceContext: isAgent || isWorkday ? 'project' : 'team',
			maturityLevel: 9,
			architectureComplexity: 'low',
			architectureProof: 'Allocation and workday operating loop proof',
			architectureNotes: 'operating-loop architecture route is current active operating-loop implementation; replacement must preserve explicit controller loading, resolved actions, shell help/feedback, allocation state, workday/review queues, and no provider scheduling/orchestration in Admin templates.',
			requiredArchitectureChecks: ['UI architecture guard', 'operating-loop route/source guards', 'operating-loop view-model tests', 'UI operating component tests'],
			architectureStage: 'none while active; reassess after operating-loop capability registry reaches acceptance',
			dataSource: isAllocation
				? 'Market API/store allocation and capacity summaries mapped through operating-loop view models'
				: isWorkday
					? 'Market API/store workday and execution summaries mapped through operating-loop view models'
					: isAgent
						? 'Market API/store agent summaries and local content mapped through operating-loop view models'
						: 'Market API/store governance, review queue, audit, and local direction content mapped through operating-loop view models',
			policyNeeds: ['team membership', isAgent || isWorkday ? 'project membership' : 'operating-loop access', 'resolved actions', 'shell help/feedback policy'],
			resourceType: isAllocation ? 'allocation' : isReview ? 'review-queue' : entry.resourceType,
			risk: isAllocation || isWorkday || isAgent ? 'medium' : 'low',
		};
	}
	if (entry.sourcePath === 'packages/admin/src/pages/app/work/questions.astro') {
		return {
			...entry,
			currentShell: 'AuthenticatedAppShell',
			targetShell: 'AuthenticatedAppShell',
			targetTemplate: 'collection',
			maturityLevel: 6,
			architectureComplexity: 'low',
			architectureProof: 'Direction resource collection and authenticated contextual help proof',
			architectureNotes: 'Knowledge runtime reader route is current active implementation for questions and authenticated contextual help; later generic factory work must prove equivalent route/help behavior before replacement.',
			requiredArchitectureChecks: ['UI architecture guard', 'questions vertical route coverage', 'foundation template typecheck', 'policy state coverage', 'contextual help source guard'],
			architectureStage: 'none while active; reassess after generic capability factory reaches acceptance',
		};
	}
	if (
		entry.sourcePath === 'packages/admin/src/pages/app/index.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/teams/index.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId].astro'
		|| entry.sourcePath === 'packages/admin/src/pages/market/index.astro'
	) {
		const isMarketDashboard = entry.sourcePath === 'packages/admin/src/pages/market/index.astro';
		const isProjectDashboard = entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId].astro';
		return {
			...entry,
			currentShell: isMarketDashboard ? 'OperationalMarketShell' : 'AuthenticatedAppShell',
			targetShell: isMarketDashboard ? 'OperationalMarketShell' : 'AuthenticatedAppShell',
			targetTemplate: 'dashboard',
			maturityLevel: isProjectDashboard ? 8 : 7,
			architectureComplexity: 'low',
			architectureProof: isMarketDashboard
				? 'contextual dashboard architecture market contextual dashboard proof'
				: isProjectDashboard
					? 'service readiness architecture project service readiness dashboard projection'
					: 'Personal/team contextual dashboard proof',
			architectureNotes: isProjectDashboard
				? 'service readiness architecture project dashboard consumes the services readiness summary; replacement must preserve the compact project service status, shell help/feedback, and advanced-detail links.'
				: 'contextual dashboard architecture dashboard route is current active implementation; broader dashboard reuse must prove equivalent context, actions, help, feedback, and no page-local dashboard systems before replacement.',
			requiredArchitectureChecks: isProjectDashboard
				? ['UI architecture guard', 'contextual dashboard source guard', 'services readiness view-model tests', 'DashboardTemplate coverage', 'shell help/feedback coverage']
				: ['UI architecture guard', 'contextual dashboard source guard', 'DashboardTemplate coverage', 'shell help/feedback coverage'],
			architectureStage: 'none while active; reassess after contextual dashboard registry or factory reaches acceptance',
			dataSource: isMarketDashboard
				? 'market catalog projection and public route data mapped through contextual dashboard view model'
				: 'Market API, admin view models, and local seed store mapped through contextual dashboard view model',
			policyNeeds: isMarketDashboard
				? ['public read', 'entitlement-aware action resolution', 'anonymous-safe feedback']
				: isProjectDashboard
					? ['team membership', 'project membership', 'service readiness projection', 'resolved dashboard actions', 'shell help/feedback policy']
					: ['signed-in principal', 'team context', 'resolved dashboard actions', 'shell help/feedback policy'],
		};
	}
	if (entry.sourcePath === 'packages/admin/src/pages/app/projects/new.astro') {
		return {
			...entry,
			currentShell: 'AuthenticatedAppShell',
			targetShell: 'AuthenticatedAppShell',
			targetTemplate: 'wizard',
			maturityLevel: 8,
			architectureComplexity: 'medium',
			architectureProof: 'Project launch service readiness proof',
			architectureNotes: 'service readiness architecture launch route is current active project creation implementation; replacement must preserve service readiness projection, template launch requirements, credential safeguards, and sensitive value handling.',
			requiredArchitectureChecks: ['UI architecture guard', 'project launch source guard', 'services readiness view-model tests', 'credential form tests'],
			architectureStage: 'none while active; reassess after launch capability registry reaches acceptance',
			dataSource: 'Market API/store service readiness and template launch requirement view models',
			policyNeeds: ['team membership', 'service readiness projection', 'credential handling safeguards', 'shell help/feedback policy'],
			resourceType: 'project',
			risk: 'high',
		};
	}
	if (
		entry.sourcePath === 'packages/admin/src/pages/app/services.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/hosts/index.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/hosts/[hostType]/[hostId].astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/hosts/[hostType]/[hostId]/settings.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/capacity/providers/index.astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/capacity/providers/[providerId].astro'
		|| entry.sourcePath === 'packages/admin/src/pages/app/capacity/providers/[providerId]/settings.astro'
	) {
		const isDashboard = entry.sourcePath === 'packages/admin/src/pages/app/services.astro';
		const isCollection = entry.sourcePath.endsWith('/index.astro') && !isDashboard;
		const isSettings = entry.sourcePath.endsWith('/settings.astro');
		return {
			...entry,
			currentShell: 'AuthenticatedAppShell',
			targetShell: 'AuthenticatedAppShell',
			targetTemplate: isDashboard ? 'dashboard' : isCollection ? 'collection' : isSettings ? 'settings' : 'detail',
			surfaceContext: 'team',
			maturityLevel: 8,
			architectureComplexity: 'low',
			architectureProof: 'Services and capacity readiness proof',
			architectureNotes: 'service readiness architecture route is current active service readiness implementation; replacement must preserve shell help/feedback, readiness summaries, sensitive filtering, and no scheduler/provider orchestration logic.',
			requiredArchitectureChecks: ['UI architecture guard', 'services readiness route coverage', 'service readiness view-model tests', 'sensitive details source guard'],
			architectureStage: 'none while active; reassess after services capability registry reaches acceptance',
			dataSource: 'Market API/store service readiness view models over hosts, capacity providers, TreeDX binding, diagnostics, and project readiness',
			policyNeeds: ['team membership', 'service-sensitive details filtering', 'resolved actions', 'shell help/feedback policy'],
			resourceType: isDashboard ? 'service-readiness' : entry.resourceType,
			risk: 'medium',
		};
	}
	if (entry.sourcePath === 'packages/admin/src/pages/app/work/questions/[slug].astro') {
		return {
			...entry,
			currentShell: 'AuthenticatedAppShell',
			targetShell: 'AuthenticatedAppShell',
			targetTemplate: 'detail',
			maturityLevel: 6,
			architectureComplexity: 'low',
			architectureProof: 'Direction resource detail/form and authenticated contextual help proof',
			requiredArchitectureChecks: ['UI architecture guard', 'questions detail route coverage', 'policy state coverage', 'contextual help source guard'],
			architectureStage: 'none while active; reassess after generic capability factory reaches acceptance',
		};
	}
	if (entry.sourcePath === 'packages/admin/src/pages/app/work/questions/new.astro' || entry.sourcePath === 'packages/admin/src/pages/app/work/questions/[slug]/edit.astro') {
		return {
			...entry,
			currentShell: 'AuthenticatedAppShell',
			targetShell: 'AuthenticatedAppShell',
			targetTemplate: 'settings',
			maturityLevel: 6,
			architectureComplexity: 'low',
			architectureProof: 'Direction resource detail/form and authenticated contextual help proof',
			requiredArchitectureChecks: ['UI architecture guard', 'questions form route coverage', 'policy state coverage', 'local-content operation smoke', 'contextual help source guard'],
			architectureStage: 'none while active; reassess after generic capability factory reaches acceptance',
		};
	}
	if (entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId]/guidance.astro') {
		return { ...entry, architectureProof: 'Project-scoped direction companion proof' };
	}
	if (entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId]/knowledge.astro' || entry.sourcePath === 'packages/admin/src/pages/app/projects/[projectId]/knowledge/[...slug].astro') {
		return {
			...entry,
			currentShell: 'AuthenticatedAppShell',
			targetShell: 'AuthenticatedAppShell',
			targetTemplate: 'reader',
			maturityLevel: 5,
			architectureComplexity: 'low',
			architectureProof: 'Private Knowledge Hub reader proof',
			architectureNotes: 'Private Knowledge Hub reader route is current active implementation for private project knowledge reading; private packs, artifacts, help, and signed downloads require separate acceptance before reuse.',
			requiredArchitectureChecks: ['UI architecture guard', 'private reader helper tests', 'private access/audit tests', 'private cache/no-key-leak source guard'],
			architectureStage: 'none while active; reassess after private content proxy generalization acceptance',
			dataSource: 'Market API project access contract plus private project R2 manifest',
			policyNeeds: ['Market session validation', 'team/project membership', 'private content no-leak policy', 'audit event'],
			risk: 'high',
		};
	}
	if (entry.sourcePath.startsWith('packages/core/src/pages/docs-runtime/')) {
		return {
			...entry,
			currentShell: 'PublicSingleColumnShell',
			targetShell: 'PublicSingleColumnShell',
			targetTemplate: 'reader',
			maturityLevel: 6,
			architectureComplexity: 'low',
			architectureProof: 'Public runtime reader and public contextual help proof',
			architectureNotes: 'Knowledge runtime reader route is current active implementation for /knowledge runtime reader and public help; broader content-route architecture consolidation must prove cache, purge, failure-state, and help behavior first.',
			requiredArchitectureChecks: ['UI architecture guard', 'runtime reader helper tests', 'published runtime no-local-fallback test', 'ReaderTemplate source guard', 'contextual help source guard'],
			architectureStage: 'none while active; reassess after public runtime reader generalization acceptance',
		};
	}
	return entry;
});

export const componentInventory: ComponentInventoryEntry[] = [
	component('ui', 'Auth primitives', 'packages/ui/src/astro/auth', 'Auth forms and session pages', 'canonical reusable auth shell and cards', 2),
	component('ui', 'Shell primitives', 'packages/ui/src/astro/shell', 'Authenticated app, operational market, and compatibility shell primitives', 'canonical current shell primitives with deprecated compatibility wrappers', 2),
	component('ui', 'UI foundation contracts', 'packages/ui/src/lib/foundation/contracts.ts', 'Shell, template, action, help, feedback, capability, and page view-model contracts', 'canonical typed foundation contract', 6),
	component('ui', 'UI foundation templates', 'packages/ui/src/astro/templates', 'Collection/detail/reader/settings template components', 'canonical reusable templates', 2),
	component('ui', 'Dashboard template', 'packages/ui/src/astro/templates/DashboardTemplate.astro', 'Contextual dashboard rendering for personal, team, project, and market surfaces', 'canonical DashboardTemplate proof', 7),
	component('ui', 'Service readiness summary', 'packages/ui/src/astro/service/ReadinessSummary.astro', 'Service readiness summary rendering for dashboards and detail pages', 'canonical service readiness primitive', 8),
	component('ui', 'Operating-loop components', 'packages/ui/src/astro/operating', 'Allocation, queue, legend, and timeline rendering', 'canonical operating-loop primitives', 9),
	component('ui', 'Workspace template', 'packages/ui/src/astro/templates/WorkspaceTemplate.astro', 'Workday and agent workspace rendering', 'canonical operating workspace template', 9),
	component('ui', 'Distribution components', 'packages/ui/src/astro/distribution', 'Distribution summary and overlay status rendering', 'canonical distribution and overlay display primitives', 10),
	component('ui', 'Distribution overlay loader', 'packages/ui/src/lib/distribution/overlay-loader.ts', 'Lazy overlay editor bootstrap after explicit authorized intent', 'canonical lazy overlay bootstrap helper', 10),
	component('ui', 'UI foundation action and resource components', 'packages/ui/src/astro/layout/ActionBar.astro', 'Resolved action rendering for shells and templates', 'canonical action rendering primitive', 2),
	component('ui', 'UI foundation resource cards', 'packages/ui/src/astro/surface/ResourceCard.astro', 'Compact resource summaries for collection templates', 'canonical resource summary primitive', 2),
	component('ui', 'UI foundation permission boundary', 'packages/ui/src/astro/patterns/PermissionBoundary.astro', 'Allowed/read-only/denied/setup-required permission displays', 'canonical permission boundary primitive', 2),
	component('ui', 'Shell feedback components', 'packages/ui/src/astro/feedback', 'Shell-level feedback triggers, dialog, and redaction boundary', 'canonical feedback trigger/dialog foundation', 5),
	component('ui', 'Shell feedback client controller', 'packages/ui/src/lib/feedback/dialog.ts', 'Feedback payload assembly and submit behavior', 'canonical lazy feedback client controller', 5),
	component('ui', 'Feedback DOM capture helper', 'packages/ui/src/lib/feedback/dom-capture.ts', 'Opt-in redacted DOM screenshot proof', 'lazy screenshot helper until broader capture workflow is proven', 5),
	component('ui', 'Shell contextual help components', 'packages/ui/src/astro/help', 'Shell-level help trigger, drawer, panel, topic links, and action explanations', 'canonical contextual help foundation', 6),
	component('ui', 'Shell contextual help client controller', 'packages/ui/src/lib/help/drawer.ts', 'Help drawer behavior and lazy search loading', 'canonical lazy contextual help controller', 6),
	component('ui', 'Contextual help search helper', 'packages/ui/src/lib/help/search.ts', 'Scoped client search over policy-safe help context', 'lazy scoped search helper until broader help search is proven', 6),
	component('ui', 'Form primitives', 'packages/ui/src/astro/forms', 'Auth, project, host, and work forms', 'canonical form controls', 2),
	component('ui', 'Data primitives', 'packages/ui/src/astro/data', 'Metrics, status, key/value, tables, and actions', 'canonical data display components', 2),
	component('ui', 'Surface primitives', 'packages/ui/src/astro/surface', 'Panels, cards, and empty states', 'canonical surface components', 2),
	component('ui', 'App controls', 'packages/ui/src/astro/app/controls', 'Route-local admin controls already promoted to UI', 'candidate PageHeader/ActionBar/resource controls', 2),
	component('ui', 'Operations panels', 'packages/ui/src/astro/app/operations', 'Deployment, governance, repository, and capacity panels', 'future deployment/workday templates', 2),
	component('ui', 'Docs reader components', 'packages/ui/src/astro/docs', 'Current book/docs reader UI', 'ReaderTemplate ingredients', 1, ['page-local-css']),
	component('ui', 'Core bridge components', 'packages/ui/src/astro/core', 'Core site title and dev bridge helpers', 'Core-safe reusable bridge primitives', 1, ['page-local-css']),
	component('ui', 'Site content components', 'packages/ui/src/astro/site', 'Core public content pages', 'public layout and content collection/detail templates', 2),
	component('ui', 'Layout components', 'packages/ui/src/astro/layouts', 'Core content layout wrappers', 'Shells/templates architecture review', 1),
	component('ui', 'Market cards', 'packages/ui/src/astro/market', 'Marketplace listings and public acquisition routes', 'public acquisition template ingredients', 2),
	component('ui', 'Theme utilities', 'packages/ui/src/astro/theme', 'ThemeScript, ThemeSelector, and swatches', 'canonical YAML-backed theme system', 3, ['inline-dynamic-style']),
	component('ui', 'React form controls', 'packages/ui/src/react/form-controls', 'Reusable hydrated form fields', 'canonical React form primitives', 2),
	component('ui', 'React charts', 'packages/ui/src/react/charts', 'Monitoring and project activity charts', 'dashboard chart primitives', 1, ['inline-dynamic-style']),
	component('ui', 'Dynamic allocation input', 'packages/ui/src/react/pie-allocation', 'Capacity allocation panels', 'allocation input primitive', 2, ['inline-dynamic-style', 'raw-color-fallback']),
	component('ui', 'Dynamic allocation styles', 'packages/ui/src/styles/pie-allocation.css', 'Capacity allocation panels', 'allocation style primitive', 2, ['raw-color-fallback']),
	component('ui', 'Rich Markdown editor', 'packages/ui/src/react/editors', 'Work content and overlay editing candidates', 'overlay editing editor primitive', 2),
	component('admin', 'Admin app layout wrapper', 'packages/admin/src/layouts/TreeseedAppLayout.astro', 'TreeSeed-specific authenticated app shell composition', '@treeseed/ui shell configuration or thin wrapper', 1, ['route-local-script']),
	component('admin', 'Admin operational market layout wrapper', 'packages/admin/src/layouts/TreeseedOperationalMarketLayout.astro', 'TreeSeed-specific authenticated operational market shell composition', '@treeseed/ui shell configuration or thin wrapper', 1),
	component('admin', 'Admin public layout wrapper', 'packages/admin/src/layouts/TreeseedPublicLayout.astro', 'TreeSeed-specific public single-column shell composition', '@treeseed/ui shell configuration or thin wrapper', 1),
	component('admin', 'Question capability metadata', 'packages/admin/src/capabilities/questions.ts', 'Project questions capability, resource schema, actions, and filters', 'future admin capability registry entry', 5),
	component('admin', 'Question vertical form', 'packages/admin/src/components/work/QuestionForm.astro', 'Question create/edit form composition', 'future reusable direction-resource form pattern after repeated resources', 5),
	component('admin', 'Question help and feedback view model context', 'packages/admin/src/view-models/ui-foundation/questions.vm.ts', 'Auth authenticated app contextual help and feedback context for canonical question routes', 'route-local view-model context until help/feedback registry composition is proven', 6),
	component('admin', 'Contextual dashboard view models', 'packages/admin/src/view-models/contextual-dashboard.vm.ts', 'Personal, team, project, and market dashboard view models', 'route-local dashboard mappers until broader capability registry composition is proven', 7),
	component('admin', 'Service readiness view models', 'packages/admin/src/view-models/service-readiness.vm.ts', 'Services dashboard, host collection/detail, and capacity provider collection/detail view models', 'route-local service readiness mappers until broader capability registry composition is proven', 8),
	component('admin', 'Operating-loop view models', 'packages/admin/src/view-models/operating-loop.vm.ts', 'Work, allocation, workday, agent, and review queue view models', 'route-local operating-loop mappers until broader capability registry composition is proven', 9),
	component('admin', 'Operating-loop client helpers', 'packages/admin/src/lib/market/operating-loop-client.ts', 'Allocation, workday, agent, and direction form action binding', 'small route-scoped client helpers until broader action registry composition is proven', 9, ['route-local-script']),
	component('admin', 'Knowledge distribution view models', 'packages/admin/src/view-models/knowledge-distribution.vm.ts', 'App knowledge, marketplace acquisition, seller, release, import, and capability view models', 'route-local distribution mappers until broader capability registry composition is proven', 10),
	component('admin', 'Knowledge distribution client helper', 'packages/admin/src/lib/knowledge-distribution/publish-client.ts', 'Publish/package action binding through existing API operation routes', 'small route-scoped client helper until broader action registry composition is proven', 10, ['route-local-script']),
	component('admin', 'Route-local profile pages', 'packages/admin/src/pages/u/[username].astro', 'Public profile detail page with local styles', 'public single-column detail/profile template', 1, ['page-local-css']),
	component('admin', 'Route-local team profile pages', 'packages/admin/src/pages/t/[name].astro', 'Public team detail page with local styles', 'public single-column detail/profile template', 1, ['page-local-css']),
	component('admin', 'Route-local capacity runtime panel', 'packages/admin/src/pages/app/capacity/runtime.astro', 'Capacity diagnostics page-local panel CSS', 'service readiness template', 1, ['page-local-css', 'raw-color-fallback']),
	component('core', 'Core runtime reader routes', 'packages/core/src/pages/docs-runtime', 'Knowledge Hub public runtime reader and contextual help routes', 'ReaderTemplate and public shell behavior proof before broader content-route consolidation', 6),
	component('core', 'Core public runtime reader view model', 'packages/core/src/utils/runtime-reader.ts', 'Knowledge Hub runtime reader source, feedback, and help view model', 'public runtime reader/help proof before broader content-route consolidation', 6),
	component('core', 'Core feedback forwarding endpoint', 'packages/core/src/pages/api/feedback/submit.ts', 'feedback architecture Knowledge Hub feedback forwarding to Market/API', 'dynamic feedback forwarding route until broader hub feedback config is proven', 5),
	component('admin', 'Private project knowledge reader routes', 'packages/admin/src/pages/app/projects/[projectId]/knowledge.astro', 'Private project Knowledge Hub reader route', 'private content proxy proof before private packs/artifacts/help reuse', 5),
	component('admin', 'Private project knowledge reader slug route', 'packages/admin/src/pages/app/projects/[projectId]/knowledge/[...slug].astro', 'Private project Knowledge Hub reader slug route', 'private content proxy proof before private packs/artifacts/help reuse', 5),
];

function component(
	owner: PackageOwner,
	name: string,
	sourcePath: string,
	currentUse: string,
	architectureTarget: string,
	maturityLevel: ComponentInventoryEntry['maturityLevel'],
	architectureDebt: ArchitectureDebt[] = [],
): ComponentInventoryEntry {
	return {
		owner,
		name,
		sourcePath,
		currentUse,
		targetPackage: owner === 'admin' ? '@treeseed/admin' : owner === 'core' ? '@treeseed/core' : '@treeseed/ui',
		architectureTarget,
		maturityLevel,
		implementationStatus: 'active',
		replacementBlocker: 'Active implementation remains in use until a later vertical slice proves the replacement.',
		requiredArchitectureChecks: ['route renders', 'visual or component coverage', 'UI architecture guard'],
		architectureStage: 'none while active; reassess when replacement reaches acceptance',
		architectureDebt,
	};
}

export function pathExistsForInventory(path: string): boolean {
	if (path.includes('*')) return false;
	if (!existsSync(path)) return false;
	return statSync(path).isFile() || statSync(path).isDirectory();
}
