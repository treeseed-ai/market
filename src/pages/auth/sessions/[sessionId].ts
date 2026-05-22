import type { APIRoute } from 'astro';
import { apiAccessTokenFromCookies, clearApiAccessTokenCookie, resolveMarketApiBaseUrl } from '../../../lib/market/api-client';

export const prerender = false;

async function revokeApiSession(context: Parameters<APIRoute>[0]) {
	const token = apiAccessTokenFromCookies(context);
	if (!token) return false;
	const sessionId = context.params.sessionId;
	const path = sessionId
		? `/v1/auth/web/sessions/${encodeURIComponent(sessionId)}/revoke`
		: '/v1/auth/logout';
	const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}${path}`, {
		method: 'POST',
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${token}`,
		},
	}).catch(() => null);
	clearApiAccessTokenCookie(context);
	return Boolean(response?.ok);
}

export const DELETE: APIRoute = async (context) => {
	const revoked = await revokeApiSession(context);
	return new Response(JSON.stringify({ ok: revoked }), {
		status: revoked ? 200 : 404,
		headers: { 'content-type': 'application/json' },
	});
};

export const POST: APIRoute = async (context) => {
	await revokeApiSession(context);
	return context.redirect('/app/account', 303);
};
