import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

function parsePayload(context: any) {
	const raw = context?.trigger?.message?.payloadJson;
	if (!raw || typeof raw !== 'string') return {};
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function recordValue(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(...values: unknown[]) {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) return value.trim();
	}
	return null;
}

function listValue(value: unknown) {
	return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function uniqueList(...values: unknown[]) {
	return [...new Set(values.flatMap(listValue).map((entry) => entry.trim()).filter(Boolean))];
}

function numberValue(...values: unknown[]) {
	for (const value of values) {
		const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
		if (Number.isFinite(numeric)) return numeric;
	}
	return null;
}

function promptField(prompt: string | null, label: string) {
	if (!prompt) return null;
	const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = prompt.match(new RegExp(`^${escaped}:\\s*(.+)$`, 'imu'));
	return match?.[1]?.trim() || null;
}

function slugSegment(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '')
		.slice(0, 72) || 'research-book';
}

function yamlString(value: string) {
	return JSON.stringify(value);
}

function safeRelativePath(input: string, fallback: string) {
	const normalized = input.replace(/\\/gu, '/').replace(/^\/+/u, '');
	if (
		!normalized
		|| normalized.includes('..')
		|| !/\.(md|mdx)$/iu.test(normalized)
		|| !normalized.startsWith('src/content/')
	) {
		return fallback;
	}
	return normalized;
}

function extractJsonObject(text: string) {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1];
	const candidates = [fenced, text.match(/\{[\s\S]*\}/u)?.[0], text].filter(Boolean) as string[];
	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
		} catch {
			// Try the next candidate.
		}
	}
	return null;
}

function listFiles(root: string) {
	const files: string[] = [];
	const visit = (dir: string) => {
		if (!existsSync(dir)) return;
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				visit(fullPath);
			} else if (entry.isFile()) {
				files.push(relative(root, fullPath).replace(/\\/gu, '/'));
			}
		}
	};
	visit(root);
	return files.sort();
}

async function treeDxRequest(input: {
	baseUrl?: string | null;
	apiBaseUrl?: string | null;
	proxyBasePath?: string | null;
	token?: string | null;
	method: string;
	path: string;
	body?: unknown;
}) {
	const proxyBasePath = stringValue(input.proxyBasePath);
	const apiBaseUrl = stringValue(input.apiBaseUrl);
	const directBaseUrl = stringValue(input.baseUrl);
	const baseUrl = proxyBasePath && apiBaseUrl ? apiBaseUrl : directBaseUrl;
	const directPath = input.path.startsWith('/api/v1/') ? input.path : `/api/v1${input.path}`;
	const path = proxyBasePath ? `${proxyBasePath}${input.path}` : directPath;
	const token = stringValue(input.token, process.env.TREESEED_CAPACITY_PROVIDER_API_KEY);
	if (!baseUrl || !token) {
		throw new Error('TreeDX request requires either apiBaseUrl/proxyBasePath or baseUrl, plus a bearer token.');
	}
	const response = await fetch(`${baseUrl.replace(/\/$/u, '')}${path}`, {
		method: input.method,
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${token}`,
			...(input.body === undefined ? {} : { 'content-type': 'application/json' }),
		},
		body: input.body === undefined ? undefined : JSON.stringify(input.body),
	});
	const payload = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(`TreeDX ${input.method} ${path} failed with ${response.status}: ${payload?.error?.message ?? payload?.error ?? JSON.stringify(payload)}`);
	}
	return payload?.payload ?? payload;
}

async function writeTreeDxDocument(treeDx: Record<string, unknown>, relativePath: string, content: string) {
	const baseUrl = stringValue(treeDx.baseUrl);
	const apiBaseUrl = stringValue(treeDx.apiBaseUrl);
	const proxyBasePath = stringValue(treeDx.proxyBasePath);
	const token = stringValue(treeDx.token);
	const workspaceId = stringValue(treeDx.workspaceId);
	if ((!baseUrl && (!apiBaseUrl || !proxyBasePath)) || !workspaceId) return null;
	await treeDxRequest({
		baseUrl,
		apiBaseUrl,
		proxyBasePath,
		token,
		method: 'PUT',
		path: `/workspaces/${encodeURIComponent(workspaceId)}/files?path=${encodeURIComponent(relativePath)}`,
		body: { encoding: 'utf8', content },
	});
	const readback = await treeDxRequest({
		baseUrl,
		apiBaseUrl,
		proxyBasePath,
		token,
		method: 'GET',
		path: `/workspaces/${encodeURIComponent(workspaceId)}/files?path=${encodeURIComponent(relativePath)}`,
	});
	return {
		path: relativePath,
		readbackOk: typeof readback?.content === 'string' || typeof readback?.contentBase64 === 'string' || readback?.ok === true,
		readback,
	};
}

async function commitTreeDxWorkspace(treeDx: Record<string, unknown>, writtenFiles: string[]) {
	const baseUrl = stringValue(treeDx.baseUrl);
	const apiBaseUrl = stringValue(treeDx.apiBaseUrl);
	const proxyBasePath = stringValue(treeDx.proxyBasePath);
	const token = stringValue(treeDx.token);
	const workspaceId = stringValue(treeDx.workspaceId);
	const repoId = stringValue(treeDx.repoId);
	if ((!baseUrl && (!apiBaseUrl || !proxyBasePath)) || !workspaceId || !repoId || !writtenFiles.length) return null;
	const search = await treeDxRequest({
		baseUrl,
		apiBaseUrl,
		proxyBasePath,
		token,
		method: 'POST',
		path: `/workspaces/${encodeURIComponent(workspaceId)}/search`,
		body: { query: 'Core Objective', path: 'src/content', limit: 10 },
	}).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
	const commit = await treeDxRequest({
		baseUrl,
		apiBaseUrl,
		proxyBasePath,
		token,
		method: 'POST',
		path: `/workspaces/${encodeURIComponent(workspaceId)}/commit`,
		body: {
			message: 'Start research content through TreeDX',
			author: { name: 'TreeSeed Researcher Agent', email: 'agent@treeseed.local' },
		},
	});
	const readback = await treeDxRequest({
		baseUrl,
		apiBaseUrl,
		proxyBasePath,
		token,
		method: 'POST',
		path: `/repos/${encodeURIComponent(repoId)}/files/read`,
		body: { ref: stringValue(treeDx.branchName, commit?.branchName, commit?.ref, commit?.commitSha) ?? 'refs/heads/main', path: writtenFiles[0] },
	}).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
	return { search, commit, readback };
}

function writeDocument(root: string, relativePath: string, content: string) {
	const fullPath = resolve(root, relativePath);
	const resolvedRoot = resolve(root);
	if (!fullPath.startsWith(`${resolvedRoot}/`)) {
		throw new Error(`Refusing to write outside content repository: ${relativePath}`);
	}
	mkdirSync(dirname(fullPath), { recursive: true });
	writeFileSync(fullPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
	return relativePath;
}

function markdownDoc(input: {
	title: string;
	description: string;
	summary: string;
	body: string;
	bookSlug: string;
	section: string;
	course: string;
	coreObjective: string;
	decisionId: string;
}) {
	return [
		'---',
		`title: ${yamlString(input.title)}`,
		`description: ${yamlString(input.description)}`,
		`summary: ${yamlString(input.summary)}`,
		'type: guide',
		'status: pending_review',
		'generated_by: treeseed-agent',
		'agent_role: researcher',
		`source_question: ${yamlString(`${input.course}:workday-1`)}`,
		'source_research:',
			`  - ${yamlString(`${input.course}:research-workday-1`)}`,
		'review_state: pending_review',
		`book_target: ${yamlString(input.bookSlug)}`,
		`section_target: ${yamlString(input.section)}`,
		'confidence: medium',
		'source_map:',
		'  - claim: "The page was generated from the live workday prompt, response, and approved project objective."',
		'    sourceFiles:',
		'      - "audit/prompt.md"',
		'      - "audit/response.md"',
		'    sourceSymbolsOrSections:',
		'      - "core objective"',
		'      - "agent response"',
		'    evidenceStrength: supporting',
		'    uncertainty: "This first workday starts structure and requires later source-backed research."',
		'    lastObservedRef: "workday-1"',
		'updated: "2026-06-14"',
		'related:',
		'  objectives: []',
		'  questions: []',
		'  proposals: []',
		`  decisions: [${yamlString(input.decisionId)}]`,
		'---',
		'',
		input.body,
		'',
		'## Core Objective',
		'',
		input.coreObjective,
	].join('\n');
}

function bookDoc(input: {
	bookSlug: string;
	title: string;
	summary: string;
	description: string;
	pages: Array<{ title: string; path: string }>;
}) {
	const sidebar = input.pages.length
		? input.pages.map((page) => `  - label: ${yamlString(page.title)}\n    link: /knowledge/${input.bookSlug}/${page.path.split('/').pop()?.replace(/\.(md|mdx)$/iu, '') ?? ''}/`).join('\n')
		: `  - label: ${yamlString(input.title)}\n    link: /knowledge/${input.bookSlug}/`;
	return [
		'---',
		`order: 1`,
		`slug: ${input.bookSlug}`,
		`title: ${yamlString(input.title)}`,
		`description: ${yamlString(input.description)}`,
		`summary: ${yamlString(input.summary)}`,
		`sectionLabel: ${yamlString(input.title)}`,
		`basePath: /knowledge/${input.bookSlug}/`,
		`landingPath: /knowledge/${input.bookSlug}/`,
		`downloadFileName: ${input.bookSlug}.md`,
		`downloadHref: /books/${input.bookSlug}.md`,
		`downloadTitle: ${yamlString(input.title)}`,
		'sidebarItems:',
		sidebar,
		'tags:',
		'  - study-group',
		'  - generated',
		'---',
		'',
		`# ${input.title}`,
		'',
		input.summary,
	].join('\n');
}

function fallbackContentPlan(input: {
	course: string;
	coreObjective: string;
	question: string;
	response: string;
}) {
	const bookSlug = slugSegment(input.course);
	const pageSlug = slugSegment(input.question);
	return {
		bookSlug,
		bookTitle: `${input.course} Research Book`,
		bookSummary: `Agent-proposed first structure for ${input.course}.`,
		proposal: `Start by turning the objective into a readable research book and initial workday page.`,
		decisionRecommendation: `Approve the first content structure because it is anchored to the core objective.`,
		pages: [
			{
				title: input.question,
				section: 'workday-1',
				path: `src/content/knowledge/${bookSlug}/${pageSlug}.mdx`,
				summary: `First workday research structure for ${input.course}.`,
				body: input.response || `The first workday should structure ${input.course} around the core objective.`,
			},
		],
	};
}

function contentPlanFromResponse(input: {
	course: string;
	coreObjective: string;
	question: string;
	response: string;
}) {
	const parsed = extractJsonObject(input.response);
	if (!parsed) return fallbackContentPlan(input);
	const book = recordValue(parsed.book);
	const rawPages = Array.isArray(parsed.pages) ? parsed.pages.map(recordValue) : [];
	const fallback = fallbackContentPlan(input);
	const bookTitle = stringValue(book.title, parsed.bookTitle, fallback.bookTitle) ?? fallback.bookTitle;
	const bookSlug = slugSegment(stringValue(book.slug, parsed.bookSlug, bookTitle) ?? fallback.bookSlug);
	const pages = rawPages.map((page, index) => {
		const title = stringValue(page.title, `Workday ${index + 1}`) ?? `Workday ${index + 1}`;
		const section = slugSegment(stringValue(page.section, 'workday-1') ?? 'workday-1');
		const fallbackPath = `src/content/knowledge/${bookSlug}/${section}/${slugSegment(title)}.mdx`;
		return {
			title,
			section,
			path: safeRelativePath(stringValue(page.path) ?? fallbackPath, fallbackPath),
			summary: stringValue(page.summary, `Agent-generated page for ${input.course}.`) ?? `Agent-generated page for ${input.course}.`,
			body: stringValue(page.body, page.markdown, input.response) ?? input.response,
		};
	}).filter((page) => page.body.trim());
	return {
		bookSlug,
		bookTitle,
		bookSummary: stringValue(book.summary, parsed.bookSummary, fallback.bookSummary) ?? fallback.bookSummary,
		proposal: stringValue(parsed.proposal, fallback.proposal) ?? fallback.proposal,
		decisionRecommendation: stringValue(parsed.decisionRecommendation, fallback.decisionRecommendation) ?? fallback.decisionRecommendation,
		pages: pages.length ? pages : fallback.pages,
	};
}

function localAssignmentContext(context: any, inputs: any) {
	const mode = stringValue(context.capacity?.mode) === 'acting' ? 'acting' : 'planning';
	const agentSlug = stringValue(context.agent?.slug) ?? 'researcher';
	const projectId = stringValue(context.capacity?.decisionInput?.projectId, inputs.payload?.projectId, inputs.payload?.project?.id) ?? 'local-market-project';
	const teamId = stringValue(context.capacity?.decisionInput?.teamId, inputs.payload?.teamId) ?? 'local-team';
	const projectAgentClassId = stringValue(
		context.capacity?.decisionInput?.projectAgentClassId,
		context.capacity?.assignment?.projectAgentClassId,
		inputs.payload?.projectAgentClassId,
		agentSlug,
	) ?? agentSlug;
	const capacityEnvelope = recordValue(context.capacity?.envelope);
	const decisionInput = recordValue(context.capacity?.decisionInput);
	const assignment = recordValue(context.capacity?.assignment);
	const assignmentId = stringValue(context.capacity?.assignmentId, assignment.id, context.runId) ?? `local-${agentSlug}`;
	const providerId = stringValue(context.capacity?.providerId, assignment.capacityProviderId, capacityEnvelope.capacityProviderId) ?? 'local-provider';
	const localCapacity = {
		teamId,
		projectId,
		mode,
		projectAgentClassId,
		capacityProviderId: providerId,
		executionProviderId: stringValue(capacityEnvelope.executionProviderId, assignment.executionProviderId, context.agent?.execution?.provider) ?? null,
		nativeUnit: stringValue(capacityEnvelope.nativeUnit) ?? 'assignment',
		availableCredits: numberValue(capacityEnvelope.availableCredits, inputs.capacity?.availableCredits),
		reservedCredits: numberValue(capacityEnvelope.reservedCredits, inputs.capacity?.reservedCredits),
		consumedCredits: numberValue(capacityEnvelope.consumedCredits, inputs.capacity?.consumedCredits),
		metadata: {
			...(recordValue(capacityEnvelope.metadata)),
			source: context.capacity ? 'capacity_assignment' : 'local_direct_agent_run',
		},
	};
	const localDecision = {
		teamId,
		projectId,
		projectAgentClassId,
		mode,
		agentId: agentSlug,
		handlerId: stringValue(context.agent?.handler) ?? 'researcher',
		capacity: localCapacity,
		input: {
			...recordValue(inputs.payload),
			course: inputs.course,
			question: inputs.question,
			coreObjective: inputs.coreObjective,
		},
		metadata: {
			...(recordValue(decisionInput.metadata)),
			source: context.capacity ? 'capacity_assignment' : 'local_direct_agent_run',
		},
	};
	return {
		mode,
		capacityEnvelope: {
			...localCapacity,
			...capacityEnvelope,
			teamId: stringValue(capacityEnvelope.teamId, teamId) ?? teamId,
			projectId: stringValue(capacityEnvelope.projectId, projectId) ?? projectId,
			mode,
			projectAgentClassId: stringValue(capacityEnvelope.projectAgentClassId, projectAgentClassId) ?? projectAgentClassId,
			capacityProviderId: stringValue(capacityEnvelope.capacityProviderId, providerId) ?? providerId,
		},
		decisionInput: {
			...localDecision,
			...decisionInput,
			teamId: stringValue(decisionInput.teamId, teamId) ?? teamId,
			projectId: stringValue(decisionInput.projectId, projectId) ?? projectId,
			projectAgentClassId: stringValue(decisionInput.projectAgentClassId, projectAgentClassId) ?? projectAgentClassId,
			mode,
			capacity: Object.keys(recordValue(decisionInput.capacity)).length ? recordValue(decisionInput.capacity) : localCapacity,
			input: {
				...localDecision.input,
				...recordValue(decisionInput.input),
			},
		},
		assignment: {
			...assignment,
			id: assignmentId,
			teamId: stringValue(assignment.teamId, teamId) ?? teamId,
			projectId: stringValue(assignment.projectId, projectId) ?? projectId,
			capacityProviderId: stringValue(assignment.capacityProviderId, providerId) ?? providerId,
			projectAgentClassId: stringValue(assignment.projectAgentClassId, projectAgentClassId) ?? projectAgentClassId,
			mode,
			status: stringValue(assignment.status) ?? 'leased',
			leaseState: stringValue(assignment.leaseState) ?? 'leased',
			leaseToken: stringValue(assignment.leaseToken, context.capacity?.assignment?.leaseToken) ?? null,
			agentId: stringValue(assignment.agentId, agentSlug) ?? agentSlug,
			handlerId: stringValue(assignment.handlerId, context.agent?.handler) ?? 'researcher',
		},
	};
}

function executionText(execution: Record<string, unknown>) {
	const outputs = recordValue(execution.outputs);
	return stringValue(outputs.stdout, outputs.markdown, outputs.response, execution.summary) ?? '';
}

export const researchHandler = {
	kind: 'research',

	async resolveInputs(context: any) {
		const payload = parsePayload(context);
		const metadata = recordValue(payload.metadata);
		const questionRecord = recordValue(payload.question);
		const workspace = recordValue(payload.workspace);
		const treeDx = recordValue(workspace.treeDx);
		const contextPack = recordValue(payload.contextPack);
		const prompt = stringValue(payload.prompt);
		const course = stringValue(payload.course, metadata.course, questionRecord.course, promptField(prompt, 'Course')) ?? 'Study course';
		const coreObjective = stringValue(payload.coreObjective, metadata.coreObjective, questionRecord.coreObjective)
			?? promptField(prompt, 'Core objective')
			?? 'Create a useful study asset.';
		const questions = [
			...listValue(payload.questions),
			...listValue(questionRecord.contextQuestions),
		];
		const question = stringValue(questionRecord.title, payload.title, questions[0])
			?? `What work best advances ${course}?`;
		const contentRepositoryRoot = stringValue(workspace.contentRepositoryRoot);
		const auditRoot = stringValue(workspace.auditRoot);
		return {
			payload,
			course,
			coreObjective,
			question,
			contentRepositoryRoot,
			auditRoot,
			capacity: recordValue(payload.capacity),
			repositoryTopology: recordValue(payload.repositoryTopology),
			approval: recordValue(payload.approval),
			contextPackMarkdown: stringValue(contextPack.markdown),
			treeDx,
		};
	},

	async execute(context: any, inputs: any) {
		if (!inputs.contentRepositoryRoot) {
			return {
				status: 'waiting',
				summary: 'Researcher is waiting for workspace.contentRepositoryRoot before writing visible content.',
				prompt: null,
				response: null,
				contentPlan: null,
				writtenFiles: [],
				changedFiles: [],
				treeDx: { writes: [], commit: null },
			};
		}
		const prompt = [
			`Course: ${inputs.course}`,
			`Core objective: ${inputs.coreObjective}`,
			`Current approved question: ${inputs.question}`,
			`Capacity limit: ${inputs.capacity?.workdayWallMinutes ?? 15} wall minutes for this workday.`,
			inputs.contextPackMarkdown
				? ['TreeDX AI context pack follows. Treat it as the authoritative injected project context.', inputs.contextPackMarkdown].join('\n\n')
				: 'TreeDX AI context pack was not provided.',
			'You are starting a real research project from an empty content repository.',
			'Think independently about the book structure this course needs. Do not use a generic fixed outline.',
			'Return a single JSON object in a fenced json block with this shape:',
			'{ "book": { "slug": "...", "title": "...", "summary": "..." }, "proposal": "...", "decisionRecommendation": "...", "pages": [{ "title": "...", "section": "...", "path": "src/content/knowledge/<book>/<section>/<page>.mdx", "summary": "...", "body": "markdown body" }] }',
			'The body should be useful first-workday markdown and should explicitly connect to the core objective.',
			'Do not invent citations. Mark evidence gaps and next research steps.',
		].join('\n');
		const assignmentContext = localAssignmentContext(context, inputs);
		const requiredCapabilities = uniqueList(
			context.agent?.execution?.providerProfile?.requiredCapabilities,
			'research',
			'repo_read',
		);
		const allowedPaths = uniqueList(context.agent?.execution?.allowedPaths);
		const forbiddenPaths = uniqueList(context.agent?.execution?.forbiddenPaths);
		const execution = await context.execution.start({
			assignment: {
				...assignmentContext.assignment,
				capacityEnvelope: assignmentContext.capacityEnvelope,
				decisionInput: assignmentContext.decisionInput,
				workspaceContext: recordValue(context.capacity?.assignment?.workspaceContext),
				allowedOutputs: recordValue(context.capacity?.assignment?.allowedOutputs),
			},
			capacityEnvelope: assignmentContext.capacityEnvelope,
			decisionInput: assignmentContext.decisionInput,
			agent: context.agent,
			workPackage: {
				kind: 'research',
				title: `Research structure for ${inputs.course}`,
				summary: `Produce a first-workday research content plan for ${inputs.question}.`,
				instructions: prompt,
				context: {
					course: inputs.course,
					coreObjective: inputs.coreObjective,
					question: inputs.question,
					contextPackProvided: Boolean(inputs.contextPackMarkdown),
					contentRepositoryRoot: inputs.contentRepositoryRoot,
					auditRoot: inputs.auditRoot ?? null,
				},
				expectedOutputs: [
					{
						type: 'json_research_content_plan',
						required: true,
						description: 'Fenced JSON with book metadata, proposal, decision recommendation, and markdown pages.',
					},
				],
				constraints: {
					mode: assignmentContext.mode,
					requiredCapabilities,
					allowedPaths,
					forbiddenPaths,
					allowedOperations: ['read', 'research', 'write_content_plan'],
					metadata: {
						assignmentScoped: Boolean(context.capacity?.assignmentId),
					},
				},
				metadata: {
					source: 'market_research_handler',
					runId: context.runId,
				},
			},
			leaseToken: stringValue(assignmentContext.assignment.leaseToken),
			runnerId: stringValue(context.capacity?.assignment?.runnerId) ?? `market-researcher-${process.pid}`,
			projectAgentClass: recordValue(context.capacity?.projectAgentClass),
			workspace: {
				repoRoot: inputs.contentRepositoryRoot,
				accessMode: stringValue(context.capacity?.workspaceAccessMode) ?? 'context_only',
				allowedPaths,
				forbiddenPaths,
				metadata: {
					auditRoot: inputs.auditRoot ?? null,
				},
			},
			metadata: {
				runId: context.runId,
				handler: 'research',
			},
		});
		const response = executionText(execution);
		const plan = contentPlanFromResponse({
			course: inputs.course,
			coreObjective: inputs.coreObjective,
			question: inputs.question,
			response,
		});
		const beforeFiles = listFiles(inputs.contentRepositoryRoot);
		const writtenFiles: string[] = [];
		const treeDxWrites: unknown[] = [];
		const decisionId = stringValue(inputs.approval?.decisionId) ?? `${slugSegment(inputs.course)}:workday-1:decision`;
		const bookPath = `src/content/books/${plan.bookSlug}.mdx`;
		const bookContent = bookDoc({
			bookSlug: plan.bookSlug,
			title: plan.bookTitle,
			summary: plan.bookSummary,
			description: plan.bookSummary,
			pages: plan.pages,
		});
		treeDxWrites.push(await writeTreeDxDocument(inputs.treeDx, bookPath, bookContent));
		writtenFiles.push(writeDocument(inputs.contentRepositoryRoot, bookPath, bookContent));
		for (const page of plan.pages) {
			const pageContent = markdownDoc({
				title: page.title,
				description: page.summary,
				summary: page.summary,
				body: page.body,
				bookSlug: plan.bookSlug,
				section: page.section,
				course: inputs.course,
				coreObjective: inputs.coreObjective,
				decisionId,
			});
			treeDxWrites.push(await writeTreeDxDocument(inputs.treeDx, page.path, pageContent));
			writtenFiles.push(writeDocument(inputs.contentRepositoryRoot, page.path, pageContent));
		}
		const treeDxCommit = await commitTreeDxWorkspace(inputs.treeDx, writtenFiles);
		if (Object.keys(inputs.treeDx ?? {}).length && !treeDxCommit) {
			throw new Error('TreeDX workspace metadata was provided but no TreeDX commit was produced.');
		}
		const afterFiles = listFiles(inputs.contentRepositoryRoot);
		return {
			status: execution.status === 'failed' ? 'failed' : 'completed',
			execution,
			prompt,
			response,
			contentPlan: plan,
			writtenFiles,
			changedFiles: afterFiles.filter((file) => !beforeFiles.includes(file) || writtenFiles.includes(file)),
			treeDx: {
				writes: treeDxWrites.filter(Boolean),
				commit: treeDxCommit,
			},
		};
	},

	async emitOutputs(_context: any, result: any) {
		return {
			status: result.status,
			summary: result.status === 'failed'
				? 'Researcher failed before producing content.'
				: result.status === 'waiting'
					? result.summary
				: `Started ${result.contentPlan.bookTitle} with ${result.writtenFiles.length} markdown file(s).`,
			metadata: {
				prompt: result.prompt,
				response: result.response,
				execution: result.execution,
				contentPlan: result.contentPlan,
				writtenFiles: result.writtenFiles,
				changedFiles: result.changedFiles,
				treeDx: result.treeDx,
				researchOutput: result.contentPlan ? {
					course: result.contentPlan.bookTitle,
					executionSummary: result.response,
					messages: [
						{ agent: 'Research planner', body: result.contentPlan.proposal },
						{ agent: 'Human approval simulator', body: result.contentPlan.decisionRecommendation },
						{ agent: 'Knowledge curator', body: `Created markdown files: ${result.writtenFiles.join(', ')}` },
					],
				} : null,
			},
		};
	},
};
