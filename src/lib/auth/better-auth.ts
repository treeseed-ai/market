import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import type { APIContext } from 'astro';
import { getSiteAuthConfig } from './config';

const memoryDb = globalThis.__treeseedBetterAuthMemoryDb ??= {};

function configuredProvider(input: { clientId: string; clientSecret: string }) {
	return input.clientId && input.clientSecret
		? {
			clientId: input.clientId,
			clientSecret: input.clientSecret,
		}
		: undefined;
}

declare global {
	var __treeseedBetterAuthMemoryDb: Record<string, any[]>;
}

export function createSiteBetterAuth(context?: Pick<APIContext, 'locals'>) {
	const config = getSiteAuthConfig(context);
	return betterAuth({
		baseURL: config.betterAuthBaseUrl,
		basePath: '/api/auth',
		secret: config.betterAuthSecret,
		database: memoryAdapter(memoryDb),
		emailAndPassword: {
			enabled: false,
		},
		rateLimit: {
			enabled: false,
		},
		socialProviders: {
			...(configuredProvider(config.providers.github) ? { github: configuredProvider(config.providers.github)! } : {}),
			...(configuredProvider(config.providers.google) ? { google: configuredProvider(config.providers.google)! } : {}),
			...(configuredProvider(config.providers.microsoft) ? { microsoft: configuredProvider(config.providers.microsoft)! } : {}),
			...(configuredProvider(config.providers.apple) ? { apple: configuredProvider(config.providers.apple)! } : {}),
		},
	});
}
