import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ignoredDirectories = new Set([
	'.astro',
	'.git',
	'.treeseed',
	'.turbo',
	'build',
	'coverage',
	'deps',
	'dist',
	'node_modules',
	'storybook-static',
	'test-results',
]);

const allowedDeclarationFiles = new Set([
	'packages/admin/src/env.d.ts',
	'packages/core/src/types/astro-build.d.ts',
	'packages/core/src/types/cloudflare-sockets.d.ts',
	'packages/core/template/content-module-types.d.ts',
	'src/env.d.ts',
	'src/types/cloudflare-sockets.d.ts',
	'src/types/libsodium-wrappers-sumo.d.ts',
]);

function walk(root: string, directory: string, violations: string[]) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		const relativePath = relative(root, path).replace(/\\/gu, '/');
		if (entry.isDirectory()) {
			if (ignoredDirectories.has(entry.name)) continue;
			walk(root, path, violations);
			continue;
		}
		if (!entry.isFile()) continue;
		if (relativePath.endsWith('.js') || relativePath.endsWith('.mjs') || relativePath.endsWith('.cjs')) {
			violations.push(`${relativePath}: checked-in JavaScript source is not allowed; use .ts and compile to dist.`);
			continue;
		}
		if (relativePath.endsWith('.d.ts') && !allowedDeclarationFiles.has(relativePath)) {
			violations.push(`${relativePath}: declaration source files need an explicit allowlist reason or conversion to .ts.`);
		}
	}
}

const root = process.cwd();
const violations: string[] = [];
walk(root, root, violations);

if (violations.length > 0) {
	console.error('TypeScript source policy violations detected:');
	for (const violation of violations) {
		console.error(`- ${violation}`);
	}
	process.exit(1);
}

console.log('TypeScript source policy passed: no disallowed JavaScript or declaration source files found.');
