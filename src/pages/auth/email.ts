import type { APIRoute } from 'astro';
import { createSiteBetterAuth, ensureBetterAuthD1Schema } from '../../lib/auth/better-auth';
import { getSiteAuthConfig } from '../../lib/auth/config';
import { accountStatusRedirect, appendAuthAndMarketCookies } from '../../lib/auth/account';
import { authEmailConfigurationMessage, canDeliverAuthEmail } from '../../lib/auth/email';

export const prerender = false;

export const POST: APIRoute = async (context) => {
	if (!context.locals.auth?.principal) {
		return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	}
	const form = await context.request.formData();
	const email = String(form.get('email') ?? '').trim().toLowerCase();
	if (!email) {
		return context.redirect(accountStatusRedirect('email', 'missing'), 303);
	}
	if (!canDeliverAuthEmail(context)) {
		return context.redirect(`${accountStatusRedirect('email', 'not_configured')}&message=${encodeURIComponent(authEmailConfigurationMessage())}`, 303);
	}
	await ensureBetterAuthD1Schema(context);
	const config = getSiteAuthConfig(context);
	const auth = createSiteBetterAuth(context);
	const callbackURL = new URL('/auth/verified', config.betterAuthBaseUrl);
	callbackURL.searchParams.set('returnTo', '/app/account?email=verified');
	const headers = new Headers(context.request.headers);
	headers.delete('content-length');
	headers.set('content-type', 'application/json');
	headers.set('accept', 'application/json');
	const betterAuthResponse = await auth.handler(new Request(`${config.betterAuthBaseUrl}/api/auth/change-email`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			newEmail: email,
			callbackURL: callbackURL.href,
		}),
	}));
	if (!betterAuthResponse.ok) {
		const payload = await betterAuthResponse.json().catch(() => null) as { message?: string; error?: string } | null;
		const message = payload?.message ?? payload?.error ?? 'Email update failed.';
		return context.redirect(`${accountStatusRedirect('email', 'failed')}&message=${encodeURIComponent(message)}`, 303);
	}
	const response = context.redirect(accountStatusRedirect('email', 'sent'), 303);
	return appendAuthAndMarketCookies(response, context, betterAuthResponse);
};
