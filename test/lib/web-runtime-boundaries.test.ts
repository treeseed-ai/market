import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
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
			.filter((path) => !path.includes('/api/server.js'));
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
});
