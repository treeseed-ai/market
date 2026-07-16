import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES } from '../../packages/admin/src/routes';
import { routeInventory } from '../../scripts/ui-architecture/inventory';

const retained = [
	'/app', '/app/account', '/app/account/sessions', '/app/account/notifications', '/app/account/appearance', '/app/account/delete', '/app/teams', '/app/teams/new',
	'/app/teams/[teamId]/edit', '/app/teams/[teamId]/delete', '/app/teams/[teamId]/members',
	'/auth/register', '/auth/check-email', '/auth/confirm-email', '/auth/sign-in', '/auth/logout',
	'/auth/forgot-password', '/auth/reset-password', '/auth/username', '/auth/device/approve',
	'/auth/callback/[provider]', '/u/[username]', '/t/[name]', '/team-invites/[token]/accept',
].sort();

function filesUnder(path: string): string[] {
	if (!existsSync(path)) return [];
	return readdirSync(path).flatMap((name) => {
		const child = `${path}/${name}`;
		return statSync(child).isDirectory() ? filesUnder(child) : [child];
	});
}

describe('Market and Admin legacy UI removal', () => {
	it('leaves Market with no tenant-owned routes and Admin with the focused human and support routes', () => {
		expect(filesUnder('src/pages')).toEqual([]);
		expect(ADMIN_ROUTES.map((route) => route.pattern).sort()).toEqual(retained);
		expect(filesUnder('packages/admin/src/pages')).toHaveLength(25);
	});

	it('keeps the generated current inventory free of retired routes', () => {
		expect(routeInventory.some((entry) => entry.owner === 'market')).toBe(false);
		const patterns = routeInventory.map((entry) => entry.routePattern);
		for (const route of ['/market', '/cart', '/checkout/:checkoutId', '/app/projects', '/app/capacity', '/app/work', '/app/knowledge']) {
			expect(patterns).not.toContain(route);
		}
	});

	it('removes route-specific code and UI-only dependencies', () => {
		for (const path of [
			'src/lib/market-public-view-models.ts',
			'src/scripts/commerce-checkout.ts',
			'src/styles/treeseed.css',
			'packages/admin/src/layouts/TreeseedOperationalMarketLayout.astro',
			'packages/admin/src/lib/host-crypto.ts',
			'packages/admin/src/components/legacy-project-ui.ts',
			'packages/admin/src/capabilities/legacy-project-ui.ts',
		]) expect(existsSync(resolve(path)), path).toBe(false);
		const adminPackage = JSON.parse(readFileSync('packages/admin/package.json', 'utf8')) as { dependencies: Record<string, string> };
		expect(adminPackage.dependencies).not.toHaveProperty('@mdxeditor/editor');
		expect(adminPackage.dependencies).not.toHaveProperty('libsodium-wrappers-sumo');
	});

	it('retains only identity and team navigation', () => {
		const layout = readFileSync('packages/admin/src/layouts/TreeseedAppLayout.astro', 'utf8');
		for (const label of ["label: 'Start'", "label: 'Teams'", "label: 'Account'"]) expect(layout).toContain(label);
		for (const label of ['Projects', 'Services', 'Capacity', 'Work', 'Knowledge', 'Market', 'Cart', 'Seller']) expect(layout).not.toContain(`label: '${label}'`);
		expect(layout).toContain('treeseed_active_team');
	});

	it('archives all 130 removed and retained legacy route records', () => {
		const legacy = readFileSync('docs/legacy-routes.md', 'utf8');
		expect(legacy.split('\n').filter((line) => line.startsWith('| `')).length).toBe(130);
		expect(legacy).toContain('[UI Redesign](./ui-redesign.md)');
	});
});
