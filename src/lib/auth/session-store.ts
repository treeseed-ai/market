import { randomBytes, randomUUID } from 'node:crypto';
import type { APIContext } from 'astro';
import type { D1DatabaseLike } from '@treeseed/core/types/cloudflare';
import { WEB_CSRF_COOKIE, WEB_SESSION_COOKIE, csrfCookieOptions, getSiteAuthConfig, webCookieOptions } from './config';

export interface SiteWebSession {
	id: string;
	userId: string;
	identityId: string | null;
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
	authenticatedAt: string;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
}

const memorySessions = new Map<string, SiteWebSession>();

function runtimeDb(context: Pick<APIContext, 'locals'>) {
	return context.locals.runtime?.env?.SITE_DATA_DB ?? null;
}

async function writeDbSession(db: D1DatabaseLike, session: SiteWebSession) {
	await db.prepare(`
		INSERT OR REPLACE INTO web_sessions (
			id, user_id, identity_id, provider, provider_subject, email, display_name,
			principal_json, csrf_token, authenticated_at, expires_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		session.id,
		session.userId,
		session.identityId,
		session.provider,
		session.providerSubject,
		session.email,
		session.displayName,
		JSON.stringify(session.principal),
		session.csrfToken,
		session.authenticatedAt,
		session.expiresAt,
		session.createdAt,
		session.updatedAt,
	).run();
}

async function readDbSession(db: D1DatabaseLike, id: string) {
	const row = await db.prepare(`
		SELECT * FROM web_sessions WHERE id = ?
	`).bind(id).first<{
		id: string;
		user_id: string;
		identity_id: string | null;
		provider: string;
		provider_subject: string;
		email: string | null;
		display_name: string | null;
		principal_json: string;
		csrf_token: string;
		authenticated_at: string;
		expires_at: string;
		created_at: string;
		updated_at: string;
	}>();
	if (!row) return null;
	return {
		id: row.id,
		userId: row.user_id,
		identityId: row.identity_id,
		provider: row.provider,
		providerSubject: row.provider_subject,
		email: row.email,
		displayName: row.display_name,
		principal: JSON.parse(row.principal_json),
		csrfToken: row.csrf_token,
		authenticatedAt: row.authenticated_at,
		expiresAt: row.expires_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	} satisfies SiteWebSession;
}

async function deleteDbSession(db: D1DatabaseLike, id: string) {
	await db.prepare(`DELETE FROM web_sessions WHERE id = ?`).bind(id).run();
}

export async function createSiteWebSession(
	context: Pick<APIContext, 'locals' | 'url' | 'cookies'>,
	input: Omit<SiteWebSession, 'id' | 'csrfToken' | 'createdAt' | 'updatedAt' | 'authenticatedAt' | 'expiresAt'>,
) {
	const config = getSiteAuthConfig(context);
	const current = new Date();
	const session: SiteWebSession = {
		id: randomUUID(),
		csrfToken: randomBytes(24).toString('base64url'),
		authenticatedAt: current.toISOString(),
		expiresAt: new Date(current.getTime() + config.sessionTtlSeconds * 1000).toISOString(),
		createdAt: current.toISOString(),
		updatedAt: current.toISOString(),
		...input,
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
	if (new Date(session.expiresAt).getTime() <= Date.now()) {
		if (db) {
			await deleteDbSession(db, sessionId);
		} else {
			memorySessions.delete(sessionId);
		}
		return null;
	}
	return session;
}

export async function deleteSiteWebSession(context: Pick<APIContext, 'locals' | 'cookies' | 'url'>) {
	const sessionId = context.cookies.get(WEB_SESSION_COOKIE)?.value;
	if (sessionId) {
		const db = runtimeDb(context);
		if (db) {
			await deleteDbSession(db, sessionId);
		} else {
			memorySessions.delete(sessionId);
		}
	}
	context.cookies.delete(WEB_SESSION_COOKIE, { path: '/' });
	context.cookies.delete(WEB_CSRF_COOKIE, { path: '/' });
}
