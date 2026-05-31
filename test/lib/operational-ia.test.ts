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
	'src/pages/app/projects/[projectId]/deploy.astro',
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

	it('keeps the rail team selector compact without a duplicate divider', () => {
		const styles = source('src/styles/treeseed.css');

		expect(styles).toContain('.ts-team-switcher {\n\tmargin-bottom: 0;\n\tpadding: 0;\n\tborder-top: 0;');
		expect(styles).toContain('grid-template-columns: minmax(0, 1fr) max-content;');
		expect(styles).toContain('.ts-team-selector .ts-icon-button');
		expect(styles).toContain('white-space: nowrap;');
	});

	it('keeps team mutations behind the server-side Market API facade', () => {
		for (const path of [
			'src/pages/app/teams/new.astro',
			'src/pages/app/teams/[teamId]/edit.astro',
			'src/pages/app/teams/[teamId]/delete.astro',
		]) {
			const page = source(path);
			expect(page).toContain('MarketApiClientFacade');
			expect(page).toContain('method="POST"');
			expect(page).not.toContain("fetch('/v1/teams");
			expect(page).not.toContain('fetch("/v1/teams');
			expect(page).not.toContain('fetch(`/v1/teams');
			expect(page).not.toContain('x-treeseed-service-secret');
		}
	});

	it('adds deployment as a first-class project control surface', () => {
		const nav = source('src/components/app/controls/ProjectControlNav.astro');
		const page = source('src/pages/app/projects/[projectId]/deploy.astro');
		const newProject = source('src/pages/app/projects/new.astro');
		const timeline = source('src/components/app/operations/DeploymentTimeline.astro');
		const helper = source('src/components/app/controls/deployment-action-status.ts');
		const deployIndex = nav.indexOf("label: 'Deploy'");
		expect(deployIndex).toBeGreaterThan(nav.indexOf("label: 'Hosts'"));
		expect(deployIndex).toBeLessThan(nav.indexOf("label: 'Guidance'"));
		expect(nav).toContain("current: 'settings' | 'hosts' | 'deploy'");
		expect(page).toContain('buildProjectDeploymentState');
		expect(page).toContain('buildDeploymentViewModel');
		expect(page).toContain('deployment-state');
		expect(page).toContain('Deployment readiness checklist');
		expect(page).toContain('Launch status');
		expect(page).toContain('Launch recovery actions');
		expect(page).toContain('data-next-action');
		expect(page).toContain('Runner diagnostics');
		expect(page).toContain('Staging and production');
		expect(page).toContain('Active operation timeline');
		expect(page).toContain('Deployment history');
		expect(page).toContain('Action blockers and hints');
		expect(page).toContain('monitor checks');
		expect(page).toContain('ts-deploy-monitor-checks');
		expect(page).toContain('aria-live="polite"');
		expect(page).toContain('confirmProduction');
		expect(page).toContain('submitDeploymentActionForm');
		expect(page).toContain('watchDeploymentState');
		expect(page).toContain('submitLaunchRecoveryForm');
		expect(newProject).toContain('payload?.deployHref');
		expect(newProject).toContain('/deploy');
		expect(timeline).toContain('<ol class="ts-deploy-timeline"');
		expect(timeline).toContain('StatusPill');
		expect(helper).toContain("source: 'market_ui'");
		expect(helper).toContain('intervalMs?: number');
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
		const deploymentDocs = source('docs/market-web-deployment.md');
		const demo = source('docs/demo.md');
		const uiSpec = source('docs/market_ui_spec.md');
		const purpose = source('docs/purpose.md');
		const plan = source('docs/web-ui-deployment.md');
		const releaseNotes = source('docs/web-deployment-release-notes.md');
		const acceptanceSpec = source('test/acceptance/market-api.base.yaml');
		const acceptanceHarness = source('scripts/market-acceptance.mjs');
		const stableRunnerCommand = 'npm run market:operations-runner -- --market local --once --operation project:web_deployment --mock-external';

		expect(packageJson.scripts['market:operations-runner']).toBe('node --experimental-transform-types ./src/market-operations-runner/entrypoint.js');
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
		expect(acceptanceHarness).toContain('expandDeploymentFlows');
		expect(acceptanceHarness).toContain('assertNoForbiddenDeploymentOutput');
		expect(plan).toContain('* [x] Acceptance flow passes with mocked external providers.');
		expect(plan).toContain('* [ ] One real external staging deploy is verified. Deferred blocker:');
		for (const contents of [deploymentDocs, demo, uiSpec, purpose, releaseNotes]) {
			for (const forbidden of ['capacityProviderId', 'laneId', 'grantId', 'workerPoolId', 'runtimeHostId', 'railwayServiceId', 'runnerToken']) {
				expect(contents, forbidden).not.toContain(`${forbidden}:`);
			}
		}
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
		expect(dashboard).toContain('Host and deployment');
		expect(dashboard).toContain('Connection');
		expect(dashboard).toContain('Operations');
		expect(dashboard).toContain('Capacity');
		expect(dashboard).toContain('Portfolio allocation');
		expect(dashboard).toContain('Compatibility credits');
		expect(dashboard).toContain('createMarketApiFacade');
		expect(dashboard).not.toContain('context.store.listTeamCapacityProviders');
		expect(dashboard).not.toContain('/app/capacity/grants');
		expect(dashboard).not.toContain('Lanes');
		expect(create).toContain('Launch mode');
		expect(create).toContain('Budget mode');
		expect(create).toContain('Derived from native capacity');
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
		expect(hostCreate).toContain('Root domain');
		expect(hostCreate).not.toContain('Cloudflare zone ID');
	});

	it('uses project-first host setup and operational host inventory', () => {
		const hosts = source('src/pages/app/hosts/index.astro');
		const hostPicker = source('src/pages/app/hosts/new.astro');
		const hostCreate = source('src/pages/app/hosts/[hostType]/new.astro');
		const hostEdit = source('src/pages/app/hosts/[hostType]/[hostId]/edit.astro');
		const adminFormClient = source('src/lib/market/admin-form-client.ts');
		const deleteModal = source('src/components/app/controls/DeleteConfirmationModal.astro');
		const appLayout = source('src/layouts/TreeseedAppLayout.astro');
		const coreButton = source('packages/core/src/components/ui/forms/Button.astro');
		const coreSelect = source('packages/core/src/components/ui/forms/Select.astro');
		const styles = source('src/styles/treeseed.css');
		const projectCreate = source('src/pages/app/projects/new.astro');
		const projectSettings = source('src/pages/app/projects/[projectId]/settings.astro');
		const projectHosts = source('src/pages/app/projects/[projectId]/hosts.astro');
		const helper = source('src/lib/market/control-ui.ts');
		const hostCredentialClient = source('src/lib/market/host-credential-form-client.ts');
		const api = source('src/api/app.js');
		const providerLaunch = source('packages/sdk/src/operations/services/hub-provider-launch.ts');

		expect(hosts).toContain('Operational host inventory');
		for (const label of ['Repository hosts', 'Web hosts', 'Email hosts', 'Capacity provider hosts', 'AI hosts']) {
			expect(hosts).toContain(label);
		}
		expect(hosts).toContain('hostRecordNameHtml');
		expect(hosts).toContain("(host._hostType ? host._hostType === type : hostTypeFor(host) === type)");
		expect(hosts).toContain('defaultHosts');
		expect(hosts).toContain('data-default-host-button');
		expect(hosts).toContain('Set as default');
		expect(hosts).toContain('Default</span>');
		expect(hosts).toContain('ts-link-button--primary');
		expect(hosts).toContain('/v1/teams/${encodeURIComponent(hostDefaultsPageData.teamId)}');
		expect(hosts).not.toContain('Use in project');
		expect(hostEdit).toContain('normalizeRequestedHostType');
		expect(hostEdit).toContain("normalized === 'smtp'");
		expect(hostEdit).toContain('listTeamWebHosts(team.id)');
		expect(hostEdit).toContain('routeHostTypeFor');
		expect(hostEdit).toContain('hostTypeLabel(hostType)');
		expect(hostEdit).toContain('const editTitle = `Edit ${hostTypeName} host`');
		expect(hostEdit).toContain('title={editTitle}');
		expect(hostEdit).toContain('bindHostEditCredentialForm');
		expect(hostCredentialClient).toContain('bindAdministrativeForm');
		expect(hostCredentialClient).toContain('preserveServerValues: true');
		expect(hostCredentialClient).toContain('hostCredentialFieldNames');
		expect(hostCredentialClient).toContain('requiredHostCredentialFields');
		expect(hostCredentialClient).toContain('hostCredentialConfig');
		expect(hostCredentialClient).toContain('stopImmediatePropagation');
		expect(hostCredentialClient).toContain('BINDING_VERSION');
		expect(hostCredentialClient).toContain('cloneNode(true)');
		expect(hostEdit).toContain('data-admin-preserve-values');
		expect(hostEdit).toContain('autocomplete="off"');
		expect(hostEdit).toContain('treeseedDeleteConfirmation');
		expect(hostEdit).toContain('requiredText: confirmation');
		expect(hostEdit).toContain('Delete cancelled.');
		expect(hostEdit).toContain('Back to hosts');
		expect(hostEdit).toContain('Root domain');
		expect(hostEdit).not.toContain('Cloudflare zone ID');
		expect(hostEdit).toContain('Saved value configured. Type a new value to replace it.');
		expect(hostEdit).toContain('Saved secret configured. Type a new secret to replace it.');
		expect(hostEdit).not.toContain("hostTypeFor(host) !== hostType) host = null");
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
		expect(projectCreate).toContain('validateSelectedCredentialSessions');
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
		expect(projectCreate).toContain('data-core-objective-editor');
		expect(projectCreate).toContain('core-objective-mdx-editor.tsx');
		expect(projectCreate).toContain("coreObjective: value(formData, 'coreObjective')");
		expect(projectCreate).toContain('src/content/objectives/core.md');
		expect(projectCreate).not.toContain('label="Handle"');
		expect(projectCreate).not.toContain('label="Purpose"');
		expect(projectCreate).not.toContain('name="summary" rows={4}');
		const coreObjectiveEditor = source('src/components/app/controls/core-objective-mdx-editor.tsx');
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
		expect(projectSettings).not.toContain('label="Handle"');
		expect(projectCreate).toContain('Choose project template');
		expect(projectCreate).toContain('TreeSeed Core Starter');
		expect(projectCreate).toContain('templateSlug');
		expect(projectCreate).toContain('data-template-search');
		expect(projectCreate).toContain("sourceRef: value(formData, 'sourceRef') || 'starter-basic'");
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
		expect(projectCreate).toContain('provider-credential-sessions');
		expect(projectHosts).toContain('Configured host choices');
		expect(projectHosts).toContain('Deployment and runtime hosts');
		expect(helper).toContain('hostDisplayName');
		expect(helper).toContain('hostReadinessSummary');
		expect(helper).toContain("host?.metadata?.hostType === 'web_host'");
		expect(helper).toContain("host?.metadata?.hostType === 'email_host'");
		expect(api).toContain('requestedCoreObjective');
		expect(providerLaunch).toContain("src/content/objectives', 'core.md'");
		expect(providerLaunch).toContain('input.coreObjective');
		expect(styles).toContain('.ts-host-setup-grid');
		expect(styles).toContain('.ts-core-objective-editor');
		expect(styles).toContain('.ts-default-label');
		expect(styles).toContain('.ts-link-button--primary');
		expect(styles).toContain('min-height: 1.9rem;');
		for (const contents of [hosts, hostPicker, projectCreate, projectHosts]) {
			expect(contents).not.toContain('Untitled record');
		}
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
		const hostCredentialClient = source('src/lib/market/host-credential-form-client.ts');
		for (const path of [
			'src/pages/app/hosts/[hostType]/new.astro',
			'src/pages/app/hosts/[hostType]/[hostId]/edit.astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('host-credential-form-client');
			expect(contents, path).not.toContain('Encrypted provider envelope');
			expect(contents, path).not.toMatch(/placeholder=['"]\{/u);
		}
		const hostCreate = source('src/pages/app/hosts/[hostType]/new.astro');
		const hostEdit = source('src/pages/app/hosts/[hostType]/[hostId]/edit.astro');
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
		expect(hostEdit).toContain('name="smtpSecure"');
		expect(hostEdit).toContain('const smtpSettings =');
		expect(hostCreate).not.toContain('data-sensitive-lock');
		expect(hostEdit).not.toContain('data-sensitive-lock');
		const api = source('src/api/app.js');
		expect(api).toContain('rejectPlaintextHostCredentialFields');
		expect(api).toContain("if (hostKind === 'email_host')");
		expect(api).toContain("SMTP_HOST: smtp.host.trim()");
		expect(api).not.toContain("'smtpHost',");
		expect(api).not.toContain("'SMTP_HOST',");
	});

	it('keeps styling in shared CSS for the control interface', () => {
		const css = source('src/styles/treeseed.css');
		for (const marker of ['.ts-control-page', '.ts-plain-table', '.ts-link-button', '.ts-checkbox-group', 'prefers-reduced-motion', ':focus-visible']) {
			expect(css).toContain(marker);
		}
		expect(css).toContain('select.ts-control');
		expect(css).toContain('background-image:');
		expect(css).toContain('padding-right: 2.5rem');
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
