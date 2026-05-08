import { describe, expect, it, vi } from 'vitest';
import { getSiteAuthConfig } from '../../src/lib/auth/config';
import { requestPasswordResetEmail } from '../../src/lib/auth/password-reset';

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

function createFakeDb(users: Array<{ id: string; email: string }>) {
	const verifications: Array<Record<string, unknown>> = [];
	return {
		verifications,
		db: {
			prepare(sql: string) {
				const statement = {
					async first() {
						if (sql.includes('sqlite_master')) return { name: 'better_auth_user' };
						return null;
					},
					async all() {
						if (sql.includes('PRAGMA table_info')) {
							return {
								results: [
									{ name: 'id' },
									{ name: 'username' },
									{ name: 'firstName' },
									{ name: 'lastName' },
								],
							};
						}
						return { results: [] };
					},
					async run() {
						return { success: true };
					},
				};
				return {
					...statement,
					bind(...params: unknown[]) {
						return {
							...statement,
							async first() {
								if (sql.includes('FROM better_auth_user')) {
									const email = String(params[0] ?? '').toLowerCase();
									return users.find((user) => user.email.toLowerCase() === email) ?? null;
								}
								return null;
							},
							async run() {
								if (sql.includes('DELETE FROM better_auth_verification')) {
									if (sql.includes('identifier = ?')) {
										const identifier = params[0];
										for (let index = verifications.length - 1; index >= 0; index -= 1) {
											if (verifications[index].identifier === identifier) verifications.splice(index, 1);
										}
									} else {
										const userId = params[0];
										for (let index = verifications.length - 1; index >= 0; index -= 1) {
											if (
												String(verifications[index].identifier).startsWith('reset-password:')
												&& verifications[index].value === userId
											) {
												verifications.splice(index, 1);
											}
										}
									}
								}
								if (sql.includes('INSERT INTO better_auth_verification')) {
									verifications.push({
										id: params[0],
										identifier: params[1],
										value: params[2],
										expiresAt: params[3],
										createdAt: params[4],
										updatedAt: params[5],
									});
								}
								return { success: true };
							},
						};
					},
				};
			},
		},
	};
}

function contextWithDb(db: unknown, origin = 'https://treeseed-market-staging-479e4625.treeseed.ai') {
	return {
		locals: {
			runtime: {
				env: {
					SITE_DATA_DB: db,
					TREESEED_SITE_URL: origin,
					BETTER_AUTH_URL: origin,
					TREESEED_AUTH_PASSWORD_RESET_TTL: '3600',
				},
			},
		},
		url: new URL(`${origin}/auth/forgot-password?returnTo=%2Fapp%2F`),
	} as any;
}

describe('password reset email flow', () => {
	it('creates a reset verification and sends the email before reporting success', async () => {
		const { db, verifications } = createFakeDb([{ id: 'user-1', email: 'adrian.webb@knowledge.coop' }]);
		const sent: Array<{ to: string; subject: string; text: string }> = [];
		const now = new Date('2026-05-06T06:00:00.000Z');

		const result = await requestPasswordResetEmail(contextWithDb(db), {
			email: 'ADRIAN.WEBB@KNOWLEDGE.COOP',
			redirectTo: 'https://treeseed-market-staging-479e4625.treeseed.ai/auth/reset-password?returnTo=%2Fapp%2F',
		}, {
			now: () => now,
			tokenFactory: () => 'fixed-token',
			sendEmail: async (_context, message) => {
				sent.push(message);
			},
		});

		expect(result.ok).toBe(true);
		expect(verifications).toEqual([{
			id: 'reset_fixed-token',
			identifier: 'reset-password:fixed-token',
			value: 'user-1',
			expiresAt: now.getTime() + 3_600_000,
			createdAt: now.getTime(),
			updatedAt: now.getTime(),
		}]);
		expect(sent).toHaveLength(1);
		expect(sent[0].to).toBe('adrian.webb@knowledge.coop');
		expect(sent[0].text).toContain('/api/auth/reset-password/fixed-token');
	});

	it('uses Mailpit SMTP defaults for local password reset email delivery', async () => {
		await withEnv({
			TREESEED_SMTP_USERNAME: undefined,
			TREESEED_SMTP_PASSWORD: undefined,
			TREESEED_SMTP_HOST: undefined,
			TREESEED_SMTP_PORT: undefined,
			TREESEED_SMTP_FROM: undefined,
			TREESEED_SMTP_REPLY_TO: undefined,
			TREESEED_AUTH_EMAIL_FROM: undefined,
			TREESEED_AUTH_EMAIL_REPLY_TO: undefined,
		}, async () => {
			const { db } = createFakeDb([{ id: 'user-1', email: 'local@example.com' }]);
			const localOrigin = 'http://127.0.0.1:4321';
			let smtpHost = '';
			let smtpPort = 0;
			let smtpFrom = '';

			const result = await requestPasswordResetEmail(contextWithDb(db, localOrigin), {
				email: 'local@example.com',
				redirectTo: `${localOrigin}/auth/reset-password?returnTo=%2Fapp%2F`,
			}, {
				tokenFactory: () => 'fixed-token',
				sendEmail: async (context) => {
					const config = getSiteAuthConfig(context as any);
					smtpHost = config.authEmail.host;
					smtpPort = config.authEmail.port;
					smtpFrom = config.authEmail.from;
				},
			});

			expect(result.ok).toBe(true);
			expect(smtpHost).toBe('127.0.0.1');
			expect(smtpPort).toBe(1025);
			expect(smtpFrom).toBe('Treeseed Market <auth@treeseed.local>');
		});
	});

	it('does not report reset success when no account exists for the email', async () => {
		const { db, verifications } = createFakeDb([]);
		let sent = false;

		const result = await requestPasswordResetEmail(contextWithDb(db), {
			email: 'missing@example.com',
			redirectTo: 'https://treeseed-market-staging-479e4625.treeseed.ai/auth/reset-password?returnTo=%2Fapp%2F',
		}, {
			tokenFactory: () => 'fixed-token',
			sendEmail: async () => {
				sent = true;
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('No account was found for that email.');
		}
		expect(sent).toBe(false);
		expect(verifications).toEqual([]);
	});

	it('cleans up the reset token when email delivery fails', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { db, verifications } = createFakeDb([{ id: 'user-1', email: 'user@example.com' }]);

		try {
			const result = await requestPasswordResetEmail(contextWithDb(db), {
				email: 'user@example.com',
				redirectTo: 'https://treeseed-market-staging-479e4625.treeseed.ai/auth/reset-password?returnTo=%2Fapp%2F',
			}, {
				tokenFactory: () => 'fixed-token',
				sendEmail: async () => {
					throw new Error('SMTP refused the message');
				},
			});

			expect(result.ok).toBe(false);
			expect(verifications).toEqual([]);
		} finally {
			consoleError.mockRestore();
		}
	});
});
