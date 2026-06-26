import { describe, expect, it, vi } from 'vitest';
import { loadTreeseedManifest } from '@treeseed/sdk/platform/tenant-config';

describe('site model rendering', () => {
	it('disables agent-oriented models configured as not rendered in the manifest', async () => {
		vi.resetModules();
		vi.stubGlobal('__TREESEED_TENANT_CONFIG__', loadTreeseedManifest('./src/manifest.yaml'));
		const { siteModelRendered } = await import('../../packages/core/src/utils/site-models.ts');

		expect(siteModelRendered('knowledge_packs')).toBe(false);
		expect(siteModelRendered('workdays')).toBe(false);
		expect(siteModelRendered('templates')).toBe(true);

		vi.unstubAllGlobals();
	}, 60_000);
});
