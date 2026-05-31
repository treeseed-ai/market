import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(path, 'utf8');
}

describe('project launch deployment pipeline contracts', () => {
	it('runs hub launch operations with the runner-provided environment overlay', () => {
		const provider = source('packages/sdk/src/operations/providers/default.ts');
		expect(provider).toContain('withTemporaryProcessEnv(contextEnv(context), () => executeKnowledgeHubLaunch');
	});

	it('writes selected project domains into generated Cloudflare web environment config', () => {
		const launch = source('packages/sdk/src/operations/services/hub-provider-launch.ts');
		expect(launch).toContain('productionDomain = String(input.domains?.productionDomain');
		expect(launch).toContain('stagingDomain = String(input.domains?.stagingDomain');
		expect(launch).toContain('prod: { ...(config.surfaces?.web?.environments?.prod ?? {}), domain: productionDomain');
		expect(launch).toContain('staging: { ...(config.surfaces?.web?.environments?.staging ?? {}), domain: stagingDomain');
	});

	it('lets inline Cloudflare hosts define the root domain used by project domain defaults', () => {
		const projectCreate = source('src/pages/app/projects/new.astro');
		expect(projectCreate).toContain('name="webNewRootDomain"');
		expect(projectCreate).toContain("return normalizeDomain(webNewRootDomainInput?.value ?? '')");
		expect(projectCreate).toContain("zoneName: rootDomain");
		expect(projectCreate).toContain("webNewRootDomainInput?.addEventListener('input', syncDomainDefaults)");
	});

	it('waits for sensitive data unlock before creating credential sessions', () => {
		const projectCreate = source('src/pages/app/projects/new.astro');
		const unlockRequest = projectCreate.indexOf('await unlock?.promptPassphrase?.()');
		const createSession = projectCreate.indexOf("createCredentialSession('repository_host'");
		expect(unlockRequest).toBeGreaterThan(-1);
		expect(createSession).toBeGreaterThan(unlockRequest);
		expect(projectCreate).toContain('validateSelectedCredentialSessions');
		expect(projectCreate).toContain('validatedLaunchUnlock');
		expect(projectCreate).toContain('Sensitive data unlocked for the selected project hosts.');
		expect(projectCreate).toContain("This host's saved credentials may still be encrypted with a different passphrase.");
		expect(projectCreate).not.toContain('requestFreshSensitivePassphrase');
	});

	it('hands project launch submission to the deployment status page', () => {
		const projectCreate = source('src/pages/app/projects/new.astro');
		expect(projectCreate).toContain('Opening deployment status...');
		expect(projectCreate).toContain('window.sessionStorage.setItem(launchStorageKey, launchStorageValue)');
		expect(projectCreate).toContain('window.localStorage.setItem(launchStorageKey, launchStorageValue)');
		expect(projectCreate).toContain('/app/projects/launch-status?request=');
		expect(projectCreate).not.toContain("setStatus('Creating project...')");
	});

	it('shows hosting readiness audit details on the deployment status page', () => {
		const statusPage = source('src/pages/app/projects/launch-status.astro');
		expect(statusPage).toContain('Project deployment status');
		expect(statusPage).toContain('data-launch-progress-bar');
		expect(statusPage).toContain('data-launch-log-copy');
		expect(statusPage).toContain('ts-launch-log-copy--hidden');
		expect(statusPage).toContain('Copy troubleshooting report');
		expect(statusPage).toContain('data-launch-retry');
		expect(statusPage).toContain('Retry launch');
		expect(statusPage).not.toContain('Back to launch form');
		expect(statusPage).toContain('function supportReport');
		expect(statusPage).toContain('TreeSeed project launch troubleshooting report');
		expect(statusPage).toContain('Project deployment link');
		expect(statusPage).toContain('const logEntries');
		expect(statusPage).toContain('function renderLogSections');
		expect(statusPage).toContain('function executeLaunch');
		expect(statusPage).toContain('function rememberStatus');
		expect(statusPage).toContain('function restoreStoredStatus');
		expect(statusPage).toContain('window.localStorage.getItem(currentStatusKey)');
		expect(statusPage).toContain('Started live polling for launch job.');
		expect(statusPage).toContain('Observed launch job status.');
		expect(statusPage).toContain('Launch API responded.');
		expect(statusPage).toContain('Market operations runner claimed the launch job.');
		expect(statusPage).toContain('Retry requested from deployment status page.');
		expect(statusPage).toContain('## Log by step');
		expect(statusPage).toContain('function renderAudit');
		expect(statusPage).toContain('function renderFailureDetails');
		expect(statusPage).toContain('audit?.blockers');
		expect(statusPage).toContain("payload?.details?.blockers");
		expect(statusPage).toContain('audit?.missingConfig');
		expect(statusPage).toContain('fetch(`/v1/jobs/${encodeURIComponent(jobId)}`)');
		expect(statusPage).toContain('fetch(`/v1/jobs/${encodeURIComponent(jobId)}/events`)');
		expect(statusPage).toContain("document.execCommand?.('copy')");
	});

	it('commits generated workflow files before pushing launch branches and migrates both D1 environments', () => {
		const launch = source('packages/sdk/src/operations/services/hub-provider-launch.ts');
		const init = launch.indexOf('initializeGitHubRepositoryWorkingTree(workingRoot, repository');
		const workflow = launch.indexOf('ensureGitHubDeployAutomation(workingRoot');
		const commit = launch.indexOf('commitAndPushLaunchRepository(workingRoot');
		const workstream = launch.indexOf('pushDefaultWorkstreamBranch(workingRoot)');
		expect(init).toBeGreaterThan(-1);
		expect(workflow).toBeGreaterThan(init);
		expect(commit).toBeGreaterThan(workflow);
		expect(workstream).toBeGreaterThan(commit);
		expect(launch).toContain("runRemoteD1Migrations(workingRoot, { scope: 'staging' })");
		expect(launch).toContain("runRemoteD1Migrations(workingRoot, { scope: 'prod' })");
	});

	it('builds complete repository descriptors for existing software and content repositories', () => {
		const launch = source('packages/sdk/src/operations/services/hub-provider-launch.ts');
		expect(launch).toContain('resolveGitHubRemoteUrls(input.existingRepository.owner, input.existingRepository.name)');
		expect(launch).toContain('resolveGitHubRemoteUrls(input.contentRepository.owner ?? repoOwner, input.contentRepository.name)');
		expect(launch).toContain("defaultBranch: input.existingRepository.defaultBranch ?? 'main'");
		expect(launch).toContain("defaultBranch: input.contentRepository.defaultBranch ?? 'main'");
	});

	it('validates repository hosts and hosting readiness before persisting the project', () => {
		const api = source('src/api/app.js');
		const routeStart = api.indexOf("app.post('/v1/teams/:teamId/projects/launch'");
		const routeEnd = api.indexOf("app.get('/v1/projects/:projectId'", routeStart);
		const launchRoute = api.slice(routeStart, routeEnd);
		const repositoryHostLookup = launchRoute.indexOf('let repositoryHost = await store.getRepositoryHost(teamId, repositoryHostId)');
		const audit = launchRoute.indexOf('const hostingAudit = await runTreeseedHostingAudit');
		const createProject = launchRoute.indexOf('details = await store.createProject(c.req.param');
		expect(repositoryHostLookup).toBeGreaterThan(-1);
		expect(audit).toBeGreaterThan(repositoryHostLookup);
		expect(createProject).toBeGreaterThan(audit);
	});
});
