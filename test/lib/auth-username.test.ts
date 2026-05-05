import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { D1DatabaseLike, D1PreparedStatementLike } from '@treeseed/core/types/cloudflare';
import {
	assignImmutableUsername,
	composeDisplayNameFromParts,
	isUsernameAvailable,
	loadUserProfileByUsername,
	normalizeUsername,
	resolveLoginIdentifier,
	usernameAvailabilityResult,
	validateUsername,
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
		const migrationsDir = resolve(process.cwd(), 'migrations');
		const sql = readdirSync(migrationsDir)
			.filter((file) => file.endsWith('.sql'))
			.sort()
			.map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
			.join('\n');
		this.db.exec(sql);
	}

	prepare(query: string) {
		return new TestPreparedStatement(this.db, query);
	}

	async exec(query: string) {
		this.db.exec(query);
		return {};
	}
}

function contextFor(db: D1DatabaseLike, principal: Record<string, any> | null = null) {
	return {
		locals: {
			auth: principal ? { principal } : null,
			runtime: {
				env: {
					SITE_DATA_DB: db,
					TREESEED_AUTH_ALLOW_MEMORY_DB: 'true',
				},
			},
		},
	} as any;
}

describe('market username validation', () => {
	it('composes the registration display name from first and last name', () => {
		expect(composeDisplayNameFromParts(' Ada ', ' Lovelace ')).toBe('Ada Lovelace');
		expect(composeDisplayNameFromParts('Ada', '')).toBe('Ada');
	});

	it('normalizes and validates GitHub-style usernames', () => {
		expect(normalizeUsername('  Ada-Lovelace  ')).toBe('ada-lovelace');
		expect(validateUsername('ada').ok).toBe(true);
		expect(validateUsername('a').ok).toBe(true);
		expect(validateUsername('a'.repeat(39)).ok).toBe(true);
		expect(validateUsername('-ada').ok).toBe(false);
		expect(validateUsername('ada-').ok).toBe(false);
		expect(validateUsername('ada--lovelace').ok).toBe(false);
		expect(validateUsername('ada_lovelace').ok).toBe(false);
		expect(validateUsername('admin').ok).toBe(false);
		expect(validateUsername('a'.repeat(40)).ok).toBe(false);
	});
});

runtimeDescribe('market username persistence', () => {
	it('checks availability case-insensitively and refuses mutation after assignment', async () => {
		const db = new TestD1Database();
		const context = contextFor(db);
		db.db.exec(`
			INSERT INTO users (id, email, display_name, status, metadata_json, created_at, updated_at)
			VALUES ('core-1', 'ada@example.com', 'Ada', 'active', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO better_auth_user (id, name, email, emailVerified, image, createdAt, updatedAt)
			VALUES ('ba-1', 'Ada', 'ada@example.com', 1, NULL, 1, 1);
		`);
		expect(await isUsernameAvailable(context, 'Ada')).toBe(true);
		const assigned = await assignImmutableUsername(context, {
			username: 'Ada',
			betterAuthUserId: 'ba-1',
			coreUserId: 'core-1',
		});
		expect(assigned).toMatchObject({ ok: true, username: 'ada' });
		expect(await isUsernameAvailable(context, 'ADA')).toBe(false);
		expect(await assignImmutableUsername(context, {
			username: 'ada',
			betterAuthUserId: 'ba-1',
			coreUserId: 'core-1',
		})).toMatchObject({ ok: true });
		expect(await assignImmutableUsername(context, {
			username: 'grace',
			betterAuthUserId: 'ba-1',
			coreUserId: 'core-1',
		})).toMatchObject({ ok: false, code: 'immutable' });
	});

	it('resolves username sign-in identifiers to email', async () => {
		const db = new TestD1Database();
		const context = contextFor(db);
		db.db.exec(`
			INSERT INTO better_auth_user (id, name, email, username, emailVerified, image, createdAt, updatedAt)
			VALUES ('ba-1', 'Ada', 'ada@example.com', 'ada', 1, NULL, 1, 1);
		`);
		expect(await resolveLoginIdentifier(context, 'ADA')).toBe('ada@example.com');
		expect(await resolveLoginIdentifier(context, 'ada@example.com')).toBe('ada@example.com');
		expect(await resolveLoginIdentifier(context, 'missing')).toBeNull();
	});

	it('returns username availability endpoint states without exposing user details', async () => {
		const db = new TestD1Database();
		const context = contextFor(db);
		db.db.exec(`
			INSERT INTO better_auth_user (id, name, email, username, emailVerified, image, createdAt, updatedAt)
			VALUES ('ba-1', 'Ada Lovelace', 'ada@example.com', 'ada', 1, NULL, 1, 1);
		`);
		expect(await usernameAvailabilityResult(context, '')).toMatchObject({
			ok: true,
			username: '',
			available: false,
			status: 'empty',
		});
		expect(await usernameAvailabilityResult(context, 'admin')).toMatchObject({
			ok: true,
			username: 'admin',
			available: false,
			status: 'reserved',
		});
		expect(await usernameAvailabilityResult(context, 'ada_lovelace')).toMatchObject({
			ok: true,
			username: 'ada_lovelace',
			available: false,
			status: 'invalid',
		});
		expect(await usernameAvailabilityResult(context, 'ADA')).toMatchObject({
			ok: true,
			username: 'ada',
			available: false,
			status: 'taken',
			message: 'Username is taken.',
		});
		expect(await usernameAvailabilityResult(context, 'grace')).toMatchObject({
			ok: true,
			username: 'grace',
			available: true,
			status: 'available',
			message: 'Username is available.',
		});
	});

	it('filters public profile activity by viewer access', async () => {
		const db = new TestD1Database();
		db.db.exec(`
			INSERT INTO users (id, email, username, display_name, status, metadata_json, created_at, updated_at)
			VALUES ('user-1', 'ada@example.com', 'ada', 'Ada', 'active', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO user_identities (id, user_id, provider, provider_subject, email, email_verified, profile_json, created_at, updated_at)
			VALUES ('identity-1', 'user-1', 'credential', 'ba-1', 'ada@example.com', 1, '{"image":"https://example.com/ada.png"}', '2026-01-01', '2026-01-01');
			INSERT INTO teams (id, slug, name, metadata_json, created_at, updated_at)
			VALUES ('team-1', 'ada-labs', 'Ada Labs', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO team_memberships (id, team_id, user_id, status, created_at, updated_at)
			VALUES ('membership-1', 'team-1', 'user-1', 'active', '2026-01-01', '2026-01-01');
			INSERT INTO projects (id, team_id, slug, name, description, metadata_json, created_at, updated_at)
			VALUES ('project-1', 'team-1', 'engine', 'Engine', 'Private project', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO catalog_items (id, team_id, kind, slug, title, summary, visibility, listing_enabled, offer_mode, metadata_json, created_at, updated_at)
			VALUES ('catalog-1', 'team-1', 'template', 'public-template', 'Public Template', 'Listed', 'public', 1, 'free', '{}', '2026-01-01', '2026-01-01');
			INSERT INTO knowledge_packs (id, team_id, slug, name, summary, source_kind, source_ref, install_strategy, visibility, metadata_json, created_at, updated_at)
			VALUES ('pack-1', 'team-1', 'private-pack', 'Private Pack', 'Hidden', 'market_import', NULL, 'import_export', 'private', '{}', '2026-01-01', '2026-01-01');
		`);
		const anonymousProfile = await loadUserProfileByUsername(contextFor(db), 'ADA');
		expect(anonymousProfile?.activity.catalogItems.map((item) => item.slug)).toEqual(['public-template']);
		expect(anonymousProfile?.activity.projects).toEqual([]);
		expect(anonymousProfile?.activity.knowledgePacks).toEqual([]);

		const memberProfile = await loadUserProfileByUsername(contextFor(db, {
			id: 'user-1',
			roles: ['member'],
			permissions: [],
			metadata: {},
		}), 'ada');
		expect(memberProfile?.activity.projects.map((project) => project.slug)).toEqual(['engine']);
		expect(memberProfile?.activity.knowledgePacks.map((pack) => pack.slug)).toEqual(['private-pack']);
	});
});
