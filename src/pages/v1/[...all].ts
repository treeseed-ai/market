import type { APIRoute } from 'astro';
import {
	apiAccessTokenFromCookies,
	marketApiServiceHeaders,
	resolveMarketApiBaseUrl,
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

export const ALL: APIRoute = async (context) => {
	const path = context.params.all ?? '';
	if (isRedirectedDeviceApproval(path) && context.request.method.toUpperCase() === 'GET') {
		const target = new URL('/auth/device/approve', context.url.origin);
		target.search = context.url.search;
		return context.redirect(target.toString(), 302);
	}

	const upstream = new URL(`/v1/${path}`, resolveMarketApiBaseUrl(context.locals));
	upstream.search = context.url.search;

	const headers = copyClientHeaders(context.request);
	for (const [name, value] of marketApiServiceHeaders(context)) {
		headers.set(name, value);
	}
	const token = apiAccessTokenFromCookies(context);
	if (token) headers.set('authorization', `Bearer ${token}`);

	const method = context.request.method.toUpperCase();
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
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
};
