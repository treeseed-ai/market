import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

function files(root: string): string[] {
	return readdirSync(root).flatMap((entry) => {
		const path = join(root, entry);
		return statSync(path).isDirectory() ? files(path) : [path];
	});
}

describe('web runtime boundaries', () => {
	it('does not call the backend API from market web code', () => {
		const sourceFiles = files('src')
			.filter((path) => /\.(astro|ts|js)$/u.test(path))
			.filter((path) => !path.includes('/api/server.js'))
			// Device login approval bridges an authenticated web session to the API-owned
			// device-code store. Keep this exception narrow and explicit.
			.filter((path) => path !== 'src/pages/auth/device/approve.astro');
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /callRailwayApi|exchangeSiteSession|TREESEED_API_BASE_URL|config\.apiBaseUrl/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('does not use the Wrangler D1 query adapter in runtime source', () => {
		const sourceFiles = [...files('src'), ...files('packages/core/src'), ...files('packages/sdk/src')]
			.filter((path) => /\.(astro|ts|js)$/u.test(path));
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /wrangler-d1|WranglerD1Database|LocalWranglerD1Database|wrangler d1 execute/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('keeps device login approval same-origin outside local development', () => {
		const source = readFileSync('src/pages/auth/device/approve.astro', 'utf8');
		expect(source).toContain('formAction: `${Astro.url.pathname}${Astro.url.search}`');
		expect(source).toContain('await createCoreAuthProvider(Astro).approveDeviceFlow(payload)');
		expect(source).toContain('serverUrls: [`${Astro.url.origin}/v1/auth/device/approve`]');
		expect(source).toContain("return 'http://127.0.0.1:3000';");
		expect(source).not.toContain("apiApprovalBaseUrl ? `${apiApprovalBaseUrl}/auth/device/approve`");
	});

	it('redirects legacy v1 device approval browser links before auth checks', () => {
		const source = readFileSync('src/pages/v1/[...all].ts', 'utf8');
		expect(source).toContain("root === 'auth' && id === 'device' && third === 'approve'");
		expect(source).toContain("new URL('/auth/device/approve', context.url.origin)");
	});

	it('keeps backend runtime implementation out of core source', () => {
		const sourceFiles = files('packages/core/src')
			.filter((path) => /\.(astro|ts|js)$/u.test(path))
			.filter((path) => path !== 'packages/core/src/dev.ts');
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /@treeseed\/agent|from ['"].*\/api\/|from ['"].*\/agents\/|from ['"].*\/services\/|Hono|worker runner|workday manager/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('prevents agent from depending on core web runtime', () => {
		const sourceFiles = files('packages/agent/src')
			.filter((path) => /\.(ts|js)$/u.test(path));
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /@treeseed\/core|\\.astro|Starlight/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('keeps package and market environment registries uniquely owned', () => {
		const registryFiles = [
			'packages/sdk/src/platform/env.yaml',
			'packages/core/src/env.yaml',
			'packages/agent/src/env.yaml',
			'src/env.yaml',
		];
		const owners = new Map<string, string[]>();
		for (const path of registryFiles) {
			const registry = parse(readFileSync(path, 'utf8')) as { entries?: Record<string, unknown> };
			for (const id of Object.keys(registry.entries ?? {})) {
				owners.set(id, [...(owners.get(id) ?? []), path]);
			}
		}
		const duplicateOwners = [...owners.entries()]
			.filter(([, paths]) => paths.length > 1)
			.map(([id, paths]) => ({ id, paths }));
		expect(duplicateOwners).toEqual([]);
	});
});
