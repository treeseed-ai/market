#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { componentInventory, pathExistsForInventory, routeInventory, supportEndpointInventory } from './ui-architecture/inventory.ts';

const root = process.cwd();
const shouldWrite = process.argv.slice(2).includes('--write');
const routeRoots = ['src/pages', 'packages/admin/src/pages', 'packages/core/src/pages'];

function walk(path: string): string[] {
	const absolute = resolve(root, path);
	if (!existsSync(absolute)) return [];
	if (statSync(absolute).isFile()) return [path];
	return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
		if (['node_modules', 'dist', '.astro'].includes(entry.name)) return [];
		return walk(`${path}/${entry.name}`);
	});
}

function routePatternFromPath(sourcePath: string): string {
	const pagesIndex = sourcePath.indexOf('/pages/');
	const relative = (pagesIndex >= 0 ? sourcePath.slice(pagesIndex + 7) : sourcePath.replace(/^src\/pages\//u, '')).replace(/\.(?:astro|ts)$/u, '');
	const withoutIndex = relative === 'index' ? '' : relative.replace(/\/index$/u, '');
	return `/${withoutIndex}`.replace(/\/$/u, '') || '/';
}

function escapeCell(value: unknown): string {
	return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function escapeCsv(value: unknown): string {
	return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

const routes = [...routeInventory].sort((a, b) => a.owner.localeCompare(b.owner) || a.routePattern.localeCompare(b.routePattern));
const supportEndpoints = [...supportEndpointInventory].sort((a, b) => a.owner.localeCompare(b.owner) || a.routePattern.localeCompare(b.routePattern));
const components = [...componentInventory].sort((a, b) => a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name));
const routeTable = routes.map((entry) => `| ${escapeCell(entry.owner)} | \`${escapeCell(entry.routePattern)}\` | \`${escapeCell(entry.sourcePath)}\` | ${escapeCell(entry.surfaceContext)} | ${escapeCell(entry.currentShell)} | ${escapeCell(entry.targetTemplate)} | ${escapeCell(entry.policyNeeds.join('; '))} |`).join('\n');
const componentTable = components.map((entry) => `| ${escapeCell(entry.owner)} | ${escapeCell(entry.name)} | \`${escapeCell(entry.sourcePath)}\` | ${escapeCell(entry.currentUse)} | ${escapeCell(entry.architectureTarget)} |`).join('\n');

const architectureDoc = `# UI Architecture Inventory

Generated from \`scripts/ui-architecture/inventory.ts\`. This is the current post-cleanup route and component inventory; the removed surface is archived in [legacy-routes.md](./legacy-routes.md), and redesign direction lives in [ui-redesign.md](./ui-redesign.md).

Market currently owns no route files. Admin owns the authentication, account, team, active-team, invitation, and public user/team knowledge-profile surface. Core owns its public content routes, while reusable visual composition remains in \`@treeseed/ui\`.

## Human-facing routes

| Owner | Route | Source | Context | Shell | Template | Policy |
| --- | --- | --- | --- | --- | --- | --- |
${routeTable}

## Component groups

| Owner | Group | Source | Current use | Architecture target |
| --- | --- | --- | --- | --- |
${componentTable}
`;

const routeDoc = `# Current UI Routes

Generated from \`scripts/ui-architecture/inventory.ts\`. This inventory contains retained Admin routes and unchanged Core human-facing routes. Market contributes no tenant-owned routes. Non-page support endpoints are listed below the table.

| Owner | Route | Behavior | Path parameters | Access/policy | Data source | Source |
| --- | --- | --- | --- | --- | --- | --- |
${routes.map((entry) => `| ${entry.owner} | \`${entry.routePattern}\` | ${escapeCell(entry.description)} | ${escapeCell(entry.parameterSemantics)} | ${escapeCell(entry.policyNeeds.join('; '))} | ${escapeCell(entry.dataSource)} | \`${entry.sourcePath}\` |`).join('\n')}

## Retained support endpoints

| Owner | Route | Response | Access/policy | Behavior | Data source | Source |
| --- | --- | --- | --- | --- | --- | --- |
${supportEndpoints.map((entry) => `| ${entry.owner} | \`${entry.routePattern}\` | ${escapeCell(entry.responseKind)} | ${escapeCell(entry.accessPolicy)} | ${escapeCell(entry.description)} | ${escapeCell(entry.dataSource)} | \`${entry.sourcePath}\` |`).join('\n')}
`;

const csvHeader = ['owner', 'route', 'description', 'pathParameters', 'source', 'context', 'shell', 'template', 'resourceType', 'policyNeeds', 'dataSource'];
const csv = [csvHeader, ...routes.map((entry) => [entry.owner, entry.routePattern, entry.description, entry.parameterSemantics, entry.sourcePath, entry.surfaceContext, entry.currentShell, entry.targetTemplate, entry.resourceType, entry.policyNeeds.join('; '), entry.dataSource])]
	.map((row) => row.map(escapeCsv).join(','))
	.join('\n') + '\n';

const generated = new Map([
	['docs/ui-architecture-inventory.md', architectureDoc],
	['docs/ui-routes.md', routeDoc],
	['docs/ui-routes.csv', csv],
]);

const failures: string[] = [];
const inventoried = [...new Set(routes.map((entry) => entry.sourcePath))].sort();
const inventoriedSources = new Set(inventoried);
const discovered = routeRoots.flatMap(walk).filter((path) => extname(path) === '.astro' || inventoriedSources.has(path)).sort();
if (JSON.stringify(discovered) !== JSON.stringify(inventoried)) failures.push('Human-facing route inventory does not match discovered Astro pages.');
if (walk('src/pages').length !== 0) failures.push('Market must own zero route files.');
const routeCountBySource = new Map<string, number>();
for (const entry of routes) routeCountBySource.set(entry.sourcePath, (routeCountBySource.get(entry.sourcePath) ?? 0) + 1);
for (const entry of routes) {
	if (!pathExistsForInventory(entry.sourcePath)) failures.push(`${entry.sourcePath}: inventory source is missing`);
	if (routeCountBySource.get(entry.sourcePath) === 1 && entry.routePattern !== routePatternFromPath(entry.sourcePath)) failures.push(`${entry.sourcePath}: route pattern is incorrect`);
	if (!entry.description || !entry.parameterSemantics || !entry.policyNeeds.length || !entry.dataSource || !entry.architectureNotes) failures.push(`${entry.sourcePath}: route metadata is incomplete`);
	if (entry.owner === 'admin' && (entry.routePattern.startsWith('/auth/') || entry.routePattern.startsWith('/app/account')) && entry.sourcePath.endsWith('.astro')) {
		const contents = readFileSync(resolve(root, entry.sourcePath), 'utf8');
		if (/<style(?:\s|>)/u.test(contents)) failures.push(`${entry.sourcePath}: auth/account routes may not contain page-local CSS`);
		if (/<script(?:\s|>)/u.test(contents)) failures.push(`${entry.sourcePath}: auth/account routes may not contain route-local scripts`);
		if (/\bfetch\s*\(/u.test(contents)) failures.push(`${entry.sourcePath}: auth/account routes must call a focused Admin controller instead of fetch`);
		if (/<(?:button|select|textarea)\b/u.test(contents) || /<input\b(?![^>]*type=["']hidden["'])/u.test(contents)) failures.push(`${entry.sourcePath}: auth/account routes must compose standardized UI controls`);
		if (!/@treeseed\/ui\/components\/astro\//u.test(contents)) failures.push(`${entry.sourcePath}: auth/account routes must compose a UI-package template or component`);
	}
}
for (const entry of supportEndpoints) {
	if (!pathExistsForInventory(entry.sourcePath)) failures.push(`${entry.sourcePath}: support endpoint source is missing`);
	if (!entry.description || !entry.responseKind || !entry.accessPolicy || !entry.dataSource) failures.push(`${entry.sourcePath}: support endpoint metadata is incomplete`);
}
for (const entry of components) {
	if (!pathExistsForInventory(entry.sourcePath)) failures.push(`${entry.sourcePath}: component inventory source is missing`);
}
const routeOwners = new Map<string, string>();
for (const entry of routes) {
	const previous = routeOwners.get(entry.routePattern);
	if (previous) failures.push(`${entry.routePattern}: route collision between ${previous} and ${entry.owner}`);
	routeOwners.set(entry.routePattern, entry.owner);
}
for (const [path, contents] of generated) {
	if (shouldWrite) writeFileSync(resolve(root, path), contents);
	else if (!existsSync(resolve(root, path))) failures.push(`${path} is missing; run npm run check:ui-architecture -- --write`);
	else if (readFileSync(resolve(root, path), 'utf8') !== contents) failures.push(`${path} is out of date; run npm run check:ui-architecture -- --write`);
}

if (failures.length) {
	console.error('UI architecture conformance check failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`UI architecture conformance check passed (${routes.length} human routes, ${components.length} component groups).`);
