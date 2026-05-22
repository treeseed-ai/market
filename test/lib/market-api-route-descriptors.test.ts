import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
	MARKET_API_ROUTE_DESCRIPTORS,
	SDK_METHOD_ROUTE_MAP,
	extractActiveMarketApiRoutes,
} from '../../src/api/route-descriptors.js';

function publicMarketClientMethods() {
	const source = readFileSync('packages/sdk/src/market-client.ts', 'utf8');
	const classStart = source.indexOf('export class MarketClient');
	const classSource = source.slice(classStart);
	const methodNames = [...classSource.matchAll(/^\s+([a-zA-Z][a-zA-Z0-9_]*)\([^)]*\)\s*\{/gmu)]
		.map((match) => match[1])
		.filter((name) => !['constructor', 'headers', 'url', 'request', 'tryRequest'].includes(name));
	return [...new Set(methodNames)];
}

describe('Market API route descriptors', () => {
	it('describes every active v1 route declared by the Market API', () => {
		const extracted = extractActiveMarketApiRoutes();
		expect(MARKET_API_ROUTE_DESCRIPTORS.map((route) => route.id)).toEqual(extracted.map((route) => route.id));
		expect(MARKET_API_ROUTE_DESCRIPTORS).toHaveLength(268 + 1);
		expect(MARKET_API_ROUTE_DESCRIPTORS.find((route) => route.id === 'get.v1.users.by-username.username.profile')).toMatchObject({
			authClass: 'user',
			ownerDomain: 'market',
		});
	});

	it('keeps provider ingress and platform runner endpoints in separate trust classes', () => {
		const provider = MARKET_API_ROUTE_DESCRIPTORS.filter((route) => route.providerIngress);
		const runner = MARKET_API_ROUTE_DESCRIPTORS.filter((route) => route.internalRunner);
		expect(provider.length).toBeGreaterThan(0);
		expect(runner.length).toBeGreaterThan(0);
		expect(provider.every((route) => route.authClass === 'provider-key')).toBe(true);
		expect(runner.every((route) => route.authClass === 'platform-runner')).toBe(true);
	});

	it('attaches executable acceptance metadata to every active route', () => {
		for (const descriptor of MARKET_API_ROUTE_DESCRIPTORS) {
			expect(descriptor.acceptance).toMatchObject({
				successActors: expect.any(Array),
				denyActors: expect.any(Array),
				deniedStatusAny: expect.any(Array),
				successStatusAny: expect.any(Array),
				productionSafe: true,
				productionStrategy: expect.any(String),
			});
			expect(descriptor.acceptance.successStatusAny.length).toBeGreaterThan(0);
			expect(descriptor.acceptance.deniedStatusAny.length).toBeGreaterThan(0);
			if (descriptor.method !== 'GET') {
				expect(descriptor.acceptance).toHaveProperty('bodyFactory');
			}
		}
	});

	it('maps every public MarketClient method to an active descriptor-backed endpoint', () => {
		const descriptorIds = new Set(MARKET_API_ROUTE_DESCRIPTORS.map((route) => route.id));
		const methods = publicMarketClientMethods();
		const missingMappings = methods.filter((method) => !(method in SDK_METHOD_ROUTE_MAP));
		const staleMappings = Object.entries(SDK_METHOD_ROUTE_MAP)
			.filter(([, routeId]) => !descriptorIds.has(routeId))
			.map(([method, routeId]) => `${method}:${routeId}`);
		expect(missingMappings).toEqual([]);
		expect(staleMappings).toEqual([]);
	});

	it('keeps live acceptance descriptor-driven instead of hand-written only', () => {
		const spec = parse(readFileSync('test/acceptance/market-api.base.yaml', 'utf8')) as any;
		expect(spec.coverage?.requireAllDescriptors).toBe(true);
		expect(spec.coverage?.requireAllSdkMethods).toBe(true);
		expect(spec.descriptorMatrices).toEqual(expect.arrayContaining([
			expect.objectContaining({
				id: 'descriptor-executable-role-matrix',
				methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				actors: expect.arrayContaining(['anonymous', 'siteAdmin', 'marketSteward', 'teamOwner', 'teamOperator', 'teamViewer', 'nonMember', 'providerOperator', 'providerKey', 'platformRunner']),
				excludeProviderIngress: false,
				excludeInternalRunner: false,
			}),
		]));
		expect(spec.descriptorMatrices.some((matrix: any) => matrix.coverageOnly === true)).toBe(false);
	});
});
