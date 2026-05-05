import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { getSiteAuthConfig } from '../../src/lib/auth/config';
import { evaluatePasswordStrength, passwordMeetsPolicy, passwordPolicyMessage } from '../../src/lib/auth/password-policy';

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
		for (const key of [
			'TREESEED_API_BOOTSTRAP_ADMIN_ALLOWLIST',
			'TREESEED_AUTH_LOCAL_USE_MAILPIT',
			'TREESEED_MAILPIT_SMTP_HOST',
			'TREESEED_MAILPIT_SMTP_PORT',
			'TREESEED_AUTH_EMAIL_FROM',
			'TREESEED_AUTH_SMTP_HOST',
			'TREESEED_AUTH_PASSWORD_RESET_TTL',
			'TREESEED_AUTH_EMAIL_VERIFICATION_TTL',
		]) {
			expect(registry.entries[key], key).toBeTruthy();
			expect(registry.entries[key].howToGet, key).toBeTruthy();
		}
		expect(registry.entries.TREESEED_API_BOOTSTRAP_ADMIN_ALLOWLIST.description).toContain('platform_admin');
		expect(registry.entries.TREESEED_API_BOOTSTRAP_ADMIN_ALLOWLIST.howToGet).toContain('Root user');
		expect(passwordPolicyMessage()).toContain('at least 12 characters');
	});

	it('does not send production SMTP credentials to local Mailpit auth email', () => {
		const previous = {
			TREESEED_AUTH_LOCAL_USE_MAILPIT: process.env.TREESEED_AUTH_LOCAL_USE_MAILPIT,
			TREESEED_MAILPIT_SMTP_HOST: process.env.TREESEED_MAILPIT_SMTP_HOST,
			TREESEED_MAILPIT_SMTP_PORT: process.env.TREESEED_MAILPIT_SMTP_PORT,
			TREESEED_SMTP_USERNAME: process.env.TREESEED_SMTP_USERNAME,
			TREESEED_SMTP_PASSWORD: process.env.TREESEED_SMTP_PASSWORD,
			TREESEED_SMTP_HOST: process.env.TREESEED_SMTP_HOST,
			TREESEED_SMTP_PORT: process.env.TREESEED_SMTP_PORT,
			TREESEED_SMTP_FROM: process.env.TREESEED_SMTP_FROM,
		};
		try {
			process.env.TREESEED_AUTH_LOCAL_USE_MAILPIT = 'true';
			process.env.TREESEED_MAILPIT_SMTP_HOST = '127.0.0.1';
			process.env.TREESEED_MAILPIT_SMTP_PORT = '1025';
			process.env.TREESEED_SMTP_USERNAME = 'production-user';
			process.env.TREESEED_SMTP_PASSWORD = 'production-password';
			process.env.TREESEED_SMTP_HOST = 'smtp.example.com';
			process.env.TREESEED_SMTP_PORT = '587';
			process.env.TREESEED_SMTP_FROM = 'contact@example.com';

			const config = getSiteAuthConfig();

			expect(config.authEmail.useMailpit).toBe(true);
			expect(config.authEmail.host).toBe('127.0.0.1');
			expect(config.authEmail.port).toBe(1025);
			expect(config.authEmail.username).toBe('');
			expect(config.authEmail.password).toBe('');
			expect(config.authEmail.from).toBe('contact@example.com');
		} finally {
			for (const [key, value] of Object.entries(previous)) {
				if (value == null) {
					delete process.env[key];
				} else {
					process.env[key] = value;
				}
			}
		}
	});
});
