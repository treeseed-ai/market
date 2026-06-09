import type { APIContext } from 'astro';
import { TREESEED_REMOTE_CONTRACT_HEADER, TREESEED_REMOTE_CONTRACT_VERSION } from '@treeseed/sdk/remote';
import { getSiteAuthConfig } from '../auth/config';

type AstroLike = Pick<APIContext, 'locals' | 'cookies' | 'url' | 'request'>;

const API_SESSION_COOKIE = 'ts_market_api_access';

function getNodeCrypto():
	| {
		createHmac?: (algorithm: string, secret: string) => { update: (value: string) => { digest: (encoding: 'base64url') => string } };
		randomUUID?: () => string;
		timingSafeEqual?: (left: Uint8Array, right: Uint8Array) => boolean;
	}
	| null {
	return (globalThis as { process?: { getBuiltinModule?: (name: string) => unknown } }).process
		?.getBuiltinModule?.('crypto') as ReturnType<typeof getNodeCrypto> ?? null;
}

function randomId() {
	const nodeCrypto = getNodeCrypto();
	if (nodeCrypto?.randomUUID) return nodeCrypto.randomUUID();
	if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
	const bytes = new Uint8Array(16);
	globalThis.crypto?.getRandomValues?.(bytes);
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function runtimeEnv(locals: App.Locals | Record<string, unknown> | null | undefined) {
	return (locals as App.Locals | undefined)?.runtime?.env as Record<string, unknown> | undefined;
}

function envValue(locals: App.Locals | Record<string, unknown> | null | undefined, name: string) {
	const runtimeValue = runtimeEnv(locals)?.[name];
	if (typeof runtimeValue === 'string' && runtimeValue.trim()) return runtimeValue.trim();
	const processValue = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
	return typeof processValue === 'string' && processValue.trim() ? processValue.trim() : '';
}

export function resolveApiBaseUrl(locals?: App.Locals | Record<string, unknown> | null) {
	return (
		envValue(locals, 'TREESEED_MARKET_API_BASE_URL')
		|| envValue(locals, 'TREESEED_CENTRAL_MARKET_API_BASE_URL')
		|| 'https://api.treeseed.ai'
	).replace(/\/+$/u, '');
}

function encodeAssertionPayload(payload: Record<string, unknown>) {
	return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function signAssertionPayload(payload: string, secret: string) {
	const nodeCrypto = getNodeCrypto();
	if (!nodeCrypto?.createHmac) {
		throw new Error('Trusted web user assertions require an HMAC-capable runtime.');
	}
	return nodeCrypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createTrustedWebUserAssertion(context: Pick<APIContext, 'locals' | 'url'>) {
	const principal = context.locals.auth?.principal;
	if (!principal?.id) return null;
	const config = getSiteAuthConfig(context);
	const session = context.locals.auth?.session;
	const payload = encodeAssertionPayload({
		userId: principal.id,
		sessionId: session?.id ?? principal.metadata?.sessionId ?? null,
		identityId: session?.identityId ?? principal.metadata?.identityId ?? null,
		authTime: session?.authenticatedAt ?? principal.metadata?.authTime ?? new Date().toISOString(),
		expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
		nonce: randomId(),
	});
	return `${payload}.${signAssertionPayload(payload, config.apiAssertionSecret)}`;
}

export function apiServiceHeaders(
	context: Pick<APIContext, 'locals' | 'url'>,
	options: { forceService?: boolean; skipUserAssertion?: boolean } = {},
) {
	const config = getSiteAuthConfig(context);
	const headers = new Headers({
		accept: 'application/json',
		[TREESEED_REMOTE_CONTRACT_HEADER]: String(TREESEED_REMOTE_CONTRACT_VERSION),
	});
	const assertion = options.skipUserAssertion ? null : createTrustedWebUserAssertion(context);
	if (assertion || options.forceService) {
		headers.set('x-treeseed-service-id', config.apiServiceId);
		headers.set('x-treeseed-service-secret', config.apiServiceSecret);
	}
	if (assertion) headers.set('x-treeseed-user-assertion', assertion);
	return headers;
}

export function apiAccessTokenFromCookies(context: Pick<APIContext, 'cookies'>) {
	return context.cookies.get(API_SESSION_COOKIE)?.value ?? null;
}

export function setApiAccessTokenCookie(context: Pick<APIContext, 'cookies' | 'url'>, token: string, maxAgeSeconds: number) {
	context.cookies.set(API_SESSION_COOKIE, token, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: context.url.protocol === 'https:',
		maxAge: maxAgeSeconds,
	});
}

export function clearApiAccessTokenCookie(context: Pick<APIContext, 'cookies' | 'url'>) {
	context.cookies.delete(API_SESSION_COOKIE, {
		path: '/',
		secure: context.url.protocol === 'https:',
	});
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function unwrapEnvelope<T = unknown>(envelope: any): T {
	if (Object.prototype.hasOwnProperty.call(envelope, 'payload')) return envelope.payload as T;
	if (Object.prototype.hasOwnProperty.call(envelope, 'provider')) return envelope.provider as T;
	if (Object.prototype.hasOwnProperty.call(envelope, 'operations')) return envelope.operations as T;
	return envelope as T;
}

export class ApiClientFacade {
	constructor(private readonly context: AstroLike) {}

	private headers(body = false) {
		const token = apiAccessTokenFromCookies(this.context);
		const headers = apiServiceHeaders(this.context, { skipUserAssertion: Boolean(token) });
		if (token) headers.set('authorization', `Bearer ${token}`);
		if (body) headers.set('content-type', 'application/json');
		return headers;
	}

	private url(path: string) {
		return `${resolveApiBaseUrl(this.context.locals)}${path}`;
	}

	async request<T = unknown>(method: string, path: string, options: { body?: unknown } = {}): Promise<T> {
		const response = await fetch(this.url(path), {
			method,
			headers: this.headers(options.body !== undefined),
			body: options.body === undefined ? undefined : JSON.stringify(options.body),
		});
		const envelope = await response.json().catch(() => null);
		if (!response.ok || envelope?.ok === false) {
			const error = new Error(envelope?.error ?? `API request failed: ${response.status}`);
			(error as any).status = response.status;
			(error as any).details = isObject(envelope) ? envelope : {};
			throw error;
		}
		return unwrapEnvelope<T>(envelope);
	}

	get currentPrincipal() {
		return this.context.locals.auth?.principal ?? null;
	}

	listTeamsForPrincipal() {
		return this.request<any[]>('GET', '/v1/teams');
	}

	listTeamProjects(teamId: string) {
		return this.request<any[]>('GET', `/v1/projects?teamId=${encodeURIComponent(teamId)}`);
	}

	getProjectDetails(projectId: string) {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}`);
	}

	getProjectDeployment(deploymentId: string, options: { limit?: number | string | null } = {}) {
		const query = new URLSearchParams();
		if (options.limit != null) query.set('limit', String(options.limit));
		return this.request<any>('GET', `/v1/project-deployments/${encodeURIComponent(deploymentId)}${query.toString() ? `?${query}` : ''}`);
	}

	listProjectDeployments(projectId: string, filters: { environment?: string; action?: string; status?: string; limit?: number | string } = {}) {
		const query = new URLSearchParams();
		if (filters.environment) query.set('environment', filters.environment);
		if (filters.action) query.set('action', filters.action);
		if (filters.status) query.set('status', filters.status);
		if (filters.limit != null) query.set('limit', String(filters.limit));
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/deployments${query.toString() ? `?${query}` : ''}`);
	}

	async listProjectDeploymentEvents(deploymentId: string, options: { limit?: number | string | null } = {}) {
		const details = await this.getProjectDeployment(deploymentId, options);
		return Array.isArray(details?.events) ? details.events : [];
	}

	getProjectByTeamAndSlug(teamId: string, slug: string) {
		return this.listTeamProjects(teamId).then((projects) => projects.find((project: any) => project.slug === slug || project.id === slug) ?? null);
	}

	getProjectSummary(projectId: string) {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}/summary`);
	}

	getProjectAgentsSummary(projectId: string) {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}/agents`);
	}

	getProjectReleasesSummary(projectId: string) {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}/releases`);
	}

	getProjectCapacitySummary(projectId: string, environment = 'staging') {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}/capacity?environment=${encodeURIComponent(environment)}`);
	}

	getProjectCapacityOperations(projectId: string, environment = 'staging') {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}/capacity/operations?environment=${encodeURIComponent(environment)}`);
	}

	listProjectWorkdaySummaries(projectId: string, environment: string | null = null) {
		const query = environment ? `?environment=${encodeURIComponent(environment)}` : '';
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/workdays${query}`);
	}

	listRuntimeWorkDays(projectId: string, options: { limit?: number } = {}) {
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/runtime/workdays?limit=${encodeURIComponent(String(options.limit ?? 100))}`);
	}

	listRuntimeTasks(projectId: string, options: { workDayId?: string; limit?: number } = {}) {
		const query = new URLSearchParams();
		if (options.workDayId) query.set('workDayId', options.workDayId);
		query.set('limit', String(options.limit ?? 100));
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/runtime/tasks?${query}`);
	}

	listRuntimeTaskEvents(projectId: string, taskId: string) {
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/runtime/tasks/${encodeURIComponent(taskId)}/events`);
	}

	listRuntimeTaskOutputs(projectId: string, taskId: string) {
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/runtime/tasks/${encodeURIComponent(taskId)}/outputs`);
	}

	listApprovalRequestsForProject(projectId: string, limit = 100) {
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/approval-requests?limit=${encodeURIComponent(String(limit))}`);
	}

	listApprovalRequestsForTeam(teamId: string, options: { kind?: string; limit?: number } = {}) {
		const query = new URLSearchParams();
		if (options.kind) query.set('kind', options.kind);
		query.set('limit', String(options.limit ?? 100));
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/approval-requests?${query}`);
	}

	decideApprovalRequest(approvalRequestId: string, body: Record<string, unknown>) {
		return this.request<any>('POST', `/v1/approval-requests/${encodeURIComponent(approvalRequestId)}/decide`, { body });
	}

	deleteTeamInboxItemsByItemKey(_teamId: string, _itemKey: string) {
		return Promise.resolve({ ok: true });
	}

	listPersistedTeamInboxItems(teamId: string) {
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/inbox`);
	}

	listAuditEventsForTarget(targetType: string, targetId: string, limit = 100) {
		return this.request<any[]>('GET', `/v1/audit-events?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}&limit=${encodeURIComponent(String(limit))}`);
	}

	listTeamMembers(teamId: string) {
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/members`);
	}

	getTeamAccessSummary(teamId: string) {
		return this.request<any>('GET', `/v1/teams/${encodeURIComponent(teamId)}/permissions`);
	}

	evaluateTeamDeletionBlockers(teamId: string) {
		return this.request<any>('GET', `/v1/teams/${encodeURIComponent(teamId)}/deletion-blockers`);
	}

	evaluateProjectDeletionBlockers(projectId: string) {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}/deletion-blockers`);
	}

	listRepositoryHosts(teamId: string, options: { includePlatform?: boolean } = {}) {
		const query = options.includePlatform === false ? '?includePlatform=false' : '';
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/repository-hosts${query}`);
	}

	getRepositoryHost(teamId: string, hostId: string) {
		return this.request<any>('GET', `/v1/teams/${encodeURIComponent(teamId)}/repository-hosts/${encodeURIComponent(hostId)}`);
	}

	listTeamWebHosts(teamId: string) {
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/web-hosts`);
	}

	getTeamTreeDx(teamId: string) {
		return this.request<any>('GET', `/v1/teams/${encodeURIComponent(teamId)}/treedx`);
	}

	updateTeamTreeDx(teamId: string, body: Record<string, unknown>) {
		return this.request<any>('PUT', `/v1/teams/${encodeURIComponent(teamId)}/treedx`, { body });
	}

	provisionTeamTreeDx(teamId: string, body: Record<string, unknown> = {}) {
		return this.request<any>('POST', `/v1/teams/${encodeURIComponent(teamId)}/treedx/provision`, { body });
	}

	listTreeDxMirrors(teamId: string) {
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/treedx/mirrors`);
	}

	createTreeDxMirror(teamId: string, body: Record<string, unknown>) {
		return this.request<any>('POST', `/v1/teams/${encodeURIComponent(teamId)}/treedx/mirrors`, { body });
	}

	listTreeDxShares(teamId: string) {
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/treedx/shares`);
	}

	createTreeDxShare(teamId: string, body: Record<string, unknown>) {
		return this.request<any>('POST', `/v1/teams/${encodeURIComponent(teamId)}/treedx/shares`, { body });
	}

	getProjectTreeDxLibrary(projectId: string) {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}/treedx-library`);
	}

	upsertProjectTreeDxLibrary(projectId: string, body: Record<string, unknown>) {
		return this.request<any>('POST', `/v1/projects/${encodeURIComponent(projectId)}/treedx-library`, { body });
	}

	getProjectRepositoryTopology(projectId: string) {
		return this.request<any>('GET', `/v1/projects/${encodeURIComponent(projectId)}/repository-topology`);
	}

	updateProjectRepositoryTopology(projectId: string, body: Record<string, unknown>) {
		return this.request<any>('PUT', `/v1/projects/${encodeURIComponent(projectId)}/repository-topology`, { body });
	}

	getTeamWebHost(teamId: string, hostId: string) {
		return this.request<any>('GET', `/v1/teams/${encodeURIComponent(teamId)}/web-hosts/${encodeURIComponent(hostId)}`);
	}

	listTeamCapacityProviders(teamId: string) {
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/capacity-providers`);
	}

	getCapacityProvider(teamId: string, providerId: string) {
		return this.request<any>('GET', `/v1/teams/${encodeURIComponent(teamId)}/capacity-providers/${encodeURIComponent(providerId)}`);
	}

	getCapacityProviderById(providerId: string) {
		return this.request<any>('GET', `/v1/capacity/providers/${encodeURIComponent(providerId)}`);
	}

	updateCapacityProvider(teamId: string, providerId: string, body: Record<string, unknown>) {
		return this.request<any>('PATCH', `/v1/teams/${encodeURIComponent(teamId)}/capacity-providers/${encodeURIComponent(providerId)}`, { body });
	}

	listCapacityGrants(teamId: string, filters: { projectId?: string | null; providerId?: string | null } = {}) {
		const query = new URLSearchParams();
		if (filters.projectId) query.set('projectId', filters.projectId);
		if (filters.providerId) query.set('providerId', filters.providerId);
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/capacity-grants${query.toString() ? `?${query}` : ''}`);
	}

	createCapacityGrant(teamId: string, body: Record<string, unknown>) {
		return this.request<any>('POST', `/v1/teams/${encodeURIComponent(teamId)}/capacity-grants`, { body });
	}

	updateCapacityGrant(teamId: string, grantId: string, body: Record<string, unknown>) {
		return this.request<any>('PATCH', `/v1/teams/${encodeURIComponent(teamId)}/capacity-grants/${encodeURIComponent(grantId)}`, { body });
	}

	listExecutionProviders(teamId: string, providerId: string) {
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/capacity-providers/${encodeURIComponent(providerId)}/execution-providers`);
	}

	createExecutionProvider(teamId: string, providerId: string, body: Record<string, unknown>) {
		return this.request<any>('POST', `/v1/teams/${encodeURIComponent(teamId)}/capacity-providers/${encodeURIComponent(providerId)}/execution-providers`, { body });
	}

	updateExecutionProvider(teamId: string, providerId: string, executionProviderId: string, body: Record<string, unknown>) {
		return this.request<any>('PATCH', `/v1/teams/${encodeURIComponent(teamId)}/capacity-providers/${encodeURIComponent(providerId)}/execution-providers/${encodeURIComponent(executionProviderId)}`, { body });
	}

	createExecutionProviderNativeLimit(teamId: string, providerId: string, executionProviderId: string, body: Record<string, unknown>) {
		return this.request<any>('POST', `/v1/teams/${encodeURIComponent(teamId)}/capacity-providers/${encodeURIComponent(providerId)}/execution-providers/${encodeURIComponent(executionProviderId)}/native-limits`, { body });
	}

	listCapacityProviderDeployments(teamId: string, providerId: string) {
		return this.request<any[]>('GET', `/v1/teams/${encodeURIComponent(teamId)}/capacity-providers/${encodeURIComponent(providerId)}/deployments`);
	}

	listCapacityLedgerEntries(projectId: string, workdayId: string) {
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/capacity/ledger?workdayId=${encodeURIComponent(workdayId)}`);
	}

	listCapacityRoutingDecisionsForProject(projectId: string, limit = 100) {
		return this.request<any[]>('GET', `/v1/projects/${encodeURIComponent(projectId)}/capacity/routing-decisions?limit=${encodeURIComponent(String(limit))}`);
	}

	listSeedRuns(limit = 100) {
		return this.request<any[]>('GET', `/v1/seeds/runs?limit=${encodeURIComponent(String(limit))}`);
	}

	listCatalogItems(_principal: unknown, filters: { kind?: string; teamId?: string; slug?: string } = {}) {
		const query = new URLSearchParams();
		if (filters.kind) query.set('kind', filters.kind);
		if (filters.teamId) query.set('teamId', filters.teamId);
		if (filters.slug) query.set('slug', filters.slug);
		return this.request<any[]>('GET', `/v1/catalog${query.toString() ? `?${query}` : ''}`);
	}

	getCatalogItemBySlug(kind: string, slug: string) {
		return this.listCatalogItems(null, { kind, slug }).then((items) => items[0] ?? null);
	}

	listCatalogArtifactVersions(itemId: string) {
		return this.request<any[]>('GET', `/v1/catalog/${encodeURIComponent(itemId)}/artifacts`);
	}

	listKnowledgePacks(principal: unknown) {
		return this.listCatalogItems(principal, { kind: 'knowledge_pack' });
	}

	acceptTeamInvite(token: string, _principalId: string) {
		return this.request<any>('POST', `/v1/team-invites/${encodeURIComponent(token)}/accept`, { body: {} });
	}

	loadTeamProfileByName(name: string) {
		return this.request<any>('GET', `/v1/teams/by-name/${encodeURIComponent(name)}/profile`).catch(() => null);
	}

	loadUserProfileByUsername(username: string) {
		return this.request<any>('GET', `/v1/users/by-username/${encodeURIComponent(username)}/profile`).catch(() => null);
	}
}

export function createApiFacade(context: AstroLike) {
	return new ApiClientFacade(context);
}

export function safeTokenEquals(left: string, right: string) {
	const encoder = new TextEncoder();
	const leftBuffer = encoder.encode(left);
	const rightBuffer = encoder.encode(right);
	const nodeCrypto = getNodeCrypto();
	if (nodeCrypto?.timingSafeEqual) {
		return leftBuffer.length === rightBuffer.length && nodeCrypto.timingSafeEqual(leftBuffer, rightBuffer);
	}
	let diff = leftBuffer.length ^ rightBuffer.length;
	const length = Math.max(leftBuffer.length, rightBuffer.length);
	for (let index = 0; index < length; index += 1) {
		diff |= (leftBuffer[index] ?? 0) ^ (rightBuffer[index] ?? 0);
	}
	return diff === 0;
}
