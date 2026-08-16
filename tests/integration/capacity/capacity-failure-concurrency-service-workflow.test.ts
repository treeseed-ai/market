import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { CapacityAdmissionInput } from '@treeseed/sdk/agent-capacity/allocation';
import { describe, expect, it } from 'vitest';
import { ProviderLocalCapacityStore } from '../../../packages/agent/src/provider/capacity/capacity-core/local-capacity-store.ts';
import { CapacityGovernanceRepository } from '../../../packages/api/src/api/capacity/repositories/governance/policy/governance.ts';
import { CapacitySecretCodec } from '../../../packages/api/src/api/capacity/security.ts';
import { commitCapacityAdmission } from '../../../packages/api/src/api/capacity/services/support/admission-service.ts';
import { recoverExpiredProviderAssignments } from '../../../packages/api/src/api/capacity/services/capacity/assignments/lifecycle/assignment-recovery-service.ts';
import { CapacityRegistrationService } from '../../../packages/api/src/api/capacity/services/support/registration-service.ts';
import { settleCapacityReservationExactlyOnce } from '../../../packages/api/src/api/capacity/services/capacity/accounting/settlement-service.ts';
import { resolveWorkdayPlanningGraphSnapshot } from '../../../packages/api/src/api/capacity/services/capacity/workdays/policy/workday-planning-graph-policy.ts';
import { createServiceWorkflowDatabaseHarness } from '../../support/capacity/service-workflow-harness.ts';

type ServiceStore = ReturnType<typeof createServiceWorkflowDatabaseHarness>['store'];

function stableJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
	if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
	return JSON.stringify(value) ?? 'null';
}

async function policyFingerprint(store: ServiceStore) {
	const [allocation, grants] = await Promise.all([
		store.first(`SELECT version, status, effective_from, effective_until, reserve_policy_json, slices_json, borrowing_rules_json, metadata_json FROM capacity_allocation_sets WHERE id = 'matrix-allocation'`),
		store.all(`SELECT id, status, execution_provider_ids_json, lane_ids_json, capabilities_json, allowed_modes_json, daily_agent_seconds_limit, monthly_agent_seconds_limit, max_concurrent_assignments, unmetered, metadata_json FROM capacity_grants WHERE id IN ('matrix-grant-a','matrix-grant-b','matrix-backup-grant-a') ORDER BY id`),
	]);
	return createHash('sha256').update(stableJson({ allocation, grants })).digest('hex');
}

function admission(project: 'a' | 'b', now: string): CapacityAdmissionInput {
	const projectId = `matrix-project-${project}`;
	const grantId = `matrix-grant-${project}`;
	const workdayId = `matrix-workday-${project}`;
	const classId = `matrix-class-${project}`;
	const sliceId = `project:${projectId}`;
	return {
		now,
		request: {
			teamId: 'matrix-team', providerId: 'matrix-provider', membershipId: 'matrix-membership',
			projectId, environment: 'local', agentClassId: classId, mode: 'planning',
			executionProviderId: 'matrix-execution', laneId: 'matrix-lane', requiredCapabilities: ['engineering'], requestedSeconds: 1,
		},
		membership: { id: 'matrix-membership', teamId: 'matrix-team', providerId: 'matrix-provider', status: 'approved' },
		availability: { status: 'open', availableFrom: now, availableUntil: '2099-01-01T00:00:00.000Z' },
		grant: {
			schemaVersion: 2, id: grantId, membershipId: 'matrix-membership', teamId: 'matrix-team', providerId: 'matrix-provider',
			projectId, environment: 'local', status: 'active', executionProviderIds: ['matrix-execution'], laneIds: ['matrix-lane'],
			capabilities: ['engineering'], allowedModes: ['planning'], dailyAgentSecondsLimit: 10, monthlyAgentSecondsLimit: 20,
			maxConcurrentAssignments: 1, unmetered: false,
		},
		workday: { id: workdayId, status: 'active', totalSeconds: 10, committedSeconds: 0 },
		allocationSet: {
			schemaVersion: 2, id: 'matrix-allocation', teamId: 'matrix-team', version: 1, status: 'active', effectiveFrom: now,
			reservePolicy: { percent: 0, overflow: 'deny' },
			slices: ['a', 'b'].map((suffix) => ({
				id: `project:matrix-project-${suffix}`, scope: 'project' as const, targetId: `matrix-project-${suffix}`,
				policy: { minPercent: 0, targetPercent: 50, maxPercent: 50, hardCapPercent: 50 },
			})),
			borrowingRules: [],
		},
		allocationSliceIds: [sliceId], committedSecondsBySlice: { [sliceId]: 0 },
		providerCapacity: { availableAgentSeconds: 10, availableConcurrentAssignments: 2 },
		providerLocalLimits: { availableAgentSeconds: 10, availableConcurrentAssignments: 2 },
		grantCommitted: { dailyAgentSeconds: 0, monthlyAgentSeconds: 0, activeAssignments: 0 },
	};
}

async function seedMatrix(store: ServiceStore, now: string) {
	await store.run(`INSERT INTO teams (id, slug, name, created_at, updated_at) VALUES ('matrix-team','matrix-team','Matrix-Team',?,?)`, [now, now]);
	await store.run(`INSERT INTO capacity_providers (id, fingerprint, public_jwk_json, display_name, identity_version, status, metadata_json, created_at, updated_at) VALUES ('matrix-provider','sha256:matrix-provider','{}','Matrix Provider',1,'active','{}',?,?)`, [now, now]);
	await store.run(`INSERT INTO capacity_provider_team_memberships (id, team_id, capacity_provider_id, status, approved_at, approved_by_id, metadata_json, created_at, updated_at) VALUES ('matrix-membership','matrix-team','matrix-provider','approved',?,'matrix-owner','{}',?,?)`, [now, now, now]);
	await store.run(`INSERT INTO capacity_execution_providers (id, capacity_provider_id, display_name, adapter, status, capabilities_json, native_unit, quota_visibility, max_concurrent_runners, native_limits_json, metadata_json, created_at, updated_at) VALUES ('matrix-execution','matrix-provider','Matrix Execution','codex','active','["engineering"]','wall_second','exact',1,'[]','{}',?,?)`, [now, now]);
	await store.run(`INSERT INTO capacity_provider_lanes (id, capacity_provider_id, execution_provider_id, display_name, status, capabilities_json, max_concurrent_runners, native_limits_json, metadata_json, created_at, updated_at) VALUES ('matrix-lane','matrix-provider','matrix-execution','Matrix Lane','active','["engineering"]',1,'[]','{}',?,?)`, [now, now]);
	await store.run(`INSERT INTO capacity_providers (id, fingerprint, public_jwk_json, display_name, identity_version, status, metadata_json, created_at, updated_at) VALUES ('matrix-backup-provider','sha256:matrix-backup-provider','{}','Matrix Backup Provider',1,'active','{}',?,?)`, [now, now]);
	await store.run(`INSERT INTO capacity_provider_team_memberships (id, team_id, capacity_provider_id, status, approved_at, approved_by_id, metadata_json, created_at, updated_at) VALUES ('matrix-backup-membership','matrix-team','matrix-backup-provider','approved',?,'matrix-owner','{}',?,?)`, [now, now, now]);
	await store.run(`INSERT INTO capacity_execution_providers (id, capacity_provider_id, display_name, adapter, status, capabilities_json, native_unit, quota_visibility, max_concurrent_runners, native_limits_json, metadata_json, created_at, updated_at) VALUES ('matrix-backup-execution','matrix-backup-provider','Matrix Backup Execution','codex','active','["engineering"]','wall_second','exact',1,'[]','{}',?,?)`, [now, now]);
	await store.run(`INSERT INTO capacity_provider_lanes (id, capacity_provider_id, execution_provider_id, display_name, purpose, status, capabilities_json, max_concurrent_runners, native_limits_json, metadata_json, created_at, updated_at) VALUES ('matrix-backup-operation-lane','matrix-backup-provider','matrix-backup-execution','Matrix Backup Operation Lane','operation','active','["engineering"]',1,'[]','{}',?,?)`, [now, now]);
	await store.run(`INSERT INTO capacity_workday_runs (id, team_id, capacity_provider_id, scenario_id, status, environment, parameters_json, started_at, created_at, updated_at) VALUES ('matrix-run','matrix-team','matrix-provider','failure-matrix','running','local','{"projects":["matrix-project-a","matrix-project-b"]}',?,?,?)`, [now, now, now]);
	for (const suffix of ['a', 'b']) {
		await store.run(`INSERT INTO projects (id, team_id, slug, name, metadata_json, created_at, updated_at) VALUES (?, 'matrix-team', ?, ?, '{"architecture":{"topology":"single_repository_site","rootPath":".","sitePath":".","contentPath":"knowledge-models","contentRuntimeSource":"local_directory","localContentMaterialization":"existing_path"}}', ?, ?)`, [`matrix-project-${suffix}`, `matrix-project-${suffix}`, `Matrix Project ${suffix.toUpperCase()}`, now, now]);
		await store.run(`INSERT INTO project_agent_classes (id, team_id, project_id, slug, name, status, allowed_modes_json, required_capabilities_json, kernel_profile_json, kernel_policy_json, handler_refs_json, output_contracts_json, metadata_json, created_at, updated_at) VALUES (?, 'matrix-team', ?, 'engineer', 'Engineer', 'active', '["planning"]', '["engineering"]', '{}', '{}', ?, '{}', '{}', ?, ?)`, [`matrix-class-${suffix}`, `matrix-project-${suffix}`, JSON.stringify({ agents: [{ slug: `matrix-agent-${suffix}`, activities: { planning: { handler: 'writer', purpose: 'Exercise provider failure recovery.' } } }] }), now, now]);
	}
	await store.run(`INSERT INTO capacity_allocation_sets (id, team_id, version, status, effective_from, reserve_policy_json, slices_json, borrowing_rules_json, metadata_json, created_at, updated_at) VALUES ('matrix-allocation','matrix-team',1,'active',?,'{"percent":0,"overflow":"deny"}','[{"id":"project:matrix-project-a","scope":"project","targetId":"matrix-project-a","policy":{"minPercent":0,"targetPercent":50,"maxPercent":50,"hardCapPercent":50}},{"id":"project:matrix-project-b","scope":"project","targetId":"matrix-project-b","policy":{"minPercent":0,"targetPercent":50,"maxPercent":50,"hardCapPercent":50}}]','[]','{}',?,?)`, [now, now, now]);
	for (const suffix of ['a', 'b']) {
		await store.run(`INSERT INTO capacity_grants (id, membership_id, capacity_provider_id, team_id, project_id, environment, status, execution_provider_ids_json, lane_ids_json, capabilities_json, allowed_modes_json, daily_agent_seconds_limit, monthly_agent_seconds_limit, max_concurrent_assignments, unmetered, metadata_json, created_at, updated_at) VALUES (?, 'matrix-membership','matrix-provider','matrix-team',?,'local','active','["matrix-execution"]','["matrix-lane"]','["engineering"]','["planning"]',10,20,1,0,'{}',?,?)`, [`matrix-grant-${suffix}`, `matrix-project-${suffix}`, now, now]);
		await store.run(`INSERT INTO workday_capacity_envelopes (id, team_id, project_id, workday_run_id, allocation_set_id, status, started_at, envelope_json, metadata_json, created_at, updated_at) VALUES (?, 'matrix-team', ?, 'matrix-run', 'matrix-allocation', 'active', ?, '{"availableSeconds":10}', ?, ?, ?)`, [`matrix-workday-${suffix}`, `matrix-project-${suffix}`, now, JSON.stringify({ grantId: `matrix-grant-${suffix}` }), now, now]);
	}
	await store.run(`INSERT INTO capacity_grants (id, membership_id, capacity_provider_id, team_id, project_id, environment, status, execution_provider_ids_json, lane_ids_json, capabilities_json, allowed_modes_json, daily_agent_seconds_limit, monthly_agent_seconds_limit, max_concurrent_assignments, unmetered, metadata_json, created_at, updated_at) VALUES ('matrix-backup-grant-a','matrix-backup-membership','matrix-backup-provider','matrix-team','matrix-project-a','local','active','["matrix-backup-execution"]','["matrix-backup-operation-lane"]','["engineering"]','["planning"]',10,20,1,0,'{}',?,?)`, [now, now]);
	await store.run(`INSERT INTO capacity_provider_availability_sessions (id, membership_id, team_id, capacity_provider_id, environment, status, sequence, opened_at, refreshed_at, expires_at, available_from, available_until, execution_providers_json, capabilities_json, native_limits_json, runner_pressure_json, constraints_json, metadata_json, created_at, updated_at) VALUES ('matrix-session','matrix-membership','matrix-team','matrix-provider','local','open',1,?,?,?,?,'2099-01-01T00:00:00.000Z','[{"id":"matrix-execution","status":"available","capabilities":["engineering"],"reliability":1,"pressure":"normal","availableConcurrency":1}]','["engineering"]','{"availableAgentSeconds":10,"maxConcurrentRunners":1}','{"activeRunners":0,"maxConcurrentRunners":1}','{"availableAgentSeconds":10}','{}',?,?)`, [now, now, '2099-01-01T00:00:00.000Z', now, now, now]);
	await store.run(`INSERT INTO capacity_provider_availability_sessions (id, membership_id, team_id, capacity_provider_id, environment, status, sequence, opened_at, refreshed_at, expires_at, available_from, available_until, execution_providers_json, capabilities_json, native_limits_json, runner_pressure_json, constraints_json, metadata_json, created_at, updated_at) VALUES ('matrix-backup-session','matrix-backup-membership','matrix-team','matrix-backup-provider','local','open',1,?,?,?,?,'2099-01-01T00:00:00.000Z','[{"id":"matrix-backup-execution","status":"available","capabilities":["engineering"],"reliability":1,"pressure":"normal","availableConcurrency":1,"maxConcurrentRunners":1,"lanes":[{"id":"matrix-backup-operation-lane","purpose":"operation","maxConcurrentRunners":1,"capabilities":["engineering"]}]}]','["engineering"]','{"availableAgentSeconds":10,"maxConcurrentRunners":1}','{"activeRunners":0,"maxConcurrentRunners":1}','{"availableAgentSeconds":10}','{}',?,?)`, [now, now, '2099-01-01T00:00:00.000Z', now, now, now]);
	const planningGraphByProjectId = Object.fromEntries(await Promise.all(['a', 'b'].map(async (suffix) => {
		const projectId = `matrix-project-${suffix}`;
		return [projectId, await resolveWorkdayPlanningGraphSnapshot(store, projectId, {})] as const;
	})));
	await store.run(`UPDATE capacity_workday_runs SET parameters_json = ?, updated_at = ? WHERE id = 'matrix-run'`, [JSON.stringify({ projects: ['matrix-project-a', 'matrix-project-b'], planningGraphByProjectId }), now]);
}

describe('capacity failure and concurrency service matrix', () => {
	it('recovers interruption, fences stale leases, limits cross-project pressure, and preserves human policy', async () => {
		const { database, store } = createServiceWorkflowDatabaseHarness();
		const stateRoot = await mkdtemp(resolve(tmpdir(), 'treeseed-capacity-matrix-'));
		try {
			await store.ensureInitialized();
			const startedAt = new Date(Date.now() - 60_000).toISOString();
			const recoveryAt = new Date().toISOString();
			await seedMatrix(store, startedAt);
			(store as unknown as {
				createCapacityWorkdayTreeDxWorkspace: (...args: unknown[]) => Promise<Record<string, unknown>>;
			}).createCapacityWorkdayTreeDxWorkspace = async () => ({
				workspaceId: 'matrix-workspace',
				baseCommitSha: 'a'.repeat(40),
				baseRef: 'refs/heads/staging',
				branchName: 'refs/heads/matrix-assignment',
			});
			const policyBefore = await policyFingerprint(store);
			const admissions = await Promise.all(['a', 'b'].map((suffix) => commitCapacityAdmission(store, {
				idempotencyKey: `matrix-admit-${suffix}`, admission: admission(suffix as 'a' | 'b', startedAt),
				reservationId: `matrix-reservation-${suffix}`, assignmentId: `matrix-assignment-${suffix}`,
				assignment: { projectAgentClassId: `matrix-class-${suffix}`, workDayId: `matrix-workday-${suffix}`, providerSessionId: 'matrix-session' },
			})));
			expect(admissions.every((entry) => !entry.replayed)).toBe(true);
			await store.run(`INSERT INTO capacity_workday_demands (id, team_id, project_id, workday_run_id, workday_id, source_type, source_id, mode, project_agent_class_id, agent_id, handler_id, activity_type, status, priority, requested_seconds, idempotency_key, payload_json, metadata_json, available_at, assignment_id, admitted_at, created_at, updated_at) VALUES ('matrix-demand-a','matrix-team','matrix-project-a','matrix-run','matrix-workday-a','idle-intent','matrix-agent-a','planning','matrix-class-a','matrix-agent-a','writer','planning','admitted',1,1,'matrix-demand-a','{"repositoryId":"matrix-repository","contentRoot":"knowledge-models"}','{"requiredCapabilities":["engineering"]}',?,'matrix-assignment-a',?,?,?)`, [startedAt, startedAt, startedAt, startedAt]);

			const local = new ProviderLocalCapacityStore(stateRoot);
			const claims = await Promise.all([0, 1].map(() => local.claim({ connectionId: 'matrix-team', globalLimit: 1, connectionLimit: 1 })));
			expect(claims.filter(Boolean)).toHaveLength(1);
			const localClaim = claims.find(Boolean)!;
			await local.attachLease(localClaim.id, {
				assignmentId: 'matrix-assignment-a', leaseToken: 'local-matrix-lease', leaseExpiresAt: '2099-01-01T00:00:00.000Z',
				dispatchEnvelope: { projectId: 'matrix-project-a' },
			});
			expect((await local.snapshot()).claims).toEqual([expect.objectContaining({ assignmentId: 'matrix-assignment-a', status: 'ready' })]);

			// Keep the second project's already-admitted work durable while the
			// interrupted first project exercises the returned-assignment path.
			// The scheduler intentionally prefers fresh pending work over retries
			// within the same workday state, so pausing B makes the recovery order
			// explicit without weakening that production scheduling policy.
			await store.run(`UPDATE workday_capacity_envelopes SET status = 'paused', updated_at = ? WHERE id = 'matrix-workday-b'`, [recoveryAt]);
			const expiredAt = new Date(Date.parse(recoveryAt) - 1_000).toISOString();
			await store.run(`UPDATE capacity_provider_assignments SET status = 'leased', lease_state = 'leased', lease_token = 'expired-lease', lease_expires_at = ?, runner_id = 'interrupted-runner', state_version = 2 WHERE id = 'matrix-assignment-a'`, [expiredAt]);
			expect(await store.first(`SELECT status, lease_state, lease_expires_at, state_version FROM capacity_provider_assignments WHERE id = 'matrix-assignment-a'`)).toMatchObject({
				status: 'leased',
				lease_state: 'leased',
				state_version: 2,
			});
			const recovered = await recoverExpiredProviderAssignments(store, { teamId: 'matrix-team', providerId: 'matrix-provider', now: recoveryAt });
			expect(recovered).toMatchObject({ recovered: 1, safeRetries: 1, results: [{ assignmentId: 'matrix-assignment-a', status: 'failed', reasonCode: 'expired_lease_requeued' }] });
			const principal = { teamId: 'matrix-team', membershipId: 'matrix-membership', capacityProviderId: 'matrix-provider' };
			const backupPrincipal = { teamId: 'matrix-team', membershipId: 'matrix-backup-membership', capacityProviderId: 'matrix-backup-provider' };
			const resumed = await store.leaseNextProviderAssignment(backupPrincipal, { sessionId: 'matrix-backup-session', runnerId: 'resumed-runner', leaseSeconds: 120 });
			const resumeEvidence = {
				demand: await store.first(`SELECT status, assignment_id, metadata_json FROM capacity_workday_demands WHERE id = 'matrix-demand-a'`),
				denials: await store.all(`SELECT action, metadata_json FROM capacity_audit_events WHERE resource_id = 'matrix-demand-a' ORDER BY created_at`),
			};
			expect(resumed.assignment, JSON.stringify({ resumeEvidence, diagnostics: resumed.diagnostics })).toMatchObject({ status: 'leased', projectId: 'matrix-project-a', capacityProviderId: 'matrix-backup-provider', executionProviderId: 'matrix-backup-execution', runnerId: 'resumed-runner' });
			expect(resumed.assignment?.id).not.toBe('matrix-assignment-a');
			const resumedAssignmentId = resumed.assignment!.id;
			expect(await store.renewProviderAssignmentLease(principal, 'matrix-assignment-a', { leaseToken: 'expired-lease', runnerId: 'stale-runner' })).toBeNull();
			expect(await store.renewProviderAssignmentLease(backupPrincipal, resumedAssignmentId, { leaseToken: resumed.leaseToken, runnerId: 'resumed-runner', leaseSeconds: 120 })).toMatchObject({ assignment: { status: 'leased' } });
			await settleCapacityReservationExactlyOnce(store, { settlementKey: 'matrix-settle-a', teamId: 'matrix-team', membershipId: 'matrix-backup-membership', reservationId: resumed.assignment!.reservationId, assignmentId: resumedAssignmentId, activeSeconds: 1, elapsedSeconds: 1, source: 'matrix' });
			expect(await store.completeProviderAssignment(backupPrincipal, resumedAssignmentId, { leaseToken: resumed.leaseToken, runnerId: 'resumed-runner' })).toMatchObject({ assignment: { status: 'completed' } });

			await store.run(`UPDATE workday_capacity_envelopes SET status = 'active', updated_at = ? WHERE id = 'matrix-workday-b'`, [new Date().toISOString()]);
			const second = await store.leaseNextProviderAssignment(principal, { sessionId: 'matrix-session', runnerId: 'revoked-runner', leaseSeconds: 120 });
			expect(second.assignment).toMatchObject({ id: 'matrix-assignment-b', projectId: 'matrix-project-b', status: 'leased' });
			const registration = new CapacityRegistrationService(new CapacityGovernanceRepository(store), new CapacitySecretCodec('capacity-failure-matrix-secret'), 'https://api.example.test');
			await registration.updateMembership('matrix-team', 'matrix-membership', 'matrix-owner', 'suspended', 'matrix-suspend');
			expect(await store.renewProviderAssignmentLease(principal, 'matrix-assignment-b', { leaseToken: second.leaseToken, runnerId: 'revoked-runner' })).toBeNull();
			expect(await store.getProviderAssignment('matrix-team', 'matrix-assignment-b')).toMatchObject({ status: 'failed', leaseState: 'released', lifecycleCode: 'provider_membership_suspended' });
			await local.finalize(localClaim.id, 'matrix-completed');

			expect(await policyFingerprint(store)).toBe(policyBefore);
			expect(await store.first(`SELECT COUNT(*) AS total FROM capacity_audit_events WHERE action = 'capacity-assignment.recovery.safe-retry' AND resource_id = 'matrix-assignment-a'`)).toEqual({ total: 1 });
			expect(await store.first(`SELECT COUNT(*) AS total FROM capacity_audit_events WHERE action = 'provider-membership.suspended' AND resource_id = 'matrix-membership' AND idempotency_key = 'matrix-suspend'`)).toEqual({ total: 1 });
			expect(await store.first(`SELECT COUNT(*) AS total FROM capacity_provider_assignments WHERE status IN ('pending','leased','running','returned')`)).toEqual({ total: 0 });
			expect(await store.first(`SELECT COUNT(*) AS total FROM capacity_reservations WHERE state NOT IN ('consumed','released')`)).toEqual({ total: 0 });
			expect((await store.all(`SELECT committed_amount FROM capacity_admission_counters WHERE scope = 'grant-concurrency'`)).every((row) => Number(row.committed_amount) === 0)).toBe(true);
			expect((await local.snapshot()).claims).toEqual([]);
		} finally {
			await database.close();
			await rm(stateRoot, { recursive: true, force: true });
		}
	}, 30_000);
});
