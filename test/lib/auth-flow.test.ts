import { describe, expect, it, vi } from 'vitest';
import { redirectAuthenticatedToApp, submitBetterAuthEmailFlow } from '../../src/lib/auth/flow';

function redirect(path: string, status: 300 | 301 | 302 | 303 | 304 | 307 | 308 = 302) {
	return new Response(null, {
		status,
		headers: {
			location: path,
		},
	});
}

describe('market auth page flow', () => {
	it('does not redirect anonymous visitors away from pre-authentication pages', () => {
		expect(redirectAuthenticatedToApp({
			locals: {
				auth: null,
			},
			redirect,
		} as any)).toBeNull();
	});

	it('redirects signed-in visitors from pre-authentication pages to the app', () => {
		const response = redirectAuthenticatedToApp({
			locals: {
				auth: {
					principal: {
						id: 'user-1',
					},
				},
			},
			redirect,
		} as any);
		expect(response?.status).toBe(302);
		expect(response?.headers.get('location')).toBe('/app/');
	});

	it('submits hosted email registration without relying on BetterAuth route matching', async () => {
		const origin = 'https://treeseed-market-staging-479e4625.treeseed.ai';
		const suffix = Date.now().toString(36);
		const result = await submitBetterAuthEmailFlow({
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
			request: new Request(`${origin}/auth/register?returnTo=%2Fapp%2F`, {
				method: 'POST',
				headers: {
					origin,
					'content-type': 'application/x-www-form-urlencoded',
				},
			}),
			cookies: {},
		} as any, 'sign-up/email', {
			name: 'Hosted Flow User',
			email: `hosted-flow-${suffix}@example.com`,
			password: 'StrongPassword1!',
			callbackURL: `${origin}/auth/verified?returnTo=%2Fapp%2F`,
		}, { finalize: false });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.user.email).toBe(`hosted-flow-${suffix}@example.com`);
		}
	});

	it('renders hosted sign-in failures instead of surfacing a not-found response', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const origin = 'https://treeseed-market-staging-479e4625.treeseed.ai';
		try {
			const result = await submitBetterAuthEmailFlow({
				locals: {
					runtime: {
						env: {
							TREESEED_AUTH_ALLOW_MEMORY_DB: 'true',
							TREESEED_AUTH_MODE: 'internal-first',
						},
					},
				},
				url: new URL(`${origin}/auth/sign-in?returnTo=%2Fapp%2F`),
				request: new Request(`${origin}/auth/sign-in?returnTo=%2Fapp%2F`, {
					method: 'POST',
					headers: {
						origin,
						'content-type': 'application/x-www-form-urlencoded',
					},
				}),
				cookies: {},
			} as any, 'sign-in/email', {
				email: 'missing-user@example.com',
				password: 'WrongPassword1!',
				rememberMe: true,
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.status).toBe(401);
				expect(result.error).toBe('Invalid email or password');
			}
		} finally {
			consoleError.mockRestore();
		}
	});
});
