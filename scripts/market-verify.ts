#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

for (const script of ['check', 'test:unit', 'build']) {
	const result = spawnSync('npm', ['run', script], { stdio: 'inherit', env: process.env });
	if (result.status !== 0) process.exit(result.status ?? 1);
}
