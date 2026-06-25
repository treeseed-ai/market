import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routeInventory, componentInventory } from '../scripts/ui-migration/inventory.js';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Phase 10 knowledge and capability distribution', () => {
	it('registers and inventories canonical distribution routes without compatibility redirects', () => {
		const routes = source('packages/admin/src/routes.ts');
		for (const route of [
			'/app/knowledge',
			'/app/knowledge/books',
			'/app/knowledge/releases/:releaseId/review',
			'/app/knowledge/capabilities/:slug',
			'/app/knowledge/imports/:slug',
			'/app/market/seller',
			'/market/knowledge-packs/:slug',
			'/market/templates/:slug',
		]) {
			expect(routes).toContain(`pattern: '${route.replaceAll(':releaseId', '[releaseId]').replaceAll(':slug', '[slug]')}'`);
			expect(routeInventory.find((entry) => entry.routePattern === route)?.maturityLevel).toBe(10);
		}
		for (const removed of [
			'packages/admin/src/pages/templates/index.astro',
			'packages/admin/src/pages/templates/[slug].astro',
			'packages/admin/src/pages/app/knowledge/artifacts/[artifactId].astro',
		]) {
			expect(existsSync(resolve(process.cwd(), removed)), removed).toBe(false);
		}
		expect(routes).not.toContain("pattern: '/templates'");
		expect(routes).not.toContain("pattern: '/app/knowledge/artifacts/[artifactId]'");
	});

	it('renders app knowledge and seller surfaces through canonical templates with shell help and feedback', () => {
		const expectations: Array<[string, string]> = [
			['packages/admin/src/pages/app/knowledge.astro', 'DashboardTemplate'],
			['packages/admin/src/pages/app/knowledge/artifacts.astro', 'CollectionTemplate'],
			['packages/admin/src/pages/app/knowledge/books/[slug].astro', 'DetailTemplate'],
			['packages/admin/src/pages/app/knowledge/releases/[releaseId]/review.astro', 'SettingsTemplate'],
			['packages/admin/src/pages/app/market/seller.astro', 'DashboardTemplate'],
		];
		for (const [path, template] of expectations) {
			const contents = source(path);
			expect(contents, path).toContain('TreeseedAppLayout');
			expect(contents, path).toContain(template);
			expect(contents, path).toContain('DistributionSummary');
			expect(contents, path).toContain('helpContext');
			expect(contents, path).toContain('feedbackContext');
			expect(contents, path).not.toMatch(/<style(?:\s|>)|\bfetch\s*\(|roles?\??\.\s*(?:includes|some|has)\s*\(/u);
		}
	});

	it('renders marketplace acquisition routes through public templates and entitlement-aware view models', () => {
		for (const path of [
			'packages/admin/src/pages/market/knowledge-packs/index.astro',
			'packages/admin/src/pages/market/knowledge-packs/[slug].astro',
			'packages/admin/src/pages/market/templates/index.astro',
			'packages/admin/src/pages/market/templates/[slug].astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('TreeseedPublicLayout');
			expect(contents, path).toContain('DistributionSummary');
			expect(contents, path).toContain('helpContext');
			expect(contents, path).toContain('feedbackContext');
			expect(contents, path).not.toMatch(/<style(?:\s|>)|\bfetch\s*\(/u);
		}
		const vm = source('packages/admin/src/view-models/knowledge-distribution.vm.ts');
		for (const marker of ['requiresEntitlement', 'EntitlementState', 'delivery', 'loadPublicMarketplaceDetail']) {
			expect(vm).toContain(marker);
		}
	});

	it('exports distribution primitives and keeps overlay editor loading lazy', () => {
		const uiPackage = source('packages/ui/package.json');
		expect(uiPackage).toContain('./components/astro/distribution/DistributionSummary.astro');
		expect(uiPackage).toContain('./components/astro/distribution/OverlayStatus.astro');
		expect(componentInventory.find((entry) => entry.name === 'Distribution components')?.maturityLevel).toBe(10);
		expect(source('packages/ui/src/lib/distribution/overlay-loader.ts')).toContain("await import('./overlay-session.ts')");
		for (const path of [
			'packages/ui/src/astro/shell/ProductShell.astro',
			'packages/ui/src/astro/shell/PublicShell.astro',
			'packages/core/src/pages/docs-runtime/index.astro',
			'packages/core/src/pages/docs-runtime/[...slug].astro',
		]) {
			expect(source(path), path).not.toMatch(/overlay-loader|overlay-session|editors\/|MDXEditor|CodeMirror/u);
		}
	});
});
