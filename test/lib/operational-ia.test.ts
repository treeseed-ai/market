import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	let sourcePath = path
		.replace(/^@treeseed\/ui\/components\/astro\//u, 'packages/ui/src/astro/')
		.replace(/^@treeseed\/ui\/lib\/app\//u, 'packages/ui/src/lib/app/');
	if (sourcePath.startsWith('packages/ui/src/lib/app/') && !/\.[cm]?[tj]sx?$/u.test(sourcePath)) {
		sourcePath = `${sourcePath}.ts`;
	}
	return readFileSync(resolve(process.cwd(), sourcePath), 'utf8');
}

function filesUnder(path: string): string[] {
	const absolute = resolve(process.cwd(), path);
	return readdirSync(absolute).flatMap((entry) => {
		const child = `${path}/${entry}`;
		const childAbsolute = resolve(process.cwd(), child);
		return statSync(childAbsolute).isDirectory() ? filesUnder(child) : [child];
	});
}

const primaryRoutes = [
	'packages/admin/src/pages/app/index.astro',
	'packages/admin/src/pages/app/services.astro',
	'packages/admin/src/pages/app/projects/index.astro',
	'packages/admin/src/pages/app/capacity/index.astro',
	'packages/admin/src/pages/app/capacity/providers/index.astro',
	'packages/admin/src/pages/app/work/objectives.astro',
	'packages/admin/src/pages/app/knowledge/artifacts.astro',
];

const onePurposeRoutes = [
	'packages/admin/src/pages/app/teams/index.astro',
	'packages/admin/src/pages/app/teams/new.astro',
	'packages/admin/src/pages/app/teams/[teamId]/edit.astro',
	'packages/admin/src/pages/app/teams/[teamId]/members.astro',
	'packages/admin/src/pages/app/teams/[teamId]/delete.astro',
	'packages/admin/src/pages/app/hosts/new.astro',
	'packages/admin/src/pages/app/hosts/[hostType]/new.astro',
	'packages/admin/src/pages/app/hosts/[hostType]/[hostId].astro',
	'packages/admin/src/pages/app/hosts/[hostType]/[hostId]/settings.astro',
	'packages/admin/src/pages/app/projects/new.astro',
	'packages/admin/src/pages/app/projects/[projectId]/settings.astro',
	'packages/admin/src/pages/app/projects/[projectId]/hosts.astro',
	'packages/admin/src/pages/app/projects/[projectId]/deploy.astro',
	'packages/admin/src/pages/app/projects/[projectId]/guidance.astro',
	'packages/admin/src/pages/app/projects/[projectId]/decisions.astro',
	'packages/admin/src/pages/app/projects/[projectId]/artifacts.astro',
	'packages/admin/src/pages/app/projects/[projectId]/delete.astro',
	'packages/admin/src/pages/app/capacity/providers/new.astro',
	'packages/admin/src/pages/app/capacity/providers/[providerId].astro',
	'packages/admin/src/pages/app/capacity/providers/[providerId]/settings.astro',
	'packages/admin/src/pages/app/capacity/providers/[providerId]/keys.astro',
	'packages/admin/src/pages/app/work.astro',
	'packages/admin/src/pages/app/work/objectives/new.astro',
	'packages/admin/src/pages/app/work/decisions.astro',
	'packages/admin/src/pages/app/work/decisions/[slug].astro',
	'packages/admin/src/pages/app/work/review.astro',
	'packages/admin/src/pages/app/work/questions.astro',
	'packages/admin/src/pages/app/work/notes.astro',
	'packages/admin/src/pages/app/work/proposals.astro',
	'packages/admin/src/pages/app/knowledge/templates.astro',
	'packages/admin/src/pages/app/knowledge/packs.astro',
	'packages/admin/src/pages/app/knowledge/releases.astro',
	'packages/admin/src/pages/app/knowledge/publish.astro',
];

describe('contextual dashboard and drilldown app information architecture', () => {
	it('uses the guided control navigation labels', () => {
		const layout = source('packages/admin/src/layouts/TreeseedAppLayout.astro');
		const projectDashboard = source('packages/admin/src/pages/app/projects/[projectId].astro');
		for (const label of ['Start', 'Services', 'Projects', 'Capacity', 'Work', 'Knowledge']) {
			expect(layout).toContain(`label: '${label}'`);
		}
		expect(layout).not.toContain(`label: 'Hosts'`);
		expect(layout).not.toContain(`label: 'Team'`);
		for (const label of ['Mission Control', 'Workdays', 'Governance', 'Infrastructure', 'Market']) {
			expect(layout).not.toContain(`label: '${label}'`);
		}
		expect(layout).toContain('treeseed_active_team');
		expect(layout).toContain("url.searchParams.delete('teamId')");
		expect(layout).not.toContain("url.searchParams.set('teamId'");
		expect(layout).toContain('href="/app/teams" title="Manage teams"');
		expect(layout).toContain(`href: '/app/capacity/allocation'`);
		expect(projectDashboard).toContain('ReadinessSummary');
		expect(projectDashboard).toContain('loadServiceInventory');
		expect(projectDashboard).toContain('buildServicesDashboard');
	});

	it('centralizes app and marketplace resource access', () => {
		const appAccess = source('packages/admin/src/view-models/app-access.ts');
		const publicAccess = source('packages/admin/src/lib/market/public-access.ts');
		const layout = source('packages/admin/src/layouts/TreeseedAppLayout.astro');
		const sharedViewModel = source('packages/admin/src/view-models/shared.ts');
		const deploymentStatusPage = source('packages/admin/src/pages/app/projects/deployment/[id].astro');
		const projectPages = [
			'packages/admin/src/pages/app/projects/[projectId]/deploy.astro',
			'packages/admin/src/pages/app/projects/[projectId]/hosts.astro',
			'packages/admin/src/pages/app/projects/[projectId]/settings.astro',
			'packages/admin/src/pages/app/projects/[projectId]/guidance.astro',
			'packages/admin/src/pages/app/projects/[projectId]/decisions.astro',
			'packages/admin/src/pages/app/projects/[projectId]/artifacts.astro',
			'packages/admin/src/pages/app/projects/[projectId]/delete.astro',
			'packages/admin/src/pages/app/projects/[projectId]/workdays.astro',
			'packages/admin/src/pages/app/projects/[projectId]/agents.astro',
			'packages/admin/src/pages/app/projects/[projectId]/agents/new.astro',
			'packages/admin/src/pages/app/projects/[projectId]/agents/[agentSlug].astro',
			'packages/admin/src/pages/app/projects/[projectId]/workdays/[workdayId].astro',
		];

		for (const symbol of ['loadAppContext', 'resolveAppProject', 'resolveAppDeployment', 'resolveAppHost', 'resolveAppCapacityProvider', 'resolveAppTeam']) {
			expect(appAccess).toContain(`function ${symbol}`);
		}
		expect(sharedViewModel).not.toContain('loadOperationalContext');
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/lib/market/app-data.ts'))).toBe(false);
		expect(appAccess).not.toContain("searchParams?.get('teamId')");
		expect(layout).not.toContain("searchParams.set('teamId'");
		expect(source('packages/admin/src/pages/app/account.astro')).toContain('loadAppContext');
		expect(source('packages/admin/src/pages/app/projects/new.astro')).toContain('listMarketplaceSiteTemplates');
		expect(deploymentStatusPage).toContain('const deploymentAccessible');
		expect(deploymentStatusPage).toContain("Astro.response.status = deploymentResolution?.status === 'forbidden' ? 403 : 404");
		for (const path of projectPages) {
			const contents = source(path);
			if (contents.includes('operating-loop.vm')) {
				expect(contents, path).toMatch(/load(?:ProjectWorkday|Agent)|resolveProjectForRoute/u);
			} else {
				expect(contents, path).toContain('resolveAppProject');
			}
			expect(contents, path).not.toContain('context.projects.find');
		}
		expect(deploymentStatusPage).toContain('resolveAppDeployment');
		expect(deploymentStatusPage).not.toContain('?teamId=');
		for (const path of filesUnder('packages/admin/src/pages/app').filter((entry) => entry.endsWith('.astro'))) {
			const contents = source(path);
			expect(contents, path).not.toContain('loadOperationalContext');
			expect(contents, path).not.toContain('resolveApiStore(Astro)');
			expect(contents, path).not.toContain('loadAccessibleTeams(Astro');
			expect(contents, path).not.toMatch(/load[A-Za-z]+ViewModel\(Astro\.locals/u);
		}
		expect(source('packages/admin/src/pages/app/hosts/[hostType]/[hostId]/settings.astro')).toContain('resolveAppHost');
		expect(source('packages/admin/src/pages/app/capacity/providers/[providerId]/settings.astro')).toContain('resolveAppCapacityProvider');
		expect(source('packages/admin/src/pages/app/capacity/providers/[providerId]/keys.astro')).toContain('resolveAppCapacityProvider');
		for (const path of [
			'packages/admin/src/pages/app/teams/[teamId]/edit.astro',
			'packages/admin/src/pages/app/teams/[teamId]/members.astro',
			'packages/admin/src/pages/app/teams/[teamId]/delete.astro',
		]) {
			expect(source(path), path).toContain('resolveAppTeam');
		}
		for (const symbol of ['loadMarketplaceContext', 'listMarketplaceSiteTemplates', 'resolveMarketplaceSiteTemplate', 'resolveMarketplaceCatalogItem', 'resolveMarketplaceTeamProfile', 'resolveMarketplaceUserProfile']) {
			expect(publicAccess).toContain(`function ${symbol}`);
		}
		for (const path of [
			'packages/admin/src/pages/market/index.astro',
			'packages/admin/src/pages/t/[name].astro',
			'packages/admin/src/pages/u/[username].astro',
		]) {
			expect(source(path), path).toContain('public-access');
			expect(source(path), path).not.toContain('treeseed_active_team');
		}
		for (const path of [
			'packages/admin/src/pages/market/templates/index.astro',
			'packages/admin/src/pages/market/templates/[slug].astro',
			'packages/admin/src/pages/market/knowledge-packs/index.astro',
			'packages/admin/src/pages/market/knowledge-packs/[slug].astro',
		]) {
			expect(source(path), path).toContain('knowledge-distribution.vm');
			expect(source(path), path).toContain('helpContext');
			expect(source(path), path).toContain('feedbackContext');
			expect(source(path), path).not.toContain('treeseed_active_team');
		}
	});

	it('keeps primary app routes to contextual dashboards and focused control entry points', () => {
		for (const path of [...primaryRoutes, ...onePurposeRoutes]) {
			expect(existsSync(resolve(process.cwd(), path)), path).toBe(true);
		}
		expect(readdirSync(resolve(process.cwd(), 'packages/admin/src/pages/app')).sort()).toEqual([
			'account.astro',
			'capacity',
			'commons',
			'hosts',
			'index.astro',
			'knowledge',
			'knowledge.astro',
			'market',
			'projects',
			'services.astro',
			'teams',
			'work',
			'work.astro',
		]);
	});

	it('renders Phase 7 contextual dashboard proofs through the shared template', () => {
		const dashboardTemplate = source('packages/ui/src/astro/templates/DashboardTemplate.astro');
		const dashboardViewModel = source('packages/admin/src/view-models/contextual-dashboard.vm.ts');
		const dashboardRoutes = [
			['packages/admin/src/pages/app/index.astro', 'TreeseedAppLayout'],
			['packages/admin/src/pages/app/teams/index.astro', 'TreeseedAppLayout'],
			['packages/admin/src/pages/app/projects/[projectId].astro', 'TreeseedAppLayout'],
			['packages/admin/src/pages/market/index.astro', 'TreeseedPublicLayout'],
		] as const;

		expect(dashboardTemplate).toContain('DashboardViewModel');
		expect(dashboardTemplate).toContain('ActionBar');
		for (const symbol of ['buildPersonalDashboard', 'buildTeamDashboard', 'buildProjectDashboard', 'buildMarketDashboard']) {
			expect(dashboardViewModel).toContain(`function ${symbol}`);
		}
		for (const [path, shell] of dashboardRoutes) {
			const contents = source(path);
			expect(contents, path).toContain('DashboardTemplate');
			expect(contents, path).toContain(shell);
			expect(contents, path).toContain('helpContext');
			expect(contents, path).toContain('feedbackContext');
			expect(contents, path).not.toMatch(/<style(?:\s|>)|Mission Control|provider console|dashboard maze/iu);
		}
		expect(source('packages/admin/src/pages/app/projects/[projectId].astro')).not.toContain('Astro.redirect(`/app/projects/${encodeURIComponent(String(Astro.params.projectId');
	});

	it('keeps the rail team selector compact without a duplicate divider', () => {
		const styles = source('packages/ui/src/styles/app-controls.css');

		expect(styles).toContain('.ts-team-switcher {\n\tmargin-bottom: 0;\n\tpadding: 0;\n\tborder-top: 0;');
		expect(styles).toContain('grid-template-columns: minmax(0, 1fr) max-content;');
		expect(styles).toContain('.ts-icon-button');
		expect(styles).toContain('.ts-team-selector .ts-icon-button');
		expect(styles).toContain('white-space: nowrap;');
	});

	it('keeps team mutations behind the server-side API facade', () => {
		for (const path of [
			'packages/admin/src/pages/app/teams/new.astro',
			'packages/admin/src/pages/app/teams/[teamId]/edit.astro',
			'packages/admin/src/pages/app/teams/[teamId]/delete.astro',
		]) {
			const page = source(path);
			expect(page).toContain('ApiClientFacade');
			expect(page).toContain('method="POST"');
			expect(page).not.toContain("fetch('/v1/teams");
			expect(page).not.toContain('fetch("/v1/teams');
			expect(page).not.toContain('fetch(`/v1/teams');
			expect(page).not.toContain('x-treeseed-service-secret');
		}
	});

	it('adds deployment as a first-class project control surface', () => {
		const nav = source('@treeseed/ui/components/astro/app/controls/ProjectControlNav.astro');
		const page = source('packages/admin/src/pages/app/projects/[projectId]/deploy.astro');
		const newProject = source('packages/admin/src/pages/app/projects/new.astro');
		const timeline = source('@treeseed/ui/components/astro/app/operations/DeploymentTimeline.astro');
		const helper = source('@treeseed/ui/lib/app/deployment-action-status');
		const deploymentStatusPage = source('packages/admin/src/pages/app/projects/deployment/[id].astro');
		const deploymentVm = source('packages/admin/src/view-models/deployment.vm.ts');
		const apiClient = source('packages/admin/src/lib/market/api-client.ts');
		const styles = source('packages/ui/src/styles/operations.css');
		const deployIndex = nav.indexOf("label: 'Deploy'");
		expect(nav).not.toContain("label: 'Hosts'");
		expect(nav).toContain("label: 'Overview'");
		expect(deployIndex).toBeLessThan(nav.indexOf("label: 'Guidance'"));
		expect(nav).toContain("current: 'overview' | 'settings' | 'hosts' | 'deploy'");
		expect(page).toContain('buildProjectDeploymentState');
		expect(page).toContain('buildDeploymentViewModel');
		expect(page).toContain('fallbackState');
		expect(page).toContain('deployment_state_unavailable');
		expect(page).toContain('resolveAppProject');
		expect(page).toContain('persistActiveTeamSelection');
		expect(page).toContain('deployment-state');
		expect(page).toContain('Deployment readiness checklist');
		expect(page).toContain('ts-deploy-check-title');
		expect(page).toContain('ts-info-popover__trigger');
		expect(page).toContain('What ${check.label} means');
		expect(page).toContain('role="tooltip"');
		expect(page).toContain('Launch recovery actions');
		expect(page).not.toContain('name="sensitivePassphrase"');
		expect(page).toContain('initializeProjectDeployPage');
		expect(page).toContain("document.addEventListener('astro:page-load', initializeProjectDeployPage)");
		expect(page).toContain('Setup attention');
		expect(page).toContain('data-deploy-tabs-root');
		expect(page).toContain('role="tablist"');
		expect(page).toContain('data-deploy-tab="overview"');
		expect(page).toContain('overviewAttentionCount');
		expect(page).toContain('overview item');
		expect(page).toContain('data-deploy-tab="environments"');
		expect(page).toContain('data-deploy-tab="activity"');
		expect(page).toContain('deployment timeline event');
		expect(page).toContain('data-deploy-tab="history"');
		expect(page).toContain('deployment record');
		expect(page).toContain('data-deploy-panel="overview"');
		expect(page).toContain('data-deploy-panel="history"');
		expect(page).toContain('data-next-action');
		expect(page).toContain('Staging and production');
		expect(page).toContain('Active operation timeline');
		expect(page).toContain('Deployment history');
		expect(page).toContain('Recent failure context');
		expect(page).toContain('separate from the readiness checklist above');
		expect(page).toContain('Deployment support hints');
		expect(page).toContain('monitor checks');
		expect(page).toContain('ts-deploy-command-surface');
		expect(page).toContain('ts-deploy-signal-grid');
		expect(page).toContain('ts-deploy-blocker-list');
		expect(page).toContain('ts-deploy-attention-list');
		expect(page).toContain('uniqueReadinessBlockers');
		expect(page).toContain('StatusPill tone="danger" label="Blocked"');
		expect(page).toContain('ts-deploy-monitor-checks');
		expect(page).toContain('aria-live="polite"');
		expect(page).toContain('confirmProduction');
		expect(page).toContain('submitDeploymentActionForm');
		expect(page).toContain('watchDeploymentState');
		expect(page).toContain('data-launch-recovery-action');
		expect(page).toContain("['ArrowLeft', 'ArrowRight', 'Home', 'End']");
		expect(newProject).toContain('/app/projects/deployment/');
		expect(newProject).not.toContain('treeseed:project-launch:');
		expect(newProject).not.toContain('/app/projects/launch-status?request=');
		expect(timeline).toContain('<ol class="ts-deploy-timeline"');
		expect(timeline).toContain('StatusPill');
		expect(timeline).toContain('data-tone={item.tone}');
		expect(helper).toContain("source: 'market_ui'");
		expect(helper).toContain('sensitivePassphrase');
		expect(helper).toContain('intervalMs?: number');
		const projectsIndex = source('packages/admin/src/pages/app/projects/index.astro');
		expect(projectsIndex).toContain('/deploy">Deploy</a>');
		expect(projectsIndex).not.toContain('/app/projects/deployment/${encodeURIComponent(latestDeployment.id)}');
		expect(apiClient).toContain('listProjectDeployments');
		expect(apiClient).toContain('listProjectDeploymentEvents');
		expect(deploymentVm).toContain('const seen = new Set<string>();');
		expect(deploymentVm).toContain('function readinessHelp');
		expect(deploymentVm).toContain('no_active_operation');
		expect(deploymentVm).toContain('Prevents overlapping deployment work');
		expect(deploymentVm).toContain('pushHint');
		expect(deploymentVm).toContain('Project launch failed');
		expect(deploymentVm).toContain('deployment ${titleCase');
		expect(deploymentVm).toContain('hints.slice(0, 3)');
		expect(styles).toContain('.ts-deploy-command-surface');
		expect(styles).toContain('.ts-deploy-signal');
		expect(styles).toContain('.ts-info-popover__content');
		expect(styles).toContain('.ts-info-popover:focus-within .ts-info-popover__content');
		expect(styles).toContain('.ts-deploy-tab-panel[hidden]');
		expect(styles).not.toContain(".ts-tab[data-tone='danger']");
		expect(styles).not.toContain(".ts-tab[data-tone='warning']");
		expect(styles).toContain('.ts-deploy-blocker-list');
		expect(styles).toContain('.ts-deploy-attention-list');
		expect(styles).toContain('.ts-deploy-support-group');
		expect(styles).toContain(".ts-deploy-timeline__item[data-tone='danger']");
		expect(styles).toContain(".ts-deploy-signal[data-tone='danger']");
		expect(styles).toContain(".ts-deploy-signal[data-tone='warning']");
		expect(styles).toContain(".ts-deployment-status-page[data-status='failed'] .ts-launch-console");
		expect(styles).toContain(".ts-launch-audit li[data-state='failed']");
		expect(styles).toContain(".ts-launch-log-section li[data-state='failed']");
		expect(styles).toContain(".ts-deploy-environment[data-tone='danger'] {\n\tbackground: var(--ts-color-surface);");
		expect(styles).toContain(".ts-deployment-status-page[data-status='cancelled'] .ts-launch-console {\n\tbackground: var(--ts-color-surface);");
		expect(styles).toContain(".ts-launch-log-section[data-state='failed'] {\n\tborder-color: var(--ts-color-danger-border);\n\tbackground: var(--ts-color-surface);");
		expect(styles).toContain('.ts-deploy-command-surface h1 {\n\tfont-size: 2.55rem;');
		expect(styles).toContain('grid-template-columns: repeat(6, minmax(0, 1fr));');
		expect(styles).not.toContain('linear-gradient(135deg, color-mix(in srgb, var(--ts-deploy-accent-soft)');
		expect(styles).not.toContain('font-size: clamp(2rem, 3vw, 3.1rem);');
		for (const path of [
			'packages/admin/src/pages/app/projects/[projectId]/deploy.astro',
			'packages/admin/src/pages/app/projects/[projectId]/hosts.astro',
			'packages/admin/src/pages/app/projects/[projectId]/settings.astro',
		]) {
			const contents = source(path);
			expect(contents).toContain('resolveAppProject');
			expect(contents).toContain('persistActiveTeamSelection');
			expect(contents).not.toContain('context.projects.find((project');
		}
		expect(deploymentStatusPage).toContain('resolveAppDeployment');
		expect(deploymentStatusPage).not.toContain('?teamId=');
		expect(deploymentStatusPage).not.toContain('teamQuery');
		expect(deploymentStatusPage).toContain('Open deployment overview');
		expect(deploymentStatusPage).toContain('/deploy');
		expect(deploymentStatusPage).toContain('data-status="loading"');
		expect(deploymentStatusPage).toContain('page.dataset.status = status');
		expect(deploymentStatusPage).toContain('details.dataset.state = hasFailure');
		expect(deploymentStatusPage).toContain('item.dataset.state = event.status');
		for (const contents of [page, timeline, helper]) {
			for (const forbidden of ['capacityProviderId', 'laneId', 'grantId', 'workerPoolId', 'runtimeHostId', 'railwayServiceId', 'runnerToken']) {
				expect(contents).not.toContain(forbidden);
			}
		}
	});

	it('keeps hosted web deployment templates out of capacity-provider runtime secrets', () => {
		for (const path of [
			'packages/sdk/templates/github/hosted-project.workflow.yml',
			'packages/sdk/templates/github/deploy-web.workflow.yml',
			'packages/core/templates/github/hosted-project.workflow.yml',
			'packages/core/templates/github/deploy-web.workflow.yml',
		]) {
			const contents = source(path);
			expect(contents).toContain('deploy_web');
			expect(contents).toContain('publish_content');
			expect(contents).toContain('monitor');
			for (const forbidden of ['capacityProviderId', 'runnerToken', 'RAILWAY_API_TOKEN', 'TREESEED_RAILWAY_PROJECT_ID', 'WORKER_POOL', 'CAPACITY_PROVIDER']) {
				expect(contents, path).not.toContain(forbidden);
			}
		}
	});

	it('documents Phase 8 web deployment release readiness without legacy runner commands', () => {
		const packageJson = JSON.parse(source('package.json'));
		const deploymentDocs = source('docs/project-web-deployment.md');
		const demo = source('docs/demo.md');
		const uiSpec = source('docs/market_ui_spec.md');
		const purpose = source('docs/purpose.md');
		const plan = source('docs/web-ui-deployment.md');
		const releaseNotes = source('docs/web-deployment-release-notes.md');
		const acceptanceSpec = source('test/acceptance/api.base.yaml');
		const stableRunnerCommand = 'npm -w packages/api run dev:runner -- --market local --once --operation project:web_deployment --mock-external';

		expect(packageJson.scripts['market:operations-runner']).toBeUndefined();
		expect(packageJson.dependencies?.['@treeseed/api']).toBeUndefined();
		for (const contents of [deploymentDocs, demo, plan, releaseNotes]) {
			expect(contents).toContain(stableRunnerCommand);
			expect(contents).not.toContain('npx trsd market:operations-runner');
		}
		expect(deploymentDocs).toContain('project:web_deployment');
		expect(deploymentDocs).toContain('Security And Audit');
		expect(demo).toContain('Deploy staging');
		expect(demo).toContain('Inspect deployment history and events');
		expect(uiSpec).toContain('/app/projects/:projectId/deploy');
		expect(uiSpec).toContain('Project Deploy');
		expect(purpose).toContain('/app/projects/:projectId/deploy');
		expect(releaseNotes).toContain('Deferred External Proof');
		expect(acceptanceSpec).toContain('deployment-flow.mocked-web-deployment');
		expect(plan).toContain('* [x] Acceptance flow passes with mocked external providers.');
		expect(plan).toContain('* [ ] One real external staging deploy is verified. Deferred blocker:');
		for (const contents of [deploymentDocs, demo, uiSpec, purpose, releaseNotes]) {
			for (const forbidden of ['capacityProviderId', 'laneId', 'grantId', 'workerPoolId', 'runtimeHostId', 'railwayServiceId', 'runnerToken']) {
				expect(contents, forbidden).not.toContain(`${forbidden}:`);
			}
		}
	});

	it('uses the Phase 8 service readiness and capacity provider lifecycle UI', () => {
		const start = source('packages/admin/src/pages/app/index.astro');
		const services = source('packages/admin/src/pages/app/services.astro');
		const redirect = source('packages/admin/src/pages/app/capacity/index.astro');
		const dashboard = source('packages/admin/src/pages/app/capacity/providers/index.astro');
		const detail = source('packages/admin/src/pages/app/capacity/providers/[providerId].astro');
		const create = source('packages/admin/src/pages/app/capacity/providers/new.astro');
		const settings = source('packages/admin/src/pages/app/capacity/providers/[providerId]/settings.astro');
		const keys = source('packages/admin/src/pages/app/capacity/providers/[providerId]/keys.astro');
		const workdays = source('packages/admin/src/pages/app/projects/[projectId]/workdays.astro');
		const workdayDetail = source('packages/admin/src/pages/app/projects/[projectId]/workdays/[workdayId].astro');
		const apiClient = source('packages/admin/src/lib/market/api-client.ts');
		const hostPicker = source('packages/admin/src/pages/app/hosts/new.astro');
		const hostCreate = source('packages/admin/src/pages/app/hosts/[hostType]/new.astro');
		const infrastructureProjection = source('packages/admin/src/lib/market/infrastructure-projection.ts');
		const deletedRoutes = [
			'packages/admin/src/pages/app/capacity/providers/[providerId]/lanes.astro',
			'packages/admin/src/pages/app/capacity/grants/index.astro',
			'packages/admin/src/pages/app/capacity/grants/new.astro',
			'packages/admin/src/pages/app/capacity/grants/[grantId]/edit.astro',
		];

		expect(redirect).toContain("Astro.redirect('/app/capacity/allocation')");
		expect(services).toContain('DashboardTemplate');
		expect(services).toContain('ReadinessSummary');
		expect(services).toContain('buildServicesDashboard');
		expect(start).toContain('DashboardTemplate');
		expect(source('packages/admin/src/view-models/contextual-dashboard.vm.ts')).toContain('/app/capacity/providers');
		expect(start).not.toMatch(/lanes|grants/iu);
		for (const path of deletedRoutes) {
			expect(existsSync(resolve(process.cwd(), path)), path).toBe(false);
		}
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/capacity/providers/[providerId]/edit.astro'))).toBe(false);
		for (const contents of [dashboard, detail, create, settings, keys, infrastructureProjection]) {
			expect(contents).not.toContain('/app/capacity/grants');
			expect(contents).not.toContain('/lanes');
		}
		expect(dashboard).toContain('CollectionTemplate');
		expect(dashboard).toContain('ReadinessSummary');
		expect(dashboard).not.toContain('context.store.listTeamCapacityProviders');
		expect(dashboard).not.toContain('/app/capacity/grants');
		expect(dashboard).not.toContain('Lanes');
		expect(detail).toContain('DetailTemplate');
		expect(detail).toContain('ReadinessSummary');
		expect(detail).toContain('Runtime diagnostics');
		expect(create).toContain('Launch mode');
		expect(create).toContain('TreeSeed derives internal credits');
		expect(create).toContain('Provider creators do not configure TreeSeed credits here.');
		expect(create).toContain('Native unit');
		expect(create).toContain('Reserve buffer percent');
		expect(create).toContain('Connected capacity provider host');
		expect(create).toContain('capacityProviderHostChoice');
		expect(create).toContain('provider-credential-sessions');
		expect(create).toContain('One-time reveal');
		expect(create).toContain('Copy key');
		expect(create).not.toContain('dailyCreditBudget');
		expect(create).not.toContain('monthlyCreditBudget');
		expect(create).not.toContain('Legacy daily credits');
		expect(settings).toContain('SettingsTemplate');
		expect(settings).toContain('Save provider');
		expect(settings).toContain('Broadcast capabilities');
		expect(settings).toContain('Native-derived scheduling mode');
		expect(settings).toContain('Save native capacity');
		expect(settings).toContain('Projected TreeSeed capacity');
		expect(settings).toContain('Portfolio allocation');
		expect(settings).toContain('Save allocation');
		expect(settings).toContain('portfolioAllocationPercent');
		expect(settings).toContain('reservePoolPercent');
		expect(settings).toContain('emergencyOverride');
		expect(settings).toContain('createApiFacade');
		expect(settings).toContain('resolveAppCapacityProvider');
		expect(settings).not.toContain('context.store.listTeamCapacityProviders');
		expect(settings).not.toContain('/app/capacity/grants');
		expect(settings).toContain('Deployment status');
		expect(settings).toContain('Deploy provider');
		expect(settings).toContain('capacityProviderHost');
		expect(settings).toContain('self-hosting');
		expect(settings).not.toContain('Select name="provider"');
		expect(workdays).toContain('loadProjectWorkdayCollection');
		expect(workdays).toContain('CollectionTemplate');
		expect(workdays).not.toContain('context.store');
		expect(workdayDetail).toContain('loadProjectWorkdayWorkspace');
		expect(workdayDetail).toContain('WorkspaceTemplate');
		expect(workdayDetail).not.toContain('context.store');
		for (const method of ['updateCapacityProvider', 'listCapacityGrants', 'createCapacityGrant', 'updateCapacityGrant', 'createExecutionProvider', 'updateExecutionProvider', 'createExecutionProviderNativeLimit']) {
			expect(apiClient).toContain(method);
		}
		expect(keys).toContain('Rotate API key');
		expect(keys).toContain('Copy key');
		expect(keys).toContain('Restart the capacity provider');
		expect(keys).toContain('resolveAppCapacityProvider');
		expect(keys).not.toContain('context.store');
		expect(keys).not.toContain('Reset failed');
		expect(keys).not.toContain('/api-keys/reset');
		expect(keys).not.toContain('/revoke');
		expect(hostPicker).toContain('Capacity provider');
		expect(hostPicker).toContain('/app/hosts/capacity-provider/new');
		expect(hostPicker).not.toContain('Create processing host');
		expect(hostCreate).toContain('capacity-provider');
		expect(hostCreate).toContain('Root domain');
		expect(hostCreate).not.toContain('Cloudflare zone ID');
	});

	it('uses project-first host setup and operational host inventory', () => {
		const hosts = source('packages/admin/src/pages/app/hosts/index.astro');
		const hostDetail = source('packages/admin/src/pages/app/hosts/[hostType]/[hostId].astro');
		const hostPicker = source('packages/admin/src/pages/app/hosts/new.astro');
		const hostCreate = source('packages/admin/src/pages/app/hosts/[hostType]/new.astro');
		const hostSettings = source('packages/admin/src/pages/app/hosts/[hostType]/[hostId]/settings.astro');
		const adminFormClient = source('packages/admin/src/lib/market/admin-form-client.ts');
		const deleteModal = source('@treeseed/ui/components/astro/app/controls/DeleteConfirmationModal.astro');
		const appLayout = source('packages/admin/src/layouts/TreeseedAppLayout.astro');
		const coreButton = source('@treeseed/ui/components/astro/forms/Button.astro');
		const coreSelect = source('@treeseed/ui/components/astro/forms/Select.astro');
		const styles = source('packages/ui/src/styles/app-controls.css');
		const formStyles = source('packages/ui/src/styles/forms.css');
		const projectCreate = source('packages/admin/src/pages/app/projects/new.astro');
		const projectSettings = source('packages/admin/src/pages/app/projects/[projectId]/settings.astro');
		const projectHosts = source('packages/admin/src/pages/app/projects/[projectId]/hosts.astro');
		const helper = source('packages/admin/src/lib/market/control-ui.ts');
		const hostCredentialClient = source('packages/admin/src/lib/market/host-credential-form-client.ts');
		const hostPermissionNote = source('@treeseed/ui/components/astro/app/controls/HostCredentialPermissionNote.astro');
		const providerLaunch = source('packages/sdk/src/operations/services/hub-provider-launch.ts');

		expect(hosts).toContain('CollectionTemplate');
		expect(hosts).toContain('ReadinessSummary');
		expect(hosts).toContain('buildHostCollection');
		expect(hostDetail).toContain('DetailTemplate');
		expect(hostDetail).toContain('ReadinessSummary');
		expect(hostSettings).toContain('SettingsTemplate');
		expect(hostSettings).toContain('resolveAppHost');
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/hosts/[hostType]/[hostId]/edit.astro'))).toBe(false);
		expect(hosts).not.toContain('Use in project');
		expect(hostSettings).toContain('normalizeRequestedHostType');
		expect(hostSettings).toContain("normalized === 'smtp'");
		expect(hostSettings).toContain('resolveAppHost');
		expect(hostSettings).toContain('routeHostTypeFor');
		expect(hostSettings).toContain('hostTypeLabel(hostType)');
		expect(hostSettings).toContain('const editTitle = `${hostTypeName} host settings`');
		expect(hostSettings).toContain('title={editTitle}');
		expect(hostSettings).toContain('bindHostEditCredentialForm');
		expect(hostCredentialClient).toContain('bindAdministrativeForm');
		expect(hostCredentialClient).toContain('preserveServerValues: true');
		expect(hostCredentialClient).toContain('hostCredentialFieldNames');
		expect(hostCredentialClient).toContain('requiredHostCredentialFields');
		expect(hostCredentialClient).toContain('hostCredentialConfig');
		expect(hostCredentialClient).toContain('stopImmediatePropagation');
		expect(hostCredentialClient).toContain('BINDING_VERSION');
		expect(hostCredentialClient).toContain('cloneNode(true)');
		expect(hostSettings).toContain('data-admin-preserve-values');
		expect(hostSettings).toContain('autocomplete="off"');
		expect(hostSettings).toContain('treeseedDeleteConfirmation');
		expect(hostSettings).toContain('requiredText: confirmation');
		expect(hostSettings).toContain('Delete cancelled.');
		expect(hostSettings).toContain('Back to host');
		expect(hostSettings).toContain('Root domain');
		expect(hostSettings).not.toContain('Cloudflare zone ID');
		expect(hostSettings).toContain('Saved value configured. Type a new value to replace it.');
		expect(hostSettings).toContain('Saved secret configured. Type a new secret to replace it.');
		expect(hostCreate).toContain('HostCredentialPermissionNote');
		expect(hostSettings).toContain('HostCredentialPermissionNote');
		expect(projectCreate).toContain('HostCredentialPermissionNote');
		expect(hostPermissionNote).toContain('repository:');
		expect(hostPermissionNote).toContain('web:');
		expect(hostPermissionNote).toContain('email:');
		expect(hostPermissionNote).toContain("'capacity-provider':");
		expect(hostPermissionNote).toContain('ai:');
		for (const permission of ['GitHub token permissions', 'Cloudflare API token permissions', 'SMTP credential requirements', 'Railway API token permissions', 'AI provider key requirements']) {
			expect(hostPermissionNote).toContain(permission);
		}
		expect(hostSettings).not.toContain("hostTypeFor(host) !== hostType) host = null");
		expect(hostPicker).toContain('Create a host by workflow');
		expect(hostPicker).toContain('Project creation');
		expect(hostCreate).toContain('hostTypeLabel(hostType)');
		expect(hostCreate).toContain('const title = `Create ${hostTypeName} host`');
		expect(hostCreate).toContain('bindHostCreateCredentialForm');
		expect(hostCreate).toContain('treeseedInitHostCreateForm');
		expect(adminFormClient).toContain('protectAdministrativeFormValues');
		expect(adminFormClient).toContain('submitAdministrativeJson');
		expect(adminFormClient).toContain('data-lpignore');
		expect(deleteModal).toContain('data-delete-confirmation-modal');
		expect(deleteModal).toContain('treeseedDeleteConfirmation');
		expect(deleteModal).toContain('requiredText');
		expect(deleteModal).toContain('confirm: open');
		expect(appLayout).toContain('DeleteConfirmationModal');
		expect(appLayout).toContain('slot="modal"');
		expect(projectCreate).toContain('Project web address');
		expect(projectCreate.indexOf('Production domain')).toBeGreaterThan(projectCreate.indexOf('Project web address'));
		expect(projectCreate.indexOf('Production domain')).toBeLessThan(projectCreate.indexOf('Core objective'));
		expect(projectCreate).toContain('data-domain-fields hidden');
		expect(projectCreate).toContain('ReadinessSummary');
		expect(projectCreate).toContain('loadServiceInventory');
		expect(projectCreate).toContain('buildServicesDashboard');
		expect(projectCreate).toContain('syncDomainDefaults');
		expect(projectCreate).toContain('syncDomainInput');
		expect(projectCreate).toContain('input.disabled = !hasRootDomain');
		expect(projectCreate).toContain('domainFields.hidden = !hasRootDomain');
		expect(projectCreate).toContain('treeseedInitProjectLaunchForm');
		expect(projectCreate).toContain('data-astro-rerun');
		expect(projectCreate).toContain("host.provider === 'smtp'");
		expect(projectCreate).toContain("host.provider === 'cloudflare'");
		expect(projectCreate).toContain('syncSensitiveNotice');
		expect(projectCreate).toContain('validatedLaunchUnlock');
		expect(projectCreate).toContain('validateSelectedCredentialPassphrase');
		expect(projectCreate).toContain('unlockSensitiveDataForLaunch');
		expect(projectCreate).toContain('selectedCredentialSignature');
		expect(projectCreate).toContain('treeseed:sensitive-unlock-change');
		expect(projectCreate).toContain('ts-form-note--warning');
		expect(projectCreate).toContain('data-launch-sensitive-unlock');
		expect(projectCreate).toContain('data-project-launch-submit');
		expect(projectCreate).toContain('data-project-launch-submit-wrap');
		expect(projectCreate).toContain('ts-project-launch-actions');
		expect(projectCreate).toContain('launchSubmitButton.disabled = blocked');
		expect(projectCreate).toContain("launchSubmitButton.title = blocked ? 'Unlock sensitive data before creating this project.' : ''");
		expect(projectCreate).toContain('launchSubmitWrap.title');
		expect(projectCreate).toContain('openSensitiveUnlock');
		expect(coreButton).toContain('...buttonAttributes');
		expect(coreSelect).toContain('...selectAttributes');
		expect(styles).toContain('.ts-launch-sensitive-notice [data-launch-sensitive-unlock]');
		expect(styles).toContain('justify-self: center');
		expect(styles).toContain('.ts-project-launch-actions .ts-button');
		expect(styles).toContain('height: 2.5rem');
		expect(projectCreate).toContain('rootDomain: hostRootDomain(host)');
		expect(projectCreate).toContain('selectedOptions?.[0]?.dataset?.rootDomain');
		expect(projectCreate).toContain("metadataType === 'web_host'");
		expect(projectCreate).toContain("host?.metadata?.webRootDomain");
		expect(projectCreate).toContain("|| 'example.com'");
		expect(projectCreate).toContain('syncDomainInput(productionDomainInput, `${slug}.${activeZone}`)');
		expect(projectCreate).toContain('syncDomainInput(stagingDomainInput, `${slug}-staging.${activeZone}`)');
		expect(projectCreate).not.toContain('data-domain-zone-name');
		expect(projectCreate).not.toContain('data-domain-zone-id');
		expect(projectCreate).not.toContain('Cloudflare zone ID');
		expect(projectCreate).not.toContain('Cloudflare root zone');
		expect(projectCreate).toContain('The readable name people see in TreeSeed');
		expect(projectCreate).toContain('The short lowercase address used in project links');
		expect(projectCreate).toContain('Core objective');
		expect(projectCreate).toContain('name="coreObjective"');
		expect(projectCreate).toContain('data-rich-markdown-editor');
		expect(projectCreate).toContain('initializeRichMarkdownEditors');
		expect(projectCreate).toContain("@treeseed/ui/react");
		expect(projectCreate).not.toContain('core-objective-mdx-editor.tsx');
		expect(projectCreate).toContain("coreObjective: value(formData, 'coreObjective')");
		expect(projectCreate).toContain('src/content/objectives/core.md');
		expect(projectCreate).not.toContain('label="Handle"');
		expect(projectCreate).not.toContain('label="Purpose"');
		expect(projectCreate).not.toContain('name="summary" rows={4}');
		const coreObjectiveEditor = source('packages/ui/src/react/editors/RichMarkdownEditor.tsx');
		for (const plugin of [
			'diffSourcePlugin',
			'DiffSourceToggleWrapper',
			'codeBlockPlugin',
			'codeMirrorPlugin',
			'tablePlugin',
			'imagePlugin',
			'jsxPlugin',
		]) {
			expect(coreObjectiveEditor).toContain(plugin);
		}
		expect(coreObjectiveEditor).not.toContain('imageUploadHandler');
		expect(coreObjectiveEditor).not.toContain('/api/mdx-editor/images');
		expect(coreObjectiveEditor).not.toContain('InsertFrontmatter');
		expect(coreObjectiveEditor).not.toContain('InsertAdmonition');
		expect(projectSettings).toContain('Project web address');
		expect(projectSettings).toContain('name="coreObjective"');
		expect(projectSettings).toContain('data-rich-markdown-editor');
		expect(projectSettings).toContain('initializeRichMarkdownEditors');
		expect(projectSettings).toContain("@treeseed/ui/react");
		expect(projectSettings).not.toContain('core-objective-mdx-editor.tsx');
		expect(projectSettings).toContain('initializeSettingsCoreObjectiveEditor');
		expect(projectSettings).toContain('pollCoreObjectiveJob');
		expect(projectSettings).toContain('coreObjectiveJob');
		expect(projectSettings).not.toContain('<script is:inline');
		expect(projectSettings).toContain('Template and providers');
		expect(projectSettings).toContain('ts-project-lineage-grid');
		expect(projectSettings).toContain('Manage team hosts from the Hosts administration area');
		expect(projectSettings).toContain('coreObjective: String(data.get');
		expect(projectSettings).not.toContain('label="Handle"');
		expect(projectCreate).toContain('Choose project template');
		expect(projectCreate).toContain('listMarketplaceSiteTemplates');
		expect(projectCreate).toContain('activeStarterTemplateIds');
		expect(projectCreate).toContain("'research'");
		expect(projectCreate).toContain("'engineering'");
		expect(projectCreate).toContain("'information-hub'");
		expect(projectCreate).not.toContain("'market-control-plane'");
		expect(projectCreate).not.toContain('TreeSeed Core Starter');
		expect(projectCreate).toContain('templateSlug');
		expect(projectCreate).toContain('data-template-search');
		expect(projectCreate).toContain('name="sourceRef"');
		expect(projectCreate).toContain('value="" data-template-source-ref');
		expect(projectCreate).toContain('type="radio" name="templateSlug" value={sourceRef} required');
		expect(projectCreate).toContain("sourceRef: selectedSourceRef");
		expect(projectCreate).toContain('const hostBindings =');
		expect(projectCreate).toContain('hostBindings,');
		expect(projectCreate).toContain("sourceKind: 'template'");
		expect(projectCreate).not.toContain('Knowledge pack import');
		expect(projectCreate).not.toContain("sourceKind: value(formData, 'sourceKind')");
		expect(projectCreate).toContain('Choose project hosts');
		expect(projectCreate).toContain('repositoryHostChoice');
		expect(projectCreate).toContain('cloudflareHostChoice');
		expect(projectCreate).toContain('emailHostChoice');
		expect(projectCreate).toContain('defaultHosts');
		expect(projectCreate).toContain('selectDefaultHost');
		expect(projectCreate).toContain('hostIdFromOptionValue');
		expect(projectCreate).toContain("startsWith('platform:')");
		expect(projectCreate).toContain('Create new GitHub repository host');
		expect(projectCreate).toContain('Create new ${hostKind} host');
		expect(projectCreate).not.toContain('sensitivePassphrase: passphrase');
		expect(projectCreate).toContain('Project launch no longer sends unlock passphrases to the API.');
		expect(projectCreate).not.toContain('provider-credential-sessions');
		expect(projectHosts).toContain('Template host bindings');
		expect(projectHosts).toContain('data-project-host-card');
		expect(projectHosts).toContain('data-host-action="replace"');
		expect(projectHosts).toContain('/hosts/${encodeURIComponent(key)}/${action}');
		expect(helper).toContain('hostDisplayName');
		expect(helper).toContain('hostReadinessSummary');
		expect(helper).toContain("host?.metadata?.hostType === 'web_host'");
		expect(helper).toContain("host?.metadata?.hostType === 'email_host'");
		expect(providerLaunch).toContain("src/content/objectives', 'core.md'");
		expect(providerLaunch).toContain('input.coreObjective');
		expect(styles).toContain('.ts-host-setup-grid');
		expect(formStyles).toContain('.ts-rich-markdown-editor');
		expect(styles).toContain('.ts-project-lineage-card');
		expect(styles).toContain('.ts-default-label');
		expect(styles).toContain('.ts-link-button--primary');
		expect(styles).toContain('min-height: 1.9rem;');
		for (const contents of [hosts, hostPicker, projectCreate, projectHosts]) {
			expect(contents).not.toContain('Untitled record');
		}
	});

	it('represents every work content model in the management interface', () => {
		const nav = source('@treeseed/ui/components/astro/app/controls/WorkContentNav.astro');
		for (const [model, route] of [
			['work', '/app/work'],
			['review', '/app/work/review'],
			['objectives', '/app/work/objectives'],
			['questions', '/app/work/questions'],
			['notes', '/app/work/notes'],
			['proposals', '/app/work/proposals'],
			['decisions', '/app/work/decisions'],
		]) {
			expect(nav).toContain(`key: '${model}'`);
			expect(nav).toContain(`href: '${route}'`);
			const routePath = `packages/admin/src/pages${route}.astro`;
			if (model === 'questions') {
				expect(source(routePath), routePath).toContain('buildQuestionsPageViewModel');
			} else if (model === 'work') {
				expect(source(routePath), routePath).toContain('loadWorkDashboard');
			} else if (model === 'review') {
				expect(source(routePath), routePath).toContain('loadReviewQueue');
			} else {
				expect(source(routePath), routePath).toContain('loadDirectionCollection');
			}
		}
		expect(source('packages/admin/src/view-models/work-content.ts')).toContain("['questions', 'objectives', 'notes', 'proposals', 'decisions']");
		expect(source('packages/admin/src/view-models/work-content.ts')).toContain("'objectives'");
	});

	it('keeps retired dashboard and bundled setup surfaces out of primary app code', () => {
		for (const path of primaryRoutes) {
			const contents = source(path);
			expect(contents, path).not.toContain('MetricGrid');
			expect(contents, path).not.toContain('InfrastructureStatusGrid');
			expect(contents, path).not.toContain('WorkdaySummaryCard');
			expect(contents, path).not.toMatch(/Mission Control|Operational Summary|phase strip|provider console|dashboard maze/iu);
			expect(contents, path).not.toContain('HostControlsPanel');
			expect(contents, path).not.toContain('OrganizationContextPanel');
		}
		expect(existsSync(resolve(process.cwd(), 'packages/ui/src/astro/app/controls/HostControlsPanel.astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'packages/ui/src/astro/app/operations/OrganizationContextPanel.astro'))).toBe(false);
	});

	it('keeps credential forms field-based rather than JSON envelope based', () => {
		const hostCredentialClient = source('packages/admin/src/lib/market/host-credential-form-client.ts');
		for (const path of [
			'packages/admin/src/pages/app/hosts/[hostType]/new.astro',
			'packages/admin/src/pages/app/hosts/[hostType]/[hostId]/settings.astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('host-credential-form-client');
			expect(contents, path).not.toContain('Encrypted provider envelope');
			expect(contents, path).not.toMatch(/placeholder=['"]\{/u);
		}
		const hostCreate = source('packages/admin/src/pages/app/hosts/[hostType]/new.astro');
		const hostSettings = source('packages/admin/src/pages/app/hosts/[hostType]/[hostId]/settings.astro');
		expect(hostCredentialClient).toContain('encryptHostConfig');
		expect(hostCredentialClient).toContain('treeseedSensitiveUnlock');
		expect(hostCredentialClient).toContain('currentSensitivePassphrase');
		expect(hostCredentialClient).toContain('openSensitiveUnlock');
		expect(hostCredentialClient).toContain('promptSensitivePassphrase');
		expect(hostCredentialClient).toContain('promptPassphrase');
		expect(hostCredentialClient).toContain('bindCredentialSubmitGate');
		expect(hostCredentialClient).toContain("addEventListener('submit'");
		expect(hostCredentialClient).toContain('stopImmediatePropagation');
		expect(hostCredentialClient).toContain('String(passphrase)');
		expect(hostCredentialClient).toContain('validateHostCredentialValues');
		expect(hostCredentialClient).toContain('hasHostCredentialValues');
		expect(hostCredentialClient).toContain("if (hostType === 'email') return ['smtpUsername', 'smtpPassword']");
		expect(hostCredentialClient).toContain('emailSmtpMetadata');
		expect(hostCredentialClient).not.toContain("return ['smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword'");
		expect(hostCredentialClient).toContain('leave every credential field blank to keep the saved credentials');
		expect(hostCredentialClient).toContain('host-credential-form-v1');
		expect(hostCreate).toContain('name="smtpSecure"');
		expect(hostCreate).toContain('name="smtpUsername" required');
		expect(hostCreate).toContain('name="smtpPassword" required');
		expect(hostSettings).toContain('name="smtpSecure"');
		expect(hostSettings).toContain('const smtpSettings =');
		expect(hostCreate).not.toContain('data-sensitive-lock');
		expect(hostSettings).not.toContain('data-sensitive-lock');
	});

	it('keeps styling in shared CSS for the control interface', () => {
		const css = source('packages/ui/src/styles/app-controls.css');
		for (const marker of ['.ts-control-page', '.ts-plain-table', '.ts-link-button', '.ts-checkbox-group', 'prefers-reduced-motion', ':focus-visible']) {
			expect(css).toContain(marker);
		}
		expect(css).toContain('select.ts-control');
		expect(css).toContain('appearance: none;');
		expect(css).toContain('linear-gradient(45deg, transparent 50%, currentColor 50%)');
		expect(css).toContain('background-position:');
		expect(css).toContain('background-repeat: no-repeat;');
		expect(css).toContain('padding-right: 2.35rem');
		for (const path of [...primaryRoutes, ...onePurposeRoutes]) {
			const contents = source(path);
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\sstyle=/u);
		}
	});

	it('uses responsive app cards for shared app lists', () => {
		const plainTable = source('@treeseed/ui/components/astro/app/controls/PlainTable.astro');
		expect(plainTable).toContain('ts-record-card');
		expect(plainTable).toContain('data-sort-values');
		expect(plainTable).toContain('data-filter-text');
		expect(plainTable).not.toContain('<table>');
		expect(plainTable).not.toContain('<tr');
		expect(source('src/styles/treeseed.css')).toContain('.ts-record-card__actions');
	});

	it('splits project decisions into proposal governance and immutable decision tabs', () => {
		const decisions = source('packages/admin/src/pages/app/projects/[projectId]/decisions.astro');
		for (const tab of ['proposals', 'voting', 'decisions', 'timeline']) {
			expect(decisions).toContain(`key: '${tab}'`);
			expect(decisions).toContain(`?tab=${tab}`);
		}
		expect(decisions).toContain('Proposal governance');
		expect(decisions).toContain('Active voting');
		expect(decisions).toContain('Immutable decisions');
		expect(decisions).not.toContain(`key: 'review'`);
		expect(decisions).not.toContain('data-proposal-decide');
		expect(decisions).not.toContain('/local-content/decisions/from-proposals');
		const review = source('packages/admin/src/pages/app/work/review.astro');
		expect(review).toContain('loadReviewQueue');
		expect(review).toContain('WorkQueueSummary');
		expect(review).toContain('ActivityTimeline');
	});

	it('makes local content mutation flows platform-operation aware', () => {
		const helper = source('@treeseed/ui/lib/app/platform-operation-status');
		expect(helper).toContain('submitPlatformOperationForm');
		expect(helper).toContain('/v1/platform/operations/');
		expect(helper).toContain('TERMINAL_STATUSES');
		for (const path of [
			'packages/admin/src/components/work/QuestionForm.astro',
			'packages/admin/src/lib/market/operating-loop-client.ts',
			'@treeseed/ui/lib/app/related-content-creator',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('submitPlatformOperationForm');
			expect(contents, path).not.toContain('payload?.payload?.href');
			expect(contents, path).not.toContain('result?.payload?.href');
		}
		for (const path of [
			'packages/admin/src/components/work/DirectionContentForm.astro',
			'packages/admin/src/pages/app/work/objectives/new.astro',
			'packages/admin/src/pages/app/work/notes/new.astro',
			'packages/admin/src/pages/app/work/proposals/new.astro',
			'packages/admin/src/pages/app/work/decisions/new.astro',
			'packages/admin/src/pages/app/projects/[projectId]/agents/new.astro',
			'packages/admin/src/pages/app/projects/[projectId]/agents/[agentSlug].astro',
		]) {
			const contents = source(path);
			expect(contents, path).toMatch(/operating-loop-client|DirectionContentForm|bindAgentContentForm/u);
			expect(contents, path).not.toContain('payload?.payload?.href');
			expect(contents, path).not.toContain('result?.payload?.href');
		}
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/work/[collection]/new.astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/work/[collection]/[slug].astro'))).toBe(false);
	});
});
