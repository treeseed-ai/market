import { spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function writeFile(path: string, contents: string) {
	mkdirSync(resolve(path, '..'), { recursive: true });
	writeFileSync(path, contents, 'utf8');
}

function runBuildApi(scriptPath: string, cwd: string, pathPrefix: string, extraEnv: Record<string, string> = {}) {
	return new Promise<number>((resolvePromise) => {
		const child = spawn(process.execPath, [scriptPath], {
			cwd,
			env: {
				...process.env,
				PATH: `${pathPrefix}:${process.env.PATH ?? ''}`,
				...extraEnv,
			},
			stdio: 'ignore',
		});
		child.on('exit', (code) => resolvePromise(code ?? 1));
	});
}

describe('build:api wrapper', () => {
	it('serializes concurrent workspace agent API dist builds', async () => {
		const root = mkdtempSync(join(tmpdir(), 'treeseed-build-api-'));
		const scriptPath = resolve('scripts/build-api.mjs');
		const binDir = join(root, 'bin');
		const fakeNpm = join(binDir, 'npm');

		writeFile(join(root, 'package.json'), '{"type":"module"}\n');
		writeFile(join(root, 'packages/agent/package.json'), '{"name":"@treeseed/agent"}\n');
		writeFile(join(root, 'packages/agent/scripts/build-dist.ts'), 'export {};\n');
		writeFile(join(root, 'packages/agent/src/index.ts'), 'export {};\n');
		writeFile(fakeNpm, `#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const root = process.cwd().replace(/\\/packages\\/agent$/u, '');
const countPath = join(root, 'build-count.txt');
const current = existsSync(countPath) ? Number(readFileSync(countPath, 'utf8')) : 0;
writeFileSync(countPath, String(current + 1));
setTimeout(() => {
	const agentRoot = join(root, 'packages/agent');
	for (const relativePath of [
		'dist/api/index.js',
		'dist/api/index.d.ts',
		'dist/services/agents.js',
		'dist/services/worker.js',
		'dist/services/workday-manager.js',
	]) {
		const output = join(agentRoot, relativePath);
		mkdirSync(dirname(output), { recursive: true });
		writeFileSync(output, 'export {};\\n');
	}
}, 250);
`);
		chmodSync(fakeNpm, 0o755);

		const exitCodes = await Promise.all(
			Array.from({ length: 5 }, () => runBuildApi(scriptPath, root, binDir)),
		);

		expect(exitCodes).toEqual([0, 0, 0, 0, 0]);
		expect(readFileSync(join(root, 'build-count.txt'), 'utf8')).toBe('1');
	});

	it('does not wait on the workspace build lock in CI or Railway builds', async () => {
		const root = mkdtempSync(join(tmpdir(), 'treeseed-build-api-ci-'));
		const scriptPath = resolve('scripts/build-api.mjs');
		const binDir = join(root, 'bin');
		const fakeNpm = join(binDir, 'npm');

		writeFile(join(root, 'package.json'), '{"type":"module"}\n');
		writeFile(join(root, 'node_modules/.cache/treeseed-build-agent-api.lock/owner.json'), '{"pid":1}\n');
		writeFile(join(root, 'packages/agent/package.json'), '{"name":"@treeseed/agent"}\n');
		writeFile(join(root, 'packages/agent/scripts/build-dist.ts'), 'export {};\n');
		writeFile(join(root, 'packages/agent/src/index.ts'), 'export {};\n');
		writeFile(fakeNpm, `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const root = process.cwd().replace(/\\/packages\\/agent$/u, '');
writeFileSync(join(root, 'build-count.txt'), '1');
const agentRoot = join(root, 'packages/agent');
for (const relativePath of [
	'dist/api/index.js',
	'dist/api/index.d.ts',
	'dist/services/agents.js',
	'dist/services/worker.js',
	'dist/services/workday-manager.js',
]) {
	const output = join(agentRoot, relativePath);
	mkdirSync(dirname(output), { recursive: true });
	writeFileSync(output, 'export {};\\n');
}
`);
		chmodSync(fakeNpm, 0o755);

		const exitCode = await runBuildApi(scriptPath, root, binDir, { CI: 'true' });

		expect(exitCode).toBe(0);
		expect(readFileSync(join(root, 'build-count.txt'), 'utf8')).toBe('1');
	});
});
