import type { APIRoute } from 'astro';
import {
	apiAccessTokenFromCookies,
	clearApiAccessTokenCookie,
	apiServiceHeaders,
	resolveApiBaseUrl,
	setApiAccessTokenCookie,
} from '../../lib/market/api-client';

export const prerender = false;

const hopByHopHeaders = new Set([
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'host',
]);

function isRedirectedDeviceApproval(path: string) {
	const parts = path.split('/').filter(Boolean);
	return parts[0] === 'auth' && parts[1] === 'device' && parts[2] === 'approve';
}

function copyClientHeaders(request: Request) {
	const headers = new Headers();
	for (const [name, value] of request.headers) {
		const lower = name.toLowerCase();
		if (hopByHopHeaders.has(lower)) continue;
		if (lower === 'cookie') continue;
		if (lower === 'authorization') continue;
		headers.set(name, value);
	}
	return headers;
}

function isAuthPath(path: string) {
	return path.split('/').filter(Boolean)[0] === 'auth';
}

function shouldClearAuthCookie(path: string, method: string, ok: boolean) {
	if (!ok) return false;
	const parts = path.split('/').filter(Boolean);
	if (parts[0] !== 'auth') return false;
	if (parts[1] === 'logout') return true;
	if (parts[1] === 'web' && parts[2] === 'account' && method === 'DELETE') return true;
	return false;
}

function redactAuthTokens(value: unknown): unknown {
	if (!value || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map(redactAuthTokens);
	const next: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (key === 'accessToken' || key === 'refreshToken') continue;
		next[key] = redactAuthTokens(entry);
	}
	return next;
}

export const ALL: APIRoute = async (context) => {
	const path = context.params.all ?? '';
	if (isRedirectedDeviceApproval(path) && context.request.method.toUpperCase() === 'GET') {
		const target = new URL('/auth/device/approve', context.url.origin);
		target.search = context.url.search;
		return context.redirect(target.toString(), 302);
	}

	const upstreamPath = path === 'healthz' || path.startsWith('healthz/')
		? `/${path}`
		: `/v1/${path}`;
	const upstream = new URL(upstreamPath, resolveApiBaseUrl(context.locals));
	upstream.search = context.url.search;

	const headers = copyClientHeaders(context.request);
	const token = apiAccessTokenFromCookies(context);
	for (const [name, value] of apiServiceHeaders(context, { skipUserAssertion: Boolean(token) })) {
		headers.set(name, value);
	}
	if (token) headers.set('authorization', `Bearer ${token}`);

	let method = context.request.method.toUpperCase();
	const logoutRedirect = path === 'auth/logout' && method === 'GET'
		? (context.url.searchParams.get('returnTo') ?? '/')
		: null;
	if (logoutRedirect) method = 'POST';
	const body = ['GET', 'HEAD'].includes(method) ? undefined : await context.request.arrayBuffer();
	const response = await fetch(upstream, {
		method,
		headers,
		body,
		redirect: 'manual',
	});

	const responseHeaders = new Headers();
	for (const [name, value] of response.headers) {
		if (!hopByHopHeaders.has(name.toLowerCase())) responseHeaders.set(name, value);
	}
	if (logoutRedirect) {
		clearApiAccessTokenCookie(context);
		for (const cookie of context.cookies.headers()) {
			responseHeaders.append('set-cookie', cookie);
		}
		const target = logoutRedirect.startsWith('/') && !logoutRedirect.startsWith('//') ? logoutRedirect : '/';
		responseHeaders.set('location', target);
		return new Response(null, {
			status: 303,
			headers: responseHeaders,
		});
	}
	if (isAuthPath(path) && (response.headers.get('content-type') ?? '').includes('application/json')) {
		const envelope = await response.clone().json().catch(() => null);
		const token = envelope?.payload?.accessToken;
		if (response.ok && typeof token === 'string' && token.trim()) {
			setApiAccessTokenCookie(context, token, Number(envelope.payload.expiresInSeconds ?? 15 * 60));
		}
		if (shouldClearAuthCookie(path, method, response.ok)) {
			clearApiAccessTokenCookie(context);
		}
		for (const cookie of context.cookies.headers()) {
			responseHeaders.append('set-cookie', cookie);
		}
		if (envelope && typeof envelope === 'object') {
			return new Response(JSON.stringify(redactAuthTokens(envelope)), {
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders,
			});
		}
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
};
