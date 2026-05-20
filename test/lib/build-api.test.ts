import { spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function writeFile(path: string, contents: string) {
	mkdirSync(dirname(path), { recursive: true });
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
	it('builds the SDK API substrate without requiring agent runtime outputs', async () => {
		const root = mkdtempSync(join(tmpdir(), 'treeseed-build-api-sdk-'));
		const scriptPath = resolve('scripts/build-api.mjs');
		const binDir = join(root, 'bin');
		const fakeNpm = join(binDir, 'npm');

		writeFile(join(root, 'package.json'), '{"type":"module"}\n');
		writeFile(join(root, 'packages/sdk/package.json'), '{"name":"@treeseed/sdk"}\n');
		writeFile(join(root, 'packages/sdk/scripts/build-dist.ts'), 'export {};\n');
		writeFile(join(root, 'packages/sdk/scripts/verify-driver.mjs'), 'export {};\n');
		writeFile(join(root, 'packages/sdk/src/index.ts'), 'export {};\n');
		writeFile(fakeNpm, `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const root = process.cwd().replace(/\\/packages\\/sdk$/u, '');
writeFileSync(join(root, 'build-count.txt'), '1');
for (const relativePath of [
	'dist/index.js',
	'dist/api/index.js',
	'dist/workflow-support.js',
	'dist/plugin-default.js',
]) {
	const output = join(root, 'packages/sdk', relativePath);
	mkdirSync(dirname(output), { recursive: true });
	writeFileSync(output, 'export {};\\n');
}
`);
		chmodSync(fakeNpm, 0o755);

		const exitCode = await runBuildApi(scriptPath, root, binDir);

		expect(exitCode).toBe(0);
		expect(readFileSync(join(root, 'build-count.txt'), 'utf8')).toBe('1');
		expect(readFileSync(join(root, 'node_modules/@treeseed/sdk/scripts/verify-driver.mjs'), 'utf8')).toBe(
			'export {};\n',
		);
	});
});
