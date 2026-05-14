import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createSiteBetterAuth } from '../../src/lib/auth/better-auth';
import {
	getSiteAuthConfig,
	localAuthCanonicalRedirectUrl,
	normalizeBetterAuthBaseUrl,
	normalizeSiteBaseUrl,
} from '../../src/lib/auth/config';
import { evaluatePasswordStrength, passwordMeetsPolicy, passwordPolicyMessage } from '../../src/lib/auth/password-policy';

async function withEnv<T>(values: Record<string, string | undefined>, action: () => T | Promise<T>) {
	const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
	for (const [key, value] of Object.entries(values)) {
		if (value == null) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
	try {
		return await action();
	} finally {
		for (const [key, value] of Object.entries(previous)) {
			if (value == null) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}

describe('market auth password policy', () => {
	it('requires all strength rules', () => {
		expect(passwordMeetsPolicy('short')).toBe(false);
		expect(passwordMeetsPolicy('longbutmissingnumber!')).toBe(false);
		expect(passwordMeetsPolicy('StrongPassword1!')).toBe(true);

		const result = evaluatePasswordStrength('StrongPassword1!');
		expect(result.label).toBe('Strong');
		expect(result.rules.every((rule) => rule.met)).toBe(true);
	});

	it('documents auth email and bootstrap root configuration in the env registry', () => {
		const registry = parse(readFileSync('src/env.yaml', 'utf8')) as { entries: Record<string, any> };
		const coreRegistry = parse(readFileSync('packages/core/src/env.yaml', 'utf8')) as { entries: Record<string, any> };
		const agentRegistry = parse(readFileSync('packages/agent/src/env.yaml', 'utf8')) as { entries: Record<string, any> };
		for (const key of [
			'TREESEED_AUTH_EMAIL_FROM',
			'TREESEED_AUTH_PASSWORD_RESET_TTL',
			'TREESEED_AUTH_EMAIL_VERIFICATION_TTL',
		]) {
			expect(registry.entries[key], key).toBeTruthy();
			expect(registry.entries[key].howToGet, key).toBeTruthy();
		}
		for (const key of ['TREESEED_SMTP_HOST', 'TREESEED_SMTP_PORT', 'TREESEED_SMTP_FROM']) {
			expect(coreRegistry.entries[key], key).toBeTruthy();
			expect(coreRegistry.entries[key].howToGet, key).toBeTruthy();
		}
		expect(agentRegistry.entries.TREESEED_API_BOOTSTRAP_ADMIN_ALLOWLIST?.howToGet).toBeTruthy();
		expect(coreRegistry.entries.TREESEED_SMTP_HOST.localDefaultValueRef).toBe('localSmtpHostDefault');
		expect(coreRegistry.entries.TREESEED_SMTP_PORT.localDefaultValueRef).toBe('localSmtpPortDefault');
		expect(agentRegistry.entries.TREESEED_API_BOOTSTRAP_ADMIN_ALLOWLIST.description).toContain('platform_admin');
		expect(agentRegistry.entries.TREESEED_API_BOOTSTRAP_ADMIN_ALLOWLIST.howToGet).toContain('Root user');
		expect(agentRegistry.entries.TREESEED_API_BOOTSTRAP_ADMIN_ALLOWLIST.targets).toEqual(expect.arrayContaining(['cloudflare-var', 'railway-var']));
		expect(passwordPolicyMessage()).toContain('at least 12 characters');
	});

	it('uses the shared SMTP settings for auth email with auth sender overrides', () => {
		return withEnv({
			BETTER_AUTH_URL: 'https://treeseed.ai',
			TREESEED_SITE_URL: 'https://treeseed.ai',
			TREESEED_SMTP_USERNAME: 'smtp-user',
			TREESEED_SMTP_PASSWORD: 'smtp-password',
			TREESEED_SMTP_HOST: '127.0.0.1',
			TREESEED_SMTP_PORT: '1025',
			TREESEED_SMTP_FROM: 'contact@example.com',
			TREESEED_SMTP_REPLY_TO: 'support@example.com',
			TREESEED_AUTH_EMAIL_FROM: 'Treeseed Auth <auth@example.com>',
			TREESEED_AUTH_EMAIL_REPLY_TO: 'auth-support@example.com',
		}, () => {
			const config = getSiteAuthConfig();

			expect(config.authEmail.host).toBe('127.0.0.1');
			expect(config.authEmail.port).toBe(1025);
			expect(config.authEmail.username).toBe('smtp-user');
			expect(config.authEmail.password).toBe('smtp-password');
			expect(config.authEmail.from).toBe('Treeseed Auth <auth@example.com>');
			expect(config.authEmail.replyTo).toBe('auth-support@example.com');
		});
	});

	it('uses Mailpit SMTP defaults for local auth email even when hosted SMTP env vars are present', () => {
		return withEnv({
			BETTER_AUTH_URL: 'http://127.0.0.1:4321',
			TREESEED_SITE_URL: undefined,
			TREESEED_MAILPIT_SMTP_HOST: undefined,
			TREESEED_MAILPIT_SMTP_PORT: undefined,
			TREESEED_SMTP_USERNAME: 'hosted-user',
			TREESEED_SMTP_PASSWORD: 'hosted-password',
			TREESEED_SMTP_HOST: 'smtp.mailgun.org',
			TREESEED_SMTP_PORT: '587',
			TREESEED_SMTP_FROM: 'contact@example.com',
			TREESEED_SMTP_REPLY_TO: 'support@example.com',
			TREESEED_AUTH_EMAIL_FROM: undefined,
			TREESEED_AUTH_EMAIL_REPLY_TO: undefined,
		}, () => {
			const config = getSiteAuthConfig();

			expect(config.authEmail.host).toBe('127.0.0.1');
			expect(config.authEmail.port).toBe(1025);
			expect(config.authEmail.username).toBe('');
			expect(config.authEmail.password).toBe('');
			expect(config.authEmail.from).toBe('contact@example.com');
			expect(config.authEmail.replyTo).toBe('support@example.com');
		});
	});

	it('separates public site URLs from the BetterAuth API mount', () => {
		expect(normalizeSiteBaseUrl('https://treeseed.ai/api/auth')).toBe('https://treeseed.ai');
		expect(normalizeBetterAuthBaseUrl('https://treeseed.ai')).toBe('https://treeseed.ai/api/auth');
		expect(normalizeBetterAuthBaseUrl('https://treeseed.ai/api/auth')).toBe('https://treeseed.ai/api/auth');

		return withEnv({
			BETTER_AUTH_URL: undefined,
			TREESEED_SITE_URL: 'https://treeseed.ai',
		}, () => {
			const config = getSiteAuthConfig();
			expect(config.siteBaseUrl).toBe('https://treeseed.ai');
			expect(config.betterAuthBaseUrl).toBe('https://treeseed.ai/api/auth');
		});
	});

	it('uses the current request origin when hosted auth URL env vars are unset', () => {
		return withEnv({
			BETTER_AUTH_URL: undefined,
			TREESEED_SITE_URL: undefined,
		}, () => {
			const config = getSiteAuthConfig({
				locals: {},
				url: new URL('https://treeseed-market-staging-479e4625.treeseed.ai/auth/register?returnTo=%2Fapp%2F'),
			} as any);

			expect(config.siteBaseUrl).toBe('https://treeseed-market-staging-479e4625.treeseed.ai');
			expect(config.betterAuthBaseUrl).toBe('https://treeseed-market-staging-479e4625.treeseed.ai/api/auth');
		});
	});

	it('canonicalizes alternate local auth hosts to the configured dev origin', () => {
		expect(localAuthCanonicalRedirectUrl(
			new URL('http://localhost:4321/app/account?tab=sessions'),
			'http://127.0.0.1:4321',
		)?.toString()).toBe('http://127.0.0.1:4321/app/account?tab=sessions');

		expect(localAuthCanonicalRedirectUrl(
			new URL('http://127.0.0.1:4321/app/account'),
			'http://127.0.0.1:4321',
		)).toBeNull();

		expect(localAuthCanonicalRedirectUrl(
			new URL('https://treeseed.ai/app/account'),
			'https://treeseed.ai',
		)).toBeNull();
	});

	it('routes mounted BetterAuth email sign-up requests when configured with an origin URL', async () => {
		await withEnv({
			BETTER_AUTH_URL: 'http://127.0.0.1:4321',
			TREESEED_SITE_URL: undefined,
			TREESEED_AUTH_ALLOW_MEMORY_DB: 'true',
			TREESEED_AUTH_MODE: 'internal-first',
			TREESEED_AUTH_INTERNAL_SIGNUP: 'open',
			TREESEED_SMTP_HOST: undefined,
			TREESEED_SMTP_PORT: undefined,
			TREESEED_SMTP_FROM: undefined,
		}, async () => {
			const auth = createSiteBetterAuth();
			const suffix = Date.now().toString(36);
			const response = await auth.handler(new Request('http://127.0.0.1:4321/api/auth/sign-up/email', {
				method: 'POST',
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					origin: 'http://127.0.0.1:4321',
				},
				body: JSON.stringify({
					name: 'Debug User',
					email: `debug-${suffix}@example.com`,
					password: 'StrongPassword1!',
					callbackURL: 'http://127.0.0.1:4321/auth/verified?returnTo=%2Fapp%2F',
				}),
			}));
			const payload = await response.json().catch(() => null) as { user?: { email?: string } } | null;
			expect(response.status).toBe(200);
			expect(payload?.user?.email).toBe(`debug-${suffix}@example.com`);
		});
	}, 20_000);

	it('routes BetterAuth email sign-up requests with request-origin fallback config', async () => {
		await withEnv({
			BETTER_AUTH_URL: undefined,
			TREESEED_SITE_URL: undefined,
			TREESEED_AUTH_ALLOW_MEMORY_DB: undefined,
			TREESEED_AUTH_MODE: undefined,
			TREESEED_AUTH_INTERNAL_SIGNUP: undefined,
			TREESEED_SMTP_HOST: undefined,
			TREESEED_SMTP_PORT: undefined,
			TREESEED_SMTP_FROM: undefined,
		}, async () => {
			const origin = 'https://treeseed-market-staging-479e4625.treeseed.ai';
			const auth = createSiteBetterAuth({
				locals: {
					runtime: {
						env: {
							TREESEED_AUTH_ALLOW_MEMORY_DB: 'true',
							TREESEED_AUTH_MODE: 'internal-first',
							TREESEED_AUTH_INTERNAL_SIGNUP: 'open',
							TREESEED_AUTH_EMAIL_VERIFICATION_ENABLED: 'false',
						},
					},
				},
				url: new URL(`${origin}/auth/register?returnTo=%2Fapp%2F`),
			} as any);
			const suffix = Date.now().toString(36);
			const response = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, {
				method: 'POST',
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					origin,
				},
				body: JSON.stringify({
					name: 'Hosted Debug User',
					email: `hosted-debug-${suffix}@example.com`,
					password: 'StrongPassword1!',
					callbackURL: `${origin}/auth/verified?returnTo=%2Fapp%2F`,
				}),
			}));
			const payload = await response.json().catch(() => null) as { user?: { email?: string } } | null;
			expect(response.status).toBe(200);
			expect(payload?.user?.email).toBe(`hosted-debug-${suffix}@example.com`);
		});
	}, 20_000);
});
