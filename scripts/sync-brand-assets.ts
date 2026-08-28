#!/usr/bin/env node

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const canonicalLogo = fileURLToPath(import.meta.resolve('@treeseed/ui/assets/treeseed-logo.svg'));

for (const target of ['public/logo.svg', 'public/favicon.svg']) {
	const destination = resolve(target);
	mkdirSync(dirname(destination), { recursive: true });
	copyFileSync(canonicalLogo, destination);
}
