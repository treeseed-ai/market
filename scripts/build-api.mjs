#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const sdkRoot = resolve(root, 'packages/sdk');
const sdkBuildScript = resolve(sdkRoot, 'scripts/build-dist.ts');
const agentRoot = resolve(root, 'packages/agent');
const agentBuildScript = resolve(agentRoot, 'scripts/build-dist.ts');
const installedAgentApi = resolve(root, 'node_modules/@treeseed/agent/dist/api/index.js');
const lockDir = resolve(root, 'node_modules/.cache/treeseed-build-agent-api.lock');
const staleLockMs = 10 * 60 * 1000;
const waitTimeoutMs = 15 * 60 * 1000;

const requiredSdkOutputs = [
	'dist/index.js',
	'dist/workflow-support.js',
	'dist/plugin-default.js',
].map((relativePath) => resolve(sdkRoot, relativePath));

const requiredWorkspaceOutputs = [
	'dist/api/index.js',
	'dist/api/index.d.ts',
	'dist/services/agents.js',
	'dist/services/workday-manager.js',
	'dist/services/worker.js',
].map((relativePath) => resolve(agentRoot, relativePath));

const buildInputs = [
	resolve(root, 'package.json'),
	resolve(root, 'scripts/build-api.mjs'),
	resolve(sdkRoot, 'package.json'),
	resolve(sdkRoot, 'scripts/build-dist.ts'),
	resolve(sdkRoot, 'src'),
	resolve(agentRoot, 'package.json'),
	resolve(agentRoot, 'scripts/build-dist.ts'),
	resolve(agentRoot, 'src'),
];

const sdkBuildInputs = [
	resolve(sdkRoot, 'package.json'),
	resolve(sdkRoot, 'scripts/build-dist.ts'),
	resolve(sdkRoot, 'src'),
];

function walkFiles(path) {
	if (!existsSync(path)) return [];
	const stat = statSync(path);
	if (!stat.isDirectory()) return [path];

	const files = [];
	for (const entry of readdirSync(path, { withFileTypes: true })) {
		const fullPath = join(path, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkFiles(fullPath));
		} else {
			files.push(fullPath);
		}
	}
	return files;
}

function newestInputMtime(inputs = buildInputs) {
	return inputs
		.flatMap((input) => walkFiles(input))
		.reduce((newest, filePath) => Math.max(newest, statSync(filePath).mtimeMs), 0);
}

function outputsReady(requiredOutputs, inputs = buildInputs) {
	if (!requiredOutputs.every((filePath) => existsSync(filePath))) {
		return false;
	}

	const newestInput = newestInputMtime(inputs);
	const oldestOutput = requiredOutputs.reduce(
		(oldest, filePath) => Math.min(oldest, statSync(filePath).mtimeMs),
		Number.POSITIVE_INFINITY,
	);
	return oldestOutput >= newestInput;
}

function sdkOutputsReady() {
	return outputsReady(requiredSdkOutputs, sdkBuildInputs);
}

function workspaceOutputsReady() {
	return outputsReady(requiredWorkspaceOutputs, buildInputs);
}

function runPackageBuild(packageRoot, label) {
	const result = spawnSync('npm', ['run', 'build:dist'], {
		cwd: packageRoot,
		env: process.env,
		stdio: 'inherit',
	});
	if (result.status !== 0) {
		throw new Error(`${label} build command failed with exit code ${result.status ?? 1}.`);
	}
}

function ensureAgentSdkWorkspaceLink() {
	const packageScopeDir = resolve(agentRoot, 'node_modules/@treeseed');
	const packageSdkPath = resolve(packageScopeDir, 'sdk');
	mkdirSync(packageScopeDir, { recursive: true });
	rmSync(packageSdkPath, { recursive: true, force: true });
	symlinkSync(relative(packageScopeDir, sdkRoot), packageSdkPath, 'dir');
}

function lockIsStale() {
	if (!existsSync(lockDir)) return false;
	return Date.now() - statSync(lockDir).mtimeMs > staleLockMs;
}

function tryAcquireLock() {
	try {
		mkdirSync(dirname(lockDir), { recursive: true });
		mkdirSync(lockDir);
		writeFileSync(
			resolve(lockDir, 'owner.json'),
			JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2),
			'utf8',
		);
		return true;
	} catch {
		return false;
	}
}

function releaseLock() {
	rmSync(lockDir, { recursive: true, force: true });
}

async function waitForWorkspaceBuild() {
	const startedAt = Date.now();

	while (Date.now() - startedAt < waitTimeoutMs) {
		if (workspaceOutputsReady()) {
			console.log('Using workspace @treeseed/agent API build from another build:api process.');
			return;
		}

		if (lockIsStale()) {
			console.warn('Removing stale @treeseed/agent build lock.');
			releaseLock();
			return;
		}

		await delay(1000);
	}

	throw new Error('Timed out waiting for @treeseed/agent API build lock.');
}

async function main() {
	if (existsSync(sdkBuildScript)) {
		if (sdkOutputsReady()) {
			console.log('Using existing workspace @treeseed/sdk build.');
		} else {
			runPackageBuild(sdkRoot, '@treeseed/sdk');
			if (!sdkOutputsReady()) {
				throw new Error('@treeseed/sdk build finished without required dist outputs.');
			}
		}
		ensureAgentSdkWorkspaceLink();
	}

	if (!existsSync(agentBuildScript)) {
		if (existsSync(installedAgentApi)) {
			console.log('Using installed @treeseed/agent API build.');
			return;
		}
		throw new Error('Unable to resolve @treeseed/agent API build output.');
	}

	if (workspaceOutputsReady()) {
		console.log('Using existing workspace @treeseed/agent API build.');
		return;
	}

	while (!tryAcquireLock()) {
		await waitForWorkspaceBuild();
		if (workspaceOutputsReady()) {
			return;
		}
	}

	try {
		runPackageBuild(agentRoot, '@treeseed/agent API');
		if (!workspaceOutputsReady()) {
			throw new Error('@treeseed/agent API build finished without required dist outputs.');
		}
	} finally {
		releaseLock();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
