import { randomBytes, randomUUID } from 'node:crypto';
import type { APIContext } from 'astro';
import type { D1DatabaseLike } from '@treeseed/core/types/cloudflare';
import { WEB_CSRF_COOKIE, WEB_SESSION_COOKIE, csrfCookieOptions, getSiteAuthConfig, webCookieOptions } from './config';

export interface SiteWebSession {
	id: string;
	userId: string;
	identityId: string | null;
	betterAuthSessionId: string | null;
	provider: string;
	providerSubject: string;
	email: string | null;
	displayName: string | null;
	principal: {
		id: string;
		displayName?: string;
		scopes: string[];
		roles: string[];
		permissions: string[];
		metadata?: Record<string, unknown>;
	};
	csrfToken: string;
	ipAddress: string | null;
	userAgent: string | null;
	authenticatedAt: string;
	lastSeenAt: string | null;
	expiresAt: string;
	revokedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

const memorySessions = new Map<string, SiteWebSession>();
const webSessionSchemaReady = new WeakMap<D1DatabaseLike, Promise<void>>();

const WEB_SESSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS web_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  identity_id TEXT,
  better_auth_session_id TEXT,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  principal_json TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  authenticated_at TEXT NOT NULL,
  last_seen_at TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const WEB_SESSION_COLUMN_MIGRATIONS = [
	['better_auth_session_id', 'ALTER TABLE web_sessions ADD COLUMN better_auth_session_id TEXT'],
	['ip_address', 'ALTER TABLE web_sessions ADD COLUMN ip_address TEXT'],
	['user_agent', 'ALTER TABLE web_sessions ADD COLUMN user_agent TEXT'],
	['last_seen_at', 'ALTER TABLE web_sessions ADD COLUMN last_seen_at TEXT'],
	['revoked_at', 'ALTER TABLE web_sessions ADD COLUMN revoked_at TEXT'],
] as const;

const WEB_SESSION_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_web_sessions_user_id
  ON web_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_web_sessions_better_auth_session_id
  ON web_sessions(better_auth_session_id);

CREATE INDEX IF NOT EXISTS idx_web_sessions_active
  ON web_sessions(user_id, revoked_at, expires_at);
`;

function runtimeDb(context: Pick<APIContext, 'locals'>) {
	return context.locals.runtime?.env?.SITE_DATA_DB ?? null;
}

function requestIpAddress(context: Pick<APIContext, 'request'>) {
	return context.request.headers.get('cf-connecting-ip')
		?? context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
		?? context.request.headers.get('x-real-ip')
		?? null;
}

function requestUserAgent(context: Pick<APIContext, 'request'>) {
	return context.request.headers.get('user-agent') ?? null;
}

function splitSqlStatements(sql: string) {
	return sql
		.split(';')
		.map((statement) => statement.trim())
		.filter(Boolean);
}

async function runD1Schema(db: D1DatabaseLike, sql: string) {
	for (const statement of splitSqlStatements(sql)) {
		await db.prepare(statement).run();
	}
}

async function ensureWebSessionSchema(db: D1DatabaseLike) {
	if (!db.prepare) return;
	let ready = webSessionSchemaReady.get(db);
	if (!ready) {
		ready = (async () => {
			await runD1Schema(db, WEB_SESSIONS_TABLE_SQL);
			const result = await db.prepare('PRAGMA table_info(web_sessions)').all<{ name: string }>();
			const tableInfoRows: Array<{ name: string }> = result.results ?? [];
			const columns = new Set(tableInfoRows.map((row: { name: string }) => row.name));
			for (const [column, statement] of WEB_SESSION_COLUMN_MIGRATIONS) {
				if (!columns.has(column)) {
					await runD1Schema(db, statement);
				}
			}
			await runD1Schema(db, WEB_SESSION_INDEX_SQL);
		})();
		webSessionSchemaReady.set(db, ready);
	}
	await ready;
}

async function writeDbSession(db: D1DatabaseLike, session: SiteWebSession) {
	await ensureWebSessionSchema(db);
	await db.prepare(`
		INSERT OR REPLACE INTO web_sessions (
			id, user_id, identity_id, better_auth_session_id, provider, provider_subject, email, display_name,
			principal_json, csrf_token, ip_address, user_agent, authenticated_at, last_seen_at, expires_at,
			revoked_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		session.id,
		session.userId,
		session.identityId,
		session.betterAuthSessionId,
		session.provider,
		session.providerSubject,
		session.email,
		session.displayName,
		JSON.stringify(session.principal),
		session.csrfToken,
		session.ipAddress,
		session.userAgent,
		session.authenticatedAt,
		session.lastSeenAt,
		session.expiresAt,
		session.revokedAt,
		session.createdAt,
		session.updatedAt,
	).run();
}

async function readDbSession(db: D1DatabaseLike, id: string) {
	await ensureWebSessionSchema(db);
	const row = await db.prepare(`
		SELECT * FROM web_sessions WHERE id = ?
	`).bind(id).first<{
		id: string;
		user_id: string;
		identity_id: string | null;
		better_auth_session_id: string | null;
		provider: string;
		provider_subject: string;
		email: string | null;
		display_name: string | null;
		principal_json: string;
		csrf_token: string;
		ip_address: string | null;
		user_agent: string | null;
		authenticated_at: string;
		last_seen_at: string | null;
		expires_at: string;
		revoked_at: string | null;
		created_at: string;
		updated_at: string;
	}>();
	if (!row) return null;
	return {
		id: row.id,
		userId: row.user_id,
		identityId: row.identity_id,
		betterAuthSessionId: row.better_auth_session_id,
		provider: row.provider,
		providerSubject: row.provider_subject,
		email: row.email,
		displayName: row.display_name,
		principal: JSON.parse(row.principal_json),
		csrfToken: row.csrf_token,
		ipAddress: row.ip_address,
		userAgent: row.user_agent,
		authenticatedAt: row.authenticated_at,
		lastSeenAt: row.last_seen_at,
		expiresAt: row.expires_at,
		revokedAt: row.revoked_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	} satisfies SiteWebSession;
}

async function touchDbSession(db: D1DatabaseLike, id: string) {
	const timestamp = new Date().toISOString();
	await db.prepare(`UPDATE web_sessions SET last_seen_at = ?, updated_at = ? WHERE id = ?`).bind(timestamp, timestamp, id).run();
}

async function revokeDbSession(db: D1DatabaseLike, id: string) {
	await ensureWebSessionSchema(db);
	const timestamp = new Date().toISOString();
	await db.prepare(`
		UPDATE web_sessions
		SET revoked_at = COALESCE(revoked_at, ?), updated_at = ?
		WHERE id = ?
	`).bind(timestamp, timestamp, id).run();
}

export async function createSiteWebSession(
	context: Pick<APIContext, 'locals' | 'url' | 'cookies' | 'request'>,
	input: Omit<SiteWebSession, 'id' | 'csrfToken' | 'createdAt' | 'updatedAt' | 'authenticatedAt' | 'lastSeenAt' | 'expiresAt' | 'revokedAt' | 'ipAddress' | 'userAgent'> & {
		ipAddress?: string | null;
		userAgent?: string | null;
	},
) {
	const config = getSiteAuthConfig(context);
	const current = new Date();
	const session: SiteWebSession = {
		id: randomUUID(),
		csrfToken: randomBytes(24).toString('base64url'),
		authenticatedAt: current.toISOString(),
		lastSeenAt: current.toISOString(),
		expiresAt: new Date(current.getTime() + config.sessionTtlSeconds * 1000).toISOString(),
		revokedAt: null,
		createdAt: current.toISOString(),
		updatedAt: current.toISOString(),
		...input,
		ipAddress: input.ipAddress ?? requestIpAddress(context),
		userAgent: input.userAgent ?? requestUserAgent(context),
	};
	const db = runtimeDb(context);
	if (db) {
		await writeDbSession(db, session);
	} else {
		memorySessions.set(session.id, session);
	}
	context.cookies.set(WEB_SESSION_COOKIE, session.id, webCookieOptions(context.url, config.sessionTtlSeconds));
	context.cookies.set(WEB_CSRF_COOKIE, session.csrfToken, csrfCookieOptions(context.url, config.sessionTtlSeconds));
	return session;
}

export async function loadSiteWebSession(context: Pick<APIContext, 'locals' | 'cookies'>) {
	const sessionId = context.cookies.get(WEB_SESSION_COOKIE)?.value;
	if (!sessionId) return null;
	const db = runtimeDb(context);
	const session = db ? await readDbSession(db, sessionId) : memorySessions.get(sessionId) ?? null;
	if (!session) return null;
	if (session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
		if (db) {
			await revokeDbSession(db, sessionId);
		} else {
			memorySessions.delete(sessionId);
		}
		return null;
	}
	if (db) {
		await touchDbSession(db, sessionId);
		session.lastSeenAt = new Date().toISOString();
	}
	return session;
}

export async function deleteSiteWebSession(context: Pick<APIContext, 'locals' | 'cookies' | 'url'>) {
	const sessionId = context.cookies.get(WEB_SESSION_COOKIE)?.value;
	if (sessionId) {
		const db = runtimeDb(context);
		if (db) {
			await revokeDbSession(db, sessionId);
		} else {
			memorySessions.delete(sessionId);
		}
	}
	context.cookies.delete(WEB_SESSION_COOKIE, { path: '/' });
	context.cookies.delete(WEB_CSRF_COOKIE, { path: '/' });
}

export async function listSiteWebSessions(context: Pick<APIContext, 'locals' | 'cookies'>) {
	const currentSessionId = context.cookies.get(WEB_SESSION_COOKIE)?.value ?? null;
	const current = await loadSiteWebSession(context);
	if (!current) return [];
	const db = runtimeDb(context);
	if (!db) {
		return [...memorySessions.values()]
			.filter((session) => session.userId === current.userId)
			.map((session) => ({ ...session, current: session.id === currentSessionId }));
	}
	await ensureWebSessionSchema(db);
	const rows = await db.prepare(`
		SELECT * FROM web_sessions
		WHERE user_id = ?
		ORDER BY COALESCE(last_seen_at, authenticated_at, created_at) DESC
		LIMIT 50
	`).bind(current.userId).all<Record<string, unknown>>();
	const sessionRows: Array<Record<string, unknown>> = rows.results ?? [];
	return sessionRows.map((row: Record<string, unknown>) => {
		const session = {
			id: String(row.id),
			userId: String(row.user_id),
			identityId: typeof row.identity_id === 'string' ? row.identity_id : null,
			betterAuthSessionId: typeof row.better_auth_session_id === 'string' ? row.better_auth_session_id : null,
			provider: String(row.provider),
			providerSubject: String(row.provider_subject),
			email: typeof row.email === 'string' ? row.email : null,
			displayName: typeof row.display_name === 'string' ? row.display_name : null,
			principal: JSON.parse(String(row.principal_json ?? '{}')),
			csrfToken: String(row.csrf_token),
			ipAddress: typeof row.ip_address === 'string' ? row.ip_address : null,
			userAgent: typeof row.user_agent === 'string' ? row.user_agent : null,
			authenticatedAt: String(row.authenticated_at),
			lastSeenAt: typeof row.last_seen_at === 'string' ? row.last_seen_at : null,
			expiresAt: String(row.expires_at),
			revokedAt: typeof row.revoked_at === 'string' ? row.revoked_at : null,
			createdAt: String(row.created_at),
			updatedAt: String(row.updated_at),
			current: row.id === currentSessionId,
		};
		return session;
	});
}

export async function revokeSiteWebSession(context: Pick<APIContext, 'locals' | 'cookies'>, sessionId: string) {
	const current = await loadSiteWebSession(context);
	if (!current) return false;
	if (sessionId === current.id) return false;
	const db = runtimeDb(context);
	if (!db) {
		const session = memorySessions.get(sessionId);
		if (session?.userId !== current.userId) return false;
		memorySessions.delete(sessionId);
		return true;
	}
	await ensureWebSessionSchema(db);
	const existing = await db.prepare(`SELECT id FROM web_sessions WHERE id = ? AND user_id = ?`).bind(sessionId, current.userId).first();
	if (!existing) return false;
	await revokeDbSession(db, sessionId);
	return true;
}

export async function loadOwnedSiteWebSession(context: Pick<APIContext, 'locals' | 'cookies'>, sessionId: string) {
	const current = await loadSiteWebSession(context);
	if (!current) return null;
	const db = runtimeDb(context);
	const session = db ? await readDbSession(db, sessionId) : memorySessions.get(sessionId) ?? null;
	if (!session || session.userId !== current.userId || session.id === current.id) return null;
	return session;
}
