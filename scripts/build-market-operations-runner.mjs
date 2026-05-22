import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

await import('./build-api.mjs');

const root = process.cwd();
const source = resolve(root, 'src/market-operations-runner');
const target = resolve(root, 'dist/market-operations-runner');

await mkdir(resolve(root, 'dist'), { recursive: true });
await cp(source, target, { recursive: true, force: true });

console.log(`Built market operations runner at ${target}`);
