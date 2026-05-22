import type { APIRoute } from 'astro';
import { resolveMarketApiBaseUrl } from '../../../lib/market/api-client';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const target = new URL('/v1/auth/web/username/check', resolveMarketApiBaseUrl(context.locals));
	target.searchParams.set('username', context.url.searchParams.get('username') ?? '');
	const response = await fetch(target, { headers: { accept: 'application/json' } });
	return new Response(response.body, {
		status: response.status,
		headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
	});
};
