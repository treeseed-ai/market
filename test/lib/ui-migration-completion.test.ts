import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const convertedMarketPages = [
	'src/pages/market/index.astro',
	'src/pages/market/templates/index.astro',
	'src/pages/market/templates/[slug].astro',
	'src/pages/market/knowledge-packs/index.astro',
	'src/pages/market/knowledge-packs/[slug].astro',
];

describe('UI migration completion', () => {
	it('converts market catalogue pages to core primitives without inline styling', () => {
		for (const path of convertedMarketPages) {
			const contents = source(path);

			expect(contents, path).toContain('Panel');
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\sstyle=/u);
			expect(contents, path).not.toMatch(/--(?:site|kc)-/u);
			expect(contents, path).not.toContain('class="ts-panel"');
		}

		expect(source('src/pages/market/templates/[slug].astro')).toContain('KeyValueList');
		expect(source('src/pages/market/knowledge-packs/[slug].astro')).toContain('ActionList');
	});

	it('keeps MarketProductCard as a thin composition over core primitives', () => {
		const contents = source('src/components/market/MarketProductCard.astro');

		expect(contents).toContain('Card');
		expect(contents).toContain('Badge');
		expect(contents).toContain('Button');
		expect(contents).not.toContain('<style');
		expect(contents).not.toContain('market-card');
		expect(contents).not.toMatch(/\sstyle=/u);
	});

	it('converts launch and team management forms while preserving critical hooks', () => {
		const launch = source('src/pages/app/launch.astro');
		expect(launch).toContain('id="project-launch-form"');
		expect(launch).toContain('id="launch-data"');
		expect(launch).toContain('/projects/launch');
		expect(launch).toContain('treeseedSensitiveUnlock');
		expect(launch).toContain('Field');
		expect(launch).toContain('Select');
		expect(launch).not.toMatch(/\sstyle=/u);

		const edit = source('src/pages/app/teams/[teamSlug]/edit.astro');
		expect(edit).toContain('data-team-name-input');
		expect(edit).toContain('data-team-name-status');
		expect(edit).toContain('/app/teams/name-check');
		expect(edit).toContain('teamDeletionConfirmationMatches');
		expect(edit).toContain('Field');
		expect(edit).toContain('StatusPill');
		expect(edit).not.toContain('<style');
		expect(edit).not.toMatch(/\sstyle=/u);

		const create = source('src/pages/app/teams/new.astro');
		expect(create).toContain('validateTeamName');
		expect(create).toContain('TextInput');
		expect(create).toContain('Textarea');
		expect(create).not.toMatch(/\sstyle=/u);
	});

	it('keeps completion CSS and docs on TreeSeed UI rules', () => {
		const css = source('src/styles/treeseed.css');
		expect(css).toContain('market-product-card');
		expect(css).toContain('ts-member-row');
		expect(css).not.toMatch(/--(?:site|kc)-/u);

		const docsPath = 'docs/ui-components.md';
		expect(existsSync(resolve(process.cwd(), docsPath))).toBe(true);
		const docs = source(docsPath);
		for (const marker of ['--ts-*', 'ThemeScript', 'ThemeSelector', 'AppShell', 'PublicShell', 'npm run audit:ui', 'Book and docs pages are protected']) {
			expect(docs).toContain(marker);
		}
	});

	it('uses TreeSeed and descriptive SDK names instead of old product naming', () => {
		expect(existsSync(resolve(process.cwd(), 'src/layouts/TreeseedAppLayout.astro'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/layouts/TreeseedPublicLayout.astro'))).toBe(true);
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
		const output = execFileSync(process.execPath, ['scripts/audit-ui.mjs'], {
			cwd: process.cwd(),
			encoding: 'utf8',
		});
		expect(output).toContain('UI audit passed');
	});
});
