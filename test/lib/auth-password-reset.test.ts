import { describe, expect, it } from 'vitest';
import { getSiteAuthConfig } from '../../src/lib/auth/config';

async function withEnv<T>(values: Record<string, string | undefined>, action: () => T | Promise<T>) {
	const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
	for (const [key, value] of Object.entries(values)) {
		if (value == null) delete process.env[key];
		else process.env[key] = value;
	}
	try {
		return await action();
	} finally {
		for (const [key, value] of Object.entries(previous)) {
			if (value == null) delete process.env[key];
			else process.env[key] = value;
		}
	}
}

describe('password reset configuration', () => {
	it('keeps reset URLs API-owned while preserving sender configuration', () => {
		return withEnv({
			TREESEED_SITE_URL: 'https://treeseed.ai',
			BETTER_AUTH_URL: 'https://treeseed.ai',
			TREESEED_AUTH_PASSWORD_RESET_TTL: '7200',
			TREESEED_AUTH_EMAIL_FROM: 'TreeSeed Auth <auth@example.com>',
		}, () => {
			const config = getSiteAuthConfig();
			expect(config.authEmail.from).toBe('TreeSeed Auth <auth@example.com>');
			expect(config.passwordResetTtlSeconds).toBe(7200);
			expect(config.siteBaseUrl).toBe('https://treeseed.ai');
		});
	});
});
