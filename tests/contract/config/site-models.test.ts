import { describe, expect, it, vi } from 'vitest';
import { loadManifest } from '@treeseed/sdk/platform/tenant-config';

describe('site model rendering', () => {
	it('disables agent-oriented models configured as not rendered in the manifest', async () => {
		vi.resetModules();
		vi.stubGlobal('TENANT_CONFIG', loadManifest('./src/manifest.yaml'));
		const { siteModelRendered } = await import('../../../packages/core/src/utils/support/site-models.ts');

		expect(siteModelRendered('knowledge_packs')).toBe(false);
		expect(siteModelRendered('workdays')).toBe(false);
		expect(siteModelRendered('templates')).toBe(true);

		vi.unstubAllGlobals();
	}, 60_000);
});
