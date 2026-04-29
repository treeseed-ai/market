import { spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function writeFile(path: string, contents: string) {
	mkdirSync(resolve(path, '..'), { recursive: true });
	writeFileSync(path, contents, 'utf8');
}

function runBuildApi(scriptPath: string, cwd: string, pathPrefix: string) {
	return new Promise<number>((resolvePromise) => {
		const child = spawn(process.execPath, [scriptPath], {
			cwd,
			env: {
				...process.env,
				PATH: `${pathPrefix}:${process.env.PATH ?? ''}`,
			},
			stdio: 'ignore',
		});
		child.on('exit', (code) => resolvePromise(code ?? 1));
	});
}

describe('build:api wrapper', () => {
	it('serializes concurrent workspace core dist builds', async () => {
		const root = mkdtempSync(join(tmpdir(), 'treeseed-build-api-'));
		const scriptPath = resolve('scripts/build-api.mjs');
		const binDir = join(root, 'bin');
		const fakeNpm = join(binDir, 'npm');

		writeFile(join(root, 'package.json'), '{"type":"module"}\n');
		writeFile(join(root, 'packages/core/package.json'), '{"name":"@treeseed/core"}\n');
		writeFile(join(root, 'packages/core/scripts/build-dist.ts'), 'export {};\n');
		writeFile(join(root, 'packages/core/src/index.ts'), 'export {};\n');
		writeFile(fakeNpm, `#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const root = process.cwd();
const countPath = join(root, 'build-count.txt');
const current = existsSync(countPath) ? Number(readFileSync(countPath, 'utf8')) : 0;
writeFileSync(countPath, String(current + 1));
setTimeout(() => {
	const coreRoot = join(root, 'packages/core');
	for (const relativePath of [
		'dist/api.js',
		'dist/config.js',
		'dist/config.d.ts',
		'dist/services/agents.js',
		'dist/services/manager.js',
		'dist/services/worker.js',
		'dist/services/workday-start.js',
		'dist/services/workday-report.js',
	]) {
		const output = join(coreRoot, relativePath);
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
});
