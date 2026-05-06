import { describe, expect, it } from 'vitest';
import { deriveTreeseedAstroAllowedDomains } from '../../packages/core/src/utils/astro-security';

describe('Astro security allowed domains', () => {
	it('derives production, staging, configured, and local web hosts', () => {
		const domains = deriveTreeseedAstroAllowedDomains({
			siteUrl: 'https://treeseed.ai',
			surfaces: {
				web: {
					publicBaseUrl: 'https://treeseed.ai',
					localBaseUrl: 'http://127.0.0.1:4321',
					environments: {
						staging: {
							domain: 'treeseed-market-staging-479e4625.treeseed.ai',
						},
						prod: {
							domain: 'treeseed.ai',
						},
					},
				},
			},
		}, { siteUrl: 'https://market.treeseed.ai' });

		expect(domains).toEqual([
			{ hostname: 'treeseed.ai' },
			{ hostname: 'market.treeseed.ai' },
			{ hostname: '127.0.0.1' },
			{ hostname: 'treeseed-market-staging-479e4625.treeseed.ai' },
			{ hostname: 'localhost' },
		]);
	});

	it('deduplicates hostnames and ignores invalid values', () => {
		const domains = deriveTreeseedAstroAllowedDomains({
			siteUrl: 'https://example.com',
			surfaces: {
				web: {
					publicBaseUrl: 'https://example.com',
					localBaseUrl: 'bad host value',
					environments: {
						local: {
							domain: '',
							baseUrl: '://broken',
						},
						staging: {
							domain: 'Example.com',
						},
					},
				},
			},
		});

		expect(domains).toEqual([
			{ hostname: 'example.com' },
			{ hostname: 'localhost' },
			{ hostname: '127.0.0.1' },
		]);
	});
});
