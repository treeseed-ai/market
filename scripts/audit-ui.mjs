#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);

const defaultRoots = [
	'src/components/app',
	'src/components/market',
	'src/layouts',
	'src/pages/app/account.astro',
	'src/pages/app/launch.astro',
	'src/pages/app/teams/new.astro',
	'src/pages/app/teams/[teamSlug]/edit.astro',
	'src/pages/app/teams/[teamSlug]/[section].astro',
	'src/pages/app/teams/[teamSlug]/projects/[projectSlug]/[section].astro',
	'src/pages/auth',
	'src/pages/market',
	'src/pages/templates',
	'src/styles/auth.css',
	'src/styles/treeseed.css',
	'packages/core/src/styles/app-shell.css',
	'packages/core/src/styles/forms.css',
	'packages/core/src/styles/theme.css',
	'packages/core/src/styles/ui.css',
];

const scanRoots = args.length > 0 ? args : defaultRoots;
const sourceExts = new Set(['.astro', '.css', '.js', '.mjs', '.ts', '.tsx', '.jsx', '.yaml', '.yml']);
const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/u;
const retiredTokenPattern = /--(?:site|kc)-/u;
const inlineStylePattern = /\sstyle=/u;
const localStylePattern = /<style(?:\s|>)/u;

const rawColorAllowlist = new Set([
	'packages/core/src/styles/tokens.css',
	'packages/core/src/utils/theme.ts',
	'src/config.yaml',
	'src/lib/auth/welcome-email.ts',
]);

const inlineStyleAllowlist = new Set([
	'packages/core/src/components/ui/theme/ThemePreviewSwatch.astro',
	'packages/core/src/components/ui/data/MetricGrid.astro',
]);

function walk(path) {
	const absolute = resolve(root, path);
	let stats;
	try {
		stats = statSync(absolute);
	} catch {
		return [];
	}
	if (stats.isFile()) return [absolute];
	return readdirSync(absolute).flatMap((entry) => {
		if (entry === 'node_modules' || entry === '.astro' || entry === 'dist') return [];
		return walk(resolve(path, entry));
	});
}

function isSourceFile(path) {
	return sourceExts.has(extname(path));
}

const files = [...new Set(scanRoots.flatMap(walk).filter(isSourceFile))];
const failures = [];

for (const absolute of files) {
	const path = relative(root, absolute).replaceAll('\\', '/');
	const contents = readFileSync(absolute, 'utf8');

	if (retiredTokenPattern.test(contents)) {
		failures.push(`${path}: contains retired --site-* or --kc-* token`);
	}
	if (!rawColorAllowlist.has(path) && rawColorPattern.test(contents)) {
		failures.push(`${path}: contains raw color literal`);
	}
	if (!inlineStyleAllowlist.has(path) && inlineStylePattern.test(contents)) {
		failures.push(`${path}: contains inline style attribute`);
	}
	if (!inlineStyleAllowlist.has(path) && path.endsWith('.astro') && localStylePattern.test(contents)) {
		failures.push(`${path}: contains page-local <style> block`);
	}
}

if (failures.length > 0) {
	console.error('UI audit failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`UI audit passed (${files.length} files checked).`);
