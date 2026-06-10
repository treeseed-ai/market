import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
	BlockTypeSelect,
	BoldItalicUnderlineToggles,
	ChangeCodeMirrorLanguage,
	codeBlockPlugin,
	codeMirrorPlugin,
	CodeToggle,
	ConditionalContents,
	CreateLink,
	diffSourcePlugin,
	DiffSourceToggleWrapper,
	GenericJsxEditor,
	headingsPlugin,
	imagePlugin,
	InsertCodeBlock,
	InsertImage,
	InsertTable,
	InsertThematicBreak,
	jsxPlugin,
	linkDialogPlugin,
	linkPlugin,
	listsPlugin,
	ListsToggle,
	markdownShortcutPlugin,
	MDXEditor,
	quotePlugin,
	Separator,
	tablePlugin,
	thematicBreakPlugin,
	toolbarPlugin,
	UndoRedo,
} from '@mdxeditor/editor';
import type { JsxComponentDescriptor } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

type CoreObjectiveEditorRoot = HTMLElement & {
	dataset: DOMStringMap & {
		coreObjectiveInitializing?: string;
		coreObjectiveReady?: string;
	};
};

const codeBlockLanguages = {
	bash: 'Bash',
	css: 'CSS',
	html: 'HTML',
	js: 'JavaScript',
	json: 'JSON',
	jsx: 'JavaScript React',
	md: 'Markdown',
	mdx: 'MDX',
	ts: 'TypeScript',
	tsx: 'TypeScript React',
	yaml: 'YAML',
};

const jsxComponentDescriptors: JsxComponentDescriptor[] = [
	{ name: '*', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor },
	{ name: '*', kind: 'text', props: [], hasChildren: true, Editor: GenericJsxEditor },
	{ name: null, kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor },
];

function CoreObjectiveEditor(props: {
	initialMarkdown: string;
	onChange: (markdown: string) => void;
	onReady: () => void;
}) {
	const { initialMarkdown, onChange, onReady } = props;
	useEffect(() => {
		onReady();
	}, [onReady]);
	return (
		<MDXEditor
			className="ts-core-objective-mdx"
			contentEditableClassName="ts-core-objective-mdx__content"
			markdown={initialMarkdown}
			onChange={onChange}
			plugins={[
				headingsPlugin(),
				listsPlugin(),
				quotePlugin(),
				thematicBreakPlugin(),
				tablePlugin(),
				linkPlugin(),
				linkDialogPlugin(),
				imagePlugin({
					allowSetImageDimensions: true,
					imageAutocompleteSuggestions: [
						'https://placehold.co/1200x630',
					],
				}),
				jsxPlugin({
					jsxComponentDescriptors: [...jsxComponentDescriptors],
					allowFragment: true,
				}),
				codeBlockPlugin({ defaultCodeBlockLanguage: 'mdx' }),
				codeMirrorPlugin({
					codeBlockLanguages,
					autoLoadLanguageSupport: true,
				}),
				diffSourcePlugin({
					diffMarkdown: initialMarkdown,
					viewMode: 'rich-text',
				}),
				markdownShortcutPlugin(),
				toolbarPlugin({
					toolbarClassName: 'ts-core-objective-mdx__toolbar',
					toolbarContents: () => (
						<DiffSourceToggleWrapper SourceToolbar={<UndoRedo />}>
							<ConditionalContents
								options={[
									{
										when: (editor) => editor?.editorType === 'codeblock',
										contents: () => (
											<>
												<UndoRedo />
												<Separator />
												<ChangeCodeMirrorLanguage />
												<Separator />
												<InsertCodeBlock />
											</>
										),
									},
									{
										fallback: () => (
											<>
												<UndoRedo />
												<Separator />
												<BlockTypeSelect />
												<BoldItalicUnderlineToggles />
												<CodeToggle />
												<ListsToggle />
												<Separator />
												<CreateLink />
												<InsertImage />
												<InsertTable />
												<InsertThematicBreak />
												<Separator />
												<InsertCodeBlock />
											</>
										),
									},
								]}
							/>
						</DiffSourceToggleWrapper>
					),
				}),
			]}
		/>
	);
}

function initializeCoreObjectiveEditor(root: CoreObjectiveEditorRoot) {
	if (root.dataset.coreObjectiveReady === 'true' || root.dataset.coreObjectiveInitializing === 'true') return;
	const textarea = root.querySelector<HTMLTextAreaElement>('[data-core-objective-input]');
	const mount = root.querySelector<HTMLElement>('[data-core-objective-mount]');
	const error = root.querySelector<HTMLElement>('[data-core-objective-error]');
	if (!textarea || !mount) return;
	root.dataset.coreObjectiveInitializing = 'true';
	const reactRoot = createRoot(mount);
	reactRoot.render(
		<CoreObjectiveEditor
			initialMarkdown={textarea.value}
			onReady={() => {
				root.dataset.coreObjectiveReady = 'true';
				delete root.dataset.coreObjectiveInitializing;
			}}
			onChange={(markdown) => {
				textarea.value = markdown;
				root.dataset.invalid = 'false';
				if (error) error.hidden = true;
			}}
		/>,
	);
	textarea.form?.addEventListener('submit', (event) => {
		if (textarea.value.trim()) return;
		event.preventDefault();
		root.dataset.invalid = 'true';
		if (error) error.hidden = false;
		mount.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
	});
}

export function initializeCoreObjectiveEditors() {
	document
		.querySelectorAll<CoreObjectiveEditorRoot>('[data-core-objective-editor]')
		.forEach((root) => initializeCoreObjectiveEditor(root));
}

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeCoreObjectiveEditors, { once: true });
	} else {
		initializeCoreObjectiveEditors();
	}
	document.addEventListener('astro:page-load', initializeCoreObjectiveEditors);
}
