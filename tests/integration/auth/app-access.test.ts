import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveAppTeam } from '../../../packages/admin/src/view-models/app-access';
import type { OperationalContext } from '../../../packages/admin/src/view-models/shared';

const teams = [
	{ id: 'team-a', slug: 'alpha', name: 'Alpha' },
	{ id: 'team-b', slug: 'beta', name: 'Beta' },
];
const context: OperationalContext = { store: null, principal: { id: 'user-1' }, teams, activeTeam: teams[0] };

describe('identity/team app access', () => {
	it('resolves accessible teams by id, slug, and active alias', async () => {
		await expect(resolveAppTeam(context, 'team-b')).resolves.toMatchObject({ status: 'found', team: { id: 'team-b' } });
		await expect(resolveAppTeam(context, 'beta')).resolves.toMatchObject({ status: 'found', team: { id: 'team-b' } });
		await expect(resolveAppTeam(context, 'active')).resolves.toMatchObject({ status: 'found', team: { id: 'team-a' } });
	});

	it('persists active-team selection with app-scoped cookie policy', () => {
		const action = readFileSync('packages/admin/src/pages/app/teams/active.ts', 'utf8');
		expect(action).toContain("cookies.set('treeseed_active_team', team.id");
		expect(action).toContain("path: '/app'");
		expect(action).toContain("sameSite: 'lax'");
		expect(action).toContain("secure: context.url.protocol === 'https:'");
	});
});
