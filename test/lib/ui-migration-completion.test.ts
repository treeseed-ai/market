import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const convertedMarketPages = [
	'packages/admin/src/pages/market/index.astro',
	'packages/admin/src/pages/market/templates/index.astro',
	'packages/admin/src/pages/market/templates/[slug].astro',
	'packages/admin/src/pages/market/knowledge-packs/index.astro',
	'packages/admin/src/pages/market/knowledge-packs/[slug].astro',
];

const publicCommerceGovernancePages = [
	['src/pages/marketplace/index.astro', ['TreeseedPublicLayout', 'DashboardTemplate', 'CollectionTemplate', 'helpContext', 'feedbackContext', 'loadMarketplacePage']],
	['src/pages/market/products/[productId].astro', ['TreeseedPublicLayout', 'DetailTemplate', 'helpContext', 'feedbackContext', 'loadMarketplaceProductPage']],
	['src/pages/cart.astro', ['TreeseedPublicLayout', 'DashboardTemplate', 'SettingsTemplate', 'helpContext', 'feedbackContext', 'createCheckoutFromOffer']],
	['src/pages/checkout/[checkoutId].astro', ['TreeseedPublicLayout', 'DetailTemplate', 'CommercePaymentGroupPanel', 'helpContext', 'feedbackContext', 'commerce-checkout']],
	['src/pages/capacity/index.astro', ['TreeseedPublicLayout', 'CollectionTemplate', 'helpContext', 'feedbackContext', 'loadCapacityListingsPage']],
	['src/pages/capacity/[listingId].astro', ['TreeseedPublicLayout', 'DetailTemplate', 'helpContext', 'feedbackContext', 'submitCapacityInquiry']],
	['src/pages/services/new.astro', ['TreeseedPublicLayout', 'SettingsTemplate', 'helpContext', 'feedbackContext', 'submitServiceRequest']],
	['src/pages/services/[requestId].astro', ['TreeseedPublicLayout', 'DetailTemplate', 'ServiceQuotePanel', 'ServiceRequestTimeline', 'helpContext', 'feedbackContext']],
	['src/pages/services/[requestId]/checkout.astro', ['TreeseedPublicLayout', 'DetailTemplate', 'CommercePaymentGroupPanel', 'helpContext', 'feedbackContext', 'commerce-checkout']],
	['src/pages/commons/index.astro', ['TreeseedPublicLayout', 'DashboardTemplate', 'helpContext', 'feedbackContext', 'loadCommonsPage']],
	['src/pages/commons/proposals/[proposalId].astro', ['TreeseedPublicLayout', 'DetailTemplate', 'CommonsVoteSummary', 'CommonsDecisionTimeline', 'helpContext', 'feedbackContext']],
	['src/pages/commons/proposals/new.astro', ['TreeseedPublicLayout', 'SettingsTemplate', 'helpContext', 'feedbackContext', 'submitCommonsProposal']],
	['src/pages/commons/questions/new.astro', ['TreeseedPublicLayout', 'SettingsTemplate', 'helpContext', 'feedbackContext', 'submitCommonsQuestion']],
] as const;

describe('UI migration completion', () => {
	it('converts market catalogue pages to core primitives without inline styling', () => {
		for (const path of convertedMarketPages) {
			const contents = source(path);

			if (path === 'packages/admin/src/pages/market/index.astro') {
				expect(contents, path).toContain('DashboardTemplate');
			} else if (path.endsWith('/index.astro')) {
				expect(contents, path).toContain('CollectionTemplate');
			} else {
				expect(contents, path).toContain('DetailTemplate');
			}
			if (path !== 'packages/admin/src/pages/market/index.astro') {
				expect(contents, path).toContain('DistributionSummary');
			}
			expect(contents, path).toContain('helpContext');
			expect(contents, path).toContain('feedbackContext');
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\sstyle=/u);
			expect(contents, path).not.toMatch(/--(?:site|kc)-/u);
			expect(contents, path).not.toContain('class="ts-panel"');
		}

		expect(source('packages/admin/src/pages/market/templates/[slug].astro')).toContain('loadPublicMarketplaceDetail');
		expect(source('packages/admin/src/pages/market/knowledge-packs/[slug].astro')).toContain('loadPublicMarketplaceDetail');
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/templates/index.astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/templates/[slug].astro'))).toBe(false);
	});

	it('integrates public ecommerce and Commons routes into canonical templates', () => {
		for (const [path, markers] of publicCommerceGovernancePages) {
			const contents = source(path);
			for (const marker of markers) expect(contents, path).toContain(marker);
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toContain('@ts-nocheck');
			expect(contents, path).not.toMatch(/\bfetch\s*\(/u);
			expect(contents, path).not.toMatch(/clientSecret|connectedAccountId|stripeSecret|stripeAccountId|objectKey|rawR2|r2:\/\//u);
		}

		const helper = source('src/lib/market-public-view-models.ts');
		for (const marker of ['marketApi', 'ResolvedAction', 'requiresSignIn', 'requiresEntitlement', 'routeHelp', 'routeFeedback']) {
			expect(helper).toContain(marker);
		}
		const checkoutHelper = source('src/scripts/commerce-checkout.ts');
		expect(checkoutHelper).toContain('window.Stripe');
		expect(checkoutHelper).toContain('/v1/commerce/payment-groups/');
	});

	it('integrates ProductShell commerce and Commons stewardship dashboards', () => {
		for (const [path, markers] of [
			['packages/admin/src/pages/app/commons/index.astro', ['TreeseedAppLayout', 'DashboardTemplate', 'loadCommonsGovernanceDashboard', 'helpContext', 'feedbackContext']],
			['packages/admin/src/pages/app/teams/[teamId]/commerce.astro', ['TreeseedAppLayout', 'DashboardTemplate', 'buildTeamCommerceDashboard', 'helpContext', 'feedbackContext']],
		] as const) {
			const contents = source(path);
			for (const marker of markers) expect(contents, path).toContain(marker);
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\bfetch\s*\(/u);
			expect(contents, path).not.toMatch(/clientSecret|stripeSecret|objectKey|rawR2|r2:\/\//u);
		}
		const vm = source('packages/admin/src/view-models/ecommerce-governance.vm.ts');
		expect(vm).toContain('loadCommonsGovernanceDashboard');
		expect(vm).toContain('buildTeamCommerceDashboard');
		expect(vm).toContain('Seller readiness');
		expect(vm).toContain('Commons signal');
	});

	it('documents commerce, Commons, and platform stewardship as UI capability families', () => {
		const architecture = source('docs/ui-architecture.md');
		for (const marker of ['Commerce Capability Family', 'Commons Governance Capability Family', 'Platform Stewardship Capability Family']) {
			expect(architecture).toContain(marker);
		}
		expect(source('docs/ecommerce.md')).toContain('UI Architecture Integration');
		expect(source('docs/commons-governance.md')).toContain('UI Architecture Integration');
		expect(source('docs/market_ui_spec.md')).toContain('Commerce And Commons UI Integration');
		expect(source('docs/ui-components.md')).toContain('Commerce And Governance Components');
	});

	it('uses @treeseed/ui for the market product card', () => {
		const contents = source('packages/ui/src/astro/market/ProductCard.astro');

		expect(contents).toContain('Card');
		expect(contents).toContain('Badge');
		expect(contents).toContain('Button');
		expect(contents).not.toContain('<style');
		expect(contents).not.toContain('market-card');
		expect(contents).not.toMatch(/\sstyle=/u);
	});

	it('splits launch and team controls into one-purpose app routes', () => {
		const projects = source('packages/admin/src/pages/app/projects/new.astro');
		expect(projects).toContain('id="project-launch-form"');
		expect(projects).toContain('id="project-launch-data"');
		expect(projects).toContain('/projects/launch');
		expect(projects).toContain('treeseedSensitiveUnlock');
		expect(projects).toContain('Field');
		expect(projects).toContain('Select');
		expect(projects).not.toMatch(/\sstyle=/u);

		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/teams/new.astro'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/teams/[teamId]/edit.astro'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/teams/name-check.ts'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/launch.astro'))).toBe(false);
	});

	it('keeps completion CSS and docs on TreeSeed UI rules', () => {
		const css = source('src/styles/treeseed.css');
		expect(css).toContain('market-product-card');
		expect(css).toContain('ts-member-row');
		expect(css).not.toMatch(/--(?:site|kc)-/u);
		expect(source('src/pages/index.astro')).toContain("import '../styles/treeseed.css'");

		const docsPath = 'docs/ui-components.md';
		expect(existsSync(resolve(process.cwd(), docsPath))).toBe(true);
		const docs = source(docsPath);
		for (const marker of ['--ts-*', 'ThemeScript', 'ThemeSelector', '@treeseed/ui/components/astro', 'npm run audit:ui', 'Book and docs pages are protected']) {
			expect(docs).toContain(marker);
		}
	});

	it('routes standalone and docs chrome through shared shell components', () => {
		const mainLayout = source('packages/ui/src/astro/layouts/MainLayout.astro');
		expect(mainLayout).toContain('PublicShell');
		expect(source('packages/ui/src/astro/shell/PublicShell.astro')).toContain('PublicFooter');
		expect(mainLayout).not.toContain('<header');
		expect(mainLayout).not.toContain('<footer');

		const docsHeader = source('packages/ui/src/astro/docs/Header.astro');
		expect(docsHeader).toContain('ts-shell-brand');
		expect(docsHeader).toContain('BookFontControls');
		expect(docsHeader).toContain('DownloadBook');

		const docsFooter = source('packages/ui/src/astro/docs/Footer.astro');
		expect(docsFooter).toContain('PublicFooter');
		expect(docsFooter).toContain('editHref');
		expect(docsFooter).toContain('pagination-links');
	});

	it('keeps browser appearance cookies as the universal static-page theme source', () => {
		const themeScript = source('packages/ui/src/astro/theme/ThemeScript.astro');
		expect(themeScript.indexOf('readCookie(schemeKey)')).toBeLessThan(themeScript.indexOf('readStored(schemeKey)'));
		expect(themeScript.indexOf('readCookie(modeKey)')).toBeLessThan(themeScript.indexOf('readStored(modeKey)'));
		expect(themeScript).toContain('window.sessionStorage.setItem(name, value)');
		expect(themeScript).toContain('window.localStorage.setItem(name, value)');
		expect(themeScript).toContain('document.cookie = `${name}=');
		expect(themeScript).toContain('data-astro-rerun');

		for (const path of [
			'packages/admin/src/pages/auth/register.astro',
		]) {
			expect(source(path), path).toMatch(/set(?:User|CurrentUser|Anonymous)ThemeCookies/u);
		}
		for (const path of [
			'packages/admin/src/pages/auth/sign-in.astro',
			'packages/admin/src/pages/auth/callback/[provider].ts',
			'packages/admin/src/pages/auth/username.astro',
			'packages/admin/src/pages/app/account.astro',
		]) {
			expect(source(path), path).not.toMatch(/SITE_DATA_DB|BetterAuth|session-store/u);
		}
		for (const path of [
			'packages/admin/src/layouts/TreeseedAppLayout.astro',
			'packages/admin/src/layouts/TreeseedPublicLayout.astro',
		]) {
			expect(source(path), path).not.toMatch(/set(?:User|CurrentUser|Anonymous)ThemeCookies/u);
		}
	});

	it('keeps book routes resilient to published-runtime fallback content', () => {
		const route = source('packages/core/src/pages/books/[slug].astro');
		expect(route).toContain("candidate.id === slug || candidate.data.slug === slug");
		expect(route).toContain('publishedRuntime ? publishedBook?.entry ?? null : localBook');
		expect(route).toContain('publishedBook?.html ? <PublishedContentBody');
	});

	it('keeps color schemes in independently registered source files', () => {
		for (const scheme of ['fern', 'lichen', 'cedar', 'tidepool']) {
			expect(existsSync(resolve(process.cwd(), `packages/core/src/utils/color-schemes/${scheme}.ts`))).toBe(true);
		}
		const registry = source('packages/core/src/utils/color-schemes/index.ts');
		expect(registry).toContain('BUILT_IN_COLOR_SCHEMES');
		const theme = source('packages/core/src/utils/theme.ts');
		expect(theme).toContain("from './color-schemes/index.ts'");
		expect(theme).not.toContain('const BUILT_IN_SCHEMES: Record<TreeseedColorSchemeId, TreeseedSchemeTokens> = {');
	});

	it('uses TreeSeed and descriptive SDK names instead of old product naming', () => {
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/layouts/TreeseedAppLayout.astro'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/layouts/TreeseedPublicLayout.astro'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/styles/treeseed.css'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'packages/sdk/src/project-workflow.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'packages/sdk/src/operations/services/market-packaging.ts'))).toBe(true);

		const sdkIndex = source('packages/sdk/src/index.ts');
		expect(sdkIndex).toContain('PROJECT_JOB_STATUSES');
		expect(sdkIndex).toContain('normalizeProjectJobStatus');
		expect(sdkIndex).toContain('buildTemplateMarketPackage');
		expect(sdkIndex).not.toContain(['Knowledge', 'Coop'].join(''));
		expect(sdkIndex).not.toContain(['knowledge', 'coop'].join('-'));
	});

	it('passes the UI audit guardrail', () => {
		const output = execFileSync(process.execPath, ['scripts/audit-ui.ts'], {
			cwd: process.cwd(),
			encoding: 'utf8',
		});
		expect(output).toContain('UI audit passed');
	});
});
