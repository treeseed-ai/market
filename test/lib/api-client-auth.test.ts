import { describe, expect, it } from 'vitest';
import { apiServiceHeaders } from '../../packages/admin/src/lib/market/api-client';

function context() {
	return {
		url: new URL('https://treeseed.ai/app/teams/new'),
		locals: {
			auth: {
				session: { id: 'session-1', identityId: 'identity-1', authenticatedAt: '2026-05-27T00:00:00.000Z' },
				principal: { id: 'user-1', metadata: {} },
			},
			runtime: {
				env: {
					TREESEED_WEB_SERVICE_ID: 'web',
					TREESEED_WEB_SERVICE_SECRET: 'site-secret',
					TREESEED_WEB_ASSERTION_SECRET: 'assertion-secret',
				},
			},
		},
	} as any;
}

describe('API web auth headers', () => {
	it('does not send internal service credentials when forwarding a user bearer token', () => {
		const headers = apiServiceHeaders(context(), { skipUserAssertion: true });
		expect(headers.get('x-treeseed-service-id')).toBeNull();
		expect(headers.get('x-treeseed-service-secret')).toBeNull();
		expect(headers.get('x-treeseed-user-assertion')).toBeNull();
	});

	it('can still create trusted service assertion headers when no user bearer token is available', () => {
		const headers = apiServiceHeaders(context());
		expect(headers.get('x-treeseed-service-id')).toBe('web');
		expect(headers.get('x-treeseed-service-secret')).toBe('site-secret');
		expect(headers.get('x-treeseed-user-assertion')).toMatch(/^[^.]+\.[^.]+$/u);
	});
});
