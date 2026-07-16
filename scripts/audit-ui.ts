#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { componentInventory, routeInventory, type ArchitectureDebt } from './ui-architecture/inventory.ts';

const root = process.cwd();
const args = process.argv.slice(2);

const defaultRoots = [
	'src/pages',
	'packages/admin/src/pages',
	'packages/admin/src/layouts',
	'packages/core/src/pages',
	'packages/ui/src/astro',
	'packages/ui/src/react',
	'packages/ui/src/styles',
	'packages/ui/src/theme',
];

const scanRoots = args.length > 0 ? args : defaultRoots;
const sourceExts = new Set(['.astro', '.css', '.js', '.ts', '.tsx', '.jsx', '.yaml', '.yml']);
const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/u;
const retiredTokenPattern = /--(?:site|kc)-/u;
const inlineStylePattern = /\sstyle=/u;
const localStylePattern = /<style(?:\s|>)/u;

const rawColorAllowlist = new Set([
	'packages/ui/src/styles/tokens.css',
	'packages/ui/src/styles/sandbox.css',
	'packages/ui/src/styles/pie-allocation.css',
	'packages/ui/src/react/pie-allocation/DynamicPieAllocationInput.tsx',
	'packages/ui/src/theme/index.ts',
	'src/config.yaml',
]);
const rawColorAllowlistPrefixes = [
	'packages/ui/src/theme/color-schemes/',
	'packages/ui/src/theme/schemes/',
];

const inlineStyleAllowlist = new Set([
	'packages/ui/src/astro/data/MetricGrid.astro',
	'packages/ui/src/astro/theme/ThemePreviewSwatch.astro',
	'packages/ui/src/react/charts/MonitoringChart.tsx',
	'packages/ui/src/react/charts/ProjectActivityChart.tsx',
	'packages/ui/src/react/pie-allocation/DynamicPieAllocationInput.tsx',
]);
const localStyleAllowlist = new Set([
	'packages/ui/src/astro/app/controls/PlainTable.astro',
	'packages/ui/src/astro/core/SiteTitle.astro',
	'packages/ui/src/astro/layouts/MainLayout.astro',
	'packages/ui/src/astro/theme/ThemeScript.astro',
]);
const localStyleAllowlistPrefixes = ['packages/ui/src/astro/docs/'];

function pathHasDebt(path: string, debt: ArchitectureDebt): boolean {
	const route = routeInventory.find((entry) => entry.sourcePath === path);
	if (route?.architectureDebt.includes(debt)) return true;
	return componentInventory.some((entry) => {
		if (!entry.architectureDebt.includes(debt)) return false;
		return path === entry.sourcePath || path.startsWith(`${entry.sourcePath}/`);
	});
}

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
	if (
		!rawColorAllowlist.has(path)
		&& !rawColorAllowlistPrefixes.some((prefix) => path.startsWith(prefix))
		&& !pathHasDebt(path, 'raw-color-fallback')
		&& rawColorPattern.test(contents)
	) {
		failures.push(`${path}: contains raw color literal`);
	}
	if (!inlineStyleAllowlist.has(path) && !pathHasDebt(path, 'inline-dynamic-style') && inlineStylePattern.test(contents)) {
		failures.push(`${path}: contains inline style attribute`);
	}
	if (
		!localStyleAllowlist.has(path)
		&& !localStyleAllowlistPrefixes.some((prefix) => path.startsWith(prefix))
		&& !pathHasDebt(path, 'page-local-css')
		&& path.endsWith('.astro')
		&& localStylePattern.test(contents)
	) {
		failures.push(`${path}: contains page-local <style> block`);
	}
}

if (failures.length > 0) {
	console.error('UI audit failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`UI audit passed (${files.length} files checked).`);
