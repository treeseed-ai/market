import type { APIRoute } from 'astro';
import { createSiteBetterAuth } from '../../../lib/auth/better-auth';
import { loadOwnedSiteWebSession, revokeSiteWebSession } from '../../../lib/auth/session-store';

export const prerender = false;

async function revokeBetterAuthSession(context: Parameters<APIRoute>[0], betterAuthSessionId: string | null) {
	const db = context.locals.runtime?.env?.SITE_DATA_DB;
	if (!db || !betterAuthSessionId) return;
	const auth = createSiteBetterAuth(context);
	const current = await auth.api.getSession({ headers: context.request.headers }).catch(() => null);
	if (!current?.user?.id) return;
	const row = await db.prepare(`
		SELECT id FROM better_auth_session
		WHERE id = ? AND userId = ?
	`).bind(betterAuthSessionId, current.user.id).first<{ id: string }>();
	if (!row) return;
	await db.prepare('DELETE FROM better_auth_session WHERE id = ?').bind(betterAuthSessionId).run();
}

export const DELETE: APIRoute = async (context) => {
	const sessionId = context.params.sessionId ?? '';
	if (!sessionId) {
		return new Response(JSON.stringify({ ok: false, error: 'Session id is required.' }), {
			status: 400,
			headers: { 'content-type': 'application/json' },
		});
	}
	const target = await loadOwnedSiteWebSession(context, sessionId);
	const revoked = await revokeSiteWebSession(context, sessionId);
	if (revoked) {
		await revokeBetterAuthSession(context, target?.betterAuthSessionId ?? null);
	}
	return new Response(JSON.stringify({ ok: revoked }), {
		status: revoked ? 200 : 404,
		headers: { 'content-type': 'application/json' },
	});
};

export const POST: APIRoute = async (context) => {
	const sessionId = context.params.sessionId ?? '';
	if (sessionId) {
		const target = await loadOwnedSiteWebSession(context, sessionId);
		const revoked = await revokeSiteWebSession(context, sessionId);
		if (revoked) {
			await revokeBetterAuthSession(context, target?.betterAuthSessionId ?? null);
		}
	}
	return context.redirect('/app/account', 303);
};
