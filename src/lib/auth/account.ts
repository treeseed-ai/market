import type { APIContext } from 'astro';
import {
	betterAuthCookieFromSetCookie,
	createSiteBetterAuth,
	ensureBetterAuthD1Schema,
	getBetterAuthSetCookies,
} from './better-auth';
import { deleteSiteWebSession } from './session-store';
import { finalizeBetterAuthSession } from './flow';
import { resolveMarketStore } from '../market/store';

export const DELETE_ACCOUNT_CONFIRMATION = 'DELETE MY ACCOUNT';
export const RESERVED_USERNAMES = new Set([
	'app',
	'api',
	'auth',
	'market',
	'templates',
	'admin',
	'settings',
	'u',
	'users',
	'new',
	'me',
	'account',
	'login',
	'logout',
	'signup',
]);

export interface AccountProfileInput {
	name: string;
	image: string | null;
}

export interface AccountDeletionBlocker {
	code: 'platform_admin' | 'team_owner';
	message: string;
	teamId?: string;
	teamSlug?: string;
	teamName?: string;
}

export type UsernameValidationResult =
	| { ok: true; username: string }
	| { ok: false; code: 'missing' | 'format' | 'reserved'; message: string };

export type UsernameAvailabilityStatus = 'empty' | 'invalid' | 'reserved' | 'taken' | 'available' | 'error';

export interface UsernameAvailabilityResult {
	ok: true;
	username: string;
	available: boolean;
	status: UsernameAvailabilityStatus;
	message: string;
}

export interface PublicUserProfile {
	user: {
		id: string;
		username: string;
		displayName: string | null;
		email: string | null;
		image: string | null;
		joinedAt: string;
	};
	activity: {
		teams: Array<{ id: string; slug: string; name: string; createdAt?: string }>;
		projects: Array<{ id: string; teamId: string; slug: string; name: string; description?: string | null; createdAt?: string }>;
		catalogItems: Array<{ id: string; teamId: string; kind: string; slug: string; title: string; summary?: string | null; visibility?: string }>;
		knowledgePacks: Array<{ id: string; teamId: string; slug: string; name: string; summary?: string | null; visibility?: string }>;
	};
}

type AuthContext = Pick<APIContext, 'locals' | 'url' | 'cookies' | 'request'>;

function runtimeDb(context: Pick<APIContext, 'locals'>) {
	return context.locals.runtime?.env?.SITE_DATA_DB ?? null;
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
	const normalized = typeof value === 'string' ? value.trim() : '';
	return normalized || null;
}

async function ensureCoreUsernameSchema(context: Pick<APIContext, 'locals'>) {
	const db = runtimeDb(context);
	if (!db) return false;
	const userTable = await db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`).first<{ name: string }>();
	if (!userTable?.name) return false;
	const result = await db.prepare('PRAGMA table_info(users)').all<{ name: string }>();
	const columns = new Set((result.results ?? []).map((row) => row.name));
	if (!columns.has('username')) {
		await db.prepare('ALTER TABLE users ADD COLUMN username TEXT').run();
	}
	await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)').run();
	return true;
}

export function normalizeUsername(value: string | null | undefined) {
	return String(value ?? '').trim().toLowerCase();
}

export function composeDisplayNameFromParts(firstName: string | null | undefined, lastName: string | null | undefined) {
	return [firstName, lastName]
		.map((part) => String(part ?? '').trim())
		.filter(Boolean)
		.join(' ');
}

export function validateUsername(value: string | null | undefined): UsernameValidationResult {
	const username = normalizeUsername(value);
	if (!username) {
		return { ok: false, code: 'missing', message: 'Username is required.' };
	}
	if (RESERVED_USERNAMES.has(username)) {
		return { ok: false, code: 'reserved', message: 'That username is reserved.' };
	}
	if (
		username.length > 39
		|| !/^[a-z0-9-]+$/u.test(username)
		|| username.startsWith('-')
		|| username.endsWith('-')
		|| username.includes('--')
	) {
		return {
			ok: false,
			code: 'format',
			message: 'Usernames can use 1-39 letters, numbers, or single hyphens, with no leading or trailing hyphen.',
		};
	}
	return { ok: true, username };
}

async function rowExists(context: Pick<APIContext, 'locals'>, query: string, params: unknown[]) {
	const db = runtimeDb(context);
	if (!db) return false;
	const row = await db.prepare(query).bind(...params).first<{ id: string }>();
	return Boolean(row?.id);
}

export async function isUsernameAvailable(
	context: Pick<APIContext, 'locals'>,
	value: string,
	options: { excludeBetterAuthUserId?: string | null; excludeCoreUserId?: string | null } = {},
) {
	const validation = validateUsername(value);
	if (!validation.ok) return false;
	await ensureBetterAuthD1Schema(context);
	const hasCoreUsers = await ensureCoreUsernameSchema(context);
	const db = runtimeDb(context);
	if (!db) return true;
	const betterAuthTaken = await rowExists(
		context,
		`SELECT id FROM better_auth_user WHERE LOWER(username) = LOWER(?) AND (? IS NULL OR id != ?) LIMIT 1`,
		[validation.username, options.excludeBetterAuthUserId ?? null, options.excludeBetterAuthUserId ?? null],
	);
	if (betterAuthTaken) return false;
	if (!hasCoreUsers) return true;
	return !(await rowExists(
		context,
		`SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND (? IS NULL OR id != ?) LIMIT 1`,
		[validation.username, options.excludeCoreUserId ?? null, options.excludeCoreUserId ?? null],
	));
}

export async function usernameAvailabilityResult(context: Pick<APIContext, 'locals'>, value: string): Promise<UsernameAvailabilityResult> {
	const username = normalizeUsername(value);
	if (!username) {
		return {
			ok: true,
			username,
			available: false,
			status: 'empty',
			message: 'Choose a username.',
		};
	}
	const validation = validateUsername(username);
	if (!validation.ok) {
		return {
			ok: true,
			username,
			available: false,
			status: validation.code === 'reserved' ? 'reserved' : 'invalid',
			message: validation.message,
		};
	}
	try {
		const available = await isUsernameAvailable(context, validation.username);
		return {
			ok: true,
			username: validation.username,
			available,
			status: available ? 'available' : 'taken',
			message: available ? 'Username is available.' : 'Username is taken.',
		};
	} catch {
		return {
			ok: true,
			username: validation.username,
			available: false,
			status: 'error',
			message: 'Username availability could not be checked.',
		};
	}
}

export async function assignImmutableUsername(
	context: Pick<APIContext, 'locals'>,
	input: { username: string; betterAuthUserId?: string | null; coreUserId?: string | null },
) {
	const validation = validateUsername(input.username);
	if (!validation.ok) return validation;
	await ensureBetterAuthD1Schema(context);
	await ensureCoreUsernameSchema(context);
	const db = runtimeDb(context);
	if (!db) return { ok: true as const, username: validation.username };
	if (input.betterAuthUserId) {
		const row = await db.prepare(`SELECT username FROM better_auth_user WHERE id = ? LIMIT 1`).bind(input.betterAuthUserId).first<{ username: string | null }>();
		const existing = normalizeUsername(row?.username ?? '');
		if (existing && existing !== validation.username) {
			return { ok: false as const, code: 'immutable' as const, message: 'Username cannot be changed after registration.' };
		}
	}
	if (input.coreUserId) {
		const row = await db.prepare(`SELECT username FROM users WHERE id = ? LIMIT 1`).bind(input.coreUserId).first<{ username: string | null }>();
		const existing = normalizeUsername(row?.username ?? '');
		if (existing && existing !== validation.username) {
			return { ok: false as const, code: 'immutable' as const, message: 'Username cannot be changed after registration.' };
		}
	}
	const available = await isUsernameAvailable(context, validation.username, {
		excludeBetterAuthUserId: input.betterAuthUserId,
		excludeCoreUserId: input.coreUserId,
	});
	if (!available) {
		return { ok: false as const, code: 'taken' as const, message: 'That username is already taken.' };
	}
	const now = new Date().toISOString();
	if (input.betterAuthUserId) {
		await db.prepare(`UPDATE better_auth_user SET username = COALESCE(username, ?), updatedAt = ? WHERE id = ?`)
			.bind(validation.username, Date.now(), input.betterAuthUserId)
			.run();
	}
	if (input.coreUserId) {
		await db.prepare(`UPDATE users SET username = COALESCE(username, ?), updated_at = ? WHERE id = ?`)
			.bind(validation.username, now, input.coreUserId)
			.run();
	}
	return { ok: true as const, username: validation.username };
}

export async function resolveLoginIdentifier(context: Pick<APIContext, 'locals'>, value: string) {
	const identifier = String(value ?? '').trim();
	if (!identifier) return null;
	if (identifier.includes('@')) return identifier;
	await ensureBetterAuthD1Schema(context);
	const hasCoreUsers = await ensureCoreUsernameSchema(context);
	const username = normalizeUsername(identifier);
	const validation = validateUsername(username);
	if (!validation.ok) return null;
	const db = runtimeDb(context);
	if (!db) return null;
	const row = await db.prepare(`
		SELECT email FROM better_auth_user WHERE LOWER(username) = LOWER(?) LIMIT 1
	`).bind(validation.username).first<{ email: string | null }>();
	if (row?.email) return row.email;
	if (!hasCoreUsers) return null;
	const coreRow = await db.prepare(`
		SELECT email FROM users WHERE LOWER(username) = LOWER(?) AND status = 'active' LIMIT 1
	`).bind(validation.username).first<{ email: string | null }>();
	return coreRow?.email ?? null;
}

function slugCandidate(value: unknown) {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]+/gu, '-')
		.replace(/-+/gu, '-')
		.replace(/^-+|-+$/gu, '')
		.slice(0, 39);
}

export async function deriveAvailableUsernameForAccount(
	context: Pick<APIContext, 'locals'>,
	input: { user: Record<string, any>; accounts?: Array<Record<string, any>> },
) {
	const candidates = [
		input.user.username,
		...(input.accounts ?? []).map((account) => account.username ?? account.login ?? account.accountId),
		input.user.name,
		typeof input.user.email === 'string' ? input.user.email.split('@')[0] : '',
	].map(slugCandidate).filter(Boolean);
	for (const candidate of [...new Set(candidates)]) {
		const validation = validateUsername(candidate);
		if (validation.ok && await isUsernameAvailable(context, validation.username, { excludeBetterAuthUserId: input.user.id })) {
			return validation.username;
		}
	}
	return null;
}

export function normalizeAccountProfileInput(form: FormData): AccountProfileInput {
	return {
		name: normalizeOptionalString(form.get('name')) ?? '',
		image: normalizeOptionalString(form.get('image')),
	};
}

export function isValidProfileImageUrl(value: string | null | undefined) {
	if (!value) return true;
	try {
		const url = new URL(value);
		return url.protocol === 'https:';
	} catch {
		return false;
	}
}

export function accountDeletionConfirmationMatches(value: string | null | undefined) {
	return value === DELETE_ACCOUNT_CONFIRMATION;
}

export function accountStatusRedirect(statusKey: 'profile' | 'email' | 'delete', status: string) {
	return `/app/account?${statusKey}=${encodeURIComponent(status)}`;
}

export async function loadCurrentBetterAuthAccount(context: AuthContext) {
	await ensureBetterAuthD1Schema(context);
	const auth = createSiteBetterAuth(context);
	const sessionData = await auth.api.getSession({ headers: context.request.headers });
	if (!sessionData?.user || !sessionData?.session) {
		return null;
	}
	const accounts = await auth.api.listUserAccounts({ headers: context.request.headers }).catch(() => []);
	return {
		auth,
		user: sessionData.user,
		session: sessionData.session,
		accounts,
	};
}

function headersFromSetCookies(setCookies: string[]) {
	const cookieHeader = setCookies.map(betterAuthCookieFromSetCookie).filter(Boolean).join('; ');
	return new Headers(cookieHeader ? { cookie: cookieHeader } : undefined);
}

export async function syncBetterAuthUserToMarketSession(
	context: AuthContext,
	input: {
		setCookies?: string[];
		provider?: string;
	} = {},
) {
	await ensureBetterAuthD1Schema(context);
	const auth = createSiteBetterAuth(context);
	const sessionHeaders = input.setCookies?.length
		? headersFromSetCookies(input.setCookies)
		: context.request.headers;
	const sessionData = await auth.api.getSession({ headers: sessionHeaders });
	if (!sessionData?.user || !sessionData?.session) return null;
	const accounts = await auth.api.listUserAccounts({ headers: sessionHeaders }).catch(() => []);
	const preferredProvider = input.provider ?? context.locals.auth?.session?.provider ?? 'credential';
	const account = accounts.find((entry: any) => entry.providerId === preferredProvider)
		?? accounts.find((entry: any) => entry.providerId === 'credential')
		?? accounts[0];
	return finalizeBetterAuthSession(context, {
		provider: account?.providerId ?? preferredProvider,
		user: sessionData.user,
		session: sessionData.session,
		providerSubject: account?.accountId ?? sessionData.user.id,
	});
}

export function appendAuthAndMarketCookies(response: Response, context: Pick<APIContext, 'cookies'>, betterAuthResponse?: Response) {
	if (betterAuthResponse) {
		for (const cookie of getBetterAuthSetCookies(betterAuthResponse)) {
			response.headers.append('set-cookie', cookie);
		}
	}
	for (const cookie of context.cookies.headers()) {
		response.headers.append('set-cookie', cookie);
	}
	return response;
}

export async function evaluateAccountDeletionBlockers(context: Pick<APIContext, 'locals'>) {
	const principal = context.locals.auth?.principal;
	const blockers: AccountDeletionBlocker[] = [];
	if (!principal?.id) {
		return [{
			code: 'platform_admin',
			message: 'Authentication is required before deleting an account.',
		}] satisfies AccountDeletionBlocker[];
	}
	const roles = principal.roles ?? [];
	const permissions = principal.permissions ?? [];
	if (roles.includes('platform_admin') || permissions.includes('*:*:*')) {
		blockers.push({
			code: 'platform_admin',
			message: 'Platform administrators must remove the platform_admin role before deleting their account.',
		});
	}
	const db = runtimeDb(context);
	if (!db) return blockers;
	const ownerRows = await db.prepare(`
		SELECT teams.id AS team_id, teams.name AS team_name, COALESCE(teams.slug, teams.name) AS team_handle
		FROM team_memberships
		INNER JOIN teams ON teams.id = team_memberships.team_id
		INNER JOIN team_role_bindings ON team_role_bindings.team_membership_id = team_memberships.id
		INNER JOIN roles ON roles.id = team_role_bindings.role_id
		WHERE team_memberships.user_id = ?
		  AND team_memberships.status = 'active'
		  AND roles.key = 'team_owner'
		ORDER BY teams.name ASC
	`).bind(principal.id).all<{
		team_id: string;
		team_name: string;
		team_handle: string;
	}>();
	for (const row of ownerRows.results ?? []) {
		blockers.push({
			code: 'team_owner',
			message: `Transfer or remove ownership for ${row.team_name} before deleting your account.`,
			teamId: row.team_id,
			teamSlug: row.team_handle,
			teamName: row.team_name,
		});
	}
	return blockers;
}

function parseProfileJson(value: string | null | undefined) {
	if (!value) return {};
	try {
		return JSON.parse(value) as Record<string, unknown>;
	} catch {
		return {};
	}
}

export async function loadUserProfileByUsername(
	context: Pick<APIContext, 'locals'>,
	value: string,
	viewerPrincipal?: Record<string, any> | null,
): Promise<PublicUserProfile | null> {
	const effectiveViewerPrincipal = viewerPrincipal ?? context.locals.auth?.principal ?? null;
	const validation = validateUsername(value);
	if (!validation.ok) return null;
	const db = runtimeDb(context);
	if (!db) return null;
	const row = await db.prepare(`
		SELECT users.id, users.email, users.username, users.display_name, users.status, users.created_at,
		       user_identities.profile_json
		FROM users
		LEFT JOIN user_identities ON user_identities.user_id = users.id
		WHERE LOWER(users.username) = LOWER(?)
		  AND users.status = 'active'
		ORDER BY user_identities.updated_at DESC
		LIMIT 1
	`).bind(validation.username).first<{
		id: string;
		email: string | null;
		username: string | null;
		display_name: string | null;
		status: string;
		created_at: string;
		profile_json: string | null;
	}>();
	const username = normalizeUsername(row?.username ?? '');
	if (!row || !username) return null;
	const store = resolveMarketStore(context.locals);
	const profile = parseProfileJson(row.profile_json);
	const image = typeof profile.image === 'string' ? profile.image : null;
	if (!store) {
		return {
			user: {
				id: row.id,
				username,
				displayName: row.display_name,
				email: row.email,
				image,
				joinedAt: row.created_at,
			},
			activity: {
				teams: [],
				projects: [],
				catalogItems: [],
				knowledgePacks: [],
			},
		};
	}
	const membershipRows = await db.prepare(`
		SELECT teams.id, teams.name, teams.created_at
		FROM team_memberships
		INNER JOIN teams ON teams.id = team_memberships.team_id
		WHERE team_memberships.user_id = ?
		  AND team_memberships.status = 'active'
		ORDER BY teams.created_at ASC
	`).bind(row.id).all<{ id: string; name: string; created_at: string }>();
	const profileTeams = (membershipRows.results ?? []).map((team) => ({
		id: team.id,
		slug: team.name,
		name: team.name,
		createdAt: team.created_at,
	}));
	const profileTeamIds = new Set(profileTeams.map((team) => team.id));
	const viewerTeamIds = new Set(await store.teamIdsForPrincipal(effectiveViewerPrincipal));
	const catalogItems = (await store.listCatalogItems(effectiveViewerPrincipal)).filter((item: any) => profileTeamIds.has(item.teamId));
	const knowledgePacks = (await store.listKnowledgePacks(effectiveViewerPrincipal)).filter((pack: any) => profileTeamIds.has(pack.teamId));
	const visibleTeamIds = new Set([
		...catalogItems.map((item: any) => item.teamId),
		...knowledgePacks.map((pack: any) => pack.teamId),
		...profileTeams.filter((team) => viewerTeamIds.has(team.id)).map((team) => team.id),
	]);
	const projects = [];
	for (const team of profileTeams) {
		if (!viewerTeamIds.has(team.id)) continue;
		for (const project of await store.listTeamProjects(team.id)) {
			projects.push(project);
		}
	}
	return {
		user: {
			id: row.id,
			username,
			displayName: row.display_name,
			email: row.email,
			image,
			joinedAt: row.created_at,
		},
		activity: {
			teams: profileTeams.filter((team) => visibleTeamIds.has(team.id)),
			projects,
			catalogItems,
			knowledgePacks,
		},
	};
}

export async function deleteMarketAccountRows(context: Pick<APIContext, 'locals' | 'cookies' | 'url'>, userId: string) {
	const db = runtimeDb(context);
	if (db) {
		const membershipRows = await db.prepare(`SELECT id FROM team_memberships WHERE user_id = ?`).bind(userId).all<{ id: string }>();
		const membershipIds = (membershipRows.results ?? []).map((row) => row.id);
		if (membershipIds.length > 0) {
			const placeholders = membershipIds.map(() => '?').join(', ');
			await db.prepare(`DELETE FROM team_role_bindings WHERE team_membership_id IN (${placeholders})`).bind(...membershipIds).run();
		}
		for (const statement of [
			'DELETE FROM web_sessions WHERE user_id = ?',
			'DELETE FROM auth_sessions WHERE user_id = ?',
			'DELETE FROM api_tokens WHERE user_id = ?',
			'DELETE FROM device_codes WHERE user_id = ?',
			'DELETE FROM user_role_bindings WHERE user_id = ?',
			'DELETE FROM team_memberships WHERE user_id = ?',
			'DELETE FROM user_identities WHERE user_id = ?',
			'DELETE FROM users WHERE id = ?',
		]) {
			await db.prepare(statement).bind(userId).run();
		}
	}
	await deleteSiteWebSession(context);
}
