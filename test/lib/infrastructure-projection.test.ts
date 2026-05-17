import { describe, expect, it, vi } from 'vitest';
import { buildInfrastructureProjection } from '../../src/lib/market/infrastructure-projection.js';

describe('infrastructure projection', () => {
	it('builds a sanitized operator projection from existing infrastructure data', async () => {
		const store = {
			listTeamWebHosts: vi.fn(async () => [{ id: 'host-1', name: 'Staging host', provider: 'cloudflare', status: 'active' }]),
			listRepositoryHosts: vi.fn(async () => [{ id: 'repo-host-1', name: 'GitHub', provider: 'github', status: 'active' }]),
			listTeamCapacityProviders: vi.fn(async () => [{ id: 'provider-1', name: 'Managed capacity', provider: 'railway', status: 'active', billingScope: 'team' }]),
			listCapacityGrants: vi.fn(async () => [{ id: 'grant-1', environment: 'staging', state: 'active', grantScope: 'team' }]),
			listTeamProducts: vi.fn(async () => [{ id: 'resource-1', title: 'Deployment workflow', kind: 'template', visibility: 'private' }]),
			getTeamCapacitySummary: vi.fn(async () => ({ readiness: 'waiting_for_budget', reasons: ['daily_budget_exhausted'] })),
			listAuditEventsForTarget: vi.fn(async () => [{ id: 'audit-1', eventType: 'capacity_policy_updated', targetType: 'team', data: { summary: 'Policy changed.' }, createdAt: '2026-05-01T10:00:00.000Z' }]),
			listCapacityProviderHosts: vi.fn(async () => [{ id: 'host-binding-1', hostId: 'host-1', role: 'processing', state: 'active' }]),
			listCapacityProviderLanes: vi.fn(async () => [{ id: 'lane-1', name: 'verification', state: 'active' }]),
			listCapacityProviderApiKeys: vi.fn(async () => [{ id: 'key-1', state: 'active', secret: 'hidden-secret' }]),
			getProjectSummary: vi.fn(async () => ({
				repositories: [{ id: 'repo-1', owner: 'treeseed-ai', name: 'market', role: 'software', status: 'active' }],
				capabilityGrants: [{ id: 'policy-1', namespace: 'release', operation: 'publish', label: 'Publish release', enabled: true, approvalPolicy: { reason: 'Publication is visible.' } }],
			})),
			getProjectDetails: vi.fn(async () => ({
				resources: [{ id: 'infra-1', logicalName: 'content bucket', provider: 'cloudflare', resourceKind: 'r2', status: 'active' }],
				deployments: [{ id: 'deploy-1', environment: 'prod', status: 'succeeded', releaseTag: 'v1', finishedAt: '2026-05-01T11:00:00.000Z' }],
				repositories: [{ id: 'hub-repo-1', owner: 'treeseed-ai', name: 'docs', role: 'docs', status: 'active' }],
			})),
			getProjectAgentsSummary: vi.fn(async () => ({
				workerRunners: [{ id: 'runner-1', runnerId: 'runner-secret-token', runnerServiceName: 'worker-runner-01', state: 'active', activeLocalWorkers: 1, maxLocalWorkers: 2 }],
				taskHealth: {
					activeTasks: [{ id: 'task-1', type: 'verification', state: 'running', priority: 1, workDayId: 'workday-1', payloadJson: '{"prompt":"hidden"}' }],
				},
			})),
			getProjectReleasesSummary: vi.fn(async () => ({ history: [{ id: 'release-1', environment: 'prod', status: 'succeeded', releaseTag: 'v1' }] })),
			getProjectCapacityOperations: vi.fn(async () => ({
				summary: { readiness: 'waiting_for_budget', reasons: ['daily budget threshold'], workPolicy: { enabled: true, environment: 'staging' } },
				blockedRoutingDecisions: [{ id: 'route-1', decision: 'approval_required', reason: 'daily budget threshold' }],
				interruptionReservations: [{ id: 'reservation-1', state: 'continuation_required' }],
			})),
		};

		const projection = await buildInfrastructureProjection({
			store,
			principal: { id: 'user-1' },
			team: { id: 'team-1', name: 'treeseed' },
			projects: [{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }],
			seedState: {
				selectedSeed: 'treeseed',
				selectedEnvironments: 'local',
				plan: { summary: { create: 1, update: 2, skip: 3 } },
				diagnostics: [{ severity: 'warning', code: 'seed.review', message: 'Review plan.', path: 'seed' }],
				runs: [{ id: 'run-1', state: 'planned', plan: { actions: [{ kind: 'team', payload: { slug: 'treeseed' } }] } }],
				approvals: [{ id: 'approval-1', title: 'Apply seed', state: 'pending' }],
			},
		});

		expect(projection.projects.map((item) => item.title)).toContain('Ops Docs');
		expect(projection.repositories.map((item) => item.title)).toEqual(expect.arrayContaining(['treeseed-ai/market', 'treeseed-ai/docs']));
		expect(projection.deployments.map((item) => item.title)).toContain('Ops Docs prod');
		expect(projection.capacity.map((item) => item.title)).toEqual(expect.arrayContaining(['Managed capacity', 'verification', 'Ops Docs routing decision']));
		expect(projection.workers.map((item) => item.title)).toEqual(expect.arrayContaining(['worker-runner-01', 'Ops Docs verification']));
		expect(projection.hosts.map((item) => item.title)).toEqual(expect.arrayContaining(['Staging host', 'GitHub']));
		expect(projection.resources.map((item) => item.title)).toEqual(expect.arrayContaining(['Deployment workflow', 'content bucket']));
		expect(projection.seeds.map((item) => item.title)).toEqual(expect.arrayContaining(['Seed treeseed', 'Apply seed']));
		expect(projection.policies.map((item) => item.title)).toEqual(expect.arrayContaining(['Publish release', 'Ops Docs work policy']));
		expect(projection.diagnostics.map((item) => item.title)).toEqual(expect.arrayContaining(['Team capacity requires attention', 'seed.review']));

		const serialized = JSON.stringify(projection);
		expect(serialized).not.toContain('hidden-secret');
		expect(serialized).not.toContain('runner-secret-token');
		expect(serialized).not.toContain('payloadJson');
		expect(serialized).not.toContain('prompt');
	});
});
