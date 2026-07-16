import { existsSync, readFileSync } from 'node:fs';

export type PackageOwner = 'market' | 'admin' | 'core' | 'ui';
export type SurfaceContext = 'auth' | 'public' | 'personal' | 'team' | 'content' | 'system';
export type ShellName = 'AuthShell' | 'PublicSingleColumnShell' | 'AuthenticatedAppShell' | 'CoreContentLayout' | 'CoreReaderLayout' | 'Standalone';
export type TargetTemplate = 'auth-form' | 'collection' | 'dashboard' | 'detail' | 'reader' | 'settings' | 'wizard';
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

const adminRoutePaths = [
	'packages/admin/src/pages/app/account.astro',
	'packages/admin/src/pages/app/index.astro',
	'packages/admin/src/pages/app/teams/[teamId]/delete.astro',
	'packages/admin/src/pages/app/teams/[teamId]/edit.astro',
	'packages/admin/src/pages/app/teams/[teamId]/members.astro',
	'packages/admin/src/pages/app/teams/index.astro',
	'packages/admin/src/pages/app/teams/new.astro',
	'packages/admin/src/pages/auth/check-email.astro',
	'packages/admin/src/pages/auth/confirm-email.astro',
	'packages/admin/src/pages/auth/device/approve.astro',
	'packages/admin/src/pages/auth/forgot-password.astro',
	'packages/admin/src/pages/auth/logout.astro',
	'packages/admin/src/pages/auth/register.astro',
	'packages/admin/src/pages/auth/reset-password.astro',
	'packages/admin/src/pages/auth/sign-in.astro',
	'packages/admin/src/pages/auth/username.astro',
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

function routePatternFromPath(sourcePath: string): string {
	const pagesIndex = sourcePath.indexOf('/pages/');
	const relative = sourcePath.slice(pagesIndex + '/pages/'.length).replace(/\.astro$/u, '');
	const withoutIndex = relative === 'index' ? '' : relative.replace(/\/index$/u, '');
	return `/${withoutIndex.replace(/\[\.\.\.([^\]]+)\]/gu, ':$1*').replace(/\[([^\]]+)\]/gu, ':$1')}`.replace(/\/$/u, '') || '/';
}

function source(path: string) {
	return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function route(sourcePath: string): RouteInventoryEntry {
	const routePattern = routePatternFromPath(sourcePath);
	const owner: PackageOwner = sourcePath.startsWith('packages/admin/') ? 'admin' : 'core';
	const isAuth = routePattern.startsWith('/auth') || routePattern.startsWith('/team-invites');
	const isApp = routePattern === '/app' || routePattern.startsWith('/app/');
	const isTeam = routePattern.startsWith('/app/teams') || routePattern.startsWith('/t/');
	const isReader = routePattern.startsWith('/books') || routePattern.startsWith('/docs-runtime');
	const contents = source(sourcePath);
	const debt: ArchitectureDebt[] = [];
	if (/<style(?:\s|>)/u.test(contents)) debt.push('page-local-css');
	if (/\sstyle=/u.test(contents)) debt.push('inline-dynamic-style');
	if (/<script(?:\s|>)/u.test(contents)) debt.push('route-local-script');
	const reusableComponentsUsed = [...new Set([...contents.matchAll(/@treeseed\/ui\/components\/astro\/([^'"]+)/gu)].map((match) => match[1]))].sort();
	const isDetail = routePattern.includes('/:');
	const template: TargetTemplate = isAuth ? 'auth-form' : routePattern === '/app' ? 'dashboard' : routePattern.endsWith('/account') ? 'settings' : routePattern.endsWith('/new') ? 'wizard' : isReader ? 'reader' : isDetail ? 'detail' : 'collection';
	const shell: ShellName = isAuth ? 'AuthShell' : isApp ? 'AuthenticatedAppShell' : owner === 'core' ? (isReader ? 'CoreReaderLayout' : 'CoreContentLayout') : 'PublicSingleColumnShell';
	return {
		owner,
		routePattern,
		sourcePath,
		surfaceContext: isAuth ? 'auth' : isTeam ? 'team' : isApp ? 'personal' : owner === 'core' ? 'content' : 'public',
		currentShell: shell,
		targetShell: shell,
		targetTemplate: template,
		resourceType: isTeam ? 'team-profile' : routePattern.startsWith('/u/') ? 'user-profile' : isAuth ? 'auth-session' : owner === 'core' ? 'content-page' : 'account',
		policyNeeds: isAuth ? ['anonymous-safe auth flow', 'safe return URL'] : isApp ? ['signed-in principal', ...(isTeam ? ['team membership and management role'] : [])] : ['public read'],
		dataSource: owner === 'admin' ? 'Admin auth/session and generic API facade' : 'Core content runtime',
		pageLocalComponents: [],
		pageLocalCss: debt.includes('page-local-css') ? 'present' : 'none',
		reusableComponentsUsed,
		maturityLevel: 1,
		architectureComplexity: isApp || isAuth ? 'medium' : 'low',
		userValue: 'high',
		risk: isApp || isAuth ? 'medium' : 'low',
		implementationStatus: 'active',
		compatibilityWrapperPath: null,
		architectureNotes: owner === 'admin' ? 'Retained identity/team foundation pending the comprehensive redesign.' : 'Core-owned route is unchanged by the Market/Admin cleanup.',
		requiredArchitectureChecks: ['route discovery', 'shell ownership', 'access policy', 'UI architecture guard'],
		architectureStage: owner === 'admin' ? 'redesign foundation' : 'unchanged core surface',
		architectureProof: routePattern.startsWith('/questions/') ? 'Direction resource detail proof' : routePattern.startsWith('/docs-runtime/') ? 'Public runtime reader proof' : null,
		architectureDebt: debt,
	};
}

export const routeInventory: RouteInventoryEntry[] = [...adminRoutePaths, ...coreRoutePaths].map(route);

function component(owner: PackageOwner, name: string, sourcePath: string, currentUse: string, targetPackage: ComponentInventoryEntry['targetPackage']): ComponentInventoryEntry {
	return {
		owner,
		name,
		sourcePath,
		currentUse,
		targetPackage,
		architectureTarget: owner === 'ui' ? 'Preserve reusable package-owned primitives for the redesign.' : 'Retained identity/team composition only.',
		maturityLevel: 1,
		implementationStatus: 'active',
		replacementBlocker: 'Requires redesign acceptance before replacement.',
		requiredArchitectureChecks: ['package boundary', 'typecheck', 'UI architecture guard'],
		architectureStage: 'active baseline',
		architectureDebt: [],
	};
}

export const componentInventory: ComponentInventoryEntry[] = [
	component('admin', 'Authenticated identity shell', 'packages/admin/src/layouts/TreeseedAppLayout.astro', 'Account and team navigation', '@treeseed/admin'),
	component('admin', 'Public identity shell', 'packages/admin/src/layouts/TreeseedPublicLayout.astro', 'Public user/team profiles and invitations', '@treeseed/admin'),
	component('admin', 'Identity/team view models', 'packages/admin/src/view-models', 'Principal, active-team, and membership projections', '@treeseed/admin'),
	component('ui', 'Reusable Astro components', 'packages/ui/src/astro', 'Shared layout-down components; unchanged by cleanup', '@treeseed/ui'),
	component('ui', 'Reusable React components', 'packages/ui/src/react', 'Shared interactive components; unchanged by cleanup', '@treeseed/ui'),
	component('ui', 'Theme and CSS primitives', 'packages/ui/src/styles', 'Shared tokens and styles; unchanged by cleanup', '@treeseed/ui'),
	component('core', 'Core layouts', 'packages/core/src/layouts', 'Unchanged public content composition', '@treeseed/core'),
];

export function pathExistsForInventory(path: string): boolean {
	return existsSync(path);
}
