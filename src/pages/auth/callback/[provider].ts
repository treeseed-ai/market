import type { APIRoute } from 'astro';
import { isSupportedAuthProvider, normalizeReturnTo } from '../../../lib/auth/flow';
import { resolveApiBaseUrl, setApiAccessTokenCookie } from '../../../lib/market/api-client';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const provider = context.params.provider ?? 'unknown';
	if (!isSupportedAuthProvider(provider)) {
		return context.redirect('/auth/sign-in?error=unsupported_provider', 302);
	}
	const target = new URL(`/v1/auth/oauth/${provider}/callback`, resolveApiBaseUrl(context.locals));
	target.search = context.url.search;
	const response = await fetch(target, {
		method: 'GET',
		headers: { accept: 'application/json' },
		redirect: 'manual',
	});
	const envelope = await response.json().catch(() => null);
	if (!response.ok || envelope?.ok === false || !envelope?.payload?.accessToken) {
		const message = envelope?.error ?? 'OAuth sign-in is unavailable.';
		return context.redirect(`/auth/sign-in?error=${encodeURIComponent(message)}`, 302);
	}
	setApiAccessTokenCookie(context, envelope.payload.accessToken, Number(envelope.payload.expiresInSeconds ?? 900));
	const redirectTo = typeof envelope.payload.returnTo === 'string' && envelope.payload.returnTo.startsWith('/') && !envelope.payload.returnTo.startsWith('//')
		? envelope.payload.returnTo
		: normalizeReturnTo(context);
	const redirect = context.redirect(redirectTo, 302);
	for (const cookie of context.cookies.headers()) redirect.headers.append('set-cookie', cookie);
	return redirect;
};
