import { describe, expect, it } from 'vitest';
import { siteModelRendered } from '../../packages/core/src/utils/site-models.ts';

describe('site model rendering', () => {
	it('disables agent-oriented models configured as not rendered in the manifest', () => {
		expect(siteModelRendered('knowledge_packs')).toBe(false);
		expect(siteModelRendered('workdays')).toBe(false);
		expect(siteModelRendered('templates')).toBe(true);
	});
});
