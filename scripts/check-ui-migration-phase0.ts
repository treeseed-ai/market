#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import {
	componentInventory,
	pathExistsForInventory,
	routeInventory,
	type ComponentInventoryEntry,
	type RouteInventoryEntry,
} from './ui-migration/inventory.ts';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const docsPath = 'docs/ui-migration-inventory.md';
const routeRoots = ['src/pages', 'packages/admin/src/pages', 'packages/core/src/pages'];
const buildableSourceRoots = ['src', 'packages/admin/src', 'packages/core/src', 'packages/ui/src'];
const uiFoundationSourceRoots = [
	'packages/ui/src/lib/foundation',
	'packages/ui/src/astro/templates',
	'packages/ui/src/astro/patterns',
	'packages/ui/src/astro/operating',
	'packages/ui/src/astro/distribution',
	'packages/ui/src/lib/distribution',
	'packages/ui/src/astro/feedback',
	'packages/ui/src/lib/feedback',
	'packages/ui/src/astro/help',
	'packages/ui/src/lib/help',
	'packages/ui/src/astro/layout/ActionBar.astro',
	'packages/ui/src/astro/surface/ResourceCard.astro',
];
const forbiddenSourceDirectoryNames = new Set(['legacy', 'tmp', 'backup', 'old']);

function walk(path: string): string[] {
	const absolute = resolve(root, path);
	if (!existsSync(absolute)) return [];
	const stats = statSync(absolute);
	if (stats.isFile()) return [path];
	return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') return [];
		return walk(`${path}/${entry.name}`);
	});
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

function discoverHumanRouteFiles(): string[] {
	return routeRoots.flatMap(walk).filter((path) => extname(path) === '.astro').sort();
}

function requiredRouteValues(entry: RouteInventoryEntry): Array<[string, unknown]> {
	return [
		['owner', entry.owner],
		['routePattern', entry.routePattern],
		['sourcePath', entry.sourcePath],
		['surfaceContext', entry.surfaceContext],
		['currentShell', entry.currentShell],
		['targetShell', entry.targetShell],
		['targetTemplate', entry.targetTemplate],
		['resourceType', entry.resourceType],
		['policyNeeds', entry.policyNeeds],
		['dataSource', entry.dataSource],
		['pageLocalComponents', entry.pageLocalComponents],
		['pageLocalCss', entry.pageLocalCss],
		['reusableComponentsUsed', entry.reusableComponentsUsed],
		['maturityLevel', entry.maturityLevel],
		['migrationDifficulty', entry.migrationDifficulty],
		['userValue', entry.userValue],
		['risk', entry.risk],
		['legacyStatus', entry.legacyStatus],
		['deletionBlocker', entry.deletionBlocker],
		['requiredTestsBeforeDeletion', entry.requiredTestsBeforeDeletion],
		['targetDeletionPhase', entry.targetDeletionPhase],
	];
}

function requiredComponentValues(entry: ComponentInventoryEntry): Array<[string, unknown]> {
	return [
		['owner', entry.owner],
		['name', entry.name],
		['sourcePath', entry.sourcePath],
		['currentUse', entry.currentUse],
		['targetPackage', entry.targetPackage],
		['migrationTarget', entry.migrationTarget],
		['maturityLevel', entry.maturityLevel],
		['legacyStatus', entry.legacyStatus],
		['replacementBlocker', entry.replacementBlocker],
		['requiredTestsBeforeDeletion', entry.requiredTestsBeforeDeletion],
		['targetDeletionPhase', entry.targetDeletionPhase],
	];
}

function isMissing(value: unknown): boolean {
	return value === null || value === undefined || value === '';
}

function findForbiddenSourceDirectories(): string[] {
	const directories: string[] = [];
	for (const sourceRoot of buildableSourceRoots) {
		for (const path of walk(sourceRoot)) {
			const parts = dirname(path).split('/');
			for (const part of parts) {
				if (forbiddenSourceDirectoryNames.has(part)) {
					directories.push(path);
					break;
				}
			}
		}
	}
	return [...new Set(directories)].sort();
}

function findLegacyImports(): string[] {
	const sourceFiles = buildableSourceRoots
		.flatMap(walk)
		.filter((path) => ['.astro', '.ts', '.tsx', '.js', '.jsx'].includes(extname(path)));
	const failures: string[] = [];
	for (const path of sourceFiles) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		if (/(from\s+['"][^'"]*legacy\/|import\(['"][^'"]*legacy\/|@treeseed\/[^'"]*\/legacy\/)/u.test(contents)) {
			failures.push(path);
		}
	}
	return failures;
}

function findTemplateDataAccessViolations(): string[] {
	const forbiddenPatterns: Array<[RegExp, string]> = [
		[/\bfetch\s*\(/u, 'fetch'],
		[/Astro\.request/u, 'Astro.request'],
		[/from\s+['"][^'"]*(?:service|facade|client|api)[^'"]*['"]/iu, 'service facade/API client import'],
		[/\b(?:roles|role|permissions)\s*\??\.\s*(?:includes|some|has)\s*\(/u, 'raw role/permission check'],
	];
	const sourceFiles = walk('packages/ui/src/astro/templates')
		.filter((path) => ['.astro', '.ts', '.tsx'].includes(extname(path)));
	const failures: string[] = [];
	for (const path of sourceFiles) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		for (const [pattern, label] of forbiddenPatterns) {
			if (pattern.test(contents)) failures.push(`${path}: template contains direct ${label}`);
		}
	}
	return failures;
}

function findUiFoundationBoundaryViolations(): string[] {
	const sourceFiles = uiFoundationSourceRoots
		.flatMap(walk)
		.filter((path) => ['.astro', '.ts', '.tsx', '.js', '.jsx'].includes(extname(path)));
	const forbiddenImport = /from\s+['"](?:@treeseed\/(?:admin|core|api|agent)|(?:\.\.\/){2,}(?:admin|core|api|agent|src)\/)/u;
	const failures: string[] = [];
	for (const path of sourceFiles) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		if (forbiddenImport.test(contents)) failures.push(`${path}: UI foundation imports across package boundary`);
	}
	return failures;
}

function findPrivateReaderRouteViolations(): string[] {
	const sourceFiles = [
		'packages/admin/src/pages/app/projects/[projectId]/knowledge.astro',
		'packages/admin/src/pages/app/projects/[projectId]/knowledge/[...slug].astro',
	].filter((path) => existsSync(resolve(root, path)));
	const forbiddenPatterns: Array<[RegExp, string]> = [
		[/<style(?:\s|>)/u, 'page-local CSS'],
		[/\bfetch\s*\(/u, 'direct fetch'],
		[/Astro\.request/u, 'Astro.request'],
		[/from\s+['"][^'"]*(?:service|facade|client|api)[^'"]*['"]/iu, 'service/API import'],
		[/\b(?:roles|role|permissions)\s*\??\.\s*(?:includes|some|has)\s*\(/u, 'raw role/permission check'],
		[/localDocuments|local_collections|getCollection\s*\(/u, 'local collection fallback'],
		[/public,\s*max-age|s-maxage/iu, 'public cache header'],
		[/objectKey|raw R2|r2:\/\//iu, 'private object key exposure'],
	];
	const failures: string[] = [];
	for (const path of sourceFiles) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		for (const [pattern, label] of forbiddenPatterns) {
			if (pattern.test(contents)) failures.push(`${path}: private reader route contains ${label}`);
		}
	}
	return failures;
}

function findFeedbackPhase5Violations(): string[] {
	const failures: string[] = [];
	const shellFiles = [
		'packages/ui/src/astro/shell/ProductShell.astro',
		'packages/ui/src/astro/shell/PublicShell.astro',
		'packages/ui/src/astro/auth/AuthShell.astro',
	];
	for (const path of shellFiles) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		if (!contents.includes('FeedbackButton') || !contents.includes('FeedbackDialog')) {
			failures.push(`${path}: shell feedback must use shared FeedbackButton and FeedbackDialog`);
		}
		if (contents.includes('>Feedback</button>')) {
			failures.push(`${path}: shell still contains inert feedback placeholder button`);
		}
		if (/dom-capture|captureRedactedDomScreenshot/u.test(contents)) {
			failures.push(`${path}: shell statically references screenshot capture`);
		}
	}
	const dialogSource = readFileSync(resolve(root, 'packages/ui/src/lib/feedback/dialog.ts'), 'utf8');
	if (!dialogSource.includes("await import('./dom-capture.ts')")) {
		failures.push('packages/ui/src/lib/feedback/dialog.ts: screenshot capture must be lazy-loaded after user intent');
	}
	const apiSource = readFileSync(resolve(root, 'packages/api/src/api/app.ts'), 'utf8');
	if (!apiSource.includes("app.post('/v1/feedback'")) failures.push('packages/api/src/api/app.ts: missing /v1/feedback endpoint');
	if (!apiSource.includes("c.header('cache-control', 'no-store')")) failures.push('packages/api/src/api/app.ts: feedback endpoint must set no-store');
	const feedbackRouteStart = apiSource.indexOf("app.post('/v1/feedback'");
	const feedbackRouteRemainder = feedbackRouteStart >= 0 ? apiSource.slice(feedbackRouteStart + 1) : '';
	const feedbackRouteNextMatch = feedbackRouteRemainder.search(/\n\s*app\.(?:get|post|put|patch|delete)\('/u);
	const feedbackRouteEnd = feedbackRouteStart >= 0 && feedbackRouteNextMatch >= 0
		? feedbackRouteStart + 1 + feedbackRouteNextMatch
		: -1;
	const feedbackRouteSource = feedbackRouteStart >= 0 && feedbackRouteEnd > feedbackRouteStart
		? apiSource.slice(feedbackRouteStart, feedbackRouteEnd)
		: apiSource;
	if (/rawR2Url|objectKey|privateObjectUrl|dataUrl:\s*screenshot/iu.test(feedbackRouteSource)) {
		failures.push('packages/api/src/api/app.ts: feedback endpoint exposes raw private object or screenshot data fields');
	}
	const coreEndpointPath = 'packages/core/src/pages/api/feedback/submit.ts';
	if (!existsSync(resolve(root, coreEndpointPath))) {
		failures.push(`${coreEndpointPath}: Core Knowledge Hub feedback forwarding endpoint is missing`);
	} else {
		const coreEndpoint = readFileSync(resolve(root, coreEndpointPath), 'utf8');
		if (!coreEndpoint.includes('/v1/feedback')) failures.push(`${coreEndpointPath}: must forward to Market/API /v1/feedback`);
		if (!coreEndpoint.includes('no-store')) failures.push(`${coreEndpointPath}: feedback forwarding endpoint must set no-store`);
		if (/recordAuditEvent|upsertTeamInboxItem|MarketControlPlaneStore/iu.test(coreEndpoint)) {
			failures.push(`${coreEndpointPath}: Core endpoint must not own feedback persistence`);
		}
	}
	for (const path of [
		'packages/admin/src/pages/app/work/questions.astro',
		'packages/core/src/pages/docs-runtime/index.astro',
		'packages/core/src/pages/docs-runtime/[...slug].astro',
	]) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		if (/data-ts-feedback-form|<form[^>]+feedback/iu.test(contents)) {
			failures.push(`${path}: proof route contains page-local feedback form`);
		}
	}
	return failures;
}

function findContextualHelpPhase6Violations(): string[] {
	const failures: string[] = [];
	const shellFiles = [
		'packages/ui/src/astro/shell/ProductShell.astro',
		'packages/ui/src/astro/shell/PublicShell.astro',
		'packages/ui/src/astro/auth/AuthShell.astro',
	];
	for (const path of shellFiles) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		if (!contents.includes('HelpButton') || !contents.includes('HelpDrawer')) {
			failures.push(`${path}: shell help must use shared HelpButton and HelpDrawer`);
		}
		if (contents.includes('>Help</button>')) {
			failures.push(`${path}: shell still contains inert help placeholder button`);
		}
		if (/lib\/help\/search|searchContextualHelp/u.test(contents)) {
			failures.push(`${path}: shell statically references contextual help search`);
		}
	}
	const drawerSource = readFileSync(resolve(root, 'packages/ui/src/lib/help/drawer.ts'), 'utf8');
	if (!drawerSource.includes("await import('./search.ts')")) {
		failures.push('packages/ui/src/lib/help/drawer.ts: contextual help search must be lazy-loaded after user intent');
	}
	const feedbackSource = readFileSync(resolve(root, 'packages/ui/src/lib/feedback/dialog.ts'), 'utf8');
	if (!feedbackSource.includes('tsFeedbackContextPatch')) {
		failures.push('packages/ui/src/lib/feedback/dialog.ts: feedback handoff must accept policy-safe help context patches');
	}
	for (const path of [
		'packages/admin/src/pages/app/work/questions.astro',
		'packages/admin/src/pages/app/work/questions/[slug].astro',
		'packages/admin/src/pages/app/work/questions/[slug]/edit.astro',
		'packages/admin/src/pages/app/work/questions/new.astro',
		'packages/core/src/pages/docs-runtime/index.astro',
		'packages/core/src/pages/docs-runtime/[...slug].astro',
	]) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		if (/data-ts-help-drawer|data-ts-help-search|<Help(?:Button|Drawer|Popover|TopicLink|ActionList|ContextualHelpPanel)/u.test(contents)) {
			failures.push(`${path}: proof route contains page-local contextual help UI`);
		}
		if (/<style(?:\s|>)/u.test(contents)) failures.push(`${path}: proof route contains page-local CSS`);
		if (/\b(?:roles|role|permissions)\s*\??\.\s*(?:includes|some|has)\s*\(/u.test(contents)) {
			failures.push(`${path}: proof route contains raw role/permission checks`);
		}
		if (/objectKey|rawR2|r2:\/\/|privateObjectUrl|token|secret/iu.test(contents)) {
			failures.push(`${path}: proof route risks private identifier leakage`);
		}
	}
	const coreHelper = readFileSync(resolve(root, 'packages/core/src/utils/runtime-reader.ts'), 'utf8');
	if (!coreHelper.includes('publicHelpContext')) failures.push('packages/core/src/utils/runtime-reader.ts: public Knowledge Hub reader must resolve HelpContext');
	if (/MarketControlPlaneStore|ApiClientFacade|\/v1\/help/u.test(coreHelper)) {
		failures.push('packages/core/src/utils/runtime-reader.ts: public help must not call Market/API private help surfaces');
	}
	const questionHelper = readFileSync(resolve(root, 'packages/admin/src/view-models/ui-foundation/questions.vm.ts'), 'utf8');
	if (!questionHelper.includes('relatedActions: actions') || !questionHelper.includes('action-state')) {
		failures.push('packages/admin/src/view-models/ui-foundation/questions.vm.ts: question help must explain resolved action states');
	}
	return failures;
}

function findContextualDashboardPhase7Violations(): string[] {
	const failures: string[] = [];
	const dashboardTemplatePath = 'packages/ui/src/astro/templates/DashboardTemplate.astro';
	if (!existsSync(resolve(root, dashboardTemplatePath))) {
		failures.push(`${dashboardTemplatePath}: DashboardTemplate is missing`);
	} else {
		const template = readFileSync(resolve(root, dashboardTemplatePath), 'utf8');
		if (!template.includes('DashboardViewModel')) failures.push(`${dashboardTemplatePath}: must consume typed DashboardViewModel`);
		if (!template.includes('ActionBar')) failures.push(`${dashboardTemplatePath}: must render resolved dashboard actions through ActionBar`);
	}
	const packageJson = readFileSync(resolve(root, 'packages/ui/package.json'), 'utf8');
	if (!packageJson.includes('./components/astro/templates/DashboardTemplate.astro')) {
		failures.push('packages/ui/package.json: DashboardTemplate export is missing');
	}
	const catalog = readFileSync(resolve(root, 'packages/ui/sandbox/src/lib/component-catalog.ts'), 'utf8');
	if (!catalog.includes('dashboard-template')) {
		failures.push('packages/ui/sandbox/src/lib/component-catalog.ts: DashboardTemplate catalog entry is missing');
	}
	const routeExpectations: Array<{ path: string; shell: string; route: string }> = [
		{ path: 'packages/admin/src/pages/app/index.astro', shell: 'TreeseedAppLayout', route: '/app/' },
		{ path: 'packages/admin/src/pages/app/teams/index.astro', shell: 'TreeseedAppLayout', route: '/app/teams' },
		{ path: 'packages/admin/src/pages/app/projects/[projectId].astro', shell: 'TreeseedAppLayout', route: '/app/projects/[projectId]' },
		{ path: 'packages/admin/src/pages/market/index.astro', shell: 'TreeseedPublicLayout', route: '/market' },
	];
	for (const { path, shell, route } of routeExpectations) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		if (!contents.includes('DashboardTemplate')) failures.push(`${path}: ${route} must render DashboardTemplate`);
		if (!contents.includes(shell)) failures.push(`${path}: ${route} must render through ${shell}`);
		if (!contents.includes('helpContext') || !contents.includes('feedbackContext')) {
			failures.push(`${path}: ${route} must pass shell-level help and feedback contexts`);
		}
		if (/<style(?:\s|>)/u.test(contents)) failures.push(`${path}: dashboard proof route contains page-local CSS`);
		if (/\bfetch\s*\(/u.test(contents)) failures.push(`${path}: dashboard proof route contains direct fetch`);
		if (/\b(?:roles|role|permissions)\s*\??\.\s*(?:includes|some|has)\s*\(/u.test(contents)) {
			failures.push(`${path}: dashboard proof route contains raw role/permission checks`);
		}
		if (/Mission Control|Operational Summary|provider console|infrastructure dashboard|dashboard maze/iu.test(contents)) {
			failures.push(`${path}: dashboard proof route contains retired dashboard language`);
		}
	}
	const viewModel = readFileSync(resolve(root, 'packages/admin/src/view-models/contextual-dashboard.vm.ts'), 'utf8');
	for (const required of ['buildPersonalDashboard', 'buildTeamDashboard', 'buildProjectDashboard', 'buildMarketDashboard']) {
		if (!viewModel.includes(required)) failures.push(`packages/admin/src/view-models/contextual-dashboard.vm.ts: missing ${required}`);
	}
	if (/objectKey|rawR2|r2:\/\/|privateObjectUrl|token|secret/iu.test(viewModel)) {
		failures.push('packages/admin/src/view-models/contextual-dashboard.vm.ts: dashboard view model risks private identifier leakage');
	}
	return failures;
}

function findServiceReadinessPhase8Violations(): string[] {
	const failures: string[] = [];
	const layout = readFileSync(resolve(root, 'packages/admin/src/layouts/TreeseedAppLayout.astro'), 'utf8');
	if (!layout.includes("label: 'Services'") || !layout.includes("href: '/app/services'")) {
		failures.push('packages/admin/src/layouts/TreeseedAppLayout.astro: primary rail must expose Services at /app/services');
	}
	if (layout.includes("label: 'Hosts'")) {
		failures.push('packages/admin/src/layouts/TreeseedAppLayout.astro: Hosts must not remain a primary rail item');
	}
	const missingForbiddenRoutes = [
		'packages/admin/src/pages/app/hosts/[hostType]/[hostId]/edit.astro',
		'packages/admin/src/pages/app/capacity/providers/[providerId]/edit.astro',
	].filter((path) => existsSync(resolve(root, path)));
	for (const path of missingForbiddenRoutes) failures.push(`${path}: old service edit route must be removed`);
	const routes = readFileSync(resolve(root, 'packages/admin/src/routes.ts'), 'utf8');
	for (const required of [
		"pattern: '/app/services'",
		"pattern: '/app/hosts/[hostType]/[hostId]'",
		"pattern: '/app/hosts/[hostType]/[hostId]/settings'",
		"pattern: '/app/capacity/providers/[providerId]'",
		"pattern: '/app/capacity/providers/[providerId]/settings'",
	]) {
		if (!routes.includes(required)) failures.push(`packages/admin/src/routes.ts: missing ${required}`);
	}
	if (routes.includes("/app/hosts/[hostType]/[hostId]/edit") || routes.includes("/app/capacity/providers/[providerId]/edit")) {
		failures.push('packages/admin/src/routes.ts: service edit routes must not remain registered');
	}
	const expectations: Array<[string, string[]]> = [
		['packages/admin/src/pages/app/services.astro', ['TreeseedAppLayout', 'DashboardTemplate', 'ReadinessSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/projects/[projectId].astro', ['DashboardTemplate', 'ReadinessSummary', 'loadServiceInventory', 'buildServicesDashboard']],
		['packages/admin/src/pages/app/projects/new.astro', ['ReadinessSummary', 'loadServiceInventory', 'buildServicesDashboard']],
		['packages/admin/src/pages/app/hosts/index.astro', ['CollectionTemplate', 'ReadinessSummary']],
		['packages/admin/src/pages/app/hosts/[hostType]/[hostId].astro', ['DetailTemplate', 'ReadinessSummary']],
		['packages/admin/src/pages/app/hosts/[hostType]/[hostId]/settings.astro', ['SettingsTemplate']],
		['packages/admin/src/pages/app/capacity/providers/index.astro', ['CollectionTemplate', 'ReadinessSummary']],
		['packages/admin/src/pages/app/capacity/providers/[providerId].astro', ['DetailTemplate', 'ReadinessSummary']],
		['packages/admin/src/pages/app/capacity/providers/[providerId]/settings.astro', ['SettingsTemplate']],
	];
	for (const [path, required] of expectations) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		for (const marker of required) {
			if (!contents.includes(marker)) failures.push(`${path}: missing ${marker}`);
		}
		if (/<style(?:\s|>)/u.test(contents)) failures.push(`${path}: service route contains page-local CSS`);
		if (/\b(?:roles|role|permissions)\s*\??\.\s*(?:includes|some|has)\s*\(/u.test(contents)) {
			failures.push(`${path}: service route contains raw role/permission checks`);
		}
		if (/x-treeseed-service-secret|runnerToken|RAILWAY_API_TOKEN|TREESEED_RAILWAY|privateObjectUrl|rawR2|r2:\/\//iu.test(contents)) {
			failures.push(`${path}: service route risks private/service identifier leakage`);
		}
	}
	const uiPackage = readFileSync(resolve(root, 'packages/ui/package.json'), 'utf8');
	if (!uiPackage.includes('./components/astro/service/ReadinessSummary.astro')) {
		failures.push('packages/ui/package.json: missing ReadinessSummary export');
	}
	const serviceVm = readFileSync(resolve(root, 'packages/admin/src/view-models/service-readiness.vm.ts'), 'utf8');
	for (const symbol of ['loadServiceInventory', 'buildServicesDashboard', 'buildHostCollection', 'buildProviderCollection']) {
		if (!serviceVm.includes(symbol)) failures.push(`packages/admin/src/view-models/service-readiness.vm.ts: missing ${symbol}`);
	}
	return failures;
}

function findOperatingLoopPhase9Violations(): string[] {
	const failures: string[] = [];
	const layout = readFileSync(resolve(root, 'packages/admin/src/layouts/TreeseedAppLayout.astro'), 'utf8');
	if (!layout.includes("label: 'Work'") || !layout.includes("href: '/app/work'")) {
		failures.push('packages/admin/src/layouts/TreeseedAppLayout.astro: primary rail must expose Work at /app/work');
	}
	for (const path of [
		'packages/admin/src/pages/app/work/[collection]/new.astro',
		'packages/admin/src/pages/app/work/[collection]/[slug].astro',
		'packages/admin/src/pages/app/work/decisions/[approvalId].astro',
		'packages/admin/src/pages/app/work/decisions/[...approvalPath].astro',
	]) {
		if (existsSync(resolve(root, path))) failures.push(`${path}: duplicate generic work implementation must be removed`);
	}
	const routes = readFileSync(resolve(root, 'packages/admin/src/routes.ts'), 'utf8');
	for (const forbidden of [
		"/app/work/[collection]",
		"/app/work/decisions/[approvalId]",
		"/app/work/decisions/[...approvalPath]",
	]) {
		if (routes.includes(forbidden)) failures.push(`packages/admin/src/routes.ts: stale generic work route remains registered (${forbidden})`);
	}
	for (const required of [
		"pattern: '/app/work'",
		"pattern: '/app/work/review'",
		"pattern: '/app/work/objectives/[slug]'",
		"pattern: '/app/work/notes/new'",
		"pattern: '/app/work/proposals/[slug]/edit'",
		"pattern: '/app/work/decisions/[slug]'",
		"pattern: '/app/capacity/allocation/projects/[projectId]'",
		"pattern: '/app/capacity/allocation/projects/[projectId]/modes/[modeId]'",
		"pattern: '/app/capacity/allocation/projects/[projectId]/agents/[agentSlug]'",
	]) {
		if (!routes.includes(required)) failures.push(`packages/admin/src/routes.ts: missing ${required}`);
	}
	const expectations: Array<[string, string[]]> = [
		['packages/admin/src/pages/app/work.astro', ['TreeseedAppLayout', 'DashboardTemplate', 'WorkQueueSummary', 'ActivityTimeline', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/work/review.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'WorkQueueSummary', 'ActivityTimeline', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/capacity/allocation.astro', ['TreeseedAppLayout', 'DashboardTemplate', 'AllocationPanel', 'DynamicPieAllocationInput', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/capacity/allocation/projects/[projectId].astro', ['TreeseedAppLayout', 'DashboardTemplate', 'AllocationPanel', 'DynamicPieAllocationInput', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/projects/[projectId]/workdays.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'WorkQueueSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/projects/[projectId]/workdays/[workdayId].astro', ['TreeseedAppLayout', 'WorkspaceTemplate', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/projects/[projectId]/agents.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/projects/[projectId]/agents/[agentSlug].astro', ['TreeseedAppLayout', 'WorkspaceTemplate', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/capacity/workday-runs/index.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'WorkQueueSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/capacity/workday-runs/[runId].astro', ['TreeseedAppLayout', 'WorkspaceTemplate', 'helpContext', 'feedbackContext']],
	];
	for (const collection of ['objectives', 'notes', 'proposals', 'decisions']) {
		expectations.push(
			[`packages/admin/src/pages/app/work/${collection}.astro`, ['TreeseedAppLayout', 'CollectionTemplate', 'helpContext', 'feedbackContext']],
			[`packages/admin/src/pages/app/work/${collection}/new.astro`, ['TreeseedAppLayout', 'SettingsTemplate', 'DirectionContentForm', 'helpContext', 'feedbackContext']],
			[`packages/admin/src/pages/app/work/${collection}/[slug].astro`, ['TreeseedAppLayout', 'DetailTemplate', 'helpContext', 'feedbackContext']],
			[`packages/admin/src/pages/app/work/${collection}/[slug]/edit.astro`, ['TreeseedAppLayout', 'SettingsTemplate', 'DirectionContentForm', 'helpContext', 'feedbackContext']],
		);
	}
	for (const [path, required] of expectations) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		for (const marker of required) {
			if (!contents.includes(marker)) failures.push(`${path}: missing ${marker}`);
		}
		if (/<style(?:\s|>)/u.test(contents)) failures.push(`${path}: Phase 9 route contains page-local CSS`);
		if (/\bfetch\s*\(/u.test(contents)) failures.push(`${path}: Phase 9 route contains direct fetch`);
		if (/\b(?:roles|role|permissions)\s*\??\.\s*(?:includes|some|has)\s*\(/u.test(contents)) {
			failures.push(`${path}: Phase 9 route contains raw role/permission checks`);
		}
		if (/scheduler|provider manager|assignment function|runnerToken|RAILWAY_API_TOKEN|TREESEED_RAILWAY|privateObjectUrl|rawR2|r2:\/\//iu.test(contents)) {
			failures.push(`${path}: Phase 9 route risks scheduler/provider/private identifier leakage`);
		}
	}
	const uiPackage = readFileSync(resolve(root, 'packages/ui/package.json'), 'utf8');
	for (const required of [
		'./components/astro/operating/AllocationPanel.astro',
		'./components/astro/operating/AllocationTree.astro',
		'./components/astro/operating/AllocationStateLegend.astro',
		'./components/astro/operating/WorkQueueSummary.astro',
		'./components/astro/operating/ActivityTimeline.astro',
		'./components/astro/templates/WorkspaceTemplate.astro',
	]) {
		if (!uiPackage.includes(required)) failures.push(`packages/ui/package.json: missing ${required}`);
	}
	const operatingVm = readFileSync(resolve(root, 'packages/admin/src/view-models/operating-loop.vm.ts'), 'utf8');
	for (const symbol of ['loadWorkDashboard', 'loadDirectionCollection', 'loadAllocationDashboard', 'loadProjectWorkdayWorkspace', 'loadAgentWorkspace', 'loadReviewQueue']) {
		if (!operatingVm.includes(symbol)) failures.push(`packages/admin/src/view-models/operating-loop.vm.ts: missing ${symbol}`);
	}
	return failures;
}

function findKnowledgeDistributionPhase10Violations(): string[] {
	const failures: string[] = [];
	const routes = readFileSync(resolve(root, 'packages/admin/src/routes.ts'), 'utf8');
	for (const forbidden of [
		"pattern: '/templates'",
		"pattern: '/templates/[slug]'",
		"pattern: '/app/knowledge/artifacts/[artifactId]'",
	]) {
		if (routes.includes(forbidden)) failures.push(`packages/admin/src/routes.ts: redirect-only compatibility route remains registered (${forbidden})`);
	}
	for (const path of [
		'packages/admin/src/pages/templates/index.astro',
		'packages/admin/src/pages/templates/[slug].astro',
		'packages/admin/src/pages/app/knowledge/artifacts/[artifactId].astro',
	]) {
		if (existsSync(resolve(root, path))) failures.push(`${path}: redirect-only compatibility route must be removed`);
	}
	for (const required of [
		"pattern: '/app/knowledge'",
		"pattern: '/app/knowledge/books'",
		"pattern: '/app/knowledge/books/[slug]'",
		"pattern: '/app/knowledge/releases/[releaseId]'",
		"pattern: '/app/knowledge/releases/[releaseId]/review'",
		"pattern: '/app/knowledge/capabilities'",
		"pattern: '/app/knowledge/imports'",
		"pattern: '/app/market/seller'",
		"pattern: '/market/knowledge-packs/[slug]'",
		"pattern: '/market/templates/[slug]'",
	]) {
		if (!routes.includes(required)) failures.push(`packages/admin/src/routes.ts: missing ${required}`);
	}

	const appExpectations: Array<[string, string[]]> = [
		['packages/admin/src/pages/app/knowledge.astro', ['TreeseedAppLayout', 'DashboardTemplate', 'DistributionSummary', 'OverlayStatus', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/artifacts.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'DistributionSummary', 'OverlayStatus', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/packs.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/templates.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/releases.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/publish.astro', ['TreeseedAppLayout', 'SettingsTemplate', 'DistributionSummary', 'submitKnowledgeDistributionAction', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/books.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/books/[slug].astro', ['TreeseedAppLayout', 'DetailTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/releases/[releaseId].astro', ['TreeseedAppLayout', 'DetailTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/releases/[releaseId]/review.astro', ['TreeseedAppLayout', 'SettingsTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/capabilities.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/capabilities/[slug].astro', ['TreeseedAppLayout', 'DetailTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/imports.astro', ['TreeseedAppLayout', 'CollectionTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/knowledge/imports/[slug].astro', ['TreeseedAppLayout', 'DetailTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/app/market/seller.astro', ['TreeseedAppLayout', 'DashboardTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
	];
	const publicExpectations: Array<[string, string[]]> = [
		['packages/admin/src/pages/market/knowledge-packs/index.astro', ['TreeseedPublicLayout', 'CollectionTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/market/knowledge-packs/[slug].astro', ['TreeseedPublicLayout', 'DetailTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/market/templates/index.astro', ['TreeseedPublicLayout', 'CollectionTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
		['packages/admin/src/pages/market/templates/[slug].astro', ['TreeseedPublicLayout', 'DetailTemplate', 'DistributionSummary', 'helpContext', 'feedbackContext']],
	];
	for (const [path, markers] of [...appExpectations, ...publicExpectations]) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		for (const marker of markers) {
			if (!contents.includes(marker)) failures.push(`${path}: missing ${marker}`);
		}
		if (/<style(?:\s|>)/u.test(contents)) failures.push(`${path}: Phase 10 route contains page-local CSS`);
		if (/\bfetch\s*\(/u.test(contents)) failures.push(`${path}: Phase 10 route contains direct fetch`);
		if (/\b(?:roles|role|permissions)\s*\??\.\s*(?:includes|some|has)\s*\(/u.test(contents)) {
			failures.push(`${path}: Phase 10 route contains raw role/permission checks`);
		}
		if (/objectKey|rawR2|r2:\/\/|privateObjectUrl|runnerToken|providerToken|secret|credential/iu.test(contents)) {
			failures.push(`${path}: Phase 10 route risks private identifier, credential, or raw artifact delivery leakage`);
		}
	}
	const shellAndReaderFiles = [
		'packages/ui/src/astro/shell/ProductShell.astro',
		'packages/ui/src/astro/shell/PublicShell.astro',
		'packages/ui/src/astro/auth/AuthShell.astro',
		'packages/core/src/pages/docs-runtime/index.astro',
		'packages/core/src/pages/docs-runtime/[...slug].astro',
	];
	for (const path of shellAndReaderFiles) {
		const contents = readFileSync(resolve(root, path), 'utf8');
		if (/overlay-loader|overlay-session|editors\/|MDXEditor|CodeMirror/iu.test(contents)) {
			failures.push(`${path}: editor/overlay bundle must not be statically imported in shells or anonymous reader routes`);
		}
	}
	const vmSource = readFileSync(resolve(root, 'packages/admin/src/view-models/knowledge-distribution.vm.ts'), 'utf8');
	for (const marker of ['EntitlementState', 'DistributionSummaryViewModel', 'OverlayStatusViewModel', 'requiresEntitlement', 'delivery']) {
		if (!vmSource.includes(marker)) failures.push(`packages/admin/src/view-models/knowledge-distribution.vm.ts: missing ${marker}`);
	}
	const uiPackage = readFileSync(resolve(root, 'packages/ui/package.json'), 'utf8');
	for (const required of [
		'./components/astro/distribution/DistributionSummary.astro',
		'./components/astro/distribution/OverlayStatus.astro',
	]) {
		if (!uiPackage.includes(required)) failures.push(`packages/ui/package.json: missing ${required}`);
	}
	return failures;
}

function markdownList(values: string[]): string {
	return values.length > 0 ? values.join('<br>') : 'none';
}

function generateDocs(): string {
	const routes = [...routeInventory].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
	const components = [...componentInventory].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
	const routeRows = routes.map((entry) => [
		entry.owner,
		`\`${entry.routePattern}\``,
		`\`${entry.sourcePath}\``,
		entry.surfaceContext,
		entry.currentShell,
		entry.targetShell,
		entry.targetTemplate,
		entry.resourceType,
		`L${entry.maturityLevel}`,
		entry.risk,
		entry.legacyStatus,
		entry.firstSliceCandidate ?? 'none',
		markdownList(entry.migrationDebt),
	].join(' | '));
	const componentRows = components.map((entry) => [
		entry.owner,
		entry.name,
		`\`${entry.sourcePath}\``,
		entry.targetPackage,
		entry.migrationTarget,
		`L${entry.maturityLevel}`,
		entry.legacyStatus,
		markdownList(entry.migrationDebt),
	].join(' | '));

	return `# UI Migration Phase 0 Inventory

This board is generated from \`scripts/ui-migration/inventory.ts\`. Update the typed inventory first, then run \`npm run check:ui-migration -- --write\` to refresh this reviewer-facing view.

The typed inventory is canonical. Current active routes are not deprecated. Any future replaced or deleted entry must have no remaining imported implementation.

## Route Inventory

| Owner | Route | Source | Context | Current shell | Target shell | Target template | Resource | Maturity | Risk | Status | First slice | Migration debt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${routeRows.map((row) => `| ${row} |`).join('\n')}

## Component Inventory

| Owner | Component/candidate | Source | Target package | Migration target | Maturity | Status | Migration debt |
| --- | --- | --- | --- | --- | --- | --- | --- |
${componentRows.map((row) => `| ${row} |`).join('\n')}
`;
}

const failures: string[] = [];
const discoveredRouteFiles = discoverHumanRouteFiles();
const discoveredRouteSet = new Set(discoveredRouteFiles);
const inventoryRouteSet = new Set(routeInventory.map((entry) => entry.sourcePath));

for (const sourcePath of discoveredRouteFiles) {
	if (!inventoryRouteSet.has(sourcePath)) failures.push(`Missing route inventory row for ${sourcePath}`);
}

for (const entry of routeInventory) {
	if (!discoveredRouteSet.has(entry.sourcePath)) failures.push(`Route inventory points at missing/non-human route ${entry.sourcePath}`);
	if (entry.routePattern !== routePatternFromPath(entry.sourcePath)) {
		failures.push(`${entry.sourcePath}: routePattern ${entry.routePattern} does not match discovered pattern ${routePatternFromPath(entry.sourcePath)}`);
	}
	for (const [field, value] of requiredRouteValues(entry)) {
		if (isMissing(value)) failures.push(`${entry.sourcePath}: missing required route field ${field}`);
	}
	if (entry.policyNeeds.length === 0) failures.push(`${entry.sourcePath}: policyNeeds must name at least one policy need`);
	if (entry.requiredTestsBeforeDeletion.length === 0) failures.push(`${entry.sourcePath}: requiredTestsBeforeDeletion must name at least one test`);
	if ((entry.legacyStatus === 'wrapped' || entry.compatibilityWrapperPath) && (
		!entry.compatibilityWrapperPath
		|| !entry.deletionBlocker
		|| entry.requiredTestsBeforeDeletion.length === 0
		|| !entry.targetDeletionPhase
		|| !entry.resourceType
	)) {
		failures.push(`${entry.sourcePath}: compatibility wrapper lacks required replacement/blocker/tests/phase metadata`);
	}
	if ((entry.legacyStatus === 'replaced' || entry.legacyStatus === 'deleted') && existsSync(resolve(root, entry.sourcePath))) {
		failures.push(`${entry.sourcePath}: ${entry.legacyStatus} inventory entry still has source implementation`);
	}
}

for (const entry of componentInventory) {
	if (!pathExistsForInventory(entry.sourcePath)) failures.push(`Component inventory points at missing source ${entry.sourcePath}`);
	for (const [field, value] of requiredComponentValues(entry)) {
		if (isMissing(value)) failures.push(`${entry.sourcePath}: missing required component field ${field}`);
	}
	if (entry.requiredTestsBeforeDeletion.length === 0) failures.push(`${entry.sourcePath}: requiredTestsBeforeDeletion must name at least one test`);
	if ((entry.legacyStatus === 'replaced' || entry.legacyStatus === 'deleted') && existsSync(resolve(root, entry.sourcePath))) {
		failures.push(`${entry.sourcePath}: ${entry.legacyStatus} component entry still has source implementation`);
	}
}

for (const path of findForbiddenSourceDirectories()) {
	failures.push(`Forbidden broad source archive/tmp directory under buildable source: ${path}`);
}

for (const path of findLegacyImports()) {
	failures.push(`Canonical source imports from legacy boundary: ${path}`);
}

for (const path of findTemplateDataAccessViolations()) {
	failures.push(`UI foundation template direct data/policy access: ${path}`);
}

for (const path of findUiFoundationBoundaryViolations()) {
	failures.push(`UI foundation dependency boundary violation: ${path}`);
}

for (const path of findPrivateReaderRouteViolations()) {
	failures.push(`Private reader route guard violation: ${path}`);
}

for (const path of findFeedbackPhase5Violations()) {
	failures.push(`Feedback Phase 5 guard violation: ${path}`);
}

for (const path of findContextualHelpPhase6Violations()) {
	failures.push(`Contextual help Phase 6 guard violation: ${path}`);
}

for (const path of findContextualDashboardPhase7Violations()) {
	failures.push(`Contextual dashboard Phase 7 guard violation: ${path}`);
}

for (const path of findServiceReadinessPhase8Violations()) {
	failures.push(`Service readiness Phase 8 guard violation: ${path}`);
}

for (const path of findOperatingLoopPhase9Violations()) {
	failures.push(`Operating loop Phase 9 guard violation: ${path}`);
}

for (const path of findKnowledgeDistributionPhase10Violations()) {
	failures.push(`Knowledge distribution Phase 10 guard violation: ${path}`);
}

const docs = generateDocs();
if (shouldWrite) {
	writeFileSync(resolve(root, docsPath), docs);
} else if (!existsSync(resolve(root, docsPath))) {
	failures.push(`${docsPath} is missing; run npm run check:ui-migration -- --write`);
} else {
	const currentDocs = readFileSync(resolve(root, docsPath), 'utf8');
	if (currentDocs !== docs) failures.push(`${docsPath} is out of date; run npm run check:ui-migration -- --write`);
}

if (failures.length > 0) {
	console.error('UI migration Phase 0 check failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`UI migration Phase 0 check passed (${routeInventory.length} routes, ${componentInventory.length} component groups).`);
