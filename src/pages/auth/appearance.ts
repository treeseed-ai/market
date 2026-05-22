import type { APIRoute } from 'astro';
import {
	resolveAnonymousThemePreference,
	setAnonymousThemeCookies,
} from '../../lib/auth/appearance';
import { apiAccessTokenFromCookies, resolveMarketApiBaseUrl } from '../../lib/market/api-client';

export const prerender = false;

function accountAppearanceRedirect(status: string) {
	return `/app/account?appearance=${encodeURIComponent(status)}`;
}

export const POST: APIRoute = async (context) => {
	if (!context.locals.auth?.principal) {
		return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	}
	try {
		const form = await context.request.formData();
		const preference = resolveAnonymousThemePreference(context, form);
		const token = apiAccessTokenFromCookies(context);
		if (token) {
			const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/auth/web/appearance`, {
				method: 'PATCH',
				headers: {
					accept: 'application/json',
					authorization: `Bearer ${token}`,
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					colorScheme: preference.scheme,
					themeMode: preference.mode,
				}),
			});
			if (!response.ok) throw new Error('Appearance update failed.');
		}
		setAnonymousThemeCookies(context, preference);
		const response = context.redirect(accountAppearanceRedirect('updated'), 303);
		for (const cookie of context.cookies.headers()) {
			response.headers.append('set-cookie', cookie);
		}
		return response;
	} catch {
		return context.redirect(accountAppearanceRedirect('failed'), 303);
	}
};
