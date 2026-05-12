import type { APIRoute } from 'astro';
import {
	saveCurrentUserThemePreference,
	setAnonymousThemeCookies,
} from '../../lib/auth/appearance';

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
		const preference = await saveCurrentUserThemePreference(context, {
			colorScheme: form.get('colorScheme'),
			themeMode: form.get('themeMode'),
		});
		if (!preference) {
			return context.redirect(accountAppearanceRedirect('failed'), 303);
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
