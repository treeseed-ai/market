import { describe, expect, it } from 'vitest';
import { treeseedSchema } from '../../../packages/sdk/src/db/schema.ts';
import { treeseedMarketSchema } from '../../../packages/sdk/src/db/market-schema.ts';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const marketMigrationPath = join(repoRoot, 'packages/sdk/drizzle/market/0000_market_control_plane.sql');
const marketMigrationRoot = join(repoRoot, 'packages/sdk/drizzle/market');
const d1MigrationPath = join(repoRoot, 'packages/sdk/drizzle/d1/0000_treeseed_d1.sql');

function readSql(path: string) {
	return readFileSync(path, 'utf8');
}

function createTablePattern(tableName: string) {
	return new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? "${tableName}"\\s*\\(`, 'u');
}

function createIndexPattern(indexName: string) {
	return new RegExp(`CREATE (?:UNIQUE )?INDEX(?: IF NOT EXISTS)? "${indexName}"`, 'u');
}

describe('Treeseed Drizzle schema baseline', () => {
	it('exports SDK D1 tables separately from the Market PostgreSQL schema', () => {
		expect(Object.keys(treeseedSchema).sort()).toEqual([
			'contactSubmissions',
			'subscribers',
		]);
		expect(Object.keys(treeseedMarketSchema)).toEqual(expect.arrayContaining([
			'betterAuthUser',
			'betterAuthSession',
			'betterAuthAccount',
			'betterAuthVerification',
			'users',
			'userIdentities',
			'userEmailAddresses',
			'roles',
			'permissions',
			'teams',
			'teamMemberships',
			'webSessions',
			'projects',
			'projectCapabilityGrants',
			'repositoryHosts',
			'capacityProviders',
			'teamCapacityRegistrationKeys',
			'capacityProviderRegistrationRequests',
			'capacityProviderTeamMemberships',
			'providerAvailabilitySessions',
			'platformOperations',
			'platformOperationEvents',
			'marketOperationRunners',
			'projectDeploymentEvents',
			'marketAuthCredentials',
			'marketAuthPasswordResets',
		]));
	});

	it('has checked-in Drizzle artifacts for Market PostgreSQL and SDK D1', () => {
		expect(existsSync(marketMigrationPath)).toBe(true);
		expect(readdirSync(marketMigrationRoot).filter((file) => file.endsWith('.sql'))).toEqual(['0000_market_control_plane.sql']);
		expect(existsSync(d1MigrationPath)).toBe(true);

		const marketSql = readSql(marketMigrationPath);
		const d1Sql = readSql(d1MigrationPath);
		for (const tableName of [
			'users',
			'user_identities',
			'teams',
			'team_memberships',
			'web_sessions',
			'projects',
			'project_capability_grants',
			'repository_hosts',
			'capacity_providers',
			'team_capacity_registration_keys',
			'capacity_provider_registration_requests',
			'capacity_provider_team_memberships',
			'capacity_provider_availability_sessions',
			'structured_agent_estimates',
			'decision_assignment_graphs',
			'research_workflows',
			'deliverable_contracts',
			'deliverable_manifests',
			'credit_conversion_profiles',
			'platform_operations',
			'platform_operation_events',
			'market_operation_runners',
			'project_deployment_events',
			'market_auth_credentials',
			'user_email_addresses',
			'market_auth_password_resets',
		]) {
			expect(marketSql).toMatch(createTablePattern(tableName));
		}
		expect(marketSql).toContain('"userId" text NOT NULL');
		expect(marketSql).toContain('"expiresAt" bigint NOT NULL');
		expect(marketSql).toContain('"accessTokenExpiresAt" bigint');
		expect(marketSql).toMatch(createIndexPattern('idx_capacity_reservations_provider_state'));
		expect(marketSql).toMatch(createIndexPattern('idx_credit_conversion_profiles_profile_key'));
		for (const tableName of [
			'runtime_tasks',
			'runtime_task_events',
			'runtime_task_outputs',
			'workday_manager_leases',
			'worker_runners',
			'repository_claims',
			'runner_scale_decisions',
			'agent_pools',
			'agent_pool_registrations',
			'agent_pool_scale_decisions',
			'scale_decisions',
			'work_days',
			'graph_runs',
			'reports',
			'project_workday_summaries',
			'work_policies',
			'workday_requests',
			'priority_overrides',
			'priority_snapshots',
			'task_credit_ledger',
			'task_estimate_profiles',
		]) {
			expect(marketSql).not.toMatch(createTablePattern(tableName));
		}
		for (const tableName of [
			'subscribers',
			'contact_submissions',
		]) {
			expect(d1Sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS \`${tableName}\`\\s*\\(`, 'u'));
		}
		expect(d1Sql).toContain('CREATE INDEX IF NOT EXISTS `idx_contact_submissions_created_at`');
		expect(d1Sql).toContain('CREATE INDEX IF NOT EXISTS `idx_contact_submissions_email`');
		for (const tableName of [
			'better_auth_user',
			'better_auth_session',
			'better_auth_account',
			'better_auth_verification',
			'users',
			'user_identities',
			'roles',
			'permissions',
			'teams',
			'team_memberships',
			'projects',
			'runtime_records',
			'remote_jobs',
			'capacity_providers',
			'execution_providers',
			'work_days',
			'tasks',
			'message_queue',
			'cursor_state',
			'lease_state',
		]) {
			expect(d1Sql).not.toMatch(new RegExp(`CREATE TABLE \`${tableName}\`\\s*\\(`, 'u'));
		}
		expect(treeseedMarketSchema.capacityProviders.fingerprint.name).toBe('fingerprint');
		expect(treeseedMarketSchema.capacityProviderTeamMemberships.teamId.name).toBe('team_id');
		expect(treeseedMarketSchema.capacityReservations.executionProviderId.name).toBe('execution_provider_id');
		expect(treeseedMarketSchema.workdayCapacityEnvelopes.workdayRunId.name).toBe('workday_run_id');
		expect(treeseedMarketSchema.decisionAssignmentGraphs.graphJson.name).toBe('graph_json');
		expect(treeseedMarketSchema.deliverableManifests.deliverableContractId.name).toBe('deliverable_contract_id');
		expect(marketSql).toMatch(createIndexPattern('idx_workday_capacity_envelopes_run_status'));
		expect(marketSql).toContain('FOREIGN KEY ("workday_run_id") REFERENCES "public"."capacity_workday_runs"("id") ON DELETE restrict');
		expect(marketSql).toContain('"admission_token" text NOT NULL');
		expect(marketSql).toContain('"settlement_token" text');
		expect(marketSql).toMatch(createTablePattern('agent_fallback_outputs'));
		expect(marketSql).toMatch(createIndexPattern('idx_capacity_ledger_reservation_phase'));
		expect(treeseedMarketSchema.capacityGrants.laneIdsJson.name).toBe('lane_ids_json');
		expect(treeseedMarketSchema.capacityReservations.laneId.name).toBe('lane_id');
		expect('laneId' in treeseedMarketSchema.capacityLedgerEntries).toBe(false);
		expect(treeseedMarketSchema.capacityReservations.reservedNativeAmount.name).toBe('reserved_native_amount');
		expect(treeseedMarketSchema.capacityUsageActuals.creditFormulaVersion.name).toBe('credit_formula_version');
		expect(treeseedMarketSchema.capacityUsageActuals.nativeUsageJson.name).toBe('native_usage_json');
		expect(treeseedMarketSchema.creditConversionProfiles.nativeUnitsPerCreditP50.name).toBe('native_units_per_credit_p50');
		expect(marketSql).not.toContain('"team_id" text,\n\t"owner_team_id"');
		for (const legacyTable of [
			'capacity_provider_deployments',
			'capacity_provider_hosts',
			'provider_availability_sessions',
			'capacity_provider_registrations',
			'capacity_provider_api_keys',
			'execution_providers',
			'execution_provider_native_limits',
			'execution_provider_observations',
		]) expect(marketSql).not.toMatch(createTablePattern(legacyTable));
		expect(marketSql).toContain('"execution_provider_id" text');
		expect(marketSql).toContain('"reserved_native_amount" real');
		expect(marketSql).toContain('"consumed_native_amount" real');
		expect(marketSql).toMatch(createTablePattern('capacity_provider_lanes'));
		expect(marketSql).not.toMatch(createTablePattern('native_usage_observations'));
		expect(marketSql).toMatch(createTablePattern('credit_conversion_profiles'));
		expect(marketSql).toMatch(createTablePattern('project_deployment_events'));
		expect(marketSql).toMatch(createTablePattern('user_email_addresses'));
		expect(marketSql).toMatch(createIndexPattern('idx_user_email_addresses_normalized'));
		expect(marketSql).toContain('"platform_operation_id" text');
		expect(marketSql).toContain('"idempotency_key" text');
		expect(marketSql).toMatch(createIndexPattern('idx_project_deployments_operation'));
		expect(marketSql).toMatch(createIndexPattern('idx_project_deployment_events_deployment_sequence'));
		expect(marketSql).toContain('"confidence" text DEFAULT \'low\' NOT NULL');
		expect(marketSql).toContain('CONSTRAINT "chk_credit_conversion_profiles_sample_counts"');
		expect(marketSql).toContain('CONSTRAINT "chk_credit_conversion_profiles_confidence"');
		for (const foreignKey of [
			'fk_capacity_reservations_project',
			'fk_capacity_ledger_project',
			'fk_capacity_provider_assignments_project',
			'fk_agent_mode_runs_project',
			'fk_capacity_workday_events_project',
		]) expect(marketSql).toMatch(new RegExp(`CONSTRAINT "${foreignKey}" FOREIGN KEY \\([^;]+ ON DELETE restrict`, 'u'));
		expect(marketSql).toMatch(/CONSTRAINT "fk_capacity_usage_actuals_project" FOREIGN KEY \([^;]+ ON DELETE cascade/u);
		expect(marketSql).toContain('"id" text PRIMARY KEY NOT NULL');
		expect(marketSql).toMatch(createIndexPattern('idx_credit_conversion_profiles_profile_key'));
		expect(marketSql).toContain('"credit_formula_version" text DEFAULT \'treeseed.actual-credits.v1\' NOT NULL');
		expect(marketSql).toContain('CONSTRAINT "fk_capacity_allocation_sets_superseded_by" FOREIGN KEY ("superseded_by_id")');
		expect(marketSql).toContain('CONSTRAINT "chk_capacity_allocation_sets_effective_interval"');
		expect(marketSql).toContain('"metadata_json" text DEFAULT \'{}\' NOT NULL');
	});

	it('does not retain the root SQL migration architecture', () => {
		expect(existsSync(join(repoRoot, 'migrations'))).toBe(false);
	});
});

describe('Market migration architecture guardrails', () => {
	it('keeps Market runtime migration ownership out of the root project', () => {
		expect(existsSync(join(repoRoot, 'src/api'))).toBe(false);
		expect(existsSync(join(repoRoot, 'scripts/migrate-market-db.mjs'))).toBe(false);
	});
});
