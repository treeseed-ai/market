type AdminFormContext = {
	form: HTMLFormElement;
	formData: FormData;
	setStatus: (message: string) => void;
	submitter: HTMLElement | null;
};

type AdminFormOptions = {
	statusElement?: HTMLElement | null;
	busyMessage?: string;
	successMessage?: string;
	preserveServerValues?: boolean;
	onSubmit: (context: AdminFormContext) => Promise<unknown>;
	onSuccess?: (result: unknown, context: AdminFormContext) => void;
};

function formControls(form: HTMLFormElement) {
	return [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')];
}

function resetControlToServerValue(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
	if (control instanceof HTMLSelectElement) {
		for (const option of control.options) option.selected = option.defaultSelected;
		return;
	}
	if (control instanceof HTMLTextAreaElement) {
		control.value = control.defaultValue;
		return;
	}
	if (control.type === 'checkbox' || control.type === 'radio') {
		control.checked = control.defaultChecked;
		return;
	}
	if (control.type === 'hidden' || control.dataset.allowBrowserAutofill === 'true') return;
	control.value = control.defaultValue;
}

export function protectAdministrativeFormValues(form: HTMLFormElement) {
	let userInteracted = false;
	const markInteracted = () => {
		userInteracted = true;
	};
	form.addEventListener('focusin', markInteracted, { once: true });
	form.addEventListener('input', markInteracted, { once: true });
	form.setAttribute('autocomplete', 'off');
	for (const control of formControls(form)) {
		if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
			control.setAttribute('autocomplete', control.getAttribute('autocomplete') || 'off');
			control.setAttribute('autocapitalize', control.getAttribute('autocapitalize') || 'none');
			control.setAttribute('spellcheck', control.getAttribute('spellcheck') || 'false');
			control.setAttribute('data-lpignore', control.getAttribute('data-lpignore') || 'true');
			control.setAttribute('data-1p-ignore', control.getAttribute('data-1p-ignore') || 'true');
		}
	}
	const resetIfBrowserFilled = () => {
		if (userInteracted) return;
		for (const control of formControls(form)) resetControlToServerValue(control);
	};
	resetIfBrowserFilled();
	window.setTimeout(resetIfBrowserFilled, 100);
	window.setTimeout(resetIfBrowserFilled, 500);
}

export async function submitAdministrativeJson(url: string, method: string, body?: unknown) {
	const response = await fetch(url, {
		method,
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const payload = await response.json().catch(() => null);
	if (!response.ok || payload?.ok === false) {
		throw new Error(payload?.error ?? `Request failed with ${response.status}.`);
	}
	return payload?.payload ?? payload;
}

export function bindAdministrativeForm(form: HTMLFormElement | null, options: AdminFormOptions) {
	if (!form || form.dataset.adminFormBound === 'true') return;
	form.dataset.adminFormBound = 'true';
	if (options.preserveServerValues) protectAdministrativeFormValues(form);
	const status = options.statusElement ?? null;
	const setStatus = (message: string) => {
		if (status) status.textContent = message;
	};
	const submitButtons = () => [...form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button[type="submit"], input[type="submit"]')];
	form.addEventListener('invalid', (event) => {
		const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
		setStatus(target?.name ? `Check "${target.name}" before saving.` : 'Check the highlighted fields before saving.');
	}, true);
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (!form.reportValidity()) {
			setStatus('Check the highlighted fields before saving.');
			return;
		}
		const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
		for (const button of submitButtons()) button.disabled = true;
		setStatus(options.busyMessage ?? 'Saving...');
		const context: AdminFormContext = { form, formData: new FormData(form), setStatus, submitter };
		try {
			const result = await options.onSubmit(context);
			options.onSuccess?.(result, context);
			if (!options.onSuccess) setStatus(options.successMessage ?? 'Saved.');
		} catch (error) {
			setStatus(error instanceof Error ? error.message : 'Form could not be saved.');
		} finally {
			for (const button of submitButtons()) button.disabled = false;
		}
	});
}
