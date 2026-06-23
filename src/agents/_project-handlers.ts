type Inputs = {
	objective: string | null;
	triggerKind: string;
	messageType: string;
	verb: string;
	artifactKind: string;
};

type ContentArtifactRef = {
	contentPath: string;
	model: string;
	subjectId: string | null;
	artifactKind: string;
	sourceAssignmentId: string | null;
	producedByAgent: string | null;
	executionProviderRunId: string | null;
};

type Result = Inputs & {
	summary: string;
	executionSnapshot: Record<string, unknown>;
	contentArtifactRefs: ContentArtifactRef[];
};

type AgentHandlerOutput = {
	status: 'completed' | 'waiting' | 'failed';
	summary: string;
	stdout?: string;
	stderr?: string;
	metadata?: Record<string, unknown>;
};

type ProjectHandlerContext = {
	runId: string;
	repoRoot: string;
	coreObjective?: {
		path?: string | null;
		content?: string | null;
		message?: string | null;
	} | null;
	agent: {
		slug: string;
		systemPrompt?: string | null;
		execution?: {
			allowedPaths?: string[];
			forbiddenPaths?: string[];
			providerProfile?: {
				requiredCapabilities?: string[];
			} | null;
		} | null;
		outputs?: {
			messageTypes?: string[];
		} | null;
	};
	trigger: {
		kind: string;
		payload?: Record<string, unknown> | null;
	};
	capacity?: {
		assignmentId?: string | null;
		mode?: string | null;
		assignment?: Record<string, unknown> | null;
		envelope?: Record<string, unknown> | null;
		decisionInput?: Record<string, unknown> | null;
		projectAgentClass?: Record<string, unknown> | null;
		workspaceAccessMode?: string | null;
	} | null;
	execution: {
		start(input: Record<string, unknown>): Promise<Record<string, unknown>>;
	};
	mutations: {
		writeArtifact(input: {
			runId: string;
			agent: ProjectHandlerContext['agent'];
			relativePath: string;
			content: string;
			commitMessage: string;
		}): Promise<{ commitSha?: string | null }>;
	};
	sdk: {
		createMessage(message: {
			type: string;
			payload: Record<string, unknown>;
			relatedModel?: string | null;
			relatedId?: string | null;
		}): Promise<unknown>;
	};
};

type AgentHandler<TInputs, TResult> = {
	kind: string;
	resolveInputs(context: ProjectHandlerContext): Promise<TInputs> | TInputs;
	execute(context: ProjectHandlerContext, inputs: TInputs): Promise<TResult> | TResult;
	emitOutputs(context: ProjectHandlerContext, result: TResult): Promise<AgentHandlerOutput> | AgentHandlerOutput;
};

function objectiveText(context: ProjectHandlerContext) {
	return context.coreObjective?.content ?? context.coreObjective?.message ?? null;
}

function stringValue(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function recordValue(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown) {
	return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : [];
}

function slugPart(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'agent';
}

function yamlString(value: string | null) {
	return JSON.stringify(value ?? '');
}

function markdownFromExecution(snapshot: Record<string, unknown>) {
	const outputs = recordValue(snapshot.outputs);
	return stringValue(outputs.finalResponse)
		?? stringValue(outputs.stdout)
		?? stringValue(snapshot.summary)
		?? 'The execution provider completed without returning markdown output.';
}

function executionStatus(snapshot: Record<string, unknown>): 'completed' | 'waiting' | 'failed' {
	const status = stringValue(snapshot.status);
	if (status === 'completed') return 'completed';
	if (status === 'failed' || status === 'cancelled') return 'failed';
	return 'waiting';
}

function buildContentNote(context: ProjectHandlerContext, inputs: Inputs, snapshot: Record<string, unknown>) {
	const assignmentId = stringValue(context.capacity?.assignmentId);
	const executionProviderRunId = stringValue(snapshot.runId);
	const agentSlug = context.agent.slug;
	const createdAt = new Date().toISOString();
	const relativePath = [
		'src/content/notes/workday-tests',
		`${slugPart(context.runId)}-${slugPart(agentSlug)}-${slugPart(inputs.artifactKind)}.mdx`,
	].join('/');
	const body = markdownFromExecution(snapshot);
	const title = `${inputs.verb} by ${agentSlug}`;
	const content = [
		'---',
		`title: ${yamlString(title)}`,
		`description: ${yamlString(inputs.summary)}`,
		`date: ${yamlString(createdAt)}`,
		'status: draft',
		`artifactKind: ${yamlString(inputs.artifactKind)}`,
		`producedByAgent: ${yamlString(agentSlug)}`,
		`sourceAssignmentId: ${yamlString(assignmentId)}`,
		`executionProviderRunId: ${yamlString(executionProviderRunId)}`,
		'about:',
		'  model: objective',
		'  id: core',
		'relatedObjectives:',
		'  - core',
		'tags:',
		'  - workday-test',
		`  - ${inputs.artifactKind}`,
		'---',
		'',
		`# ${title}`,
		'',
		inputs.objective ? `Core objective: ${inputs.objective}` : 'Core objective: unavailable.',
		'',
		'## Execution Output',
		'',
		body,
		'',
		'## Audit Links',
		'',
		`- Agent: ${agentSlug}`,
		`- Assignment: ${assignmentId ?? 'unassigned'}`,
		`- Execution provider run: ${executionProviderRunId ?? 'unrecorded'}`,
	].join('\n');
	const ref: ContentArtifactRef = {
		contentPath: relativePath,
		model: 'note',
		subjectId: 'core',
		artifactKind: inputs.artifactKind,
		sourceAssignmentId: assignmentId,
		producedByAgent: agentSlug,
		executionProviderRunId,
	};
	return { relativePath, content, ref };
}

function createWorkPackage(context: ProjectHandlerContext, inputs: Inputs) {
	const mode = context.capacity?.mode === 'acting' ? 'acting' : 'planning';
	const allowedPaths = context.agent.execution?.allowedPaths?.length
		? context.agent.execution.allowedPaths
		: ['src/content/**'];
	const forbiddenPaths = context.agent.execution?.forbiddenPaths ?? [];
	return {
		kind: inputs.artifactKind,
		title: `${inputs.verb} for the Market core objective`,
		summary: inputs.summary,
		instructions: [
			context.agent.systemPrompt ?? `You are ${context.agent.slug}, a Market project agent.`,
			'',
			'Use TreeDX-supplied context as the authoritative project context. Produce useful planning output that can be preserved as a linked Knowledge Hub note.',
			'',
			'Knowledge Hub content conventions:',
			'- Market content root: src/content',
			'- Core objective: src/content/objectives/core.md',
			'- Planning, estimates, answers, feedback, and decisions should become linked MDX content artifacts.',
			'- Notes should link back to their subject through frontmatter such as about, relatedObjectives, relatedDecisions, relatedProposals, or relatedQuestions.',
			'',
			'Assignment input:',
			JSON.stringify({
				runId: context.runId,
				triggerKind: inputs.triggerKind,
				mode,
				objective: inputs.objective,
				assignmentId: context.capacity?.assignmentId ?? null,
				agent: context.agent.slug,
			}, null, 2),
			'',
			'Return concise markdown with recommendations, blockers, assumptions, and next actions. Do not mutate package source.',
		].join('\n'),
		context: {
			runId: context.runId,
			triggerKind: inputs.triggerKind,
			coreObjective: context.coreObjective ?? null,
			contentRoot: 'src/content',
			agentSlug: context.agent.slug,
			contextSource: 'treedx-rendered-mdx',
		},
		expectedOutputs: [{
			type: inputs.artifactKind,
			required: true,
			description: 'Markdown planning or feedback output that will be stored as a linked MDX note.',
		}],
		constraints: {
			mode,
			requiredCapabilities: stringArray(context.agent.execution?.providerProfile?.requiredCapabilities),
			allowedPaths,
			forbiddenPaths,
			metadata: {
				source: 'market_project_handler',
				contextSource: 'treedx-rendered-mdx',
			},
		},
		metadata: {
			artifactKind: inputs.artifactKind,
			projectOwnedHandler: true,
			contextSource: 'treedx-rendered-mdx',
		},
	};
}

function createProjectHandler(kind: string, messageType: string, verb: string, artifactKind: string): AgentHandler<Inputs, Result> {
	return {
		kind,
		async resolveInputs(context) {
			return {
				objective: objectiveText(context),
				triggerKind: context.trigger.kind,
				messageType,
				verb,
				artifactKind,
			};
		},
		async execute(context, inputs) {
			const assignment = recordValue(context.capacity?.assignment);
			if (!Object.keys(assignment).length || !context.capacity?.envelope || !context.capacity?.decisionInput) {
				throw new Error(`${context.agent.slug} requires a capacity assignment before it can invoke the execution provider.`);
			}
			const workPackage = createWorkPackage(context, inputs);
			const snapshot = await context.execution.start({
				assignment,
				capacityEnvelope: context.capacity.envelope,
				decisionInput: context.capacity.decisionInput,
				agent: context.agent,
				workPackage,
				leaseToken: null,
				runnerId: stringValue(assignment.runnerId) ?? 'market-project-handler',
				projectAgentClass: context.capacity.projectAgentClass ?? null,
				workspace: {
					repoRoot: context.repoRoot,
					accessMode: context.capacity.workspaceAccessMode ?? 'context_only',
					allowedPaths: workPackage.constraints.allowedPaths,
					forbiddenPaths: workPackage.constraints.forbiddenPaths,
				},
				metadata: {
					runId: context.runId,
					handler: kind,
					artifactKind,
					projectOwnedHandler: true,
				},
			});
			const status = executionStatus(snapshot);
			const contentArtifactRefs: ContentArtifactRef[] = [];
			if (status === 'completed') {
				const note = buildContentNote(context, inputs, snapshot);
				const mutation = await context.mutations.writeArtifact({
					runId: context.runId,
					agent: context.agent,
					relativePath: note.relativePath,
					content: note.content,
					commitMessage: `Add ${inputs.artifactKind} note from ${context.agent.slug}`,
				});
				contentArtifactRefs.push({
					...note.ref,
					...(mutation.commitSha ? { commitSha: mutation.commitSha } : {}),
				});
			}
			return {
				...inputs,
				summary: stringValue(snapshot.summary) ?? `${verb}: execution provider returned ${status}.`,
				executionSnapshot: snapshot,
				contentArtifactRefs,
			};
		},
		async emitOutputs(context, result) {
			await context.sdk.createMessage({
				type: result.messageType,
				payload: {
					handler: kind,
					runId: context.runId,
					triggerKind: result.triggerKind,
					objective: result.objective,
					projectOwnedHandler: true,
					contextSource: 'treedx-rendered-mdx',
					contentArtifactRefs: result.contentArtifactRefs,
					executionProviderRunId: stringValue(result.executionSnapshot.runId),
				},
				relatedModel: result.contentArtifactRefs[0]?.model ?? 'objective',
				relatedId: result.contentArtifactRefs[0]?.contentPath ?? 'core',
			});
			const status = executionStatus(result.executionSnapshot);
			const outputs = recordValue(result.executionSnapshot.outputs);
			return {
				status,
				summary: result.summary,
				stdout: stringValue(outputs.stdout) ?? stringValue(outputs.finalResponse) ?? undefined,
				stderr: stringValue(outputs.stderr) ?? undefined,
				metadata: {
					kind: 'content_artifact_refs',
					type: 'content_artifact_refs',
					artifact: {
						kind: 'content_artifact_refs',
						items: result.contentArtifactRefs,
					},
					contentArtifactRefs: result.contentArtifactRefs,
					executionSnapshot: result.executionSnapshot,
					projectOwnedHandler: true,
					contextSource: 'treedx-rendered-mdx',
				},
			};
		},
	};
}

export const planHandler = createProjectHandler('plan', 'objective_priority_updated', 'Prepared planning proposal', 'planning_note');
export const actHandler = createProjectHandler('act', 'task_waiting', 'Prepared implementation plan awaiting approval', 'implementation_note');
export const reviewHandler = createProjectHandler('review', 'task_verified', 'Prepared review report', 'review_note');
export const reportHandler = createProjectHandler('report', 'report_created', 'Prepared report', 'workday_report_note');
