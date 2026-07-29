import { existsSync, readFileSync } from 'node:fs';
import { ADMIN_ROUTES, ADMIN_SUPPORT_ROUTES } from '../../packages/admin/src/routes.ts';
import { CORE_ROUTES, CORE_SUPPORT_ROUTES } from '../../packages/core/src/support/routes.ts';
import type { SiteRouteContribution } from '../../packages/sdk/src/platform/support/plugin.ts';

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
	description: string;
	parameterSemantics: string;
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

export interface SupportEndpointInventoryEntry {
	owner: 'admin' | 'core';
	routePattern: string;
	sourcePath: string;
	responseKind: string;
	accessPolicy: string;
	dataSource: string;
	description: string;
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

function sourcePath(owner: 'admin' | 'core', route: SiteRouteContribution) {
	return `packages/${owner}/src/${route.resourcePath}`;
}

const humanCapabilities = [...ADMIN_ROUTES, ...CORE_ROUTES];

function routePatternFromPath(sourcePath: string): string {
	const pagesIndex = sourcePath.indexOf('/pages/');
	const relative = sourcePath.slice(pagesIndex + '/pages/'.length).replace(/\.(?:astro|ts)$/u, '');
	const withoutIndex = relative === 'index' ? '' : relative.replace(/\/index$/u, '');
	return `/${withoutIndex}`.replace(/\/$/u, '') || '/';
}

function source(path: string) {
	return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const routeDescriptions: Record<string, string> = {
	'/app': 'Authenticated start page. Summarizes the signed-in principal, available teams, current active-team selection, and direct account/team-management actions without loading projects or operational domains.',
	'/app/account': 'Identity settings route for public profile details, immutable username display, verified-email lifecycle, scoped-reauthenticated password setup/change, and explicit provider linking/unlinking without mixing session, notification, theme, or deletion concerns.',
	'/app/account/sessions': 'Session collection for the signed-in principal. It identifies the current browser session, permits idempotent revocation of other sessions, and directs current-device termination through the CSRF-protected logout action.',
	'/app/account/notifications': 'Notification preference editor with one account-wide email cadence, a canonical content-type selection inherited across authorized projects, optional exact-replacement project overrides, and browser-derived IANA timezone capture. In-app visibility remains immediate.',
	'/app/account/appearance': 'Personal-theme manager that lists immutable built-ins and private user-created themes, validates guided light/dark palettes and WCAG contrast, and supports create, rename, edit, and guarded deletion. Theme activation remains exclusively in the authenticated shell selector.',
	'/app/account/delete': 'Destructive account workflow that loads authoritative ownership/admin blockers, requires the exact confirmation phrase and a five-minute one-use scoped reauthentication grant or current password, then revokes sessions and purges account-owned identity data.',
	'/app/teams': 'Lists teams available to the principal, identifies the active team and membership role, and exposes create, select, edit, member-management, and delete actions when the principal has sufficient authority.',
	'/app/teams/:teamId/delete': 'Protected team deletion workflow. Resolves the requested team, verifies an owner or project-lead role, loads deletion blockers, requires an exact confirmation phrase, and deletes only when no blocking records remain.',
	'/app/teams/:teamId/edit': 'Protected team settings form. Resolves and selects the requested team, verifies management authority, displays current identity fields, validates submitted changes, and persists updates through the Admin API facade.',
	'/app/teams/:teamId/members': 'Protected membership workspace for listing team members, sending invitations, changing member roles, and removing members. Owner/project-lead authorization and API last-owner protections govern mutations.',
	'/app/teams/new': 'Authenticated team-creation form. Validates the new team identity, creates it through the API facade, records it as the active team, and continues into the retained team-management surface.',
	'/auth/check-email': 'Auth continuation page shown after registration or password-reset requests. Explains which message to expect, preserves only a validated return target, and redirects an already authenticated principal to the app.',
	'/auth/confirm-email': 'Consumes an email-confirmation token through the authentication API. On success it establishes the resulting session and follows the validated return target; invalid or expired tokens render a recoverable failure state.',
	'/auth/device/approve': 'Signed-in approval screen for CLI/device authorization. Displays the requesting device context, submits approval to the auth service, and reports approved, invalid, expired, or denied states.',
	'/auth/forgot-password': 'Anonymous password-reset request form. Accepts an account email, calls the reset-request API, and transitions to the check-email page without exposing whether an account exists.',
	'/auth/logout': 'CSRF-protected POST action that revokes the current web session, clears the API access cookie, and returns a 303 to sign-in. GET performs no authentication mutation and redirects to sign-in.',
	'/auth/register': 'Anonymous credential-registration form for name, permanent public username, email, and password. It normalizes and checks username availability after debounce, checks privacy-safe email usability on blur/change, blocks submission until both checks succeed, repeats uniqueness validation authoritatively at submission, and directs a new account to email verification.',
	'/auth/reset-password': 'Token-based password-reset form. Validates and confirms the replacement password, submits the reset token to the auth service, and returns the user to sign-in after completion.',
	'/auth/sign-in': 'Credential sign-in form accepting email or username plus password. Creates the web session, preserves a safe return target, and exposes recovery and registration paths.',
	'/auth/username': 'Authenticated username-claim step for principals that do not yet have a public username. Validates namespace availability, stores the permanent username, and returns to a safe account/app destination.',
	'/t/:name': 'Public team knowledge profile. Resolves a team by normalized public name and renders identity, explicitly public projects, reusable catalog items, knowledge packs, and a publication trail; authenticated members also receive the canonical role-gated team navigation while private membership and operational context remain redacted.',
	'/team-invites/:token/accept': 'Invitation redemption flow. Resolves the invite token, coordinates sign-in or registration when necessary, accepts valid invitations through the API, and reports expired, invalid, or already-used invitations.',
	'/u/:username': 'Public user knowledge profile. Normalizes the username, renders identity, expertise, and explicitly public attributed contributions, adds canonical account navigation only for the signed-in owner, redirects noncanonical names, and returns 404 for unknown active users without exposing account or membership context.',
	'/': 'Core homepage composed from enabled content collections. Introduces the site and surfaces recent questions, objectives, proposals, decisions, notes, people, agents, and books without a Market-owned override.',
	'/:slug': 'Generic top-level Core content page. Resolves an entry from the pages collection, chooses the configured content or bridge layout, renders local or published-runtime HTML, and returns the shared not-found surface when absent.',
	'/404': 'Explicit not-found page with a plain explanation and recovery links to the homepage, books library, and status content.',
	'/agents': 'Public directory of configured software-agent contributors, including each agent’s name, summary, operator, runtime status, tags, and link to its profile.',
	'/agents/:slug': 'Agent profile page with rendered narrative content, operator/runtime metadata, and resolved relationships to questions and objectives. Missing agents return the shared 404 presentation.',
	'/books': 'Ordered public catalog of book records showing title, summary, section metadata, landing paths, and available download links.',
	'/books/:slug': 'Long-form book reader. Resolves a book by ID or slug, renders local or published-runtime content in the reader layout, and returns a book-specific not-found state when absent.',
	'/contact': 'Public contact page and Core-owned contact form for questions, feedback, collaboration notes, and issue reports. It displays submission status returned by the Core form handler.',
	'/decisions': 'Reverse-chronological public decision index showing title, summary, status, date, contributor, and tags for recorded accepted, rejected, deferred, or superseded choices.',
	'/decisions/:slug': 'Decision detail with rationale, authority, type, implementation metadata, contributor, rendered body, and links to related objectives, questions, notes, proposals, books, and superseded decisions.',
	'/docs-runtime': 'Root of the public knowledge reader. Selects local Astro docs or the published content runtime and renders the root document, with explicit 404 and upstream-unavailable states.',
	'/docs-runtime/:slug*': 'Catch-all public knowledge reader for nested documentation paths. Resolves local or published content by the complete remaining path and distinguishes missing content from runtime unavailability.',
	'/notes': 'Public working-notes index for implementation observations, framing, and documentation decisions, loaded from the local or published notes collection.',
	'/notes/:slug': 'Working-note detail with metadata and rendered local or published content. Drafts are excluded and missing notes receive a note-specific 404 state.',
	'/objectives': 'Public index of strategic objectives, including summaries, status/context metadata, contributors, and links into each objective record.',
	'/objectives/:slug': 'Objective detail with authored content, contributor, and resolved relationships to questions and books. Draft or missing objectives are not rendered.',
	'/people': 'Public directory of human contributors, describing stewardship identities and linking each person to their profile.',
	'/people/:slug': 'Human contributor profile with rendered biography/profile content and resolved relationships to questions and objectives; missing profiles return 404.',
	'/proposals': 'Public proposal index presenting explicit suggested changes with summaries, state, contributors, and navigation to their detailed records.',
	'/proposals/:slug': 'Proposal detail with authored content and relationships to objectives, questions, notes, books, decisions, and superseded proposals. Draft or missing proposals are withheld.',
	'/questions': 'Public stream of research questions, showing their summaries, status/context, contributors, and links to detailed inquiry records.',
	'/questions/:slug': 'Question detail with authored content, contributor information, and resolved objective/book relationships. Draft or unknown questions return the shared not-found state.',
	'/ui': 'Core UI catalog used to inspect shared TreeSeed primitives across themes and viewport sizes, including buttons, badges, cards, forms, lists, details, tables, empty states, and appearance controls.',
};

function parameterSemantics(routePattern: string): string {
	if (routePattern.includes('[teamId]')) return '[teamId] identifies the team selected for a protected management action.';
	if (routePattern.includes('[username]')) return '[username] is the normalized, globally unique public username.';
	if (routePattern.includes('[name]')) return '[name] is the normalized public team name.';
	if (routePattern.includes('[...slug]')) return '[...slug] is the complete nested documentation path, including any remaining segments.';
	if (routePattern.includes('[slug]')) return '[slug] identifies a content entry in the route’s collection.';
	if (routePattern.includes('[token]')) return '[token] is the opaque invitation credential issued by the authentication API.';
	if (routePattern.includes('[provider]')) return '[provider] is one configured identity-provider identifier from the canonical provider registry.';
	return 'No path parameters.';
}

function routePolicies(routePattern: string, owner: PackageOwner): string[] {
	if (owner === 'core' || routePattern.startsWith('/u/') || routePattern.startsWith('/t/')) return ['public read'];
	if (routePattern === '/app' || routePattern === '/app/account' || routePattern === '/app/teams/new') return ['signed-in principal'];
	if (routePattern === '/app/teams') return ['signed-in principal', 'team membership filters visible teams', 'management role gates privileged actions'];
	if (routePattern.startsWith('/app/teams/:teamId/')) return ['signed-in principal', 'requested team membership', 'team owner or project lead for mutations'];
	if (routePattern === '/auth/device/approve') return ['signed-in principal', 'valid pending device request', 'safe return URL'];
	if (routePattern === '/auth/username') return ['signed-in principal', 'username not already assigned', 'safe return URL'];
	return ['anonymous-safe auth flow', 'safe return URL'];
}

function route(registered: SiteRouteContribution): RouteInventoryEntry {
	if (!registered.capability) throw new Error(`Route registry metadata is missing for ${registered.resourcePath}`);
	const routeSourcePath = sourcePath(registered.capability.owner as 'admin' | 'core', registered);
	const capability = registered.capability;
	const routePattern = registered.pattern;
	const owner: PackageOwner = routeSourcePath.startsWith('packages/admin/') ? 'admin' : 'core';
	const isAuth = routePattern.startsWith('/auth') || routePattern.startsWith('/team-invites');
	const isApp = routePattern === '/app' || routePattern.startsWith('/app/');
	const isTeam = routePattern.startsWith('/app/teams') || routePattern.startsWith('/t/');
	const isReader = routePattern.startsWith('/books') || routePattern.startsWith('/docs-runtime');
	const contents = source(routeSourcePath);
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
		sourcePath: routeSourcePath,
		description: routeDescriptions[routePattern] ?? routeDescriptions[routePattern.replace(/\[\.\.\.([^\]]+)\]/gu, ':$1*').replace(/\[([^\]]+)\]/gu, ':$1')] ?? capability.description,
		parameterSemantics: parameterSemantics(routePattern),
		surfaceContext: isAuth ? 'auth' : isTeam ? 'team' : isApp ? 'personal' : owner === 'core' ? 'content' : 'public',
		currentShell: capability.shell as ShellName,
		targetShell: capability.shell as ShellName,
		targetTemplate: (capability.archetype === 'message' ? 'detail' : capability.archetype === 'profile' ? 'detail' : capability.archetype === 'auth-form' ? 'auth-form' : capability.archetype) as TargetTemplate,
		resourceType: capability.resourceType,
		policyNeeds: capability.accessPolicy,
		dataSource: capability.viewModelDependencies.join('; '),
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

export const routeInventory: RouteInventoryEntry[] = humanCapabilities.map(route);

export const supportEndpointInventory: SupportEndpointInventoryEntry[] = [...ADMIN_SUPPORT_ROUTES, ...CORE_SUPPORT_ROUTES].map((entry) => {
	if (!entry.capability) throw new Error(`Support route registry metadata is missing for ${entry.pattern}`);
	return {
		owner: entry.capability.owner as 'admin' | 'core',
		routePattern: entry.pattern,
		sourcePath: sourcePath(entry.capability.owner as 'admin' | 'core', entry),
		responseKind: entry.capability.responseKind,
		accessPolicy: entry.capability.accessPolicy.join('; '),
		dataSource: entry.capability.viewModelDependencies.join('; '),
		description: entry.capability.description,
	};
});

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
	component('admin', 'Authenticated identity shell', 'packages/admin/src/layouts/AppLayout.astro', 'Account and team navigation', '@treeseed/admin'),
	component('admin', 'Public identity shell', 'packages/admin/src/layouts/PublicLayout.astro', 'Public user/team profiles and invitations', '@treeseed/admin'),
	component('admin', 'Identity/team view models', 'packages/admin/src/view-models', 'Principal, active-team, and membership projections', '@treeseed/admin'),
	component('ui', 'Reusable Astro components', 'packages/ui/src/astro', 'Canonical layout-down templates and auth/account compound components', '@treeseed/ui'),
	component('ui', 'Reusable React components', 'packages/ui/src/react', 'Shared interactive components available to package-owned surfaces', '@treeseed/ui'),
	component('ui', 'Theme and CSS primitives', 'packages/ui/src/styles', 'Shared tokens, theme compiler, validation, and styles', '@treeseed/ui'),
	component('core', 'Core layouts', 'packages/core/src/layouts', 'Unchanged public content composition', '@treeseed/core'),
];

export function pathExistsForInventory(path: string): boolean {
	return existsSync(path);
}
