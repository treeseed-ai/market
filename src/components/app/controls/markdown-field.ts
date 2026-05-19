import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { placeholder as editorPlaceholder } from '@codemirror/view';
import { EditorView, basicSetup } from 'codemirror';
import { tags } from '@lezer/highlight';

type MarkdownFieldRoot = HTMLElement & {
	dataset: DOMStringMap & {
		enhanced?: string;
		markdownReady?: string;
		markdownRequired?: string;
	};
};

function debounce(callback: () => void, delay = 250) {
	let timer = 0;
	return () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(callback, delay);
	};
}

function showFieldError(root: MarkdownFieldRoot, show: boolean) {
	const error = root.querySelector<HTMLElement>('[data-markdown-error]');
	root.dataset.invalid = show ? 'true' : 'false';
	if (error) error.hidden = !show;
}

function setEditorStatus(root: MarkdownFieldRoot, status: string) {
	const statusElement = root.querySelector<HTMLElement>('[data-markdown-status]');
	if (statusElement) statusElement.textContent = status;
}

const markdownHighlightStyle = HighlightStyle.define([
	{ tag: tags.heading, class: 'cm-md-heading' },
	{ tag: tags.strong, class: 'cm-md-strong' },
	{ tag: tags.emphasis, class: 'cm-md-emphasis' },
	{ tag: tags.monospace, class: 'cm-md-code' },
	{ tag: tags.link, class: 'cm-md-link' },
	{ tag: tags.url, class: 'cm-md-link' },
	{ tag: tags.quote, class: 'cm-md-quote' },
	{ tag: tags.meta, class: 'cm-md-meta' },
	{ tag: tags.processingInstruction, class: 'cm-md-meta' },
]);

function initializeMarkdownField(root: MarkdownFieldRoot) {
	if (root.dataset.markdownReady === 'true') return;
	root.dataset.markdownReady = 'true';

	const textarea = root.querySelector<HTMLTextAreaElement>('[data-markdown-textarea]');
	const editorHost = root.querySelector<HTMLElement>('[data-markdown-editor-host]');
	const editTab = root.querySelector<HTMLButtonElement>('[data-markdown-editor-tab]');
	const previewTab = root.querySelector<HTMLButtonElement>('[data-markdown-preview-tab]');
	const editPanel = root.querySelector<HTMLElement>('[data-markdown-editor-panel]');
	const previewPanel = root.querySelector<HTMLElement>('[data-markdown-preview-panel]');
	if (!textarea || !editorHost) return;
	const markdownTextarea = textarea;

	let view: EditorView | null = null;
	try {
		view = new EditorView({
			doc: markdownTextarea.value,
			parent: editorHost,
			extensions: [
				basicSetup,
				markdown(),
				syntaxHighlighting(markdownHighlightStyle),
				EditorView.lineWrapping,
				...(markdownTextarea.placeholder ? [editorPlaceholder(markdownTextarea.placeholder)] : []),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged) return;
					markdownTextarea.value = update.state.doc.toString();
					showFieldError(root, false);
				}),
			],
		});
		root.dataset.enhanced = 'true';
		setEditorStatus(root, 'CodeMirror');
	} catch (error) {
		root.dataset.enhanced = 'false';
		setEditorStatus(root, 'Fallback');
		console.error('Markdown editor failed to initialize; falling back to textarea.', error);
	}

	const renderPreview = debounce(async () => {
		if (!previewPanel) return;
		previewPanel.innerHTML = '<p class="ts-empty-inline">Rendering preview...</p>';
		const response = await fetch('/api/markdown/preview', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ markdown: markdownTextarea.value }),
		});
		const payload = await response.json().catch(() => null);
		previewPanel.innerHTML = response.ok && payload?.ok
			? payload.payload.html || '<p class="ts-empty-inline">Nothing to preview.</p>'
			: '<p class="ts-empty-inline">Preview is unavailable.</p>';
	}, 150);

	function selectMode(mode: 'edit' | 'preview') {
		const preview = mode === 'preview';
		editTab?.setAttribute('aria-selected', preview ? 'false' : 'true');
		previewTab?.setAttribute('aria-selected', preview ? 'true' : 'false');
		if (editPanel) editPanel.hidden = preview;
		if (previewPanel) previewPanel.hidden = !preview;
		if (preview) renderPreview();
		else requestAnimationFrame(() => (view ? view.focus() : markdownTextarea.focus()));
	}

	const form = markdownTextarea.form;
	form?.addEventListener('submit', (event) => {
		if (root.dataset.markdownRequired !== 'true') return;
		if (markdownTextarea.value.trim()) return;
		event.preventDefault();
		selectMode('edit');
		showFieldError(root, true);
		if (view) view.focus();
		else markdownTextarea.focus();
	});

	editTab?.addEventListener('click', () => selectMode('edit'));
	previewTab?.addEventListener('click', () => selectMode('preview'));
}

export function initializeMarkdownFields() {
	document
		.querySelectorAll<MarkdownFieldRoot>('[data-markdown-field]')
		.forEach((root) => initializeMarkdownField(root));
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeMarkdownFields, { once: true });
} else {
	initializeMarkdownFields();
}
document.addEventListener('astro:page-load', initializeMarkdownFields);
