import type { APIRoute } from 'astro';
import { createSiteBetterAuth, ensureBetterAuthD1Schema } from '../../../lib/auth/better-auth';
import { authEmailConfigurationMessage, canDeliverAuthEmail } from '../../../lib/auth/email';
import { passwordMeetsPolicy, passwordPolicyMessage } from '../../../lib/auth/password-policy';

export const prerender = false;

const PASSWORD_PROTECTED_POST_PATHS = new Set([
	'/api/auth/sign-up/email',
	'/api/auth/reset-password',
	'/api/auth/set-password',
	'/api/auth/change-password',
]);
const EMAIL_DELIVERY_POST_PATHS = new Set([
	'/api/auth/sign-up/email',
	'/api/auth/request-password-reset',
	'/api/auth/send-verification-email',
	'/api/auth/change-email',
]);
const MARKET_MANAGED_ACCOUNT_PATHS = new Set([
	'/api/auth/update-user',
	'/api/auth/change-email',
	'/api/auth/delete-user',
	'/api/auth/delete-user/callback',
]);

async function readPasswordFromRequest(request: Request) {
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		const body = await request.clone().json().catch(() => null) as Record<string, unknown> | null;
		const value = body?.password ?? body?.newPassword;
		return typeof value === 'string' ? value : '';
	}
	if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
		const form = await request.clone().formData().catch(() => null);
		const value = form?.get('password') ?? form?.get('newPassword');
		return typeof value === 'string' ? value : '';
	}
	return '';
}

export const ALL: APIRoute = async (context) => {
	await ensureBetterAuthD1Schema(context);
	if (MARKET_MANAGED_ACCOUNT_PATHS.has(context.url.pathname)) {
		return Response.json({
			error: 'MARKET_ACCOUNT_ROUTE_REQUIRED',
			message: 'Use the Market account routes for profile, email, and account deletion changes.',
		}, { status: 404 });
	}
	if (context.request.method === 'POST' && PASSWORD_PROTECTED_POST_PATHS.has(context.url.pathname)) {
		const password = await readPasswordFromRequest(context.request);
		if (!password || !passwordMeetsPolicy(password)) {
			return Response.json({
				error: 'PASSWORD_TOO_WEAK',
				message: passwordPolicyMessage(),
			}, { status: 400 });
		}
	}
	if (context.request.method === 'POST' && EMAIL_DELIVERY_POST_PATHS.has(context.url.pathname) && !canDeliverAuthEmail(context)) {
		return Response.json({
			error: 'AUTH_EMAIL_NOT_CONFIGURED',
			message: authEmailConfigurationMessage(),
		}, { status: 500 });
	}
	const auth = createSiteBetterAuth(context);
	return auth.handler(context.request);
};
