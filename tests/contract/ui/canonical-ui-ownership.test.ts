import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES } from '../../../packages/admin/src/routes';
import { routeInventory } from '../../../scripts/ui-architecture/inventory';

const retained = [
	'/app', '/app/account', '/app/account/sessions', '/app/account/notifications', '/app/account/appearance', '/app/account/delete', '/app/teams', '/app/teams/new',
	'/app/teams/active', '/app/teams/[teamId]', '/app/teams/[teamId]/edit', '/app/teams/[teamId]/delete', '/app/teams/[teamId]/members',
	'/app/services', '/app/services/new', '/app/services/vault', '/app/services/[connectionId]',
	'/app/projects', '/app/projects/[projectId]/books', '/app/projects/[projectId]/workflows', '/app/capacity', '/app/work', '/app/knowledge',
	'/app/knowledge/packs/[buildId]/download', '/app/feedback', '/app/feedback/[feedbackId]', '/app/market',
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

describe('Market and Admin canonical UI ownership', () => {
	it('leaves Market with no tenant-owned routes and Admin with the focused human and support routes', () => {
		expect(filesUnder('src/pages')).toEqual([]);
		expect(ADMIN_ROUTES.map((route) => route.pattern).sort()).toEqual(retained);
		expect(filesUnder('packages/admin/src/pages').length).toBeGreaterThan(28);
	});

	it('keeps the generated current inventory free of retired routes', () => {
		expect(routeInventory.some((entry) => entry.owner === 'market')).toBe(false);
		const patterns = routeInventory.map((entry) => entry.routePattern);
		for (const route of ['/market', '/cart', '/checkout/:checkoutId', '/app/hosts']) {
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

	it('retains identity navigation and one canonical team-management link', () => {
		const layout = readFileSync('packages/admin/src/layouts/AppLayout.astro', 'utf8');
		for (const label of ["label: 'Start'", "label: 'Account'"]) expect(layout).toContain(label);
		expect(layout).not.toContain("label: 'Teams'");
		expect(layout).toContain('aria-label="Manage teams"');
		expect(layout.split('href="/app/teams"')).toHaveLength(2);
		for (const label of ['Services', 'Projects', 'Capacity', 'Work', 'Knowledge']) expect(layout).toContain(`label: '${label}'`);
		for (const label of ['Market', 'Cart', 'Seller']) expect(layout).not.toContain(`label: '${label}'`);
		const activeTeamAction = readFileSync('packages/admin/src/pages/app/teams/active.ts', 'utf8');
		expect(activeTeamAction).toContain("cookies.set('treeseed_active_team'");
		expect(activeTeamAction).toContain("path: '/app'");
	});

	it('documents the canonical service-management boundary without compatibility routes', () => {
		const services = readFileSync('docs/service-management.md', 'utf8');
		expect(services).toContain('TeamServiceConnection');
		expect(services).toContain('/app/services');
		expect(services).toContain('No product repository-host');
	});
});
