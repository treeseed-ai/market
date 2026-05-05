import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { D1DatabaseLike, D1PreparedStatementLike } from '@treeseed/core/types/cloudflare';
import {
	DELETE_ACCOUNT_CONFIRMATION,
	accountDeletionConfirmationMatches,
	deleteMarketAccountRows,
	evaluateAccountDeletionBlockers,
	isValidProfileImageUrl,
} from '../../src/lib/auth/account';

const sqliteModule = await import('node:sqlite').catch(() => null);
const DatabaseSyncCtor = sqliteModule?.DatabaseSync ?? null;
const runtimeDescribe = DatabaseSyncCtor ? describe : describe.skip;
const DatabaseSync = DatabaseSyncCtor as NonNullable<typeof DatabaseSyncCtor>;

class TestPreparedStatement implements D1PreparedStatementLike {
	private bindings: unknown[] = [];

	constructor(
		private readonly db: any,
		private readonly query: string,
	) {}

	bind(...values: unknown[]) {
		this.bindings = values;
		return this;
	}

	async run() {
		this.db.prepare(this.query).run(...this.bindings);
		return {};
	}

	async first<T = Record<string, unknown>>() {
		return (this.db.prepare(this.query).get(...this.bindings) as T | undefined) ?? null;
	}

	async all<T = Record<string, unknown>>() {
		return {
			results: this.db.prepare(this.query).all(...this.bindings) as T[],
		};
	}

	async raw<T = unknown[]>() {
		const rows = this.db.prepare(this.query).all(...this.bindings) as Array<Record<string, unknown>>;
		return rows.map((row) => Object.values(row)) as T[];
	}
}

class TestD1Database implements D1DatabaseLike {
	readonly db = new DatabaseSync(':memory:');

	constructor() {
		this.db.exec(readFileSync(resolve(process.cwd(), 'migrations/0007_site_web_sessions.sql'), 'utf8'));
	}

	prepare(query: string) {
		return new TestPreparedStatement(this.db, query);
	}

	async exec(query: string) {
		this.db.exec(query);
		return {};
	}
}

function contextFor(principal: Record<string, any>, db?: D1DatabaseLike) {
	const deletedCookies: string[] = [];
	return {
		locals: {
			auth: { principal },
			runtime: {
				env: db ? { SITE_DATA_DB: db } : {},
			},
		},
		cookies: {
			get: () => undefined,
			delete: (name: string) => {
				deletedCookies.push(name);
			},
		},
		url: new URL('https://market.example.com/app/account'),
		deletedCookies,
	} as any;
}

describe('market account validation', () => {
	it('validates profile image URLs', () => {
		expect(isValidProfileImageUrl('')).toBe(true);
		expect(isValidProfileImageUrl(null)).toBe(true);
		expect(isValidProfileImageUrl('https://example.com/avatar.png')).toBe(true);
		expect(isValidProfileImageUrl('http://example.com/avatar.png')).toBe(false);
		expect(isValidProfileImageUrl('not a url')).toBe(false);
	});

	it('requires exact deletion confirmation text', () => {
		expect(accountDeletionConfirmationMatches(DELETE_ACCOUNT_CONFIRMATION)).toBe(true);
		expect(accountDeletionConfirmationMatches('delete my account')).toBe(false);
		expect(accountDeletionConfirmationMatches(`${DELETE_ACCOUNT_CONFIRMATION} `)).toBe(false);
	});
});

runtimeDescribe('market account deletion blockers', () => {
	it('blocks platform administrators', async () => {
		const blockers = await evaluateAccountDeletionBlockers(contextFor({
			id: 'user-1',
			roles: ['platform_admin'],
			permissions: [],
		}));
		expect(blockers.map((blocker) => blocker.code)).toContain('platform_admin');
	});

	it('blocks active team owners and allows ordinary members', async () => {
		const db = new TestD1Database();
		db.db.exec(`
			INSERT INTO users (id, email, display_name, status, metadata_json, created_at, updated_at)
			VALUES ('owner-1', 'owner@example.com', 'Owner', 'active', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO roles (id, key, description, created_at)
			VALUES ('role-owner', 'team_owner', 'Team owner', '2026-01-01');
			INSERT INTO teams (id, slug, name, metadata_json, created_at, updated_at)
			VALUES ('team-1', 'alpha', 'Alpha', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO team_memberships (id, team_id, user_id, status, created_at, updated_at)
			VALUES ('membership-1', 'team-1', 'owner-1', 'active', '2026-01-01', '2026-01-01');
			INSERT INTO team_role_bindings (id, team_membership_id, role_id, created_at)
			VALUES ('binding-1', 'membership-1', 'role-owner', '2026-01-01');
		`);
		const ownerBlockers = await evaluateAccountDeletionBlockers(contextFor({
			id: 'owner-1',
			roles: ['member'],
			permissions: [],
		}, db));
		expect(ownerBlockers).toMatchObject([{ code: 'team_owner', teamSlug: 'alpha' }]);

		const memberBlockers = await evaluateAccountDeletionBlockers(contextFor({
			id: 'member-1',
			roles: ['member'],
			permissions: [],
		}, db));
		expect(memberBlockers).toEqual([]);
	});

	it('removes market-side account rows without deleting teams', async () => {
		const db = new TestD1Database();
		db.db.exec(`
			INSERT INTO users (id, email, display_name, status, metadata_json, created_at, updated_at)
			VALUES ('user-1', 'user@example.com', 'User', 'active', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO user_identities (id, user_id, provider, provider_subject, email, email_verified, profile_json, created_at, updated_at)
			VALUES ('identity-1', 'user-1', 'credential', 'better-user-1', 'user@example.com', 1, '{}', '2026-01-01', '2026-01-01');
			INSERT INTO teams (id, slug, name, metadata_json, created_at, updated_at)
			VALUES ('team-1', 'alpha', 'Alpha', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO team_memberships (id, team_id, user_id, status, created_at, updated_at)
			VALUES ('membership-1', 'team-1', 'user-1', 'active', '2026-01-01', '2026-01-01');
			INSERT INTO web_sessions (id, user_id, provider, provider_subject, principal_json, csrf_token, authenticated_at, last_seen_at, expires_at, created_at, updated_at)
			VALUES ('session-1', 'user-1', 'credential', 'better-user-1', '{}', 'csrf', '2026-01-01', '2026-01-01', '2027-01-01', '2026-01-01', '2026-01-01');
		`);
		const context = contextFor({ id: 'user-1', roles: ['member'], permissions: [] }, db);
		await deleteMarketAccountRows(context, 'user-1');
		expect(db.db.prepare(`SELECT id FROM users WHERE id = 'user-1'`).get()).toBeUndefined();
		expect(db.db.prepare(`SELECT id FROM team_memberships WHERE user_id = 'user-1'`).get()).toBeUndefined();
		expect(db.db.prepare(`SELECT id FROM teams WHERE id = 'team-1'`).get()).toBeTruthy();
	});
});
