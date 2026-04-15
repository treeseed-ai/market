import {
	AgentSdk,
	RemoteTreeseedClient,
	RemoteTreeseedOperationsClient,
	RemoteTreeseedSdkClient,
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

			app.get('/v1/templates', (c) => c.json({
				ok: true,
				payload: loadTemplateCatalog(runtime.resolved.config),
			}));

			app.get('/v1/knowledge-packs', async (c) => c.json({
				ok: true,
				payload: await store.listKnowledgePacks(c.get('principal')),
			}));

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
