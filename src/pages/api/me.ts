import type { APIRoute } from 'astro';
import { exchangeSiteSession } from '../../lib/auth/api';
import { loadSiteWebSession } from '../../lib/auth/session-store';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const session = await loadSiteWebSession(context);
	if (!session) {
		return new Response(JSON.stringify({ ok: false, error: 'Authentication required.' }), {
			status: 401,
			headers: { 'content-type': 'application/json' },
		});
	}
	const exchange = await exchangeSiteSession(context, session);
	return new Response(JSON.stringify({
		ok: true,
		payload: {
			sessionId: session.id,
			userId: session.userId,
			principal: exchange.principal,
			accessTokenExpiresAt: exchange.expiresAt,
		},
	}), {
		headers: { 'content-type': 'application/json' },
	});
};
