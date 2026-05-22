#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	PlatformRunnerClient,
	runPlatformOperationOnce,
} from '@treeseed/sdk/platform-operations';
import {
	createPlatformOperationStoreFromEnv,
} from '@treeseed/sdk/platform-operation-store';
import {
	executePlatformRepositoryOperation,
} from '@treeseed/sdk/operations/repository-operations';

function readArg(name, fallback = null) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
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
	const marketId = env('TREESEED_MARKET_ID', 'local');
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

export function createExecutors() {
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
	];
}

export async function registerAndHeartbeat(client, config, version) {
	const payload = {
		runnerId: config.runnerId,
		name: config.runnerId,
		environment: config.environment,
		version,
		capabilities: [
			'market:noop',
			'market:diagnostic',
			'repository:write_content_record',
			'repository:create_related_content',
			'repository:create_decision_from_proposals',
		],
		maxConcurrentJobs: 1,
		metadata: {
			dataDir: config.dataDir,
			process: 'market-operations-runner',
			queue: {
				activeJobCount: 0,
				maxConcurrentJobs: 1,
			},
		},
	};
	await client.register(payload);
	await client.heartbeat({
		runnerId: config.runnerId,
		environment: config.environment,
		version,
		activeJobCount: 0,
		maxConcurrentJobs: 1,
		capabilities: payload.capabilities,
	});
}

export async function runOnceWithClient(config, client, version, options = {}) {
	await registerAndHeartbeat(client, config, version);
	const result = await runPlatformOperationOnce({
		client,
		runnerId: config.runnerId,
		workspaceRoot: config.dataDir,
		environment: config.environment,
		executors: createExecutors(),
		operationId: options.operationId ?? null,
		limit: 1,
		leaseSeconds: 300,
	});
	console.log(JSON.stringify(result));
	if (!result.ok) process.exitCode = 1;
	return result;
}

async function runOnce(options = {}) {
	const config = await loadConfig();
	const version = await packageVersion();
	const client = await createClient(config);
	try {
		return await runOnceWithClient(config, client, version, options);
	} finally {
		await client.close?.();
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
	let stopping = false;
	process.once('SIGINT', () => { stopping = true; });
	process.once('SIGTERM', () => { stopping = true; });
	let client = null;
	let config = null;
	while (!stopping) {
		try {
			if (!config) {
				config = await loadConfig();
			}
			if (!client) {
				client = await createClient(config);
				await registerAndHeartbeat(client, config, version);
			}
			healthState.ready = true;
			healthState.status = 'running';
			healthState.error = null;
			await runOnceWithClient(config, client, version);
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
			client = null;
		}
		await new Promise((resolveSleep) => setTimeout(resolveSleep, 5000));
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
	}
}

export async function main() {
	const command = process.argv[2] ?? 'help';
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
		await runOnce({ operationId: readArg('--operation-id') });
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
