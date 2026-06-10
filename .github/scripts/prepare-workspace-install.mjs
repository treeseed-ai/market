#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const packageRoot = 'packages';
const hasLocalUiPackage = existsSync(join(packageRoot, 'ui', 'package.json'));

if (!existsSync(packageRoot)) {
	process.exit(0);
}

for (const entry of readdirSync(packageRoot, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const packageJsonPath = join(packageRoot, entry.name, 'package.json');
	if (!existsSync(packageJsonPath)) continue;

	const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
	let changed = false;

	if (manifest.scripts?.prepare) {
		delete manifest.scripts.prepare;
		changed = true;
	}

	if (hasLocalUiPackage && entry.name !== 'ui') {
		for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
			if (manifest[section]?.['@treeseed/ui']) {
				delete manifest[section]['@treeseed/ui'];
				changed = true;
			}
		}
	}

	if (changed) {
		writeFileSync(packageJsonPath, `${JSON.stringify(manifest, null, '\t')}\n`);
	}
}
