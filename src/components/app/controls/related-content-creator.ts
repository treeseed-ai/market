import { initializeMarkdownFields } from './markdown-field.ts';

type RelatedCreatorConfig = {
	projectId?: string;
	parentCollection?: string;
	parentSlug?: string;
};

function readConfig(root: HTMLElement): RelatedCreatorConfig {
	const dataElement = root.querySelector<HTMLScriptElement>('#related-content-data')
		?? document.getElementById('related-content-data');
	if (!dataElement?.textContent) return {};
	try {
		return JSON.parse(dataElement.textContent) as RelatedCreatorConfig;
	} catch {
		return {};
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function formValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? '').trim();
}

function initializeDrag(windowElement: HTMLElement, handle: HTMLElement) {
	let dragging = false;
	let startX = 0;
	let startY = 0;
	let startLeft = 0;
	let startTop = 0;

	handle.addEventListener('pointerdown', (event) => {
		const target = event.target as HTMLElement | null;
		if (target?.closest('button, a, input, select, textarea, summary, details')) return;
		const rect = windowElement.getBoundingClientRect();
		dragging = true;
		startX = event.clientX;
		startY = event.clientY;
		startLeft = rect.left;
		startTop = rect.top;
		handle.setPointerCapture(event.pointerId);
	});

	handle.addEventListener('pointermove', (event) => {
		if (!dragging) return;
		const rect = windowElement.getBoundingClientRect();
		const left = clamp(startLeft + event.clientX - startX, 8, window.innerWidth - Math.min(180, rect.width));
		const top = clamp(startTop + event.clientY - startY, 8, window.innerHeight - Math.min(96, rect.height));
		windowElement.style.left = `${left}px`;
		windowElement.style.top = `${top}px`;
		windowElement.style.right = 'auto';
		windowElement.style.bottom = 'auto';
	});

	handle.addEventListener('pointerup', (event) => {
		if (!dragging) return;
		dragging = false;
		handle.releasePointerCapture(event.pointerId);
	});
}

function initializeRelatedContentCreator(root: HTMLElement) {
	if (root.dataset.relatedCreatorReady === 'true') return;
	root.dataset.relatedCreatorReady = 'true';

	const config = readConfig(root);
	const float = root.querySelector<HTMLElement>('[data-related-float]') ?? document.querySelector<HTMLElement>('[data-related-float]');
	const windowElement = root.querySelector<HTMLElement>('[data-related-window]') ?? document.querySelector<HTMLElement>('[data-related-window]');
	const title = root.querySelector<HTMLElement>('[data-related-title]') ?? document.querySelector<HTMLElement>('[data-related-title]');
	const handle = root.querySelector<HTMLElement>('[data-related-drag-handle]') ?? document.querySelector<HTMLElement>('[data-related-drag-handle]');
	if (!float || !windowElement || !handle) return;
	const floatingLayer = float;

	initializeDrag(windowElement, handle);

	function activeForm() {
		return document.querySelector<HTMLFormElement>('.ts-related-form:not([hidden])');
	}

	function setStatus(message: string, form = activeForm()) {
		const status = form?.querySelector<HTMLElement>('[data-related-status]');
		if (status) status.textContent = message;
	}

	function closeWindow() {
		const form = activeForm();
		form?.reset();
		floatingLayer.hidden = true;
		document.querySelectorAll<HTMLFormElement>('.ts-related-form').forEach((candidate) => {
			candidate.hidden = true;
		});
	}

	function openWindow(collection: string, label: string) {
		document.querySelectorAll<HTMLFormElement>('.ts-related-form').forEach((candidate) => {
			candidate.hidden = candidate.dataset.relatedForm !== collection;
		});
		if (title) title.textContent = label;
		floatingLayer.hidden = false;
		initializeMarkdownFields();
		requestAnimationFrame(() => {
			const input = activeForm()?.querySelector<HTMLInputElement>('input[name="title"]');
			input?.focus();
		});
	}

	root.addEventListener('click', (event) => {
		const target = event.target as HTMLElement | null;
		const openButton = target?.closest<HTMLElement>('[data-related-create-open], .ts-related-create__button');
		if (openButton) {
			const trigger = openButton.matches('[data-related-create-open]')
				? openButton
				: openButton.querySelector<HTMLElement>('[data-related-create-open]');
			const collection = String(trigger?.dataset.relatedCreateOpen ?? '');
			if (!collection) return;
			openWindow(
				collection,
				trigger?.textContent?.trim() || openButton.textContent?.trim() || 'New related content',
			);
			return;
		}
		if (target?.closest('[data-related-close], .ts-related-cancel')) {
			closeWindow();
		}
	});
	document.addEventListener('click', (event) => {
		const target = event.target as HTMLElement | null;
		if (target?.closest('[data-related-close], .ts-related-cancel')) {
			closeWindow();
		}
	});

	document.querySelectorAll<HTMLFormElement>('.ts-related-form').forEach((form) => {
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const formData = new FormData(form);
			const targetCollection = formValue(formData, 'targetCollection') || form.dataset.relatedForm || '';
			const projectId = config.projectId || formValue(formData, 'projectId');
			if (!projectId || !targetCollection) {
				setStatus('Project or target content type is missing.', form);
				return;
			}
			setStatus('Creating linked content...', form);
			const body = Object.fromEntries(formData.entries());
			body.parentCollection = body.parentCollection || config.parentCollection || '';
			body.parentSlug = body.parentSlug || config.parentSlug || '';
			body.targetCollection = targetCollection;
			try {
				await submitPlatformOperationForm({
					url: `/v1/projects/${encodeURIComponent(projectId)}/local-content/${encodeURIComponent(targetCollection)}/related`,
					body,
					statusElement: form.querySelector<HTMLElement>('[data-related-status]'),
					fallbackHref: `${window.location.pathname}?related=${Date.now()}`,
					initialMessage: 'Queuing linked content...',
				});
			} catch (error) {
				setStatus(error instanceof Error ? error.message : 'Related content could not be created.', form);
			}
		});
	});
}

export function initializeRelatedContentCreators() {
	document
		.querySelectorAll<HTMLElement>('[data-related-create]')
		.forEach((root) => initializeRelatedContentCreator(root));
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeRelatedContentCreators, { once: true });
} else {
	initializeRelatedContentCreators();
}
document.addEventListener('astro:page-load', initializeRelatedContentCreators);
import { submitPlatformOperationForm } from './platform-operation-status.ts';
