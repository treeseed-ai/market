import { describe, expect, it } from 'vitest';
import {
	buildDeploymentTimeline,
	buildDeploymentViewModel,
	isDeploymentActive,
	isDeploymentTerminal,
} from '../../packages/admin/src/view-models/deployment.vm.ts';

const baseState = {
	ok: true,
	project: { id: 'project-1', teamId: 'team-1', slug: 'docs', name: 'Docs' },
	launch: {
		status: 'complete',
		summary: 'Launch complete.',
		events: [{ id: 'launch-1', title: 'Launch completed', summary: 'Repository and host ready.', status: 'succeeded', createdAt: '2026-05-01T10:00:00.000Z' }],
		actions: [],
		inspect: null,
	},
	nextAction: {
		code: 'deployment_ready',
		label: 'Deployment ready',
		description: 'Queue staging, production, publish, or monitor work from the environment cards.',
		action: 'deploy_web',
		environment: 'staging',
	},
	environments: [
		{ id: 'env-staging', environment: 'staging', baseUrl: 'https://staging.example.test' },
		{ id: 'env-prod', environment: 'prod', baseUrl: 'https://example.test' },
	],
	repositories: [{ id: 'repo-1', provider: 'github', owner: 'treeseed-ai', name: 'market' }],
	hosts: [{ id: 'host-1', provider: 'cloudflare', name: 'Cloudflare', status: 'active' }],
	runner: {
		status: 'online',
		lastHeartbeatAt: '2026-05-01T10:05:00.000Z',
		capabilities: ['project:web_deployment'],
		activeJobCount: 1,
	},
	latestDeployments: {
		staging: {
			id: 'deployment-staging',
			projectId: 'project-1',
			environment: 'staging',
			action: 'deploy_web',
			status: 'succeeded',
			target: { url: 'https://staging.example.test', runnerToken: 'hidden-token' },
			externalWorkflow: { url: 'https://github.com/treeseed-ai/market/actions/runs/1' },
			summary: 'Staging deploy succeeded.',
			requestedByUserId: 'user-1',
			completedAt: '2026-05-01T10:10:00.000Z',
			metadata: { capacityProviderId: 'provider-secret' },
		},
		prod: null,
	},
	latestMonitors: {
		staging: {
			environment: 'staging',
			status: 'healthy',
			checkedAt: '2026-05-01T10:12:00.000Z',
			checks: [
				{ key: 'latest_workflow', label: 'Latest workflow', status: 'passed', summary: 'deploy-web.yml completed successfully.', source: 'github', url: 'https://github.com/treeseed-ai/market/actions/runs/1', inspectCommand: 'gh run view 1 --repo treeseed-ai/market --log-failed' },
				{ key: 'http_response', label: 'HTTP response', status: 'warning', summary: 'HTTP probe returned 503.', source: 'http', url: 'https://staging.example.test' },
				{ key: 'd1_migration', label: 'D1 migration', status: 'skipped', summary: 'No D1 migration result was reported.', source: 'sdk' },
			],
			urls: ['https://staging.example.test/'],
			warnings: ['HTTP probe returned 503.'],
		},
		prod: null,
	},
	activeOperations: [],
	recentDeployments: [
		{
			id: 'deployment-staging',
			projectId: 'project-1',
			environment: 'staging',
			action: 'deploy_web',
			status: 'succeeded',
			target: { url: 'https://staging.example.test' },
			externalWorkflow: { url: 'https://github.com/treeseed-ai/market/actions/runs/1' },
			summary: 'Staging deploy succeeded.',
			requestedByUserId: 'user-1',
			completedAt: '2026-05-01T10:10:00.000Z',
		},
	],
	readiness: {
		ready: true,
		blockers: [],
		checks: [
			{ code: 'repository_configured', label: 'GitHub repository configured', ready: true, message: 'Repository record is available.' },
			{ code: 'web_host_configured', label: 'Web host configured', ready: true, message: 'Web host target is known.' },
		],
	},
	actions: [
		{ environment: 'staging', action: 'deploy_web', available: true, blockedBy: [] },
		{ environment: 'staging', action: 'publish_content', available: true, blockedBy: [] },
		{ environment: 'staging', action: 'monitor', available: true, blockedBy: [] },
		{ environment: 'prod', action: 'deploy_web', available: false, blockedBy: [{ code: 'production_confirmation_required', message: 'Production deploy and publish require explicit confirmation.' }] },
		{ environment: 'prod', action: 'publish_content', available: false, blockedBy: [{ code: 'production_confirmation_required', message: 'Production deploy and publish require explicit confirmation.' }] },
		{ environment: 'prod', action: 'monitor', available: true, blockedBy: [] },
	],
	target: { provider: 'cloudflare', url: 'https://staging.example.test' },
};

describe('deployment view model', () => {
	it('renders deployment cards, actions, readiness, runner diagnostics, and history from the read model', () => {
		const vm = buildDeploymentViewModel(baseState, [
			{ id: 'event-2', sequence: 2, kind: 'deployment.workflow.dispatched', message: 'Workflow dispatched.', status: 'running', createdAt: '2026-05-01T10:06:00.000Z' },
			{ id: 'event-1', sequence: 1, kind: 'deployment.preflight.completed', message: 'Preflight completed.', status: 'running', createdAt: '2026-05-01T10:05:00.000Z' },
		]);

		expect(vm.project.name).toBe('Docs');
		expect(vm.readiness.ready).toBe(true);
		expect(vm.environments.map((environment) => environment.label)).toEqual(['Staging', 'Production']);
		expect(vm.environments[0].url).toBe('https://staging.example.test/');
		expect(vm.environments[0].monitorSummary).toBe('Monitor healthy.');
		expect(vm.environments[0].monitor.counts).toEqual({ passed: 1, warnings: 1, failed: 0, skipped: 1 });
		expect(vm.environments[0].monitor.checks[0]).toMatchObject({
			key: 'latest_workflow',
			tone: 'success',
			inspectCommand: 'gh run view 1 --repo treeseed-ai/market --log-failed',
		});
		expect(vm.runner).toMatchObject({ status: 'online', activeJobCount: '1' });
		expect(vm.timeline.map((event) => event.title)).toEqual(['Preflight completed', 'Workflow dispatched']);
		expect(vm.historyRows[0]).toMatchObject({ environment: 'Staging', action: 'Deploy web', status: 'Succeeded' });
		expect(vm.nextAction).toMatchObject({ code: 'deployment_ready', label: 'Deployment ready' });
	});

	it('treats production confirmation as an explicit form requirement rather than a readiness blocker', () => {
		const vm = buildDeploymentViewModel(baseState, []);
		const productionDeploy = vm.environments[1].actions.find((action) => action.action === 'deploy_web');

		expect(productionDeploy?.requiresProductionConfirmation).toBe(true);
		expect(productionDeploy?.disabled).toBe(false);
		expect(productionDeploy?.blockers).toEqual([]);
	});

	it('keeps empty readiness states calm and blocker-oriented', () => {
		const vm = buildDeploymentViewModel({
			...baseState,
			latestDeployments: { staging: null, prod: null },
			recentDeployments: [],
			runner: { status: 'stale', lastHeartbeatAt: '2026-05-01T09:00:00.000Z', capabilities: [], activeJobCount: null },
			readiness: {
				ready: false,
				blockers: [{ code: 'missing_repository', message: 'Repository records appear after launch completes.', href: '/app/projects/project-1/hosts' }],
				checks: [
					{ code: 'repository_configured', label: 'GitHub repository configured', ready: false, message: 'Repository records appear after launch completes.' },
				],
			},
			actions: baseState.actions.map((action) => ({
				...action,
				blockedBy: [{ code: 'missing_repository', message: 'Repository records appear after launch completes.' }],
			})),
		}, []);

		expect(vm.readiness.label).toBe('Blocked');
		expect(vm.environments[0].latestSummary).toBe('No deployment recorded.');
		expect(vm.runner.label).toBe('Stale');
		expect(vm.troubleshooting[0]).toMatchObject({ title: 'Missing repository' });
		expect(vm.historyRows).toEqual([]);
	});

	it('does not project secret or runtime-control fields from nested deployment metadata', () => {
		const vm = buildDeploymentViewModel(baseState, []);
		const serialized = JSON.stringify(vm);

		expect(serialized).not.toContain('hidden-token');
		expect(serialized).not.toContain('provider-secret');
		expect(serialized).not.toContain('capacityProviderId');
		expect(serialized).not.toContain('runnerToken');
	});

	it('surfaces launch recovery actions and inspect details without leaking runtime controls', () => {
		const vm = buildDeploymentViewModel({
			...baseState,
			launch: {
				status: 'failed',
				summary: 'GitHub workflow installation failed.',
				actions: [
					{ action: 'retry_launch', label: 'Retry launch', method: 'POST', url: '/v1/jobs/job-1/retry', description: 'Queue the original launch job again.' },
					{ action: 'resume_launch', label: 'Resume launch', method: 'POST', url: '/v1/jobs/job-1/resume', description: 'Resume from the last durable phase.' },
				],
				inspect: { summary: 'Workflow missing.', command: 'gh run view 123 --repo owner/repo --log-failed' },
				events: [{ id: 'launch-failed', title: 'Workflow failed', summary: 'Workflow missing.', status: 'failed', createdAt: '2026-05-01T10:00:00.000Z' }],
				error: { summary: 'Workflow missing.', runtimeHostId: 'forbidden' },
			},
			nextAction: {
				code: 'launch_recovery',
				label: 'Launch failed',
				description: 'GitHub workflow installation failed.',
				action: 'retry_launch',
				environment: null,
			},
		}, []);

		expect(vm.launch.actions.map((action) => action.action)).toEqual(['retry_launch', 'resume_launch']);
		expect(vm.launch.inspect?.command).toContain('gh run view');
		expect(vm.nextAction).toMatchObject({ code: 'launch_recovery', tone: 'danger' });
		expect(JSON.stringify(vm)).not.toContain('runtimeHostId');
	});

	it('makes the first staging deployment obvious after launch completes', () => {
		const vm = buildDeploymentViewModel({
			...baseState,
			latestDeployments: { staging: null, prod: null },
			recentDeployments: [],
			nextAction: {
				code: 'deploy_staging',
				label: 'Deploy staging',
				description: 'Launch is complete. Queue the first staging deployment.',
				action: 'deploy_web',
				environment: 'staging',
			},
		}, []);

		expect(vm.nextAction).toMatchObject({ code: 'deploy_staging', action: 'deploy_web', environment: 'staging', tone: 'success' });
		expect(vm.troubleshooting[0]).toMatchObject({ title: 'No deployment history yet' });
	});

	it('normalizes deployment activity and terminal status helpers', () => {
		expect(isDeploymentActive('running')).toBe(true);
		expect(isDeploymentActive('succeeded')).toBe(false);
		expect(isDeploymentTerminal('succeeded')).toBe(true);
		expect(isDeploymentTerminal('queued')).toBe(false);
		expect(buildDeploymentTimeline([
			{ id: 'late', sequence: 3, kind: 'deployment.succeeded', message: 'Done.', status: 'succeeded' },
			{ id: 'early', sequence: 1, kind: 'deployment.requested', message: 'Requested.', status: 'queued' },
		]).map((event) => event.id)).toEqual(['early', 'late']);
	});
});
