#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

function assertBackendMovedToApiPackage() {
	const forbidden = [
		'src/api',
		'src/operations-runner',
		'scripts/build-api.ts',
		'scripts/build-operations-runner.ts',
		'scripts/migrate-db.ts',
		'scripts/api-acceptance.ts',
	];
	const present = forbidden.filter((entry) => existsSync(resolve(root, entry)));
	if (present.length > 0) {
		process.stderr.write(`Root Market must not own backend API implementation files after packages/api migration: ${present.join(', ')}\n`);
		process.exit(1);
	}
	const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
	const forbiddenScripts = ['build:api', 'build:operations-runner', 'db:migrate', 'test:acceptance', 'market:operations-runner'];
	const configuredScripts = forbiddenScripts.filter((name) => Object.prototype.hasOwnProperty.call(packageJson.scripts ?? {}, name));
	if (configuredScripts.length > 0) {
		process.stderr.write(`Root Market package.json must not expose backend API scripts: ${configuredScripts.join(', ')}\n`);
		process.exit(1);
	}
	const forbiddenDependencies = ['@treeseed/api', 'drizzle-orm', 'hono', 'libsodium-wrappers', 'libsodium-wrappers-sumo', 'octokit', 'pg'];
	const configuredDependencies = forbiddenDependencies.filter((name) =>
		Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, name)
		|| Object.prototype.hasOwnProperty.call(packageJson.devDependencies ?? {}, name));
	if (configuredDependencies.length > 0) {
		process.stderr.write(`Root Market package.json must not depend on backend API packages: ${configuredDependencies.join(', ')}\n`);
		process.exit(1);
	}
	const sourceOffenders = executableSourceFiles(['src'])
		.filter((path) => {
			const source = readFileSync(resolve(root, path), 'utf8');
			return /@treeseed\/api|packages\/api\/src|MarketControlPlaneStore|createMarketPostgresDatabase|TREESEED_DATABASE_URL/u.test(source);
		});
	if (sourceOffenders.length > 0) {
		process.stderr.write(`Root Market executable source/tests must not import or inspect backend API implementation:\n${sourceOffenders.join('\n')}\n`);
		process.exit(1);
	}
}

function executableSourceFiles(entries) {
	const ignored = new Set(['.git', '.treeseed', '.wrangler', 'coverage', 'dist', 'node_modules']);
	const results = [];
	const visit = (entry) => {
		const absolute = resolve(root, entry);
		if (!existsSync(absolute)) return;
		const stat = statSync(absolute);
		if (stat.isDirectory()) {
			if (ignored.has(entry.split(/[\\/]/u).pop())) return;
			for (const child of readdirSync(absolute)) visit(`${entry}/${child}`);
			return;
		}
		if (/\.(astro|ts|js|mjs|tsx|jsx)$/u.test(entry)) results.push(entry);
	};
	for (const entry of entries) visit(entry);
	return results;
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
assertBackendMovedToApiPackage();
const code = parallel ? await runParallel() : await runSerial();
process.exit(code);
