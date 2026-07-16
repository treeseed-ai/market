import { describe, expect, it } from 'vitest';
import { persistActiveTeamSelection, resolveAppTeam } from '../../packages/admin/src/view-models/app-access';
import type { OperationalContext } from '../../packages/admin/src/view-models/shared';

const teams = [
	{ id: 'team-a', slug: 'alpha', name: 'Alpha' },
	{ id: 'team-b', slug: 'beta', name: 'Beta' },
];
const context: OperationalContext = { store: null, principal: { id: 'user-1' }, teams, activeTeam: teams[0] };

describe('identity/team app access', () => {
	it('resolves accessible teams by id, slug, and active alias', () => {
		expect(resolveAppTeam(context, 'team-b')).toMatchObject({ status: 'found', team: { id: 'team-b' } });
		expect(resolveAppTeam(context, 'beta')).toMatchObject({ status: 'found', team: { id: 'team-b' } });
		expect(resolveAppTeam(context, 'active')).toMatchObject({ status: 'found', team: { id: 'team-a' } });
		expect(resolveAppTeam(context, 'missing').status).toBe('not_found');
	});

	it('persists active-team selection with app-scoped cookie policy', () => {
		let cookie: any;
		persistActiveTeamSelection({
			url: new URL('https://treeseed.test/app/teams'),
			cookies: { set: (...args: any[]) => { cookie = args; } },
		}, teams[1]);
		expect(cookie).toEqual(['treeseed_active_team', 'team-b', expect.objectContaining({ path: '/app', sameSite: 'lax', secure: true })]);
	});
});
