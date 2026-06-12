import { describe, expect, it, vi } from 'vitest';
import { redirectAuthenticatedToApp, submitMarketEmailAuthFlow } from '../../packages/admin/src/lib/auth/flow';

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

	it('submits hosted email registration through the API route', async () => {
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({
			ok: true,
			payload: {
				confirmationRequired: true,
				email: 'hosted-flow-test@example.com',
				expiresInSeconds: 3600,
			},
		}), { status: 200, headers: { 'content-type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);
		const origin = 'https://treeseed-market-staging-479e4625.treeseed.ai';
		try {
			const result = await submitMarketEmailAuthFlow({
				locals: {
					runtime: {
						env: {
							TREESEED_MARKET_API_BASE_URL: 'https://api.example.test',
						},
					},
				},
				url: new URL(`${origin}/auth/register?returnTo=%2Fapp%2F`),
				request: new Request(`${origin}/auth/register?returnTo=%2Fapp%2F`, {
					method: 'POST',
					headers: {
						origin,
						'content-type': 'application/x-www-form-urlencoded',
						'user-agent': 'Hosted Signup Browser/1.0',
					},
				}),
				clientAddress: '198.51.100.12',
				cookies: {},
			} as any, 'sign-up/email', {
				name: 'Hosted Flow User',
				email: 'hosted-flow-test@example.com',
				password: 'StrongPassword1!',
			}, { finalize: false });

			expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/v1/auth/web/sign-up', expect.any(Object));
			const [, requestInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
			const headers = requestInit.headers as Headers;
			expect(headers.get('user-agent')).toBe('Hosted Signup Browser/1.0');
			expect(headers.get('x-treeseed-client-ip')).toBe('198.51.100.12');
			expect(headers.get('x-forwarded-for')).toBe('198.51.100.12');
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.confirmationRequired).toBe(true);
				expect(result.user.email).toBe('hosted-flow-test@example.com');
			}
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('renders hosted sign-in failures instead of surfacing a not-found response', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({
			ok: false,
			error: 'Invalid email or password',
		}), { status: 401, headers: { 'content-type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);
		const origin = 'https://treeseed-market-staging-479e4625.treeseed.ai';
		try {
			const result = await submitMarketEmailAuthFlow({
				locals: {
					runtime: {
						env: {
							TREESEED_MARKET_API_BASE_URL: 'https://api.example.test',
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
			vi.unstubAllGlobals();
			consoleError.mockRestore();
		}
	});

	it('locks authenticated appearance cookies from the signed-in principal', async () => {
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({
			ok: true,
			payload: {
				accessToken: 'token-1',
				expiresInSeconds: 900,
				principal: {
					id: 'user-1',
					displayName: 'Theme User',
					metadata: {
						appearance: { scheme: 'cedar', mode: 'dark' },
					},
				},
			},
		}), { status: 200, headers: { 'content-type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);
		const setCookie = vi.fn();
		const origin = 'https://treeseed-market-staging-479e4625.treeseed.ai';
		try {
			const result = await submitMarketEmailAuthFlow({
				locals: {
					runtime: {
						env: {
							TREESEED_MARKET_API_BASE_URL: 'https://api.example.test',
						},
					},
				},
				url: new URL(`${origin}/auth/sign-in?returnTo=%2Fapp%2F`),
				request: new Request(`${origin}/auth/sign-in?returnTo=%2Fapp%2F`, { method: 'POST' }),
				cookies: {
					set: setCookie,
				},
			} as any, 'sign-in/email', {
				email: 'theme-user@example.com',
				password: 'StrongPassword1!',
				rememberMe: true,
			});

			expect(result.ok).toBe(true);
			expect(setCookie).toHaveBeenCalledWith('treeseed_color_scheme', 'cedar', expect.any(Object));
			expect(setCookie).toHaveBeenCalledWith('treeseed_theme_mode', 'dark', expect.any(Object));
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
