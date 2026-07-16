#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { componentInventory, pathExistsForInventory, routeInventory } from './ui-architecture/inventory.ts';

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
	const relative = (pagesIndex >= 0 ? sourcePath.slice(pagesIndex + 7) : sourcePath.replace(/^src\/pages\//u, '')).replace(/\.astro$/u, '');
	const withoutIndex = relative === 'index' ? '' : relative.replace(/\/index$/u, '');
	return `/${withoutIndex.replace(/\[\.\.\.([^\]]+)\]/gu, ':$1*').replace(/\[([^\]]+)\]/gu, ':$1')}`.replace(/\/$/u, '') || '/';
}

function escapeCell(value: unknown): string {
	return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function escapeCsv(value: unknown): string {
	return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

const routes = [...routeInventory].sort((a, b) => a.owner.localeCompare(b.owner) || a.routePattern.localeCompare(b.routePattern));
const components = [...componentInventory].sort((a, b) => a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name));
const routeTable = routes.map((entry) => `| ${escapeCell(entry.owner)} | \`${escapeCell(entry.routePattern)}\` | \`${escapeCell(entry.sourcePath)}\` | ${escapeCell(entry.surfaceContext)} | ${escapeCell(entry.currentShell)} | ${escapeCell(entry.targetTemplate)} | ${escapeCell(entry.policyNeeds.join('; '))} |`).join('\n');
const componentTable = components.map((entry) => `| ${escapeCell(entry.owner)} | ${escapeCell(entry.name)} | \`${escapeCell(entry.sourcePath)}\` | ${escapeCell(entry.currentUse)} | ${escapeCell(entry.architectureTarget)} |`).join('\n');

const architectureDoc = `# UI Architecture Inventory

Generated from \`scripts/ui-architecture/inventory.ts\`. This is the current post-cleanup route and component inventory; the removed surface is archived in [legacy-routes.md](./legacy-routes.md), and redesign direction lives in [ui-redesign.md](./ui-redesign.md).

Market currently owns no route files. Admin owns the retained authentication, account, team, active-team, invitation, and public identity/team profile surface. Core routes and every \`@treeseed/ui\` component remain unchanged.

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

| Owner | Route | Source | Access/policy | Data source |
| --- | --- | --- | --- | --- |
${routes.map((entry) => `| ${entry.owner} | \`${entry.routePattern}\` | \`${entry.sourcePath}\` | ${escapeCell(entry.policyNeeds.join('; '))} | ${escapeCell(entry.dataSource)} |`).join('\n')}

## Retained support endpoints

| Owner | Route | Source | Purpose |
| --- | --- | --- | --- |
| admin | \`/auth/callback/[provider]\` | \`packages/admin/src/pages/auth/callback/[provider].ts\` | OAuth callback |
| admin | \`/v1/[...all]\` | \`packages/admin/src/pages/v1/[...all].ts\` | Shared authenticated API facade |
| core | \`/api/feedback/submit\` | \`packages/core/src/pages/api/feedback/submit.ts\` | Core feedback forwarding |
| core | \`/api/form/submit\` | \`packages/core/src/pages/api/form/submit.ts\` | Core-owned form forwarding |
| core | \`/feed.xml\` | \`packages/core/src/pages/feed.xml.ts\` | Content feed |
`;

const csvHeader = ['owner', 'route', 'source', 'context', 'shell', 'template', 'resourceType', 'policyNeeds', 'dataSource'];
const csv = [csvHeader, ...routes.map((entry) => [entry.owner, entry.routePattern, entry.sourcePath, entry.surfaceContext, entry.currentShell, entry.targetTemplate, entry.resourceType, entry.policyNeeds.join('; '), entry.dataSource])]
	.map((row) => row.map(escapeCsv).join(','))
	.join('\n') + '\n';

const generated = new Map([
	['docs/ui-architecture-inventory.md', architectureDoc],
	['docs/ui-routes.md', routeDoc],
	['docs/ui-routes.csv', csv],
]);

const failures: string[] = [];
const discovered = routeRoots.flatMap(walk).filter((path) => extname(path) === '.astro').sort();
const inventoried = routes.map((entry) => entry.sourcePath).sort();
if (JSON.stringify(discovered) !== JSON.stringify(inventoried)) failures.push('Human-facing route inventory does not match discovered Astro pages.');
if (walk('src/pages').length !== 0) failures.push('Market must own zero route files.');
for (const entry of routes) {
	if (!pathExistsForInventory(entry.sourcePath)) failures.push(`${entry.sourcePath}: inventory source is missing`);
	if (entry.routePattern !== routePatternFromPath(entry.sourcePath)) failures.push(`${entry.sourcePath}: route pattern is incorrect`);
	if (!entry.policyNeeds.length || !entry.dataSource || !entry.architectureNotes) failures.push(`${entry.sourcePath}: route metadata is incomplete`);
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
