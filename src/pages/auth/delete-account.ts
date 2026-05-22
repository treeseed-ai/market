import type { APIRoute } from 'astro';
import { clearApiAccessTokenCookie, apiAccessTokenFromCookies, resolveMarketApiBaseUrl } from '../../lib/market/api-client';

export const prerender = false;

const DELETE_ACCOUNT_CONFIRMATION = 'DELETE MY ACCOUNT';

function redirect(status: string) {
	return `/app/account?delete=${encodeURIComponent(status)}`;
}

export const POST: APIRoute = async (context) => {
	const token = apiAccessTokenFromCookies(context);
	if (!token) return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	const form = await context.request.formData();
	const confirmation = String(form.get('confirmation') ?? '');
	if (confirmation !== DELETE_ACCOUNT_CONFIRMATION) return context.redirect(redirect('confirm'), 303);
	const blockersResponse = await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/auth/web/account/deletion-blockers`, {
		headers: { accept: 'application/json', authorization: `Bearer ${token}` },
	});
	const blockers = await blockersResponse.json().catch(() => null);
	if ((blockers?.payload ?? []).length > 0) return context.redirect(redirect('blocked'), 303);
	const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/auth/web/account`, {
		method: 'DELETE',
		headers: { accept: 'application/json', authorization: `Bearer ${token}` },
	});
	if (!response.ok) return context.redirect(redirect('failed'), 303);
	clearApiAccessTokenCookie(context);
	const next = context.redirect('/?account=deleted', 303);
	for (const cookie of context.cookies.headers()) next.headers.append('set-cookie', cookie);
	return next;
};
