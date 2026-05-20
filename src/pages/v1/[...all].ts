import type { APIContext, APIRoute } from 'astro';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { loadSiteWebSession } from '../../lib/auth/session-store';
import { decryptHostConfig } from '../../lib/cloudflare-host-crypto';
import {
	listTreeseedManagedHostsFromConfig,
	resolveTreeseedManagedCloudflareHostConfigFromConfig,
} from '../../lib/market/managed-hosts';
import { validateProjectSlug } from '../../api/store.js';
import { resolveMarketStore } from '../../lib/market/store';

export const prerender = false;

function json(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

function error(status: number, message: string, details: Record<string, unknown> = {}) {
	return json({ ok: false, error: message, ...details }, status);
}

function bearerToken(request: Request) {
	const header = request.headers.get('authorization');
	return header?.match(/^Bearer\s+(.+)$/iu)?.[1] ?? null;
}

function principalHasPermission(principal: any, permission: string) {
	return Boolean(
		principal
		&& (
			principal.permissions?.includes?.('*:*:*')
			|| principal.permissions?.includes?.(permission)
		),
	);
}

function isTeamApiPrincipal(principal: any) {
	return Boolean(principal?.roles?.includes?.('team_api_key'));
}

function encryptedHostPayloadLooksValid(value: any) {
	return Boolean(
		value
		&& typeof value === 'object'
		&& typeof value.version === 'number'
		&& typeof value.algorithm === 'string'
		&& typeof value.kdf === 'object'
		&& typeof value.salt === 'string'
		&& typeof value.nonce === 'string'
		&& typeof value.ciphertext === 'string',
	);
}

function decryptedCloudflareConfigSummary(value: any) {
	if (!value || typeof value !== 'object') return { provided: false, keys: [] };
	return { provided: true, keys: Object.keys(value).filter(Boolean).sort() };
}

function optionalTrimmedString(value: unknown) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function enumValue(value: unknown, allowed: string[], fallback: string | null = null) {
	const candidate = typeof value === 'string' ? value.trim() : '';
	return allowed.includes(candidate) ? candidate : fallback;
}

function credentialSessionKey(context: APIContext) {
	const secret = process.env.TREESEED_MARKET_CREDENTIAL_SESSION_SECRET
		?? (context.locals as any).runtime?.resolved?.config?.credentialSessionSecret
		?? (process.env.NODE_ENV === 'test' || process.env.TREESEED_LOCAL_DEV_MODE ? 'treeseed-local-test-credential-session-secret' : '');
	if (!secret) throw new Error('TREESEED_MARKET_CREDENTIAL_SESSION_SECRET is required for provider credential sessions.');
	return createHash('sha256').update(secret).digest();
}

function encryptCredentialSessionPayload(context: APIContext, payload: unknown) {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', credentialSessionKey(context), iv);
	const ciphertext = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(payload ?? {}), 'utf8')), cipher.final()]);
	return {
		version: 1,
		algorithm: 'aes-256-gcm',
		iv: iv.toString('base64url'),
		tag: cipher.getAuthTag().toString('base64url'),
		ciphertext: ciphertext.toString('base64url'),
	};
}

function decryptCredentialSessionPayload(context: APIContext, envelope: any) {
	const decipher = createDecipheriv('aes-256-gcm', credentialSessionKey(context), Buffer.from(String(envelope?.iv ?? ''), 'base64url'));
	decipher.setAuthTag(Buffer.from(String(envelope?.tag ?? ''), 'base64url'));
	return JSON.parse(Buffer.concat([
		decipher.update(Buffer.from(String(envelope?.ciphertext ?? ''), 'base64url')),
		decipher.final(),
	]).toString('utf8'));
}

function normalizeProviderCredentialConfig(hostKind: string, config: any) {
	const source = config && typeof config === 'object' ? config : {};
	if (hostKind === 'repository_host') {
		const token = source.GH_TOKEN ?? source.GITHUB_TOKEN ?? source.githubToken ?? source.token;
		if (!token || typeof token !== 'string') throw new Error('Repository Host credentials must include GH_TOKEN or GITHUB_TOKEN.');
		return {
			GH_TOKEN: token,
			GITHUB_TOKEN: typeof source.GITHUB_TOKEN === 'string' ? source.GITHUB_TOKEN : token,
			...(typeof source.owner === 'string' ? { owner: source.owner } : {}),
			...(typeof source.organizationOrOwner === 'string' ? { organizationOrOwner: source.organizationOrOwner } : {}),
		};
	}
	return source;
}

function managedCloudflareConfigMissing(config: Record<string, unknown> | null) {
	return ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter((key) => !config?.[key]);
}

type MarketStore = any;

async function resolvePrincipal(context: APIContext, store: MarketStore) {
	const token = bearerToken(context.request);
	if (token && store) {
		const match = await store.authenticateTeamApiKey(token);
		if (match) {
			return {
				principal: match.principal,
				actorType: 'service',
			};
		}
	}
	const session = await loadSiteWebSession(context);
	if (!session) return null;
	return {
		principal: session.principal,
		actorType: 'user',
		session,
	};
}

async function requireRunner(store: MarketStore, request: Request, projectId: string) {
	const token = bearerToken(request);
	if (!token) return { response: error(401, 'Authentication required.') };
	const runner = await store.authenticateRunner(projectId, token);
	if (!runner) return { response: error(401, 'Invalid project runner token.') };
	return { runner };
}

async function requireTeam(store: MarketStore, principal: any, teamId: string, permission?: string) {
	if (!(await store.principalCanAccessTeam(principal, teamId))) {
		return { response: error(403, 'Permission denied.', { teamId }) };
	}
	if (permission && isTeamApiPrincipal(principal) && !principalHasPermission(principal, permission)) {
		return { response: error(403, 'Permission denied.', { permission }) };
	}
	if (permission === 'teams:manage:team' && !isTeamApiPrincipal(principal) && !(await store.principalCanManageTeam(principal, teamId))) {
		return { response: error(403, 'Permission denied.', { permission }) };
	}
	return { ok: true as const };
}

async function requireProject(store: MarketStore, principal: any, projectId: string, permission?: string) {
	const details = await store.getProjectDetails(projectId);
	if (!details) return { response: error(404, `Unknown project "${projectId}".`) };
	const access = await requireTeam(store, principal, details.project.teamId, permission);
	if (access.response) return access;
	return { details };
}

async function readJson(context: APIContext) {
	return context.request.json().catch(() => ({})) as Promise<Record<string, any>>;
}

async function createQueuedProjectJob(
	context: APIContext,
	store: MarketStore,
	auth: { principal: any; actorType: string },
	projectId: string,
	namespace: string,
	operation: string,
	input: Record<string, unknown>,
) {
	const job = await store.createJob({
		projectId,
		namespace,
		operation,
		status: 'pending',
		preferredMode: 'auto',
		selectedTarget: 'project_runner',
		requestedByType: auth.actorType === 'service' ? 'service' : 'user',
		requestedById: typeof auth.principal.id === 'string' ? auth.principal.id : null,
		input,
	});
	if (!job) {
		throw new Error('Unable to create project job.');
	}
	const queue = context.locals.runtime?.env?.AGENT_WORK_QUEUE as { send?: (message: unknown) => Promise<void> } | undefined;
	if (queue?.send) {
		await queue.send({
			kind: 'treeseed.project_job',
			jobId: job.id,
			projectId,
			namespace,
			operation,
			input,
		});
		await store.appendJobEvent(job.id, 'queued', { via: 'cloudflare_queue' });
	} else {
		await store.appendJobEvent(job.id, 'queued', { via: 'd1_only', reason: 'queue_binding_unavailable' });
	}
	return job;
}

export const ALL: APIRoute = async (context) => {
	const store = resolveMarketStore(context.locals) as MarketStore | null;
	if (!store) return error(503, 'SITE_DATA_DB is unavailable.');
	const method = context.request.method.toUpperCase();
	const parts = (context.params.all ?? '').split('/').filter(Boolean);
	const [root, id, third, fourth, fifth] = parts;

	if (method === 'GET' && root === 'auth' && id === 'device' && third === 'approve') {
		const target = new URL('/auth/device/approve', context.url.origin);
		const userCode = context.url.searchParams.get('user_code');
		if (userCode) target.searchParams.set('user_code', userCode);
		return Response.redirect(target.toString(), 302);
	}

	if (root === 'projects' && id && third === 'runner') {
		const runnerAccess = await requireRunner(store, context.request, id);
		if (runnerAccess.response) return runnerAccess.response;
		const body = method === 'GET' ? {} : await readJson(context);
		if (method === 'POST' && fourth === 'jobs' && fifth === 'pull') {
			return json({
				ok: true,
				payload: await store.pullJobsForRunner(id, {
					limit: body.limit,
					runnerId: typeof body.runnerId === 'string' ? body.runnerId : null,
				}),
			});
		}
		if (method === 'PUT' && fourth === 'environments' && fifth) {
			return json({
				ok: true,
				payload: await store.upsertProjectEnvironment(id, {
					environment: fifth,
					deploymentProfile: typeof body.deploymentProfile === 'string' ? body.deploymentProfile : 'self_hosted_project',
					baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : null,
					cloudflareAccountId: typeof body.cloudflareAccountId === 'string' ? body.cloudflareAccountId : null,
					pagesProjectName: typeof body.pagesProjectName === 'string' ? body.pagesProjectName : null,
					workerName: typeof body.workerName === 'string' ? body.workerName : null,
					r2BucketName: typeof body.r2BucketName === 'string' ? body.r2BucketName : null,
					d1DatabaseName: typeof body.d1DatabaseName === 'string' ? body.d1DatabaseName : null,
					queueName: typeof body.queueName === 'string' ? body.queueName : null,
					railwayProjectName: typeof body.railwayProjectName === 'string' ? body.railwayProjectName : null,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				}),
			});
		}
		if (method === 'POST' && fourth === 'resources') {
			if (!body.environment || !body.provider || !body.resourceKind || !body.logicalName) {
				return error(400, 'environment, provider, resourceKind, and logicalName are required.');
			}
			return json({
				ok: true,
				payload: await store.upsertProjectInfrastructureResource(id, {
					id: typeof body.id === 'string' ? body.id : undefined,
					environment: String(body.environment),
					provider: String(body.provider),
					resourceKind: String(body.resourceKind),
					logicalName: String(body.logicalName),
					locator: typeof body.locator === 'string' ? body.locator : null,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				}),
			});
		}
		if (method === 'POST' && fourth === 'deployments') {
			if (!body.environment || !body.deploymentKind) return error(400, 'environment and deploymentKind are required.');
			return json({
				ok: true,
				payload: await store.createProjectDeployment(id, {
					id: typeof body.id === 'string' ? body.id : undefined,
					environment: String(body.environment),
					deploymentKind: String(body.deploymentKind),
					status: typeof body.status === 'string' ? body.status : 'pending',
					sourceRef: typeof body.sourceRef === 'string' ? body.sourceRef : null,
					releaseTag: typeof body.releaseTag === 'string' ? body.releaseTag : null,
					commitSha: typeof body.commitSha === 'string' ? body.commitSha : null,
					triggeredByType: typeof body.triggeredByType === 'string' ? body.triggeredByType : 'project_runner',
					triggeredById: typeof body.triggeredById === 'string' ? body.triggeredById : runnerAccess.runner.tokenDigest,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					startedAt: typeof body.startedAt === 'string' ? body.startedAt : null,
					finishedAt: typeof body.finishedAt === 'string' ? body.finishedAt : null,
				}),
			});
		}
		if (method === 'GET' && fourth === 'deployments') {
			return json({ ok: true, payload: await store.listProjectDeployments(id, context.url.searchParams.get('environment')) });
		}
		if (method === 'GET' && fourth === 'health') {
			const environment = context.url.searchParams.get('environment') ?? 'staging';
			const [resources, deployments, pools, workdays] = await Promise.all([
				store.listProjectInfrastructureResources(id, environment),
				store.listProjectDeployments(id, environment),
				store.listAgentPools(id, environment),
				store.listProjectWorkdaySummaries(id, environment),
			]);
			return json({ ok: true, payload: { environment, resources, deployments, pools, workdays } });
		}
		if (method === 'POST' && fourth === 'agent-pools' && fifth) {
			const project = await store.getProject(id);
			if (!project) return error(404, `Unknown project "${id}".`);
			const pool = await store.upsertAgentPool(id, {
				teamId: typeof body.teamId === 'string' ? body.teamId : project.teamId,
				environment: typeof body.environment === 'string' ? body.environment : 'local',
				name: fifth,
				registrationIdentity: typeof body.registrationIdentity === 'string'
					? body.registrationIdentity
					: typeof body.managerId === 'string'
						? body.managerId
						: typeof body.runnerId === 'string'
							? body.runnerId
							: fifth,
				serviceBaseUrl: typeof body.serviceBaseUrl === 'string' ? body.serviceBaseUrl : null,
				status: typeof body.status === 'string' ? body.status : 'active',
				autoscale: typeof body.autoscale === 'object' && body.autoscale ? body.autoscale : undefined,
				metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
			});
			const registration = await store.recordAgentPoolRegistration(id, {
				poolId: pool.id,
				runnerId: typeof body.runnerId === 'string' ? body.runnerId : null,
				managerId: typeof body.managerId === 'string' ? body.managerId : null,
				serviceName: typeof body.serviceName === 'string' ? body.serviceName : 'manager',
				heartbeatAt: typeof body.heartbeatAt === 'string' ? body.heartbeatAt : null,
				desiredWorkers: Number.isFinite(Number(body.desiredWorkers)) ? Number(body.desiredWorkers) : null,
				observedQueueDepth: Number.isFinite(Number(body.observedQueueDepth)) ? Number(body.observedQueueDepth) : null,
				observedActiveLeases: Number.isFinite(Number(body.observedActiveLeases)) ? Number(body.observedActiveLeases) : null,
				metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
			});
			return json({ ok: true, payload: { pool, registration } });
		}
		if (method === 'POST' && fourth === 'workdays') {
			if (!body.environment || !body.workDayId || !body.summary || typeof body.summary !== 'object') {
				return error(400, 'environment, workDayId, and summary are required.');
			}
			return json({
				ok: true,
				payload: await store.createProjectWorkdaySummary(id, {
					environment: String(body.environment),
					workDayId: String(body.workDayId),
					kind: typeof body.kind === 'string' ? body.kind : 'workday_summary',
					state: typeof body.state === 'string' ? body.state : null,
					startedAt: typeof body.startedAt === 'string' ? body.startedAt : null,
					endedAt: typeof body.endedAt === 'string' ? body.endedAt : null,
					summary: body.summary,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				}),
			});
		}
		if (method === 'POST' && fourth === 'priority-snapshots') {
			if (!body.snapshot || typeof body.snapshot !== 'object') return error(400, 'snapshot is required.');
			return json({
				ok: true,
				payload: await store.createProjectPrioritySnapshot(id, {
					id: typeof body.id === 'string' ? body.id : undefined,
					workDayId: typeof body.workDayId === 'string' ? body.workDayId : null,
					snapshot: body.snapshot,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					generatedAt: typeof body.generatedAt === 'string' ? body.generatedAt : null,
				}),
			});
		}
		if (method === 'POST' && fourth === 'task-credits') {
			if (!body.workDayId || !body.phase || !Number.isFinite(Number(body.credits))) {
				return error(400, 'workDayId, phase, and credits are required.');
			}
			return json({
				ok: true,
				payload: await store.recordProjectTaskCredits(id, {
					id: typeof body.id === 'string' ? body.id : undefined,
					workDayId: String(body.workDayId),
					taskId: typeof body.taskId === 'string' ? body.taskId : null,
					phase: String(body.phase),
					credits: Number(body.credits),
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				}),
			});
		}
		return error(404, 'Unknown project runner route.', { path: `/${parts.join('/')}` });
	}

	if (root === 'jobs' && id && third === 'provider-credential-sessions' && fourth && fifth === 'consume' && method === 'POST') {
		const job = await store.findJobById(id);
		if (!job) return error(404, `Unknown job "${id}".`);
		const runnerAccess = await requireRunner(store, context.request, job.projectId);
		if (runnerAccess.response) return runnerAccess.response;
		const consumed = await store.consumeProviderCredentialSession(id, fourth);
		if (!consumed.ok) return error(consumed.error === 'expired' ? 410 : 404, consumed.error);
		try {
			const sessionPayload = decryptCredentialSessionPayload(context, consumed.payload.encryptedPayload);
			return json({
				ok: true,
				payload: {
					id: consumed.payload.id,
					hostKind: consumed.payload.hostKind,
					hostId: consumed.payload.hostId,
					purpose: consumed.payload.purpose,
					provider: sessionPayload.provider ?? null,
					config: sessionPayload.config && typeof sessionPayload.config === 'object' ? sessionPayload.config : {},
				},
			});
		} catch (err) {
			return error(500, 'Unable to decrypt credential session payload.', { message: err instanceof Error ? err.message : String(err) });
		}
	}

	if (root === 'jobs' && id && ['progress', 'complete', 'fail'].includes(third ?? '') && method === 'POST') {
		const job = await store.findJobById(id);
		if (!job) return error(404, `Unknown job "${id}".`);
		const runnerAccess = await requireRunner(store, context.request, job.projectId);
		if (runnerAccess.response) return runnerAccess.response;
		const body = await readJson(context);
		if (third === 'progress') {
			return json({
				ok: true,
				payload: await store.recordJobProgress(id, {
					summary: typeof body.summary === 'string' ? body.summary : null,
					data: typeof body.data === 'object' && body.data ? body.data : {},
				}),
			});
		}
		if (third === 'complete') return json({ ok: true, payload: await store.completeJob(id, { output: body.output }) });
		if (!body.message) return error(400, 'message is required.');
		return json({
			ok: true,
			payload: await store.failJob(id, {
				code: typeof body.code === 'string' ? body.code : 'runner_failed',
				message: String(body.message),
				details: typeof body.details === 'object' && body.details ? body.details : {},
			}),
		});
	}

	const auth = await resolvePrincipal(context, store);
	if (!auth) return error(401, 'Authentication required.');

	if (method === 'GET' && root === 'me' && !id) {
		return json({ ok: true, payload: { principal: auth.principal, teams: await store.listTeamsForPrincipal(auth.principal) } });
	}

	if (root === 'team-invites' && id && third === 'accept' && method === 'POST') {
		const result = await store.acceptTeamInvite(id, auth.principal.id);
		return json(result, result.ok ? 200 : 400);
	}

	if (root === 'teams') {
		if (method === 'GET' && !id) {
			return json({ ok: true, payload: await store.listTeamsForPrincipal(auth.principal) });
		}
		if (method === 'POST' && !id) {
			if (isTeamApiPrincipal(auth.principal)) return error(403, 'Permission denied.');
			const body = await readJson(context);
			if (!body.name && !body.slug) return error(400, 'name is required.');
			const team = await store.createTeam({
				name: String(body.slug ?? body.name),
				displayName: typeof body.displayName === 'string' ? body.displayName : typeof body.label === 'string' ? body.label : String(body.name ?? body.slug),
				logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl : null,
				profileSummary: typeof body.profileSummary === 'string' ? body.profileSummary : typeof body.description === 'string' ? body.description : null,
				metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				ownerUserId: typeof auth.principal.id === 'string' ? auth.principal.id : null,
			});
			return json({ ok: true, payload: team });
		}
		if (!id) return error(404, 'Unknown team route.');
		const teamPermission = third === 'api-keys'
			|| third === 'invites'
			|| third === 'members'
			|| third === 'deletion-blockers'
			|| ((third === 'web-hosts' || third === 'hosts') && method !== 'GET')
			|| (method === 'PATCH' && !third)
			|| (method === 'DELETE' && !third)
			? 'teams:manage:team'
			: 'projects:read:team';
		const access = await requireTeam(store, auth.principal, id, teamPermission);
		if (access.response) return access.response;
		if (method === 'GET' && third === 'home') return json({ ok: true, payload: await store.getTeamHomeSummary(id, auth.principal) });
		if (method === 'GET' && third === 'inbox') return json({ ok: true, payload: await store.listTeamInboxItems(id, auth.principal) });
		if (method === 'GET' && third === 'members') return json({ ok: true, payload: await store.listTeamMembers(id) });
		if (method === 'GET' && third === 'products') return json({ ok: true, payload: await store.listTeamProducts(id, auth.principal) });
		if (method === 'PATCH' && !third) {
			const body = await readJson(context);
			const result = await store.updateTeamSettings(id, body);
			return json(result, result?.ok ? 200 : 400);
		}
		if (method === 'POST' && third === 'invites') {
			const body = await readJson(context);
			const result = await store.createTeamInvite(id, {
				email: body.email,
				roleKey: body.roleKey ?? body.role,
				invitedByUserId: auth.principal.id,
			});
			return json(result, result.ok ? 200 : 400);
		}
		if (method === 'PATCH' && third === 'members' && fourth) {
			const body = await readJson(context);
			const result = await store.updateTeamMemberRole(id, fourth, String(body.roleKey ?? body.role ?? 'contributor'));
			return json(result, result.ok ? 200 : 400);
		}
		if (method === 'DELETE' && third === 'members' && fourth) {
			const result = await store.removeTeamMember(id, fourth);
			return json(result, result.ok ? 200 : 400);
		}
		if (method === 'GET' && third === 'deletion-blockers') return json({ ok: true, payload: await store.evaluateTeamDeletionBlockers(id) });
		if (method === 'DELETE' && !third) {
			const body = await readJson(context);
			const result = await store.deleteTeam(id, body.confirmation);
			return json(result, result.ok ? 200 : 400);
		}
		if (method === 'GET' && third === 'storage') return json({ ok: true, payload: await store.getTeamStorageLocator(id) });
		if (method === 'PUT' && third === 'storage') {
			const body = await readJson(context);
			return json({ ok: true, payload: await store.upsertTeamStorageLocator(id, body) });
		}
		if (method === 'POST' && third === 'api-keys') {
			const body = await readJson(context);
			if (!body.name) return error(400, 'name is required.');
			return json({
				ok: true,
				payload: await store.createTeamApiKey(id, {
					name: String(body.name),
					permissions: Array.isArray(body.permissions) ? body.permissions.map(String) : [],
					expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
				}),
			});
		}
		if (method === 'GET' && (third === 'web-hosts' || third === 'hosts') && !fourth) {
			return json({
				ok: true,
				payload: third === 'hosts'
					? [
						...(await listTreeseedManagedHostsFromConfig(id, (context.locals as any).runtime ?? context.locals)),
						...(await store.listTeamWebHosts(id)),
					]
					: await store.listTeamWebHosts(id),
			});
		}
		if (method === 'POST' && (third === 'web-hosts' || third === 'hosts') && !fourth) {
			const body = await readJson(context);
			if (!body.name) return error(400, 'name is required.');
			if ((body.ownership ?? 'team_owned') === 'team_owned' && !encryptedHostPayloadLooksValid(body.encryptedPayload)) {
				return error(400, 'A valid encryptedPayload is required for team-owned hosts.');
			}
			return json({
				ok: true,
				payload: await store.createTeamWebHost(id, {
					...body,
					provider: typeof body.provider === 'string' ? body.provider : 'cloudflare',
					createdById: auth.principal.id,
					updatedById: auth.principal.id,
				}),
			}, 201);
		}
		if (method === 'PUT' && (third === 'web-hosts' || third === 'hosts') && fourth) {
			const body = await readJson(context);
			if (body.encryptedPayload !== undefined && !encryptedHostPayloadLooksValid(body.encryptedPayload)) {
				return error(400, 'encryptedPayload must be a valid encrypted host envelope.');
			}
			const payload = await store.updateTeamWebHost(id, fourth, { ...body, updatedById: auth.principal.id });
			return payload ? json({ ok: true, payload }) : error(404, 'Unknown host.');
		}
		if (method === 'DELETE' && (third === 'web-hosts' || third === 'hosts') && fourth) {
			const result = await store.deleteTeamWebHost(id, fourth);
			return json(result, result.ok ? 200 : result.error === 'in_use' ? 409 : 404);
		}
		if (method === 'POST' && (third === 'web-hosts' || third === 'hosts') && fourth && fifth === 'validate') {
			const host = await store.getTeamWebHost(id, fourth);
			if (!host) return error(404, 'Unknown host.');
			const body = await readJson(context);
			if (host.ownership === 'team_owned' && (!body.decryptedConfig || typeof body.decryptedConfig !== 'object')) {
				return error(400, 'decryptedConfig is required to validate a team-owned host.');
			}
			const summary = decryptedCloudflareConfigSummary(body.decryptedConfig);
			const validated = await store.updateTeamWebHost(id, fourth, {
				metadata: {
					...(host.metadata ?? {}),
					lastValidation: {
						status: 'unchecked',
						checkedAt: new Date().toISOString(),
						receivedKeys: summary.keys,
						mode: host.ownership,
					},
				},
				updatedById: auth.principal.id,
			});
			return json({ ok: true, payload: { host: validated, validation: validated?.metadata?.lastValidation ?? null } });
		}
		if (method === 'POST' && third === 'provider-credential-sessions') {
			const body = await readJson(context);
			const hostKind = String(body.hostKind ?? '');
			const hostId = typeof body.hostId === 'string' && body.hostId.trim() ? body.hostId.trim() : null;
			const passphrase = typeof body.passphrase === 'string' ? body.passphrase : '';
			if (!hostId || !passphrase) return error(400, 'hostId and passphrase are required.');
			let host: any = null;
			if (hostKind === 'repository_host') {
				host = await store.getRepositoryHost(id, hostId);
			} else if (hostKind === 'web_host' || hostKind === 'capacity_provider_host' || hostKind === 'email_host') {
				host = await store.getTeamWebHost(id, hostId);
			} else {
				return error(400, 'hostKind must be repository_host, web_host, capacity_provider_host, or email_host.');
			}
			if (!host || host.teamId !== id || host.ownership !== 'team_owned') {
				return error(404, 'Selected team-owned provider host is not available for this team.');
			}
			try {
				const decryptedConfig = await decryptHostConfig(host.encryptedPayload, passphrase);
				const normalizedConfig = normalizeProviderCredentialConfig(hostKind, decryptedConfig);
				const requestedSeconds = Number(body.expiresInSeconds ?? 900);
				const expiresInSeconds = Math.max(60, Math.min(Number.isFinite(requestedSeconds) ? requestedSeconds : 900, 3600));
				const session = await store.createProviderCredentialSession(id, {
					hostKind,
					hostId,
					purpose: typeof body.purpose === 'string' ? body.purpose : 'launch_project',
					expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
					createdById: auth.principal.id,
					encryptedPayload: encryptCredentialSessionPayload(context, {
						provider: host.provider ?? (hostKind === 'repository_host' ? 'github' : null),
						ownership: host.ownership,
						config: normalizedConfig,
					}),
					metadata: {
						hostName: host.name ?? null,
						provider: host.provider ?? null,
						configSummary: decryptedCloudflareConfigSummary(normalizedConfig),
					},
				});
				return json({ ok: true, payload: { id: session.id, hostKind: session.hostKind, hostId: session.hostId, purpose: session.purpose, expiresAt: session.expiresAt } }, 201);
			} catch (err) {
				return error(400, 'Unable to unlock provider credentials for this host.', { message: err instanceof Error ? err.message : String(err) });
			}
		}
		if (method === 'POST' && third === 'projects' && fourth === 'launch') {
			const body = await readJson(context);
			if (!body.slug || !body.name) return error(400, 'slug and name are required.');
			const credentialSessions = body.credentialSessions && typeof body.credentialSessions === 'object' ? body.credentialSessions : {};
			const hostingMode = typeof body.hostingMode === 'string' ? body.hostingMode : 'managed';
			const cloudflareHostMode = body.cloudflareHostMode === 'treeseed_managed' ? 'treeseed_managed' : body.cloudflareHostMode === 'team_owned' ? 'team_owned' : null;
			const cloudflareHostId = typeof body.cloudflareHostId === 'string' && body.cloudflareHostId.trim() ? body.cloudflareHostId.trim() : null;
			const emailHostMode = body.emailHostMode === 'treeseed_managed' ? 'treeseed_managed' : body.emailHostMode === 'team_owned' ? 'team_owned' : null;
			const emailHostId = typeof body.emailHostId === 'string' && body.emailHostId.trim() ? body.emailHostId.trim() : null;
			const removedRuntimeHostFields = [
				['process', 'ingHostMode'].join(''),
				['process', 'ingHostId'].join(''),
				['process', 'ingHostConfig'].join(''),
			];
			const removedRuntimeSessionKey = ['process', 'ingHost'].join('');
			if (removedRuntimeHostFields.some((field) => body[field] !== undefined) || credentialSessions[removedRuntimeSessionKey] !== undefined) {
				return error(400, 'Project launch no longer accepts runtime host configuration. Create and deploy a capacity provider from the capacity provider lifecycle pages.');
			}
			let cloudflareHost = null;
			if (cloudflareHostMode === 'team_owned') {
				if (!cloudflareHostId) return error(400, 'cloudflareHostId is required when cloudflareHostMode is team_owned.');
				cloudflareHost = await store.getTeamWebHost(id, cloudflareHostId);
				if (!cloudflareHost || cloudflareHost.provider !== 'cloudflare' || cloudflareHost.ownership !== 'team_owned') {
					return error(400, 'Selected team-owned Cloudflare host is not available for this team.');
				}
				if (body.cloudflareHostConfig && typeof body.cloudflareHostConfig === 'object') {
					return error(400, 'Plaintext Cloudflare provider configs are not accepted. Create a provider credential session and pass credentialSessions.webHost.');
				}
				if (typeof credentialSessions.webHost !== 'string' || !credentialSessions.webHost.trim()) {
					return error(400, 'credentialSessions.webHost is required after unlocking a team-owned Cloudflare host.');
				}
			}
			let emailHost = null;
			if (emailHostMode === 'team_owned') {
				if (!emailHostId) return error(400, 'emailHostId is required when emailHostMode is team_owned.');
				emailHost = await store.getTeamWebHost(id, emailHostId);
				const hostType = emailHost?.metadata?.hostType;
				if (!emailHost || emailHost.provider !== 'smtp' || emailHost.ownership !== 'team_owned' || hostType !== 'email') {
					return error(400, 'Selected team-owned Email host is not available for this team.');
				}
				if (body.emailHostConfig && typeof body.emailHostConfig === 'object') {
					return error(400, 'Plaintext Email provider configs are not accepted. Create a provider credential session and pass credentialSessions.emailHost.');
				}
				if (typeof credentialSessions.emailHost !== 'string' || !credentialSessions.emailHost.trim()) {
					return error(400, 'credentialSessions.emailHost is required after unlocking a team-owned Email host.');
				}
			}
			const cloudflareLaunchConfig = cloudflareHostMode === 'treeseed_managed'
					? await resolveTreeseedManagedCloudflareHostConfigFromConfig((context.locals as any).runtime ?? context.locals)
					: null;
			if (cloudflareHostMode === 'treeseed_managed') {
				const missingManagedConfig = managedCloudflareConfigMissing(cloudflareLaunchConfig);
				if (missingManagedConfig.length > 0) {
					return error(500, 'TreeSeed managed Cloudflare hosting is not configured.', { missing: missingManagedConfig });
				}
			}
			const targetEnvironments = ['staging', 'prod'];
			const cloudflareHostMetadata = cloudflareHostMode
				? {
					mode: cloudflareHostMode,
					hostId: cloudflareHostId,
					hostName: cloudflareHost?.name ?? (cloudflareHostMode === 'treeseed_managed' ? 'TreeSeed Web Host' : null),
					ownership: cloudflareHost?.ownership ?? cloudflareHostMode,
					targetEnvironments,
					billing: cloudflareHostMode === 'treeseed_managed'
						? { fee: 'treeseed_cloudflare_hosting', status: 'pending_activation' }
						: null,
				}
				: null;
			const emailHostMetadata = emailHostMode
				? {
					mode: emailHostMode,
					hostId: emailHostId,
					hostName: emailHost?.name ?? (emailHostMode === 'treeseed_managed' ? 'TreeSeed Email Host' : null),
					ownership: emailHost?.ownership ?? emailHostMode,
					provider: emailHost?.provider ?? 'smtp',
					targetEnvironments,
					billing: emailHostMode === 'treeseed_managed'
						? { fee: 'treeseed_email_hosting', unit: 'email_sent', price: '$0.01/email sent', status: 'pending_activation' }
						: null,
				}
				: null;
			const hostMetadata = {
				...(cloudflareHostMetadata ? { cloudflareHost: cloudflareHostMetadata } : {}),
				...(emailHostMetadata ? { emailHost: emailHostMetadata } : {}),
			};
			const details = await store.createProject(id, {
				id: typeof body.id === 'string' ? body.id : undefined,
				slug: String(body.slug),
				name: String(body.name),
				description: typeof body.summary === 'string' ? body.summary : typeof body.description === 'string' ? body.description : null,
				metadata: {
					sourceKind: typeof body.sourceKind === 'string' ? body.sourceKind : 'blank',
					publicSite: body.publicSite !== false,
					enableDefaultAgents: body.enableDefaultAgents !== false,
					launchMode: hostingMode,
					launchPhase: 'queued',
					...hostMetadata,
					...(typeof body.metadata === 'object' && body.metadata ? body.metadata : {}),
				},
				entitlementTier: typeof body.entitlementTier === 'string'
					? body.entitlementTier
					: cloudflareHostMode === 'treeseed_managed' || emailHostMode === 'treeseed_managed'
						? 'paid_hosting'
						: 'free',
			});
			await store.upsertProjectHosting(details.project.id, {
				kind: hostingMode === 'managed' ? 'hosted_project' : 'self_hosted_project',
				registration: hostingMode === 'hybrid' ? 'optional' : 'none',
				marketBaseUrl: context.url.origin,
				projectApiBaseUrl: null,
				executionOwner: hostingMode === 'managed' ? 'project_runner' : 'project_runner',
				metadata: {
					repoProvider: typeof body.repoProvider === 'string' ? body.repoProvider : 'github',
					repoVisibility: typeof body.repoVisibility === 'string' ? body.repoVisibility : 'private',
					publicSite: body.publicSite !== false,
					launchPhase: 'queued',
					...hostMetadata,
				},
			});
			for (const environment of ['local', 'staging', 'prod']) {
				await store.upsertProjectEnvironment(details.project.id, {
					environment,
					deploymentProfile: hostingMode === 'managed' ? 'hosted_project' : 'self_hosted_project',
					baseUrl: null,
					metadata: { launchMode: hostingMode, launchPhase: 'queued' },
				});
			}
			const job = await createQueuedProjectJob(context, store, auth, details.project.id, 'workflow', 'launch_project', {
				teamId: id,
				projectId: details.project.id,
				hostingMode,
				sourceKind: typeof body.sourceKind === 'string' ? body.sourceKind : 'blank',
				sourceRef: typeof body.sourceRef === 'string' ? body.sourceRef : null,
				repoProvider: typeof body.repoProvider === 'string' ? body.repoProvider : 'github',
				repoVisibility: typeof body.repoVisibility === 'string' ? body.repoVisibility : 'private',
				cloudflareHostMode,
				cloudflareHostId,
				emailHostMode,
				emailHostId,
				credentialSessions,
			});
			for (const [key, sessionId] of Object.entries(credentialSessions)) {
				if (typeof sessionId !== 'string' || !sessionId.trim()) continue;
				await store.bindProviderCredentialSession(id, sessionId, {
					projectId: details.project.id,
					jobId: job.id,
					metadata: { boundFor: 'workflow.launch_project', sessionKey: key },
				});
			}
			return json({ ok: true, payload: { ...details, launchJob: job } }, 202);
		}
		if (method === 'POST' && third === 'projects') {
			const body = await readJson(context);
			if (!body.slug || !body.name) return error(400, 'slug and name are required.');
			return json({
				ok: true,
				payload: await store.createProject(id, {
					id: typeof body.id === 'string' ? body.id : undefined,
					slug: String(body.slug),
					name: String(body.name),
					description: typeof body.description === 'string' ? body.description : null,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					entitlementTier: typeof body.entitlementTier === 'string' ? body.entitlementTier : 'free',
				}),
			});
		}
		if (method === 'POST' && third === 'catalog-items') {
			const body = await readJson(context);
			return json({ ok: true, payload: await store.upsertCatalogItem(id, body) });
		}
	}

	if (root === 'projects') {
		if (method === 'GET' && !id) {
			return json({ ok: true, payload: await store.listProjectsForPrincipal(auth.principal) });
		}
		if (!id) return error(404, 'Unknown project route.');
		const access: any = await requireProject(store, auth.principal, id, 'projects:read:team');
		if (access.response) return access.response;
		if (method === 'GET' && !third) return json({ ok: true, payload: access.details });
		if (method === 'PUT' && !third) {
			const manageAccess: any = await requireProject(store, auth.principal, id, 'projects:manage:team');
			if (manageAccess.response) return manageAccess.response;
			const body = await readJson(context);
			let slug = manageAccess.details.project.slug;
			if (body.slug != null) {
				const slugResult = validateProjectSlug(body.slug);
				if (!slugResult.ok) return error(400, slugResult.message ?? 'Invalid project slug.', { code: slugResult.code });
				slug = slugResult.slug;
			}
			const name = String(body.name ?? manageAccess.details.project.name).trim();
			if (!name) return error(400, 'Project name is required.', { code: 'missing_name' });
			const existing = slug === manageAccess.details.project.slug
				? null
				: await store.getProjectByTeamAndSlug(manageAccess.details.project.teamId, slug);
			if (existing && existing.id !== id) {
				return error(409, 'That project slug is already in use for this team.', { code: 'slug_taken' });
			}
			const updated = await store.updateProject(id, {
				slug,
				name,
				description: typeof body.description === 'string' ? body.description.trim() || null : manageAccess.details.project.description ?? null,
				metadata: {
					...(manageAccess.details.project.metadata ?? {}),
					...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
				},
			});
			return json({ ok: true, payload: await store.getProjectDetails(updated.id) });
		}
		if (method === 'GET' && third === 'deletion-blockers') {
			const manageAccess: any = await requireProject(store, auth.principal, id, 'projects:manage:team');
			if (manageAccess.response) return manageAccess.response;
			return json({ ok: true, payload: await store.evaluateProjectDeletionBlockers(id) });
		}
		if (method === 'DELETE' && !third) {
			const manageAccess: any = await requireProject(store, auth.principal, id, 'projects:manage:team');
			if (manageAccess.response) return manageAccess.response;
			const body = await readJson(context);
			const result = await store.deleteProject(id, body.confirmation);
			return json(result, result.ok ? 200 : 400);
		}
		if (method === 'GET' && third === 'summary') return json({ ok: true, payload: await store.getProjectSummary(id, auth.principal) });
		if (method === 'GET' && third === 'direct') return json({ ok: true, payload: await store.getProjectDirectSummary(id, auth.principal) });
		if (method === 'GET' && third === 'workstreams') return json({ ok: true, payload: await store.getProjectWorkstreamsSummary(id, auth.principal) });
		if (method === 'GET' && third === 'agents') return json({ ok: true, payload: await store.getProjectAgentsSummary(id, auth.principal) });
		if (method === 'GET' && third === 'releases') return json({ ok: true, payload: await store.getProjectReleasesSummary(id, auth.principal) });
		if (method === 'GET' && third === 'share') return json({ ok: true, payload: await store.getProjectShareSummary(id, auth.principal) });
		if (method === 'GET' && third === 'hosting') return json({ ok: true, payload: await store.getProjectHosting(id) });
		if (method === 'POST' && third === 'connection') {
			const manageAccess: any = await requireProject(store, auth.principal, id, 'projects:manage:team');
			if (manageAccess.response) return manageAccess.response;
			const body = await readJson(context);
			const mode = enumValue(body.mode, ['hosted', 'hybrid', 'self_hosted'], body.mode == null ? manageAccess.details.connection?.mode ?? 'self_hosted' : null);
			if (!mode) return error(400, 'Invalid connection mode.');
			const executionOwner = enumValue(body.executionOwner, ['project_api', 'project_runner'], body.executionOwner == null ? manageAccess.details.connection?.executionOwner ?? 'project_runner' : null);
			if (!executionOwner) return error(400, 'Invalid execution owner.');
			const result = await store.upsertProjectConnection(id, {
				mode,
				projectApiBaseUrl: optionalTrimmedString(body.projectApiBaseUrl),
				executionOwner,
				metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				rotateRunnerToken: body.rotateRunnerToken === true,
			});
			return json({ ok: true, payload: { connection: result.connection, runnerToken: result.runnerToken } });
		}
		if (method === 'PUT' && third === 'hosting') {
			const manageAccess: any = await requireProject(store, auth.principal, id, 'projects:manage:team');
			if (manageAccess.response) return manageAccess.response;
			const body = await readJson(context);
			const kind = enumValue(body.kind, ['hosted_project', 'self_hosted_project']);
			if (!kind) return error(400, 'Invalid hosting kind.');
			const registration = enumValue(body.registration, ['none', 'optional', 'required'], 'none');
			const executionOwner = enumValue(body.executionOwner, ['project_api', 'project_runner'], null);
			if (body.executionOwner != null && !executionOwner) return error(400, 'Invalid execution owner.');
			const payload = await store.upsertProjectHosting(id, {
				kind,
				registration,
				marketBaseUrl: optionalTrimmedString(body.marketBaseUrl),
				sourceRepoOwner: optionalTrimmedString(body.sourceRepoOwner),
				sourceRepoName: optionalTrimmedString(body.sourceRepoName),
				sourceRepoUrl: optionalTrimmedString(body.sourceRepoUrl),
				sourceRepoWorkflowPath: optionalTrimmedString(body.sourceRepoWorkflowPath),
				projectApiBaseUrl: optionalTrimmedString(body.projectApiBaseUrl),
				executionOwner,
				metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
			});
			return json({ ok: true, payload });
		}
		if (method === 'GET' && third === 'environments') return json({ ok: true, payload: await store.listProjectEnvironments(id) });
		if (method === 'GET' && third === 'resources') return json({ ok: true, payload: await store.listProjectInfrastructureResources(id) });
		if (method === 'GET' && third === 'deployments') return json({ ok: true, payload: await store.listProjectDeployments(id) });
		if (method === 'GET' && third === 'agent-pools') return json({ ok: true, payload: await store.listAgentPools(id) });
		if (method === 'GET' && third === 'workspace-links') return json({ ok: true, payload: await store.listHubWorkspaceLinks(id) });
		if (method === 'POST' && third === 'workspace-links') {
			const link = await store.upsertHubWorkspaceLink(id, { ...(await readJson(context)), teamId: access.details.project.teamId });
			const job = await createQueuedProjectJob(context, store, auth, id, 'workspace', 'attach_parent', { workspaceLinkId: link.id, workspace: link });
			return json({ ok: true, payload: { link, job } }, 202);
		}
		if (method === 'GET' && third === 'update-plans') return json({ ok: true, payload: await store.listProjectUpdatePlans(id) });
		if (method === 'POST' && third === 'update-plans') {
			const body = await readJson(context);
			const plan = await store.createProjectUpdatePlan(id, { ...body, teamId: access.details.project.teamId, createdBy: auth.principal.id });
			const job = await createQueuedProjectJob(context, store, auth, id, 'hub', 'execute_update', { updatePlanId: plan.id, plan: plan.plan, decisionId: plan.decisionId });
			return json({ ok: true, payload: { plan, job } }, 202);
		}
		if (method === 'GET' && third === 'work-policy') {
			const environment = context.url.searchParams.get('environment') ?? 'prod';
			return json({ ok: true, payload: await store.getProjectWorkPolicy(id, environment) });
		}
		if (method === 'GET' && third === 'priority-overrides') return json({ ok: true, payload: await store.listProjectPriorityOverrides(id) });
		if (method === 'GET' && third === 'priority-snapshots') return json({ ok: true, payload: await store.listProjectPrioritySnapshots(id) });
		if (method === 'GET' && third === 'workdays') return json({ ok: true, payload: await store.listProjectWorkdaySummaries(id) });
		if (method === 'PUT' && third === 'hosting') return json({ ok: true, payload: await store.upsertProjectHosting(id, await readJson(context)) });
		if (['POST', 'PUT'].includes(method) && third === 'connection') {
			const body = await readJson(context);
			const result = await store.upsertProjectConnection(id, {
				mode: typeof body.mode === 'string' ? body.mode : access.details.connection?.mode ?? 'self_hosted',
				projectApiBaseUrl: typeof body.projectApiBaseUrl === 'string' ? body.projectApiBaseUrl : null,
				executionOwner: typeof body.executionOwner === 'string' ? body.executionOwner : 'project_runner',
				metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				rotateRunnerToken: body.rotateRunnerToken === true,
			});
			return json({ ok: true, payload: { connection: result.connection, runnerToken: result.runnerToken } });
		}
		if (method === 'PUT' && third === 'environments' && fourth) return json({ ok: true, payload: await store.upsertProjectEnvironment(id, { environment: fourth, ...(await readJson(context)) }) });
		if (method === 'POST' && third === 'resources') return json({ ok: true, payload: await store.upsertProjectInfrastructureResource(id, await readJson(context)) });
		if (method === 'POST' && third === 'deployments') return json({ ok: true, payload: await store.createProjectDeployment(id, await readJson(context)) });
		if (method === 'POST' && third === 'agent-pools') return json({ ok: true, payload: await store.upsertAgentPool(id, await readJson(context)) });
		if (method === 'GET' && third === 'agent-pools' && fourth && fifth === 'registrations') return json({ ok: true, payload: await store.listAgentPoolRegistrations(fourth) });
		if (method === 'GET' && third === 'agent-pools' && fourth && fifth === 'scale-decisions') return json({ ok: true, payload: await store.listAgentPoolScaleDecisions(fourth) });
		if (method === 'PUT' && third === 'work-policy') return json({ ok: true, payload: await store.upsertProjectWorkPolicy(id, await readJson(context)) });
		if (method === 'POST' && third === 'priority-overrides') return json({ ok: true, payload: await store.upsertProjectPriorityOverride(id, await readJson(context)) });
		if (method === 'GET' && third === 'workdays' && fourth && fifth === 'task-credits') return json({ ok: true, payload: await store.listProjectTaskCredits(id, fourth) });
		if (method === 'POST') {
			const body = await readJson(context);
			const operation = [third, fourth, fifth].filter(Boolean).join('/') || 'project_action';
			const job = await createQueuedProjectJob(context, store, auth, id, 'workflow', operation, body);
			return json({ ok: true, payload: job }, 202);
		}
	}

	if (root === 'jobs' && id) {
		if (method === 'GET' && !third) return json({ ok: true, payload: await store.findJobById(id) });
		if (method === 'GET' && third === 'events') return json({ ok: true, payload: await store.listJobEvents(id) });
		if (method === 'POST' && ['cancel', 'approve', 'reject'].includes(third ?? '')) {
			if (third === 'cancel') return json({ ok: true, payload: await store.cancelJob(id) });
			await store.appendJobEvent(id, third, await readJson(context));
			return json({ ok: true, payload: await store.findJobById(id) });
		}
	}

	if (root === 'catalog') {
		if (method === 'GET' && !id) return json({ ok: true, payload: await store.listCatalogItems(auth.principal) });
		if (method === 'GET' && id && !third) return json({ ok: true, payload: await store.getCatalogItem(id) });
		if (method === 'GET' && id && third === 'artifacts') return json({ ok: true, payload: await store.listCatalogArtifactVersions(id) });
		if (method === 'POST' && id && third === 'artifacts') {
			const item = await store.getCatalogItem(id);
			if (!item) return error(404, `Unknown catalog item "${id}".`);
			return json({ ok: true, payload: await store.upsertCatalogArtifactVersion(item.teamId, id, await readJson(context)) });
		}
	}

	if (method === 'GET' && root === 'templates') return json({ ok: true, payload: await store.listCatalogItems(auth.principal, { kind: 'template' }) });
	if (method === 'GET' && root === 'knowledge-packs') return json({ ok: true, payload: await store.listKnowledgePacks(auth.principal) });
	if (method === 'POST' && root === 'knowledge-packs' && id) {
		return json({ ok: true, payload: await store.createKnowledgePack(id, await readJson(context)) });
	}

	return error(404, 'Unknown web API route.', { path: `/${parts.join('/')}` });
};
