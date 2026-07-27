import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITE_SLOGAN } from '../../../packages/ui/src/site-brand';

const firstPartySiteConfigs = [
	'src/config.yaml',
	'packages/admin/docs/src/config.yaml',
	'packages/agent/docs/src/config.yaml',
	'packages/api/docs/src/config.yaml',
	'packages/cli/docs/src/config.yaml',
	'packages/core/docs/src/config.yaml',
	'packages/sdk/docs/src/config.yaml',
	'packages/treedx/docs/src/config.yaml',
	'packages/ui/docs/src/config.yaml',
	'packages/agent/.fixtures/treeseed-fixtures/sites/working-site/src/config.yaml',
	'packages/api/.fixtures/treeseed-fixtures/sites/working-site/src/config.yaml',
	'packages/cli/.fixtures/treeseed-fixtures/sites/working-site/src/config.yaml',
	'packages/core/.fixtures/treeseed-fixtures/sites/working-site/src/config.yaml',
	'packages/sdk/.fixtures/treeseed-fixtures/sites/working-site/src/config.yaml',
];

describe('first-party site branding', () => {
	it('uses one slogan in every TreeSeed site header configuration', () => {
		expect(SITE_SLOGAN).toBe('Grow what you know');
		for (const path of firstPartySiteConfigs) {
			expect(readFileSync(path, 'utf8'), path).toContain(`statement: ${SITE_SLOGAN}`);
		}
	});

	it('keeps registration focused on account creation', () => {
		const registration = readFileSync('packages/admin/src/pages/auth/register.astro', 'utf8');
		expect(registration).toContain('title="Create account"');
		expect(registration).not.toContain('Create an internal login for the market control plane.');
	});
});
