#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const publishedLogo = fileURLToPath(import.meta.resolve('@treeseed/ui/assets/treeseed-logo.svg'));
const workspaceLogo = publishedLogo.replace('/dist/assets/', '/src/assets/');
const canonicalLogo = existsSync(publishedLogo) ? publishedLogo : workspaceLogo;

if (!existsSync(canonicalLogo)) {
	throw new Error('The canonical @treeseed/ui TreeSeed logo is unavailable. Build or install the declared UI package first.');
}

for (const target of ['public/logo.svg', 'public/favicon.svg']) {
	const destination = resolve(target);
	mkdirSync(dirname(destination), { recursive: true });
	copyFileSync(canonicalLogo, destination);
}
