import { describe, expect, it } from 'vitest';
import { buildMarketRuntime } from '../../../src/lib/market/runtime.ts';
import { sortFeaturedFirst } from '../../../src/lib/market/catalog.ts';

describe('market framework internals', () => {
	it('sorts featured products before non-featured products', () => {
		const sorted = sortFeaturedFirst([
			{ data: { title: 'Beta', featured: false } },
			{ data: { title: 'Alpha', featured: true } },
		]);
		expect(sorted[0]?.data.title).toBe('Alpha');
	});

	it('builds a runtime with only live products and featured subsets', () => {
		const runtime = buildMarketRuntime([
			{ data: { title: 'Draft', status: 'draft', featured: true } },
			{ data: { title: 'Live', status: 'live', featured: true } },
			{ data: { title: 'Later', status: 'live', featured: false } },
		]);

		expect(runtime.products.map((entry) => entry.data.title)).toEqual(['Live', 'Later']);
		expect(runtime.featuredProducts.map((entry) => entry.data.title)).toEqual(['Live']);
	});
});
