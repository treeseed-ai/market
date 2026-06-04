#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptRoot, '..');
const parallel = process.env.TREESEED_VERIFY_PARALLEL === '1' || process.env.TREESEED_VERIFY_PARALLEL === 'true';
const keepWorkspaces = process.env.TREESEED_VERIFY_KEEP_PARALLEL_WORKSPACES === '1';
const tasks = [
	{ id: 'check', command: ['npm', ['run', 'check']], isolated: true },
	{ id: 'unit', command: ['npm', ['run', 'test:unit']], isolated: false },
	{ id: 'build', command: ['npm', ['run', 'build']], isolated: true },
];
const ignoredTopLevelSegments = new Set([
	'.astro',
	'.git',
	'.treeseed',
	'.wrangler',
	'coverage',
	'dist',
	'node_modules',
	'reports',
]);

function run(command, args, cwd) {
	return new Promise((resolveRun) => {
		const child = spawn(command, args, {
			cwd,
			env: parallel ? { ...process.env, TREESEED_VERIFY_PARALLEL_CHILD: '1' } : process.env,
			stdio: 'inherit',
		});
		child.on('exit', (status, signal) => resolveRun({ status: status ?? 1, signal }));
		child.on('error', (error) => {
			process.stderr.write(`${command} ${args.join(' ')} failed to start: ${error.message}\n`);
			resolveRun({ status: 1, signal: null });
		});
	});
}

async function runSerial() {
	for (const task of tasks) {
		const result = await run(task.command[0], task.command[1], root);
		if (result.status !== 0) {
			return result.status;
		}
	}
	return 0;
}

function copyWorkspace(sourceRoot, targetRoot) {
	cpSync(sourceRoot, targetRoot, {
		recursive: true,
		filter: (source) => {
			const rel = relative(sourceRoot, source);
			if (!rel) return true;
			const [firstSegment] = rel.split(/[\\/]+/u);
			return !ignoredTopLevelSegments.has(firstSegment);
		},
	});
}

function cloneNodeModules(sourceRoot, targetRoot) {
	const sourceModules = resolve(sourceRoot, 'node_modules');
	if (!existsSync(sourceModules)) {
		throw new Error('Parallel verification requires node_modules. Run npm ci or npm install first.');
	}
	const result = spawnSync('cp', ['-al', sourceModules, resolve(targetRoot, 'node_modules')], {
		cwd: sourceRoot,
		stdio: 'pipe',
		encoding: 'utf8',
	});
	if (result.status !== 0) {
		throw new Error(`Unable to hardlink node_modules for parallel verification: ${(result.stderr || result.stdout || '').trim()}`);
	}
}

function makeTaskWorkspace(parent, taskId) {
	const taskRoot = resolve(parent, taskId);
	copyWorkspace(root, taskRoot);
	cloneNodeModules(root, taskRoot);
	return taskRoot;
}

function readLog(path) {
	try {
		return readFileSync(path, 'utf8');
	} catch {
		return '';
	}
}

function runCaptured(task, cwd, logPath) {
	return new Promise((resolveRun) => {
		const startedAt = Date.now();
		const child = spawn(task.command[0], task.command[1], {
			cwd,
			env: { ...process.env, TREESEED_VERIFY_PARALLEL_CHILD: '1' },
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		const write = (chunk) => writeFileSync(logPath, chunk, { flag: 'a' });
		child.stdout.on('data', write);
		child.stderr.on('data', write);
		child.on('exit', (status, signal) => resolveRun({
			id: task.id,
			status: status ?? 1,
			signal,
			durationMs: Date.now() - startedAt,
			logPath,
		}));
		child.on('error', (error) => {
			write(`${task.id} failed to start: ${error.message}\n`);
			resolveRun({
				id: task.id,
				status: 1,
				signal: null,
				durationMs: Date.now() - startedAt,
				logPath,
			});
		});
	});
}

function formatDuration(durationMs) {
	if (durationMs < 1000) return `${durationMs}ms`;
	if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
	const minutes = Math.floor(durationMs / 60000);
	const seconds = Math.round((durationMs % 60000) / 1000);
	return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

async function runParallel() {
	const tempBase = resolve(dirname(root), '.treeseed-market-verify-tmp');
	mkdirSync(tempBase, { recursive: true });
	const parent = mkdtempSync(resolve(tempBase, 'market-verify-'));
	try {
		const results = [];
		for (const batch of [tasks.filter((task) => task.isolated), tasks.filter((task) => !task.isolated)]) {
			const runs = [];
			for (const task of batch) {
				const workspace = task.isolated ? makeTaskWorkspace(parent, task.id) : root;
				const logPath = resolve(parent, `${task.id}.log`);
				writeFileSync(logPath, `# npm run ${task.command[1].slice(1).join(' ')}\nworkspace=${workspace}\n\n`, 'utf8');
				runs.push(runCaptured(task, workspace, logPath));
			}
			const batchResults = await Promise.all(runs);
			for (const result of batchResults) {
				const icon = result.status === 0 ? 'ok' : 'not ok';
				process.stdout.write(`${icon} verify:${result.id} ${formatDuration(result.durationMs)}\n`);
			}
			results.push(...batchResults);
		}
		const failures = results.filter((result) => result.status !== 0);
		if (failures.length > 0) {
			for (const failure of failures) {
				process.stderr.write(`\n--- verify:${failure.id} log ---\n`);
				process.stderr.write(readLog(failure.logPath));
			}
			return 1;
		}
		return 0;
	} finally {
		if (keepWorkspaces) {
			process.stdout.write(`Kept parallel verification workspaces at ${parent}\n`);
		} else {
			rmSync(parent, { recursive: true, force: true });
		}
	}
}

process.chdir(root);
const code = parallel ? await runParallel() : await runSerial();
process.exit(code);
