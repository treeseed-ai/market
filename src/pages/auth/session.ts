import type { APIRoute } from 'astro';
import { loadSiteWebSession } from '../../lib/auth/session-store';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const session = await loadSiteWebSession(context);
	return new Response(JSON.stringify({
		ok: true,
		payload: session
			? {
				sessionId: session.id,
				userId: session.userId,
				principal: session.principal,
				email: session.email,
				displayName: session.displayName,
				expiresAt: session.expiresAt,
			}
			: null,
	}), {
		headers: { 'content-type': 'application/json' },
	});
};
