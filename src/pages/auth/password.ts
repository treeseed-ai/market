import type { APIRoute } from 'astro';
import { passwordMeetsPolicy } from '../../lib/auth/password-policy';
import { apiAccessTokenFromCookies, resolveMarketApiBaseUrl } from '../../lib/market/api-client';

export const prerender = false;

function redirectWithStatus(context: Parameters<APIRoute>[0], status: string) {
	return context.redirect(`/app/account?password=${encodeURIComponent(status)}`, 303);
}

export const POST: APIRoute = async (context) => {
	const token = apiAccessTokenFromCookies(context);
	if (!token) return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	const form = await context.request.formData();
	const newPassword = String(form.get('newPassword') ?? '');
	const confirmPassword = String(form.get('confirmPassword') ?? '');
	const currentPassword = String(form.get('currentPassword') ?? '');
	if (!newPassword || !confirmPassword) return redirectWithStatus(context, 'missing');
	if (newPassword !== confirmPassword) return redirectWithStatus(context, 'mismatch');
	if (!passwordMeetsPolicy(newPassword)) return redirectWithStatus(context, 'weak');
	const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/auth/web/password`, {
		method: 'PATCH',
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${token}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify({ currentPassword, newPassword }),
	});
	if (!response.ok) return redirectWithStatus(context, currentPassword ? 'change_failed' : 'set_failed');
	return redirectWithStatus(context, 'updated');
};
