import type { APIRoute } from 'astro';
import { listSiteWebSessions } from '../../../lib/auth/session-store';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const sessions = await listSiteWebSessions(context);
	return new Response(JSON.stringify({
		ok: true,
		payload: sessions.map((session: Awaited<ReturnType<typeof listSiteWebSessions>>[number]) => ({
			id: session.id,
			provider: session.provider,
			email: session.email,
			displayName: session.displayName,
			ipAddress: session.ipAddress,
			userAgent: session.userAgent,
			authenticatedAt: session.authenticatedAt,
			lastSeenAt: session.lastSeenAt,
			expiresAt: session.expiresAt,
			revokedAt: session.revokedAt,
			current: session.current,
		})),
	}), {
		headers: { 'content-type': 'application/json' },
	});
};
