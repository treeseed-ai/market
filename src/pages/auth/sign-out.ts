import type { APIRoute } from 'astro';
import { createSiteBetterAuth, ensureBetterAuthD1Schema, getBetterAuthSetCookies } from '../../lib/auth/better-auth';
import { deleteSiteWebSession } from '../../lib/auth/session-store';

export const prerender = false;

async function signOut(context: Parameters<APIRoute>[0]) {
	await ensureBetterAuthD1Schema(context);
	await deleteSiteWebSession(context);
	const auth = createSiteBetterAuth(context);
	const headers = new Headers(context.request.headers);
	headers.delete('content-length');
	const betterAuthResponse = await auth.handler(new Request(`${context.url.origin}/api/auth/sign-out`, {
		method: 'POST',
		headers,
	}));
	const response = context.redirect('/', 303);
	for (const cookie of getBetterAuthSetCookies(betterAuthResponse)) {
		response.headers.append('set-cookie', cookie);
	}
	return response;
}

export const POST: APIRoute = signOut;
export const GET: APIRoute = signOut;
