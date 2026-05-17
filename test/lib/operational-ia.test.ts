import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const operationalRoutes = [
	'src/pages/app/index.astro',
	'src/pages/app/workdays/index.astro',
	'src/pages/app/workdays/[workdayId].astro',
	'src/pages/app/governance.astro',
	'src/pages/app/governance/[approvalId].astro',
	'src/pages/app/knowledge.astro',
	'src/pages/app/knowledge/[category]/[slug].astro',
	'src/pages/app/infrastructure.astro',
	'src/pages/app/infrastructure/repositories.astro',
	'src/pages/app/infrastructure/deployments.astro',
	'src/pages/app/infrastructure/capacity.astro',
	'src/pages/app/infrastructure/workers.astro',
	'src/pages/app/infrastructure/hosts.astro',
	'src/pages/app/infrastructure/resources.astro',
	'src/pages/app/infrastructure/seeds.astro',
	'src/pages/app/infrastructure/policies.astro',
];

const viewModels = [
	'src/view-models/mission-control.vm.ts',
	'src/view-models/workday.vm.ts',
	'src/view-models/governance.vm.ts',
	'src/view-models/knowledge.vm.ts',
	'src/view-models/infrastructure.vm.ts',
];

const operationComponents = [
	'OperationalTimeline',
	'WorkdaySummaryCard',
	'GovernancePanel',
	'GovernanceReviewQueue',
	'GovernancePolicySummary',
	'GovernanceDecisionPanel',
	'KnowledgeArtifactCard',
	'RepositoryContextPanel',
	'InfrastructureStatusGrid',
	'InfrastructureResourceTable',
	'CapacityDiagnosticsPanel',
	'WorkerQueuePanel',
	'SeedOperationsPanel',
	'InfrastructureSectionPage',
];

describe('operational app information architecture', () => {
	it('uses the clean Stage 1 app routes', () => {
		for (const path of operationalRoutes) {
			expect(existsSync(resolve(process.cwd(), path)), path).toBe(true);
			expect(source(path), path).toMatch(/TreeseedAppLayout|InfrastructureSectionPage/u);
		}

		expect(existsSync(resolve(process.cwd(), 'src/pages/app/teams/[teamSlug]/[section].astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'src/pages/app/teams/[teamSlug]/projects/[projectSlug]/[section].astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'src/pages/app/teams/[teamSlug]/edit.astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'src/pages/app/teams/new.astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'src/pages/app/teams/name-check.ts'))).toBe(false);
	});

	it('collapses app shell navigation to the five primary sections', () => {
		const layout = source('src/layouts/TreeseedAppLayout.astro');

		for (const label of ['Mission Control', 'Workdays', 'Governance', 'Knowledge', 'Infrastructure']) {
			expect(layout).toContain(label);
		}
		for (const retired of ['Market', 'Hosts', 'Capacity', 'Seeds', 'Agents']) {
			expect(layout).not.toContain(`label: '${retired}'`);
		}
		expect(layout).not.toContain('ProjectHeader');
		expect(layout).not.toContain('projectTabs');
	});

	it('creates operational view models and reusable components', () => {
		for (const path of viewModels) {
			expect(existsSync(resolve(process.cwd(), path)), path).toBe(true);
		}
		expect(existsSync(resolve(process.cwd(), 'src/lib/market/workday-projection.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/lib/market/governance-projection.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/lib/market/knowledge-projection.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/lib/market/infrastructure-projection.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/lib/market/infrastructure-seeds.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/lib/market/operational-artifacts.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/pages/api/workdays/[workdayId].ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/pages/api/governance/index.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/pages/api/governance/[approvalId].ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/pages/api/governance/[approvalId]/decision.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/pages/api/knowledge/index.ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/pages/api/knowledge/[artifactId].ts'))).toBe(true);
		expect(existsSync(resolve(process.cwd(), 'src/pages/api/infrastructure.ts'))).toBe(true);
		for (const component of operationComponents) {
			const path = `src/components/app/operations/${component}.astro`;
			expect(existsSync(resolve(process.cwd(), path)), path).toBe(true);
			expect(source(path), path).not.toMatch(/\sstyle=/u);
			expect(source(path), path).not.toContain('<style');
		}
	});

	it('isolates infrastructure as advanced operator tooling', () => {
		const page = source('src/pages/app/infrastructure.astro');
		const projection = source('src/lib/market/infrastructure-projection.ts');
		const api = source('src/pages/api/infrastructure.ts');

		for (const label of ['System Overview', 'Teams and Projects', 'Repositories', 'Deployments', 'Capacity', 'Workers', 'Hosts', 'Resources', 'Seeds', 'Policies']) {
			expect(page).toContain(label);
		}
		for (const route of ['repositories', 'deployments', 'capacity', 'workers', 'hosts', 'resources', 'seeds', 'policies']) {
			expect(existsSync(resolve(process.cwd(), `src/pages/app/infrastructure/${route}.astro`))).toBe(true);
		}
		for (const contents of [page, projection, api]) {
			expect(contents).not.toContain('/app/teams/');
			expect(contents).not.toContain('/market/knowledge-packs');
			expect(contents).not.toContain('/market/templates');
			expect(contents).not.toMatch(/payloadJson|raw prompt|Prompt|runner token|secret/iu);
		}
	});

	it('unifies knowledge without marketplace or raw execution framing', () => {
		const index = source('src/pages/app/knowledge.astro');
		const detail = source('src/pages/app/knowledge/[category]/[slug].astro');
		const projection = source('src/lib/market/knowledge-projection.ts');

		for (const label of ['Architecture', 'Operations', 'Research', 'Implementation', 'Decisions', 'Reports', 'Releases', 'Imports']) {
			expect(projection).toContain(label);
		}
		expect(index).toContain('Unified knowledge index');
		expect(detail).toContain('Produced During');
		expect(detail).toContain('RepositoryContextPanel');
		for (const contents of [index, detail, projection]) {
			expect(contents).not.toContain('/app/teams/');
			expect(contents).not.toContain('/market/knowledge-packs');
			expect(contents).not.toMatch(/agentId|payloadJson|raw prompt|Prompt/iu);
		}
	});

	it('elevates governance without exposing internal execution details', () => {
		const dashboard = source('src/pages/app/governance.astro');
		const detail = source('src/pages/app/governance/[approvalId].astro');
		const projection = source('src/lib/market/governance-projection.ts');

		for (const label of ['Pending approvals', 'Escalations', 'Policy violations', 'Audit Trail']) {
			expect(dashboard).toContain(label);
		}
		expect(detail).toContain('GovernanceDecisionPanel');
		expect(detail).toContain('RepositoryContextPanel');
		expect(projection).not.toMatch(/agentId|payloadJson|raw prompt|Prompt/iu);
		expect(dashboard).not.toContain('/app/teams/');
		expect(detail).not.toContain('/app/teams/');
	});

	it('centers workday detail on operational phases instead of internals', () => {
		const page = source('src/pages/app/workdays/[workdayId].astro');
		const timeline = source('src/components/app/operations/OperationalTimeline.astro');

		for (const label of ['Research', 'Implementation', 'Verification', 'Governance', 'Knowledge']) {
			expect(timeline).toContain(label.toLowerCase());
		}
		expect(page).toContain('Current phase');
		expect(page).toContain('Risk classification');
		expect(page).toContain('Operational artifacts');
		expect(page).not.toMatch(/agentId|payloadJson|raw prompt|Prompt/iu);
	});

	it('does not route generated operational hrefs back to old project sections', () => {
		for (const path of ['src/api/store.js', 'src/api/app.js', 'src/lib/market/seeds/apply.js']) {
			const contents = source(path);
			expect(contents, path).not.toContain('/projects/${project.slug}/overview');
			expect(contents, path).not.toContain('/projects/${projectSlug}/${section}');
			expect(contents, path).not.toContain('/seeds#approval-');
		}
	});

	it('reframes public catalog copy as resources and imports', () => {
		expect(source('src/layouts/TreeseedPublicLayout.astro')).toContain('Resources');
		expect(source('src/pages/market/index.astro')).toContain('Operational Resources');
		expect(source('src/pages/market/templates/index.astro')).toContain('Workflow Imports');
		expect(source('src/pages/market/knowledge-packs/index.astro')).toContain('Knowledge Imports');
	});

	it('locks Phase 7 operational polish into shared app styling and copy', () => {
		const css = source('src/styles/treeseed.css');
		expect(css).toContain('Phase 7 operational identity');
		expect(css).toContain('--ts-operational-severity-critical');
		expect(css).toContain('--ts-operational-phase-governance');
		expect(css).toContain(':focus-visible');
		expect(css).toContain('prefers-reduced-motion');
		expect(css).toContain('border-radius: 0.5rem');

		const timeline = source('src/components/app/operations/OperationalTimeline.astro');
		expect(timeline).toContain('data-phase');
		expect(timeline).toContain('ts-sr-only');
		expect(timeline).toContain('aria-describedby');

		const layout = source('src/layouts/TreeseedAppLayout.astro');
		const launch = source('src/pages/app/launch.astro');
		expect(layout).toContain('operational control plane');
		expect(layout).not.toContain('listings');
		expect(launch).toContain('Organization context');
		expect(launch).toContain('Workflow import');
		expect(launch).toContain('Knowledge import');
		expect(launch).not.toContain('Create a team first');
		expect(launch).not.toContain('Agents can save');

		for (const path of operationalRoutes) {
			const contents = source(path);
			expect(contents, path).not.toContain('/app/teams');
			expect(contents, path).not.toMatch(/raw prompt|payloadJson|runner token|Marketplace/iu);
		}
	});

	it('completes the migration by removing retired team and project section code', () => {
		for (const path of [
			'src/components/app/project',
			'src/components/app/team',
			'src/lib/market/project-section-data.ts',
			'src/lib/market/team-section-data.ts',
		]) {
			expect(existsSync(resolve(process.cwd(), path)), path).toBe(false);
		}

		const appEntries = readdirSync(resolve(process.cwd(), 'src/pages/app')).sort();
		expect(appEntries).toEqual([
			'account.astro',
			'governance',
			'governance.astro',
			'index.astro',
			'infrastructure',
			'infrastructure.astro',
			'knowledge',
			'knowledge.astro',
			'launch.astro',
			'workdays',
		]);

		expect(source('test/lib/seed-apply.test.ts')).toContain('loadInfrastructureSeedState');
		expect(source('test/lib/seed-apply.test.ts')).not.toContain('loadTeamSectionData');
	});

	it('keeps active docs and scanner targets on the operational IA', () => {
		for (const path of [
			'docs/agent-docs.md',
			'docs/agent-dev.md',
			'docs/agent-ops.md',
			'docs/agent-budget.md',
			'packages/agent/src/agents/knowledge/pipeline.ts',
			'packages/agent/src/services/codebase-documentation-scanner.ts',
		]) {
			const contents = source(path);
			expect(contents, path).not.toContain('/app/teams');
			expect(contents, path).not.toMatch(/ProjectAgentsView|TeamInboxView|ProjectWorkstreamsView|Project Agents|Team Inbox|src\/components\/app\/project|src\/components\/team/iu);
		}

		const scanner = source('packages/agent/src/services/codebase-documentation-scanner.ts');
		expect(scanner).toContain('src/components/app/operations/**');
		expect(scanner).toContain('Mission Control, Workdays, Governance, Knowledge, and Infrastructure');

		const migration = source('docs/ui-migration.md');
		expect(migration).toContain('Migration Completion Status');
		expect(migration).toContain('The numbered UX migration phases are complete.');
		expect(migration).toContain('There is no compatibility route layer');
	});

	it('keeps product positioning docs on the completed operational model', () => {
		const purpose = source('docs/purpose.md');
		const appSpec = source('docs/market_ui_spec.md');

		for (const contents of [purpose, appSpec]) {
			for (const label of ['Mission Control', 'Workdays', 'Governance', 'Knowledge', 'Infrastructure']) {
				expect(contents).toContain(label);
			}
			expect(contents).toMatch(/Objective\s*->\s*Workday\s*->\s*Execution\s*->\s*Governance\s*->\s*Knowledge/u);
			expect(contents).not.toMatch(/Team Home|Project Overview|Team Inbox|Project Agents|Market listing|marketplace-first onboarding|team\/project registry|catalog quality review|listing moderation/iu);
		}

		expect(purpose).toContain('governable operational infrastructure');
		expect(purpose).toContain('operational resources and imports');
		expect(appSpec).toContain('Operational App UI Specification');
		expect(appSpec).toContain('resource-discovery-first');
	});

	it('keeps active agent docs and seed content away from deprecated app UX terms', () => {
		expect(existsSync(resolve(process.cwd(), 'src/content/questions/how-does-market-ui-expose-agent-governance.mdx'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'src/content/questions/how-does-treeseed-app-expose-operational-governance.mdx'))).toBe(true);

		for (const path of [
			'docs/agent-docs.md',
			'docs/agent-dev.md',
			'docs/agent-ops.md',
			'docs/agent-budget.md',
			'src/content/agents/market-curator.mdx',
			'src/content/agents/treeseed-governance-steward.mdx',
			'src/content/agents/treeseed-workday-reporter.mdx',
			'src/content/knowledge/market/index.mdx',
			'src/content/notes/market-framework-and-site-shape.mdx',
			'src/content/objectives/launch-market-site.mdx',
			'src/content/pages/status.mdx',
			'src/content/pages/vision.mdx',
			'src/content/questions/how-does-treeseed-app-expose-operational-governance.mdx',
		]) {
			const contents = source(path);
			expect(contents, path).not.toContain('/app/teams');
			expect(contents, path).not.toMatch(/Project Agents|Project Agent|project agent|Team Inbox|Team Home|Project Overview|Market UI|Market web UI|marketplace|market listing|catalog quality review|listing moderation|direct human prompting|team\/project/iu);
		}
	});
});
