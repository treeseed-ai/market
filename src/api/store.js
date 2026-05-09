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
	'../../migrations/0014_team_web_hosts.sql',
	'../../migrations/0018_capacity_providers.sql',
	'../../migrations/0020_hub_launch_spine.sql',
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
const CAPABILITY_PERMISSIONS = {
	launch_projects: 'project:create',
	edit_direct: 'project:edit',
	manage_workstreams: 'project:workstream:manage',
	stage_releases: 'project:stage:admin',
	publish_releases: 'project:production:admin',
	publish_market_listings: 'catalog:publish',
	manage_products: 'catalog:manage',
	manage_billing: 'billing:manage',
	approve_remote_execution: 'remote:execution:approve',
};
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

function serializeTeamWebHost(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		provider: row.provider,
		ownership: row.ownership,
		name: row.name,
		accountLabel: row.account_label,
		allowedEnvironments: parseJson(row.allowed_environments_json, []),
		status: row.status,
		encryptedPayload: parseJson(row.encrypted_payload_json, null),
		metadata: parseJson(row.metadata_json, {}),
		createdById: row.created_by_id,
		updatedById: row.updated_by_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

const SUPPORTED_TEAM_HOST_PROVIDERS = new Set(['cloudflare', 'railway', 'openai', 'github_copilot', 'openrouter', 'custom']);

function serializeCapacityProvider(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		ownerTeamId: row.owner_team_id,
		name: row.name,
		kind: row.kind,
		status: row.status,
		provider: row.provider,
		billingScope: row.billing_scope,
		monthlyCreditBudget: Number(row.monthly_credit_budget ?? 0),
		dailyCreditBudget: Number(row.daily_credit_budget ?? 0),
		maxConcurrentWorkdays: Number(row.max_concurrent_workdays ?? 1),
		maxConcurrentWorkers: Number(row.max_concurrent_workers ?? 1),
		capacityModel: parseJson(row.capacity_model_json, {}),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeCapacityProviderHost(row) {
	if (!row) return null;
	return {
		id: row.id,
		capacityProviderId: row.capacity_provider_id,
		hostId: row.host_id,
		role: row.role,
		required: Number(row.required ?? 1) === 1,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeCapacityProviderLane(row) {
	if (!row) return null;
	return {
		id: row.id,
		capacityProviderId: row.capacity_provider_id,
		name: row.name,
		businessModel: row.business_model,
		modelFamily: row.model_family,
		modelClass: row.model_class,
		regionPolicy: row.region_policy,
		unit: row.unit,
		scarcityLevel: row.scarcity_level,
		hardLimits: parseJson(row.hard_limits_json, {}),
		routingPolicy: parseJson(row.routing_policy_json, {}),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeCapacityGrant(row) {
	if (!row) return null;
	return {
		id: row.id,
		capacityProviderId: row.capacity_provider_id,
		laneId: row.lane_id,
		grantScope: row.grant_scope,
		teamId: row.team_id,
		projectId: row.project_id,
		environment: row.environment,
		state: row.state,
		dailyCreditLimit: row.daily_credit_limit == null ? null : Number(row.daily_credit_limit),
		weeklyCreditLimit: row.weekly_credit_limit == null ? null : Number(row.weekly_credit_limit),
		monthlyCreditLimit: row.monthly_credit_limit == null ? null : Number(row.monthly_credit_limit),
		dailyUsdLimit: row.daily_usd_limit == null ? null : Number(row.daily_usd_limit),
		weeklyQuotaMinutes: row.weekly_quota_minutes == null ? null : Number(row.weekly_quota_minutes),
		monthlyProviderUnits: row.monthly_provider_units == null ? null : Number(row.monthly_provider_units),
		priorityWeight: Number(row.priority_weight ?? 1),
		overflowPolicy: row.overflow_policy,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeCapacityReservation(row) {
	if (!row) return null;
	return {
		id: row.id,
		capacityProviderId: row.capacity_provider_id,
		laneId: row.lane_id,
		teamId: row.team_id,
		projectId: row.project_id,
		workDayId: row.work_day_id,
		taskId: row.task_id,
		state: row.state,
		reservedCredits: Number(row.reserved_credits ?? 0),
		consumedCredits: Number(row.consumed_credits ?? 0),
		reservedProviderUnits: row.reserved_provider_units == null ? null : Number(row.reserved_provider_units),
		consumedProviderUnits: row.consumed_provider_units == null ? null : Number(row.consumed_provider_units),
		reservedUsd: row.reserved_usd == null ? null : Number(row.reserved_usd),
		consumedUsd: row.consumed_usd == null ? null : Number(row.consumed_usd),
		expiresAt: row.expires_at,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeCapacityLedgerEntry(row) {
	if (!row) return null;
	return {
		id: row.id,
		capacityProviderId: row.capacity_provider_id,
		laneId: row.lane_id,
		reservationId: row.reservation_id,
		teamId: row.team_id,
		projectId: row.project_id,
		workDayId: row.work_day_id,
		taskId: row.task_id,
		phase: row.phase,
		credits: Number(row.credits ?? 0),
		providerUnits: row.provider_units == null ? null : Number(row.provider_units),
		usd: row.usd == null ? null : Number(row.usd),
		source: row.source,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
	};
}

function serializeCapacityRoutingDecision(row) {
	if (!row) return null;
	return {
		id: row.id,
		taskId: row.task_id,
		workDayId: row.work_day_id,
		projectId: row.project_id,
		selectedProviderId: row.selected_provider_id,
		selectedLaneId: row.selected_lane_id,
		selectedModel: row.selected_model,
		decision: row.decision,
		reason: row.reason,
		candidates: parseJson(row.candidate_json, []),
		scores: parseJson(row.score_json, {}),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
	};
}

function serializeTaskEstimate(row) {
	if (!row) return null;
	return {
		id: row.id,
		taskId: row.task_id,
		workDayId: row.work_day_id,
		projectId: row.project_id,
		estimatePhase: row.estimate_phase,
		taskSignature: row.task_signature,
		confidence: row.confidence,
		estimatedCreditsP50: Number(row.estimated_credits_p50 ?? 0),
		estimatedCreditsP90: Number(row.estimated_credits_p90 ?? 0),
		reservedCredits: Number(row.reserved_credits ?? 0),
		estimatedInputTokensP50: row.estimated_input_tokens_p50 == null ? null : Number(row.estimated_input_tokens_p50),
		estimatedInputTokensP90: row.estimated_input_tokens_p90 == null ? null : Number(row.estimated_input_tokens_p90),
		estimatedOutputTokensP50: row.estimated_output_tokens_p50 == null ? null : Number(row.estimated_output_tokens_p50),
		estimatedOutputTokensP90: row.estimated_output_tokens_p90 == null ? null : Number(row.estimated_output_tokens_p90),
		estimatedQuotaMinutesP50: row.estimated_quota_minutes_p50 == null ? null : Number(row.estimated_quota_minutes_p50),
		estimatedQuotaMinutesP90: row.estimated_quota_minutes_p90 == null ? null : Number(row.estimated_quota_minutes_p90),
		features: parseJson(row.features_json, {}),
		createdAt: row.created_at,
	};
}

function serializeTaskUsageActual(row) {
	if (!row) return null;
	return {
		id: row.id,
		taskId: row.task_id,
		workDayId: row.work_day_id,
		projectId: row.project_id,
		taskSignature: row.task_signature,
		capacityProviderId: row.capacity_provider_id,
		laneId: row.lane_id,
		businessModel: row.business_model,
		modelName: row.model_name,
		inputTokens: row.input_tokens == null ? null : Number(row.input_tokens),
		outputTokens: row.output_tokens == null ? null : Number(row.output_tokens),
		cachedInputTokens: row.cached_input_tokens == null ? null : Number(row.cached_input_tokens),
		quotaMinutes: row.quota_minutes == null ? null : Number(row.quota_minutes),
		wallMinutes: row.wall_minutes == null ? null : Number(row.wall_minutes),
		filesOpened: row.files_opened == null ? null : Number(row.files_opened),
		filesChanged: row.files_changed == null ? null : Number(row.files_changed),
		diffLinesAdded: row.diff_lines_added == null ? null : Number(row.diff_lines_added),
		diffLinesRemoved: row.diff_lines_removed == null ? null : Number(row.diff_lines_removed),
		testRuns: row.test_runs == null ? null : Number(row.test_runs),
		retryCount: row.retry_count == null ? null : Number(row.retry_count),
		actualCredits: Number(row.actual_credits ?? 0),
		actualUsd: row.actual_usd == null ? null : Number(row.actual_usd),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
	};
}

function serializeTaskEstimateProfile(row) {
	if (!row) return null;
	return {
		taskSignature: row.task_signature,
		sampleCount: Number(row.sample_count ?? 0),
		inputTokensP50: row.input_tokens_p50 == null ? null : Number(row.input_tokens_p50),
		inputTokensP90: row.input_tokens_p90 == null ? null : Number(row.input_tokens_p90),
		outputTokensP50: row.output_tokens_p50 == null ? null : Number(row.output_tokens_p50),
		outputTokensP90: row.output_tokens_p90 == null ? null : Number(row.output_tokens_p90),
		quotaMinutesP50: row.quota_minutes_p50 == null ? null : Number(row.quota_minutes_p50),
		quotaMinutesP90: row.quota_minutes_p90 == null ? null : Number(row.quota_minutes_p90),
		filesChangedP50: row.files_changed_p50 == null ? null : Number(row.files_changed_p50),
		filesChangedP90: row.files_changed_p90 == null ? null : Number(row.files_changed_p90),
		creditsP50: row.credits_p50 == null ? null : Number(row.credits_p50),
		creditsP90: row.credits_p90 == null ? null : Number(row.credits_p90),
		updatedAt: row.updated_at,
	};
}

function serializeApprovalRequest(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		projectId: row.project_id,
		workDayId: row.work_day_id,
		taskId: row.task_id,
		kind: row.kind,
		state: row.state,
		severity: row.severity,
		requestedByType: row.requested_by_type,
		requestedById: row.requested_by_id,
		title: row.title,
		summary: row.summary,
		options: parseJson(row.options_json, []),
		recommendation: parseJson(row.recommendation_json, {}),
		policySnapshot: parseJson(row.policy_snapshot_json, {}),
		expiresAt: row.expires_at,
		decidedByType: row.decided_by_type,
		decidedById: row.decided_by_id,
		decidedAt: row.decided_at,
		decision: parseJson(row.decision_json, null),
		metadata: parseJson(row.metadata_json, {}),
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

function serializeRepositoryHost(row) {
	if (!row) return null;
	return {
		id: row.id,
		teamId: row.team_id,
		provider: row.provider,
		ownership: row.ownership,
		name: row.name,
		accountLabel: row.account_label,
		organizationOrOwner: row.organization_or_owner,
		defaultVisibility: row.default_visibility,
		softwareRepositoryNameTemplate: row.software_repository_name_template,
		contentRepositoryNameTemplate: row.content_repository_name_template,
		branchPolicy: parseJson(row.branch_policy_json, {}),
		workflowPolicy: parseJson(row.workflow_policy_json, {}),
		encryptedPayload: parseJson(row.encrypted_payload_json, null),
		allowedProjectKinds: parseJson(row.allowed_project_kinds_json, []),
		status: row.status,
		createdById: row.created_by_id,
		updatedById: row.updated_by_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeHubRepository(row) {
	if (!row) return null;
	return {
		id: row.id,
		hubId: row.hub_id,
		teamId: row.team_id,
		role: row.role,
		repositoryHostId: row.repository_host_id,
		provider: row.provider,
		owner: row.owner,
		name: row.name,
		url: row.url,
		defaultBranch: row.default_branch,
		currentBranch: row.current_branch,
		status: row.status,
		accessPolicy: parseJson(row.access_policy_json, {}),
		releasePolicy: parseJson(row.release_policy_json, {}),
		publishPolicy: parseJson(row.publish_policy_json, {}),
		submodulePath: row.submodule_path,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeHubContentSource(row) {
	if (!row) return null;
	return {
		id: row.id,
		hubId: row.hub_id,
		teamId: row.team_id,
		contentRepositoryId: row.content_repository_id,
		productionSource: row.production_source,
		overlayPolicy: row.overlay_policy,
		r2BucketName: row.r2_bucket_name,
		r2ManifestKey: row.r2_manifest_key,
		r2PublicBaseUrl: row.r2_public_base_url,
		latestPublishId: row.latest_publish_id,
		latestContentVersion: row.latest_content_version,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeHubLaunch(row) {
	if (!row) return null;
	return {
		id: row.id,
		hubId: row.hub_id,
		teamId: row.team_id,
		jobId: row.job_id,
		intent: parseJson(row.intent_json, {}),
		plan: parseJson(row.plan_json, {}),
		state: row.state,
		currentPhase: row.current_phase,
		lastSuccessfulPhase: row.last_successful_phase,
		result: parseJson(row.result_json, null),
		error: parseJson(row.error_json, null),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		completedAt: row.completed_at,
	};
}

function serializeHubLaunchEvent(row) {
	if (!row) return null;
	return {
		id: row.id,
		launchId: row.launch_id,
		seq: Number(row.seq ?? 0),
		phase: row.phase,
		status: row.status,
		title: row.title,
		summary: row.summary,
		startedAt: row.started_at,
		finishedAt: row.finished_at,
		error: parseJson(row.error_json, null),
		data: parseJson(row.data_json, {}),
		createdAt: row.created_at,
	};
}

function serializeHubWorkspaceLink(row) {
	if (!row) return null;
	return {
		id: row.id,
		hubId: row.hub_id,
		teamId: row.team_id,
		parentRepositoryHostId: row.parent_repository_host_id,
		parentOwner: row.parent_owner,
		parentName: row.parent_name,
		parentUrl: row.parent_url,
		parentBranch: row.parent_branch,
		hubMountPath: row.hub_mount_path,
		softwareSubmodulePath: row.software_submodule_path,
		contentSubmodulePath: row.content_submodule_path,
		updateSubmodulePointersEnabled: Boolean(row.update_submodule_pointers_enabled),
		accessPolicy: parseJson(row.access_policy_json, {}),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProjectUpdatePlan(row) {
	if (!row) return null;
	return {
		id: row.id,
		hubId: row.hub_id,
		teamId: row.team_id,
		sourceKind: row.source_kind,
		sourceRef: row.source_ref,
		sourceVersion: row.source_version,
		plan: parseJson(row.plan_json, {}),
		state: row.state,
		requiresDecision: Boolean(row.requires_decision),
		decisionId: row.decision_id,
		createdBy: row.created_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeProviderCredentialSession(row, { includeEncryptedPayload = false } = {}) {
	if (!row) return null;
	const payload = {
		id: row.id,
		teamId: row.team_id,
		projectId: row.project_id,
		jobId: row.job_id,
		hostKind: row.host_kind,
		hostId: row.host_id,
		purpose: row.purpose,
		status: row.status,
		expiresAt: row.expires_at,
		consumedAt: row.consumed_at,
		createdById: row.created_by_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		metadata: parseJson(row.metadata_json, {}),
	};
	if (includeEncryptedPayload) {
		payload.encryptedPayload = parseJson(row.encrypted_payload_json, null);
	}
	return payload;
}

function serializeCapability(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		namespace: row.namespace,
		operation: row.operation,
		label: row.label ?? null,
		executionClass: row.execution_class,
		allowedTargets: parseJson(row.allowed_targets_json, []),
		defaultDispatchMode: row.default_dispatch_mode,
		enabled: Boolean(row.enabled),
		approvalPolicy: parseJson(row.approval_policy_json, {}),
		resourceScope: parseJson(row.resource_scope_json, {}),
		metadata: parseJson(row.metadata_json, {}),
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
	const metadata = parseJson(row.metadata_json, {});
	const autoscale = parseJson(row.autoscale_json, {});
	const dailyCreditBudget = Number(row.daily_credit_budget ?? row.daily_task_credit_budget ?? 0);
	return {
		projectId: row.project_id,
		environment: row.environment,
		schedule: parseJson(row.schedule_json, { timezone: 'UTC', windows: [] }),
		enabled: row.enabled === undefined || row.enabled === null ? metadata.enabled !== false : Number(row.enabled) !== 0,
		startCron: row.start_cron ?? metadata.startCron ?? '0 9 * * 1-5',
		durationMinutes: Number(row.duration_minutes ?? metadata.durationMinutes ?? 480),
		maxRunners: Number(row.max_runners ?? metadata.maxRunners ?? autoscale.maxWorkers ?? 1),
		maxWorkersPerRunner: Number(row.max_workers_per_runner ?? metadata.maxWorkersPerRunner ?? 4),
		dailyCreditBudget,
		closeoutGraceMinutes: Number(row.closeout_grace_minutes ?? metadata.closeoutGraceMinutes ?? 15),
		dailyTaskCreditBudget: dailyCreditBudget,
		maxQueuedTasks: Number(row.max_queued_tasks ?? 0),
		maxQueuedCredits: Number(row.max_queued_credits ?? 0),
		autoscale,
		creditWeights: parseJson(row.credit_weights_json, []),
		metadata,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeWorkdayRequest(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		environment: row.environment,
		type: row.type,
		state: row.state,
		workDayId: row.work_day_id,
		requestedBy: row.requested_by,
		reason: row.reason,
		payload: parseJson(row.payload_json, {}),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeWorkerRunner(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		environment: row.environment,
		runnerId: row.runner_id,
		runnerServiceName: row.runner_service_name,
		volumeIdentity: row.volume_identity,
		state: row.state,
		maxLocalWorkers: Number(row.max_local_workers ?? 4),
		activeLocalWorkers: Number(row.active_local_workers ?? 0),
		availableCapacity: Number(row.available_capacity ?? 0),
		lastHeartbeatAt: row.last_heartbeat_at,
		claimedRepositoryIds: parseJson(row.claimed_repository_ids_json, []),
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeRepositoryClaim(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		repositoryId: row.repository_id,
		runnerId: row.runner_id,
		runnerServiceName: row.runner_service_name,
		volumeIdentity: row.volume_identity,
		lastSeenCommit: row.last_seen_commit,
		lastTaskAt: row.last_task_at,
		claimState: row.claim_state,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeRunnerScaleDecision(row) {
	if (!row) return null;
	return {
		id: row.id,
		projectId: row.project_id,
		environment: row.environment,
		workDayId: row.work_day_id,
		runnerId: row.runner_id,
		runnerServiceName: row.runner_service_name,
		action: row.action,
		reason: row.reason,
		metadata: parseJson(row.metadata_json, {}),
		createdAt: row.created_at,
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
				.then(() => this.ensureWorkdayManagerSchema())
				.then(() => this.ensureProjectCapabilityGrantSchema())
				.then(() => this.ensureHubLaunchEventSchema())
				.then(() => this.seedKnowledgeCoopRoles());
		}
		return this.initializationPromise;
	}

	async tableColumns(tableName) {
		const result = await this.all(`PRAGMA table_info(${tableName})`);
		return new Set(result.map((row) => row.name));
	}

	async ensureWorkdayManagerSchema() {
		const workPolicyColumns = await this.tableColumns('work_policies');
		const addColumn = async (name, definition) => {
			if (!workPolicyColumns.has(name)) {
				await this.run(`ALTER TABLE work_policies ADD COLUMN ${name} ${definition}`);
				workPolicyColumns.add(name);
			}
		};
		await addColumn('enabled', 'INTEGER NOT NULL DEFAULT 1');
		await addColumn('start_cron', "TEXT NOT NULL DEFAULT '0 9 * * 1-5'");
		await addColumn('duration_minutes', 'INTEGER NOT NULL DEFAULT 480');
		await addColumn('max_runners', 'INTEGER NOT NULL DEFAULT 1');
		await addColumn('max_workers_per_runner', 'INTEGER NOT NULL DEFAULT 4');
		await addColumn('daily_credit_budget', 'INTEGER NOT NULL DEFAULT 0');
		await addColumn('closeout_grace_minutes', 'INTEGER NOT NULL DEFAULT 15');
		await this.run(`UPDATE work_policies SET daily_credit_budget = daily_task_credit_budget WHERE daily_credit_budget = 0 AND daily_task_credit_budget > 0`);
		await this.run(`CREATE TABLE IF NOT EXISTS workday_requests (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			environment TEXT NOT NULL,
			type TEXT NOT NULL,
			state TEXT NOT NULL DEFAULT 'pending',
			work_day_id TEXT,
			requested_by TEXT,
			reason TEXT,
			payload_json TEXT NOT NULL,
			metadata_json TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		)`);
		await this.run(`CREATE INDEX IF NOT EXISTS idx_workday_requests_project_environment_state ON workday_requests(project_id, environment, state, created_at ASC)`);
		await this.run(`CREATE TABLE IF NOT EXISTS workday_manager_leases (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			environment TEXT NOT NULL,
			work_day_id TEXT,
			manager_id TEXT NOT NULL,
			state TEXT NOT NULL DEFAULT 'active',
			heartbeat_at TEXT NOT NULL,
			expires_at TEXT NOT NULL,
			metadata_json TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		)`);
		await this.run(`CREATE INDEX IF NOT EXISTS idx_workday_manager_leases_active ON workday_manager_leases(project_id, environment, state, heartbeat_at DESC)`);
		await this.run(`CREATE TABLE IF NOT EXISTS worker_runners (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			environment TEXT NOT NULL,
			runner_id TEXT NOT NULL,
			runner_service_name TEXT NOT NULL,
			volume_identity TEXT NOT NULL,
			state TEXT NOT NULL DEFAULT 'active',
			max_local_workers INTEGER NOT NULL DEFAULT 4,
			active_local_workers INTEGER NOT NULL DEFAULT 0,
			available_capacity INTEGER NOT NULL DEFAULT 4,
			last_heartbeat_at TEXT,
			claimed_repository_ids_json TEXT NOT NULL,
			metadata_json TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		)`);
		await this.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_runners_identity ON worker_runners(project_id, environment, runner_id)`);
		await this.run(`CREATE INDEX IF NOT EXISTS idx_worker_runners_state_capacity ON worker_runners(project_id, environment, state, available_capacity DESC)`);
		await this.run(`CREATE TABLE IF NOT EXISTS repository_claims (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			repository_id TEXT NOT NULL,
			runner_id TEXT NOT NULL,
			runner_service_name TEXT NOT NULL,
			volume_identity TEXT NOT NULL,
			last_seen_commit TEXT,
			last_task_at TEXT,
			claim_state TEXT NOT NULL DEFAULT 'active',
			metadata_json TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		)`);
		await this.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_claims_runner_repo ON repository_claims(project_id, repository_id, runner_id)`);
		await this.run(`CREATE INDEX IF NOT EXISTS idx_repository_claims_repo_state ON repository_claims(project_id, repository_id, claim_state, updated_at DESC)`);
		await this.run(`CREATE TABLE IF NOT EXISTS runner_scale_decisions (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			environment TEXT NOT NULL,
			work_day_id TEXT,
			runner_id TEXT,
			runner_service_name TEXT,
			action TEXT NOT NULL,
			reason TEXT NOT NULL,
			metadata_json TEXT NOT NULL,
			created_at TEXT NOT NULL
		)`);
		await this.run(`CREATE INDEX IF NOT EXISTS idx_runner_scale_decisions_project_workday ON runner_scale_decisions(project_id, environment, work_day_id, created_at DESC)`);
	}

	async ensureProjectCapabilityGrantSchema() {
		const columns = await this.tableColumns('project_capability_grants');
		const addColumn = async (name, definition) => {
			if (!columns.has(name)) {
				await this.run(`ALTER TABLE project_capability_grants ADD COLUMN ${name} ${definition}`);
				columns.add(name);
			}
		};
		await addColumn('label', 'TEXT');
		await addColumn('approval_policy_json', "TEXT NOT NULL DEFAULT '{}'");
		await addColumn('resource_scope_json', "TEXT NOT NULL DEFAULT '{}'");
		await addColumn('metadata_json', "TEXT NOT NULL DEFAULT '{}'");
	}

	async ensureHubLaunchEventSchema() {
		const columns = await this.tableColumns('hub_launch_events');
		const addColumn = async (name, definition) => {
			if (!columns.has(name)) {
				await this.run(`ALTER TABLE hub_launch_events ADD COLUMN ${name} ${definition}`);
				columns.add(name);
			}
		};
		await addColumn('started_at', 'TEXT');
		await addColumn('finished_at', 'TEXT');
		await addColumn('error_json', 'TEXT');
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

	async getTeamAccessSummary(teamId, principal) {
		await this.ensureInitialized();
		const context = await this.resolvePrincipalTeamContext(teamId, principal);
		const roles = context?.roles ?? [];
		const capabilities = context?.capabilities ?? [];
		const permissions = uniqueStrings([
			...capabilities.map((capability) => CAPABILITY_PERMISSIONS[capability]).filter(Boolean),
			...(principal?.permissions ?? []),
		]);
		return {
			teamId,
			roles,
			permissions,
			summary: {
				canAdminStaging: capabilities.includes('stage_releases') || capabilities.includes('publish_releases'),
				canAdminProduction: capabilities.includes('publish_releases'),
				canDownloadTemplates: Boolean(context) || principalIsAdmin(principal),
				canDownloadKnowledgePacks: Boolean(context) || principalIsAdmin(principal),
			},
		};
	}

	async getProjectAccessSummary(projectId, principal) {
		await this.ensureInitialized();
		const details = await this.getProjectDetails(projectId);
		if (!details) return null;
		const team = await this.getTeamAccessSummary(details.project.teamId, principal);
		const context = await this.resolvePrincipalTeamContext(details.project.teamId, principal);
		const roles = context?.roles ?? [];
		const subjectId = typeof principal?.id === 'string' && principal.id ? principal.id : details.project.teamId;
		const subjectType = principal?.roles?.includes?.('team_api_key') ? 'api_key' : 'user';
		const environmentRole = (environment) => {
			if (team.summary.canAdminProduction || (environment === 'staging' && team.summary.canAdminStaging)) return 'admin';
			if (roles.includes('contributor') || roles.includes('reviewer')) return 'operator';
			return 'viewer';
		};
		const environments = ['staging', 'prod'].map((environment) => ({
			projectId,
			environment,
			subjectType,
			subjectId,
			role: environmentRole(environment),
		}));
		return {
			projectId,
			team,
			environments,
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

	async listTeamWebHosts(teamId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM team_web_hosts WHERE team_id = ? ORDER BY created_at ASC`,
			[teamId],
		);
		return rows.map(serializeTeamWebHost);
	}

	async getTeamWebHost(teamId, hostId) {
		await this.ensureInitialized();
		const row = await this.first(
			`SELECT * FROM team_web_hosts WHERE team_id = ? AND id = ? LIMIT 1`,
			[teamId, hostId],
		);
		return serializeTeamWebHost(row);
	}

	async createTeamWebHost(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const provider = String(input.provider ?? 'cloudflare');
		const ownership = String(input.ownership ?? 'team_owned');
		const name = String(input.name ?? '').trim();
		if (!name) {
			throw new Error('name is required.');
		}
		if (!SUPPORTED_TEAM_HOST_PROVIDERS.has(provider)) {
			throw new Error(`Unsupported host provider "${provider}".`);
		}
		if (!['team_owned', 'treeseed_managed'].includes(ownership)) {
			throw new Error(`Unsupported web host ownership "${ownership}".`);
		}
		const encryptedPayload = ownership === 'team_owned' ? input.encryptedPayload ?? null : null;
		if (ownership === 'team_owned' && (!encryptedPayload || typeof encryptedPayload !== 'object')) {
			throw new Error('encryptedPayload is required for team-owned hosts.');
		}
		await this.run(
			`INSERT INTO team_web_hosts (
				id, team_id, provider, ownership, name, account_label, allowed_environments_json, status,
				encrypted_payload_json, metadata_json, created_by_id, updated_by_id, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				teamId,
				provider,
				ownership,
				name,
				typeof input.accountLabel === 'string' && input.accountLabel.trim() ? input.accountLabel.trim() : null,
				JSON.stringify(Array.isArray(input.allowedEnvironments) && input.allowedEnvironments.length > 0
					? input.allowedEnvironments.map(String)
					: ['staging', 'prod']),
				typeof input.status === 'string' ? input.status : 'active',
				encryptedPayload ? JSON.stringify(encryptedPayload) : null,
				JSON.stringify(typeof input.metadata === 'object' && input.metadata ? input.metadata : {}),
				typeof input.createdById === 'string' ? input.createdById : null,
				typeof input.updatedById === 'string' ? input.updatedById : typeof input.createdById === 'string' ? input.createdById : null,
				timestamp,
				timestamp,
			],
		);
		return this.getTeamWebHost(teamId, id);
	}

	async updateTeamWebHost(teamId, hostId, input) {
		await this.ensureInitialized();
		const existing = await this.getTeamWebHost(teamId, hostId);
		if (!existing) return null;
		const timestamp = isoNow();
		const ownership = String(input.ownership ?? existing.ownership);
		if (!['team_owned', 'treeseed_managed'].includes(ownership)) {
			throw new Error(`Unsupported web host ownership "${ownership}".`);
		}
		const encryptedPayload = ownership === 'team_owned'
			? input.encryptedPayload === undefined ? existing.encryptedPayload : input.encryptedPayload
			: null;
		if (ownership === 'team_owned' && (!encryptedPayload || typeof encryptedPayload !== 'object')) {
			throw new Error('encryptedPayload is required for team-owned hosts.');
		}
		await this.run(
			`UPDATE team_web_hosts
			 SET ownership = ?, name = ?, account_label = ?, allowed_environments_json = ?, status = ?,
			     encrypted_payload_json = ?, metadata_json = ?, updated_by_id = ?, updated_at = ?
			 WHERE team_id = ? AND id = ?`,
			[
				ownership,
				typeof input.name === 'string' && input.name.trim() ? input.name.trim() : existing.name,
				input.accountLabel === undefined
					? existing.accountLabel
					: typeof input.accountLabel === 'string' && input.accountLabel.trim()
						? input.accountLabel.trim()
						: null,
				JSON.stringify(Array.isArray(input.allowedEnvironments) ? input.allowedEnvironments.map(String) : existing.allowedEnvironments),
				typeof input.status === 'string' ? input.status : existing.status,
				encryptedPayload ? JSON.stringify(encryptedPayload) : null,
				JSON.stringify(input.metadata === undefined ? existing.metadata : typeof input.metadata === 'object' && input.metadata ? input.metadata : {}),
				typeof input.updatedById === 'string' ? input.updatedById : existing.updatedById,
				timestamp,
				teamId,
				hostId,
			],
		);
		return this.getTeamWebHost(teamId, hostId);
	}

	async listRepositoryHosts(teamId, { includePlatform = true } = {}) {
		await this.ensureInitialized();
		const rows = includePlatform
			? await this.all(
				`SELECT * FROM repository_hosts WHERE (team_id = ? OR team_id IS NULL) ORDER BY team_id IS NULL DESC, created_at ASC`,
				[teamId],
			)
			: await this.all(
				`SELECT * FROM repository_hosts WHERE team_id = ? ORDER BY created_at ASC`,
				[teamId],
			);
		return rows.map(serializeRepositoryHost);
	}

	async getRepositoryHost(teamId, hostId) {
		await this.ensureInitialized();
		const row = await this.first(
			`SELECT * FROM repository_hosts WHERE id = ? AND (team_id = ? OR team_id IS NULL) LIMIT 1`,
			[hostId, teamId],
		);
		return serializeRepositoryHost(row);
	}

	async upsertRepositoryHost(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const provider = String(input.provider ?? 'github');
		if (provider !== 'github') {
			throw new Error(`Unsupported repository host provider "${provider}".`);
		}
		const ownership = String(input.ownership ?? 'team_owned');
		if (!['team_owned', 'treeseed_managed'].includes(ownership)) {
			throw new Error(`Unsupported repository host ownership "${ownership}".`);
		}
		const name = String(input.name ?? '').trim();
		const organizationOrOwner = String(input.organizationOrOwner ?? input.organization_or_owner ?? '').trim();
		if (!name) throw new Error('name is required.');
		if (!organizationOrOwner) throw new Error('organizationOrOwner is required.');
		const hostTeamId = input.platformOwner === true || input.teamId === null ? null : teamId;
		const existing = await this.first(`SELECT * FROM repository_hosts WHERE id = ? LIMIT 1`, [id]);
		const encryptedPayload = input.encryptedPayload && typeof input.encryptedPayload === 'object'
			? input.encryptedPayload
			: existing?.encrypted_payload_json
				? parseJson(existing.encrypted_payload_json, null)
				: null;
		if (ownership === 'team_owned' && !encryptedPayload) {
			throw new Error('encryptedPayload is required for team-owned repository hosts.');
		}
		const values = [
			hostTeamId,
			provider,
			ownership,
			name,
			typeof input.accountLabel === 'string' && input.accountLabel.trim() ? input.accountLabel.trim() : null,
			organizationOrOwner,
			typeof input.defaultVisibility === 'string' ? input.defaultVisibility : 'private',
			typeof input.softwareRepositoryNameTemplate === 'string' && input.softwareRepositoryNameTemplate.trim() ? input.softwareRepositoryNameTemplate.trim() : '{hub}-site',
			typeof input.contentRepositoryNameTemplate === 'string' && input.contentRepositoryNameTemplate.trim() ? input.contentRepositoryNameTemplate.trim() : '{hub}-content',
			JSON.stringify(input.branchPolicy && typeof input.branchPolicy === 'object' ? input.branchPolicy : {}),
			JSON.stringify(input.workflowPolicy && typeof input.workflowPolicy === 'object' ? input.workflowPolicy : {}),
			encryptedPayload ? JSON.stringify(encryptedPayload) : null,
			JSON.stringify(Array.isArray(input.allowedProjectKinds) ? input.allowedProjectKinds.map(String) : ['knowledge_hub']),
			typeof input.status === 'string' ? input.status : 'active',
			typeof input.createdById === 'string' ? input.createdById : null,
			typeof input.updatedById === 'string' ? input.updatedById : typeof input.createdById === 'string' ? input.createdById : null,
		];
		if (existing) {
			await this.run(
				`UPDATE repository_hosts
				 SET team_id = ?, provider = ?, ownership = ?, name = ?, account_label = ?, organization_or_owner = ?,
				     default_visibility = ?, software_repository_name_template = ?, content_repository_name_template = ?,
				     branch_policy_json = ?, workflow_policy_json = ?, encrypted_payload_json = ?, allowed_project_kinds_json = ?,
				     status = ?, created_by_id = COALESCE(created_by_id, ?), updated_by_id = ?, updated_at = ?
				 WHERE id = ?`,
				[...values, timestamp, id],
			);
		} else {
			await this.run(
				`INSERT INTO repository_hosts (
					id, team_id, provider, ownership, name, account_label, organization_or_owner, default_visibility,
					software_repository_name_template, content_repository_name_template, branch_policy_json, workflow_policy_json,
					encrypted_payload_json, allowed_project_kinds_json, status, created_by_id, updated_by_id, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[id, ...values, timestamp, timestamp],
			);
		}
		return serializeRepositoryHost(await this.first(`SELECT * FROM repository_hosts WHERE id = ?`, [id]));
	}

	async listProjectsUsingRepositoryHost(teamId, hostId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT DISTINCT p.*
			 FROM projects p
			 JOIN hub_repositories r ON r.hub_id = p.id
			 WHERE p.team_id = ? AND r.repository_host_id = ?
			 ORDER BY p.created_at DESC`,
			[teamId, hostId],
		);
		return rows.map(serializeProject);
	}

	async deleteRepositoryHost(teamId, hostId) {
		await this.ensureInitialized();
		const existing = await this.getRepositoryHost(teamId, hostId);
		if (!existing || existing.teamId === null) return { ok: false, error: 'not_found' };
		const projects = await this.listProjectsUsingRepositoryHost(teamId, hostId);
		if (projects.length > 0) {
			return {
				ok: false,
				error: 'in_use',
				projects: projects.map((project) => ({
					id: project.id,
					slug: project.slug,
					name: project.name,
				})),
			};
		}
		await this.run(`DELETE FROM repository_hosts WHERE team_id = ? AND id = ?`, [teamId, hostId]);
		return { ok: true, payload: existing };
	}

	async createProviderCredentialSession(teamId, input) {
		await this.ensureInitialized();
		await this.markExpiredProviderCredentialSessions();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const hostKind = String(input.hostKind ?? '');
		const hostId = String(input.hostId ?? '');
		const purpose = String(input.purpose ?? 'launch_project');
		if (!['repository_host', 'web_host', 'processing_host', 'email_host'].includes(hostKind)) {
			throw new Error(`Unsupported credential session hostKind "${hostKind}".`);
		}
		if (!hostId) {
			throw new Error('hostId is required.');
		}
		if (!input.encryptedPayload || typeof input.encryptedPayload !== 'object') {
			throw new Error('encryptedPayload is required.');
		}
		if (!input.expiresAt) {
			throw new Error('expiresAt is required.');
		}
		await this.run(
			`INSERT INTO provider_credential_sessions (
				id, team_id, project_id, job_id, host_kind, host_id, purpose, encrypted_payload_json, status,
				expires_at, consumed_at, created_by_id, created_at, updated_at, metadata_json
			) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 'active', ?, NULL, ?, ?, ?, ?)`,
			[
				id,
				teamId,
				hostKind,
				hostId,
				purpose,
				JSON.stringify(input.encryptedPayload),
				input.expiresAt,
				typeof input.createdById === 'string' ? input.createdById : null,
				timestamp,
				timestamp,
				JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
			],
		);
		return this.getProviderCredentialSession(teamId, id);
	}

	async getProviderCredentialSession(teamId, sessionId, options = {}) {
		await this.ensureInitialized();
		await this.markExpiredProviderCredentialSessions();
		const row = await this.first(
			`SELECT * FROM provider_credential_sessions WHERE id = ? AND team_id = ? LIMIT 1`,
			[sessionId, teamId],
		);
		return serializeProviderCredentialSession(row, options);
	}

	async findProviderCredentialSession(sessionId, options = {}) {
		await this.ensureInitialized();
		await this.markExpiredProviderCredentialSessions();
		return serializeProviderCredentialSession(
			await this.first(`SELECT * FROM provider_credential_sessions WHERE id = ? LIMIT 1`, [sessionId]),
			options,
		);
	}

	async bindProviderCredentialSession(teamId, sessionId, input) {
		await this.ensureInitialized();
		await this.markExpiredProviderCredentialSessions();
		const existing = await this.getProviderCredentialSession(teamId, sessionId);
		if (!existing) return null;
		if (existing.status !== 'active') return null;
		if (new Date(existing.expiresAt).getTime() <= Date.now()) return null;
		const timestamp = isoNow();
		await this.run(
			`UPDATE provider_credential_sessions
			 SET project_id = ?, job_id = ?, updated_at = ?, metadata_json = ?
			 WHERE id = ? AND team_id = ?`,
			[
				input.projectId ?? existing.projectId ?? null,
				input.jobId ?? existing.jobId ?? null,
				timestamp,
				JSON.stringify({
					...existing.metadata,
					...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
				}),
				sessionId,
				teamId,
			],
		);
		return this.getProviderCredentialSession(teamId, sessionId);
	}

	async consumeProviderCredentialSession(jobId, sessionId) {
		await this.ensureInitialized();
		await this.markExpiredProviderCredentialSessions();
		const existing = await this.findProviderCredentialSession(sessionId, { includeEncryptedPayload: true });
		if (!existing || existing.jobId !== jobId) {
			return { ok: false, error: 'not_found' };
		}
		if (existing.status !== 'active') {
			return { ok: false, error: 'already_consumed' };
		}
		if (new Date(existing.expiresAt).getTime() <= Date.now()) {
			await this.run(
				`UPDATE provider_credential_sessions SET status = 'expired', updated_at = ? WHERE id = ?`,
				[isoNow(), sessionId],
			);
			return { ok: false, error: 'expired' };
		}
		const timestamp = isoNow();
		await this.run(
			`UPDATE provider_credential_sessions
			 SET status = 'consumed', consumed_at = ?, updated_at = ?
			 WHERE id = ? AND job_id = ? AND status = 'active'`,
			[timestamp, timestamp, sessionId, jobId],
		);
		return {
			ok: true,
			payload: await this.findProviderCredentialSession(sessionId, { includeEncryptedPayload: true }),
		};
	}

	async markExpiredProviderCredentialSessions(now = isoNow()) {
		await this.run(
			`UPDATE provider_credential_sessions
			 SET status = 'expired', updated_at = ?
			 WHERE status = 'active' AND expires_at <= ?`,
			[now, now],
		);
	}

	async cleanupProviderCredentialSessions(input = {}) {
		await this.ensureInitialized();
		const now = input.now ?? isoNow();
		await this.markExpiredProviderCredentialSessions(now);
		if (input.deleteBefore) {
			await this.run(
				`DELETE FROM provider_credential_sessions
				 WHERE status IN ('expired', 'consumed') AND updated_at < ?`,
				[input.deleteBefore],
			);
		}
		return {
			ok: true,
			checkedAt: now,
		};
	}

	async listProjectsUsingTeamWebHost(teamId, hostId) {
		const projects = await this.listTeamProjects(teamId);
		return projects.filter((project) => {
			const host = project.metadata?.cloudflareHost;
			return host?.mode === 'team_owned' && host.hostId === hostId;
		});
	}

	async deleteTeamWebHost(teamId, hostId) {
		await this.ensureInitialized();
		const existing = await this.getTeamWebHost(teamId, hostId);
		if (!existing) return { ok: false, error: 'not_found' };
		const projects = await this.listProjectsUsingTeamWebHost(teamId, hostId);
		if (projects.length > 0) {
			return {
				ok: false,
				error: 'in_use',
				projects: projects.map((project) => ({
					id: project.id,
					slug: project.slug,
					name: project.name,
				})),
			};
		}
		await this.run(`DELETE FROM team_web_hosts WHERE team_id = ? AND id = ?`, [teamId, hostId]);
		return { ok: true, payload: existing };
	}

	async listTeamCapacityProviders(teamId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM capacity_providers
			 WHERE team_id = ? OR owner_team_id = ?
			 ORDER BY created_at ASC`,
			[teamId, teamId],
		);
		return rows.map(serializeCapacityProvider);
	}

	async getCapacityProvider(teamId, providerId) {
		await this.ensureInitialized();
		return serializeCapacityProvider(await this.first(
			`SELECT * FROM capacity_providers
			 WHERE id = ? AND (team_id = ? OR owner_team_id = ?)
			 LIMIT 1`,
			[providerId, teamId, teamId],
		));
	}

	async upsertCapacityProvider(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const existing = await this.first(`SELECT * FROM capacity_providers WHERE id = ? LIMIT 1`, [id]);
		const values = [
			input.teamId ?? teamId,
			input.ownerTeamId ?? input.teamId ?? teamId,
			String(input.name ?? existing?.name ?? '').trim(),
			String(input.kind ?? existing?.kind ?? 'team_owned'),
			String(input.status ?? existing?.status ?? 'active'),
			String(input.provider ?? existing?.provider ?? 'custom'),
			String(input.billingScope ?? existing?.billing_scope ?? 'team'),
			Number(input.monthlyCreditBudget ?? existing?.monthly_credit_budget ?? 0),
			Number(input.dailyCreditBudget ?? existing?.daily_credit_budget ?? 0),
			Number(input.maxConcurrentWorkdays ?? existing?.max_concurrent_workdays ?? 1),
			Number(input.maxConcurrentWorkers ?? existing?.max_concurrent_workers ?? 1),
			JSON.stringify(input.capacityModel ?? parseJson(existing?.capacity_model_json, {})),
			JSON.stringify(input.metadata ?? parseJson(existing?.metadata_json, {})),
			timestamp,
			id,
		];
		if (!values[2]) {
			throw new Error('name is required.');
		}
		if (existing) {
			await this.run(
				`UPDATE capacity_providers
				 SET team_id = ?, owner_team_id = ?, name = ?, kind = ?, status = ?, provider = ?, billing_scope = ?,
				     monthly_credit_budget = ?, daily_credit_budget = ?, max_concurrent_workdays = ?, max_concurrent_workers = ?,
				     capacity_model_json = ?, metadata_json = ?, updated_at = ?
				 WHERE id = ?`,
				values,
			);
		} else {
			await this.run(
				`INSERT INTO capacity_providers (
					id, team_id, owner_team_id, name, kind, status, provider, billing_scope,
					monthly_credit_budget, daily_credit_budget, max_concurrent_workdays, max_concurrent_workers,
					capacity_model_json, metadata_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					id,
					input.teamId ?? teamId,
					input.ownerTeamId ?? input.teamId ?? teamId,
					String(input.name).trim(),
					String(input.kind ?? 'team_owned'),
					String(input.status ?? 'active'),
					String(input.provider ?? 'custom'),
					String(input.billingScope ?? 'team'),
					Number(input.monthlyCreditBudget ?? 0),
					Number(input.dailyCreditBudget ?? 0),
					Number(input.maxConcurrentWorkdays ?? 1),
					Number(input.maxConcurrentWorkers ?? 1),
					JSON.stringify(input.capacityModel ?? {}),
					JSON.stringify(input.metadata ?? {}),
					timestamp,
					timestamp,
				],
			);
		}
		return this.getCapacityProvider(teamId, id);
	}

	async upsertCapacityProviderHost(teamId, providerId, input) {
		await this.ensureInitialized();
		if (!(await this.getCapacityProvider(teamId, providerId))) return null;
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT OR REPLACE INTO capacity_provider_hosts (
				id, capacity_provider_id, host_id, role, required, metadata_json, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM capacity_provider_hosts WHERE id = ?), ?),
				?
			)`,
			[
				id,
				providerId,
				String(input.hostId),
				String(input.role),
				input.required === false ? 0 : 1,
				JSON.stringify(input.metadata ?? {}),
				id,
				timestamp,
				timestamp,
			],
		);
		return serializeCapacityProviderHost(await this.first(`SELECT * FROM capacity_provider_hosts WHERE id = ? LIMIT 1`, [id]));
	}

	async listCapacityProviderHosts(teamId, providerId) {
		await this.ensureInitialized();
		if (!(await this.getCapacityProvider(teamId, providerId))) return [];
		const rows = await this.all(
			`SELECT * FROM capacity_provider_hosts WHERE capacity_provider_id = ? ORDER BY created_at ASC`,
			[providerId],
		);
		return rows.map(serializeCapacityProviderHost);
	}

	async listCapacityProviderLanes(teamId, providerId) {
		await this.ensureInitialized();
		if (!(await this.getCapacityProvider(teamId, providerId))) return [];
		const rows = await this.all(
			`SELECT * FROM capacity_provider_lanes WHERE capacity_provider_id = ? ORDER BY created_at ASC`,
			[providerId],
		);
		return rows.map(serializeCapacityProviderLane);
	}

	async upsertCapacityProviderLane(teamId, providerId, input) {
		await this.ensureInitialized();
		if (!(await this.getCapacityProvider(teamId, providerId))) return null;
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const existing = await this.first(`SELECT * FROM capacity_provider_lanes WHERE id = ? LIMIT 1`, [id]);
		await this.run(
			`INSERT OR REPLACE INTO capacity_provider_lanes (
				id, capacity_provider_id, name, business_model, model_family, model_class, region_policy, unit,
				scarcity_level, hard_limits_json, routing_policy_json, metadata_json, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM capacity_provider_lanes WHERE id = ?), ?),
				?
			)`,
			[
				id,
				providerId,
				String(input.name ?? existing?.name ?? '').trim(),
				String(input.businessModel ?? existing?.business_model ?? 'custom'),
				input.modelFamily ?? existing?.model_family ?? null,
				input.modelClass ?? existing?.model_class ?? null,
				input.regionPolicy ?? existing?.region_policy ?? null,
				String(input.unit ?? existing?.unit ?? 'treeseed_credit'),
				String(input.scarcityLevel ?? existing?.scarcity_level ?? 'medium'),
				JSON.stringify(input.hardLimits ?? parseJson(existing?.hard_limits_json, {})),
				JSON.stringify(input.routingPolicy ?? parseJson(existing?.routing_policy_json, {})),
				JSON.stringify(input.metadata ?? parseJson(existing?.metadata_json, {})),
				id,
				timestamp,
				timestamp,
			],
		);
		return serializeCapacityProviderLane(await this.first(`SELECT * FROM capacity_provider_lanes WHERE id = ? LIMIT 1`, [id]));
	}

	async listCapacityGrants(teamId, filters = {}) {
		await this.ensureInitialized();
		const clauses = ['team_id = ?'];
		const values = [teamId];
		if (filters.projectId) {
			clauses.push('(project_id = ? OR project_id IS NULL)');
			values.push(filters.projectId);
		}
		if (filters.providerId) {
			clauses.push('capacity_provider_id = ?');
			values.push(filters.providerId);
		}
		const rows = await this.all(
			`SELECT * FROM capacity_grants WHERE ${clauses.join(' AND ')} ORDER BY created_at ASC`,
			values,
		);
		return rows.map(serializeCapacityGrant);
	}

	async upsertCapacityGrant(teamId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT OR REPLACE INTO capacity_grants (
				id, capacity_provider_id, lane_id, grant_scope, team_id, project_id, environment, state,
				daily_credit_limit, weekly_credit_limit, monthly_credit_limit, daily_usd_limit,
				weekly_quota_minutes, monthly_provider_units, priority_weight, overflow_policy,
				metadata_json, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM capacity_grants WHERE id = ?), ?),
				?
			)`,
			[
				id,
				input.capacityProviderId,
				input.laneId ?? null,
				input.grantScope ?? 'team',
				input.teamId ?? teamId,
				input.projectId ?? null,
				input.environment ?? null,
				input.state ?? 'active',
				input.dailyCreditLimit ?? null,
				input.weeklyCreditLimit ?? null,
				input.monthlyCreditLimit ?? null,
				input.dailyUsdLimit ?? null,
				input.weeklyQuotaMinutes ?? null,
				input.monthlyProviderUnits ?? null,
				Number(input.priorityWeight ?? 1),
				input.overflowPolicy ?? 'soft_grant',
				JSON.stringify(input.metadata ?? {}),
				id,
				timestamp,
				timestamp,
			],
		);
		return serializeCapacityGrant(await this.first(`SELECT * FROM capacity_grants WHERE id = ? LIMIT 1`, [id]));
	}

	async createCapacityReservation(input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO capacity_reservations (
				id, capacity_provider_id, lane_id, team_id, project_id, work_day_id, task_id, state,
				reserved_credits, consumed_credits, reserved_provider_units, consumed_provider_units,
				reserved_usd, consumed_usd, expires_at, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, ?, NULL, ?, ?, ?, ?)`,
			[
				id,
				input.capacityProviderId,
				input.laneId,
				input.teamId,
				input.projectId,
				input.workDayId ?? null,
				input.taskId ?? null,
				input.state ?? 'reserved',
				Number(input.reservedCredits ?? 0),
				input.reservedProviderUnits ?? null,
				input.reservedUsd ?? null,
				input.expiresAt ?? null,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		return serializeCapacityReservation(await this.first(`SELECT * FROM capacity_reservations WHERE id = ? LIMIT 1`, [id]));
	}

	async listCapacityReservationsForProject(projectId, workDayId = null) {
		await this.ensureInitialized();
		const rows = workDayId
			? await this.all(
				`SELECT * FROM capacity_reservations WHERE project_id = ? AND work_day_id = ? ORDER BY created_at DESC`,
				[projectId, workDayId],
			)
			: await this.all(
				`SELECT * FROM capacity_reservations WHERE project_id = ? ORDER BY created_at DESC`,
				[projectId],
			);
		return rows.map(serializeCapacityReservation);
	}

	async recordCapacityUsage(input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		const phase = input.phase ?? 'consume';
		await this.run(
			`INSERT INTO capacity_ledger_entries (
				id, capacity_provider_id, lane_id, reservation_id, team_id, project_id, work_day_id, task_id,
				phase, credits, provider_units, usd, source, metadata_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.capacityProviderId,
				input.laneId ?? null,
				input.reservationId ?? null,
				input.teamId,
				input.projectId ?? null,
				input.workDayId ?? null,
				input.taskId ?? null,
				phase,
				Number(input.credits ?? 0),
				input.providerUnits ?? null,
				input.usd ?? null,
				input.source ?? 'runner',
				JSON.stringify(input.metadata ?? {}),
				timestamp,
			],
		);
		if (input.reservationId && phase === 'consume') {
			await this.run(
				`UPDATE capacity_reservations
				 SET consumed_credits = consumed_credits + ?,
				     consumed_provider_units = COALESCE(consumed_provider_units, 0) + COALESCE(?, 0),
				     consumed_usd = COALESCE(consumed_usd, 0) + COALESCE(?, 0),
				     state = CASE WHEN consumed_credits + ? >= reserved_credits THEN 'consumed' ELSE state END,
				     updated_at = ?
				 WHERE id = ?`,
				[
					Number(input.credits ?? 0),
					input.providerUnits ?? null,
					input.usd ?? null,
					Number(input.credits ?? 0),
					timestamp,
					input.reservationId,
				],
			);
		}
		return serializeCapacityLedgerEntry(await this.first(`SELECT * FROM capacity_ledger_entries WHERE id = ? LIMIT 1`, [id]));
	}

	async listCapacityLedgerEntries(projectId, workDayId = null) {
		await this.ensureInitialized();
		const rows = workDayId
			? await this.all(
				`SELECT * FROM capacity_ledger_entries WHERE project_id = ? AND work_day_id = ? ORDER BY created_at ASC`,
				[projectId, workDayId],
			)
			: await this.all(
				`SELECT * FROM capacity_ledger_entries WHERE project_id = ? ORDER BY created_at DESC LIMIT 200`,
				[projectId],
			);
		return rows.map(serializeCapacityLedgerEntry);
	}

	async createCapacityRoutingDecision(input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO capacity_routing_decisions (
				id, task_id, work_day_id, project_id, selected_provider_id, selected_lane_id, selected_model,
				decision, reason, candidate_json, score_json, metadata_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.taskId ?? null,
				input.workDayId ?? null,
				input.projectId,
				input.selectedProviderId,
				input.selectedLaneId,
				input.selectedModel ?? null,
				input.decision ?? 'selected',
				input.reason,
				JSON.stringify(input.candidates ?? []),
				JSON.stringify(input.scores ?? {}),
				JSON.stringify(input.metadata ?? {}),
				timestamp,
			],
		);
		return serializeCapacityRoutingDecision(await this.first(`SELECT * FROM capacity_routing_decisions WHERE id = ? LIMIT 1`, [id]));
	}

	async createTaskEstimate(input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO task_estimates (
				id, task_id, work_day_id, project_id, estimate_phase, task_signature, confidence,
				estimated_credits_p50, estimated_credits_p90, reserved_credits,
				estimated_input_tokens_p50, estimated_input_tokens_p90, estimated_output_tokens_p50,
				estimated_output_tokens_p90, estimated_quota_minutes_p50, estimated_quota_minutes_p90,
				features_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.taskId ?? null,
				input.workDayId ?? null,
				input.projectId,
				input.estimatePhase,
				input.taskSignature,
				input.confidence,
				Number(input.estimatedCreditsP50 ?? 0),
				Number(input.estimatedCreditsP90 ?? 0),
				Number(input.reservedCredits ?? input.estimatedCreditsP90 ?? input.estimatedCreditsP50 ?? 0),
				input.estimatedInputTokensP50 ?? null,
				input.estimatedInputTokensP90 ?? null,
				input.estimatedOutputTokensP50 ?? null,
				input.estimatedOutputTokensP90 ?? null,
				input.estimatedQuotaMinutesP50 ?? null,
				input.estimatedQuotaMinutesP90 ?? null,
				JSON.stringify(input.features ?? {}),
				timestamp,
			],
		);
		return serializeTaskEstimate(await this.first(`SELECT * FROM task_estimates WHERE id = ? LIMIT 1`, [id]));
	}

	async createTaskUsageActual(input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO task_usage_actuals (
				id, task_id, work_day_id, project_id, task_signature, capacity_provider_id, lane_id,
				business_model, model_name, input_tokens, output_tokens, cached_input_tokens, quota_minutes,
				wall_minutes, files_opened, files_changed, diff_lines_added, diff_lines_removed,
				test_runs, retry_count, actual_credits, actual_usd, metadata_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.taskId ?? null,
				input.workDayId ?? null,
				input.projectId,
				input.taskSignature,
				input.capacityProviderId ?? null,
				input.laneId ?? null,
				input.businessModel,
				input.modelName ?? null,
				input.inputTokens ?? null,
				input.outputTokens ?? null,
				input.cachedInputTokens ?? null,
				input.quotaMinutes ?? null,
				input.wallMinutes ?? null,
				input.filesOpened ?? null,
				input.filesChanged ?? null,
				input.diffLinesAdded ?? null,
				input.diffLinesRemoved ?? null,
				input.testRuns ?? null,
				input.retryCount ?? null,
				Number(input.actualCredits ?? 0),
				input.actualUsd ?? null,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
			],
		);
		await this.upsertTaskEstimateProfileFromActual(input.taskSignature, {
			inputTokens: input.inputTokens,
			outputTokens: input.outputTokens,
			quotaMinutes: input.quotaMinutes,
			filesChanged: input.filesChanged,
			actualCredits: input.actualCredits,
		});
		return serializeTaskUsageActual(await this.first(`SELECT * FROM task_usage_actuals WHERE id = ? LIMIT 1`, [id]));
	}

	async upsertTaskEstimateProfileFromActual(taskSignature, actual) {
		const timestamp = isoNow();
		const existing = await this.first(`SELECT * FROM task_estimate_profiles WHERE task_signature = ? LIMIT 1`, [taskSignature]);
		const sampleCount = Number(existing?.sample_count ?? 0);
		const nextCount = sampleCount + 1;
		const blend = (oldValue, nextValue) => {
			if (nextValue === null || nextValue === undefined || !Number.isFinite(Number(nextValue))) {
				return oldValue ?? null;
			}
			if (oldValue === null || oldValue === undefined) {
				return Number(nextValue);
			}
			return ((Number(oldValue) * sampleCount) + Number(nextValue)) / nextCount;
		};
		await this.run(
			`INSERT OR REPLACE INTO task_estimate_profiles (
				task_signature, sample_count, input_tokens_p50, input_tokens_p90, output_tokens_p50, output_tokens_p90,
				quota_minutes_p50, quota_minutes_p90, files_changed_p50, files_changed_p90, credits_p50, credits_p90, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				taskSignature,
				nextCount,
				blend(existing?.input_tokens_p50, actual.inputTokens),
				Math.max(blend(existing?.input_tokens_p90, actual.inputTokens) ?? 0, Number(actual.inputTokens ?? 0)) || null,
				blend(existing?.output_tokens_p50, actual.outputTokens),
				Math.max(blend(existing?.output_tokens_p90, actual.outputTokens) ?? 0, Number(actual.outputTokens ?? 0)) || null,
				blend(existing?.quota_minutes_p50, actual.quotaMinutes),
				Math.max(blend(existing?.quota_minutes_p90, actual.quotaMinutes) ?? 0, Number(actual.quotaMinutes ?? 0)) || null,
				blend(existing?.files_changed_p50, actual.filesChanged),
				Math.max(blend(existing?.files_changed_p90, actual.filesChanged) ?? 0, Number(actual.filesChanged ?? 0)) || null,
				blend(existing?.credits_p50, actual.actualCredits),
				Math.max(blend(existing?.credits_p90, actual.actualCredits) ?? 0, Number(actual.actualCredits ?? 0)) || null,
				timestamp,
			],
		);
		return serializeTaskEstimateProfile(await this.first(`SELECT * FROM task_estimate_profiles WHERE task_signature = ? LIMIT 1`, [taskSignature]));
	}

	async listTaskEstimateProfiles(limit = 100) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM task_estimate_profiles ORDER BY updated_at DESC LIMIT ?`,
			[Math.max(1, Math.min(500, Number(limit) || 100))],
		);
		return rows.map(serializeTaskEstimateProfile);
	}

	async createApprovalRequest(input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO approval_requests (
				id, team_id, project_id, work_day_id, task_id, kind, state, severity, requested_by_type,
				requested_by_id, title, summary, options_json, recommendation_json, policy_snapshot_json,
				expires_at, decision_json, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
			[
				id,
				input.teamId,
				input.projectId,
				input.workDayId ?? null,
				input.taskId ?? null,
				input.kind,
				input.severity ?? 'medium',
				input.requestedByType ?? 'worker',
				input.requestedById ?? null,
				input.title,
				input.summary,
				JSON.stringify(input.options ?? []),
				JSON.stringify(input.recommendation ?? {}),
				JSON.stringify(input.policySnapshot ?? {}),
				input.expiresAt ?? null,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		return serializeApprovalRequest(await this.first(`SELECT * FROM approval_requests WHERE id = ? LIMIT 1`, [id]));
	}

	async getApprovalRequest(id) {
		await this.ensureInitialized();
		return serializeApprovalRequest(await this.first(`SELECT * FROM approval_requests WHERE id = ? LIMIT 1`, [id]));
	}

	async decideApprovalRequest(id, input) {
		await this.ensureInitialized();
		const existing = await this.getApprovalRequest(id);
		if (!existing) return null;
		const timestamp = isoNow();
		const state = input.state === 'rejected' ? 'rejected' : input.state === 'expired' ? 'expired' : 'approved';
		await this.run(
			`UPDATE approval_requests
			 SET state = ?, decided_by_type = ?, decided_by_id = ?, decided_at = ?, decision_json = ?, updated_at = ?
			 WHERE id = ?`,
			[
				state,
				input.decidedByType ?? 'user',
				input.decidedById ?? null,
				timestamp,
				JSON.stringify(input.decision ?? {}),
				timestamp,
				id,
			],
		);
		return this.getApprovalRequest(id);
	}

	async getProjectCapacityPlan(projectId, environment = 'staging') {
		await this.ensureInitialized();
		const project = await this.getProject(projectId);
		if (!project) return null;
		const grants = await this.listCapacityGrants(project.teamId, { projectId });
		const providerIds = [...new Set(grants.map((grant) => grant.capacityProviderId))];
		const providers = providerIds.length
			? (await this.all(
				`SELECT * FROM capacity_providers WHERE id IN (${providerIds.map(() => '?').join(',')}) ORDER BY created_at ASC`,
				providerIds,
			)).map(serializeCapacityProvider)
			: [];
		const lanes = providerIds.length
			? (await this.all(
				`SELECT * FROM capacity_provider_lanes WHERE capacity_provider_id IN (${providerIds.map(() => '?').join(',')}) ORDER BY created_at ASC`,
				providerIds,
			)).map(serializeCapacityProviderLane)
			: [];
		const activeReservations = (await this.listCapacityReservationsForProject(projectId))
			.filter((reservation) => ['reserved', 'consumed'].includes(reservation.state));
		const profiles = await this.listTaskEstimateProfiles(100);
		const dailyCredits = grants.reduce((total, grant) => total + Number(grant.dailyCreditLimit ?? 0), 0);
		const weeklyCredits = grants.reduce((total, grant) => total + Number(grant.weeklyCreditLimit ?? 0), 0);
		const monthlyCredits = grants.reduce((total, grant) => total + Number(grant.monthlyCreditLimit ?? 0), 0);
		const weeklyQuotaMinutes = grants.reduce((total, grant) => total + Number(grant.weeklyQuotaMinutes ?? 0), 0);
		const dailyUsd = grants.reduce((total, grant) => total + Number(grant.dailyUsdLimit ?? 0), 0);
		const reservedCredits = activeReservations
			.filter((reservation) => reservation.state === 'reserved')
			.reduce((total, reservation) => total + Number(reservation.reservedCredits ?? 0), 0);
		return {
			projectId,
			teamId: project.teamId,
			environment,
			providers,
			lanes,
			grants,
			activeReservations,
			estimateProfiles: profiles,
			remaining: {
				dailyCredits: dailyCredits > 0 ? Math.max(0, dailyCredits - reservedCredits) : null,
				weeklyCredits: weeklyCredits || null,
				monthlyCredits: monthlyCredits || null,
				weeklyQuotaMinutes: weeklyQuotaMinutes || null,
				dailyUsd: dailyUsd || null,
			},
		};
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

	async getCatalogArtifactVersion(itemId, version) {
		await this.ensureInitialized();
		const row = await this.first(
			`SELECT * FROM catalog_artifact_versions WHERE item_id = ? AND version = ? LIMIT 1`,
			[itemId, version],
		);
		return serializeCatalogArtifactVersion(row);
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

	async upsertHubRepository(hubId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const project = await this.getProject(hubId);
		const teamId = input.teamId ?? project?.teamId;
		if (!teamId) throw new Error('teamId is required for hub repository records.');
		const role = String(input.role);
		const existing = await this.first(
			`SELECT * FROM hub_repositories WHERE hub_id = ? AND role = ? LIMIT 1`,
			[hubId, role],
		);
		const payload = [
			teamId,
			role,
			input.repositoryHostId ?? null,
			input.provider ?? 'github',
			input.owner,
			input.name,
			input.url ?? null,
			input.defaultBranch ?? null,
			input.currentBranch ?? input.defaultBranch ?? null,
			input.status ?? 'queued',
			JSON.stringify(input.accessPolicy ?? {}),
			JSON.stringify(input.releasePolicy ?? {}),
			JSON.stringify(input.publishPolicy ?? {}),
			input.submodulePath ?? null,
			JSON.stringify(input.metadata ?? {}),
		];
		if (existing) {
			await this.run(
				`UPDATE hub_repositories
				 SET team_id = ?, role = ?, repository_host_id = ?, provider = ?, owner = ?, name = ?, url = ?,
				     default_branch = ?, current_branch = ?, status = ?, access_policy_json = ?, release_policy_json = ?,
				     publish_policy_json = ?, submodule_path = ?, metadata_json = ?, updated_at = ?
				 WHERE hub_id = ? AND role = ?`,
				[...payload, timestamp, hubId, role],
			);
			return serializeHubRepository(await this.first(`SELECT * FROM hub_repositories WHERE hub_id = ? AND role = ?`, [hubId, role]));
		}
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO hub_repositories (
				id, hub_id, team_id, role, repository_host_id, provider, owner, name, url, default_branch, current_branch, status,
				access_policy_json, release_policy_json, publish_policy_json, submodule_path, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[id, hubId, ...payload, timestamp, timestamp],
		);
		return serializeHubRepository(await this.first(`SELECT * FROM hub_repositories WHERE id = ?`, [id]));
	}

	async listHubRepositories(hubId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM hub_repositories WHERE hub_id = ? ORDER BY role ASC`,
			[hubId],
		);
		return rows.map(serializeHubRepository);
	}

	async upsertHubContentSource(hubId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const project = await this.getProject(hubId);
		const teamId = input.teamId ?? project?.teamId;
		if (!teamId) throw new Error('teamId is required for hub content source records.');
		const existing = await this.first(`SELECT * FROM hub_content_sources WHERE hub_id = ? LIMIT 1`, [hubId]);
		const payload = [
			teamId,
			input.contentRepositoryId ?? null,
			input.productionSource ?? 'r2_published_artifacts',
			input.overlayPolicy ?? 'src_content_when_present',
			input.r2BucketName ?? null,
			input.r2ManifestKey ?? null,
			input.r2PublicBaseUrl ?? null,
			input.latestPublishId ?? null,
			input.latestContentVersion ?? null,
			JSON.stringify(input.metadata ?? {}),
		];
		if (existing) {
			await this.run(
				`UPDATE hub_content_sources
				 SET team_id = ?, content_repository_id = ?, production_source = ?, overlay_policy = ?, r2_bucket_name = ?,
				     r2_manifest_key = ?, r2_public_base_url = ?, latest_publish_id = ?, latest_content_version = ?,
				     metadata_json = ?, updated_at = ?
				 WHERE hub_id = ?`,
				[...payload, timestamp, hubId],
			);
			return serializeHubContentSource(await this.first(`SELECT * FROM hub_content_sources WHERE hub_id = ?`, [hubId]));
		}
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO hub_content_sources (
				id, hub_id, team_id, content_repository_id, production_source, overlay_policy, r2_bucket_name, r2_manifest_key,
				r2_public_base_url, latest_publish_id, latest_content_version, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[id, hubId, ...payload, timestamp, timestamp],
		);
		return serializeHubContentSource(await this.first(`SELECT * FROM hub_content_sources WHERE id = ?`, [id]));
	}

	async getHubContentSource(hubId) {
		await this.ensureInitialized();
		return serializeHubContentSource(await this.first(`SELECT * FROM hub_content_sources WHERE hub_id = ?`, [hubId]));
	}

	async createHubLaunch(input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO hub_launches (
				id, hub_id, team_id, job_id, intent_json, plan_json, state, current_phase, last_successful_phase,
				result_json, error_json, created_at, updated_at, completed_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, NULL)`,
			[
				id,
				input.hubId,
				input.teamId,
				input.jobId ?? null,
				JSON.stringify(input.intent ?? {}),
				JSON.stringify(input.plan ?? {}),
				input.state ?? 'queued',
				input.currentPhase ?? 'launch_queued',
				input.lastSuccessfulPhase ?? null,
				timestamp,
				timestamp,
			],
		);
		return this.getHubLaunch(id);
	}

	async getHubLaunch(launchId) {
		await this.ensureInitialized();
		return serializeHubLaunch(await this.first(`SELECT * FROM hub_launches WHERE id = ?`, [launchId]));
	}

	async getLatestHubLaunchForHub(hubId) {
		await this.ensureInitialized();
		return serializeHubLaunch(await this.first(
			`SELECT * FROM hub_launches WHERE hub_id = ? ORDER BY created_at DESC LIMIT 1`,
			[hubId],
		));
	}

	async getHubLaunchByJobId(jobId) {
		await this.ensureInitialized();
		return serializeHubLaunch(await this.first(`SELECT * FROM hub_launches WHERE job_id = ? ORDER BY created_at DESC LIMIT 1`, [jobId]));
	}

	async updateHubLaunch(launchId, input) {
		await this.ensureInitialized();
		const existing = await this.getHubLaunch(launchId);
		if (!existing) return null;
		const timestamp = isoNow();
		const completedAt = input.completedAt === undefined ? existing.completedAt : input.completedAt;
		await this.run(
			`UPDATE hub_launches
			 SET state = ?, current_phase = ?, last_successful_phase = ?, result_json = ?, error_json = ?, updated_at = ?, completed_at = ?
			 WHERE id = ?`,
			[
				input.state ?? existing.state,
				input.currentPhase ?? existing.currentPhase,
				input.lastSuccessfulPhase ?? existing.lastSuccessfulPhase,
				JSON.stringify(input.result === undefined ? existing.result : input.result),
				JSON.stringify(input.error === undefined ? existing.error : input.error),
				timestamp,
				completedAt ?? null,
				launchId,
			],
		);
		return this.getHubLaunch(launchId);
	}

	async appendHubLaunchEvent(launchId, input) {
		await this.ensureInitialized();
		const row = await this.first(
			`SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM hub_launch_events WHERE launch_id = ?`,
			[launchId],
		);
		const seq = Number(row?.next_seq ?? 1);
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO hub_launch_events (
				id, launch_id, seq, phase, status, title, summary, started_at, finished_at, error_json, data_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				launchId,
				seq,
				input.phase,
				input.status,
				input.title ?? null,
				input.summary ?? null,
				input.startedAt ?? null,
				input.finishedAt ?? null,
				input.error ? JSON.stringify(input.error) : null,
				JSON.stringify(input.data ?? {}),
				timestamp,
			],
		);
		return serializeHubLaunchEvent(await this.first(`SELECT * FROM hub_launch_events WHERE id = ?`, [id]));
	}

	async listHubLaunchEvents(launchId) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM hub_launch_events WHERE launch_id = ? ORDER BY seq ASC`,
			[launchId],
		);
		return rows.map(serializeHubLaunchEvent);
	}

	async upsertHubWorkspaceLink(hubId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const project = await this.getProject(hubId);
		const teamId = input.teamId ?? project?.teamId;
		if (!teamId) throw new Error('teamId is required for hub workspace links.');
		const id = input.id ?? randomUUID();
		const existing = input.id
			? await this.first(`SELECT * FROM hub_workspace_links WHERE id = ? AND hub_id = ? LIMIT 1`, [input.id, hubId])
			: null;
		const payload = [
			hubId,
			teamId,
			input.parentRepositoryHostId ?? null,
			input.parentOwner ?? null,
			input.parentName ?? null,
			input.parentUrl ?? null,
			input.parentBranch ?? null,
			input.hubMountPath ?? null,
			input.softwareSubmodulePath ?? null,
			input.contentSubmodulePath ?? null,
			input.updateSubmodulePointersEnabled === true ? 1 : 0,
			JSON.stringify(input.accessPolicy ?? {}),
			JSON.stringify(input.metadata ?? {}),
		];
		if (existing) {
			await this.run(
				`UPDATE hub_workspace_links
				 SET hub_id = ?, team_id = ?, parent_repository_host_id = ?, parent_owner = ?, parent_name = ?, parent_url = ?,
				     parent_branch = ?, hub_mount_path = ?, software_submodule_path = ?, content_submodule_path = ?,
				     update_submodule_pointers_enabled = ?, access_policy_json = ?, metadata_json = ?, updated_at = ?
				 WHERE id = ?`,
				[...payload, timestamp, id],
			);
		} else {
			await this.run(
				`INSERT INTO hub_workspace_links (
					id, hub_id, team_id, parent_repository_host_id, parent_owner, parent_name, parent_url, parent_branch,
					hub_mount_path, software_submodule_path, content_submodule_path, update_submodule_pointers_enabled,
					access_policy_json, metadata_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[id, ...payload, timestamp, timestamp],
			);
		}
		return serializeHubWorkspaceLink(await this.first(`SELECT * FROM hub_workspace_links WHERE id = ?`, [id]));
	}

	async listHubWorkspaceLinks(hubId) {
		await this.ensureInitialized();
		const rows = await this.all(`SELECT * FROM hub_workspace_links WHERE hub_id = ? ORDER BY created_at DESC`, [hubId]);
		return rows.map(serializeHubWorkspaceLink);
	}

	async createProjectUpdatePlan(hubId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const project = await this.getProject(hubId);
		const teamId = input.teamId ?? project?.teamId;
		if (!teamId) throw new Error('teamId is required for project update plans.');
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO project_update_plans (
				id, hub_id, team_id, source_kind, source_ref, source_version, plan_json, state,
				requires_decision, decision_id, created_by, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				hubId,
				teamId,
				input.sourceKind,
				input.sourceRef ?? null,
				input.sourceVersion ?? null,
				JSON.stringify(input.plan ?? {}),
				input.state ?? 'planned',
				input.requiresDecision === true ? 1 : 0,
				input.decisionId ?? null,
				input.createdBy ?? null,
				timestamp,
				timestamp,
			],
		);
		return serializeProjectUpdatePlan(await this.first(`SELECT * FROM project_update_plans WHERE id = ?`, [id]));
	}

	async listProjectUpdatePlans(hubId) {
		await this.ensureInitialized();
		const rows = await this.all(`SELECT * FROM project_update_plans WHERE hub_id = ? ORDER BY created_at DESC`, [hubId]);
		return rows.map(serializeProjectUpdatePlan);
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
		const dailyCreditBudget = Number(input.dailyCreditBudget ?? input.dailyTaskCreditBudget ?? 0);
		await this.run(
			`INSERT OR REPLACE INTO work_policies (
				project_id, environment, schedule_json, enabled, start_cron, duration_minutes, max_runners, max_workers_per_runner,
				daily_credit_budget, closeout_grace_minutes, daily_task_credit_budget, max_queued_tasks, max_queued_credits,
				autoscale_json, credit_weights_json, metadata_json, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM work_policies WHERE project_id = ? AND environment = ?), ?),
				?
			)`,
			[
				projectId,
				input.environment,
				JSON.stringify(input.schedule ?? { timezone: 'UTC', windows: [] }),
				input.enabled === false ? 0 : 1,
				input.startCron ?? '0 9 * * 1-5',
				Number(input.durationMinutes ?? 480),
				Number(input.maxRunners ?? input.autoscale?.maxWorkers ?? 1),
				Number(input.maxWorkersPerRunner ?? 4),
				dailyCreditBudget,
				Number(input.closeoutGraceMinutes ?? 15),
				dailyCreditBudget,
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

	async createWorkdayRequest(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO workday_requests (
				id, project_id, environment, type, state, work_day_id, requested_by, reason, payload_json, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				projectId,
				input.environment,
				input.type,
				input.state ?? 'pending',
				input.workDayId ?? null,
				input.requestedBy ?? null,
				input.reason ?? null,
				JSON.stringify(input.payload ?? {}),
				JSON.stringify(input.metadata ?? {}),
				timestamp,
				timestamp,
			],
		);
		return serializeWorkdayRequest(await this.first(`SELECT * FROM workday_requests WHERE id = ?`, [id]));
	}

	async listWorkdayRequests(projectId, environment, state = null) {
		await this.ensureInitialized();
		const rows = state
			? await this.all(
				`SELECT * FROM workday_requests WHERE project_id = ? AND environment = ? AND state = ? ORDER BY created_at ASC`,
				[projectId, environment, state],
			)
			: await this.all(
				`SELECT * FROM workday_requests WHERE project_id = ? AND environment = ? ORDER BY created_at ASC`,
				[projectId, environment],
			);
		return rows.map(serializeWorkdayRequest);
	}

	async recordWorkerRunner(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? `${projectId}:${input.environment}:${input.runnerId}`;
		const maxLocalWorkers = Number(input.maxLocalWorkers ?? 4);
		const activeLocalWorkers = Number(input.activeLocalWorkers ?? 0);
		await this.run(
			`INSERT OR REPLACE INTO worker_runners (
				id, project_id, environment, runner_id, runner_service_name, volume_identity, state, max_local_workers, active_local_workers,
				available_capacity, last_heartbeat_at, claimed_repository_ids_json, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM worker_runners WHERE id = ?), ?),
				?
			)`,
			[
				id,
				projectId,
				input.environment,
				input.runnerId,
				input.runnerServiceName,
				input.volumeIdentity,
				input.state ?? 'active',
				maxLocalWorkers,
				activeLocalWorkers,
				Math.max(0, maxLocalWorkers - activeLocalWorkers),
				input.lastHeartbeatAt ?? timestamp,
				JSON.stringify(input.claimedRepositoryIds ?? []),
				JSON.stringify(input.metadata ?? {}),
				id,
				timestamp,
				timestamp,
			],
		);
		return serializeWorkerRunner(await this.first(`SELECT * FROM worker_runners WHERE id = ?`, [id]));
	}

	async listWorkerRunners(projectId, environment) {
		await this.ensureInitialized();
		const rows = await this.all(
			`SELECT * FROM worker_runners WHERE project_id = ? AND environment = ? ORDER BY runner_id ASC`,
			[projectId, environment],
		);
		return rows.map(serializeWorkerRunner);
	}

	async recordRepositoryClaim(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? `${projectId}:${input.repositoryId}:${input.runnerId}`;
		await this.run(
			`INSERT OR REPLACE INTO repository_claims (
				id, project_id, repository_id, runner_id, runner_service_name, volume_identity, last_seen_commit, last_task_at, claim_state, metadata_json, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
				COALESCE((SELECT created_at FROM repository_claims WHERE id = ?), ?),
				?
			)`,
			[
				id,
				projectId,
				input.repositoryId,
				input.runnerId,
				input.runnerServiceName,
				input.volumeIdentity,
				input.lastSeenCommit ?? null,
				input.lastTaskAt ?? timestamp,
				input.claimState ?? 'active',
				JSON.stringify(input.metadata ?? {}),
				id,
				timestamp,
				timestamp,
			],
		);
		return serializeRepositoryClaim(await this.first(`SELECT * FROM repository_claims WHERE id = ?`, [id]));
	}

	async listRepositoryClaims(projectId, repositoryId = null) {
		await this.ensureInitialized();
		const rows = repositoryId
			? await this.all(
				`SELECT * FROM repository_claims WHERE project_id = ? AND repository_id = ? ORDER BY updated_at DESC`,
				[projectId, repositoryId],
			)
			: await this.all(
				`SELECT * FROM repository_claims WHERE project_id = ? ORDER BY updated_at DESC`,
				[projectId],
			);
		return rows.map(serializeRepositoryClaim);
	}

	async recordRunnerScaleDecision(projectId, input) {
		await this.ensureInitialized();
		const timestamp = isoNow();
		const id = input.id ?? randomUUID();
		await this.run(
			`INSERT INTO runner_scale_decisions (
				id, project_id, environment, work_day_id, runner_id, runner_service_name, action, reason, metadata_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				projectId,
				input.environment,
				input.workDayId ?? null,
				input.runnerId ?? null,
				input.runnerServiceName ?? null,
				input.action,
				input.reason,
				JSON.stringify(input.metadata ?? {}),
				timestamp,
			],
		);
		return serializeRunnerScaleDecision(await this.first(`SELECT * FROM runner_scale_decisions WHERE id = ?`, [id]));
	}

	async listRunnerScaleDecisions(projectId, environment, workDayId = null) {
		await this.ensureInitialized();
		const rows = workDayId
			? await this.all(
				`SELECT * FROM runner_scale_decisions WHERE project_id = ? AND environment = ? AND work_day_id = ? ORDER BY created_at DESC`,
				[projectId, environment, workDayId],
			)
			: await this.all(
				`SELECT * FROM runner_scale_decisions WHERE project_id = ? AND environment = ? ORDER BY created_at DESC`,
				[projectId, environment],
			);
		return rows.map(serializeRunnerScaleDecision);
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
					id, project_id, namespace, operation, label, execution_class, allowed_targets_json,
					default_dispatch_mode, enabled, approval_policy_json, resource_scope_json, metadata_json, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					randomUUID(),
					projectId,
					grant.namespace,
					grant.operation,
					typeof grant.label === 'string' ? grant.label : null,
					grant.executionClass,
					JSON.stringify(grant.allowedTargets ?? []),
					grant.defaultDispatchMode ?? 'auto',
					grant.enabled === false ? 0 : 1,
					JSON.stringify(grant.approvalPolicy && typeof grant.approvalPolicy === 'object' ? grant.approvalPolicy : {}),
					JSON.stringify(grant.resourceScope && typeof grant.resourceScope === 'object' ? grant.resourceScope : {}),
					JSON.stringify(grant.metadata && typeof grant.metadata === 'object' ? grant.metadata : {}),
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
		const [connection, capabilityGrants, entitlement, hosting, environments, resources, deployments, agentPools, repositories, contentSource, latestLaunch] = await Promise.all([
			this.getProjectConnection(projectId),
			this.listProjectCapabilities(projectId),
			(async () => serializeEntitlement(await this.first(`SELECT * FROM entitlements WHERE project_id = ? LIMIT 1`, [projectId])))(),
			this.getProjectHosting(projectId),
			this.listProjectEnvironments(projectId),
			this.listProjectInfrastructureResources(projectId),
			this.listProjectDeployments(projectId),
			this.listAgentPools(projectId),
			this.listHubRepositories(projectId),
			this.getHubContentSource(projectId),
			this.getLatestHubLaunchForHub(projectId),
		]);
		const latestLaunchEvents = latestLaunch ? await this.listHubLaunchEvents(latestLaunch.id) : [];
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
			repositories,
			contentSource,
			latestLaunch,
			latestLaunchEvents,
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
			repositories: details.repositories,
			contentSource: details.contentSource,
			capabilityGrants: details.capabilityGrants,
			latestLaunch: details.latestLaunch,
			latestLaunchEvents: details.latestLaunchEvents,
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

	async retryJob(jobId, input = {}) {
		await this.ensureInitialized();
		const existing = await this.findJobById(jobId);
		if (!existing) return null;
		const timestamp = isoNow();
		const nextInput = {
			...(existing.input ?? {}),
			...(input.inputPatch && typeof input.inputPatch === 'object' ? input.inputPatch : {}),
		};
		await this.run(
			`UPDATE remote_jobs
			 SET status = ?,
			     input_json = ?,
			     output_json = NULL,
			     error_json = NULL,
			     assigned_runner_id = NULL,
			     updated_at = ?,
			     started_at = NULL,
			     finished_at = NULL,
			     cancelled_at = NULL
			 WHERE id = ?`,
			[
				input.status ?? 'pending',
				JSON.stringify(nextInput),
				timestamp,
				jobId,
			],
		);
		await this.appendJobEvent(jobId, input.eventType ?? 'retry_queued', {
			status: input.status ?? 'pending',
			resume: nextInput.resume === true,
		});
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
