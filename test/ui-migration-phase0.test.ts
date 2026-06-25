import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { componentInventory, pathExistsForInventory, routeInventory } from '../scripts/ui-migration/inventory';

const routeRoots = ['src/pages', 'packages/admin/src/pages', 'packages/core/src/pages'];

function walk(path: string): string[] {
	const absolute = resolve(process.cwd(), path);
	if (!existsSync(absolute)) return [];
	const stats = statSync(absolute);
	if (stats.isFile()) return [path];
	return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') return [];
		return walk(`${path}/${entry.name}`);
	});
}

function routePatternFromPath(sourcePath: string): string {
	const pagesIndex = sourcePath.indexOf('/pages/');
	const rootRelative = pagesIndex >= 0 ? sourcePath.slice(pagesIndex + '/pages/'.length) : sourcePath.replace(/^src\/pages\//u, '');
	const withoutExtension = rootRelative.replace(/\.astro$/u, '');
	const withoutIndex = withoutExtension === 'index' ? '' : withoutExtension.replace(/\/index$/u, '');
	const normalized = withoutIndex
		.replace(/\[\.\.\.([^\]]+)\]/gu, ':$1*')
		.replace(/\[([^\]]+)\]/gu, ':$1');
	return `/${normalized}`.replace(/\/$/u, '') || '/';
}

describe('UI migration Phase 0 inventory', () => {
	it('covers every human-facing Astro route', () => {
		const discovered = routeRoots.flatMap(walk).filter((path) => extname(path) === '.astro').sort();
		const inventoried = routeInventory.map((entry) => entry.sourcePath).sort();

		expect(inventoried).toEqual(discovered);
	});

	it('keeps route metadata complete and aligned with file paths', () => {
		for (const entry of routeInventory) {
			expect(entry.routePattern).toBe(routePatternFromPath(entry.sourcePath));
			expect(entry.policyNeeds.length, `${entry.sourcePath} policy needs`).toBeGreaterThan(0);
			expect(entry.dataSource, `${entry.sourcePath} data source`).toBeTruthy();
			expect(entry.requiredTestsBeforeDeletion.length, `${entry.sourcePath} deletion tests`).toBeGreaterThan(0);
			expect(entry.deletionBlocker, `${entry.sourcePath} deletion blocker`).toBeTruthy();
			expect(entry.targetDeletionPhase, `${entry.sourcePath} target deletion phase`).toBeTruthy();
			expect(entry.legacyStatus, `${entry.sourcePath} legacy status`).toBe('active');
		}
	});

	it('identifies the first vertical-slice candidates required by the migration plan', () => {
		const candidates = routeInventory.filter((entry) => entry.firstSliceCandidate);
		expect(candidates.some((entry) => entry.firstSliceCandidate?.includes('Phase 2 first direction resource vertical'))).toBe(true);
		expect(candidates.some((entry) => entry.firstSliceCandidate?.includes('Phase 3 public runtime reader equivalent'))).toBe(true);
	});

	it('keeps component inventory entries actionable', () => {
		for (const entry of componentInventory) {
			expect(pathExistsForInventory(entry.sourcePath), `${entry.sourcePath} should exist`).toBe(true);
			expect(entry.currentUse, `${entry.sourcePath} current use`).toBeTruthy();
			expect(entry.migrationTarget, `${entry.sourcePath} migration target`).toBeTruthy();
			expect(entry.requiredTestsBeforeDeletion.length, `${entry.sourcePath} tests`).toBeGreaterThan(0);
			expect(entry.legacyStatus, `${entry.sourcePath} legacy status`).toBe('active');
		}
	});
});
