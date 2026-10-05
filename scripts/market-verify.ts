#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('src/content')) {
	console.error('Market content must be read from TreeDX; src/content is not allowed.');
	process.exit(1);
}

for (const script of ['check', 'test:unit', 'build']) {
	const result = spawnSync('npm', ['run', script], { stdio: 'inherit', env: process.env });
	if (result.status !== 0) process.exit(result.status ?? 1);
}
