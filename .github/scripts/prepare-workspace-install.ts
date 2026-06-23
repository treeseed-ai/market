#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const packageRoot = 'packages';

if (!existsSync(packageRoot)) {
	process.exit(0);
}

const localPackageNames = new Set();
for (const entry of readdirSync(packageRoot, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const packageJsonPath = join(packageRoot, entry.name, 'package.json');
	if (!existsSync(packageJsonPath)) continue;
	const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
	if (typeof manifest.name === 'string') {
		localPackageNames.add(manifest.name);
	}
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

	for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
		for (const dependencyName of Object.keys(manifest[section] ?? {})) {
			if (dependencyName !== manifest.name && localPackageNames.has(dependencyName)) {
				delete manifest[section][dependencyName];
				changed = true;
			}
		}
	}

	if (changed) {
		writeFileSync(packageJsonPath, `${JSON.stringify(manifest, null, '\t')}\n`);
	}
}
