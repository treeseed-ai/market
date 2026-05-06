import type { APIContext } from 'astro';
import type { D1DatabaseLike } from '@treeseed/core/types/cloudflare';
import { ensureBetterAuthD1Schema } from './better-auth';
import { getSiteAuthConfig } from './config';
import { sendAuthEmail } from './email';

interface PasswordResetInput {
	email: string;
	redirectTo: string;
}

interface PasswordResetOptions {
	now?: () => Date;
	sendEmail?: typeof sendAuthEmail;
	tokenFactory?: () => string;
}

type PasswordResetContext = Pick<APIContext, 'locals' | 'url'>;

function runtimeDb(context: Pick<APIContext, 'locals'>) {
	return context.locals.runtime?.env?.SITE_DATA_DB as D1DatabaseLike | undefined;
}

function generateResetToken() {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	let raw = '';
	for (const byte of bytes) raw += String.fromCharCode(byte);
	return btoa(raw).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

function resetEmailText(url: string) {
	return [
		'We received a request to reset your Treeseed Market password.',
		'',
		`Open this link to choose a new password: ${url}`,
		'',
		'If you did not request this, you can ignore this email.',
	].join('\n');
}

export async function requestPasswordResetEmail(
	context: PasswordResetContext,
	input: PasswordResetInput,
	options: PasswordResetOptions = {},
) {
	const db = runtimeDb(context);
	if (!db?.prepare) {
		return {
			ok: false as const,
			error: 'Password reset requires the site data database.',
		};
	}

	await ensureBetterAuthD1Schema(context);
	const email = input.email.trim();
	const user = await db.prepare(`
		SELECT id, email
		FROM better_auth_user
		WHERE LOWER(email) = LOWER(?)
		LIMIT 1
	`).bind(email).first<{ id: string; email: string }>();

	if (!user?.id || !user.email) {
		return {
			ok: false as const,
			error: 'No account was found for that email.',
		};
	}

	const config = getSiteAuthConfig(context);
	const now = options.now?.() ?? new Date();
	const token = options.tokenFactory?.() ?? generateResetToken();
	const identifier = `reset-password:${token}`;
	const expiresAt = now.getTime() + (config.passwordResetTtlSeconds * 1000);
	const resetCallbackUrl = new URL(`${config.betterAuthBaseUrl}/reset-password/${encodeURIComponent(token)}`);
	resetCallbackUrl.searchParams.set('callbackURL', input.redirectTo);

	await db.prepare(`
		DELETE FROM better_auth_verification
		WHERE identifier LIKE 'reset-password:%'
		  AND value = ?
	`).bind(user.id).run();
	await db.prepare(`
		INSERT INTO better_auth_verification (id, identifier, value, expiresAt, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)
	`).bind(
		`reset_${token}`,
		identifier,
		user.id,
		expiresAt,
		now.getTime(),
		now.getTime(),
	).run();

	try {
		await (options.sendEmail ?? sendAuthEmail)(context, {
			to: user.email,
			subject: 'Reset your Treeseed Market password',
			text: resetEmailText(resetCallbackUrl.href),
		});
	} catch (error) {
		await db.prepare(`
			DELETE FROM better_auth_verification
			WHERE identifier = ?
		`).bind(identifier).run().catch(() => null);
		console.error('[auth] Password reset email delivery failed.', error);
		return {
			ok: false as const,
			error: 'Unable to send password reset email. Check SMTP configuration and try again.',
		};
	}

	return {
		ok: true as const,
		email: user.email,
	};
}
