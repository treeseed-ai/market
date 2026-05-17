import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const primaryRoutes = [
	'src/pages/app/index.astro',
	'src/pages/app/hosts/index.astro',
	'src/pages/app/projects/index.astro',
	'src/pages/app/capacity/index.astro',
	'src/pages/app/work/objectives.astro',
	'src/pages/app/knowledge/artifacts.astro',
];

const onePurposeRoutes = [
	'src/pages/app/teams/index.astro',
	'src/pages/app/teams/new.astro',
	'src/pages/app/teams/[teamId]/edit.astro',
	'src/pages/app/teams/[teamId]/members.astro',
	'src/pages/app/teams/[teamId]/delete.astro',
	'src/pages/app/hosts/new.astro',
	'src/pages/app/hosts/[hostType]/new.astro',
	'src/pages/app/hosts/[hostType]/[hostId]/edit.astro',
	'src/pages/app/projects/new.astro',
	'src/pages/app/projects/[projectId]/settings.astro',
	'src/pages/app/projects/[projectId]/hosts.astro',
	'src/pages/app/projects/[projectId]/guidance.astro',
	'src/pages/app/projects/[projectId]/decisions.astro',
	'src/pages/app/projects/[projectId]/artifacts.astro',
	'src/pages/app/projects/[projectId]/delete.astro',
	'src/pages/app/capacity/providers/new.astro',
	'src/pages/app/capacity/providers/[providerId]/edit.astro',
	'src/pages/app/capacity/providers/[providerId]/lanes.astro',
	'src/pages/app/capacity/providers/[providerId]/keys.astro',
	'src/pages/app/capacity/grants/index.astro',
	'src/pages/app/capacity/grants/new.astro',
	'src/pages/app/capacity/grants/[grantId]/edit.astro',
	'src/pages/app/work/objectives/new.astro',
	'src/pages/app/work/decisions.astro',
	'src/pages/app/work/decisions/[approvalId].astro',
	'src/pages/app/work/questions.astro',
	'src/pages/app/knowledge/templates.astro',
	'src/pages/app/knowledge/packs.astro',
	'src/pages/app/knowledge/releases.astro',
	'src/pages/app/knowledge/publish.astro',
];

describe('one-purpose control app information architecture', () => {
	it('uses the guided control navigation labels', () => {
		const layout = source('src/layouts/TreeseedAppLayout.astro');
		for (const label of ['Start', 'Hosts', 'Projects', 'Capacity', 'Work', 'Knowledge']) {
			expect(layout).toContain(`label: '${label}'`);
		}
		expect(layout).not.toContain(`label: 'Team'`);
		for (const label of ['Mission Control', 'Workdays', 'Governance', 'Infrastructure', 'Market']) {
			expect(layout).not.toContain(`label: '${label}'`);
		}
		expect(layout).toContain('treeseed_active_team');
		expect(layout).toContain('href="/app/teams" title="Manage teams"');
	});

	it('keeps primary app routes to one-purpose control entry points', () => {
		for (const path of [...primaryRoutes, ...onePurposeRoutes]) {
			expect(existsSync(resolve(process.cwd(), path)), path).toBe(true);
		}
		expect(readdirSync(resolve(process.cwd(), 'src/pages/app')).sort()).toEqual([
			'account.astro',
			'capacity',
			'hosts',
			'index.astro',
			'knowledge',
			'knowledge.astro',
			'projects',
			'teams',
			'work',
		]);
	});

	it('removes dashboard and bundled setup surfaces from primary app code', () => {
		for (const path of primaryRoutes) {
			const contents = source(path);
			expect(contents, path).not.toContain('MetricGrid');
			expect(contents, path).not.toContain('InfrastructureStatusGrid');
			expect(contents, path).not.toContain('WorkdaySummaryCard');
			expect(contents, path).not.toMatch(/Mission Control|Operational Summary|phase strip|dashboard overview/iu);
			expect(contents, path).not.toContain('HostControlsPanel');
			expect(contents, path).not.toContain('OrganizationContextPanel');
		}
		expect(existsSync(resolve(process.cwd(), 'src/components/app/controls/HostControlsPanel.astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'src/components/app/operations/OrganizationContextPanel.astro'))).toBe(false);
	});

	it('keeps credential forms field-based rather than JSON envelope based', () => {
		for (const path of [
			'src/pages/app/hosts/[hostType]/new.astro',
			'src/pages/app/hosts/[hostType]/[hostId]/edit.astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('encryptHostConfig');
			expect(contents, path).toContain('treeseedSensitiveUnlock');
			expect(contents, path).not.toContain('Encrypted provider envelope');
			expect(contents, path).not.toMatch(/placeholder=['"]\{/u);
		}
	});

	it('keeps styling in shared CSS for the control interface', () => {
		const css = source('src/styles/treeseed.css');
		for (const marker of ['.ts-control-page', '.ts-plain-table', '.ts-link-button', '.ts-checkbox-group', 'prefers-reduced-motion', ':focus-visible']) {
			expect(css).toContain(marker);
		}
		for (const path of [...primaryRoutes, ...onePurposeRoutes]) {
			const contents = source(path);
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\sstyle=/u);
		}
	});
});
