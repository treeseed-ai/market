import { describe, expect, it, vi } from 'vitest';
import {
	resolveAppCapacityProvider,
	resolveAppDeployment,
	resolveAppHost,
	resolveAppProject,
	resolveAppTeam,
	type AppResolution,
} from '../../packages/admin/src/view-models/app-access';
import type { OperationalContext } from '../../packages/admin/src/view-models/shared';

function errorWithStatus(status: number) {
	const error = new Error(`status ${status}`);
	(error as any).status = status;
	return error;
}

function context(store: Record<string, any>): OperationalContext {
	const teams = [
		{ id: 'team-a', slug: 'alpha', name: 'Alpha' },
		{ id: 'team-b', slug: 'beta', name: 'Beta' },
	];
	return {
		store,
		principal: { id: 'user-1' },
		teams,
		activeTeam: teams[0],
		projects: [{ id: 'active-project', slug: 'active', teamId: 'team-a' }],
	};
}

describe('app access resolvers', () => {
	it('resolves projects from accessible non-active teams through direct API details', async () => {
		const store = {
			getProjectDetails: vi.fn(async (projectId: string) => ({
				project: { id: projectId, slug: 'remote-project', teamId: 'team-b', name: 'Remote Project' },
			})),
			getProjectByTeamAndSlug: vi.fn(),
		};

		const resolved = await resolveAppProject(context(store), 'project-b');

		expect(resolved.status).toBe('found');
		expect(resolved.resource?.id).toBe('project-b');
		expect(resolved.team?.id).toBe('team-b');
		expect(store.getProjectByTeamAndSlug).not.toHaveBeenCalled();
	});

	it('resolves project slugs across accessible teams after direct id lookup misses', async () => {
		const store = {
			getProjectDetails: vi.fn(async (projectId: string) => {
				if (projectId === 'project-b') {
					return { project: { id: 'project-b', slug: 'shared-slug', teamId: 'team-b', name: 'Shared Slug' } };
				}
				throw errorWithStatus(404);
			}),
			getProjectByTeamAndSlug: vi.fn(async (teamId: string, slug: string) => (
				teamId === 'team-b' && slug === 'shared-slug'
					? { id: 'project-b', slug, teamId, name: 'Shared Slug' }
					: null
			)),
		};

		const resolved = await resolveAppProject(context(store), 'shared-slug');

		expect(resolved.status).toBe('found');
		expect(resolved.resource?.id).toBe('project-b');
		expect(resolved.team?.id).toBe('team-b');
	});

	it('reports forbidden when the API denies direct project lookup', async () => {
		const store = {
			getProjectDetails: vi.fn(async () => {
				throw errorWithStatus(403);
			}),
			getProjectByTeamAndSlug: vi.fn(async () => null),
		};

		const resolved = await resolveAppProject(context(store), 'secret-project');

		expect(resolved.status).toBe('forbidden');
		expect(resolved.resource).toBeNull();
	});

	it('resolves deployments, hosts, providers, and team pages by ownership', async () => {
		const store = {
			getProjectDeployment: vi.fn(async () => ({
				deployment: { id: 'deployment-b', projectId: 'project-b', teamId: 'team-b' },
				project: { project: { id: 'project-b', teamId: 'team-b' } },
			})),
			getTeamWebHost: vi.fn(async (teamId: string) => {
				if (teamId !== 'team-b') throw errorWithStatus(404);
				return { id: 'web-host-b', provider: 'cloudflare', metadata: { hostType: 'web_host' } };
			}),
			getRepositoryHost: vi.fn(),
			getCapacityProvider: vi.fn(async (teamId: string) => {
				if (teamId !== 'team-b') throw errorWithStatus(404);
				return { id: 'provider-b', teamId, name: 'Provider B' };
			}),
		};
		const appContext = context(store);

		const deployment = await resolveAppDeployment(appContext, 'deployment-b');
		const host = await resolveAppHost(appContext, 'web', 'web-host-b');
		const provider = await resolveAppCapacityProvider(appContext, 'provider-b');
		const team = resolveAppTeam(appContext, 'beta') as AppResolution;

		expect(deployment).toMatchObject({ status: 'found', team: { id: 'team-b' } });
		expect(host).toMatchObject({ status: 'found', team: { id: 'team-b' } });
		expect(provider).toMatchObject({ status: 'found', team: { id: 'team-b' } });
		expect(team).toMatchObject({ status: 'found', team: { id: 'team-b' } });
	});

	it('prefers direct capacity-provider lookup and derives the owner team from the provider', async () => {
		const store = {
			getCapacityProviderById: vi.fn(async () => ({ id: 'provider-b', teamId: 'team-b', name: 'Provider B' })),
			getCapacityProvider: vi.fn(),
		};

		const provider = await resolveAppCapacityProvider(context(store), 'provider-b');

		expect(provider).toMatchObject({ status: 'found', team: { id: 'team-b' } });
		expect(store.getCapacityProviderById).toHaveBeenCalledWith('provider-b');
		expect(store.getCapacityProvider).not.toHaveBeenCalled();
	});
});
