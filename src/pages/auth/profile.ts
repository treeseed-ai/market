import type { APIRoute } from 'astro';
import { createSiteBetterAuth, ensureBetterAuthD1Schema, getBetterAuthSetCookies } from '../../lib/auth/better-auth';
import { getSiteAuthConfig } from '../../lib/auth/config';
import {
	accountStatusRedirect,
	appendAuthAndMarketCookies,
	isValidProfileImageUrl,
	normalizeAccountProfileInput,
	syncBetterAuthUserToMarketSession,
} from '../../lib/auth/account';

export const prerender = false;

export const POST: APIRoute = async (context) => {
	if (!context.locals.auth?.principal) {
		return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	}
	await ensureBetterAuthD1Schema(context);
	const form = await context.request.formData();
	const profile = normalizeAccountProfileInput(form);
	if (!profile.name) {
		return context.redirect(accountStatusRedirect('profile', 'missing_name'), 303);
	}
	if (!isValidProfileImageUrl(profile.image)) {
		return context.redirect(accountStatusRedirect('profile', 'invalid_image'), 303);
	}
	const config = getSiteAuthConfig(context);
	const auth = createSiteBetterAuth(context);
	const headers = new Headers(context.request.headers);
	headers.delete('content-length');
	headers.set('content-type', 'application/json');
	headers.set('accept', 'application/json');
	const betterAuthResponse = await auth.handler(new Request(`${config.betterAuthBaseUrl}/update-user`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			name: profile.name,
			image: profile.image,
		}),
	}));
	if (!betterAuthResponse.ok) {
		return context.redirect(accountStatusRedirect('profile', 'failed'), 303);
	}
	const setCookies = getBetterAuthSetCookies(betterAuthResponse);
	await syncBetterAuthUserToMarketSession(context, { setCookies });
	const response = context.redirect(accountStatusRedirect('profile', 'updated'), 303);
	return appendAuthAndMarketCookies(response, context, betterAuthResponse);
};
