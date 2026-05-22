import type { APIRoute } from 'astro';
import { apiAccessTokenFromCookies, resolveMarketApiBaseUrl, setApiAccessTokenCookie } from '../../lib/market/api-client';

export const prerender = false;

function redirect(status: string, message = '') {
	return `/app/account?email=${encodeURIComponent(status)}${message ? `&message=${encodeURIComponent(message)}` : ''}`;
}

export const POST: APIRoute = async (context) => {
	const token = apiAccessTokenFromCookies(context);
	if (!token) return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	const form = await context.request.formData();
	const email = String(form.get('email') ?? '').trim().toLowerCase();
	if (!email) return context.redirect(redirect('missing'), 303);
	const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/auth/web/email`, {
		method: 'PATCH',
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${token}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify({ email }),
	});
	const envelope = await response.json().catch(() => null);
	if (!response.ok || envelope?.ok === false) return context.redirect(redirect('failed', envelope?.error ?? 'Email update failed.'), 303);
	if (envelope?.payload?.accessToken) {
		setApiAccessTokenCookie(context, envelope.payload.accessToken, Number(envelope.payload.expiresInSeconds ?? 900));
	}
	const next = context.redirect(redirect('verified'), 303);
	for (const cookie of context.cookies.headers()) next.headers.append('set-cookie', cookie);
	return next;
};
