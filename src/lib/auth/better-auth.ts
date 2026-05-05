import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { memoryAdapter } from 'better-auth/adapters/memory';
import type { APIContext } from 'astro';
import type { D1DatabaseLike } from '@treeseed/core/types/cloudflare';
import { createTreeseedD1Drizzle } from '@treeseed/sdk/db/d1';
import { treeseedSchema } from '@treeseed/sdk/db/schema';
import { getSiteAuthConfig } from './config';
import { sendAuthEmail } from './email';

const BETTER_AUTH_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS better_auth_user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  firstName TEXT,
  lastName TEXT,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_better_auth_user_username
  ON better_auth_user(username);

CREATE TABLE IF NOT EXISTS better_auth_session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES better_auth_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_better_auth_session_token
  ON better_auth_session(token);

CREATE INDEX IF NOT EXISTS idx_better_auth_session_userId
  ON better_auth_session(userId);

CREATE TABLE IF NOT EXISTS better_auth_account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES better_auth_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_better_auth_account_userId
  ON better_auth_account(userId);

CREATE UNIQUE INDEX IF NOT EXISTS idx_better_auth_account_provider_account
  ON better_auth_account(providerId, accountId);

CREATE TABLE IF NOT EXISTS better_auth_verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_better_auth_verification_identifier
  ON better_auth_verification(identifier);
`;

const memoryDb = globalThis.__treeseedBetterAuthMemoryDb ??= {
	better_auth_user: [],
	better_auth_session: [],
	better_auth_account: [],
	better_auth_verification: [],
};

function configuredProvider(input: { clientId: string; clientSecret: string }) {
	return input.clientId && input.clientSecret
		? {
			clientId: input.clientId,
			clientSecret: input.clientSecret,
		}
		: undefined;
}

declare global {
	var __treeseedBetterAuthMemoryDb: Record<string, any[]> | undefined;
	var __treeseedBetterAuthSchemaReady: WeakMap<D1DatabaseLike, Promise<void>> | undefined;
}

function runtimeDb(context?: Pick<APIContext, 'locals'>) {
	return context?.locals.runtime?.env?.SITE_DATA_DB ?? null;
}

function splitSqlStatements(sql: string) {
	return sql
		.split(';')
		.map((statement) => statement.trim())
		.filter(Boolean);
}

async function runD1Schema(db: D1DatabaseLike, sql: string) {
	for (const statement of splitSqlStatements(sql)) {
		await db.prepare(statement).run();
	}
}

async function ensureBetterAuthUserColumns(db: D1DatabaseLike) {
	const result = await db.prepare('PRAGMA table_info(better_auth_user)').all<{ name: string }>();
	const columns = new Set((result.results ?? []).map((row) => row.name));
	if (!columns.has('username')) {
		await db.prepare('ALTER TABLE better_auth_user ADD COLUMN username TEXT').run();
	}
	if (!columns.has('firstName')) {
		await db.prepare('ALTER TABLE better_auth_user ADD COLUMN firstName TEXT').run();
	}
	if (!columns.has('lastName')) {
		await db.prepare('ALTER TABLE better_auth_user ADD COLUMN lastName TEXT').run();
	}
	await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_better_auth_user_username ON better_auth_user(username)').run();
}

export function betterAuthCookieFromSetCookie(setCookie: string) {
	return setCookie.split(';', 1)[0] ?? '';
}

export function getBetterAuthSetCookies(response: Response) {
	return response.headers.getSetCookie?.() ?? (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')!] : []);
}

export async function ensureBetterAuthD1Schema(context?: Pick<APIContext, 'locals'>) {
	const db = runtimeDb(context);
	if (!db?.prepare) return;
	const schemaReady = globalThis.__treeseedBetterAuthSchemaReady ??= new WeakMap();
	let ready = schemaReady.get(db);
	if (!ready) {
		const readyPromise = runD1Schema(db, BETTER_AUTH_TABLES_SQL).then(() => ensureBetterAuthUserColumns(db));
		schemaReady.set(db, readyPromise);
		ready = readyPromise;
	}
	await ready;
}

export function createSiteBetterAuth(context?: Pick<APIContext, 'locals'>) {
	const config = getSiteAuthConfig(context);
	const db = runtimeDb(context);
	const useD1 = Boolean(db?.prepare);
	if (!useD1 && !config.allowMemoryAuthDb) {
		throw new Error('BetterAuth requires SITE_DATA_DB. Set TREESEED_AUTH_ALLOW_MEMORY_DB=true only for local or test fallback.');
	}
	const database = useD1
		? drizzleAdapter(createTreeseedD1Drizzle(db as D1DatabaseLike), {
			provider: 'sqlite',
			schema: treeseedSchema,
			camelCase: true,
			transaction: false,
		})
		: memoryAdapter(memoryDb);
	const socialProviders = config.providersEnabled
		? {
			...(configuredProvider(config.providers.github) ? { github: configuredProvider(config.providers.github)! } : {}),
			...(configuredProvider(config.providers.google) ? { google: configuredProvider(config.providers.google)! } : {}),
			...(configuredProvider(config.providers.microsoft) ? { microsoft: configuredProvider(config.providers.microsoft)! } : {}),
			...(configuredProvider(config.providers.apple) ? { apple: configuredProvider(config.providers.apple)! } : {}),
		}
		: {};
	return betterAuth({
		baseURL: config.betterAuthBaseUrl,
		basePath: '/api/auth',
		secret: config.betterAuthSecret,
		database,
		user: {
			modelName: 'better_auth_user',
			additionalFields: {
				username: {
					type: 'string',
					required: false,
					returned: true,
					unique: true,
				},
				firstName: {
					type: 'string',
					required: false,
					returned: true,
				},
				lastName: {
					type: 'string',
					required: false,
					returned: true,
				},
			},
			changeEmail: {
				enabled: true,
			},
			deleteUser: {
				enabled: true,
			},
		},
		session: {
			modelName: 'better_auth_session',
		},
		account: {
			modelName: 'better_auth_account',
			accountLinking: {
				enabled: config.emailLinkingEnabled,
				trustedProviders: ['github', 'google', 'microsoft', 'apple'],
			},
		},
		verification: {
			modelName: 'better_auth_verification',
		},
		emailAndPassword: {
			enabled: config.internalAuthEnabled,
			disableSignUp: !config.internalSignupEnabled,
			minPasswordLength: 12,
			requireEmailVerification: true,
			resetPasswordTokenExpiresIn: config.passwordResetTtlSeconds,
			revokeSessionsOnPasswordReset: true,
			sendResetPassword: async ({ user, url }) => {
				await sendAuthEmail(context, {
					to: user.email,
					subject: 'Reset your Treeseed Market password',
					text: [
						'We received a request to reset your Treeseed Market password.',
						'',
						`Open this link to choose a new password: ${url}`,
						'',
						'If you did not request this, you can ignore this email.',
					].join('\n'),
				});
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			expiresIn: config.emailVerificationTtlSeconds,
			sendVerificationEmail: async ({ user, url }) => {
				await sendAuthEmail(context, {
					to: user.email,
					subject: 'Verify your Treeseed Market email',
					text: [
						'Welcome to Treeseed Market.',
						'',
						`Open this link to verify your email address: ${url}`,
						'',
						'This link expires automatically. If you did not create this account, you can ignore this email.',
					].join('\n'),
				});
			},
		},
		rateLimit: {
			enabled: false,
		},
		socialProviders,
	});
}
