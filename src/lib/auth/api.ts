import { createHmac, randomBytes } from 'node:crypto';
import type { APIContext } from 'astro';
import { getSiteAuthConfig } from './config';
import type { SiteWebSession } from './session-store';

function signClaims(payload: string, secret: string) {
	return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createTrustedUserAssertion(context: Pick<APIContext, 'locals'>, session: SiteWebSession) {
	const config = getSiteAuthConfig(context);
	const claims = {
		userId: session.userId,
		sessionId: session.id,
		identityId: session.identityId,
		authTime: session.authenticatedAt,
		expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
		nonce: randomBytes(18).toString('base64url'),
	};
	const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
	return `${encodedPayload}.${signClaims(encodedPayload, config.apiAssertionSecret)}`;
}

export async function callRailwayApi(
	context: Pick<APIContext, 'locals'>,
	path: string,
	init: RequestInit & { json?: unknown } = {},
) {
	const config = getSiteAuthConfig(context);
	const headers = new Headers(init.headers);
	headers.set('accept', 'application/json');
	headers.set('x-treeseed-service-id', config.apiServiceId);
	headers.set('x-treeseed-service-secret', config.apiServiceSecret);
	if (init.json !== undefined) {
		headers.set('content-type', 'application/json');
	}
	const response = await fetch(`${config.apiBaseUrl}${path}`, {
		...init,
		headers,
		body: init.json === undefined ? init.body : JSON.stringify(init.json),
	});
	return response;
}

export async function exchangeSiteSession(context: Pick<APIContext, 'locals'>, session: SiteWebSession) {
	const response = await callRailwayApi(context, '/internal/auth/web/exchange', {
		method: 'POST',
		headers: {
			'x-treeseed-user-assertion': createTrustedUserAssertion(context, session),
		},
		json: {
			userId: session.userId,
			sessionId: session.id,
			identityId: session.identityId,
			authTime: session.authenticatedAt,
			expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
			nonce: randomBytes(18).toString('base64url'),
		},
	});
	return response.json() as Promise<{
		ok: true;
		accessToken: string;
		tokenType: 'Bearer';
		expiresAt: string;
		expiresInSeconds: number;
		principal: SiteWebSession['principal'];
	}>;
}
