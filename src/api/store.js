import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

function getNodeBuiltin(name) {
	return globalThis.process?.getBuiltinModule?.(name) ?? null;
}

function fileUrlPath(url) {
	return decodeURIComponent(url.pathname);
}

const migrationPaths = [
	'../../migrations/0007_site_web_sessions.sql',
	'../../migrations/0008_market_control_plane.sql',
	'../../migrations/0009_team_content_catalog.sql',
	'../../migrations/0010_project_hosting_topology.sql',
	'../../migrations/0011_control_plane_reporting.sql',
	'../../migrations/0012_knowledge_coop_views.sql',
	'../../migrations/0013_better_auth_browser_accounts.sql',
];

let cachedMigrationSql = null;

function loadMigrationSql() {
	if (cachedMigrationSql !== null) {
		return cachedMigrationSql;
	}
	const fs = getNodeBuiltin('fs');
	if (!fs) {
		cachedMigrationSql = '';
		return cachedMigrationSql;
	}
	try {
		cachedMigrationSql = migrationPaths
			.map((relativePath) => fileUrlPath(new URL(relativePath, import.meta.url)))
			.map((migrationPath) => fs.readFileSync(migrationPath, 'utf8'))
			.join('\n');
	} catch {
		cachedMigrationSql = '';
	}
	return cachedMigrationSql;
}

function isoNow() {
	return new Date().toISOString();
}

function parseJson(value, fallback) {
	if (!value) return fallback;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

function stableHash(value, secret) {
	return createHash('sha256').update(`${secret}:${value}`).digest('hex');
}

function equalHash(left, right) {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function tokenPrefix(token) {
	return token.slice(0, 16);
}

function principalIsAdmin(principal) {
	return Boolean(
		principal
		&& (
			principal.permissions?.includes?.('*:*:*')
			|| principal.roles?.includes?.('platform_admin')
			|| principal.roles?.includes?.('market_admin')
		),
	);
}

const TEAM_ROLE_CAPABILITIES = {
	team_owner: [
		'launch_projects',
		'edit_direct',
		'manage_workstreams',
		'stage_releases',
		'publish_releases',
		'publish_market_listings',
		'manage_products',
		'manage_billing',
		'approve_remote_execution',
	],
	market_steward: ['manage_products', 'publish_market_listings'],
	project_lead: ['launch_projects', 'edit_direct', 'manage_workstreams', 'stage_releases', 'publish_releases', 'approve_remote_execution'],
	contributor: ['edit_direct', 'manage_workstreams'],
	reviewer: ['stage_releases', 'approve_remote_execution'],
	finance: ['manage_billing', 'manage_products'],
};

const KNOWLEDGE_COOP_ROLE_DESCRIPTIONS = {
	team_owner: 'Own the team portfolio and all project capabilities.',
	market_steward: 'Manage market products and publish listings.',
	project_lead: 'Lead projects, workstreams, and release promotion.',
	contributor: 'Edit direction and move workstreams forward.',
	reviewer: 'Review staged work and approve remote execution.',
	finance: 'Manage billing and commercial product settings.',
};

const ALL_TEAM_CAPABILITIES = [...new Set(Object.values(TEAM_ROLE_CAPABILITIES).flat())];
const TEAM_DELETION_CONFIRMATION_PREFIX = 'DELETE ';
const TEAM_MANAGEMENT_ROLES = new Set(['team_owner']);
const TEAM_RESERVED_NAMES = new Set([
	'app',
	'api',
	'auth',
	'market',
	'templates',
	'admin',
	'settings',
	'u',
	't',
	'users',
	'teams',
	'new',
	'me',
	'account',
	'login',
	'logout',
	'signup',
]);

export function normalizeTeamName(value) {
	return String(value ?? '').trim().toLowerCase();
}

export function validateTeamName(value) {
	const name = normalizeTeamName(value);
	if (!name) {
		return { ok: false, code: 'missing', message: 'Team name is required.' };
	}
	if (TEAM_RESERVED_NAMES.has(name)) {
		return { ok: false, code: 'reserved', message: 'That team name is reserved.' };
	}
	if (
		name.length > 39
		|| !/^[a-z0-9-]+$/u.test(name)
		|| name.startsWith('-')
		|| name.endsWith('-')
		|| name.includes('--')
	) {
		return {
			ok: false,
			code: 'format',
			message: 'Team names can use 1-39 letters, numbers, or single hyphens, with no leading or trailing hyphen.',
		};
	}
	return { ok: true, name };
}

export function teamDeletionConfirmationMatches(value, teamName) {
	return String(value ?? '') === `${TEAM_DELETION_CONFIRMATION_PREFIX}${normalizeTeamName(teamName)}`;
}

function normalizeBaseUrl(baseUrl) {
	return String(baseUrl ?? '').trim().replace(/\/+$/u, '');
}

function signAssertionPayload(payload, secret) {
	return createHmac('sha256', secret).update(payload).digest('base64url');
}

function uniqueCapabilities(roles = []) {
	const capabilities = roles.flatMap((role) => TEAM_ROLE_CAPABILITIES[role] ?? []);
	return [...new Set(capabilities)];
}

function projectConnectionModeFromHosting(kind, registration = 'none') {
	if (kind === 'hosted_project') {
		return 'hosted';
	}
	if (kind === 'self_hosted_project') {
		return registration === 'optional' ? 'hybrid' : 'self_hosted';
	}
	return 'hosted';
}

function serializeTeam(row) {
	if (!row) return null;
	const metadata = parseJson(row.metadata_json, {});
	const handle = row.name ?? row.slug;
	return {
		id: row.id,
		slug: row.slug ?? handle,
		name: handle,
		displayName: row.display_name ?? metadata.displayName ?? row.name ?? row.slug,
		logoUrl: row.logo_url ?? metadata.logoUrl ?? null,
		profileSummary: row.profile_summary ?? metadata.profileSummary ?? metadata.description ?? null,
		metadata,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeTeamMember(row, roles = []) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		userId: row.user_id,
		status: row.status,
		displayName: row.display_name,
		email: row.email,
		roles,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeTeamInvite(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		email: row.email,
		roleKey: row.role_key,
		status: row.status,
		invitedByUserId: row.invited_by_user_id,
		acceptedByUserId: row.accepted_by_user_id,
		acceptedAt: row.accepted_at,
		expiresAt: row.expires_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProject(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		slug: row.slug,
		name: row.name,
		description: row.description,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function isoDate(value) {
	if (typeof value !== 'string' || !value.trim()) {
		return null;
	}
	const parsed = new Date(value);
	return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : null;
}

function compareDatesDesc(left, right) {
	const leftTime = isoDate(left) ? new Date(left).getTime() : 0;
	const rightTime = isoDate(right) ? new Date(right).getTime() : 0;
	return rightTime - leftTime;
}

function latestDate(...values) {
	return values
		.map((value) => isoDate(value))
		.filter(Boolean)
		.sort(compareDatesDesc)[0] ?? null;
}

function uniqueStrings(values) {
	return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
}

function summarizeProjectHealth({ hosting, connection, deployments, jobs }) {
	const failedDeployment = deployments.find((deployment) => deployment.status === 'failed');
	if (failedDeployment) {
		return {
			state: 'verification_failing',
			label: 'Verification failing',
			reason: `Latest ${failedDeployment.environment} deployment failed.`,
		};
	}

	const failedJob = jobs.find((job) => job.status === 'failed');
	if (failedJob) {
		return {
			state: 'action_required',
			label: 'Action required',
			reason: `Workflow ${failedJob.operation} failed.`,
		};
	}

	if (!hosting || !connection) {
		return {
			state: 'setup_needed',
			label: 'Setup needed',
			reason: 'Hosting and runtime connection still need configuration.',
		};
	}

	const readyRelease = deployments.find((deployment) => deployment.environment === 'staging' && deployment.status === 'succeeded');
	if (readyRelease) {
		return {
			state: 'release_ready',
			label: 'Release ready',
			reason: 'A verified staging candidate is ready for human review.',
		};
	}

	return {
		state: 'working_normally',
		label: 'Working normally',
		reason: 'This project has a healthy runtime surface and no active failures.',
	};
}

function summarizeDeploymentStatus(deployment) {
	if (!deployment) {
		return null;
	}
	return {
		id: deployment.id,
		environment: deployment.environment,
		status: deployment.status,
		deploymentKind: deployment.deploymentKind,
		releaseTag: deployment.releaseTag,
		commitSha: deployment.commitSha,
		sourceRef: deployment.sourceRef,
		finishedAt: deployment.finishedAt,
		startedAt: deployment.startedAt,
	};
}

function toActivityItem(kind, input) {
	return {
		kind,
		id: input.id,
		title: input.title,
		status: input.status,
		timestamp: input.timestamp,
		href: input.href ?? null,
		summary: input.summary ?? null,
		metadata: input.metadata ?? {},
	};
}

function serializeConnection(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		mode: row.mode,
		projectApiBaseUrl: row.project_api_base_url,
		runnerRegistrationState: row.runner_registration_state,
		executionOwner: row.execution_owner,
		runnerRegisteredAt: row.runner_registered_at,
		runnerLastSeenAt: row.runner_last_seen_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		metadata: parseJson(row.metadata_json, {}),
	};
}

function serializeCapability(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		namespace: row.namespace,
		operation: row.operation,
		executionClass: row.execution_class,
		allowedTargets: parseJson(row.allowed_targets_json, []),
		defaultDispatchMode: row.default_dispatch_mode,
		enabled: Boolean(row.enabled),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeEntitlement(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		projectId: row.project_id,
		tier: row.tier,
		status: row.status,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeJob(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		namespace: row.namespace,
		operation: row.operation,
		status: row.status,
		preferredMode: row.preferred_mode,
		selectedTarget: row.selected_target,
		input: parseJson(row.input_json, {}),
		output: parseJson(row.output_json, null),
		error: parseJson(row.error_json, null),
		requestedByType: row.requested_by_type,
		requestedById: row.requested_by_id,
		assignedRunnerId: row.assigned_runner_id,
		idempotencyKey: row.idempotency_key,
		capability: parseJson(row.capability_json, null),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		startedAt: row.started_at,
		finishedAt: row.finished_at,
		cancelledAt: row.cancelled_at,
	};
}

function serializeJobEvent(row) {
	if (!row) return null;
	return {
		id: row.id,
		jobId: row.job_id,
		seq: Number(row.seq),
		kind: row.kind,
		data: parseJson(row.data_json, {}),
		createdAt: row.created_at,
	};
}

function serializeKnowledgePack(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		slug: row.slug,
		name: row.name,
		summary: row.summary,
		sourceKind: row.source_kind,
		sourceRef: row.source_ref,
		installStrategy: row.install_strategy,
		visibility: row.visibility,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeTeamStorageLocator(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		bucketName: row.bucket_name,
		manifestKeyTemplate: row.manifest_key_template,
		previewRootTemplate: row.preview_root_template,
		publicBaseUrl: row.public_base_url,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeCatalogItem(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		kind: row.kind,
		slug: row.slug,
		title: row.title,
		summary: row.summary,
		visibility: row.visibility,
		listingEnabled: Boolean(row.listing_enabled),
		offerMode: row.offer_mode,
		manifestKey: row.manifest_key,
		artifactKey: row.artifact_key,
		searchText: row.search_text,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeCatalogArtifactVersion(row) {
	if (!row) return null;
	return {
		id: row.id,
		itemId: row.item_id,
		teamId: row.team_id,
		kind: row.kind,
		version: row.version,
		contentKey: row.content_key,
		manifestKey: row.manifest_key,
		metadata: parseJson(row.metadata_json, {}),
		publishedAt: row.published_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProjectHosting(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		kind: row.hosting_kind,
		registration: row.registration,
		marketBaseUrl: row.market_base_url,
		sourceRepoOwner: row.source_repo_owner,
		sourceRepoName: row.source_repo_name,
		sourceRepoUrl: row.source_repo_url,
		sourceRepoWorkflowPath: row.source_repo_workflow_path,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProjectEnvironment(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		environment: row.environment,
		deploymentProfile: row.deployment_profile,
		baseUrl: row.base_url,
		cloudflareAccountId: row.cloudflare_account_id,
		pagesProjectName: row.pages_project_name,
		workerName: row.worker_name,
		r2BucketName: row.r2_bucket_name,
		d1DatabaseName: row.d1_database_name,
		queueName: row.queue_name,
		railwayProjectName: row.railway_project_name,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProjectInfrastructureResource(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		environment: row.environment,
		provider: row.provider,
		resourceKind: row.resource_kind,
		logicalName: row.logical_name,
		locator: row.locator,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProjectDeployment(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		environment: row.environment,
		deploymentKind: row.deployment_kind,
		status: row.status,
		sourceRef: row.source_ref,
		releaseTag: row.release_tag,
		commitSha: row.commit_sha,
		triggeredByType: row.triggered_by_type,
		triggeredById: row.triggered_by_id,
		metadata: parseJson(row.metadata_json, {}),
		startedAt: row.started_at,
		finishedAt: row.finished_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeAgentPool(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		teamId: row.team_id,
		environment: row.environment,
		name: row.name,
		registrationIdentity: row.registration_identity,
		serviceBaseUrl: row.service_base_url,
		status: row.status,
		autoscale: {
			minWorkers: Number(row.min_workers ?? 0),
			maxWorkers: Number(row.max_workers ?? 1),
			targetQueueDepth: Number(row.target_queue_depth ?? 1),
			cooldownSeconds: Number(row.cooldown_seconds ?? 60),
		},
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeAgentPoolRegistration(row) {
	if (!row) return null;
	return {
		id: row.id,
		poolId: row.pool_id,
		projectId: row.project_id,
		runnerId: row.runner_id,
		managerId: row.manager_id,
		serviceName: row.service_name,
		heartbeatAt: row.heartbeat_at,
		desiredWorkers: row.desired_workers === null || row.desired_workers === undefined ? null : Number(row.desired_workers),
		observedQueueDepth: row.observed_queue_depth === null || row.observed_queue_depth === undefined ? null : Number(row.observed_queue_depth),
		observedActiveLeases: row.observed_active_leases === null || row.observed_active_leases === undefined ? null : Number(row.observed_active_leases),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeAgentPoolScaleDecision(row) {
	if (!row) return null;
	return {
		id: row.id,
		poolId: row.pool_id,
		projectId: row.project_id,
		environment: row.environment,
		desiredWorkers: Number(row.desired_workers ?? 0),
		observedQueueDepth: Number(row.observed_queue_depth ?? 0),
		observedActiveLeases: Number(row.observed_active_leases ?? 0),
		workDayId: row.work_day_id,
		reason: row.reason,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProjectWorkdaySummary(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		environment: row.environment,
		workDayId: row.work_day_id,
		kind: row.kind,
		state: row.state,
		startedAt: row.started_at,
		endedAt: row.ended_at,
		summary: parseJson(row.summary_json, {}),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeWorkPolicy(row) {
	if (!row) return null;
	return {
		projectId: row.project_id,
		environment: row.environment,
		schedule: parseJson(row.schedule_json, { timezone: 'UTC', windows: [] }),
		dailyTaskCreditBudget: Number(row.daily_task_credit_budget ?? 0),
		maxQueuedTasks: Number(row.max_queued_tasks ?? 0),
		maxQueuedCredits: Number(row.max_queued_credits ?? 0),
		autoscale: parseJson(row.autoscale_json, {}),
		creditWeights: parseJson(row.credit_weights_json, []),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializePriorityOverride(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		model: row.model,
		subjectId: row.subject_id,
		priority: Number(row.priority ?? 0),
		estimatedCredits: row.estimated_credits === null || row.estimated_credits === undefined ? null : Number(row.estimated_credits),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializePrioritySnapshot(row) {
	if (!row) return null;
	const snapshot = parseJson(row.snapshot_json, {});
	return {
		...snapshot,
		id: row.id,
		projectId: row.project_id,
		workDayId: row.work_day_id,
		metadata: parseJson(row.metadata_json, {}),
		generatedAt: row.generated_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeTaskCreditLedgerEntry(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		workDayId: row.work_day_id,
		taskId: row.task_id,
		phase: row.phase,
		credits: Number(row.credits ?? 0),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
	};
}

function serializeTeamInboxItem(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		projectId: row.project_id,
		kind: row.kind,
		state: row.state,
		title: row.title,
		summary: row.summary,
		href: row.href,
		itemKey: row.item_key,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProjectSummarySnapshot(row) {
	if (!row) return null;
	return {
		projectId: row.project_id,
		teamId: row.team_id,
		summary: parseJson(row.summary_json, {}),
		generatedAt: row.generated_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export class MarketControlPlaneStore {
	constructor(config, db) {
		this.config = config;
		this.db = db;
		this.initializationPromise = null;
	}

	async run(query, params = []) {
		await this.db.prepare(query).bind(...params).run();
	}

	async first(query, params = []) {
		return this.db.prepare(query).bind(...params).first();
	}

	async all(query, params = []) {
		const result = await this.db.prepare(query).bind(...params).all();
		return result.results ?? [];
	}

	ensureInitialized() {
		if (!this.initializationPromise) {
			const migrationSql = loadMigrationSql();
			this.initializationPromise = (migrationSql && this.db.exec ? this.db.exec(migrationSql) : Promise.resolve())
				.then(() => this.ensureWebSessionSchema())
				.then(() => this.ensureTeamManagementSchema())
				.then(() => this.seedKnowledgeCoopRoles());
		}
		return this.initializationPromise;
	}

	async tableColumns(tableName) {
		const result = await this.all(`PRAGMA table_info(${tableName})`);
		return new Set(result.map((row) => row.name));
	}

	async ensureWebSessionSchema() {
		const columns = await this.tableColumns('web_sessions');
		const columnMigrations = [
			['better_auth_session_id', `ALTER TABLE web_sessions ADD COLUMN better_auth_session_id TEXT`],
			['ip_address', `ALTER TABLE web_sessions ADD COLUMN ip_address TEXT`],
			['user_agent', `ALTER TABLE web_sessions ADD COLUMN user_agent TEXT`],
			['last_seen_at', `ALTER TABLE web_sessions ADD COLUMN last_seen_at TEXT`],
			['revoked_at', `ALTER TABLE web_sessions ADD COLUMN revoked_at TEXT`],
		];
		for (const [column, statement] of columnMigrations) {
			if (!columns.has(column)) {
				await this.run(statement);
			}
		}
		await this.run(`CREATE INDEX IF NOT EXISTS idx_web_sessions_better_auth_session_id ON web_sessions(better_auth_session_id)`);
		await this.run(`CREATE INDEX IF NOT EXISTS idx_web_sessions_active ON web_sessions(user_id, revoked_at, expires_at)`);
	}

	async ensureTeamManagementSchema() {
		const columns = await this.tableColumns('teams');
		if (!columns.has('display_name')) {
			await this.run(`ALTER TABLE teams ADD COLUMN display_name TEXT`);
		}
		if (!columns.has('logo_url')) {
			await this.run(`ALTER TABLE teams ADD COLUMN logo_url TEXT`);
		}
		if (!columns.has('profile_summary')) {
			await this.run(`ALTER TABLE teams ADD COLUMN profile_summary TEXT`);
		}
		await this.run(`UPDATE teams SET display_name = name WHERE display_name IS NULL`);
		await this.run(`UPDATE teams SET name = LOWER(slug) WHERE slug IS NOT NULL AND slug != '' AND name != LOWER(slug)`);
		await this.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_name ON teams(name)`);
		await this.run(`CREATE TABLE IF NOT EXISTS team_invites (
			id TEXT PRIMARY KEY,
			team_id TEXT NOT NULL,
			email TEXT NOT NULL,
			role_key TEXT NOT NULL,
			token_prefix TEXT NOT NULL,
			token_hash TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			invited_by_user_id TEXT,
			accepted_by_user_id TEXT,
			accepted_at TEXT,
			expires_at TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
			FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
			FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
		)`);
		await this.run(`CREATE INDEX IF NOT EXISTS idx_team_invites_team_status ON team_invites(team_id, status, created_at)`);
		await this.run(`CREATE INDEX IF NOT EXISTS idx_team_invites_token_prefix ON team_invites(token_prefix)`);
	}

	async seedKnowledgeCoopRoles() {
		const timestamp = isoNow();
		for (const [key, description] of Object.entries(KNOWLEDGE_COOP_ROLE_DESCRIPTIONS)) {
			await this.run(
				`INSERT OR IGNORE INTO roles (id, key, description, created_at)
				 VALUES (?, ?, ?, ?)`,
				[randomUUID(), key, description, timestamp],
			);
		}
	}

	async roleIdForKey(key) {
		await this.ensureInitialized();
		const row = await this.first(`SELECT id FROM roles WHERE key = ? LIMIT 1`, [key]);
		return typeof row?.id === 'string' ? row.id : null;
	}

	async bindRoleToMembership(teamMembershipId, roleKey) {
		await this.ensureInitialized();
		const roleId = await this.roleIdForKey(roleKey);
		if (!roleId) return;
		await this.run(
			`INSERT OR IGNORE INTO team_role_bindings (team_membership_id, role_id, created_at)
			 VALUES (?, ?, ?)`,
			[teamMembershipId, roleId, isoNow()],
		);
	}

	async listRoleKeysForMembership(teamMembershipId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT roles.key
			 FROM team_role_bindings
			 INNER JOIN roles ON roles.id = team_role_bindings.role_id
			 WHERE team_role_bindings.team_membership_id = ?
			 ORDER BY roles.key ASC`,
			[teamMembershipId],
		);
		return uniqueStrings(rows.map((row) => row.key));
	}

	async resolvePrincipalTeamContext(teamId, principal) {
		await this.ensureInitialized();
		if (!principal) return null;
		if (principalIsAdmin(principal)) {
			return {
				membershipId: null,
				roles: ['team_owner'],
				capabilities: [...ALL_TEAM_CAPABILITIES],
			};
		}
		if (principal.roles?.includes?.('team_api_key') && principal.metadata?.teamId === teamId) {
			return {
				membershipId: null,
				roles: ['team_owner'],
				capabilities: [...ALL_TEAM_CAPABILITIES],
			};
		}
		const userId = typeof principal.id === 'string' ? principal.id : '';
		if (!userId) return null;
		const membership = await this.first(
			`SELECT * FROM team_memberships WHERE team_id = ? AND user_id = ? AND status = 'active' LIMIT 1`,
			[teamId, userId],
		);
		if (!membership?.id) {
			return null;
		}
		const roles = await this.listRoleKeysForMembership(membership.id);
		const effectiveRoles = roles.length > 0 ? roles : ['team_owner'];
		return {
			membershipId: membership.id,
			roles: effectiveRoles,
			capabilities: uniqueCapabilities(effectiveRoles),
		};
	}

	createTrustedUserAssertion(claims) {
		const secret = typeof this.config.assertionSecret === 'string' ? this.config.assertionSecret.trim() : '';
		if (!secret) return null;
		const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
		return `${encodedPayload}.${signAssertionPayload(encodedPayload, secret)}`;
	}

	async requestProjectRuntime(projectId, principal, path, input = {}) {
		await this.ensureInitialized();
		const fetchImpl = this.config.fetchImpl ?? fetch;
		const serviceId = typeof this.config.serviceId === 'string' ? this.config.serviceId.trim() : '';
		const serviceSecret = typeof this.config.serviceSecret === 'string' ? this.config.serviceSecret.trim() : '';
		if (!principal || !serviceId || !serviceSecret) {
			return null;
		}
		const details = await this.getProjectDetails(projectId);
		const baseUrl = normalizeBaseUrl(details?.connection?.projectApiBaseUrl);
		if (!details?.project || !baseUrl) {
			return null;
		}
		const teamContext = await this.resolvePrincipalTeamContext(details.project.teamId, principal);
		if (!teamContext) {
			return null;
		}
		const assertion = this.createTrustedUserAssertion({
			userId: principal.id,
			sessionId: principal.metadata?.sessionId ?? null,
			identityId: principal.metadata?.identityId ?? null,
			authTime: principal.metadata?.authTime ?? principal.metadata?.authenticatedAt ?? isoNow(),
			expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
			nonce: randomUUID(),
			teamId: details.project.teamId,
			projectId,
			membershipId: teamContext.membershipId,
			teamRoles: teamContext.roles,
			teamCapabilities: teamContext.capabilities,
		});
		if (!assertion) {
			return null;
		}

		const headers = new Headers({
			accept: 'application/json',
			'x-treeseed-service-id': serviceId,
			'x-treeseed-service-secret': serviceSecret,
			'x-treeseed-user-assertion': assertion,
		});
		if (input.body !== undefined) {
			headers.set('content-type', 'application/json');
		}
		try {
			const response = await fetchImpl(`${baseUrl}${path}`, {
				method: input.method ?? 'GET',
				headers,
				body: input.body === undefined ? undefined : JSON.stringify(input.body),
			});
			if (!response.ok) {
				return null;
			}
			const envelope = await response.json().catch(() => null);
			if (!envelope?.ok) {
				return null;
			}
			return envelope.payload ?? null;
		} catch {
			return null;
		}
	}

	async teamIdsForPrincipal(principal) {
		await this.ensureInitialized();
		if (!principal) return [];
		if (principalIsAdmin(principal)) {
			const teams = await this.all(`SELECT id FROM teams ORDER BY created_at ASC`);
			return teams.map((row) => row.id);
		}
		const directTeamId = principal.metadata?.teamId;
		if (typeof directTeamId === 'string' && directTeamId) {
			return [directTeamId];
		}
		const userId = typeof principal.id === 'string' ? principal.id : '';
		if (!userId) return [];
		const memberships = await this.all(
			`SELECT team_id
			 FROM team_memberships
			 WHERE user_id = ? AND status = 'active'
			 ORDER BY created_at ASC`,
			[userId],
		);
		return memberships.map((row) => row.team_id);
	}

	async principalCanAccessTeam(principal, teamId) {
		if (!principal) return false;
		if (principalIsAdmin(principal)) return true;
		const teamIds = await this.teamIdsForPrincipal(principal);
		return teamIds.includes(teamId);
	}

	async principalCanManageTeam(principal, teamId) {
		if (!principal) return false;
		if (principalIsAdmin(principal)) return true;
		const context = await this.resolvePrincipalTeamContext(teamId, principal);
		return Boolean(context?.roles?.some((role) => TEAM_MANAGEMENT_ROLES.has(role)));
	}

	async principalCanAccessCatalogItem(principal, item) {
		if (!item) return false;
		if (item.visibility === 'public') {
			return item.listingEnabled !== false;
		}
		return this.principalCanAccessTeam(principal, item.teamId);
	}

	async authenticateTeamApiKey(token) {
		await this.ensureInitialized();
		const prefix = tokenPrefix(token);
		const rows = await this.all(
			`SELECT team_api_keys.*, teams.name AS team_name, teams.display_name AS team_display_name
			 FROM team_api_keys
			 INNER JOIN teams ON teams.id = team_api_keys.team_id
			 WHERE team_api_keys.key_prefix = ? AND team_api_keys.revoked_at IS NULL`,
			[prefix],
		);
		for (const row of rows) {
			if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
				continue;
			}
			const expected = stableHash(token, this.config.authSecret);
			if (!equalHash(expected, row.key_hash)) {
				continue;
			}
			await this.run(
				`UPDATE team_api_keys SET last_used_at = ?, updated_at = ? WHERE id = ?`,
				[isoNow(), isoNow(), row.id],
			);
			return {
				teamId: row.team_id,
				keyId: row.id,
				principal: {
					id: `team-key:${row.id}`,
					displayName: row.name,
					roles: ['team_api_key'],
					permissions: parseJson(row.permissions_json, []),
					scopes: ['auth:me'],
					metadata: {
						teamId: row.team_id,
						teamName: row.team_name,
						teamDisplayName: row.team_display_name ?? row.team_name,
					},
				},
			};
		}
		return null;
	}

	async createTeam(input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const validation = validateTeamName(input.name ?? input.slug);
		if (!validation.ok) {
			throw new Error(validation.message);
		}
		const displayName = String(input.displayName ?? input.display_name ?? input.label ?? input.name ?? validation.name).trim() || validation.name;
		const metadata = {
			...(typeof input.metadata === 'object' && input.metadata ? input.metadata : {}),
		};
		await this.run(
			`INSERT INTO teams (id, slug, name, display_name, logo_url, profile_summary, metadata_json, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				validation.name,
				validation.name,
				displayName,
				typeof input.logoUrl === 'string' && input.logoUrl.trim() ? input.logoUrl.trim() : null,
				typeof input.profileSummary === 'string' && input.profileSummary.trim()
					? input.profileSummary.trim()
					: typeof input.description === 'string' && input.description.trim()
						? input.description.trim()
						: null,
				JSON.stringify(metadata),
				timestamp,
				timestamp,
			],
		);
		if (input.ownerUserId) {
			const membershipId = randomUUID();
			await this.run(
				`INSERT OR IGNORE INTO team_memberships (id, team_id, user_id, status, created_at, updated_at)
				 VALUES (?, ?, ?, 'active', ?, ?)`,
				[membershipId, id, input.ownerUserId, timestamp, timestamp],
			);
			await this.bindRoleToMembership(membershipId, 'team_owner');
		}
		return this.getTeam(id);
	}

	async getTeam(teamId) {
		await this.ensureInitialized();
		return serializeTeam(await this.first(`SELECT * FROM teams WHERE id = ?`, [teamId]));
	}

	async getTeamBySlug(slug) {
		await this.ensureInitialized();
		const value = normalizeTeamName(slug);
		return serializeTeam(await this.first(`SELECT * FROM teams WHERE LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?) LIMIT 1`, [value, value]));
	}

	async getTeamByName(name) {
		return this.getTeamBySlug(name);
	}

	async isTeamNameAvailable(name, excludeTeamId = null) {
		await this.ensureInitialized();
		const validation = validateTeamName(name);
		if (!validation.ok) return false;
		const row = await this.first(
			`SELECT id FROM teams WHERE LOWER(name) = LOWER(?) ${excludeTeamId ? 'AND id != ?' : ''} LIMIT 1`,
			excludeTeamId ? [validation.name, excludeTeamId] : [validation.name],
		);
		return !row?.id;
	}

	async updateTeamSettings(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const existing = await this.getTeam(teamId);
		if (!existing) return null;
		const requestedName = input.name === undefined || input.name === null || String(input.name).trim() === ''
			? existing.name
			: String(input.name);
		const validation = validateTeamName(requestedName);
		if (!validation.ok) {
			return { ok: false, code: validation.code, message: validation.message };
		}
		if (validation.name !== existing.name && !(await this.isTeamNameAvailable(validation.name, teamId))) {
			return { ok: false, code: 'taken', message: 'That team name is already taken.' };
		}
		const displayName = String(input.displayName ?? existing.displayName ?? existing.name).trim() || existing.name;
		const logoUrl = typeof input.logoUrl === 'string' && input.logoUrl.trim() ? input.logoUrl.trim() : null;
		const profileSummary = typeof input.profileSummary === 'string' && input.profileSummary.trim()
			? input.profileSummary.trim()
			: typeof input.description === 'string' && input.description.trim()
				? input.description.trim()
				: null;
		const metadata = {
			...(existing.metadata ?? {}),
			...(typeof input.metadata === 'object' && input.metadata ? input.metadata : {}),
		};
		await this.run(
			`UPDATE teams
			 SET slug = ?, name = ?, display_name = ?, logo_url = ?, profile_summary = ?, metadata_json = ?, updated_at = ?
			 WHERE id = ?`,
			[validation.name, validation.name, displayName, logoUrl, profileSummary, JSON.stringify(metadata), timestamp, teamId],
		);
		return { ok: true, team: await this.getTeam(teamId) };
	}

	async listTeamsForPrincipal(principal) {
		await this.ensureInitialized();
		const teamIds = await this.teamIdsForPrincipal(principal);
		if (teamIds.length === 0) {
			return [];
		}
		const placeholders = teamIds.map(() => '?').join(', ');
		const rows = await this.all(
			`SELECT * FROM teams WHERE id IN (${placeholders}) ORDER BY created_at ASC`,
			teamIds,
		);
		return rows.map(serializeTeam);
	}

	async listTeamMembers(teamId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT team_memberships.*, users.display_name, users.email
			 FROM team_memberships
			 INNER JOIN users ON users.id = team_memberships.user_id
			 WHERE team_memberships.team_id = ?
			 ORDER BY team_memberships.created_at ASC`,
			[teamId],
		);
		if (rows.length === 0) {
			return [];
		}
		const membershipIds = rows.map((row) => row.id);
		const placeholders = membershipIds.map(() => '?').join(', ');
		const roleRows = await this.all(
			`SELECT team_role_bindings.team_membership_id, roles.key
			 FROM team_role_bindings
			 INNER JOIN roles ON roles.id = team_role_bindings.role_id
			 WHERE team_role_bindings.team_membership_id IN (${placeholders})`,
			membershipIds,
		);
		const rolesByMembership = new Map();
		for (const row of roleRows) {
			const existing = rolesByMembership.get(row.team_membership_id) ?? [];
			existing.push(row.key);
			rolesByMembership.set(row.team_membership_id, uniqueStrings(existing));
		}
		return rows.map((row) => serializeTeamMember(row, rolesByMembership.get(row.id) ?? []));
	}

	async listTeamInvites(teamId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM team_invites WHERE team_id = ? AND status = 'pending' ORDER BY created_at DESC`,
			[teamId],
		);
		return rows.map(serializeTeamInvite);
	}

	async findUserByEmail(email) {
		await this.ensureInitialized();
		const normalized = String(email ?? '').trim().toLowerCase();
		if (!normalized) return null;
		return this.first(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status = 'active' LIMIT 1`, [normalized]);
	}

	async membershipOwnerCount(teamId) {
		await this.ensureInitialized();
		const row = await this.first(
			`SELECT COUNT(*) AS count
			 FROM team_memberships
			 INNER JOIN team_role_bindings ON team_role_bindings.team_membership_id = team_memberships.id
			 INNER JOIN roles ON roles.id = team_role_bindings.role_id
			 WHERE team_memberships.team_id = ? AND team_memberships.status = 'active' AND roles.key = 'team_owner'`,
			[teamId],
		);
		return Number(row?.count ?? 0);
	}

	async upsertTeamMember(teamId, userId, roleKey = 'contributor') {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const role = TEAM_ROLE_CAPABILITIES[roleKey] ? roleKey : 'contributor';
		let membership = await this.first(
			`SELECT * FROM team_memberships WHERE team_id = ? AND user_id = ? LIMIT 1`,
			[teamId, userId],
		);
		if (!membership?.id) {
			const membershipId = randomUUID();
			await this.run(
				`INSERT INTO team_memberships (id, team_id, user_id, status, created_at, updated_at)
				 VALUES (?, ?, ?, 'active', ?, ?)`,
				[membershipId, teamId, userId, timestamp, timestamp],
			);
			membership = { id: membershipId };
		} else {
			await this.run(
				`UPDATE team_memberships SET status = 'active', updated_at = ? WHERE id = ?`,
				[timestamp, membership.id],
			);
		}
		await this.replaceMembershipRole(membership.id, role);
		return (await this.listTeamMembers(teamId)).find((member) => member.id === membership.id) ?? null;
	}

	async replaceMembershipRole(membershipId, roleKey) {
		await this.ensureInitialized();
		const role = TEAM_ROLE_CAPABILITIES[roleKey] ? roleKey : 'contributor';
		await this.run(`DELETE FROM team_role_bindings WHERE team_membership_id = ?`, [membershipId]);
		await this.bindRoleToMembership(membershipId, role);
	}

	async updateTeamMemberRole(teamId, membershipId, roleKey) {
		await this.ensureInitialized();
		const membership = await this.first(`SELECT * FROM team_memberships WHERE id = ? AND team_id = ? LIMIT 1`, [membershipId, teamId]);
		if (!membership?.id) return { ok: false, code: 'missing', message: 'Team member not found.' };
		const currentRoles = await this.listRoleKeysForMembership(membershipId);
		if (currentRoles.includes('team_owner') && roleKey !== 'team_owner' && (await this.membershipOwnerCount(teamId)) <= 1) {
			return { ok: false, code: 'last_owner', message: 'A team must keep at least one owner.' };
		}
		await this.replaceMembershipRole(membershipId, roleKey);
		await this.run(`UPDATE team_memberships SET updated_at = ? WHERE id = ?`, [isoNow(), membershipId]);
		return { ok: true, member: (await this.listTeamMembers(teamId)).find((member) => member.id === membershipId) ?? null };
	}

	async removeTeamMember(teamId, membershipId) {
		await this.ensureInitialized();
		const membership = await this.first(`SELECT * FROM team_memberships WHERE id = ? AND team_id = ? LIMIT 1`, [membershipId, teamId]);
		if (!membership?.id) return { ok: false, code: 'missing', message: 'Team member not found.' };
		const currentRoles = await this.listRoleKeysForMembership(membershipId);
		if (currentRoles.includes('team_owner') && (await this.membershipOwnerCount(teamId)) <= 1) {
			return { ok: false, code: 'last_owner', message: 'A team must keep at least one owner.' };
		}
		await this.run(`DELETE FROM team_memberships WHERE id = ? AND team_id = ?`, [membershipId, teamId]);
		return { ok: true };
	}

	async createTeamInvite(teamId, input) {
		await this.ensureInitialized();
		const email = String(input.email ?? '').trim().toLowerCase();
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
			return { ok: false, code: 'invalid_email', message: 'A valid invite email is required.' };
		}
		const roleKey = TEAM_ROLE_CAPABILITIES[input.roleKey] ? input.roleKey : 'contributor';
		const token = `tiv_${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
		const timestamp = isoNow();
		const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
		const existingUser = await this.findUserByEmail(email);
		if (existingUser?.id && input.autoAddExisting !== false) {
			const member = await this.upsertTeamMember(teamId, existingUser.id, roleKey);
			return { ok: true, existingUser: true, member, invite: null, token: null };
		}
		const id = randomUUID();
		await this.run(
			`INSERT INTO team_invites (
				id, team_id, email, role_key, token_prefix, token_hash, status, invited_by_user_id, expires_at, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
			[
				id,
				teamId,
				email,
				roleKey,
				tokenPrefix(token),
				stableHash(token, this.config.authSecret),
				typeof input.invitedByUserId === 'string' ? input.invitedByUserId : null,
				expiresAt,
				timestamp,
				timestamp,
			],
		);
		return { ok: true, existingUser: false, invite: await this.getTeamInvite(id), token };
	}

	async getTeamInvite(inviteId) {
		await this.ensureInitialized();
		return serializeTeamInvite(await this.first(`SELECT * FROM team_invites WHERE id = ? LIMIT 1`, [inviteId]));
	}

	async revokeTeamInvite(teamId, inviteId) {
		await this.ensureInitialized();
		await this.run(
			`UPDATE team_invites SET status = 'revoked', updated_at = ? WHERE id = ? AND team_id = ? AND status = 'pending'`,
			[isoNow(), inviteId, teamId],
		);
		return { ok: true };
	}

	async acceptTeamInvite(token, userId) {
		await this.ensureInitialized();
		const prefix = tokenPrefix(String(token ?? ''));
		const rows = await this.all(
			`SELECT * FROM team_invites WHERE token_prefix = ? AND status = 'pending'`,
			[prefix],
		);
		for (const row of rows) {
			if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
				await this.run(`UPDATE team_invites SET status = 'expired', updated_at = ? WHERE id = ?`, [isoNow(), row.id]);
				continue;
			}
			if (!equalHash(stableHash(token, this.config.authSecret), row.token_hash)) continue;
			const member = await this.upsertTeamMember(row.team_id, userId, row.role_key);
			await this.run(
				`UPDATE team_invites
				 SET status = 'accepted', accepted_by_user_id = ?, accepted_at = ?, updated_at = ?
				 WHERE id = ?`,
				[userId, isoNow(), isoNow(), row.id],
			);
			return { ok: true, invite: serializeTeamInvite(row), member, team: await this.getTeam(row.team_id) };
		}
		return { ok: false, code: 'invalid', message: 'Invite link is invalid or expired.' };
	}

	async createTeamApiKey(teamId, input) {
		await this.ensureInitialized();
		const token = `tsk_${randomUUID().replaceAll('-', '')}`;
		const timestamp = isoNow();
		const id = randomUUID();
		await this.run(
			`INSERT INTO team_api_keys (
				id, team_id, name, key_prefix, key_hash, permissions_json, expires_at, last_used_at, revoked_at, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
			[
				id,
				teamId,
				input.name,
				tokenPrefix(token),
				stableHash(token, this.config.authSecret),
				JSON.stringify(input.permissions ?? []),
				input.expiresAt ?? null,
				timestamp,
				timestamp,
			],
		);
		return {
			id,
			token,
			prefix: tokenPrefix(token),
			name: input.name,
			expiresAt: input.expiresAt ?? null,
		};
	}

	async getTeamStorageLocator(teamId) {
		await this.ensureInitialized();
		return serializeTeamStorageLocator(await this.first(`SELECT * FROM team_storage_locators WHERE team_id = ?`, [teamId]));
	}

	async upsertTeamStorageLocator(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const existing = await this.first(`SELECT * FROM team_storage_locators WHERE team_id = ?`, [teamId]);
		if (existing) {
			await this.run(
				`UPDATE team_storage_locators
				 SET bucket_name = ?, manifest_key_template = ?, preview_root_template = ?, public_base_url = ?, metadata_json = ?, updated_at = ?
				 WHERE team_id = ?`,
				[
					input.bucketName,
					input.manifestKeyTemplate,
					input.previewRootTemplate,
					input.publicBaseUrl ?? null,
					JSON.stringify(input.metadata ?? parseJson(existing.metadata_json, {})),
					timestamp,
					teamId,
				],
			);
		} else {
			await this.run(
				`INSERT INTO team_storage_locators (
					id, team_id, bucket_name, manifest_key_template, preview_root_template, public_base_url, metadata_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					randomUUID(),
					teamId,
					input.bucketName,
					input.manifestKeyTemplate,
					input.previewRootTemplate,
					input.publicBaseUrl ?? null,
					JSON.stringify(input.metadata ?? {}),
					timestamp,
					timestamp,
				],
			);
		}
		return this.getTeamStorageLocator(teamId);
	}

	async upsertCatalogItem(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const existing = await this.first(`SELECT * FROM catalog_items WHERE id = ?`, [id]);
		if (existing) {
			await this.run(
				`UPDATE catalog_items
				 SET team_id = ?, kind = ?, slug = ?, title = ?, summary = ?, visibility = ?, listing_enabled = ?, offer_mode = ?, manifest_key = ?, artifact_key = ?, search_text = ?, metadata_json = ?, updated_at = ?
				 WHERE id = ?`,
				[
					teamId,
					input.kind,
					input.slug,
					input.title,
					input.summary ?? null,
					input.visibility ?? 'private',
					input.listingEnabled === true ? 1 : 0,
					input.offerMode ?? 'private',
					input.manifestKey ?? null,
					input.artifactKey ?? null,
					input.searchText ?? null,
					JSON.stringify(input.metadata ?? {}),
					timestamp,
					id,
				],
			);
		} else {
			await this.run(
				`INSERT INTO catalog_items (
					id, team_id, kind, slug, title, summary, visibility, listing_enabled, offer_mode, manifest_key, artifact_key, search_text, metadata_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					id,
					teamId,
					input.kind,
					input.slug,
					input.title,
					input.summary ?? null,
					input.visibility ?? 'private',
					input.listingEnabled === true ? 1 : 0,
					input.offerMode ?? 'private',
					input.manifestKey ?? null,
					input.artifactKey ?? null,
					input.searchText ?? null,
					JSON.stringify(input.metadata ?? {}),
					timestamp,
					timestamp,
				],
			);
		}
		return serializeCatalogItem(await this.first(`SELECT * FROM catalog_items WHERE id = ?`, [id]));
	}

	async getCatalogItem(itemId) {
		await this.ensureInitialized();
		return serializeCatalogItem(await this.first(`SELECT * FROM catalog_items WHERE id = ?`, [itemId]));
	}

	async getCatalogItemBySlug(kind, slug) {
		await this.ensureInitialized();
		return serializeCatalogItem(await this.first(
			`SELECT * FROM catalog_items WHERE kind = ? AND slug = ? LIMIT 1`,
			[kind, slug],
		));
	}

	async listCatalogItems(principal, filters = {}) {
		await this.ensureInitialized();
		const clauses = [];
		const params = [];
		if (filters.kind) {
			clauses.push('kind = ?');
			params.push(filters.kind);
		}
		if (filters.teamId) {
			clauses.push('team_id = ?');
			params.push(filters.teamId);
		}
		if (filters.slug) {
			clauses.push('slug = ?');
			params.push(filters.slug);
		}
		const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
		const rows = await this.all(
			`SELECT * FROM catalog_items ${where} ORDER BY updated_at DESC, created_at DESC`,
			params,
		);
		const teamIds = await this.teamIdsForPrincipal(principal);
		return rows
			.map(serializeCatalogItem)
			.filter((item) =>
				item.visibility === 'public'
					? item.listingEnabled
					: principalIsAdmin(principal) || teamIds.includes(item.teamId),
			);
	}

	async upsertCatalogArtifactVersion(teamId, itemId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const existing = await this.first(`SELECT * FROM catalog_artifact_versions WHERE item_id = ? AND version = ? LIMIT 1`, [itemId, input.version]);
		if (existing) {
			await this.run(
				`UPDATE catalog_artifact_versions
				 SET team_id = ?, kind = ?, content_key = ?, manifest_key = ?, metadata_json = ?, published_at = ?, updated_at = ?
				 WHERE id = ?`,
				[
					teamId,
					input.kind,
					input.contentKey,
					input.manifestKey ?? null,
					JSON.stringify(input.metadata ?? {}),
					input.publishedAt ?? timestamp,
					timestamp,
					existing.id,
				],
			);
			return serializeCatalogArtifactVersion(await this.first(`SELECT * FROM catalog_artifact_versions WHERE id = ?`, [existing.id]));
		}
		await this.run(
			`INSERT INTO catalog_artifact_versions (
				id, item_id, team_id, kind, version, content_key, manifest_key, metadata_json, published_at, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				itemId,
				teamId,
				input.kind,
				input.version,
				input.contentKey,
				input.manifestKey ?? null,
				JSON.stringify(input.metadata ?? {}),
				input.publishedAt ?? timestamp,
				timestamp,
				timestamp,
			],
		);
		return serializeCatalogArtifactVersion(await this.first(`SELECT * FROM catalog_artifact_versions WHERE id = ?`, [id]));
	}

	async listCatalogArtifactVersions(itemId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM catalog_artifact_versions WHERE item_id = ? ORDER BY published_at DESC, created_at DESC`,
			[itemId],
		);
		return rows.map(serializeCatalogArtifactVersion);
	}

	async listTeamProducts(teamId, principal = null) {
		const items = await this.listCatalogItems(principal, { teamId });
		const latestArtifacts = new Map();
		for (const item of items) {
			const latest = (await this.listCatalogArtifactVersions(item.id))[0] ?? null;
			latestArtifacts.set(item.id, latest);
		}
		return items.map((item) => ({
			...item,
			latestArtifact: latestArtifacts.get(item.id) ?? null,
		}));
	}

	async loadTeamProfileByName(name, principal = null) {
		const team = await this.getTeamByName(name);
		if (!team) return null;
		const [projects, products, knowledgePacks, members] = await Promise.all([
			this.listTeamProjects(team.id),
			this.listTeamProducts(team.id, principal),
			this.all(`SELECT * FROM knowledge_packs WHERE team_id = ? ORDER BY updated_at DESC, created_at DESC`, [team.id]),
			this.listTeamMembers(team.id),
		]);
		const canAccessPrivate = principal ? await this.principalCanAccessTeam(principal, team.id) : false;
		return {
			team,
			members: canAccessPrivate ? members : [],
			activity: {
				projects: canAccessPrivate ? projects : projects.filter((project) => project.metadata?.publicSite === true || project.metadata?.visibility === 'public'),
				catalogItems: products.filter((item) => item.visibility === 'public' && item.listingEnabled || canAccessPrivate),
				knowledgePacks: knowledgePacks.map(serializeKnowledgePack).filter((pack) => pack.visibility === 'public' || canAccessPrivate),
			},
		};
	}

	async evaluateTeamDeletionBlockers(teamId) {
		await this.ensureInitialized();
		const [projects, catalogItems, knowledgePacks, jobs] = await Promise.all([
			this.all(`SELECT id, slug, name FROM projects WHERE team_id = ? ORDER BY created_at ASC LIMIT 20`, [teamId]),
			this.all(`SELECT id, kind, slug, title FROM catalog_items WHERE team_id = ? ORDER BY created_at ASC LIMIT 20`, [teamId]),
			this.all(`SELECT id, slug, name FROM knowledge_packs WHERE team_id = ? ORDER BY created_at ASC LIMIT 20`, [teamId]),
			this.all(
				`SELECT remote_jobs.id, remote_jobs.operation, remote_jobs.status, projects.slug AS project_slug, projects.name AS project_name
				 FROM remote_jobs
				 INNER JOIN projects ON projects.id = remote_jobs.project_id
				 WHERE projects.team_id = ? AND remote_jobs.status IN ('pending', 'claimed', 'running', 'waiting_for_approval')
				 ORDER BY remote_jobs.created_at ASC LIMIT 20`,
				[teamId],
			),
		]);
		return [
			...projects.map((row) => ({ code: 'project', id: row.id, label: row.name, href: `/app/teams/:team/projects/${row.slug}/overview` })),
			...catalogItems.map((row) => ({ code: 'catalog_item', id: row.id, label: row.title, href: `/market/${row.kind === 'knowledge_pack' ? 'knowledge-packs' : 'templates'}/${row.slug}` })),
			...knowledgePacks.map((row) => ({ code: 'knowledge_pack', id: row.id, label: row.name, href: `/market/knowledge-packs/${row.slug}` })),
			...jobs.map((row) => ({ code: 'active_job', id: row.id, label: `${row.project_name}: ${row.operation}`, href: `/app/teams/:team/projects/${row.project_slug}/overview` })),
		];
	}

	async deleteTeam(teamId, confirmation) {
		await this.ensureInitialized();
		const team = await this.getTeam(teamId);
		if (!team) return { ok: false, code: 'missing', message: 'Team not found.' };
		if (!teamDeletionConfirmationMatches(confirmation, team.name)) {
			return { ok: false, code: 'confirmation', message: `Type DELETE ${team.name} to confirm.` };
		}
		const blockers = await this.evaluateTeamDeletionBlockers(teamId);
		if (blockers.length > 0) {
			return { ok: false, code: 'blocked', message: 'Team still has owned content.', blockers };
		}
		await this.run(`DELETE FROM teams WHERE id = ?`, [teamId]);
		return { ok: true, team };
	}

	async listProjectsForPrincipal(principal) {
		await this.ensureInitialized();
		const teamIds = await this.teamIdsForPrincipal(principal);
		if (teamIds.length === 0) {
			return [];
		}
		const placeholders = teamIds.map(() => '?').join(', ');
		const rows = await this.all(
			`SELECT * FROM projects WHERE team_id IN (${placeholders}) ORDER BY created_at ASC`,
			teamIds,
		);
		return rows.map(serializeProject);
	}

	async listTeamProjects(teamId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM projects WHERE team_id = ? ORDER BY created_at ASC`,
			[teamId],
		);
		return rows.map(serializeProject);
	}

	async createProject(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO projects (id, team_id, slug, name, description, metadata_json, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				teamId,
				input.slug,
				input.name,
				input.description ?? null,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		await this.run(
			`INSERT INTO entitlements (id, team_id, project_id, tier, status, metadata_json, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
			[
				randomUUID(),
				teamId,
				id,
				input.entitlementTier ?? 'free',
				JSON.stringify({ seededBy: 'market_control_plane' }),
				timestamp,
				timestamp,
			],
		);
		await this.upsertCatalogItem(teamId, {
			id,
			kind: 'project',
			slug: input.slug,
			title: input.name,
			summary: input.description ?? null,
			visibility: 'team',
			listingEnabled: input.metadata?.listingEnabled === true,
			offerMode: input.entitlementTier ?? 'free',
			manifestKey: input.metadata?.manifestKey ?? null,
			artifactKey: input.metadata?.artifactKey ?? null,
			searchText: [input.name, input.description].filter(Boolean).join(' ').trim() || null,
			metadata: input.metadata ?? {},
		});
		return this.getProjectDetails(id);
	}

	async updateProject(projectId, input) {
		await this.ensureInitialized();
		const existing = await this.first(`SELECT * FROM projects WHERE id = ? LIMIT 1`, [projectId]);
		if (!existing) {
			return null;
		}
		const timestamp = isoNow();
		const metadata = input.metadata ?? parseJson(existing.metadata_json, {});
		await this.run(
			`UPDATE projects
			 SET slug = ?, name = ?, description = ?, metadata_json = ?, updated_at = ?
			 WHERE id = ?`,
			[
				input.slug ?? existing.slug,
				input.name ?? existing.name,
				input.description ?? existing.description ?? null,
				JSON.stringify(metadata),
				timestamp,
				projectId,
			],
		);
		return this.getProject(projectId);
	}

	async getProject(projectId) {
		await this.ensureInitialized();
		return serializeProject(await this.first(`SELECT * FROM projects WHERE id = ?`, [projectId]));
	}

	async getProjectByTeamAndSlug(teamId, slug) {
		await this.ensureInitialized();
		return serializeProject(await this.first(
			`SELECT * FROM projects WHERE team_id = ? AND slug = ? LIMIT 1`,
			[teamId, slug],
		));
	}

	async getProjectConnection(projectId) {
		await this.ensureInitialized();
		return serializeConnection(await this.first(`SELECT * FROM project_connections WHERE project_id = ?`, [projectId]));
	}

	async getProjectHosting(projectId) {
		await this.ensureInitialized();
		return serializeProjectHosting(await this.first(`SELECT * FROM project_hosting WHERE project_id = ?`, [projectId]));
	}

	async upsertProjectHosting(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const existing = await this.first(`SELECT * FROM project_hosting WHERE project_id = ?`, [projectId]);
		const nextMode = projectConnectionModeFromHosting(input.kind, input.registration ?? 'none');
		const metadata = input.metadata ?? parseJson(existing?.metadata_json, {});
		if (existing) {
			await this.run(
				`UPDATE project_hosting
				 SET hosting_kind = ?, registration = ?, market_base_url = ?, source_repo_owner = ?, source_repo_name = ?, source_repo_url = ?, source_repo_workflow_path = ?, metadata_json = ?, updated_at = ?
				 WHERE project_id = ?`,
				[
					input.kind,
					input.registration ?? 'none',
					input.marketBaseUrl ?? null,
					input.sourceRepoOwner ?? null,
					input.sourceRepoName ?? null,
					input.sourceRepoUrl ?? null,
					input.sourceRepoWorkflowPath ?? null,
					JSON.stringify(metadata),
					timestamp,
					projectId,
				],
			);
		} else {
			await this.run(
				`INSERT INTO project_hosting (
					id, project_id, hosting_kind, registration, market_base_url, source_repo_owner, source_repo_name, source_repo_url, source_repo_workflow_path, metadata_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					randomUUID(),
					projectId,
					input.kind,
					input.registration ?? 'none',
					input.marketBaseUrl ?? null,
					input.sourceRepoOwner ?? null,
					input.sourceRepoName ?? null,
					input.sourceRepoUrl ?? null,
					input.sourceRepoWorkflowPath ?? null,
					JSON.stringify(metadata),
					timestamp,
					timestamp,
				],
			);
		}

		const connection = await this.getProjectConnection(projectId);
		await this.upsertProjectConnection(projectId, {
			mode: nextMode,
			projectApiBaseUrl: input.projectApiBaseUrl ?? connection?.projectApiBaseUrl ?? null,
			executionOwner: input.executionOwner ?? connection?.executionOwner ?? (nextMode === 'hosted' ? 'project_api' : 'project_runner'),
			metadata: {
				...(connection?.metadata ?? {}),
				hostingKind: input.kind,
				registration: input.registration ?? 'none',
				marketBaseUrl: input.marketBaseUrl ?? null,
				sourceRepoOwner: input.sourceRepoOwner ?? null,
				sourceRepoName: input.sourceRepoName ?? null,
				sourceRepoUrl: input.sourceRepoUrl ?? null,
				sourceRepoWorkflowPath: input.sourceRepoWorkflowPath ?? null,
			},
		});

		return this.getProjectHosting(projectId);
	}

	async listProjectEnvironments(projectId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM project_environments WHERE project_id = ? ORDER BY environment ASC`,
			[projectId],
		);
		return rows.map(serializeProjectEnvironment);
	}

	async upsertProjectEnvironment(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const existing = await this.first(
			`SELECT * FROM project_environments WHERE project_id = ? AND environment = ? LIMIT 1`,
			[projectId, input.environment],
		);
		if (existing) {
			await this.run(
				`UPDATE project_environments
				 SET deployment_profile = ?, base_url = ?, cloudflare_account_id = ?, pages_project_name = ?, worker_name = ?, r2_bucket_name = ?, d1_database_name = ?, queue_name = ?, railway_project_name = ?, metadata_json = ?, updated_at = ?
				 WHERE project_id = ? AND environment = ?`,
				[
					input.deploymentProfile,
					input.baseUrl ?? null,
					input.cloudflareAccountId ?? null,
					input.pagesProjectName ?? null,
					input.workerName ?? null,
					input.r2BucketName ?? null,
					input.d1DatabaseName ?? null,
					input.queueName ?? null,
					input.railwayProjectName ?? null,
					JSON.stringify(input.metadata ?? parseJson(existing.metadata_json, {})),
					timestamp,
					projectId,
					input.environment,
				],
			);
		} else {
			await this.run(
				`INSERT INTO project_environments (
					id, project_id, environment, deployment_profile, base_url, cloudflare_account_id, pages_project_name, worker_name, r2_bucket_name, d1_database_name, queue_name, railway_project_name, metadata_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					randomUUID(),
					projectId,
					input.environment,
					input.deploymentProfile,
					input.baseUrl ?? null,
					input.cloudflareAccountId ?? null,
					input.pagesProjectName ?? null,
					input.workerName ?? null,
					input.r2BucketName ?? null,
					input.d1DatabaseName ?? null,
					input.queueName ?? null,
					input.railwayProjectName ?? null,
					JSON.stringify(input.metadata ?? {}),
					timestamp,
					timestamp,
				],
			);
		}

		return serializeProjectEnvironment(await this.first(
			`SELECT * FROM project_environments WHERE project_id = ? AND environment = ? LIMIT 1`,
			[projectId, input.environment],
		));
	}

	async listProjectInfrastructureResources(projectId, environment = null) {
		await this.ensureInitialized();
		const rows = environment
			? await this.all(
				`SELECT * FROM project_infrastructure_resources WHERE project_id = ? AND environment = ? ORDER BY provider ASC, resource_kind ASC, logical_name ASC`,
				[projectId, environment],
			)
			: await this.all(
				`SELECT * FROM project_infrastructure_resources WHERE project_id = ? ORDER BY environment ASC, provider ASC, resource_kind ASC, logical_name ASC`,
				[projectId],
			);
		return rows.map(serializeProjectInfrastructureResource);
	}

	async upsertProjectInfrastructureResource(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const existing = await this.first(
			`SELECT * FROM project_infrastructure_resources
			 WHERE project_id = ? AND environment = ? AND provider = ? AND resource_kind = ? AND logical_name = ?
			 LIMIT 1`,
			[projectId, input.environment, input.provider, input.resourceKind, input.logicalName],
		);
		if (existing) {
			await this.run(
				`UPDATE project_infrastructure_resources
				 SET locator = ?, metadata_json = ?, updated_at = ?
				 WHERE id = ?`,
				[
					input.locator ?? null,
					JSON.stringify(input.metadata ?? parseJson(existing.metadata_json, {})),
					timestamp,
					existing.id,
				],
			);
			return serializeProjectInfrastructureResource(await this.first(`SELECT * FROM project_infrastructure_resources WHERE id = ?`, [existing.id]));
		}

		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO project_infrastructure_resources (
				id, project_id, environment, provider, resource_kind, logical_name, locator, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				projectId,
				input.environment,
				input.provider,
				input.resourceKind,
				input.logicalName,
				input.locator ?? null,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		return serializeProjectInfrastructureResource(await this.first(`SELECT * FROM project_infrastructure_resources WHERE id = ?`, [id]));
	}

	async createProjectDeployment(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO project_deployments (
				id, project_id, environment, deployment_kind, status, source_ref, release_tag, commit_sha, triggered_by_type, triggered_by_id, metadata_json, started_at, finished_at, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				projectId,
				input.environment,
				input.deploymentKind,
				input.status ?? 'pending',
				input.sourceRef ?? null,
				input.releaseTag ?? null,
				input.commitSha ?? null,
				input.triggeredByType ?? null,
				input.triggeredById ?? null,
				JSON.stringify(input.metadata ?? {}),
				input.startedAt ?? timestamp,
				input.finishedAt ?? null,
				timestamp,
				timestamp,
			],
		);
		return serializeProjectDeployment(await this.first(`SELECT * FROM project_deployments WHERE id = ?`, [id]));
	}

	async listProjectDeployments(projectId, environment = null) {
		await this.ensureInitialized();
		const rows = environment
			? await this.all(
				`SELECT * FROM project_deployments WHERE project_id = ? AND environment = ? ORDER BY created_at DESC`,
				[projectId, environment],
			)
			: await this.all(
				`SELECT * FROM project_deployments WHERE project_id = ? ORDER BY created_at DESC`,
				[projectId],
			);
		return rows.map(serializeProjectDeployment);
	}

	async upsertAgentPool(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const existing = await this.first(
			`SELECT * FROM agent_pools WHERE project_id = ? AND environment = ? AND name = ? LIMIT 1`,
			[projectId, input.environment, input.name],
		);
		if (existing) {
			await this.run(
				`UPDATE agent_pools
				 SET team_id = ?, registration_identity = ?, service_base_url = ?, status = ?, min_workers = ?, max_workers = ?, target_queue_depth = ?, cooldown_seconds = ?, metadata_json = ?, updated_at = ?
				 WHERE id = ?`,
				[
					input.teamId,
					input.registrationIdentity ?? null,
					input.serviceBaseUrl ?? null,
					input.status ?? 'active',
					input.autoscale?.minWorkers ?? 0,
					input.autoscale?.maxWorkers ?? 1,
					input.autoscale?.targetQueueDepth ?? 1,
					input.autoscale?.cooldownSeconds ?? 60,
					JSON.stringify(input.metadata ?? parseJson(existing.metadata_json, {})),
					timestamp,
					existing.id,
				],
			);
			return serializeAgentPool(await this.first(`SELECT * FROM agent_pools WHERE id = ?`, [existing.id]));
		}

		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO agent_pools (
				id, project_id, team_id, environment, name, registration_identity, service_base_url, status, min_workers, max_workers, target_queue_depth, cooldown_seconds, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				projectId,
				input.teamId,
				input.environment,
				input.name,
				input.registrationIdentity ?? null,
				input.serviceBaseUrl ?? null,
				input.status ?? 'active',
				input.autoscale?.minWorkers ?? 0,
				input.autoscale?.maxWorkers ?? 1,
				input.autoscale?.targetQueueDepth ?? 1,
				input.autoscale?.cooldownSeconds ?? 60,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		return serializeAgentPool(await this.first(`SELECT * FROM agent_pools WHERE id = ?`, [id]));
	}

	async listAgentPools(projectId, environment = null) {
		await this.ensureInitialized();
		const rows = environment
			? await this.all(
				`SELECT * FROM agent_pools WHERE project_id = ? AND environment = ? ORDER BY created_at ASC`,
				[projectId, environment],
			)
			: await this.all(
				`SELECT * FROM agent_pools WHERE project_id = ? ORDER BY environment ASC, created_at ASC`,
				[projectId],
			);
		return rows.map(serializeAgentPool);
	}

	async recordAgentPoolRegistration(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO agent_pool_registrations (
				id, pool_id, project_id, runner_id, manager_id, service_name, heartbeat_at, desired_workers, observed_queue_depth, observed_active_leases, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.poolId,
				projectId,
				input.runnerId ?? null,
				input.managerId ?? null,
				input.serviceName ?? null,
				input.heartbeatAt ?? timestamp,
				input.desiredWorkers ?? null,
				input.observedQueueDepth ?? null,
				input.observedActiveLeases ?? null,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		return serializeAgentPoolRegistration(await this.first(`SELECT * FROM agent_pool_registrations WHERE id = ?`, [id]));
	}

	async listAgentPoolRegistrations(poolId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM agent_pool_registrations WHERE pool_id = ? ORDER BY heartbeat_at DESC`,
			[poolId],
		);
		return rows.map(serializeAgentPoolRegistration);
	}

	async recordAgentPoolScaleDecision(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO agent_pool_scale_decisions (
				id, pool_id, project_id, environment, desired_workers, observed_queue_depth, observed_active_leases, work_day_id, reason, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.poolId,
				projectId,
				input.environment,
				input.desiredWorkers,
				input.observedQueueDepth ?? 0,
				input.observedActiveLeases ?? 0,
				input.workDayId ?? null,
				input.reason,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		return serializeAgentPoolScaleDecision(await this.first(`SELECT * FROM agent_pool_scale_decisions WHERE id = ?`, [id]));
	}

	async listAgentPoolScaleDecisions(poolId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM agent_pool_scale_decisions WHERE pool_id = ? ORDER BY created_at DESC`,
			[poolId],
		);
		return rows.map(serializeAgentPoolScaleDecision);
	}

	async createProjectWorkdaySummary(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO project_workday_summaries (
				id, project_id, environment, work_day_id, kind, state, started_at, ended_at, summary_json, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				projectId,
				input.environment,
				input.workDayId,
				input.kind ?? 'workday_summary',
				input.state ?? null,
				input.startedAt ?? null,
				input.endedAt ?? null,
				JSON.stringify(input.summary ?? {}),
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		return serializeProjectWorkdaySummary(await this.first(`SELECT * FROM project_workday_summaries WHERE id = ?`, [id]));
	}

	async listProjectWorkdaySummaries(projectId, environment = null) {
		await this.ensureInitialized();
		const rows = environment
			? await this.all(
				`SELECT * FROM project_workday_summaries WHERE project_id = ? AND environment = ? ORDER BY created_at DESC`,
				[projectId, environment],
			)
			: await this.all(
				`SELECT * FROM project_workday_summaries WHERE project_id = ? ORDER BY created_at DESC`,
				[projectId],
			);
		return rows.map(serializeProjectWorkdaySummary);
	}

	async getProjectWorkPolicy(projectId, environment) {
		await this.ensureInitialized();
		return serializeWorkPolicy(await this.first(
			`SELECT * FROM work_policies WHERE project_id = ? AND environment = ? LIMIT 1`,
			[projectId, environment],
		));
	}

	async upsertProjectWorkPolicy(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		await this.run(
			`INSERT OR REPLACE INTO work_policies (
				project_id, environment, schedule_json, daily_task_credit_budget, max_queued_tasks, max_queued_credits,
				autoscale_json, credit_weights_json, metadata_json, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM work_policies WHERE project_id = ? AND environment = ?), ?),
				?
			)`,
			[
				projectId,
				input.environment,
				JSON.stringify(input.schedule ?? { timezone: 'UTC', windows: [] }),
				Number(input.dailyTaskCreditBudget ?? 0),
				Number(input.maxQueuedTasks ?? 0),
				Number(input.maxQueuedCredits ?? 0),
				JSON.stringify(input.autoscale ?? {}),
				JSON.stringify(input.creditWeights ?? []),
				JSON.stringify(input.metadata ?? {}),
				projectId,
				input.environment,
				timestamp,
				timestamp,
			],
		);
		return this.getProjectWorkPolicy(projectId, input.environment);
	}

	async listProjectPriorityOverrides(projectId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM priority_overrides WHERE project_id = ? ORDER BY priority DESC, updated_at DESC`,
			[projectId],
		);
		return rows.map(serializePriorityOverride);
	}

	async upsertProjectPriorityOverride(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT OR REPLACE INTO priority_overrides (
				id, project_id, model, subject_id, priority, estimated_credits, metadata_json, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM priority_overrides WHERE id = ?), ?),
				?
			)`,
			[
				id,
				projectId,
				input.model,
				input.subjectId,
				Number(input.priority ?? 0),
				input.estimatedCredits === null || input.estimatedCredits === undefined ? null : Number(input.estimatedCredits),
				JSON.stringify(input.metadata ?? {}),
				id,
				timestamp,
				timestamp,
			],
		);
		return serializePriorityOverride(await this.first(`SELECT * FROM priority_overrides WHERE id = ? LIMIT 1`, [id]));
	}

	async createProjectPrioritySnapshot(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT OR REPLACE INTO priority_snapshots (
				id, project_id, work_day_id, snapshot_json, metadata_json, generated_at, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM priority_snapshots WHERE id = ?), ?),
				?
			)`,
			[
				id,
				projectId,
				input.workDayId ?? null,
				JSON.stringify(input.snapshot ?? {}),
				JSON.stringify(input.metadata ?? {}),
				input.generatedAt ?? timestamp,
				id,
				timestamp,
				timestamp,
			],
		);
		return serializePrioritySnapshot(await this.first(`SELECT * FROM priority_snapshots WHERE id = ? LIMIT 1`, [id]));
	}

	async listProjectPrioritySnapshots(projectId, workDayId = null) {
		await this.ensureInitialized();
		const rows = workDayId
			? await this.all(
				`SELECT * FROM priority_snapshots WHERE project_id = ? AND work_day_id = ? ORDER BY generated_at DESC`,
				[projectId, workDayId],
			)
			: await this.all(
				`SELECT * FROM priority_snapshots WHERE project_id = ? ORDER BY generated_at DESC`,
				[projectId],
			);
		return rows.map(serializePrioritySnapshot);
	}

	async recordProjectTaskCredits(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO task_credit_ledger (
				id, project_id, work_day_id, task_id, phase, credits, metadata_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				projectId,
				input.workDayId,
				input.taskId ?? null,
				input.phase,
				Number(input.credits ?? 0),
				JSON.stringify(input.metadata ?? {}),
				timestamp,
			],
		);
		return serializeTaskCreditLedgerEntry(await this.first(`SELECT * FROM task_credit_ledger WHERE id = ? LIMIT 1`, [id]));
	}

	async listProjectTaskCredits(projectId, workDayId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM task_credit_ledger WHERE project_id = ? AND work_day_id = ? ORDER BY created_at ASC`,
			[projectId, workDayId],
		);
		return rows.map(serializeTaskCreditLedgerEntry);
	}

	async issueRunnerToken(projectId) {
		const token = `prjrun_${randomUUID().replaceAll('-', '')}`;
		const timestamp = isoNow();
		const existing = await this.first(`SELECT * FROM project_connections WHERE project_id = ?`, [projectId]);
		if (existing) {
			await this.run(
				`UPDATE project_connections
				 SET runner_key_prefix = ?, runner_key_hash = ?, updated_at = ?
				 WHERE project_id = ?`,
				[tokenPrefix(token), stableHash(token, this.config.authSecret), timestamp, projectId],
			);
		}
		return token;
	}

	async upsertProjectConnection(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const existing = await this.first(`SELECT * FROM project_connections WHERE project_id = ?`, [projectId]);
		let runnerToken = null;
		if (!existing) {
			runnerToken = `prjrun_${randomUUID().replaceAll('-', '')}`;
			await this.run(
				`INSERT INTO project_connections (
					id, project_id, mode, project_api_base_url, execution_owner, runner_registration_state,
					runner_key_prefix, runner_key_hash, runner_registered_at, runner_last_seen_at, metadata_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
				[
					randomUUID(),
					projectId,
					input.mode,
					input.projectApiBaseUrl ?? null,
					input.executionOwner ?? 'project_runner',
					'pending',
					tokenPrefix(runnerToken),
					stableHash(runnerToken, this.config.authSecret),
					JSON.stringify(input.metadata ?? {}),
					timestamp,
					timestamp,
				],
			);
		} else {
			if (input.rotateRunnerToken === true || !existing.runner_key_hash) {
				runnerToken = `prjrun_${randomUUID().replaceAll('-', '')}`;
			}
			await this.run(
				`UPDATE project_connections
				 SET mode = ?, project_api_base_url = ?, execution_owner = ?, metadata_json = ?,
				     runner_key_prefix = COALESCE(?, runner_key_prefix),
				     runner_key_hash = COALESCE(?, runner_key_hash),
				     updated_at = ?
				 WHERE project_id = ?`,
				[
					input.mode ?? existing.mode,
					input.projectApiBaseUrl ?? existing.project_api_base_url ?? null,
					input.executionOwner ?? existing.execution_owner ?? 'project_runner',
					JSON.stringify(input.metadata ?? parseJson(existing.metadata_json, {})),
					runnerToken ? tokenPrefix(runnerToken) : null,
					runnerToken ? stableHash(runnerToken, this.config.authSecret) : null,
					timestamp,
					projectId,
				],
			);
		}
		return {
			connection: await this.getProjectConnection(projectId),
			runnerToken,
		};
	}

	async authenticateRunner(projectId, token) {
		await this.ensureInitialized();
		const row = await this.first(`SELECT * FROM project_connections WHERE project_id = ?`, [projectId]);
		if (!row?.runner_key_hash) {
			return null;
		}
		const expected = stableHash(token, this.config.authSecret);
		if (!equalHash(expected, row.runner_key_hash)) {
			return null;
		}
		const timestamp = isoNow();
		await this.run(
			`UPDATE project_connections
			 SET runner_registration_state = 'registered',
			     runner_registered_at = COALESCE(runner_registered_at, ?),
			     runner_last_seen_at = ?,
			     updated_at = ?
			 WHERE project_id = ?`,
			[timestamp, timestamp, timestamp, projectId],
		);
		return {
			projectId,
			connection: await this.getProjectConnection(projectId),
		};
	}

	async replaceProjectCapabilities(projectId, grants) {
		await this.ensureInitialized();
		await this.run(`DELETE FROM project_capability_grants WHERE project_id = ?`, [projectId]);
		const timestamp = isoNow();
		for (const grant of grants) {
			await this.run(
				`INSERT INTO project_capability_grants (
					id, project_id, namespace, operation, execution_class, allowed_targets_json, default_dispatch_mode, enabled, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					randomUUID(),
					projectId,
					grant.namespace,
					grant.operation,
					grant.executionClass,
					JSON.stringify(grant.allowedTargets ?? []),
					grant.defaultDispatchMode ?? 'auto',
					grant.enabled === false ? 0 : 1,
					timestamp,
					timestamp,
				],
			);
		}
		return this.listProjectCapabilities(projectId);
	}

	async listProjectCapabilities(projectId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM project_capability_grants WHERE project_id = ? ORDER BY namespace ASC, operation ASC`,
			[projectId],
		);
		return rows.map(serializeCapability);
	}

	async getEffectiveCapability(projectId, namespace, operation) {
		await this.ensureInitialized();
		const row = await this.first(
			`SELECT * FROM project_capability_grants WHERE project_id = ? AND namespace = ? AND operation = ? LIMIT 1`,
			[projectId, namespace, operation],
		);
		return serializeCapability(row);
	}

	async getProjectDetails(projectId) {
		await this.ensureInitialized();
		const project = await this.getProject(projectId);
		if (!project) {
			return null;
		}
		const [connection, capabilityGrants, entitlement, hosting, environments, resources, deployments, agentPools] = await Promise.all([
			this.getProjectConnection(projectId),
			this.listProjectCapabilities(projectId),
			(async () => serializeEntitlement(await this.first(`SELECT * FROM entitlements WHERE project_id = ? LIMIT 1`, [projectId])))(),
			this.getProjectHosting(projectId),
			this.listProjectEnvironments(projectId),
			this.listProjectInfrastructureResources(projectId),
			this.listProjectDeployments(projectId),
			this.listAgentPools(projectId),
		]);
		return {
			project,
			connection,
			capabilityGrants,
			entitlement,
			hosting,
			environments,
			resources,
			deployments,
			agentPools,
		};
	}

	async listRecentJobsForProject(projectId, limit = 10) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM remote_jobs WHERE project_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT ?`,
			[projectId, Math.max(1, Math.min(Number(limit) || 10, 50))],
		);
		return rows.map(serializeJob);
	}

	async listProjectActivity(projectId, limit = 12) {
		const [jobs, deployments] = await Promise.all([
			this.listRecentJobsForProject(projectId, limit),
			this.listProjectDeployments(projectId),
		]);
		return [
			...jobs.map((job) => toActivityItem('job', {
				id: job.id,
				title: `${job.namespace}:${job.operation}`,
				status: job.status,
				timestamp: latestDate(job.finishedAt, job.updatedAt, job.createdAt),
				summary: typeof job.output?.summary === 'string' ? job.output.summary : null,
				metadata: {
					selectedTarget: job.selectedTarget,
				},
			})),
			...deployments.map((deployment) => toActivityItem('deployment', {
				id: deployment.id,
				title: `${deployment.environment} ${deployment.deploymentKind} deployment`,
				status: deployment.status,
				timestamp: latestDate(deployment.finishedAt, deployment.startedAt, deployment.createdAt),
				summary: deployment.releaseTag ? `Release ${deployment.releaseTag}` : deployment.sourceRef,
				metadata: {
					releaseTag: deployment.releaseTag,
					commitSha: deployment.commitSha,
				},
			})),
		]
			.filter((item) => item.timestamp)
			.sort((left, right) => compareDatesDesc(left.timestamp, right.timestamp))
			.slice(0, limit);
	}

	async getProjectSummary(projectId, principal = null) {
		const details = await this.getProjectDetails(projectId);
		if (!details) {
			return null;
		}

		const [runtimeSummary, jobs, activity, products] = await Promise.all([
			this.requestProjectRuntime(projectId, principal, '/v1/project/summary'),
			this.listRecentJobsForProject(projectId, 12),
			this.listProjectActivity(projectId, 12),
			this.listCatalogArtifactVersions(projectId),
		]);
		const latestProdDeployment = details.deployments
			.filter((deployment) => deployment.environment === 'prod')
			.sort((left, right) => compareDatesDesc(latestDate(left.finishedAt, left.createdAt), latestDate(right.finishedAt, right.createdAt)))[0] ?? null;
		const latestStagingDeployment = details.deployments
			.filter((deployment) => deployment.environment === 'staging')
			.sort((left, right) => compareDatesDesc(latestDate(left.finishedAt, left.createdAt), latestDate(right.finishedAt, right.createdAt)))[0] ?? null;
		const health = summarizeProjectHealth({
			hosting: details.hosting,
			connection: details.connection,
			deployments: details.deployments,
			jobs,
		});
		const metadata = details.project.metadata ?? {};
		const runtimeCounts = typeof runtimeSummary?.counts === 'object' && runtimeSummary.counts ? runtimeSummary.counts : {};
		const runtimeConnection = typeof runtimeSummary?.connection === 'object' && runtimeSummary.connection ? runtimeSummary.connection : null;
		return {
			project: details.project,
			teamId: details.project.teamId,
			health: runtimeSummary?.health ?? health,
			counts: {
				objectives: Number(runtimeCounts.objectives ?? metadata.objectiveCount ?? metadata.objectives ?? 0),
				questions: Number(runtimeCounts.questions ?? metadata.questionCount ?? 0),
				notes: Number(runtimeCounts.notes ?? metadata.noteCount ?? 0),
				proposals: Number(runtimeCounts.proposals ?? metadata.proposalCount ?? 0),
				decisions: Number(runtimeCounts.decisions ?? metadata.decisionCount ?? 0),
				activeWorkstreams: Number(runtimeCounts.activeWorkstreams ?? (Array.isArray(metadata.workstreams) ? metadata.workstreams.length : 0)),
				agentPools: details.agentPools.length,
				agents: Number(runtimeCounts.agents ?? details.agentPools.length),
				releases: Number(runtimeCounts.releases ?? details.deployments.filter((deployment) => deployment.environment === 'prod' && deployment.status === 'succeeded').length),
				artifacts: products.length,
			},
			environments: details.environments,
			connection: runtimeConnection
				? {
					...details.connection,
					...runtimeConnection,
					projectId,
					connection: details.connection,
					executionOwner: details.connection?.executionOwner ?? null,
				}
				: details.connection,
			hosting: details.hosting,
			agentPools: details.agentPools,
			latestProdDeployment: summarizeDeploymentStatus(latestProdDeployment),
			latestStagingDeployment: summarizeDeploymentStatus(latestStagingDeployment),
			recentActivity: Array.isArray(runtimeSummary?.recentActivity) && runtimeSummary.recentActivity.length > 0 ? runtimeSummary.recentActivity : activity,
			nextBestAction: typeof runtimeSummary?.nextBestAction === 'string' && runtimeSummary.nextBestAction.trim()
				? runtimeSummary.nextBestAction
				: health.state === 'setup_needed'
				? 'Configure hosting and connect a project runtime.'
				: health.state === 'release_ready'
					? 'Review the latest staging candidate and decide whether to release.'
					: health.state === 'verification_failing'
						? 'Inspect the latest failed deployment or workflow run.'
						: 'Open Direct or Workstreams to continue knowledge work.',
		};
	}

	async getProjectDirectSummary(projectId, principal = null) {
		const project = await this.getProject(projectId);
		if (!project) {
			return null;
		}
		const runtimeSummary = await this.requestProjectRuntime(projectId, principal, '/v1/direct/summary');
		if (runtimeSummary) {
			return {
				...runtimeSummary,
				items: Array.isArray(runtimeSummary.items)
					? runtimeSummary.items.map((item) => ({
						...item,
						kind: item.model,
						status: item.status ?? null,
					}))
					: [],
			};
		}
		const metadata = project.metadata ?? {};
		return {
			projectId,
			objectiveCount: Number(metadata.objectiveCount ?? 0),
			questionCount: Number(metadata.questionCount ?? 0),
			noteCount: Number(metadata.noteCount ?? 0),
			proposalCount: Number(metadata.proposalCount ?? 0),
			decisionCount: Number(metadata.decisionCount ?? 0),
			savedViews: Array.isArray(metadata.directViews) && metadata.directViews.length > 0
				? metadata.directViews
				: ['Now', 'Blocked', 'Ready for research', 'Ready for build', 'Release-linked'],
			items: Array.isArray(metadata.directItems) ? metadata.directItems : [],
		};
	}

	async getProjectWorkstreamsSummary(projectId, principal = null) {
		const project = await this.getProject(projectId);
		if (!project) {
			return null;
		}
		const [runtimeSummary, jobs] = await Promise.all([
			this.requestProjectRuntime(projectId, principal, '/v1/workstreams'),
			this.listRecentJobsForProject(projectId, 12),
		]);
		if (runtimeSummary) {
			return {
				projectId,
				items: Array.isArray(runtimeSummary.items)
					? runtimeSummary.items.map((item) => ({
						...item,
						status: item.state ?? item.status ?? null,
					}))
					: [],
				recentJobs: jobs,
				columns: Array.isArray(runtimeSummary.columns) ? runtimeSummary.columns : ['Drafting', 'Active locally', 'Verifying', 'Saved remotely', 'In staging', 'Archived'],
			};
		}
		const metadata = project.metadata ?? {};
		return {
			projectId,
			items: Array.isArray(metadata.workstreams) ? metadata.workstreams : [],
			recentJobs: jobs,
			columns: ['Drafting', 'Active locally', 'Verifying', 'Saved remotely', 'In staging', 'Archived'],
		};
	}

	async getProjectAgentsSummary(projectId, principal = null) {
		const details = await this.getProjectDetails(projectId);
		if (!details) {
			return null;
		}
		const [statusPayload, messagePayload, workdaySummaries] = await Promise.all([
			this.requestProjectRuntime(projectId, principal, '/v1/agents/status'),
			this.requestProjectRuntime(projectId, principal, '/v1/agents/messages'),
			this.all(
				`SELECT * FROM project_workday_summaries WHERE project_id = ? ORDER BY created_at DESC LIMIT 6`,
				[projectId],
			),
		]);
		return {
			projectId,
			pools: details.agentPools,
			agents: Array.isArray(statusPayload?.agents) ? statusPayload.agents : [],
			messages: Array.isArray(messagePayload) ? messagePayload : [],
			workdaySummaries: workdaySummaries.map((row) => ({
				id: row.id,
				environment: row.environment,
				kind: row.kind,
				state: row.state,
				summary: parseJson(row.summary_json, {}),
				createdAt: row.created_at,
			})),
		};
	}

	async getProjectReleasesSummary(projectId, principal = null) {
		const details = await this.getProjectDetails(projectId);
		if (!details) {
			return null;
		}
		const runtimeSummary = await this.requestProjectRuntime(projectId, principal, '/v1/releases');
		if (runtimeSummary) {
			return runtimeSummary;
		}
		const deployments = [...details.deployments].sort((left, right) =>
			compareDatesDesc(latestDate(left.finishedAt, left.startedAt, left.createdAt), latestDate(right.finishedAt, right.startedAt, right.createdAt)),
		);
		return {
			projectId,
			currentProd: summarizeDeploymentStatus(deployments.find((deployment) => deployment.environment === 'prod') ?? null),
			stagingCandidates: deployments
				.filter((deployment) => deployment.environment === 'staging')
				.map(summarizeDeploymentStatus)
				.filter(Boolean),
			history: deployments.map(summarizeDeploymentStatus).filter(Boolean),
		};
	}

	async getProjectShareSummary(projectId, principal = null) {
		const [project, item, artifacts, runtimeSummary] = await Promise.all([
			this.getProject(projectId),
			this.getCatalogItem(projectId),
			this.listCatalogArtifactVersions(projectId),
			this.requestProjectRuntime(projectId, principal, '/v1/share/status'),
		]);
		if (!project) {
			return null;
		}
		return {
			projectId,
			project,
			listing: runtimeSummary?.listing ?? item,
			artifacts,
			packages: Array.isArray(runtimeSummary?.packages) ? runtimeSummary.packages : [],
			canPublish: runtimeSummary?.canPublish === true || Boolean(item && item.listingEnabled),
		};
	}

	async listPersistedTeamInboxItems(teamId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM team_inbox_items WHERE team_id = ? ORDER BY created_at DESC`,
			[teamId],
		);
		return rows.map(serializeTeamInboxItem);
	}

	async getProjectSummarySnapshot(projectId) {
		await this.ensureInitialized();
		return serializeProjectSummarySnapshot(await this.first(
			`SELECT * FROM project_summary_snapshots WHERE project_id = ? LIMIT 1`,
			[projectId],
		));
	}

	async upsertProjectSummarySnapshot(projectId, teamId, summary) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		await this.run(
			`INSERT OR REPLACE INTO project_summary_snapshots (
				project_id, team_id, summary_json, generated_at, created_at, updated_at
			) VALUES (
				?, ?, ?, ?,
				COALESCE((SELECT created_at FROM project_summary_snapshots WHERE project_id = ?), ?),
				?
			)`,
			[
				projectId,
				teamId,
				JSON.stringify(summary ?? {}),
				timestamp,
				projectId,
				timestamp,
				timestamp,
			],
		);
		return this.getProjectSummarySnapshot(projectId);
	}

	async upsertTeamInboxItem(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT OR REPLACE INTO team_inbox_items (
				id, team_id, project_id, kind, state, title, summary, href, item_key, metadata_json, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM team_inbox_items WHERE id = ?), ?),
				?
			)`,
			[
				id,
				teamId,
				input.projectId ?? null,
				input.kind,
				input.state,
				input.title,
				input.summary ?? null,
				input.href ?? null,
				input.itemKey ?? null,
				JSON.stringify(input.metadata ?? {}),
				id,
				timestamp,
				timestamp,
			],
		);
		return serializeTeamInboxItem(await this.first(`SELECT * FROM team_inbox_items WHERE id = ? LIMIT 1`, [id]));
	}

	async deleteTeamInboxItem(id) {
		await this.ensureInitialized();
		await this.run(`DELETE FROM team_inbox_items WHERE id = ?`, [id]);
	}

	async deleteTeamInboxItemsByItemKey(teamId, itemKey) {
		await this.ensureInitialized();
		await this.run(`DELETE FROM team_inbox_items WHERE team_id = ? AND item_key = ?`, [teamId, itemKey]);
	}

	async listTeamInboxItems(teamId, principal = null) {
		const team = await this.getTeam(teamId);
		if (!team) {
			return [];
		}
		const projects = await this.listTeamProjects(teamId);
		const [persistedItems] = await Promise.all([
			this.listPersistedTeamInboxItems(teamId),
		]);
		const items = [...persistedItems];
		for (const project of projects) {
			const [summary, jobs, products] = await Promise.all([
				this.getProjectSummary(project.id, principal),
				this.listRecentJobsForProject(project.id, 10),
				this.listCatalogArtifactVersions(project.id),
			]);
			const failedJob = jobs.find((job) => job.status === 'failed');
			if (failedJob) {
				items.push({
					id: `job:${failedJob.id}`,
					teamId,
					projectId: project.id,
					kind: 'failure',
					state: 'action_required',
					title: `${project.name}: ${failedJob.operation} failed`,
					summary: `The latest ${failedJob.namespace}:${failedJob.operation} run failed and needs review.`,
					href: `/app/teams/${team.name}/projects/${project.slug}/overview`,
					createdAt: latestDate(failedJob.finishedAt, failedJob.updatedAt, failedJob.createdAt),
				});
			}
			if (summary?.latestStagingDeployment?.status === 'succeeded') {
				const releaseTag = summary.latestStagingDeployment.releaseTag;
				if (!summary.latestProdDeployment || summary.latestProdDeployment.releaseTag !== releaseTag) {
					items.push({
						id: `release:${project.id}:${releaseTag ?? summary.latestStagingDeployment.id}`,
						teamId,
						projectId: project.id,
						kind: 'release',
						state: 'waiting_for_approval',
						title: `${project.name}: staging candidate ready`,
						summary: 'A verified staging deployment is ready for human release review.',
						href: `/app/teams/${team.name}/projects/${project.slug}/releases`,
						createdAt: latestDate(summary.latestStagingDeployment.finishedAt, summary.latestStagingDeployment.startedAt),
					});
				}
			}
			if (products.length > 0 && !(summary?.latestProdDeployment?.releaseTag ?? null)) {
				items.push({
					id: `share:${project.id}`,
					teamId,
					projectId: project.id,
					kind: 'share',
					state: 'informational',
					title: `${project.name}: artifacts available`,
					summary: 'Release artifacts exist for this project and can be packaged for market distribution.',
					href: `/app/teams/${team.name}/projects/${project.slug}/share`,
					createdAt: products[0].publishedAt,
				});
			}
		}
		return items
			.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
			.filter((item) => item.createdAt)
			.sort((left, right) => compareDatesDesc(left.createdAt, right.createdAt))
			.slice(0, 20);
	}

	async getTeamHomeSummary(teamId, principal = null) {
		const team = await this.getTeam(teamId);
		if (!team) {
			return null;
		}
		if (principal && !(await this.principalCanAccessTeam(principal, teamId))) {
			return null;
		}

		const [members, projects, products, inbox] = await Promise.all([
			this.listTeamMembers(teamId),
			this.listTeamProjects(teamId),
			this.listTeamProducts(teamId, principal),
			this.listTeamInboxItems(teamId, principal),
		]);
		const projectSummaries = (await Promise.all(projects.map((project) => this.getProjectSummary(project.id, principal)))).filter(Boolean);
		const publishedProducts = products.filter((item) => item.visibility === 'public' && item.listingEnabled);
		const activeAgents = projectSummaries.flatMap((summary) =>
			Array.isArray(summary?.agentPools)
				? summary.agentPools.filter((pool) => ['active', 'degraded'].includes(pool.status))
				: [],
		);
		const readyToRelease = projectSummaries.filter((summary) =>
			summary?.latestStagingDeployment?.status === 'succeeded'
			&& (!summary.latestProdDeployment || summary.latestProdDeployment.releaseTag !== summary.latestStagingDeployment.releaseTag),
		);
		return {
			team,
			members,
			counts: {
				projects: projects.length,
				releaseReady: readyToRelease.length,
				activeAgents: activeAgents.length,
				liveListings: publishedProducts.length,
				inbox: inbox.length,
			},
			continueWorking: projectSummaries.slice(0, 6),
			readyToRelease,
			activeAgents,
			publishedProducts,
			inbox,
		};
	}

	async createKnowledgePack(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO knowledge_packs (
				id, team_id, slug, name, summary, source_kind, source_ref, install_strategy, visibility, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				teamId,
				input.slug,
				input.name,
				input.summary ?? null,
				input.sourceKind ?? 'market_import',
				input.sourceRef ?? null,
				input.installStrategy ?? 'import_export',
				input.visibility ?? 'private',
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		await this.upsertCatalogItem(teamId, {
			id,
			kind: 'knowledge_pack',
			slug: input.slug,
			title: input.name,
			summary: input.summary ?? null,
			visibility: input.visibility ?? 'private',
			listingEnabled: input.metadata?.listingEnabled === true,
			offerMode: input.metadata?.offerMode ?? (input.visibility === 'public' ? 'free' : 'private'),
			manifestKey: input.metadata?.manifestKey ?? null,
			artifactKey: input.metadata?.artifactKey ?? null,
			searchText: [input.name, input.summary].filter(Boolean).join(' ').trim() || null,
			metadata: {
				sourceKind: input.sourceKind ?? 'market_import',
				sourceRef: input.sourceRef ?? null,
				installStrategy: input.installStrategy ?? 'import_export',
				...(input.metadata ?? {}),
			},
		});
		return serializeKnowledgePack(await this.first(`SELECT * FROM knowledge_packs WHERE id = ?`, [id]));
	}

	async listKnowledgePacks(principal) {
		await this.ensureInitialized();
		const teamIds = await this.teamIdsForPrincipal(principal);
		const rows = await this.all(`SELECT * FROM knowledge_packs ORDER BY created_at ASC`);
		return rows
			.map(serializeKnowledgePack)
			.filter((pack) => pack.visibility === 'public' || principalIsAdmin(principal) || teamIds.includes(pack.teamId));
	}

	async appendJobEvent(jobId, kind, data = {}) {
		await this.ensureInitialized();
		const row = await this.first(
			`SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM remote_job_events WHERE job_id = ?`,
			[jobId],
		);
		const seq = Number(row?.next_seq ?? 1);
		const timestamp = isoNow();
		const id = randomUUID();
		await this.run(
			`INSERT INTO remote_job_events (id, job_id, seq, kind, data_json, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[id, jobId, seq, kind, JSON.stringify(data), timestamp],
		);
		return serializeJobEvent(await this.first(`SELECT * FROM remote_job_events WHERE id = ?`, [id]));
	}

	async listJobEvents(jobId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM remote_job_events WHERE job_id = ? ORDER BY seq ASC`,
			[jobId],
		);
		return rows.map(serializeJobEvent);
	}

	async findJobById(jobId) {
		await this.ensureInitialized();
		return serializeJob(await this.first(`SELECT * FROM remote_jobs WHERE id = ?`, [jobId]));
	}

	async createJob(input) {
		await this.ensureInitialized();
		if (input.idempotencyKey) {
			const existing = await this.first(
				`SELECT * FROM remote_jobs WHERE project_id = ? AND idempotency_key = ? ORDER BY created_at DESC LIMIT 1`,
				[input.projectId, input.idempotencyKey],
			);
			if (existing) {
				return serializeJob(existing);
			}
		}
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const initialStatus = typeof input.status === 'string' && input.status.trim() ? input.status.trim() : 'pending';
		await this.run(
			`INSERT INTO remote_jobs (
				id, project_id, namespace, operation, status, preferred_mode, selected_target, capability_json,
				input_json, output_json, error_json, requested_by_type, requested_by_id, assigned_runner_id,
				idempotency_key, created_at, updated_at, started_at, finished_at, cancelled_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, NULL, ?, ?, ?, NULL, NULL, NULL)`,
			[
				id,
				input.projectId,
				input.namespace,
				input.operation,
				initialStatus,
				input.preferredMode ?? 'auto',
				input.selectedTarget,
				JSON.stringify(input.capability ?? null),
				JSON.stringify(input.input ?? {}),
				input.requestedByType,
				input.requestedById ?? null,
				input.idempotencyKey ?? null,
				timestamp,
				timestamp,
			],
		);
		await this.appendJobEvent(id, 'created', {
			namespace: input.namespace,
			operation: input.operation,
			selectedTarget: input.selectedTarget,
			status: initialStatus,
		});
		return this.findJobById(id);
	}

	async cancelJob(jobId) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		await this.run(
			`UPDATE remote_jobs
			 SET status = CASE
			 	WHEN status IN ('completed', 'failed', 'cancelled') THEN status
			 	ELSE 'cancelled'
			 END,
			     cancelled_at = CASE
			     	WHEN status IN ('completed', 'failed', 'cancelled') THEN cancelled_at
			     	ELSE ?
			     END,
			     updated_at = ?
			 WHERE id = ?`,
			[timestamp, timestamp, jobId],
		);
		await this.appendJobEvent(jobId, 'cancelled', {});
		return this.findJobById(jobId);
	}

	async pullJobsForRunner(projectId, input = {}) {
		await this.ensureInitialized();
		const limit = Math.max(1, Math.min(Number(input.limit ?? 1), 20));
		const rows = await this.all(
			`SELECT * FROM remote_jobs
			 WHERE project_id = ? AND status = 'pending'
			 ORDER BY created_at ASC
			 LIMIT ?`,
			[projectId, limit],
		);
		const claimed = [];
		for (const row of rows) {
			const timestamp = isoNow();
			await this.run(
				`UPDATE remote_jobs
				 SET status = 'claimed',
				     assigned_runner_id = ?,
				     started_at = COALESCE(started_at, ?),
				     updated_at = ?
				 WHERE id = ?`,
				[input.runnerId ?? `runner-${projectId}`, timestamp, timestamp, row.id],
			);
			await this.appendJobEvent(row.id, 'claimed', {
				runnerId: input.runnerId ?? `runner-${projectId}`,
			});
			claimed.push(await this.findJobById(row.id));
		}
		return claimed;
	}

	async recordJobProgress(jobId, input = {}) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		await this.run(
			`UPDATE remote_jobs
			 SET status = CASE WHEN status IN ('pending', 'claimed', 'waiting_for_approval') THEN 'running' ELSE status END,
			     updated_at = ?
			 WHERE id = ?`,
			[timestamp, jobId],
		);
		await this.appendJobEvent(jobId, 'progress', {
			summary: input.summary ?? null,
			...(input.data ?? {}),
		});
		return this.findJobById(jobId);
	}

	async completeJob(jobId, input = {}) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		await this.run(
			`UPDATE remote_jobs
			 SET status = 'completed',
			     output_json = ?,
			     error_json = NULL,
			     finished_at = ?,
			     updated_at = ?
			 WHERE id = ?`,
			[JSON.stringify(input.output ?? null), timestamp, timestamp, jobId],
		);
		await this.appendJobEvent(jobId, 'completed', {});
		return this.findJobById(jobId);
	}

	async failJob(jobId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		await this.run(
			`UPDATE remote_jobs
			 SET status = 'failed',
			     error_json = ?,
			     finished_at = ?,
			     updated_at = ?
			 WHERE id = ?`,
			[JSON.stringify({ code: input.code ?? null, message: input.message }), timestamp, timestamp, jobId],
		);
		await this.appendJobEvent(jobId, 'failed', {
			code: input.code ?? null,
			message: input.message,
		});
		return this.findJobById(jobId);
	}
}
