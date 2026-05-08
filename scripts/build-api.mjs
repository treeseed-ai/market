#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const coreRoot = resolve(root, 'packages/core');
const coreBuildScript = resolve(coreRoot, 'scripts/build-dist.ts');
const installedCoreApi = resolve(root, 'node_modules/@treeseed/core/dist/api.js');
const lockDir = resolve(root, 'node_modules/.cache/treeseed-build-api.lock');
const staleLockMs = 10 * 60 * 1000;
const waitTimeoutMs = 15 * 60 * 1000;

const requiredWorkspaceOutputs = [
	'dist/api.js',
	'dist/config.js',
	'dist/config.d.ts',
	'dist/services/agents.js',
	'dist/services/workday-manager.js',
	'dist/services/worker.js',
].map((relativePath) => resolve(coreRoot, relativePath));

const buildInputs = [
	resolve(root, 'package.json'),
	resolve(root, 'scripts/build-api.mjs'),
	resolve(coreRoot, 'package.json'),
	resolve(coreRoot, 'scripts/build-dist.ts'),
	resolve(coreRoot, 'src'),
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

function newestInputMtime() {
	return buildInputs
		.flatMap((input) => walkFiles(input))
		.reduce((newest, filePath) => Math.max(newest, statSync(filePath).mtimeMs), 0);
}

function workspaceOutputsReady() {
	if (!requiredWorkspaceOutputs.every((filePath) => existsSync(filePath))) {
		return false;
	}

	const newestInput = newestInputMtime();
	const oldestOutput = requiredWorkspaceOutputs.reduce(
		(oldest, filePath) => Math.min(oldest, statSync(filePath).mtimeMs),
		Number.POSITIVE_INFINITY,
	);
	return oldestOutput >= newestInput;
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
			console.log('Using workspace @treeseed/core API build from another build:api process.');
			return;
		}

		if (lockIsStale()) {
			console.warn('Removing stale @treeseed/core build lock.');
			releaseLock();
			return;
		}

		await delay(1000);
	}

	throw new Error('Timed out waiting for @treeseed/core API build lock.');
}

async function main() {
	if (!existsSync(coreBuildScript)) {
		if (existsSync(installedCoreApi)) {
			console.log('Using installed @treeseed/core API build.');
			return;
		}
		throw new Error('Unable to resolve @treeseed/core API build output.');
	}

	if (workspaceOutputsReady()) {
		console.log('Using existing workspace @treeseed/core API build.');
		return;
	}

	while (!tryAcquireLock()) {
		await waitForWorkspaceBuild();
		if (workspaceOutputsReady()) {
			return;
		}
	}

	try {
		const result = spawnSync('npm', ['--prefix', './packages/core', 'run', 'build:dist'], {
			cwd: root,
			env: process.env,
			stdio: 'inherit',
		});
		if (result.status !== 0) {
			throw new Error(`@treeseed/core API build command failed with exit code ${result.status ?? 1}.`);
		}
		if (!workspaceOutputsReady()) {
			throw new Error('@treeseed/core API build finished without required dist outputs.');
		}
	} finally {
		releaseLock();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
