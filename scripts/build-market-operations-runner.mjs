import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

await import('./build-api.mjs');

const root = process.cwd();
const source = resolve(root, 'src/market-operations-runner');
const target = resolve(root, 'dist/market-operations-runner');
const runtimeSupport = [
	['src/api/market-postgres.js', 'dist/api/market-postgres.js'],
	['src/api/store.js', 'dist/api/store.js'],
	['src/api/hub-launch-application.js', 'dist/api/hub-launch-application.js'],
	['src/lib/market/deployment-actions.ts', 'dist/lib/market/deployment-actions.ts'],
	['src/lib/market/deployment-governance.ts', 'dist/lib/market/deployment-governance.ts'],
];

await mkdir(resolve(root, 'dist'), { recursive: true });
await cp(source, target, { recursive: true, force: true });
for (const [from, to] of runtimeSupport) {
	const output = resolve(root, to);
	await mkdir(resolve(output, '..'), { recursive: true });
	await cp(resolve(root, from), output, { force: true });
}

console.log(`Built market operations runner at ${target}`);
