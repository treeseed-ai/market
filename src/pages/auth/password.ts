import type { APIRoute } from 'astro';
import { createSiteBetterAuth, ensureBetterAuthD1Schema } from '../../lib/auth/better-auth';
import { passwordMeetsPolicy } from '../../lib/auth/password-policy';

export const prerender = false;

function redirectWithStatus(context: Parameters<APIRoute>[0], status: string) {
	return context.redirect(`/app/account?password=${encodeURIComponent(status)}`, 303);
}

export const POST: APIRoute = async (context) => {
	await ensureBetterAuthD1Schema(context);
	const form = await context.request.formData();
	const newPassword = String(form.get('newPassword') ?? '');
	const confirmPassword = String(form.get('confirmPassword') ?? '');
	const currentPassword = String(form.get('currentPassword') ?? '');
	if (!newPassword || !confirmPassword) {
		return redirectWithStatus(context, 'missing');
	}
	if (newPassword !== confirmPassword) {
		return redirectWithStatus(context, 'mismatch');
	}
	if (!passwordMeetsPolicy(newPassword)) {
		return redirectWithStatus(context, 'weak');
	}
	const auth = createSiteBetterAuth(context);
	try {
		if (currentPassword) {
			await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword,
					revokeOtherSessions: false,
				},
				headers: context.request.headers,
			});
		} else {
			await auth.api.setPassword({
				body: { newPassword },
				headers: context.request.headers,
			});
		}
		return redirectWithStatus(context, 'updated');
	} catch {
		return redirectWithStatus(context, currentPassword ? 'change_failed' : 'set_failed');
	}
};
