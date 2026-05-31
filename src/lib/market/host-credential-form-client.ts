import { encryptHostConfig } from '../host-crypto.ts';
import { bindAdministrativeForm, submitAdministrativeJson } from './admin-form-client.ts';

type HostFormPageData = {
	teamId?: string | null;
	hostType?: string | null;
	hostId?: string | null;
	provider?: string | null;
	existingCloudflareZoneId?: string | null;
};

type HostFormBindResult = {
	form: HTMLFormElement | null;
	status: HTMLElement | null;
};

const BINDING_VERSION = 'host-credential-form-v1';

function value(formData: FormData, key: string) {
	return String(formData.get(key) ?? '').trim();
}

function controls(form: HTMLFormElement) {
	return [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')];
}

function freshForm(form: HTMLFormElement | null) {
	if (!form) return null;
	if (form.dataset.hostCredentialFormBinding === BINDING_VERSION) return form;
	const previousControls = controls(form);
	const clone = form.cloneNode(true) as HTMLFormElement;
	const clonedControls = controls(clone);
	previousControls.forEach((control, index) => {
		const cloned = clonedControls[index];
		if (!cloned) return;
		if (control instanceof HTMLSelectElement && cloned instanceof HTMLSelectElement) {
			cloned.value = control.value;
		} else if (control instanceof HTMLInputElement && cloned instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
			cloned.checked = control.checked;
		} else if ('value' in cloned && 'value' in control) {
			cloned.value = control.value;
		}
	});
	form.replaceWith(clone);
	clone.dataset.hostCredentialFormBinding = BINDING_VERSION;
	return clone;
}

export function hostCredentialFieldNames(hostType: string) {
	if (hostType === 'repository') return ['githubToken'];
	if (hostType === 'web') return ['cloudflareAccountId', 'cloudflareApiToken'];
	if (hostType === 'capacity-provider') return ['railwayApiToken', 'railwayWorkspace'];
	if (hostType === 'email') return ['smtpUsername', 'smtpPassword'];
	return ['aiApiKey', 'aiBaseUrl', 'aiDefaultModel'];
}

export function requiredHostCredentialFields(hostType: string) {
	if (hostType === 'repository') return ['githubToken'];
	if (hostType === 'web') return ['cloudflareAccountId', 'cloudflareApiToken'];
	if (hostType === 'capacity-provider') return ['railwayApiToken'];
	if (hostType === 'email') return ['smtpUsername', 'smtpPassword'];
	return ['aiApiKey'];
}

export function hasHostCredentialValues(formData: FormData, hostType: string) {
	return hostCredentialFieldNames(hostType).some((key) => value(formData, key));
}

export function validateHostCredentialValues(formData: FormData, hostType: string, message: string) {
	for (const key of requiredHostCredentialFields(hostType)) {
		if (!value(formData, key)) throw new Error(message);
	}
}

export function hostCredentialConfig(formData: FormData, hostType: string) {
	if (hostType === 'repository') {
		const token = value(formData, 'githubToken');
		return {
			GH_TOKEN: token,
			GITHUB_TOKEN: token,
			organizationOrOwner: value(formData, 'organizationOrOwner'),
			owner: value(formData, 'organizationOrOwner'),
		};
	}
	if (hostType === 'web') {
		return {
			CLOUDFLARE_ACCOUNT_ID: value(formData, 'cloudflareAccountId'),
			CLOUDFLARE_API_TOKEN: value(formData, 'cloudflareApiToken'),
		};
	}
	if (hostType === 'capacity-provider') {
		return {
			RAILWAY_API_TOKEN: value(formData, 'railwayApiToken'),
			TREESEED_RAILWAY_WORKSPACE: value(formData, 'railwayWorkspace'),
		};
	}
	if (hostType === 'email') {
		return {
			SMTP_USERNAME: value(formData, 'smtpUsername'),
			SMTP_PASSWORD: value(formData, 'smtpPassword'),
		};
	}
	return {
		AI_API_KEY: value(formData, 'aiApiKey'),
		AI_BASE_URL: value(formData, 'aiBaseUrl'),
		AI_DEFAULT_MODEL: value(formData, 'aiDefaultModel'),
		AI_PROVIDER: value(formData, 'provider'),
	};
}

function emailSmtpMetadata(formData: FormData) {
	return {
		host: value(formData, 'smtpHost') || null,
		port: value(formData, 'smtpPort') || null,
		fromEmail: value(formData, 'smtpFromEmail') || null,
		replyTo: value(formData, 'smtpReplyTo') || null,
		secure: value(formData, 'smtpSecure') || null,
	};
}

function hasEmailSmtpMetadata(formData: FormData) {
	return Object.values(emailSmtpMetadata(formData)).some(Boolean);
}

function sensitiveUnlockApi() {
	const unlock = (window as any).treeseedSensitiveUnlock;
	if (!unlock) document.querySelector<HTMLElement>('[data-sensitive-unlock-button]')?.click();
	return unlock;
}

function currentSensitivePassphrase() {
	const unlock = sensitiveUnlockApi();
	return unlock?.isUnlocked?.() ? unlock?.getPassphrase?.() : null;
}

function openSensitiveUnlock() {
	const unlock = sensitiveUnlockApi();
	unlock?.open?.('unlock');
}

async function promptSensitivePassphrase() {
	const unlock = sensitiveUnlockApi();
	const passphrase = await unlock?.promptPassphrase?.();
	return passphrase ? String(passphrase) : null;
}

function submitButtons(form: HTMLFormElement) {
	return [...form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button[type="submit"], input[type="submit"]')];
}

function setSubmitBusy(form: HTMLFormElement, busy: boolean) {
	for (const button of submitButtons(form)) {
		button.disabled = busy;
		button.setAttribute('aria-disabled', busy ? 'true' : 'false');
	}
}

function endpointFor(pageData: HostFormPageData, method: 'POST' | 'PUT') {
	if (!pageData.teamId) throw new Error('This host page is missing team context. Refresh the page and try again.');
	if (pageData.hostType === 'repository') {
		const base = `/v1/teams/${encodeURIComponent(String(pageData.teamId))}/repository-hosts`;
		return method === 'PUT' ? `${base}/${encodeURIComponent(String(pageData.hostId ?? ''))}` : base;
	}
	const base = `/v1/teams/${encodeURIComponent(String(pageData.teamId))}/hosts`;
	return method === 'PUT' ? `${base}/${encodeURIComponent(String(pageData.hostId ?? ''))}` : base;
}

function bindCredentialSubmitGate(
	form: HTMLFormElement,
	status: HTMLElement | null,
	pageData: HostFormPageData,
	mode: 'create' | 'edit',
	onSuccess?: (result: unknown, context: any) => void,
) {
	form.addEventListener('submit', async (event) => {
		if (!pageData.hostType) return;
		const formData = new FormData(form);
		if (!hasHostCredentialValues(formData, pageData.hostType)) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		if (!form.reportValidity()) {
			if (status) status.textContent = 'Enter all required values before saving this host.';
			return;
		}
		if (mode === 'edit' && !pageData.hostId) {
			if (status) status.textContent = 'This host page is missing save context. Refresh the page and try again.';
			return;
		}
		setSubmitBusy(form, true);
		try {
			if (status) status.textContent = mode === 'edit'
				? 'Enter the team sensitive data passphrase to encrypt replacement credentials.'
				: 'Enter the team sensitive data passphrase to encrypt this host.';
			const passphrase = await promptSensitivePassphrase();
			if (!passphrase) {
				if (status) status.textContent = 'Host credentials were not saved because sensitive data was not unlocked.';
				return;
			}
			validateHostCredentialValues(
				formData,
				pageData.hostType,
				mode === 'edit'
					? 'Enter all required replacement credential values, or leave every credential field blank to keep the saved credentials.'
					: 'Enter all required credential values before saving this host.',
			);
			if (status) status.textContent = mode === 'edit' ? 'Encrypting replacement credentials...' : 'Encrypting...';
			const encryptedPayload = await encryptHostConfig(hostCredentialConfig(formData, pageData.hostType), passphrase);
			const body = mode === 'edit'
				? { ...editBody(pageData, form, formData), encryptedPayload }
				: createBody(pageData, formData, encryptedPayload);
			const method = mode === 'edit' ? 'PUT' : 'POST';
			const result = await submitAdministrativeJson(endpointFor(pageData, method), method, body);
			if (status) status.textContent = mode === 'edit' ? 'Saved.' : 'Created.';
			if (mode === 'create') {
				window.location.href = '/app/hosts';
			} else {
				onSuccess?.(result, {
					form,
					formData,
					setStatus(message: string) {
						if (status) status.textContent = message;
					},
				});
			}
		} catch (error) {
			if (status) status.textContent = error instanceof Error ? error.message : String(error);
		} finally {
			setSubmitBusy(form, false);
		}
	}, true);
}

function createBody(pageData: HostFormPageData, formData: FormData, encryptedPayload: unknown) {
	if (pageData.hostType === 'repository') {
		return {
			name: value(formData, 'name'),
			accountLabel: value(formData, 'accountLabel'),
			organizationOrOwner: value(formData, 'organizationOrOwner'),
			defaultVisibility: value(formData, 'defaultVisibility') || 'private',
			softwareRepositoryNameTemplate: value(formData, 'softwareRepositoryNameTemplate') || '{hub}-site',
			contentRepositoryNameTemplate: value(formData, 'contentRepositoryNameTemplate') || '{hub}-content',
			branchPolicy: { defaultBranch: value(formData, 'defaultBranch') || 'main' },
			workflowPolicy: {},
			allowedProjectKinds: ['knowledge_hub'],
			status: 'active',
			ownership: 'team_owned',
			encryptedPayload,
		};
	}
	return {
		name: value(formData, 'name'),
		accountLabel: value(formData, 'accountLabel'),
		provider: value(formData, 'provider') || pageData.provider,
		ownership: 'team_owned',
		status: value(formData, 'status') || 'active',
		metadata: {
			hostType: pageData.hostType === 'capacity-provider' ? 'capacity_provider' : pageData.hostType,
			...(pageData.hostType === 'web' ? {
				dns: {
					managed: Boolean(value(formData, 'cloudflareZoneName')),
					zoneName: value(formData, 'cloudflareZoneName') || null,
				},
			} : {}),
			...(pageData.hostType === 'email' ? {
				smtp: emailSmtpMetadata(formData),
			} : {}),
		},
		encryptedPayload,
	};
}

function editBody(pageData: HostFormPageData, form: HTMLFormElement, formData: FormData) {
	const body: Record<string, unknown> = {
		name: value(formData, 'name'),
	};
	const accountLabelInput = form.elements.namedItem('accountLabel') as HTMLInputElement | null;
	if (accountLabelInput && accountLabelInput.value.trim() !== accountLabelInput.defaultValue.trim()) {
		body.accountLabel = value(formData, 'accountLabel');
	}
	if (pageData.hostType === 'repository') {
		Object.assign(body, {
			organizationOrOwner: value(formData, 'organizationOrOwner'),
			defaultVisibility: value(formData, 'defaultVisibility') || 'private',
			softwareRepositoryNameTemplate: value(formData, 'softwareRepositoryNameTemplate') || '{hub}-site',
			contentRepositoryNameTemplate: value(formData, 'contentRepositoryNameTemplate') || '{hub}-content',
			branchPolicy: { defaultBranch: value(formData, 'defaultBranch') || 'main' },
			workflowPolicy: {},
			allowedProjectKinds: ['knowledge_hub'],
			ownership: 'team_owned',
		});
	} else {
		Object.assign(body, {
			provider: value(formData, 'provider') || pageData.provider,
			ownership: 'team_owned',
			status: value(formData, 'status') || 'active',
			metadata: {
				hostType: pageData.hostType === 'capacity-provider' ? 'capacity_provider' : pageData.hostType,
				...(pageData.hostType === 'web' ? {
					dns: {
						managed: Boolean(value(formData, 'cloudflareZoneName') || pageData.existingCloudflareZoneId),
						zoneName: value(formData, 'cloudflareZoneName') || null,
						zoneId: pageData.existingCloudflareZoneId || null,
					},
				} : {}),
				...(pageData.hostType === 'email' && hasEmailSmtpMetadata(formData) ? {
					smtp: emailSmtpMetadata(formData),
				} : {}),
			},
		});
	}
	return body;
}

export function bindHostCreateCredentialForm(pageData: HostFormPageData): HostFormBindResult {
	const form = freshForm(document.getElementById('host-create-form') as HTMLFormElement | null);
	const status = document.getElementById('host-create-status');
	if (!form || !pageData.hostType) return { form, status };
	const lockedMessage = 'Unlock sensitive data, then save this host again so credentials can be encrypted.';
	bindCredentialSubmitGate(form, status, pageData, 'create');
	bindAdministrativeForm(form, {
		statusElement: status,
		busyMessage: 'Encrypting...',
		async onSubmit({ formData, setStatus }) {
			const passphrase = currentSensitivePassphrase();
			if (!passphrase) {
				openSensitiveUnlock();
				throw new Error(lockedMessage);
			}
			validateHostCredentialValues(formData, pageData.hostType ?? '', 'Enter all required credential values before saving this host.');
			setStatus('Encrypting...');
			const encryptedPayload = await encryptHostConfig(hostCredentialConfig(formData, pageData.hostType ?? ''), String(passphrase));
			const endpoint = pageData.hostType === 'repository'
				? `/v1/teams/${encodeURIComponent(String(pageData.teamId))}/repository-hosts`
				: `/v1/teams/${encodeURIComponent(String(pageData.teamId))}/hosts`;
			return submitAdministrativeJson(endpoint, 'POST', createBody(pageData, formData, encryptedPayload));
		},
		onSuccess() {
			window.location.href = '/app/hosts';
		},
	});
	return { form, status };
}

export function bindHostEditCredentialForm(pageData: HostFormPageData, onSuccess?: (result: unknown, context: any) => void): HostFormBindResult {
	const form = freshForm(document.getElementById('host-edit-form') as HTMLFormElement | null);
	const status = document.getElementById('host-edit-status');
	if (!form || !pageData.hostType) return { form, status };
	const lockedMessage = 'Unlock sensitive data, then save this host again so replacement credentials can be encrypted.';
	bindCredentialSubmitGate(form, status, pageData, 'edit', onSuccess);
	bindAdministrativeForm(form, {
		statusElement: status,
		busyMessage: 'Saving...',
		preserveServerValues: true,
		async onSubmit({ form: activeForm, formData, setStatus }) {
			if (!pageData.teamId || !pageData.hostId || !pageData.hostType) {
				throw new Error('This host page is missing save context. Refresh the page and try again.');
			}
			const body = editBody(pageData, activeForm, formData);
			if (hasHostCredentialValues(formData, pageData.hostType)) {
				const passphrase = currentSensitivePassphrase();
				if (!passphrase) {
					openSensitiveUnlock();
					throw new Error(lockedMessage);
				}
				validateHostCredentialValues(formData, pageData.hostType, 'Enter all required replacement credential values, or leave every credential field blank to keep the saved credentials.');
				setStatus('Encrypting replacement credentials...');
				body.encryptedPayload = await encryptHostConfig(hostCredentialConfig(formData, pageData.hostType), String(passphrase));
			}
			const endpoint = pageData.hostType === 'repository'
				? `/v1/teams/${encodeURIComponent(pageData.teamId)}/repository-hosts/${encodeURIComponent(pageData.hostId)}`
				: `/v1/teams/${encodeURIComponent(pageData.teamId)}/hosts/${encodeURIComponent(pageData.hostId)}`;
			return submitAdministrativeJson(endpoint, 'PUT', body);
		},
		onSuccess,
	});
	return { form, status };
}

export { submitAdministrativeJson };
