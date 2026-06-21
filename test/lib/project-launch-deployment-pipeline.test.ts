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
		const projectCreate = source('packages/admin/src/pages/app/projects/new.astro');
		expect(projectCreate).toContain('name="webNewRootDomain"');
		expect(projectCreate).toContain("return normalizeDomain(webNewRootDomainInput?.value ?? '')");
		expect(projectCreate).toContain("zoneName: rootDomain");
		expect(projectCreate).toContain("webNewRootDomainInput?.addEventListener('input', syncDomainDefaults)");
	});

	it('waits for sensitive data unlock before refusing API passphrase submission', () => {
		const projectCreate = source('packages/admin/src/pages/app/projects/new.astro');
		const unlockRequest = projectCreate.indexOf('await unlock?.promptPassphrase?.()');
		expect(unlockRequest).toBeGreaterThan(-1);
		expect(projectCreate).toContain('validateSelectedCredentialPassphrase');
		expect(projectCreate).toContain('validatedLaunchUnlock');
		expect(projectCreate).not.toContain('sensitivePassphrase: passphrase');
		expect(projectCreate).toContain('Project launch no longer sends unlock passphrases to the API.');
		expect(projectCreate).toContain('Sensitive data unlocked for the selected project hosts.');
		expect(projectCreate).not.toContain('createCredentialSession');
		expect(projectCreate).not.toContain('provider-credential-sessions');
		expect(projectCreate).not.toContain('requestFreshSensitivePassphrase');
	});

	it('creates a durable launch record before opening the deployment status page', () => {
		const projectCreate = source('packages/admin/src/pages/app/projects/new.astro');
		expect(projectCreate).toContain('Creating durable deployment record...');
		expect(projectCreate).toContain('async function submitLaunchRequest');
		expect(projectCreate).toContain('const launchResponse = await submitLaunchRequest(launchRequest)');
		expect(projectCreate).toContain('const deployHref = launchResponse?.deploymentHref');
		expect(projectCreate).toContain('/app/projects/deployment/');
		expect(projectCreate).not.toContain('treeseed:project-launch-status');
		expect(projectCreate).not.toContain('window.sessionStorage.setItem(launchStorageKey, launchStorageValue)');
		expect(projectCreate).not.toContain('/app/projects/launch-status?request=');
		expect(projectCreate).not.toContain("setStatus('Creating project...')");
	});

	it('shows hosting readiness audit details on the deployment status page', () => {
		const statusPage = source('packages/admin/src/pages/app/projects/deployment/[id].astro');
		expect(statusPage).toContain('Project deployment status');
		expect(statusPage).toContain('data-deployment-progress-bar');
		expect(statusPage).toContain('data-report-buffer');
		expect(statusPage).toContain('ts-launch-log-copy--hidden');
		expect(statusPage).toContain('Copy troubleshooting report');
		expect(statusPage).not.toContain('Back to launch form');
		expect(statusPage).toContain('function supportReport');
		expect(statusPage).toContain('TreeSeed project deployment troubleshooting report');
		expect(statusPage).toContain('/v1/project-deployments/');
		expect(statusPage).toContain('function renderIssues');
		expect(statusPage).toContain('function renderLogs');
		expect(statusPage).toContain('credential_bootstrap');
		expect(statusPage).toContain('provider_bootstrap');
		expect(statusPage).toContain("document.execCommand('copy')");
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
		expect(launch).toContain("forcePush: !input.contentRepository.url");
		expect(launch).toContain("forcePush: !input.existingRepository?.url");
	});

	it('keeps generated project Cloudflare resource names inside provider limits', () => {
		const deploy = source('packages/sdk/src/operations/services/deploy.ts');
		expect(deploy).toContain('function compactDeploymentKey');
		expect(deploy).toContain('rawKey && rawKey.length <= 40');
		expect(deploy).toContain('stableHash(`${input.teamId ??');
		expect(deploy).toContain("return `${base}-${hash}`");
	});

	it('builds complete repository descriptors for existing software and content repositories', () => {
		const launch = source('packages/sdk/src/operations/services/hub-provider-launch.ts');
		expect(launch).toContain('resolveGitHubRemoteUrls(input.existingRepository.owner, input.existingRepository.name)');
		expect(launch).toContain('resolveGitHubRemoteUrls(input.contentRepository.owner ?? repoOwner, input.contentRepository.name)');
		expect(launch).toContain("defaultBranch: input.existingRepository.defaultBranch ?? 'main'");
		expect(launch).toContain("defaultBranch: input.contentRepository.defaultBranch ?? 'main'");
	});

	it('routes launch status and deployment recovery through UI client paths', () => {
		const apiClient = source('packages/admin/src/lib/market/api-client.ts');
		const deploymentVm = source('packages/admin/src/view-models/deployment.vm.ts');
		expect(apiClient).toContain('listProjectDeployments');
		expect(apiClient).toContain('listProjectDeploymentEvents');
		expect(deploymentVm).toContain('no_active_operation');
		expect(deploymentVm).toContain('Prevents overlapping deployment work');
	});
});
