import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CapacityAllocationService } from '../../packages/api/src/api/capacity/services/allocation-service.ts';
import { CapacityGrantService } from '../../packages/api/src/api/capacity/services/grant-service.ts';
import { leaseNextProviderAssignment } from '../../packages/api/src/api/capacity/services/assignment-lease-service.ts';
import { ProviderAssignmentLifecycleService } from '../../packages/api/src/api/capacity/services/assignment-lifecycle-service.ts';
import { reportCapacityUsage } from '../../packages/api/src/api/capacity/services/usage-report-service.ts';
import { settleCapacityReservationExactlyOnce } from '../../packages/api/src/api/capacity/services/settlement-service.ts';
import { tickCapacityWorkdayRun } from '../../packages/api/src/api/capacity/services/workday-tick-service.ts';
import { runAgentTestCatalogChecks } from '../../packages/agent/src/agents/testing/agent-test-catalog.ts';
import { compileResearchAgentTestDefinition } from '../../packages/agent/src/agents/testing/research-agent-test-definition.ts';
import { DeterministicToolExecutionProviderAdapter, type DeterministicExecutionStep } from '../../packages/agent/src/agents/testing/deterministic-tool-provider.ts';
import { resolveProviderConfig } from '../../packages/agent/src/provider/config.ts';
import { runProviderRunnerOnce } from '../../packages/agent/src/provider/runner-lifecycle.ts';
import {
	createServiceWorkflowDatabaseHarness,
	createServiceWorkflowFixture,
	createServiceWorkflowTreeDxFetch,
	removeServiceWorkflowFixture,
	serviceWorkflowJson,
} from './capacity-service-workflow-harness.ts';

const roots: string[] = [];
const questionId = 'what-should-this-research-map-first';
const objectiveId = 'publish-the-first-knowledge-pack';
const sourcePolicy = {
	schemaVersion: 1 as const,
	allowedDomains: ['example.com', 'iana.org'],
	requestTimeoutMs: 10_000,
	maxResponseBytes: 100_000,
	maxRedirects: 0,
	allowedContentTypes: ['application/json', 'text/plain'],
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	for (const root of roots.splice(0)) removeServiceWorkflowFixture(root);
});

function citation(id: string, sourceUrl: string, publisher: string, body: string) {
	return {
		sourceUrl, title: `Capacity source ${id}`, publisher,
		retrievedAt: '2026-07-18T00:00:00.000Z',
		contentHash: `sha256:${createHash('sha256').update(body).digest('hex')}`,
		claimIds: ['claim-1', 'claim-2'], confidence: 'high' as const,
	};
}

describe('research capacity service workflow', () => {
	it('runs governed multi-source research through rejection, revision, approval, publication, reporting, usage, and settlement', async () => {
		const fixture = createServiceWorkflowFixture({ templatePath: 'starters/research/template', temporaryPrefix: 'treeseed-research-service-' });
		roots.push(fixture.root);
		const { database, store } = createServiceWorkflowDatabaseHarness();
		const now = new Date().toISOString();
		const principal = { membershipId: 'membership-research', teamId: 'team-research', capacityProviderId: 'provider-research' };
		const workspaceFiles = new Map<string, string>();
		const primaryBody = 'Primary evidence: allocation enforcement requires durable admission records.';
		const secondaryBody = 'Contrary evidence: unique durable keys alone are insufficient without transaction boundaries.';
		const citations = [
			citation('one', 'https://example.com/source-one', 'Example Primary', primaryBody),
			citation('two', 'https://iana.org/source-two', 'IANA Secondary', secondaryBody),
		];
		vi.stubEnv('TREESEED_RESEARCH_SEARCH_ENDPOINT', 'https://example.com/search');
		vi.stubGlobal('fetch', createServiceWorkflowTreeDxFetch({
			repoRoot: fixture.root,
			workspaceFiles,
			externalRequest: (url) => {
				if (url.href.startsWith('https://example.com/search')) return serviceWorkflowJson({ results: [
					{ url: citations[0]!.sourceUrl, title: citations[0]!.title, publisher: citations[0]!.publisher, summary: primaryBody },
					{ url: citations[1]!.sourceUrl, title: citations[1]!.title, publisher: citations[1]!.publisher, summary: secondaryBody },
				] });
				if (url.href === citations[0]!.sourceUrl) return new Response(primaryBody, { headers: { 'content-type': 'text/plain' } });
				if (url.href === citations[1]!.sourceUrl) return new Response(secondaryBody, { headers: { 'content-type': 'text/plain' } });
				return null;
			},
		}));
		try {
			await store.ensureInitialized();
			const catalog = await runAgentTestCatalogChecks({ repoRoot: fixture.root, reportPath: resolve(fixture.root, '.treeseed/test-reports/agent-test-catalog.md'), now: new Date(now) });
			expect(catalog.ok).toBe(true);
			expect(compileResearchAgentTestDefinition(catalog.entries[0]!)).toMatchObject({ minimumIndependentSources: 2, requireUnsupportedClaimRevision: true });
			await store.run(`INSERT INTO teams (id, slug, name, created_at, updated_at) VALUES ('team-research', 'team-research', 'Research Team', ?, ?)`, [now, now]);
			const projectMetadata = {
				architecture: { topology: 'single_repository_site', rootPath: '.', sitePath: '.', contentPath: 'src/content', contentRuntimeSource: 'local_directory', localContentMaterialization: 'existing_path' },
				repository: { provider: 'git', owner: 'local', name: 'research-fixture', defaultBranch: 'main', cloneUrl: fixture.root, checkoutPath: '.' },
				agentSpecs: { root: 'src/content/agents', testsRoot: 'src/content/agent-tests' },
			};
			await store.run(`INSERT INTO projects (id, team_id, slug, name, metadata_json, created_at, updated_at) VALUES ('project-research', 'team-research', 'project-research', 'Research Project', ?, ?, ?)`, [JSON.stringify(projectMetadata), now, now]);
			for (const definition of [
				{ classSlug: 'research', agent: 'researcher', activity: 'planning', handler: 'writer', mutations: ['linked_note:create'], artifactKind: 'research_evidence' },
				{ classSlug: 'review', agent: 'reviewer', activity: 'reviewing', handler: 'writer', mutations: ['linked_note:create'], artifactKind: 'citation_review' },
				{ classSlug: 'technical-writing', agent: 'technical-writer', activity: 'planning', handler: 'writer', mutations: ['knowledge:create'], artifactKind: 'knowledge_page' },
				{ classSlug: 'reporting', agent: 'reporter', activity: 'reporting', handler: 'reporter', mutations: ['workday_report:create'], artifactKind: 'workday_summary' },
			] as const) {
				const handlerRefs = { agents: [{ slug: definition.agent, activities: { [definition.activity]: {
					handler: definition.handler, planningPriority: 50,
					outputs: { modelMutations: definition.mutations },
					planningIntent: { artifactKind: definition.artifactKind, subjectModel: 'question', subjectId: questionId, includeWorkdayArtifacts: definition.agent === 'reporter' },
				} } }] };
				await store.run(`INSERT INTO project_agent_classes (id, team_id, project_id, slug, name, status, allowed_modes_json, required_capabilities_json, kernel_profile_json, kernel_policy_json, handler_refs_json, output_contracts_json, metadata_json, created_at, updated_at) VALUES (?, 'team-research', 'project-research', ?, ?, 'active', '["planning"]', '["research"]', '{}', '{}', ?, '{}', '{}', ?, ?)`,
					[`project-research:${definition.classSlug}`, definition.classSlug, definition.classSlug, JSON.stringify(handlerRefs), now, now]);
			}
			await store.run(`INSERT INTO capacity_workday_runs (id, team_id, capacity_provider_id, scenario_id, status, environment, parameters_json, summary_json, metrics_json, expected_json, actual_json, report_refs_json, error_json, started_at, created_at, updated_at) VALUES ('run-research', 'team-research', 'provider-research', 'research', 'running', 'local', ?, '{}', '{}', '{}', '{}', '{}', '{}', ?, ?, ?)`, [JSON.stringify({ projects: ['project-research'], planningOnly: true, durationSeconds: 3600 }), now, now, now]);
			await store.createWorkdayCapacityEnvelope({ id: 'workday-research', workdayRunId: 'run-research', projectId: 'project-research', status: 'active', startedAt: now, availableCredits: 64 });
			await store.run(`INSERT INTO capacity_providers (id, fingerprint, public_jwk_json, display_name, identity_version, status, metadata_json, created_at, updated_at) VALUES ('provider-research', 'sha256:provider-research', '{}', 'Research Provider', 1, 'active', '{}', ?, ?)`, [now, now]);
			await store.run(`INSERT INTO capacity_provider_team_memberships (id, team_id, capacity_provider_id, status, approved_at, approved_by_id, metadata_json, created_at, updated_at) VALUES ('membership-research', 'team-research', 'provider-research', 'approved', ?, 'owner', '{}', ?, ?)`, [now, now, now]);
			const session = await store.createProviderAvailabilitySession(principal, {
				id: 'session-research', environment: 'local', capabilities: ['research'],
				executionProviders: [{ id: 'deterministic-tool', adapter: 'deterministic', capabilities: ['research'], maxConcurrentRunners: 1, nativeLimits: { availableCredits: 64 } }],
				nativeLimits: { availableCredits: 64, maxConcurrentRunners: 1 }, runnerPressure: { activeRunners: 0, maxConcurrentRunners: 1 }, constraints: { availableCredits: 64, activeRunners: 0, maxConcurrentRunners: 1 },
			});
			const allocation = new CapacityAllocationService(store);
			await allocation.create('team-research', { id: 'allocation-research', reservePolicy: { percent: 0, overflow: 'deny' }, slices: [{ id: 'project:project-research', scope: 'project', targetId: 'project-research', policy: { minPercent: 0, targetPercent: 100, maxPercent: 100, hardCapPercent: 100 } }], borrowingRules: [] }, null, 'research:allocation:create');
			await allocation.activate('team-research', 'allocation-research', 'research:allocation:activate');
			const grants = new CapacityGrantService(store);
			await grants.create('team-research', { id: 'grant-research', membershipId: principal.membershipId, projectId: 'project-research', environment: 'local', executionProviderIds: ['deterministic-tool'], capabilities: ['research'], allowedModes: ['planning'], dailyCreditLimit: 64, monthlyCreditLimit: 128, maxConcurrentAssignments: 1 }, 'research:grant:create');
			await grants.transition('team-research', 'grant-research', 'active', 'research:grant:activate');
			await store.run(`UPDATE workday_capacity_envelopes SET allocation_set_id = 'allocation-research', metadata_json = '{"grantId":"grant-research"}' WHERE id = 'workday-research'`);
			await store.createResearchWorkflow('project-research', { id: 'research-workflow-a', objectiveRef: `objective:${objectiveId}`, questionRef: `question:${questionId}`, idempotencyKey: 'research-workflow:a' });
			(store as unknown as { createCapacityWorkdayTreeDxWorkspace: (...args: unknown[]) => Promise<Record<string, unknown>> }).createCapacityWorkdayTreeDxWorkspace = async () => ({ workspaceId: 'workspace-research' });

			const lifecycle = new ProviderAssignmentLifecycleService(store);
			type LeasedAssignment = NonNullable<Awaited<ReturnType<typeof leaseNextProviderAssignment>>['assignment']>;
			const clientFor = (assignment: LeasedAssignment) => ({
				nextAssignment: async () => ({ ok: true, payload: null }),
				createAssignmentModeRun: async (id: string, body: Record<string, unknown>) => ({ ok: true, payload: await store.createAgentModeRun({ ...body, teamId: principal.teamId, providerAssignmentId: id }) }),
				renewAssignment: async (id: string, body: Record<string, unknown>) => { const result = await lifecycle.renew(principal, id, body); return { ok: true, payload: result?.assignment ?? null }; },
				reportAssignmentUsage: async (id: string, body: Record<string, unknown>, key: string) => reportCapacityUsage(store, { ...body, idempotencyKey: key, source: 'research-service-workflow', teamId: principal.teamId, membershipId: principal.membershipId, reservationId: assignment.reservationId!, assignmentId: id } as never),
				settleAssignment: async (id: string, body: Record<string, unknown>, key: string) => settleCapacityReservationExactlyOnce(store, { ...body, settlementKey: key, source: 'research-service-workflow', teamId: principal.teamId, membershipId: principal.membershipId, reservationId: assignment.reservationId!, assignmentId: id } as never),
				completeAssignment: async (id: string, body: Record<string, unknown>) => { const result = await lifecycle.complete(principal, id, body); return { ok: true, payload: result?.assignment ?? null }; },
				failAssignment: async (id: string, body: Record<string, unknown>) => { const result = await lifecycle.fail(principal, id, body); return { ok: true, payload: result?.assignment ?? null }; },
			});
			const hostConfig = resolveProviderConfig({ env: { TREESEED_PROVIDER_DATA_DIR: resolve(fixture.root, '.provider'), TREESEED_PROVIDER_ENVIRONMENT: 'local', TREESEED_PROVIDER_WORKSPACE_ROOT: fixture.root, HOME: fixture.root } });

			const stepsFor = (assignment: LeasedAssignment, stage: string | null): DeterministicExecutionStep[] => {
				const relations = [{ field: 'relatedQuestions', targetModel: 'question', targetSlug: questionId }];
				const note = (title: string): DeterministicExecutionStep => ({ kind: 'tool', toolId: 'treeseed.content.create', input: { model: 'note', title, body: `${title} completed with durable research evidence.`, relations } });
				if (!stage) {
					const contribution = assignment.agentId === 'technical-writer'
						? { kind: 'tool' as const, toolId: 'treeseed.content.create', input: { model: 'knowledge', title: 'Research knowledge planning contribution', body: 'The technical writer structured a bounded knowledge contribution.', relations } }
						: note(`${assignment.agentId} fair-participation planning`);
					return [contribution, { kind: 'output', verification: { status: 'passed', summary: 'Useful planning contribution completed.' } }];
				}
				const common: DeterministicExecutionStep[] = [note(`Research ${stage}`)];
				if (stage === 'question-decomposition') common[0] = { kind: 'tool', toolId: 'treeseed.content.create', input: { model: 'question', title: 'What should this research map first', body: 'Which capacity governance and settlement guarantees are supported by independent evidence?', relations } };
				if (stage === 'governed-source-search') common.unshift({ kind: 'tool', toolId: 'research.search_sources', input: { query: 'reliable capacity governance and settlement', maxResults: 5 } });
				if (stage === 'independent-source-fetch') common.unshift(
					{ kind: 'tool', toolId: 'research.fetch_source', input: { url: citations[0]!.sourceUrl } },
					{ kind: 'tool', toolId: 'research.fetch_source', input: { url: citations[1]!.sourceUrl } },
				);
				if (stage === 'linked-evidence-notes') {
					common[0] = { kind: 'tool', toolId: 'treeseed.content.create', input: { model: 'note', title: 'Research evidence one', body: primaryBody, fields: { citations: [citations[0]] }, relations } };
					common.push({ kind: 'tool', toolId: 'treeseed.content.create', input: { model: 'note', title: 'Research evidence two', body: secondaryBody, fields: { citations: [citations[1]] }, relations } });
				}
				if (stage === 'cited-knowledge-publication') common[0] = { kind: 'tool', toolId: 'treeseed.content.create', input: { model: 'knowledge', title: 'Reliable capacity governance evidence', body: 'Durable admission is supported. The sources disagree with the overbroad claim that unique keys alone suffice; transaction boundaries remain required.', fields: { citations }, relations } };
				if (stage === 'workday-report') common[0] = note('Research workday summary');
				const outputs: Record<string, unknown> = {};
				if (stage === 'independent-source-fetch') outputs.citations = citations;
				if (stage === 'claim-synthesis') outputs.signals = [{ code: 'research_claim', severity: 'warning', message: 'Unsupported fixture claim.', metadata: { id: 'claim-1', text: 'Durable admission and unique settlement keys are required.', material: true, status: 'unsupported', citationIds: [] } }];
				if (stage === 'citation-review-rejection') outputs.signals = [{ code: 'research_review_rejected', severity: 'warning', message: 'The material claim lacks attached citation evidence.' }];
				if (stage === 'revision') outputs.signals = [
					{ code: 'research_claim', severity: 'info', message: 'Claim revised with evidence.', metadata: { id: 'claim-1', text: 'Durable admission and transactional settlement are supported by the evidence records.', material: true, status: 'supported', citationIds: ['one', 'two'] } },
					{ code: 'research_claim', severity: 'warning', message: 'Contradictory evidence retained.', metadata: { id: 'claim-2', text: 'Unique durable keys alone are sufficient for settlement.', material: true, status: 'contradicted', citationIds: ['one', 'two'] } },
				];
				if (stage === 'citation-review-approval') outputs.signals = [{ code: 'research_review_approved', severity: 'info', message: 'The revised claim is independently supported.' }];
				common.push({ kind: 'output', outputs, verification: { status: 'passed', summary: `${stage} completed.` } });
				return common;
			};

			const completedAgents: string[] = [];
			for (let index = 0; index < 64; index += 1) {
				const workflow = await store.getResearchWorkflow('research-workflow-a');
				if (workflow?.status === 'completed') break;
				await tickCapacityWorkdayRun(store, principal.teamId, 'run-research', new Date(Date.parse(now) + index * 1_000).toISOString(), `tick-research-${index}`);
				const lease = await leaseNextProviderAssignment(store, principal, { providerSessionId: session.id, runnerId: 'runner-research', leaseSeconds: 300 });
				if (!lease.assignment) throw new Error(JSON.stringify({ diagnostics: lease.diagnostics, workflow, demands: await store.all(`SELECT source_type, source_id, status, payload_json FROM capacity_workday_demands ORDER BY created_at`) }, null, 2));
				const demand = await store.first(`SELECT source_type, payload_json FROM capacity_workday_demands WHERE assignment_id = ?`, [lease.assignment.id]);
				const payload = demand?.payload_json ? JSON.parse(String(demand.payload_json)) as Record<string, unknown> : {};
				const stage = demand?.source_type === 'research-workflow' ? String(payload.researchStage) : null;
				const adapter = new DeterministicToolExecutionProviderAdapter({ repoRoot: fixture.root, apiBaseUrl: 'https://api.fixture.test', providerAccessToken: 'membership-token', researchSourcePolicy: sourcePolicy, steps: () => stepsFor(lease.assignment!, stage) });
				const result = await runProviderRunnerOnce({
					config: { ...hostConfig, connectionId: 'connection-research', marketUrl: 'https://api.fixture.test', marketAudience: 'https://api.fixture.test', teamId: principal.teamId, providerId: principal.capacityProviderId, membershipId: principal.membershipId, accessToken: 'membership-token', executionProviders: [{ id: 'deterministic-tool', adapter: 'deterministic', nativeLimits: { maxConcurrentRunners: 1 }, researchSourcePolicy: sourcePolicy }] },
					client: clientFor(lease.assignment), runnerId: 'runner-research', leasedAssignment: { ok: true, leaseToken: lease.leaseToken, leaseSeconds: lease.leaseSeconds, payload: lease.assignment }, executionAdapter: adapter,
				});
				expect(result).toMatchObject({ ok: true, assigned: 1 });
				const terminal = await store.getProviderAssignment(principal.teamId, lease.assignment.id);
				if (terminal?.status !== 'completed') throw new Error(JSON.stringify({ stage, result, terminal }, null, 2));
				completedAgents.push(String(lease.assignment.agentId));
			}

			const completed = await store.getResearchWorkflow('research-workflow-a');
			expect(completed).toMatchObject({ status: 'completed', reviewerRejectedUnsupportedClaims: true, reviewerApprovedRevision: true, revisionCount: 1 });
			expect(completed?.citations).toHaveLength(2);
			expect(completed?.claims).toContainEqual(expect.objectContaining({ id: 'claim-2', status: 'contradicted' }));
			expect(completed?.nodes.map((node) => node.stage)).toEqual(expect.arrayContaining(['citation-review-rejection', 'revision', 'citation-review-approval', 'cited-knowledge-publication', 'workday-report']));
			expect(new Set(completedAgents.slice(0, 4))).toEqual(new Set(['researcher', 'reviewer', 'technical-writer', 'reporter']));
			const assignmentCount = await store.first(`SELECT COUNT(*) AS count FROM capacity_provider_assignments WHERE status = 'completed'`);
			expect(assignmentCount).toEqual({ count: completedAgents.length });
			expect(await store.first(`SELECT COUNT(*) AS count FROM capacity_ledger_entries WHERE phase = 'task_completed_actual_settlement'`)).toEqual({ count: completedAgents.length });
			expect(await store.first(`SELECT COUNT(*) AS count FROM capacity_provider_assignments WHERE status IN ('leased','accepted','running')`)).toEqual({ count: 0 });
			expect(await store.first(`SELECT COUNT(*) AS count FROM capacity_reservations WHERE state = 'reserved'`)).toEqual({ count: 0 });
			const researchToolEvents = await store.all(`SELECT outputs_json FROM agent_mode_runs WHERE outputs_json LIKE '%research.%'`);
			expect(researchToolEvents.length).toBeGreaterThanOrEqual(2);
			expect(workspaceFiles.get('src/content/notes/research-evidence-one.mdx')).toContain(citations[0]!.sourceUrl);
			expect(workspaceFiles.get('src/content/notes/research-evidence-two.mdx')).toContain(citations[1]!.sourceUrl);
			const knowledgePath = [...workspaceFiles.keys()].find((path) => path.includes('reliable-capacity-governance-evidence'));
			expect(knowledgePath).toBeDefined();
			expect(workspaceFiles.get(knowledgePath!)).toContain(citations[1]!.sourceUrl);
			expect([...workspaceFiles.keys()].filter((path) => path.includes('research-workday-summary'))).toHaveLength(1);
		} finally {
			await database.close();
		}
	}, 180_000);
});
