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
	'src/pages/app/capacity/providers/index.astro',
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
	'src/pages/app/capacity/providers/[providerId]/keys.astro',
	'src/pages/app/work/objectives/new.astro',
	'src/pages/app/work/decisions.astro',
	'src/pages/app/work/decisions/[approvalId].astro',
	'src/pages/app/work/questions.astro',
	'src/pages/app/work/notes.astro',
	'src/pages/app/work/proposals.astro',
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
		expect(layout).toContain(`href: '/app/capacity/providers'`);
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

	it('uses the Phase 7 native capacity provider lifecycle UI', () => {
		const start = source('src/pages/app/index.astro');
		const redirect = source('src/pages/app/capacity/index.astro');
		const dashboard = source('src/pages/app/capacity/providers/index.astro');
		const create = source('src/pages/app/capacity/providers/new.astro');
		const edit = source('src/pages/app/capacity/providers/[providerId]/edit.astro');
		const keys = source('src/pages/app/capacity/providers/[providerId]/keys.astro');
		const workdays = source('src/pages/app/projects/[projectId]/workdays.astro');
		const workdayDetail = source('src/pages/app/projects/[projectId]/workdays/[workdayId].astro');
		const apiClient = source('src/lib/market/api-client.ts');
		const hostPicker = source('src/pages/app/hosts/new.astro');
		const hostCreate = source('src/pages/app/hosts/[hostType]/new.astro');
		const infrastructureProjection = source('src/lib/market/infrastructure-projection.ts');
		const deletedRoutes = [
			'src/pages/app/capacity/providers/[providerId]/lanes.astro',
			'src/pages/app/capacity/grants/index.astro',
			'src/pages/app/capacity/grants/new.astro',
			'src/pages/app/capacity/grants/[grantId]/edit.astro',
		];

		expect(redirect).toContain("Astro.redirect('/app/capacity/providers')");
		expect(start).toContain('/app/capacity/providers');
		expect(start).not.toMatch(/lanes|grants/iu);
		for (const path of deletedRoutes) {
			expect(existsSync(resolve(process.cwd(), path)), path).toBe(false);
		}
		for (const contents of [dashboard, create, edit, keys, infrastructureProjection]) {
			expect(contents).not.toContain('/app/capacity/grants');
			expect(contents).not.toContain('/lanes');
		}
		expect(dashboard).toContain('Last heartbeat');
		expect(dashboard).toContain('Active key');
		expect(dashboard).toContain('Capabilities');
		expect(dashboard).toContain('Native capacity');
		expect(dashboard).toContain('Derived availability');
		expect(dashboard).toContain('Portfolio allocation');
		expect(dashboard).toContain('Compatibility credits');
		expect(dashboard).toContain('Deployment');
		expect(dashboard).toContain('createMarketApiFacade');
		expect(dashboard).not.toContain('context.store.listTeamCapacityProviders');
		expect(dashboard).not.toContain('/app/capacity/grants');
		expect(dashboard).not.toContain('Lanes');
		expect(create).toContain('Launch mode');
		expect(create).toContain('Budget mode');
		expect(create).toContain('Derived from native capacity');
		expect(create).toContain('Native unit');
		expect(create).toContain('Reserve buffer percent');
		expect(create).toContain('One-time reveal');
		expect(create).toContain('Copy key');
		expect(create).not.toContain('dailyCreditBudget');
		expect(create).not.toContain('monthlyCreditBudget');
		expect(create).not.toContain('Legacy daily credits');
		expect(edit).toContain('Save provider');
		expect(edit).toContain('Broadcast capabilities');
		expect(edit).toContain('Native-derived scheduling mode');
		expect(edit).toContain('Save native capacity');
		expect(edit).toContain('Projected TreeSeed capacity');
		expect(edit).toContain('Portfolio allocation');
		expect(edit).toContain('Save allocation');
		expect(edit).toContain('portfolioAllocationPercent');
		expect(edit).toContain('reservePoolPercent');
		expect(edit).toContain('emergencyOverride');
		expect(edit).toContain('createMarketApiFacade');
		expect(edit).not.toContain('context.store.listTeamCapacityProviders');
		expect(edit).not.toContain('/app/capacity/grants');
		expect(edit).toContain('Deployment status');
		expect(edit).toContain('Deploy provider');
		expect(edit).toContain('capacityProviderHost');
		expect(edit).toContain('self-hosting');
		expect(edit).not.toContain('Select name="provider"');
		expect(workdays).toContain('createMarketApiFacade');
		expect(workdays).toContain('Native usage');
		expect(workdays).not.toContain('context.store');
		expect(workdayDetail).toContain('createMarketApiFacade');
		expect(workdayDetail).toContain('Native and derived capacity');
		expect(workdayDetail).toContain('Native pressure');
		expect(workdayDetail).not.toContain('context.store');
		for (const method of ['updateCapacityProvider', 'listCapacityGrants', 'createCapacityGrant', 'updateCapacityGrant', 'createExecutionProvider', 'updateExecutionProvider', 'createExecutionProviderNativeLimit']) {
			expect(apiClient).toContain(method);
		}
		expect(keys).toContain('Rotate API key');
		expect(keys).toContain('Copy key');
		expect(keys).toContain('Restart the capacity provider');
		expect(keys).toContain('createMarketApiFacade');
		expect(keys).not.toContain('context.store');
		expect(keys).not.toContain('Reset failed');
		expect(keys).not.toContain('/api-keys/reset');
		expect(keys).not.toContain('/revoke');
		expect(hostPicker).toContain('Capacity provider');
		expect(hostPicker).toContain('/app/hosts/capacity-provider/new');
		expect(hostPicker).not.toContain('Create processing host');
		expect(hostCreate).toContain('capacity-provider');
	});

	it('represents every work content model in the management interface', () => {
		const nav = source('src/components/app/controls/WorkContentNav.astro');
		for (const [model, route] of [
			['objectives', '/app/work/objectives'],
			['questions', '/app/work/questions'],
			['notes', '/app/work/notes'],
			['proposals', '/app/work/proposals'],
			['decisions', '/app/work/decisions'],
		]) {
			expect(nav).toContain(`key: '${model}'`);
			expect(nav).toContain(`href: '${route}'`);
			const routePath = `src/pages${route}.astro`;
			expect(source(routePath), routePath).toContain('loadWorkContentEntries');
		}
		expect(source('src/view-models/work-content.ts')).toContain("['questions', 'objectives', 'notes', 'proposals', 'decisions']");
		expect(source('src/view-models/knowledge-content.ts')).toContain("'objectives'");
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

	it('uses responsive app cards for shared app lists', () => {
		const plainTable = source('src/components/app/controls/PlainTable.astro');
		expect(plainTable).toContain('ts-record-card');
		expect(plainTable).toContain('data-sort-values');
		expect(plainTable).toContain('data-filter-text');
		expect(plainTable).not.toContain('<table>');
		expect(plainTable).not.toContain('<tr');
		expect(source('src/styles/treeseed.css')).toContain('.ts-record-card__actions');
	});

	it('splits project decisions into proposal, decision, and review tabs with verdict actions', () => {
		const decisions = source('src/pages/app/projects/[projectId]/decisions.astro');
		for (const tab of ['proposals', 'decisions', 'review']) {
			expect(decisions).toContain(`key: '${tab}'`);
			expect(decisions).toContain(`?tab=${tab}`);
		}
		expect(decisions).toContain('data-proposal-select');
		expect(decisions).toContain('data-proposal-decide');
		expect(decisions).toContain('data-final-verdict-open');
		expect(decisions).toContain('/local-content/decisions/from-proposals');
	});

	it('makes local content mutation flows platform-operation aware', () => {
		const helper = source('src/components/app/controls/platform-operation-status.ts');
		expect(helper).toContain('submitPlatformOperationForm');
		expect(helper).toContain('/v1/platform/operations/');
		expect(helper).toContain('TERMINAL_STATUSES');
		for (const path of [
			'src/pages/app/work/[collection]/new.astro',
			'src/pages/app/work/objectives/new.astro',
			'src/pages/app/work/[collection]/[slug].astro',
			'src/pages/app/projects/[projectId]/agents/new.astro',
			'src/pages/app/projects/[projectId]/agents/[agentSlug].astro',
			'src/pages/app/projects/[projectId]/decisions.astro',
			'src/components/app/controls/related-content-creator.ts',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('submitPlatformOperationForm');
			expect(contents, path).not.toContain('payload?.payload?.href');
			expect(contents, path).not.toContain('result?.payload?.href');
		}
	});
});
