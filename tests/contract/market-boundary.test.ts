import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

test('Market is a standalone public site without Admin or backend implementation custody', () => {
	const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { workspaces?: unknown; dependencies?: Record<string, string> };
	expect(packageJson.workspaces).toBeUndefined();
	for (const dependency of ['@treeseed/admin', '@treeseed/agent', '@treeseed/api', '@treeseed/cli']) expect(packageJson.dependencies?.[dependency]).toBeUndefined();
	const configuration = readFileSync(resolve(root, 'astro.config.ts'), 'utf8');
	expect(configuration).toMatch(/createTenantSite/u); expect(configuration).not.toMatch(/createAdminSite|@treeseed\/admin/u);
	const site = readFileSync(resolve(root, 'treeseed.site.yaml'), 'utf8');
	expect(site).not.toMatch(/@treeseed\/admin/u);
});

test('Market retains only public web runtime and remote API integration', () => {
	const manifest = readFileSync(resolve(root, 'treeseed.package.yaml'), 'utf8');
	expect(manifest).toMatch(/type: singleton-hosted-site/u); expect(manifest).toMatch(/id: web/u);
	expect(manifest).not.toMatch(/operations-runner|capacity-provider/u);
});
