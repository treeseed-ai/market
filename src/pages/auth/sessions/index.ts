import type { APIRoute } from 'astro';
import { apiAccessTokenFromCookies, resolveMarketApiBaseUrl } from '../../../lib/market/api-client';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const token = apiAccessTokenFromCookies(context);
	if (!token) {
		return new Response(JSON.stringify({ ok: true, payload: [] }), {
			headers: { 'content-type': 'application/json' },
		});
	}
	const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/auth/web/sessions`, {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${token}`,
		},
	});
	return new Response(response.body, {
		status: response.status,
		headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
	});
};
