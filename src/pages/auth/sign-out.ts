import type { APIRoute } from 'astro';
import { apiAccessTokenFromCookies, clearApiAccessTokenCookie, resolveMarketApiBaseUrl } from '../../lib/market/api-client';

export const prerender = false;

async function signOut(context: Parameters<APIRoute>[0]) {
	const token = apiAccessTokenFromCookies(context);
	if (token) {
		await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/auth/logout`, {
			method: 'POST',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${token}`,
			},
		}).catch(() => null);
	}
	clearApiAccessTokenCookie(context);
	return context.redirect('/', 303);
}

export const POST: APIRoute = signOut;
export const GET: APIRoute = signOut;
