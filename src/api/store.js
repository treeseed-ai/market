import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const migrationSql = [
	'../../migrations/0007_site_web_sessions.sql',
	'../../migrations/0008_market_control_plane.sql',
	'../../migrations/0009_team_content_catalog.sql',
	'../../migrations/0010_project_hosting_topology.sql',
	'../../migrations/0011_control_plane_reporting.sql',
]
	.map((relativePath) => fileURLToPath(new URL(relativePath, import.meta.url)))
	.map((migrationPath) => readFileSync(migrationPath, 'utf8'))
	.join('\n');

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
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		metadata: parseJson(row.metadata_json, {}),
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
			this.initializationPromise = this.db.exec(migrationSql);
		}
		return this.initializationPromise;
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
			`SELECT team_api_keys.*, teams.slug AS team_slug, teams.name AS team_name
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
						teamSlug: row.team_slug,
						teamName: row.team_name,
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
		await this.run(
			`INSERT INTO teams (id, slug, name, metadata_json, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[id, input.slug, input.name, JSON.stringify(input.metadata ?? {}), timestamp, timestamp],
		);
		if (input.ownerUserId) {
			await this.run(
				`INSERT OR IGNORE INTO team_memberships (id, team_id, user_id, status, created_at, updated_at)
				 VALUES (?, ?, ?, 'active', ?, ?)`,
				[randomUUID(), id, input.ownerUserId, timestamp, timestamp],
			);
		}
		return this.getTeam(id);
	}

	async getTeam(teamId) {
		await this.ensureInitialized();
		return serializeTeam(await this.first(`SELECT * FROM teams WHERE id = ?`, [teamId]));
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

	async getProject(projectId) {
		await this.ensureInitialized();
		return serializeProject(await this.first(`SELECT * FROM projects WHERE id = ?`, [projectId]));
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
		await this.run(
			`INSERT INTO remote_jobs (
				id, project_id, namespace, operation, status, preferred_mode, selected_target, capability_json,
				input_json, output_json, error_json, requested_by_type, requested_by_id, assigned_runner_id,
				idempotency_key, created_at, updated_at, started_at, finished_at, cancelled_at
			) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, NULL, ?, ?, NULL, ?, ?, ?, NULL, NULL, NULL)`,
			[
				id,
				input.projectId,
				input.namespace,
				input.operation,
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
			 SET status = CASE WHEN status = 'pending' THEN 'running' ELSE status END,
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
