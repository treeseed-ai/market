import { describe, expect, it } from 'vitest';
import {
	assertCoverage,
	bodyForFactory,
	expandDescriptorMatrices,
	expandRoleMatrices,
	expandSdkMethodMatrices,
	loadSpec,
} from '../../scripts/market-acceptance.mjs';
import { ACCEPTANCE_ACTORS, MARKET_API_ROUTE_DESCRIPTORS, SDK_METHOD_ROUTE_MAP } from '../../src/api/route-descriptors.js';

describe('Market API acceptance framework', () => {
	it('expands every active route into executable actor cases', () => {
		const spec = loadSpec('test/acceptance/market-api.base.yaml');
		const descriptorCases = expandDescriptorMatrices(spec);
		const descriptorIds = new Set(descriptorCases.map((entry) => entry.descriptorId));
		expect(descriptorIds.size).toBe(MARKET_API_ROUTE_DESCRIPTORS.length);
		for (const descriptor of MARKET_API_ROUTE_DESCRIPTORS) {
			for (const actor of ACCEPTANCE_ACTORS) {
				expect(descriptorCases.some((entry) => entry.descriptorId === descriptor.id && entry.actor === actor)).toBe(true);
			}
		}
		expect(descriptorCases.every((entry) => entry.coverageOnly !== true)).toBe(true);
	});

	it('generates safe request bodies for non-GET route descriptors', () => {
		for (const descriptor of MARKET_API_ROUTE_DESCRIPTORS.filter((entry) => entry.method !== 'GET')) {
			const body = bodyForFactory(descriptor.acceptance.bodyFactory, descriptor, 'teamOwner');
			if (descriptor.acceptance.bodyFactory === 'empty') {
				expect(body).toBeUndefined();
			} else {
				expect(body).toBeDefined();
			}
		}
	});

	it('expands SDK method cases from the descriptor map and enforces coverage', () => {
		const spec = loadSpec('test/acceptance/market-api.base.yaml');
		const allCases = [
			...(spec.cases ?? []),
			...expandRoleMatrices(spec),
			...expandDescriptorMatrices(spec),
			...expandSdkMethodMatrices(spec),
		];
		assertCoverage(spec, allCases);
		const sdkMethods = new Set(allCases.map((entry) => entry.sdkMethod).filter(Boolean));
		expect([...sdkMethods].sort()).toEqual(Object.keys(SDK_METHOD_ROUTE_MAP).sort());
	});
});
