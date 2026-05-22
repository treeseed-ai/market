import type { APIRoute } from 'astro';
import { apiAccessTokenFromCookies, resolveMarketApiBaseUrl, setApiAccessTokenCookie } from '../../lib/market/api-client';

export const prerender = false;

function redirect(status: string) {
	return `/app/account?profile=${encodeURIComponent(status)}`;
}

export const POST: APIRoute = async (context) => {
	const token = apiAccessTokenFromCookies(context);
	if (!token) return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	const form = await context.request.formData();
	const name = String(form.get('name') ?? '').trim();
	const image = String(form.get('image') ?? '').trim();
	if (!name) return context.redirect(redirect('missing_name'), 303);
	if (image && !/^https:\/\/.+/u.test(image)) return context.redirect(redirect('invalid_image'), 303);
	const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/auth/web/profile`, {
		method: 'PATCH',
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${token}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify({ displayName: name, image: image || null }),
	});
	const envelope = await response.json().catch(() => null);
	if (!response.ok || envelope?.ok === false) return context.redirect(redirect('failed'), 303);
	if (envelope?.payload?.accessToken) {
		setApiAccessTokenCookie(context, envelope.payload.accessToken, Number(envelope.payload.expiresInSeconds ?? 900));
	}
	const next = context.redirect(redirect('updated'), 303);
	for (const cookie of context.cookies.headers()) next.headers.append('set-cookie', cookie);
	return next;
};
