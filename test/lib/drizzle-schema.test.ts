import { describe, expect, it } from 'vitest';
import { treeseedSchema } from '../../packages/sdk/src/db/schema.ts';
import { treeseedMarketSchema } from '../../packages/sdk/src/db/market-schema.ts';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const marketMigrationPath = join(repoRoot, 'packages/sdk/drizzle/market/0000_market_control_plane.sql');
const marketPhase9MigrationPath = join(repoRoot, 'packages/sdk/drizzle/market/0001_capacity_budget_mode_default.sql');
const d1MigrationPath = join(repoRoot, 'packages/sdk/drizzle/d1/0000_treeseed_d1.sql');

function readSql(path: string) {
	return readFileSync(path, 'utf8');
}

describe('Treeseed Drizzle schema baseline', () => {
	it('exports SDK D1 tables separately from the Market PostgreSQL schema', () => {
		expect(Object.keys(treeseedSchema).sort()).toEqual([
			'contactSubmissions',
			'runtimeRecords',
			'subscribers',
		]);
		expect(Object.keys(treeseedMarketSchema)).toEqual(expect.arrayContaining([
			'betterAuthUser',
			'betterAuthSession',
			'betterAuthAccount',
			'betterAuthVerification',
			'users',
			'userIdentities',
			'roles',
			'permissions',
			'teams',
			'teamMemberships',
			'webSessions',
			'projects',
			'projectCapabilityGrants',
			'repositoryHosts',
			'capacityProviders',
			'executionProviders',
			'executionProviderNativeLimits',
			'executionProviderObservations',
			'platformOperations',
			'platformOperationEvents',
			'marketOperationRunners',
			'marketAuthCredentials',
			'marketAuthPasswordResets',
		]));
	});

	it('has checked-in Drizzle artifacts for Market PostgreSQL and SDK D1', () => {
		expect(existsSync(marketMigrationPath)).toBe(true);
		expect(existsSync(marketPhase9MigrationPath)).toBe(true);
		expect(existsSync(d1MigrationPath)).toBe(true);

		const marketSql = readSql(marketMigrationPath);
		const marketPhase9Sql = readSql(marketPhase9MigrationPath);
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
			'execution_providers',
			'execution_provider_native_limits',
			'execution_provider_observations',
			'native_usage_observations',
			'credit_conversion_profiles',
			'platform_operations',
			'platform_operation_events',
			'market_operation_runners',
			'market_auth_credentials',
			'market_auth_password_resets',
		]) {
			expect(marketSql).toMatch(new RegExp(`CREATE TABLE "${tableName}"\\s*\\(`, 'u'));
		}
		for (const tableName of [
			'subscribers',
			'contact_submissions',
			'runtime_records',
		]) {
			expect(d1Sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS \`${tableName}\`\\s*\\(`, 'u'));
		}
		expect(d1Sql).toContain('CREATE INDEX IF NOT EXISTS `idx_contact_submissions_created_at`');
		expect(d1Sql).toContain('CREATE INDEX IF NOT EXISTS `idx_contact_submissions_email`');
		expect(d1Sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS `idx_runtime_records_type_record_key`');
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
		expect(treeseedMarketSchema.capacityProviders.creditBudgetMode.name).toBe('credit_budget_mode');
		expect(treeseedMarketSchema.capacityReservations.executionProviderId.name).toBe('execution_provider_id');
		expect(treeseedMarketSchema.capacityReservations.reservedNativeAmount.name).toBe('reserved_native_amount');
		expect(treeseedMarketSchema.taskUsageActuals.creditFormulaVersion.name).toBe('credit_formula_version');
		expect(treeseedMarketSchema.taskUsageActuals.nativeUsageJson.name).toBe('native_usage_json');
		expect(treeseedMarketSchema.nativeUsageObservations.nativeUsageJson.name).toBe('native_usage_json');
		expect(treeseedMarketSchema.creditConversionProfiles.nativeUnitsPerCreditP50.name).toBe('native_units_per_credit_p50');
		expect(marketSql).toContain('"credit_budget_mode" text DEFAULT \'derived\' NOT NULL');
		expect(marketPhase9Sql).toContain('SET "credit_budget_mode" = \'derived\'');
		expect(marketPhase9Sql).toContain('ALTER TABLE "capacity_providers" ALTER COLUMN "credit_budget_mode" SET DEFAULT \'derived\'');
		expect(marketSql).toContain('"execution_provider_id" text');
		expect(marketSql).toContain('"reserved_native_amount" real');
		expect(marketSql).toContain('"consumed_native_amount" real');
		expect(marketSql).toContain('CREATE TABLE "native_usage_observations"');
		expect(marketSql).toContain('CREATE TABLE "credit_conversion_profiles"');
		expect(marketSql).toContain('"confidence" text DEFAULT \'low\' NOT NULL');
		expect(marketSql).toContain('"id" text PRIMARY KEY NOT NULL');
		expect(marketSql).toContain('CREATE UNIQUE INDEX "idx_credit_conversion_profiles_profile_key"');
		expect(marketSql).toContain('"credit_formula_version" text DEFAULT \'treeseed.actual-credits.v1\' NOT NULL');
		expect(marketSql).toContain('CREATE INDEX "idx_native_usage_observations_profile"');
		expect(marketSql).toContain('"metadata_json" text DEFAULT \'{}\' NOT NULL');
	});

	it('does not retain the root SQL migration architecture', () => {
		expect(existsSync(join(repoRoot, 'migrations'))).toBe(false);
	});
});

describe('Market migration architecture guardrails', () => {
	it('keeps Market runtime migration ownership out of the raw store', () => {
		const storeSource = readFileSync(join(repoRoot, 'src/api/store.js'), 'utf8');
		expect(storeSource).not.toMatch(/migrations\/|migrationPaths|loadMigrationSql|PostgresD1Database/u);
		expect(storeSource).not.toMatch(/\bCREATE\s+TABLE\b|\bALTER\s+TABLE\b|PRAGMA\s+table_info/iu);
	});

	it('keeps the Market API on the PostgreSQL adapter boundary', () => {
		const appSource = readFileSync(join(repoRoot, 'src/api/app.js'), 'utf8');
		const adapterSource = readFileSync(join(repoRoot, 'src/api/market-postgres.js'), 'utf8');
		const testSource = readFileSync(join(repoRoot, 'test/api/market-api.test.ts'), 'utf8');
		expect(appSource).not.toContain('resolveApiD1Database');
		expect(appSource).not.toContain('postgres-d1');
		expect(adapterSource).not.toContain('PostgresD1');
		expect(testSource).not.toContain('TestD1Database');
		expect(adapterSource).toContain('applyDrizzleMigrations');
	});
});
