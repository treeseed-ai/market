import type { APIRoute } from 'astro';
import { finalizeCurrentBetterAuthSession, normalizeReturnTo } from '../../lib/auth/flow';
import { sendWelcomeEmail } from '../../lib/auth/welcome-email';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const returnTo = normalizeReturnTo(context);
	const verifiedReturn = new URL(returnTo, context.url.origin);
	const isEmailChange = verifiedReturn.pathname === '/app/account' && verifiedReturn.searchParams.get('email') === 'verified';
	if (context.url.searchParams.get('error')) {
		return context.redirect(`/auth/sign-in?error=${encodeURIComponent('Email verification failed or expired.')}&returnTo=${encodeURIComponent(returnTo)}`, 302);
	}
	try {
		const principal = await finalizeCurrentBetterAuthSession(context, 'credential');
		if (!isEmailChange && principal?.metadata?.email && typeof principal.metadata.email === 'string') {
			await sendWelcomeEmail(context, {
				email: principal.metadata.email,
				displayName: principal.displayName,
				signInUrl: `${context.url.origin}/auth/sign-in?verified=1&returnTo=${encodeURIComponent(returnTo)}`,
			}).catch((error) => {
				console.warn('[auth] Welcome email delivery failed.', error);
			});
		}
		if (!principal) {
			return context.redirect(`/auth/sign-in?verified=1&returnTo=${encodeURIComponent(returnTo)}`, 302);
		}
		const response = context.redirect(returnTo, 302);
		for (const cookie of context.cookies.headers()) {
			response.headers.append('set-cookie', cookie);
		}
		return response;
	} catch (error) {
		console.error('[auth] Email verification account sync failed.', error);
		return context.redirect(`/auth/sign-in?error=${encodeURIComponent('Email verified, but account sync failed.')}&returnTo=${encodeURIComponent(returnTo)}`, 302);
	}
};
