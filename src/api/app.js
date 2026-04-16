import {
	AgentSdk,
	RemoteTreeseedClient,
	RemoteTreeseedOperationsClient,
	RemoteTreeseedSdkClient,
	signEditorialPreviewToken,
	TreeseedOperationsSdk,
	executeSdkOperation,
	findDispatchCapability,
} from '@treeseed/sdk';
import {
	createTreeseedApiApp,
	D1AuthProvider,
	loadTemplateCatalog,
	resolveApiConfig,
	resolveApiD1Database,
} from '@treeseed/core/api';
import { MarketControlPlaneStore } from './store.js';

function jsonError(c, status, error, details = {}) {
	return c.json({
		ok: false,
		error,
		...details,
	}, { status });
}

function bearerTokenFromRequest(request) {
	const header = request.headers.get('authorization');
	if (!header) return null;
	const match = header.match(/^Bearer\s+(.+)$/i);
	return match?.[1] ?? null;
}

function normalizeBaseUrl(baseUrl) {
	return String(baseUrl ?? '').trim().replace(/\/+$/u, '');
}

function principalHasPermission(principal, permission) {
	return Boolean(
		principal
		&& (
			principal.permissions?.includes?.('*:*:*')
			|| principal.permissions?.includes?.(permission)
		),
	);
}

function isTeamApiPrincipal(principal) {
	return Boolean(principal?.roles?.includes?.('team_api_key'));
}

function decorateJob(baseUrl, job) {
	if (!job) return null;
	return {
		...job,
		pollUrl: `${baseUrl}/v1/jobs/${job.id}`,
		streamUrl: `${baseUrl}/v1/jobs/${job.id}/events`,
	};
}

function mergeCapability(baseCapability, override) {
	if (!override) {
		return baseCapability;
	}
	return {
		...baseCapability,
		executionClass: override.executionClass,
		allowedTargets: [...override.allowedTargets],
		defaultDispatchMode: override.defaultDispatchMode,
	};
}

async function ensurePrincipal(c) {
	const principal = c.get('principal');
	if (!principal) {
		return {
			response: jsonError(c, 401, 'Authentication required.'),
		};
	}
	return { principal };
}

async function requireTeamAccess(c, store, teamId, permission = null) {
	const auth = await ensurePrincipal(c);
	if (auth.response) {
		return auth;
	}
	const { principal } = auth;
	if (!(await store.principalCanAccessTeam(principal, teamId))) {
		return {
			response: jsonError(c, 403, 'Permission denied.', { teamId }),
		};
	}
	if (permission && isTeamApiPrincipal(principal) && !principalHasPermission(principal, permission)) {
		return {
			response: jsonError(c, 403, 'Permission denied.', { permission }),
		};
	}
	return { principal };
}

async function requireProjectAccess(c, store, projectId, permission = null) {
	const auth = await ensurePrincipal(c);
	if (auth.response) {
		return auth;
	}
	const details = await store.getProjectDetails(projectId);
	if (!details) {
		return {
			response: jsonError(c, 404, `Unknown project "${projectId}".`),
		};
	}
	const access = await requireTeamAccess(c, store, details.project.teamId, permission);
	if (access.response) {
		return access;
	}
	return {
		principal: access.principal,
		details,
	};
}

async function requireProjectRunner(c, store, projectId) {
	const token = bearerTokenFromRequest(c.req.raw);
	if (!token) {
		return {
			response: jsonError(c, 401, 'Authentication required.'),
		};
	}
	const runner = await store.authenticateRunner(projectId, token);
	if (!runner) {
		return {
			response: jsonError(c, 401, 'Invalid project runner token.'),
		};
	}
	return { runner };
}

async function requireCatalogItemAccess(c, store, itemId, permission = null) {
	const auth = await ensurePrincipal(c);
	if (auth.response) {
		return auth;
	}
	const item = await store.getCatalogItem(itemId);
	if (!item) {
		return {
			response: jsonError(c, 404, `Unknown catalog item "${itemId}".`),
		};
	}
	const access = await requireTeamAccess(c, store, item.teamId, permission);
	if (access.response) {
		return access;
	}
	return {
		principal: access.principal,
		item,
	};
}

async function executeInline(runtime, request) {
	if (request.namespace === 'workflow') {
		const operations = new TreeseedOperationsSdk();
		return operations.execute({
			operationName: request.operation,
			input: request.input ?? {},
		}, {
			cwd: runtime.resolved.config.repoRoot,
			env: process.env,
			transport: 'api',
		});
	}
	return executeSdkOperation(runtime.sharedSdk, request.operation, request.input ?? {});
}

function projectApiConnection(projectDetails) {
	const baseUrl = normalizeBaseUrl(projectDetails.connection?.projectApiBaseUrl);
	return baseUrl ? baseUrl : null;
}

function createProjectInternalClient(options, projectDetails, fallbackInternalPrefix) {
	const projectApiBaseUrl = projectApiConnection(projectDetails);
	if (!projectApiBaseUrl) {
		throw new Error(`Project "${projectDetails.project.id}" is missing a project API base URL.`);
	}

	const metadata = projectDetails.connection?.metadata ?? {};
	const internalPrefix = normalizeBaseUrl(
		typeof metadata.internalPrefix === 'string'
			? metadata.internalPrefix
			: fallbackInternalPrefix,
	);
	const projectApiKey =
		typeof metadata.projectApiKey === 'string' && metadata.projectApiKey.trim()
			? metadata.projectApiKey.trim()
			: typeof metadata.bearerToken === 'string' && metadata.bearerToken.trim()
				? metadata.bearerToken.trim()
				: null;
	if (!projectApiKey) {
		throw new Error(`Project "${projectDetails.project.id}" is missing a project API key for remote dispatch.`);
	}

	return new RemoteTreeseedClient({
		hosts: [{
			id: projectDetails.project.id,
			baseUrl: `${projectApiBaseUrl}${internalPrefix}`,
		}],
		activeHostId: projectDetails.project.id,
		auth: {
			accessToken: projectApiKey,
		},
	}, {
		fetchImpl: options.fetchImpl,
	});
}

async function executeProjectApi(options, projectDetails, request, fallbackInternalPrefix) {
	const client = createProjectInternalClient(options, projectDetails, fallbackInternalPrefix);
	if (request.namespace === 'workflow') {
		return new RemoteTreeseedOperationsClient(client).execute(request.operation, {
			input: request.input ?? {},
		});
	}
	return new RemoteTreeseedSdkClient(client).execute(request.operation, {
		input: request.input ?? {},
	});
}

function selectDispatchTarget(runtime, projectDetails, capability, preferredMode) {
	const currentProject = projectDetails.project.id === runtime.resolved.config.projectId;
	const mode = projectDetails.connection?.mode ?? (currentProject ? 'hosted' : 'self_hosted');
	const projectApiBaseUrl = projectApiConnection(projectDetails);

	if (capability.executionClass === 'local_only') {
		return 'local';
	}

	if (preferredMode === 'prefer_local' && currentProject && capability.allowedTargets.includes('local')) {
		return 'local';
	}

	if (capability.defaultTarget === 'market_catalog' && capability.allowedTargets.includes('market_catalog')) {
		return 'market_catalog';
	}

	if (
		capability.executionClass === 'remote_inline'
		&& capability.allowedTargets.includes('project_api')
		&& (projectApiBaseUrl || (currentProject && mode === 'hosted'))
	) {
		return 'project_api';
	}

	if ((mode === 'self_hosted' || mode === 'hybrid' || capability.executionClass === 'remote_job') && capability.allowedTargets.includes('project_runner')) {
		return 'project_runner';
	}

	if (currentProject && capability.allowedTargets.includes('local')) {
		return 'local';
	}

	if (capability.allowedTargets.includes('market_catalog')) {
		return 'market_catalog';
	}

	return null;
}

function defaultConfig(overrides = {}) {
	const resolved = resolveApiConfig();
	return {
		...resolved,
		projectId: overrides.projectId ?? resolved.projectId ?? 'treeseed-market',
		repoRoot: overrides.repoRoot ?? resolved.repoRoot ?? process.cwd(),
		...overrides,
	};
}

export function createMarketApiApp(options = {}) {
	const config = defaultConfig(options.config ?? {});
	const db = options.db ?? resolveApiD1Database(config);
	const store = options.store ?? new MarketControlPlaneStore(config, db);
	const configuredAuthProviderId = config.providers?.auth ?? 'd1';
	const authProviderId = configuredAuthProviderId === 'd1' ? 'market-d1' : configuredAuthProviderId;
	const sharedSdk = options.sdk ?? AgentSdk.createLocal({
		repoRoot: config.repoRoot,
		databaseName: config.d1DatabaseName ?? `${config.projectId}-market`,
		persistTo: config.d1LocalPersistTo,
	});
	const runtimeProviders = configuredAuthProviderId === 'd1'
		? {
			...(options.runtimeProviders ?? {}),
			auth: {
				...(options.runtimeProviders?.auth ?? {}),
				[authProviderId]: ({ config: runtimeConfig }) => new D1AuthProvider(runtimeConfig, { db }),
			},
		}
		: {
			...(options.runtimeProviders ?? {}),
		};

	return createTreeseedApiApp({
		...options,
		config: {
			...config,
			providers: {
				...(config.providers ?? {}),
				auth: authProviderId,
			},
		},
		runtimeProviders,
		sdk: sharedSdk,
		internalPrefix: options.internalPrefix ?? '/internal/core',
		surfaces: {
			templates: false,
			...(options.surfaces ?? {}),
		},
		extendApp(app, runtime) {
			app.get('/healthz/deep', async (c) => {
				try {
					await store.ensureInitialized();
					const probe = await store.first('SELECT 1 AS ok');
					return c.json({
						ok: true,
						status: 'ok',
						checks: {
							d1: probe?.ok === 1 || probe?.ok === '1',
						},
					});
				} catch (error) {
					return jsonError(c, 500, error instanceof Error ? error.message : String(error));
				}
			});

			app.use('/v1/*', async (c, next) => {
				if (!c.get('principal')) {
					const token = bearerTokenFromRequest(c.req.raw);
					if (token) {
						const match = await store.authenticateTeamApiKey(token);
						if (match) {
							c.set('principal', match.principal);
							c.set('credential', {
								type: 'team_api_key',
								id: match.keyId,
								label: 'Team API Key',
							});
							c.set('actorType', 'service');
							c.set('permissionGrants', match.principal.permissions);
						}
					}
				}
				await next();
			});

			app.get('/v1/me', async (c) => {
				const auth = await ensurePrincipal(c);
				if (auth.response) return auth.response;
				return c.json({
					ok: true,
					payload: {
						principal: auth.principal,
						teams: await store.listTeamsForPrincipal(auth.principal),
					},
				});
			});

			app.get('/v1/teams', async (c) => {
				const auth = await ensurePrincipal(c);
				if (auth.response) return auth.response;
				return c.json({
					ok: true,
					payload: await store.listTeamsForPrincipal(auth.principal),
				});
			});

			app.post('/v1/teams', async (c) => {
				const auth = await ensurePrincipal(c);
				if (auth.response) return auth.response;
				if (isTeamApiPrincipal(auth.principal) || c.get('actorType') === 'project') {
					return jsonError(c, 403, 'Permission denied.');
				}
				const body = await c.req.json().catch(() => ({}));
				if (!body.slug || !body.name) {
					return jsonError(c, 400, 'slug and name are required.');
				}
				const team = await store.createTeam({
					slug: String(body.slug),
					name: String(body.name),
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					ownerUserId: typeof auth.principal.id === 'string' ? auth.principal.id : null,
				});
				return c.json({ ok: true, payload: team });
			});

			app.post('/v1/teams/:teamId/api-keys', async (c) => {
				const access = await requireTeamAccess(c, store, c.req.param('teamId'), 'teams:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.name) {
					return jsonError(c, 400, 'name is required.');
				}
				return c.json({
					ok: true,
					payload: await store.createTeamApiKey(c.req.param('teamId'), {
						name: String(body.name),
						permissions: Array.isArray(body.permissions) ? body.permissions.map(String) : [],
						expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
					}),
				});
			});

			app.get('/v1/projects', async (c) => {
				const auth = await ensurePrincipal(c);
				if (auth.response) return auth.response;
				return c.json({
					ok: true,
					payload: await store.listProjectsForPrincipal(auth.principal),
				});
			});

			app.post('/v1/teams/:teamId/projects', async (c) => {
				const access = await requireTeamAccess(c, store, c.req.param('teamId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.slug || !body.name) {
					return jsonError(c, 400, 'slug and name are required.');
				}
				const details = await store.createProject(c.req.param('teamId'), {
					id: typeof body.id === 'string' ? body.id : undefined,
					slug: String(body.slug),
					name: String(body.name),
					description: typeof body.description === 'string' ? body.description : null,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					entitlementTier: typeof body.entitlementTier === 'string' ? body.entitlementTier : 'free',
				});
				return c.json({ ok: true, payload: details });
			});

			app.get('/v1/projects/:projectId', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				return c.json({ ok: true, payload: access.details });
			});

			app.post('/v1/projects/:projectId/connection', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				const result = await store.upsertProjectConnection(c.req.param('projectId'), {
					mode: typeof body.mode === 'string' ? body.mode : access.details.connection?.mode ?? 'self_hosted',
					projectApiBaseUrl: typeof body.projectApiBaseUrl === 'string' ? body.projectApiBaseUrl : null,
					executionOwner: typeof body.executionOwner === 'string' ? body.executionOwner : 'project_runner',
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					rotateRunnerToken: body.rotateRunnerToken === true,
				});
				return c.json({
					ok: true,
					payload: {
						connection: result.connection,
						runnerToken: result.runnerToken,
					},
				});
			});

			app.get('/v1/projects/:projectId/hosting', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: access.details.hosting,
				});
			});

			app.put('/v1/projects/:projectId/hosting', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.kind) {
					return jsonError(c, 400, 'kind is required.');
				}
				const payload = await store.upsertProjectHosting(c.req.param('projectId'), {
					kind: String(body.kind),
					registration: typeof body.registration === 'string' ? body.registration : 'none',
					marketBaseUrl: typeof body.marketBaseUrl === 'string' ? body.marketBaseUrl : null,
					sourceRepoOwner: typeof body.sourceRepoOwner === 'string' ? body.sourceRepoOwner : null,
					sourceRepoName: typeof body.sourceRepoName === 'string' ? body.sourceRepoName : null,
					sourceRepoUrl: typeof body.sourceRepoUrl === 'string' ? body.sourceRepoUrl : null,
					sourceRepoWorkflowPath: typeof body.sourceRepoWorkflowPath === 'string' ? body.sourceRepoWorkflowPath : null,
					projectApiBaseUrl: typeof body.projectApiBaseUrl === 'string' ? body.projectApiBaseUrl : null,
					executionOwner: typeof body.executionOwner === 'string' ? body.executionOwner : null,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				});
				return c.json({ ok: true, payload });
			});

			app.get('/v1/projects/:projectId/environments', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: await store.listProjectEnvironments(c.req.param('projectId')),
				});
			});

			app.put('/v1/projects/:projectId/environments/:environment', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				return c.json({
					ok: true,
					payload: await store.upsertProjectEnvironment(c.req.param('projectId'), {
						environment: c.req.param('environment'),
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
			});

			app.get('/v1/projects/:projectId/resources', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				const environment = typeof c.req.query('environment') === 'string' ? c.req.query('environment') : null;
				return c.json({
					ok: true,
					payload: await store.listProjectInfrastructureResources(c.req.param('projectId'), environment),
				});
			});

			app.post('/v1/projects/:projectId/resources', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.environment || !body.provider || !body.resourceKind || !body.logicalName) {
					return jsonError(c, 400, 'environment, provider, resourceKind, and logicalName are required.');
				}
				return c.json({
					ok: true,
					payload: await store.upsertProjectInfrastructureResource(c.req.param('projectId'), {
						id: typeof body.id === 'string' ? body.id : undefined,
						environment: String(body.environment),
						provider: String(body.provider),
						resourceKind: String(body.resourceKind),
						logicalName: String(body.logicalName),
						locator: typeof body.locator === 'string' ? body.locator : null,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.get('/v1/projects/:projectId/deployments', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				const environment = typeof c.req.query('environment') === 'string' ? c.req.query('environment') : null;
				return c.json({
					ok: true,
					payload: await store.listProjectDeployments(c.req.param('projectId'), environment),
				});
			});

			app.post('/v1/projects/:projectId/deployments', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.environment || !body.deploymentKind) {
					return jsonError(c, 400, 'environment and deploymentKind are required.');
				}
				return c.json({
					ok: true,
					payload: await store.createProjectDeployment(c.req.param('projectId'), {
						id: typeof body.id === 'string' ? body.id : undefined,
						environment: String(body.environment),
						deploymentKind: String(body.deploymentKind),
						status: typeof body.status === 'string' ? body.status : 'pending',
						sourceRef: typeof body.sourceRef === 'string' ? body.sourceRef : null,
						releaseTag: typeof body.releaseTag === 'string' ? body.releaseTag : null,
						commitSha: typeof body.commitSha === 'string' ? body.commitSha : null,
						triggeredByType: typeof body.triggeredByType === 'string' ? body.triggeredByType : null,
						triggeredById: typeof body.triggeredById === 'string' ? body.triggeredById : access.principal.id,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
						startedAt: typeof body.startedAt === 'string' ? body.startedAt : null,
						finishedAt: typeof body.finishedAt === 'string' ? body.finishedAt : null,
					}),
				});
			});

			app.get('/v1/projects/:projectId/agent-pools', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				const environment = typeof c.req.query('environment') === 'string' ? c.req.query('environment') : null;
				return c.json({
					ok: true,
					payload: await store.listAgentPools(c.req.param('projectId'), environment),
				});
			});

			app.post('/v1/projects/:projectId/agent-pools', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.teamId || !body.environment || !body.name) {
					return jsonError(c, 400, 'teamId, environment, and name are required.');
				}
				return c.json({
					ok: true,
					payload: await store.upsertAgentPool(c.req.param('projectId'), {
						id: typeof body.id === 'string' ? body.id : undefined,
						teamId: String(body.teamId),
						environment: String(body.environment),
						name: String(body.name),
						registrationIdentity: typeof body.registrationIdentity === 'string' ? body.registrationIdentity : null,
						serviceBaseUrl: typeof body.serviceBaseUrl === 'string' ? body.serviceBaseUrl : null,
						status: typeof body.status === 'string' ? body.status : 'active',
						autoscale: typeof body.autoscale === 'object' && body.autoscale
							? {
								minWorkers: Number(body.autoscale.minWorkers ?? 0),
								maxWorkers: Number(body.autoscale.maxWorkers ?? 1),
								targetQueueDepth: Number(body.autoscale.targetQueueDepth ?? 1),
								cooldownSeconds: Number(body.autoscale.cooldownSeconds ?? 60),
							}
							: undefined,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.get('/v1/projects/:projectId/agent-pools/:poolId/registrations', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: await store.listAgentPoolRegistrations(c.req.param('poolId')),
				});
			});

			app.get('/v1/projects/:projectId/agent-pools/:poolId/scale-decisions', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: await store.listAgentPoolScaleDecisions(c.req.param('poolId')),
				});
			});

			app.get('/v1/projects/:projectId/work-policy', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				const environment = typeof c.req.query('environment') === 'string' ? c.req.query('environment') : 'staging';
				return c.json({
					ok: true,
					payload: await store.getProjectWorkPolicy(c.req.param('projectId'), environment),
				});
			});

			app.put('/v1/projects/:projectId/work-policy', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.environment || typeof body.schedule !== 'object' || !body.schedule) {
					return jsonError(c, 400, 'environment and schedule are required.');
				}
				return c.json({
					ok: true,
					payload: await store.upsertProjectWorkPolicy(c.req.param('projectId'), {
						environment: String(body.environment),
						schedule: body.schedule,
						dailyTaskCreditBudget: Number.isFinite(Number(body.dailyTaskCreditBudget)) ? Number(body.dailyTaskCreditBudget) : 0,
						maxQueuedTasks: Number.isFinite(Number(body.maxQueuedTasks)) ? Number(body.maxQueuedTasks) : 0,
						maxQueuedCredits: Number.isFinite(Number(body.maxQueuedCredits)) ? Number(body.maxQueuedCredits) : 0,
						autoscale: typeof body.autoscale === 'object' && body.autoscale ? body.autoscale : {},
						creditWeights: Array.isArray(body.creditWeights) ? body.creditWeights : [],
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.get('/v1/projects/:projectId/priority-overrides', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: await store.listProjectPriorityOverrides(c.req.param('projectId')),
				});
			});

			app.post('/v1/projects/:projectId/priority-overrides', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.model || !body.subjectId) {
					return jsonError(c, 400, 'model and subjectId are required.');
				}
				return c.json({
					ok: true,
					payload: await store.upsertProjectPriorityOverride(c.req.param('projectId'), {
						id: typeof body.id === 'string' ? body.id : undefined,
						model: String(body.model),
						subjectId: String(body.subjectId),
						priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0,
						estimatedCredits: Number.isFinite(Number(body.estimatedCredits)) ? Number(body.estimatedCredits) : null,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.get('/v1/projects/:projectId/priority-snapshots', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				const workDayId = typeof c.req.query('workDayId') === 'string' ? c.req.query('workDayId') : null;
				return c.json({
					ok: true,
					payload: await store.listProjectPrioritySnapshots(c.req.param('projectId'), workDayId),
				});
			});

			app.post('/v1/projects/:projectId/agent-pools/:poolId/registrations', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const body = await c.req.json().catch(() => ({}));
				return c.json({
					ok: true,
					payload: await store.recordAgentPoolRegistration(c.req.param('projectId'), {
						poolId: c.req.param('poolId'),
						id: typeof body.id === 'string' ? body.id : undefined,
						runnerId: typeof body.runnerId === 'string' ? body.runnerId : null,
						managerId: typeof body.managerId === 'string' ? body.managerId : null,
						serviceName: typeof body.serviceName === 'string' ? body.serviceName : null,
						heartbeatAt: typeof body.heartbeatAt === 'string' ? body.heartbeatAt : null,
						desiredWorkers: Number.isFinite(Number(body.desiredWorkers)) ? Number(body.desiredWorkers) : null,
						observedQueueDepth: Number.isFinite(Number(body.observedQueueDepth)) ? Number(body.observedQueueDepth) : null,
						observedActiveLeases: Number.isFinite(Number(body.observedActiveLeases)) ? Number(body.observedActiveLeases) : null,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.post('/v1/projects/:projectId/capabilities', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				const grants = Array.isArray(body.grants) ? body.grants : [];
				return c.json({
					ok: true,
					payload: await store.replaceProjectCapabilities(c.req.param('projectId'), grants.map((grant) => ({
						namespace: String(grant.namespace ?? 'sdk'),
						operation: String(grant.operation ?? ''),
						executionClass: String(grant.executionClass ?? 'remote_inline'),
						allowedTargets: Array.isArray(grant.allowedTargets) ? grant.allowedTargets.map(String) : [],
						defaultDispatchMode: String(grant.defaultDispatchMode ?? 'auto'),
						enabled: grant.enabled !== false,
					}))),
				});
			});

			app.post('/v1/projects/:projectId/dispatch', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'dispatch:execute:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				const namespace = typeof body.namespace === 'string' ? body.namespace : 'sdk';
				const operation = typeof body.operation === 'string' ? body.operation : '';
				const baseCapability = findDispatchCapability(namespace, operation);
				if (!baseCapability) {
					return jsonError(c, 400, `Unknown dispatch operation "${namespace}:${operation}".`);
				}
				const override = await store.getEffectiveCapability(access.details.project.id, namespace, operation);
				if (override && override.enabled === false) {
					return jsonError(c, 403, 'Dispatch capability disabled for project.', {
						namespace,
						operation,
					});
				}
				const capability = mergeCapability(baseCapability, override);
				const preferredMode = typeof body.preferredMode === 'string'
					? body.preferredMode
					: capability.defaultDispatchMode;
				const selectedTarget = selectDispatchTarget(runtime, access.details, capability, preferredMode);
				if (!selectedTarget) {
					return jsonError(c, 400, 'Unable to resolve a dispatch target for the requested operation.', {
						namespace,
						operation,
					});
				}

				if (selectedTarget === 'project_runner' && !access.details.connection) {
					return jsonError(c, 409, 'Project runner connection is not configured.', {
						projectId: access.details.project.id,
					});
				}

				if (selectedTarget === 'project_api' && !projectApiConnection(access.details) && access.details.project.id !== runtime.resolved.config.projectId) {
					return jsonError(c, 409, 'Project API dispatch requires a project API connection.', {
						projectId: access.details.project.id,
					});
				}

				if (selectedTarget === 'local' || selectedTarget === 'project_api' || selectedTarget === 'market_catalog') {
					const request = {
						namespace,
						operation,
						input: typeof body.input === 'object' && body.input ? body.input : {},
					};
					const payload = selectedTarget === 'project_api' && access.details.project.id !== runtime.resolved.config.projectId
						? await executeProjectApi(options, access.details, request, runtime.internalPrefix)
						: await executeInline(runtime, request);
					return c.json({
						ok: true,
						mode: 'inline',
						namespace,
						operation,
						target: selectedTarget,
						capability,
						payload,
					});
				}

				const job = await store.createJob({
					projectId: access.details.project.id,
					namespace,
					operation,
					input: typeof body.input === 'object' && body.input ? body.input : {},
					preferredMode,
					selectedTarget,
					idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : null,
					requestedByType: isTeamApiPrincipal(access.principal) ? 'team_api_key' : c.get('actorType') === 'service' ? 'service' : 'user',
					requestedById: access.principal.id,
					capability,
				});
				return c.json({
					ok: true,
					mode: 'job',
					namespace,
					operation,
					target: selectedTarget,
					capability,
					job: decorateJob(runtime.resolved.config.baseUrl, job),
				});
			});

			app.get('/v1/jobs/:jobId', async (c) => {
				const auth = await ensurePrincipal(c);
				if (auth.response) return auth.response;
				const job = await store.findJobById(c.req.param('jobId'));
				if (!job) {
					return jsonError(c, 404, `Unknown job "${c.req.param('jobId')}".`);
				}
				const access = await requireProjectAccess(c, store, job.projectId, 'dispatch:execute:team');
				if (access.response) return access.response;
				return c.json({ ok: true, payload: decorateJob(runtime.resolved.config.baseUrl, job) });
			});

			app.post('/v1/jobs/:jobId/cancel', async (c) => {
				const auth = await ensurePrincipal(c);
				if (auth.response) return auth.response;
				const job = await store.findJobById(c.req.param('jobId'));
				if (!job) {
					return jsonError(c, 404, `Unknown job "${c.req.param('jobId')}".`);
				}
				const access = await requireProjectAccess(c, store, job.projectId, 'dispatch:execute:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: decorateJob(runtime.resolved.config.baseUrl, await store.cancelJob(job.id)),
				});
			});

			app.get('/v1/jobs/:jobId/events', async (c) => {
				const auth = await ensurePrincipal(c);
				if (auth.response) return auth.response;
				const job = await store.findJobById(c.req.param('jobId'));
				if (!job) {
					return jsonError(c, 404, `Unknown job "${c.req.param('jobId')}".`);
				}
				const access = await requireProjectAccess(c, store, job.projectId, 'dispatch:execute:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: await store.listJobEvents(job.id),
				});
			});

			app.post('/v1/projects/:projectId/runner/jobs/pull', async (c) => {
				const token = bearerTokenFromRequest(c.req.raw);
				if (!token) {
					return jsonError(c, 401, 'Authentication required.');
				}
				const runner = await store.authenticateRunner(c.req.param('projectId'), token);
				if (!runner) {
					return jsonError(c, 401, 'Invalid project runner token.');
				}
				const body = await c.req.json().catch(() => ({}));
				const jobs = await store.pullJobsForRunner(c.req.param('projectId'), {
					limit: body.limit,
					runnerId: typeof body.runnerId === 'string' ? body.runnerId : null,
				});
				return c.json({
					ok: true,
					payload: jobs.map((job) => decorateJob(runtime.resolved.config.baseUrl, job)),
				});
			});

			app.put('/v1/projects/:projectId/runner/environments/:environment', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const body = await c.req.json().catch(() => ({}));
				return c.json({
					ok: true,
					payload: await store.upsertProjectEnvironment(c.req.param('projectId'), {
						environment: c.req.param('environment'),
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
			});

			app.post('/v1/projects/:projectId/runner/resources', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.environment || !body.provider || !body.resourceKind || !body.logicalName) {
					return jsonError(c, 400, 'environment, provider, resourceKind, and logicalName are required.');
				}
				return c.json({
					ok: true,
					payload: await store.upsertProjectInfrastructureResource(c.req.param('projectId'), {
						environment: String(body.environment),
						provider: String(body.provider),
						resourceKind: String(body.resourceKind),
						logicalName: String(body.logicalName),
						locator: typeof body.locator === 'string' ? body.locator : null,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.post('/v1/projects/:projectId/runner/deployments', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.environment || !body.deploymentKind) {
					return jsonError(c, 400, 'environment and deploymentKind are required.');
				}
				return c.json({
					ok: true,
					payload: await store.createProjectDeployment(c.req.param('projectId'), {
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
			});

			app.get('/v1/projects/:projectId/runner/deployments', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const environment = typeof c.req.query('environment') === 'string' ? c.req.query('environment') : null;
				return c.json({
					ok: true,
					payload: await store.listProjectDeployments(c.req.param('projectId'), environment),
				});
			});

			app.get('/v1/projects/:projectId/runner/health', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const environment = typeof c.req.query('environment') === 'string' ? c.req.query('environment') : 'staging';
				const [resources, deployments, pools, workdays] = await Promise.all([
					store.listProjectInfrastructureResources(c.req.param('projectId'), environment),
					store.listProjectDeployments(c.req.param('projectId'), environment),
					store.listAgentPools(c.req.param('projectId'), environment),
					store.listProjectWorkdaySummaries(c.req.param('projectId'), environment),
				]);
				const poolDetails = await Promise.all(pools.map(async (pool) => ({
					pool,
					latestRegistration: (await store.listAgentPoolRegistrations(pool.id))[0] ?? null,
					latestScaleDecision: (await store.listAgentPoolScaleDecisions(pool.id))[0] ?? null,
				})));
				return c.json({
					ok: true,
					payload: {
						environment,
						resources,
						deployments: deployments.slice(0, 10),
						pools: poolDetails,
						workdays: workdays.slice(0, 5),
					},
				});
			});

			app.post('/v1/projects/:projectId/runner/agent-pools/:poolName/register', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const project = await store.getProject(c.req.param('projectId'));
				if (!project) {
					return jsonError(c, 404, `Unknown project "${c.req.param('projectId')}".`);
				}
				const body = await c.req.json().catch(() => ({}));
				const environment = typeof body.environment === 'string' ? body.environment : 'local';
				const pool = await store.upsertAgentPool(c.req.param('projectId'), {
					teamId: typeof body.teamId === 'string' ? body.teamId : project.teamId,
					environment,
					name: c.req.param('poolName'),
					registrationIdentity: typeof body.registrationIdentity === 'string'
						? body.registrationIdentity
						: typeof body.managerId === 'string'
							? body.managerId
							: typeof body.runnerId === 'string'
								? body.runnerId
								: c.req.param('poolName'),
					serviceBaseUrl: typeof body.serviceBaseUrl === 'string' ? body.serviceBaseUrl : null,
					status: typeof body.status === 'string' ? body.status : 'active',
					autoscale: typeof body.autoscale === 'object' && body.autoscale
						? {
							minWorkers: Number(body.autoscale.minWorkers ?? 0),
							maxWorkers: Number(body.autoscale.maxWorkers ?? 1),
							targetQueueDepth: Number(body.autoscale.targetQueueDepth ?? 1),
							cooldownSeconds: Number(body.autoscale.cooldownSeconds ?? 60),
						}
						: undefined,
					metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
				});
				const registration = await store.recordAgentPoolRegistration(c.req.param('projectId'), {
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
				return c.json({
					ok: true,
					payload: {
						pool,
						registration,
					},
				});
			});

			app.post('/v1/projects/:projectId/runner/agent-pools/:poolName/scale-decisions', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const poolName = c.req.param('poolName');
				const pools = await store.listAgentPools(c.req.param('projectId'));
				const pool = pools.find((entry) => entry.name === poolName);
				if (!pool) {
					return jsonError(c, 404, `Unknown agent pool "${poolName}".`);
				}
				const body = await c.req.json().catch(() => ({}));
				if (!Number.isFinite(Number(body.desiredWorkers))) {
					return jsonError(c, 400, 'desiredWorkers is required.');
				}
				return c.json({
					ok: true,
					payload: await store.recordAgentPoolScaleDecision(c.req.param('projectId'), {
						poolId: pool.id,
						environment: typeof body.environment === 'string' ? body.environment : pool.environment,
						workDayId: typeof body.workDayId === 'string' ? body.workDayId : null,
						desiredWorkers: Number(body.desiredWorkers),
						observedQueueDepth: Number.isFinite(Number(body.observedQueueDepth)) ? Number(body.observedQueueDepth) : 0,
						observedActiveLeases: Number.isFinite(Number(body.observedActiveLeases)) ? Number(body.observedActiveLeases) : 0,
						reason: typeof body.reason === 'string' ? body.reason : 'reconcile',
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.get('/v1/projects/:projectId/workdays', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				const environment = typeof c.req.query('environment') === 'string' ? c.req.query('environment') : null;
				return c.json({
					ok: true,
					payload: await store.listProjectWorkdaySummaries(c.req.param('projectId'), environment),
				});
			});

			app.post('/v1/projects/:projectId/runner/workdays', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.environment || !body.workDayId || !body.summary || typeof body.summary !== 'object') {
					return jsonError(c, 400, 'environment, workDayId, and summary are required.');
				}
				return c.json({
					ok: true,
					payload: await store.createProjectWorkdaySummary(c.req.param('projectId'), {
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
			});

			app.get('/v1/projects/:projectId/workdays/:workDayId/task-credits', async (c) => {
				const access = await requireProjectAccess(c, store, c.req.param('projectId'), 'projects:read:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: await store.listProjectTaskCredits(c.req.param('projectId'), c.req.param('workDayId')),
				});
			});

			app.post('/v1/projects/:projectId/runner/priority-snapshots', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.snapshot || typeof body.snapshot !== 'object') {
					return jsonError(c, 400, 'snapshot is required.');
				}
				return c.json({
					ok: true,
					payload: await store.createProjectPrioritySnapshot(c.req.param('projectId'), {
						id: typeof body.id === 'string' ? body.id : undefined,
						workDayId: typeof body.workDayId === 'string' ? body.workDayId : null,
						snapshot: body.snapshot,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
						generatedAt: typeof body.generatedAt === 'string' ? body.generatedAt : null,
					}),
				});
			});

			app.post('/v1/projects/:projectId/runner/task-credits', async (c) => {
				const runnerAccess = await requireProjectRunner(c, store, c.req.param('projectId'));
				if (runnerAccess.response) return runnerAccess.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.workDayId || !body.phase || !Number.isFinite(Number(body.credits))) {
					return jsonError(c, 400, 'workDayId, phase, and credits are required.');
				}
				return c.json({
					ok: true,
					payload: await store.recordProjectTaskCredits(c.req.param('projectId'), {
						id: typeof body.id === 'string' ? body.id : undefined,
						workDayId: String(body.workDayId),
						taskId: typeof body.taskId === 'string' ? body.taskId : null,
						phase: String(body.phase),
						credits: Number(body.credits),
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.post('/v1/jobs/:jobId/progress', async (c) => {
				const token = bearerTokenFromRequest(c.req.raw);
				if (!token) {
					return jsonError(c, 401, 'Authentication required.');
				}
				const job = await store.findJobById(c.req.param('jobId'));
				if (!job) {
					return jsonError(c, 404, `Unknown job "${c.req.param('jobId')}".`);
				}
				const runner = await store.authenticateRunner(job.projectId, token);
				if (!runner) {
					return jsonError(c, 401, 'Invalid project runner token.');
				}
				const body = await c.req.json().catch(() => ({}));
				return c.json({
					ok: true,
					payload: decorateJob(runtime.resolved.config.baseUrl, await store.recordJobProgress(job.id, {
						summary: typeof body.summary === 'string' ? body.summary : null,
						data: typeof body.data === 'object' && body.data ? body.data : {},
					})),
				});
			});

			app.post('/v1/jobs/:jobId/complete', async (c) => {
				const token = bearerTokenFromRequest(c.req.raw);
				if (!token) {
					return jsonError(c, 401, 'Authentication required.');
				}
				const job = await store.findJobById(c.req.param('jobId'));
				if (!job) {
					return jsonError(c, 404, `Unknown job "${c.req.param('jobId')}".`);
				}
				const runner = await store.authenticateRunner(job.projectId, token);
				if (!runner) {
					return jsonError(c, 401, 'Invalid project runner token.');
				}
				const body = await c.req.json().catch(() => ({}));
				return c.json({
					ok: true,
					payload: decorateJob(runtime.resolved.config.baseUrl, await store.completeJob(job.id, {
						output: body.output,
					})),
				});
			});

			app.post('/v1/jobs/:jobId/fail', async (c) => {
				const token = bearerTokenFromRequest(c.req.raw);
				if (!token) {
					return jsonError(c, 401, 'Authentication required.');
				}
				const job = await store.findJobById(c.req.param('jobId'));
				if (!job) {
					return jsonError(c, 404, `Unknown job "${c.req.param('jobId')}".`);
				}
				const runner = await store.authenticateRunner(job.projectId, token);
				if (!runner) {
					return jsonError(c, 401, 'Invalid project runner token.');
				}
				const body = await c.req.json().catch(() => ({}));
				if (!body.message) {
					return jsonError(c, 400, 'message is required.');
				}
				return c.json({
					ok: true,
					payload: decorateJob(runtime.resolved.config.baseUrl, await store.failJob(job.id, {
						code: typeof body.code === 'string' ? body.code : null,
						message: String(body.message),
					})),
				});
			});

			app.get('/v1/catalog', async (c) => {
				const kind = typeof c.req.query('kind') === 'string' ? c.req.query('kind') : undefined;
				const teamId = typeof c.req.query('teamId') === 'string' ? c.req.query('teamId') : undefined;
				const slug = typeof c.req.query('slug') === 'string' ? c.req.query('slug') : undefined;
				return c.json({
					ok: true,
					payload: await store.listCatalogItems(c.get('principal'), {
						kind,
						teamId,
						slug,
					}),
				});
			});

			app.get('/v1/catalog/:itemId', async (c) => {
				const item = await store.getCatalogItem(c.req.param('itemId'));
				if (!item) {
					return jsonError(c, 404, `Unknown catalog item "${c.req.param('itemId')}".`);
				}
				const canAccess = await store.principalCanAccessCatalogItem(c.get('principal'), item);
				if (!canAccess) {
					return jsonError(c, 404, `Unknown catalog item "${c.req.param('itemId')}".`);
				}
				return c.json({ ok: true, payload: item });
			});

			app.get('/v1/catalog/:itemId/artifacts', async (c) => {
				const item = await store.getCatalogItem(c.req.param('itemId'));
				if (!item) {
					return jsonError(c, 404, `Unknown catalog item "${c.req.param('itemId')}".`);
				}
				const canAccess = await store.principalCanAccessCatalogItem(c.get('principal'), item);
				if (!canAccess) {
					return jsonError(c, 404, `Unknown catalog item "${c.req.param('itemId')}".`);
				}
				return c.json({
					ok: true,
					payload: await store.listCatalogArtifactVersions(item.id),
				});
			});

			app.post('/v1/teams/:teamId/catalog-items', async (c) => {
				const access = await requireTeamAccess(c, store, c.req.param('teamId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.kind || !body.slug || !body.title) {
					return jsonError(c, 400, 'kind, slug, and title are required.');
				}
				return c.json({
					ok: true,
					payload: await store.upsertCatalogItem(c.req.param('teamId'), {
						id: typeof body.id === 'string' ? body.id : undefined,
						kind: String(body.kind),
						slug: String(body.slug),
						title: String(body.title),
						summary: typeof body.summary === 'string' ? body.summary : null,
						visibility: typeof body.visibility === 'string' ? body.visibility : 'private',
						listingEnabled: body.listingEnabled === true,
						offerMode: typeof body.offerMode === 'string' ? body.offerMode : 'private',
						manifestKey: typeof body.manifestKey === 'string' ? body.manifestKey : null,
						artifactKey: typeof body.artifactKey === 'string' ? body.artifactKey : null,
						searchText: typeof body.searchText === 'string' ? body.searchText : null,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.post('/v1/catalog/:itemId/artifacts', async (c) => {
				const access = await requireCatalogItemAccess(c, store, c.req.param('itemId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.kind || !body.version || !body.contentKey) {
					return jsonError(c, 400, 'kind, version, and contentKey are required.');
				}
				return c.json({
					ok: true,
					payload: await store.upsertCatalogArtifactVersion(access.item.teamId, access.item.id, {
						id: typeof body.id === 'string' ? body.id : undefined,
						kind: String(body.kind),
						version: String(body.version),
						contentKey: String(body.contentKey),
						manifestKey: typeof body.manifestKey === 'string' ? body.manifestKey : null,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
						publishedAt: typeof body.publishedAt === 'string' ? body.publishedAt : null,
					}),
				});
			});

			app.get('/v1/teams/:teamId/storage', async (c) => {
				const access = await requireTeamAccess(c, store, c.req.param('teamId'), 'teams:manage:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: await store.getTeamStorageLocator(c.req.param('teamId')),
				});
			});

			app.put('/v1/teams/:teamId/storage', async (c) => {
				const access = await requireTeamAccess(c, store, c.req.param('teamId'), 'teams:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.bucketName || !body.manifestKeyTemplate || !body.previewRootTemplate) {
					return jsonError(c, 400, 'bucketName, manifestKeyTemplate, and previewRootTemplate are required.');
				}
				return c.json({
					ok: true,
					payload: await store.upsertTeamStorageLocator(c.req.param('teamId'), {
						bucketName: String(body.bucketName),
						manifestKeyTemplate: String(body.manifestKeyTemplate),
						previewRootTemplate: String(body.previewRootTemplate),
						publicBaseUrl: typeof body.publicBaseUrl === 'string' ? body.publicBaseUrl : null,
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			app.post('/v1/teams/:teamId/content-previews', async (c) => {
				const access = await requireTeamAccess(c, store, c.req.param('teamId'), 'projects:manage:team');
				if (access.response) return access.response;
				const body = await c.req.json().catch(() => ({}));
				if (!body.previewId) {
					return jsonError(c, 400, 'previewId is required.');
				}
				const expiresAt = typeof body.expiresAt === 'string'
					? body.expiresAt
					: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
				const secret = String(runtime.env?.TREESEED_EDITORIAL_PREVIEW_SECRET ?? runtime.resolved.config.authSecret ?? '');
				if (!secret) {
					return jsonError(c, 500, 'Editorial preview secret is not configured.');
				}
				const token = signEditorialPreviewToken({
					teamId: c.req.param('teamId'),
					previewId: String(body.previewId),
					expiresAt,
				}, secret);
				return c.json({
					ok: true,
					payload: {
						teamId: c.req.param('teamId'),
						previewId: String(body.previewId),
						expiresAt,
						token,
						previewUrl: `${runtime.resolved.config.baseUrl ?? ''}?preview=${encodeURIComponent(token)}`,
					},
				});
			});

			app.get('/v1/templates', async (c) => {
				const catalog = await store.listCatalogItems(c.get('principal'), { kind: 'template' });
				if (catalog.length > 0) {
					return c.json({ ok: true, payload: { items: catalog } });
				}
				return c.json({
					ok: true,
					payload: loadTemplateCatalog(runtime.resolved.config),
				});
			});

			app.get('/v1/knowledge-packs', async (c) => {
				const catalog = await store.listCatalogItems(c.get('principal'), { kind: 'knowledge_pack' });
				if (catalog.length > 0) {
					return c.json({ ok: true, payload: catalog });
				}
				return c.json({
					ok: true,
					payload: await store.listKnowledgePacks(c.get('principal')),
				});
			});

			app.post('/v1/knowledge-packs', async (c) => {
				const body = await c.req.json().catch(() => ({}));
				if (!body.teamId || !body.slug || !body.name) {
					return jsonError(c, 400, 'teamId, slug, and name are required.');
				}
				const access = await requireTeamAccess(c, store, String(body.teamId), 'knowledge_packs:manage:team');
				if (access.response) return access.response;
				return c.json({
					ok: true,
					payload: await store.createKnowledgePack(String(body.teamId), {
						id: typeof body.id === 'string' ? body.id : undefined,
						slug: String(body.slug),
						name: String(body.name),
						summary: typeof body.summary === 'string' ? body.summary : null,
						sourceKind: typeof body.sourceKind === 'string' ? body.sourceKind : 'market_import',
						sourceRef: typeof body.sourceRef === 'string' ? body.sourceRef : null,
						installStrategy: typeof body.installStrategy === 'string' ? body.installStrategy : 'import_export',
						visibility: typeof body.visibility === 'string' ? body.visibility : 'private',
						metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
					}),
				});
			});

			options.extendApp?.(app, runtime);
		},
	});
}
