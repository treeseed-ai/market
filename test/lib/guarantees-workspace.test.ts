import { describe, expect, it } from 'vitest';
import {
	discoverTreeseedGuarantees,
	exportTreeseedGuaranteesCsv,
	planTreeseedGuarantees,
} from '../../packages/sdk/src/guarantees/index.ts';

describe('workspace guarantee registry', () => {
	it('discovers the migrated 179 guarantee manifests with lowercase taxonomy', () => {
		const report = discoverTreeseedGuarantees({ workspaceRoot: process.cwd() });
		expect(report.ok).toBe(true);
		expect(report.counts.valid).toBe(179);
		const manifests = report.guarantees.map((entry) => entry.manifest).filter(Boolean);
		expect(manifests.every((manifest) => /^[a-z][a-z0-9-]*$/u.test(manifest!.type))).toBe(true);
		expect(manifests.every((manifest) => /^[a-z][a-z0-9-]*$/u.test(manifest!.subtype))).toBe(true);
		expect(manifests.some((manifest) => manifest!.type === 'marketplace')).toBe(true);
		expect(manifests.some((manifest) => manifest!.type === 'public-profile')).toBe(true);
		expect(manifests.some((manifest) => manifest!.type === 'treedx')).toBe(false);
		expect(manifests.some((manifest) => manifest!.subtype === 'treedx')).toBe(true);
		expect(manifests.some((manifest) => manifest!.type === 'agent')).toBe(true);
	});

	it('generates a CSV row for every guarantee', () => {
		const report = discoverTreeseedGuarantees({ workspaceRoot: process.cwd() });
		const csv = exportTreeseedGuaranteesCsv({ guarantees: report.guarantees });
		const rows = csv.trim().split('\n');
		expect(rows).toHaveLength(180);
		expect(rows[0]).toContain('Guarantee ID,Journey Index,Type,Subtype');
		expect(rows[0]).toContain('Surface');
	});

	it('supports focused type and subtype planning', () => {
		const plan = planTreeseedGuarantees({ workspaceRoot: process.cwd(), filter: { type: 'project', subtype: 'question' } });
		expect(plan.ok).toBe(true);
		expect(plan.counts.selected).toBeGreaterThan(0);
		expect(plan.entries.some((entry) => entry.selected && entry.type === 'project' && entry.subtype === 'question')).toBe(true);
	});
});
