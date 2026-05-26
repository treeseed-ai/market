#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	PlatformRunnerClient,
	runPlatformOperationOnce,
} from '../../packages/sdk/src/platform-operations.ts';
import {
	createPlatformOperationStoreFromEnv,
} from '../../packages/sdk/src/platform-operation-store.ts';
import {
	executePlatformRepositoryOperation,
} from '../../packages/sdk/src/operations/repository-operations.ts';
import { createMarketPostgresDatabase } from '../api/market-postgres.js';
import { MarketControlPlaneStore } from '../api/store.js';
import { createProjectWebDeploymentExecutor } from './project-web-deployment-executor.js';

function readArg(name, fallback = null) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function hasArg(name) {
	return process.argv.includes(name);
}

function readNumberArg(name, fallback) {
	const value = readArg(name);
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOperationKey(value) {
	const normalized = typeof value === 'string' ? value.trim() : '';
	if (!normalized) return null;
	const [namespace, operation] = normalized.split(':');
	if (!namespace || !operation) {
		throw new Error(`Invalid --operation value "${normalized}". Expected namespace:operation.`);
	}
	return `${namespace}:${operation}`;
}

function parseRunnerOptions() {
	return {
		once: hasArg('--once'),
		watch: hasArg('--watch'),
		operationId: readArg('--operation-id'),
		operationKey: parseOperationKey(readArg('--operation')),
		pollIntervalMs: readNumberArg('--poll-interval-ms', 5000),
		maxJobs: readNumberArg('--max-jobs', 1),
		dryRun: hasArg('--dry-run'),
		mockExternal: hasArg('--mock-external'),
		mockResult: readArg('--mock-result', 'success') === 'failure' ? 'failure' : 'success',
	};
}

function env(name, fallback = null) {
	const value = process.env[name];
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

async function packageVersion() {
	try {
		const raw = await readFile(resolve(process.cwd(), 'package.json'), 'utf8');
		return JSON.parse(raw).version ?? '0.0.0';
	} catch {
		return '0.0.0';
	}
}

async function loadConfig({ requireSecrets = true } = {}) {
	const marketId = readArg('--market') ?? env('TREESEED_MARKET_ID', 'local');
	const config = {
		marketUrl: env('TREESEED_MARKET_API_BASE_URL') ?? env('TREESEED_MARKET_URL'),
		marketDatabaseUrl: env('TREESEED_MARKET_DATABASE_URL'),
		marketId,
		runnerId: env('TREESEED_PLATFORM_RUNNER_ID', marketId === 'prod' ? 'market-ops-prod-1' : marketId === 'staging' ? 'market-ops-staging-1' : 'market-ops-local-1'),
		runnerSecret: env('TREESEED_PLATFORM_RUNNER_SECRET'),
		dataDir: env('TREESEED_PLATFORM_RUNNER_DATA_DIR', resolve(process.cwd(), '.treeseed/market-operations-runner')),
		environment: env('TREESEED_PLATFORM_RUNNER_ENVIRONMENT', marketId === 'prod' ? 'production' : marketId),
		port: Number(env('PORT', '0')),
	};
	if (requireSecrets) {
		const missing = Object.entries({
			TREESEED_MARKET_DATABASE_URL: config.marketDatabaseUrl,
		}).filter(([, value]) => !value).map(([key]) => key);
		if (missing.length > 0) {
			throw new Error(`Missing required market operations runner environment: ${missing.join(', ')}`);
		}
	}
	await mkdir(config.dataDir, { recursive: true });
	const probe = resolve(config.dataDir, '.treeseed-runner-write-check');
	await writeFile(probe, 'ok\n', 'utf8');
	await rm(probe, { force: true });
	return config;
}

function loadHealthConfig() {
	return {
		port: Number(env('PORT', '0')),
		dataDir: env('TREESEED_PLATFORM_RUNNER_DATA_DIR', resolve(process.cwd(), '.treeseed/market-operations-runner')),
	};
}

function createClient(config) {
	if (config.marketDatabaseUrl) {
		return createPlatformOperationStoreFromEnv({
			databaseUrl: config.marketDatabaseUrl,
			initializeSchema: true,
		});
	}
	return new PlatformRunnerClient({
		marketUrl: config.marketUrl,
		marketId: config.marketId,
		runnerSecret: config.runnerSecret,
		userAgent: `treeseed-market-operations-runner/${process.version}`,
	});
}

function createDeploymentStore(config) {
	if (!config.marketDatabaseUrl) return null;
	const db = createMarketPostgresDatabase(config.marketDatabaseUrl);
	return new MarketControlPlaneStore(config, db);
}

export function createExecutors() {
	return createExecutorsForOptions({});
}

export function createExecutorsForOptions(options = {}) {
	const noop = {
		namespace: 'market',
		operation: 'noop',
		async run(_input, context) {
			await context.checkpoint({ phase: 'diagnostic' }, { kind: 'market.noop', data: { runnerId: process.env.TREESEED_PLATFORM_RUNNER_ID ?? null } });
			return {
				ok: true,
				message: 'Market operations runner diagnostic completed.',
			};
		},
	};
	const diagnostic = {
		...noop,
		operation: 'diagnostic',
	};
	const repositoryExecutor = (operation) => ({
		namespace: 'repository',
		operation,
		async run(input, context) {
			await context.checkpoint({
				phase: 'repository.sync',
				operation,
				projectId: input?.projectId ?? null,
			}, {
				kind: 'repository.sync_started',
				data: { operation, projectId: input?.projectId ?? null },
			});
			const result = await executePlatformRepositoryOperation(operation, input, {
				workspaceRoot: context.workspaceRoot,
				environment: context.environment,
			}).catch(async (error) => {
				if (error?.verification) {
					await context.emit({
						kind: 'repository.verification_failed',
						data: {
							status: error.verification.status,
							commands: error.verification.commands?.map((command) => ({
								command: command.command,
								args: command.args,
								cwd: command.cwd,
								exitCode: command.exitCode,
							})) ?? [],
						},
					});
				}
				throw error;
			});
			await context.checkpoint({
				phase: 'repository.written',
				changedPaths: result.changedPaths,
				branch: result.branch,
				commitSha: result.commitSha,
				verification: result.verification,
			}, {
				kind: 'repository.written',
				data: {
					changedPaths: result.changedPaths,
					branch: result.branch,
					commitSha: result.commitSha,
					verificationStatus: result.verification?.status ?? 'skipped',
				},
			});
			if (result.commitSha) {
				await context.checkpoint({
					phase: 'repository.committed',
					branch: result.branch,
					commitSha: result.commitSha,
				}, {
					kind: 'repository.committed',
					data: { branch: result.branch, commitSha: result.commitSha },
				});
			}
			if (input?.repository?.push === true) {
				await context.checkpoint({
					phase: 'repository.push_ready',
					branch: result.branch,
				}, {
					kind: 'repository.push_ready',
					data: { branch: result.branch },
				});
			}
			return result;
		},
	});
	return [
		noop,
		diagnostic,
		repositoryExecutor('write_content_record'),
		repositoryExecutor('create_related_content'),
		repositoryExecutor('create_decision_from_proposals'),
		createProjectWebDeploymentExecutor({
			deploymentStore: options.deploymentStore,
			mockExternal: options.mockExternal,
			mockResult: options.mockResult,
			dryRun: options.dryRun,
			pollSeconds: Math.max(0, Math.round(Number(options.pollIntervalMs ?? 5000) / 1000)),
		}),
	].filter((executor) => !options.operationKey || `${executor.namespace}:${executor.operation}` === options.operationKey);
}

export async function registerAndHeartbeat(client, config, version, options = {}) {
	const executors = createExecutorsForOptions(options);
	const payload = {
		runnerId: config.runnerId,
		name: config.runnerId,
		environment: config.environment,
		version,
		capabilities: executors.map((executor) => `${executor.namespace}:${executor.operation}`),
		maxConcurrentJobs: Math.max(1, Number(options.maxJobs ?? 1) || 1),
		metadata: {
			dataDir: config.dataDir,
			process: 'market-operations-runner',
			queue: {
				activeJobCount: 0,
				maxConcurrentJobs: Math.max(1, Number(options.maxJobs ?? 1) || 1),
			},
			dryRun: options.dryRun === true,
			mockExternal: options.mockExternal === true,
		},
	};
	await client.register(payload);
	await client.heartbeat({
		runnerId: config.runnerId,
		environment: config.environment,
		version,
		activeJobCount: 0,
		maxConcurrentJobs: payload.maxConcurrentJobs,
		capabilities: payload.capabilities,
	});
}

export async function runOnceWithClient(config, client, version, options = {}) {
	const deploymentStore = options.deploymentStore ?? options.store ?? null;
	await registerAndHeartbeat(client, config, version, { ...options, deploymentStore });
	const result = await runPlatformOperationOnce({
		client,
		runnerId: config.runnerId,
		workspaceRoot: config.dataDir,
		environment: config.environment,
		executors: createExecutorsForOptions({ ...options, deploymentStore }),
		operationId: options.operationId ?? null,
		limit: Math.max(1, Number(options.maxJobs ?? 1) || 1),
		leaseSeconds: 300,
		throwIfCancelled: async (operation) => {
			if (!deploymentStore || operation.namespace !== 'project' || operation.operation !== 'web_deployment') return;
			const deploymentId = operation.input?.deploymentId;
			if (typeof deploymentId !== 'string' || !deploymentId) return;
			const deployment = await deploymentStore.findProjectDeploymentById(deploymentId);
			if (!deployment?.metadata?.cancellation?.requested) return;
			await deploymentStore.updateProjectDeployment(deployment.id, {
				status: 'cancelled',
				summary: 'Deployment was cancelled.',
				error: {
					code: 'deployment_cancelled',
					message: 'Deployment cancellation was requested.',
					retrySafe: true,
					resumeSafe: false,
				},
			});
			await deploymentStore.appendProjectDeploymentEvent(deployment.id, {
				kind: 'deployment.cancelled',
				message: 'Deployment was cancelled.',
				status: 'cancelled',
				severity: 'warning',
				operationId: operation.id,
			});
			await deploymentStore.recordProjectDeploymentAudit?.(deployment.id, 'project_deployment_cancelled', {
				actorType: 'system',
				actorId: config.runnerId,
				actorUserId: deployment.requestedByUserId ?? null,
				status: 'cancelled',
				operationId: operation.id,
				summary: 'Deployment was cancelled.',
			});
			throw new Error('Deployment cancellation was requested.');
		},
	});
	console.log(JSON.stringify(result));
	if (!result.ok) process.exitCode = 1;
	return result;
}

async function runOnce(options = {}) {
	const config = await loadConfig();
	const version = await packageVersion();
	const client = await createClient(config);
	const deploymentStore = options.deploymentStore ?? createDeploymentStore(config);
	try {
		return await runOnceWithClient(config, client, version, { ...options, deploymentStore });
	} finally {
		await client.close?.();
		await deploymentStore?.db?.close?.();
	}
}

function startHealthServer(config, state = {}) {
	if (!config.port) return null;
	const server = createServer((request, response) => {
		if (request.url === '/healthz') {
			response.writeHead(200, { 'content-type': 'application/json' });
			response.end(JSON.stringify({ ok: true, service: 'market-operations-runner', state: state.status ?? 'booting' }));
			return;
		}
		if (request.url === '/readyz') {
			const ready = state.ready === true;
			response.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
			response.end(JSON.stringify({
				ok: ready,
				service: 'market-operations-runner',
				state: state.status ?? 'booting',
				error: state.error ?? null,
			}));
			return;
		}
		response.writeHead(404, { 'content-type': 'application/json' });
		response.end(JSON.stringify({ ok: false, error: 'Not found.' }));
	});
	server.listen(config.port);
	return server;
}

async function runLoop() {
	const healthState = { ready: false, status: 'booting', error: null };
	startHealthServer(loadHealthConfig(), healthState);
	const version = await packageVersion();
	const options = parseRunnerOptions();
	let stopping = false;
	process.once('SIGINT', () => { stopping = true; });
	process.once('SIGTERM', () => { stopping = true; });
	let client = null;
	let config = null;
	let deploymentStore = null;
	while (!stopping) {
		try {
			if (!config) {
				config = await loadConfig();
			}
			if (!client) {
				client = await createClient(config);
				deploymentStore = options.deploymentStore ?? createDeploymentStore(config);
				await registerAndHeartbeat(client, config, version, { ...options, deploymentStore });
			}
			healthState.ready = true;
			healthState.status = 'running';
			healthState.error = null;
			await runOnceWithClient(config, client, version, { ...options, deploymentStore });
		} catch (error) {
			healthState.ready = false;
			healthState.status = 'degraded';
			healthState.error = error instanceof Error ? error.message : String(error);
			console.error(JSON.stringify({
				ok: false,
				error: healthState.error,
			}));
			if (client?.close) {
				await client.close().catch(() => {});
			}
			await deploymentStore?.db?.close?.().catch?.(() => {});
			client = null;
			deploymentStore = null;
		}
		await new Promise((resolveSleep) => setTimeout(resolveSleep, options.pollIntervalMs));
	}
	if (client && config) {
		await client.heartbeat({
			runnerId: config.runnerId,
			environment: config.environment,
			version,
			status: 'offline',
			activeJobCount: 0,
		}).catch(() => {});
		await client.close?.();
		await deploymentStore?.db?.close?.();
	}
}

export async function main() {
	const command = process.argv[2] ?? 'help';
	const runnerOptions = parseRunnerOptions();
	if (runnerOptions.once) {
		await runOnce(runnerOptions);
		return;
	}
	if (runnerOptions.watch) {
		await runLoop();
		return;
	}
	if (command === 'version') {
		console.log(JSON.stringify({
			ok: true,
			name: 'market-operations-runner',
			version: await packageVersion(),
		}));
		return;
	}
	if (command === 'healthcheck') {
		const config = await loadConfig({ requireSecrets: false });
		console.log(JSON.stringify({
			ok: true,
			service: 'market-operations-runner',
			dataDir: config.dataDir,
		}));
		return;
	}
	if (command === 'once') {
		await runOnce(runnerOptions);
		return;
	}
	if (command === 'run') {
		await runLoop();
		return;
	}
	console.error('Usage: market-operations-runner <version|healthcheck|once|run>');
	process.exitCode = 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	await main().catch((error) => {
		console.error(JSON.stringify({
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		}));
		process.exitCode = 1;
	});
}
