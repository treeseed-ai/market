import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const teamComponents = [
	'TeamHomeView',
	'TeamInboxView',
	'TeamMembersView',
	'TeamProductsView',
	'TeamHostsView',
	'TeamCapacityView',
	'TeamSeedsView',
	'TeamSettingsView',
];

const projectComponents = [
	'ProjectOverviewView',
	'ProjectDirectView',
	'ProjectWorkstreamsView',
	'ProjectAgentsView',
	'ProjectCapacityView',
	'ProjectReleasesView',
	'ProjectShareView',
	'ProjectSettingsView',
];

describe('team and project section extraction', () => {
	it('keeps dynamic route files as section controllers', () => {
		const teamRoute = source('src/pages/app/teams/[teamSlug]/[section].astro');
		const projectRoute = source('src/pages/app/teams/[teamSlug]/projects/[projectSlug]/[section].astro');

		for (const component of teamComponents) {
			expect(teamRoute).toContain(component);
		}
		for (const component of projectComponents) {
			expect(projectRoute).toContain(component);
		}

		for (const contents of [teamRoute, projectRoute]) {
			expect(contents).toContain('SectionView');
			expect(contents).not.toContain('class="ts-panel"');
			expect(contents).not.toContain('class="ts-table');
			expect(contents).not.toContain('<script>');
			expect(contents).not.toMatch(/\sstyle=/u);
		}
	});

	it('creates all expected section component files', () => {
		for (const component of teamComponents) {
			expect(existsSync(resolve(process.cwd(), `src/components/app/team/${component}.astro`)), component).toBe(true);
		}
		for (const component of projectComponents) {
			expect(existsSync(resolve(process.cwd(), `src/components/app/project/${component}.astro`)), component).toBe(true);
		}
	});

	it('preserves host and capacity behavior hooks after extraction', () => {
		const hosts = source('src/components/app/team/TeamHostsView.astro');
		const capacity = source('src/components/app/team/TeamCapacityView.astro');
		const projectCapacity = source('src/components/app/project/ProjectCapacityView.astro');
		const script = source('src/components/app/team/TeamHostCapacityScript.astro');

		for (const marker of [
			'data-host-tabs',
			'data-host-tab-panel',
			'data-host-create-form',
			'data-sensitive-lock',
			'id="hosts-page-data"',
		]) {
			expect(hosts).toContain(marker);
		}
		for (const marker of [
			'data-capacity-managed-launch',
			'data-capacity-host-backed-form',
			'data-capacity-grant-form',
			'data-capacity-key-reset',
			'id="capacity-page-data"',
			'Reservations',
			'active reservation',
			'budget blocked',
			'runnable',
		]) {
			expect(capacity).toContain(marker);
		}
		for (const marker of [
			'data-project-capacity-root',
			'Capacity readiness',
			'Budgeted work',
			'Provider pressure',
			'Routing lanes',
			'Project grants',
			'Active and recent capacity',
			'Recent decisions',
			'Estimate profiles',
			'Recent actuals',
			'Capacity decisions',
			'Checkpointed work',
			'Budget and policy boundaries',
			'data-project-capacity-task-form',
			'data-project-capacity-route-preview',
			'data-project-capacity-approval-form',
			'/v1/projects/${encodeURIComponent(capacityData.projectId)}/agent-tasks',
			'/v1/approval-requests/${encodeURIComponent(approvalId)}/decide',
		]) {
			expect(projectCapacity).toContain(marker);
		}
		for (const marker of [
			'/v1/teams/${encodeURIComponent(teamId)}/hosts',
			'/v1/teams/${encodeURIComponent(teamId)}/repository-hosts',
			'/v1/teams/${encodeURIComponent(teamId)}/capacity/providers/managed',
			'/v1/teams/${encodeURIComponent(teamId)}/capacity/providers/host-backed',
			'/v1/capacity/providers/${encodeURIComponent(providerId)}/api-keys/reset',
			'treeseedSensitiveUnlock',
		]) {
			expect(script).toContain(marker);
		}
	});

	it('keeps converted section sources on current tokens and shared primitives', () => {
		for (const path of [
			...teamComponents.map((component) => `src/components/app/team/${component}.astro`),
			...projectComponents.map((component) => `src/components/app/project/${component}.astro`),
		]) {
			const contents = source(path);
			expect(contents, path).not.toMatch(/--(?:site|kc)-/u);
			expect(contents, path).not.toMatch(/\sstyle=/u);
		}

		const projectOverview = source('src/components/app/project/ProjectOverviewView.astro');
		const teamHome = source('src/components/app/team/TeamHomeView.astro');
		expect(projectOverview).toContain('MetricGrid');
		expect(projectOverview).toContain('Panel');
		expect(teamHome).toContain('MetricGrid');
		expect(teamHome).toContain('Card');
	});

	it('exposes the project agent supervision sections', () => {
		const agents = source('src/components/app/project/ProjectAgentsView.astro');

		for (const marker of [
			'Runtime readiness',
			'Current workday',
			'Codex provider',
			'Workday Timeline',
			'Generated Knowledge Review',
			'Approval Detail',
			'Mutation Diff Viewer',
			'Workday report timeline',
			'workday-report-timeline',
			'generatedArtifacts',
			'knowledgeDrafts',
			'optimizationReports',
			'docs_mutation_result',
			'source_map',
			'codexReadiness',
			'runtimeReports',
			'approve',
			'request_changes',
			'defer',
			'reject',
			'approve_release',
			'reject_release',
			'Release approvals',
			'Grants and task event log',
			'Snapshots, repair, and release',
			'operationGrants',
			'operationEvents',
			'operationLifecycle',
			'verificationStatus',
			'approval-',
			'artifact-',
			'agent-',
			'task-',
			'Production release still requires a separate human release approval',
		]) {
			expect(agents).toContain(marker);
		}
		const projectOverview = source('src/components/app/project/ProjectOverviewView.astro');
		expect(projectOverview).toContain('Docs automation');
		expect(projectOverview).toContain('pendingApprovalCount');
		const projectWorkstreams = source('src/components/app/project/ProjectWorkstreamsView.astro');
		expect(projectWorkstreams).toContain('Documentation governance activity');
		expect(projectWorkstreams).toContain('./agents#approval-');
		const teamInbox = source('src/components/app/team/TeamInboxView.astro');
		expect(teamInbox).toContain('#approval-');
		expect(teamInbox).toContain('#artifact-');
		expect(agents).not.toContain('inspect-only');
	});

	it('exposes the team seed operations surface', () => {
		const layout = source('src/layouts/TreeseedAppLayout.astro');
		const teamRoute = source('src/pages/app/teams/[teamSlug]/[section].astro');
		const sectionData = source('src/lib/market/team-section-data.ts');
		const seeds = source('src/components/app/team/TeamSeedsView.astro');

		expect(layout).toContain('Seeds');
		expect(layout).toContain('${baseTeamPath}/seeds');
		expect(teamRoute).toContain('TeamSeedsView');
		expect(sectionData).toContain('loadSeedSectionData');
		expect(sectionData).toContain('planSeedWithStore');
		expect(sectionData).toContain('listApprovalRequestsForTeam');
		expect(sectionData).toContain('listSeedRuns');

		for (const marker of [
			'data-team-seeds-root',
			'Seed plans and governed applies',
			'Record plan',
			'Apply staging',
			'Apply production with approval',
			'Plan actions',
			'Productized seed bundle',
			'data-seed-export-form',
			'data-seed-export-output',
			'Production approvals',
			'Seed runs',
			'team-seeds-page-data',
			"/v1/seeds/${encodeURIComponent(seedPageData.selectedSeed || 'treeseed')}/${mode}",
			'/v1/teams/${encodeURIComponent(seedPageData.teamId || \'\')}/seeds/export',
			'/v1/approval-requests/${encodeURIComponent(approvalId)}/decide',
		]) {
			expect(seeds).toContain(marker);
		}
	});
});
