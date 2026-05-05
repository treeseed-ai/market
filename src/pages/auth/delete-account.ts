import type { APIRoute } from 'astro';
import { createSiteBetterAuth, ensureBetterAuthD1Schema } from '../../lib/auth/better-auth';
import { getSiteAuthConfig } from '../../lib/auth/config';
import {
	accountDeletionConfirmationMatches,
	accountStatusRedirect,
	appendAuthAndMarketCookies,
	deleteMarketAccountRows,
	evaluateAccountDeletionBlockers,
	loadCurrentBetterAuthAccount,
} from '../../lib/auth/account';

export const prerender = false;

export const POST: APIRoute = async (context) => {
	const principal = context.locals.auth?.principal;
	if (!principal?.id) {
		return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	}
	await ensureBetterAuthD1Schema(context);
	const form = await context.request.formData();
	const confirmation = String(form.get('confirmation') ?? '');
	if (!accountDeletionConfirmationMatches(confirmation)) {
		return context.redirect(accountStatusRedirect('delete', 'confirm'), 303);
	}
	const blockers = await evaluateAccountDeletionBlockers(context);
	if (blockers.length > 0) {
		return context.redirect(accountStatusRedirect('delete', 'blocked'), 303);
	}
	const account = await loadCurrentBetterAuthAccount(context);
	if (!account) {
		return context.redirect(`/auth/sign-in?returnTo=${encodeURIComponent('/app/account')}`, 303);
	}
	const hasCredential = account.accounts.some((entry: any) => entry.providerId === 'credential');
	const password = String(form.get('password') ?? '');
	if (hasCredential && !password) {
		return context.redirect(accountStatusRedirect('delete', 'password_required'), 303);
	}
	const config = getSiteAuthConfig(context);
	const auth = createSiteBetterAuth(context);
	const headers = new Headers(context.request.headers);
	headers.delete('content-length');
	headers.set('content-type', 'application/json');
	headers.set('accept', 'application/json');
	const betterAuthResponse = await auth.handler(new Request(`${config.betterAuthBaseUrl}/api/auth/delete-user`, {
		method: 'POST',
		headers,
		body: JSON.stringify(hasCredential ? { password } : {}),
	}));
	if (!betterAuthResponse.ok) {
		const payload = await betterAuthResponse.json().catch(() => null) as { message?: string; error?: string; code?: string } | null;
		const message = `${payload?.message ?? payload?.error ?? payload?.code ?? ''}`.toLowerCase();
		const status = message.includes('session') || message.includes('fresh') || message.includes('expired')
			? 'reauth_required'
			: message.includes('password')
				? 'invalid_password'
				: 'failed';
		return context.redirect(accountStatusRedirect('delete', status), 303);
	}
	await deleteMarketAccountRows(context, principal.id);
	const response = context.redirect('/?account=deleted', 303);
	return appendAuthAndMarketCookies(response, context, betterAuthResponse);
};
