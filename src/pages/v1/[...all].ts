import type { APIRoute } from 'astro';
import { getSiteAuthConfig } from '../../lib/auth/config';
import { exchangeSiteSession } from '../../lib/auth/api';
import { loadSiteWebSession } from '../../lib/auth/session-store';

export const prerender = false;

function copyHeaderIfPresent(target: Headers, source: Headers, name: string) {
	const value = source.get(name);
	if (value) {
		target.set(name, value);
	}
}

function responseHeaders(source: Headers) {
	const headers = new Headers();
	for (const [key, value] of source.entries()) {
		if (/^(connection|content-length|keep-alive|proxy-authenticate|proxy-authorization|te|trailer|transfer-encoding|upgrade)$/i.test(key)) {
			continue;
		}
		headers.set(key, value);
	}
	return headers;
}

export const ALL: APIRoute = async (context) => {
	const config = getSiteAuthConfig(context);
	const targetPath = `/v1/${context.params.all ?? ''}`.replace(/\/{2,}/g, '/');
	const targetUrl = new URL(targetPath, config.apiBaseUrl);
	targetUrl.search = context.url.search;

	const headers = new Headers();
	copyHeaderIfPresent(headers, context.request.headers, 'accept');
	copyHeaderIfPresent(headers, context.request.headers, 'content-type');
	copyHeaderIfPresent(headers, context.request.headers, 'authorization');
	copyHeaderIfPresent(headers, context.request.headers, 'x-treeseed-remote-contract-version');

	if (!headers.has('authorization')) {
		const session = await loadSiteWebSession(context);
		if (session) {
			const exchange = await exchangeSiteSession(context, session);
			headers.set('authorization', `Bearer ${exchange.accessToken}`);
		}
	}

	const body = context.request.method === 'GET' || context.request.method === 'HEAD'
		? undefined
		: await context.request.arrayBuffer();
	const response = await fetch(targetUrl, {
		method: context.request.method,
		headers,
		body,
	});

	return new Response(response.body, {
		status: response.status,
		headers: responseHeaders(response.headers),
	});
};
