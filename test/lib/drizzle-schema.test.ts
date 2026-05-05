import { describe, expect, it } from 'vitest';
import { treeseedSchema } from '@treeseed/sdk/db/schema';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function migrationSql() {
	return readdirSync(join(repoRoot, 'migrations'))
		.filter((file) => file.endsWith('.sql'))
		.sort()
		.map((file) => readFileSync(join(repoRoot, 'migrations', file), 'utf8'))
		.join('\n');
}

describe('Treeseed Drizzle schema baseline', () => {
	it('exports shared auth, core identity, and market tables', () => {
		expect(Object.keys(treeseedSchema)).toEqual(expect.arrayContaining([
			'better_auth_user',
			'better_auth_session',
			'better_auth_account',
			'better_auth_verification',
			'users',
			'userIdentities',
			'roles',
			'permissions',
			'teams',
			'teamMemberships',
			'webSessions',
			'projects',
			'remoteJobs',
		]));
	});

	it('has checked-in SQL baselines for Drizzle-owned tables', () => {
		const sql = migrationSql();
		for (const tableName of [
			'better_auth_user',
			'better_auth_session',
			'better_auth_account',
			'better_auth_verification',
			'users',
			'user_identities',
			'roles',
			'permissions',
			'role_permissions',
			'user_role_bindings',
			'teams',
			'team_memberships',
			'web_sessions',
			'projects',
			'remote_jobs',
		]) {
			expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\b`, 'u'));
		}
	});
});
