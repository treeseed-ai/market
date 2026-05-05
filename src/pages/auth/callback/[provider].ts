import type { APIRoute } from 'astro';
import { createSiteBetterAuth, ensureBetterAuthD1Schema } from '../../../lib/auth/better-auth';
import { assignImmutableUsername, deriveAvailableUsernameForAccount, normalizeUsername } from '../../../lib/auth/account';
import { finalizeBetterAuthSession, isSupportedAuthProvider, normalizeReturnTo } from '../../../lib/auth/flow';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	await ensureBetterAuthD1Schema(context);
	const auth = createSiteBetterAuth(context);
	const sessionData = await auth.api.getSession({
		headers: context.request.headers,
	});
	if (!sessionData?.user || !sessionData?.session) {
		return context.redirect('/auth/sign-in?error=session_missing', 302);
	}
	const provider = context.params.provider ?? 'unknown';
	if (!isSupportedAuthProvider(provider)) {
		return context.redirect('/auth/sign-in?error=unsupported_provider', 302);
	}
	try {
		const accounts = await auth.api.listUserAccounts({ headers: context.request.headers }).catch(() => []);
		const providerAccount = accounts.find((account: any) => account.providerId === provider);
		let user = sessionData.user;
		if (!normalizeUsername((user as any).username)) {
			const candidate = await deriveAvailableUsernameForAccount(context, { user, accounts });
			if (!candidate) {
				return context.redirect(`/auth/username?returnTo=${encodeURIComponent(normalizeReturnTo(context))}`, 302);
			}
			const assigned = await assignImmutableUsername(context, {
				username: candidate,
				betterAuthUserId: user.id,
			});
			if (!assigned.ok) {
				return context.redirect(`/auth/username?returnTo=${encodeURIComponent(normalizeReturnTo(context))}`, 302);
			}
			user = { ...user, username: assigned.username };
		}
		await finalizeBetterAuthSession(context, {
			provider,
			user,
			session: sessionData.session,
			providerSubject: providerAccount?.accountId ?? user.id,
		});
	} catch (error) {
		console.error('[auth] OAuth account sync failed.', error);
		return context.redirect('/auth/sign-in?error=sync_failed', 302);
	}
	return context.redirect(normalizeReturnTo(context), 302);
};
