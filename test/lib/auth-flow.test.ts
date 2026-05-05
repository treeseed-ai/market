import { describe, expect, it } from 'vitest';
import { redirectAuthenticatedToApp } from '../../src/lib/auth/flow';

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
});
