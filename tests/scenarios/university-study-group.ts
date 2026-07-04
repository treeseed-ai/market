#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { Client as PgClient } from 'pg';

const root = resolve(new URL('../..', import.meta.url).pathname);
const apiBase = process.env.TREESEED_API_BASE_URL ?? 'http://127.0.0.1:3000';
const runId = process.env.TREESEED_STUDY_GROUP_RUN_ID ?? `study-${Date.now().toString(36)}`;
const outputRoot = resolve(process.env.TREESEED_STUDY_GROUP_OUTPUT_DIR ?? join(root, 'test-results/study-group', runId));
const scenarioResultsRoot = resolve(root, 'test-results/study-group');
const providerDataDir = join(outputRoot, 'provider-data');
const reportPath = join(outputRoot, 'scenario-report.json');
const auditRoot = join(outputRoot, 'audit');
const candidatesRoot = join(outputRoot, 'knowledge-pack-candidates');
const aggregateKnowledgeRoot = join(outputRoot, 'knowledge-packs');
const reportsRoot = join(outputRoot, 'reports');
const treeDxBaseUrl = process.env.TREESEED_TREEDX_URL ?? 'http://127.0.0.1:4000';
const defaultCodexAuthFile = process.env.TREESEED_CODEX_HOME
	? join(process.env.TREESEED_CODEX_HOME, 'auth.json')
	: process.env.CODEX_HOME
		? join(process.env.CODEX_HOME, 'auth.json')
		: join(process.env.HOME || homedir(), '.codex', 'auth.json');
const codexAuthConfigured = Boolean(
	process.env.TREESEED_CODEX_AUTH_FILE
	|| process.env.CODEX_AUTH_FILE
	|| process.env.TREESEED_CODEX_AUTH_JSON_B64
	|| existsSync(defaultCodexAuthFile),
);
const shouldReset = process.env.TREESEED_STUDY_GROUP_SKIP_RESET !== '1';
const databaseUrl = process.env.TREESEED_DATABASE_URL ?? 'postgresql://treeseed:treeseed-local-dev@127.0.0.1:54329/treeseed_api';
const workdayWallMinutes = 15;

const courses = [
	{
		slug: 'psychology-101',
		name: 'Psychology 101',
		objective: 'Build a beginner-friendly research guide that explains major psychological perspectives, landmark experiments, ethical constraints, and study habits for an introductory psychology student.',
		questions: [
			'What book structure should this project start with so an introductory psychology student can learn from evidence without memorizing isolated facts?',
			'Which first page should make the project useful after one workday?',
		],
	},
	{
		slug: 'macro-economics-301',
		name: 'Macro Economics 301',
		objective: 'Create an upper-division macroeconomics knowledge book that connects GDP, inflation, unemployment, fiscal policy, monetary policy, open-economy tradeoffs, and current-data interpretation.',
		questions: [
			'What book structure should this project start with so an upper-division student can interpret macroeconomic data and policy tradeoffs?',
			'Which first page should make the project useful after one workday?',
		],
	},
	{
		slug: 'art-history',
		name: 'Art History',
		objective: 'Produce a visual-analysis study pack that helps a student compare movements, patronage, materials, iconography, museum context, and exam-ready attribution evidence.',
		questions: [
			'What book structure should this project start with so an art history student can turn observation into defensible attribution evidence?',
			'Which first page should make the project useful after one workday?',
		],
	},
];

function serviceHeaders() {
	return {
		'content-type': 'application/json',
		'x-treeseed-service-id': 'web',
		'x-treeseed-service-secret': 'treeseed-web-service-dev-secret',
		'x-treeseed-acceptance-email-bypass': '1',
	};
}

function extractCookies(headers) {
	const cookies = [];
	if (typeof headers.getSetCookie === 'function') cookies.push(...headers.getSetCookie());
	const single = headers.get('set-cookie');
	if (single) cookies.push(single);
	return cookies.map((cookie) => cookie.split(';')[0]).filter(Boolean);
}

class Client {
	constructor() {
		this.cookies = [];
		this.accessToken = null;
	}

	cookieHeader() {
		return this.cookies.join('; ');
	}

	async request(method, path, body, headers = {}) {
		let response;
		for (let attempt = 0; attempt < 4; attempt += 1) {
			try {
				response = await fetch(`${apiBase}${path}`, {
					method,
					headers: {
						accept: 'application/json',
						...(body === undefined ? {} : { 'content-type': 'application/json' }),
						...(this.cookies.length ? { cookie: this.cookieHeader() } : {}),
						...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
						...headers,
					},
					body: body === undefined ? undefined : JSON.stringify(body),
				});
				break;
			} catch (error) {
				if (attempt === 3) {
					const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : '';
					throw new Error(`${method} ${path} fetch failed${cause}`);
				}
				await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
			}
		}
		const nextCookies = extractCookies(response.headers);
		for (const cookie of nextCookies) {
			const name = cookie.split('=')[0];
			this.cookies = this.cookies.filter((existing) => existing.split('=')[0] !== name);
			this.cookies.push(cookie);
		}
		const payload = await response.json().catch(() => null);
		if (!response.ok) {
			throw new Error(`${method} ${path} failed with ${response.status}: ${payload?.error ?? JSON.stringify(payload)}`);
		}
		if (typeof payload?.payload?.accessToken === 'string') this.accessToken = payload.payload.accessToken;
		return payload?.payload ?? payload;
	}

	get(path) {
		return this.request('GET', path);
	}

	post(path, body, headers) {
		return this.request('POST', path, body, headers);
	}

	put(path, body) {
		return this.request('PUT', path, body);
	}
}

function slugId(value) {
	return value.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 54);
}

function ensureDir(path) {
	mkdirSync(path, { recursive: true });
	return path;
}

function writeJson(path, value) {
	ensureDir(dirname(path));
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(path, value) {
	ensureDir(dirname(path));
	writeFileSync(path, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function extractJsonPayload(stdout) {
	const lines = stdout.trim().split('\n');
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		if (!lines[index].trim().startsWith('{')) continue;
		try {
			return JSON.parse(lines.slice(index).join('\n'));
		} catch {
			// Continue searching for a pretty-printed JSON block.
		}
	}
	return null;
}

function sha256File(path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function listFiles(rootDir) {
	const files = [];
	const visit = (dir) => {
		if (!existsSync(dir)) return;
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				visit(fullPath);
			} else if (entry.isFile()) {
				files.push(relative(rootDir, fullPath).replace(/\\/gu, '/'));
			}
		}
	};
	visit(rootDir);
	return files.sort();
}

function fileSummaries(rootDir) {
	return listFiles(rootDir).map((path) => {
		const fullPath = join(rootDir, path);
		return {
			path,
			bytes: statSync(fullPath).size,
			sha256: sha256File(fullPath),
		};
	});
}

function redact(value) {
	if (Array.isArray(value)) return value.map(redact);
	if (!value || typeof value !== 'object') return value;
	const redacted = {};
	for (const [key, entry] of Object.entries(value)) {
		if (/api.?key|secret|token|auth|password/iu.test(key)) {
			redacted[key] = '<redacted>';
		} else {
			redacted[key] = redact(entry);
		}
	}
	return redacted;
}

function stripFrontmatter(markdown) {
	return String(markdown ?? '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').trim();
}

function frontmatterValue(markdown, key) {
	const match = String(markdown ?? '').match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?\\s*$`, 'imu'));
	return match?.[1]?.trim() ?? null;
}

function contentTitle(contentRoot, relativePath) {
	const markdown = readFileSync(join(contentRoot, relativePath), 'utf8');
	return frontmatterValue(markdown, 'title') ?? markdown.match(/^#\s+(.+)$/mu)?.[1]?.trim() ?? relativePath;
}

function readTaskAudit(auditDir) {
	return {
		prompt: existsSync(join(auditDir, 'prompt.md')) ? readFileSync(join(auditDir, 'prompt.md'), 'utf8') : '',
		response: existsSync(join(auditDir, 'response.md')) ? readFileSync(join(auditDir, 'response.md'), 'utf8') : '',
		config: existsSync(join(auditDir, 'config.json')) ? JSON.parse(readFileSync(join(auditDir, 'config.json'), 'utf8')) : {},
		actions: existsSync(join(auditDir, 'actions.jsonl'))
			? readFileSync(join(auditDir, 'actions.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
			: [],
	};
}

function auditAction(audit, kind) {
	return audit.actions.find((action) => action?.kind === kind) ?? null;
}

function latestTreeDxWriteTimestamp(treeDx) {
	const timestamps = (treeDx?.writes ?? [])
		.map((write) => write?.readback?.stat?.mtime)
		.filter(Boolean)
		.sort();
	return timestamps.at(-1) ?? null;
}

function summarizeAuditAction(action) {
	if (action?.kind === 'provider_task_created') {
		return {
			kind: action.kind,
			providerTask: {
				id: action.providerTask?.id,
				projectId: action.providerTask?.projectId,
				operation: action.providerTask?.operation,
				status: action.providerTask?.status,
				createdAt: action.providerTask?.createdAt,
				updatedAt: action.providerTask?.updatedAt,
				agentSlug: action.providerTask?.input?.agentSlug,
				course: action.providerTask?.input?.course,
				workDayId: action.providerTask?.input?.workDayId,
			},
		};
	}
	if (action?.kind === 'treedx_workspace_committed') {
		return {
			kind: action.kind,
			treeDx: {
				apiBaseUrl: action.treeDx?.apiBaseUrl,
				proxyBasePath: action.treeDx?.proxyBasePath,
				observedTreeDxBaseUrl: action.treeDx?.observedTreeDxBaseUrl,
				repoId: action.treeDx?.repoId,
				workspaceId: action.treeDx?.workspaceId,
				branchName: action.treeDx?.branchName,
				commit: action.treeDx?.commit?.commit ?? action.treeDx?.commit,
				writePaths: (action.treeDx?.writes ?? []).map((write) => write?.path).filter(Boolean),
			},
		};
	}
	return action;
}

function buildActivityTimeline(report) {
	const events = [];
	const scenarioStartedAt = report.privateTreeDx?.instance?.createdAt ?? new Date().toISOString();
	const add = (event) => events.push({
		at: event.at ?? scenarioStartedAt,
		...event,
	});
	add({
		at: scenarioStartedAt,
		kind: 'scenario_started',
		actor: 'system',
		channel: 'system-check',
		title: 'Started auditable university study-group scenario',
		summary: `Run ${report.runId} started with clean local state and live Codex execution required.`,
		context: { runId: report.runId, apiBase: report.apiBase, outputRoot: report.outputRoot, reset: report.reset },
	});
	add({
		at: report.student.createdAt ?? scenarioStartedAt,
		kind: 'student_registered',
		actor: report.student.username,
		channel: 'api',
		title: 'Registered and confirmed student account',
		summary: `Created local demo student ${report.student.email}.`,
		context: { student: report.student },
	});
	add({
		at: report.privateTreeDx?.instance?.createdAt ?? scenarioStartedAt,
		kind: 'team_created',
		actor: report.student.username,
		channel: 'api',
		title: 'Created private study group team',
		summary: `Created ${report.team.displayName}; private TreeDX was automatically provisioned as desired state.`,
		context: { team: report.team, privateTreeDx: report.privateTreeDx },
	});
	add({
		at: report.capacityProvider?.executionProvider?.createdAt ?? scenarioStartedAt,
		kind: 'capacity_provider_registered',
		actor: 'provider-runtime',
		channel: 'provider-runtime',
		title: 'Registered Codex subscription capacity provider',
		summary: `Registered provider ${report.capacityProvider.id} with ${report.capacityProvider.workdayWallMinutes} wall minutes per workday.`,
		context: { capacityProvider: report.capacityProvider },
	});
	add({
		at: report.portfolioAllocationSavedAt ?? scenarioStartedAt,
		kind: 'portfolio_allocation_saved',
		actor: report.student.username,
		channel: 'api',
		title: 'Allocated portfolio capacity across course projects',
		summary: 'Allocated one third of portfolio capacity to each course project.',
		context: { portfolioAllocation: report.portfolioAllocation, projectAgentAllocation: report.projectAgentAllocation },
	});
	for (const project of report.projects) {
		const audit = readTaskAudit(project.auditDir);
		const providerTaskCreated = auditAction(audit, 'provider_task_created');
		const providerTaskCompleted = auditAction(audit, 'provider_task_completed');
		const treeDxCommitted = auditAction(audit, 'treedx_workspace_committed');
		const projectCreatedAt = project.treeDxVerification?.library?.createdAt
			?? providerTaskCreated?.providerTask?.createdAt
			?? scenarioStartedAt;
		const decisionAt = project.requestContext?.payload?.approval?.decidedAt ?? project.decision?.decidedAt ?? projectCreatedAt;
		const workdayRequestedAt = providerTaskCreated?.providerTask?.createdAt ?? decisionAt;
		const treeDxCommittedAt = latestTreeDxWriteTimestamp(treeDxCommitted?.treeDx ?? project.treeDxVerification?.treeDx)
			?? providerTaskCompleted?.finishedAt
			?? workdayRequestedAt;
		add({
			at: projectCreatedAt,
			kind: 'project_created',
			actor: report.student.username,
			channel: 'api',
			project: project.course,
			title: `Created ${project.course} research project`,
			summary: `Created project ${project.projectId} with TreeDX content repository and host-visible site/parent workspaces.`,
			context: {
				projectId: project.projectId,
				workspace: project.workspace,
				repositoryTopology: project.repositoryTopology,
				treeDxLibrary: project.treeDxVerification?.library,
			},
		});
		add({
			at: projectCreatedAt,
			kind: 'objective_set',
			actor: report.student.username,
			channel: 'api',
			project: project.course,
			title: `Set ${project.course} core objective`,
			summary: project.requestContext?.payload?.coreObjective ?? project.requestContext?.metadata?.coreObjective ?? null,
			context: {
				objective: project.requestContext?.payload?.coreObjective ?? project.requestContext?.metadata?.coreObjective ?? null,
				questions: project.requestContext?.payload?.questions ?? [],
			},
		});
		add({
			at: decisionAt,
			kind: 'proposal_created',
			actor: 'scenario-human-simulator',
			channel: 'api',
			project: project.course,
			title: project.proposal.title,
			summary: project.proposal.rationale,
			context: { proposal: project.proposal },
		});
		add({
			at: decisionAt,
			kind: 'decision_made',
			actor: project.decision.actor,
			channel: 'api',
			project: project.course,
			title: `Approved ${project.course} workday proposal`,
			summary: project.decision.rationale,
			context: { decision: project.decision },
		});
		add({
			at: workdayRequestedAt,
			kind: 'workday_requested',
			actor: report.student.username,
			channel: 'api',
			project: project.course,
			title: `Requested one live workday for ${project.course}`,
			summary: `Submitted workday request with ${report.capacityProvider.workdayWallMinutes} wall-minute cap.`,
			context: project.requestContext ?? {},
		});
		add({
			at: workdayRequestedAt,
			kind: 'agent_prompted',
			actor: 'researcher-agent',
			channel: 'provider-runtime',
			project: project.course,
			title: `Sent context to researcher agent for ${project.course}`,
			summary: 'The prompt and request context were passed to the live Codex-backed provider task.',
			context: {
				prompt: audit.prompt,
				config: audit.config,
				requestContext: project.requestContext ?? {},
			},
		});
		add({
			at: treeDxCommittedAt,
			kind: 'agent_response_received',
			actor: 'researcher-agent',
			channel: 'provider-runtime',
			project: project.course,
			title: `Received researcher response for ${project.course}`,
			summary: project.summary?.summary ?? project.summary ?? `Completed task ${project.taskId}.`,
			context: {
				taskId: project.taskId,
				response: audit.response,
				actions: audit.actions.map(summarizeAuditAction),
			},
		});
		add({
			at: treeDxCommittedAt,
			kind: 'treedx_content_committed',
			actor: 'researcher-agent',
			channel: 'treedx',
			project: project.course,
			title: `Committed ${project.course} content through TreeDX`,
			summary: `TreeDX committed ${project.treeDxVerification?.treeDx?.commit?.commit?.changedPaths?.length ?? 0} changed path(s).`,
			context: project.treeDxVerification?.treeDx ?? {},
		});
		add({
			at: project.coreKnowledgePack?.bookPackages?.[0]?.createdAt ?? treeDxCommittedAt,
			kind: 'knowledge_pack_exported',
			actor: 'system',
			channel: 'cli',
			project: project.course,
			title: `Exported ${project.course} Core book packages`,
			summary: `Created ${project.coreKnowledgePack?.bookPackages?.length ?? 0} book package(s) and one project library package.`,
			context: project.coreKnowledgePack,
		});
	}
	add({
		at: report.projects?.at(-1)?.treeDxVerification?.treeDx
			? latestTreeDxWriteTimestamp(report.projects.at(-1).treeDxVerification.treeDx)
			: scenarioStartedAt,
		kind: 'study_group_pack_exported',
		actor: 'system',
		channel: 'cli',
		title: 'Exported combined study-group knowledge package',
		summary: 'Bundled the three project library packages into one portable markdown file.',
		context: report.studyGroupKnowledgePack,
	});
	return events.sort((left, right) => String(left.at).localeCompare(String(right.at)));
}

function renderContextBlock(value) {
	const markdown = value?.contextPack?.markdown
		?? value?.payload?.contextPack?.markdown
		?? value?.requestContext?.payload?.contextPack?.markdown
		?? value?.requestContext?.contextPack?.markdown;
	if (markdown) return String(markdown).trim();
	const envelope = redact(JSON.parse(JSON.stringify(value ?? {})));
	return [
		'```json',
		JSON.stringify(envelope, null, 2),
		'```',
	].join('\n');
}

function renderActivityLogMarkdown(events) {
	return [
		'# Study Group Activity Log',
		'',
		'This timeline keeps the user-visible operations, provider work, request context, agent prompts, responses, decisions, TreeDX activity, and exported assets together in chronological order.',
		'',
		...events.flatMap((event, index) => [
			`## ${index + 1}. ${event.title}`,
			'',
			`- Time: ${event.at}`,
			`- Kind: ${event.kind}`,
			`- Actor: ${event.actor ?? 'unknown'}`,
			`- Channel: ${event.channel ?? 'unknown'}`,
			event.project ? `- Project: ${event.project}` : null,
			'',
			event.summary ? `${event.summary}` : '',
			'',
			'<details>',
			'<summary>Context</summary>',
			'',
			renderContextBlock(event.context),
			'',
			'</details>',
			'',
		].filter((entry) => entry !== null)),
	].join('\n');
}

function renderReadableKnowledge(projectResults) {
	const sections = ['# University Study Group Readable Knowledge', '', 'This file is the human-readable study output without package manifests. It is derived from the same agent-generated Core content that the portable package files bundle.', ''];
	for (const project of projectResults) {
		sections.push(`## ${project.course}`, '');
		sections.push(`Objective: ${project.requestContext?.payload?.coreObjective ?? project.requestContext?.metadata?.coreObjective ?? 'Unknown objective'}`, '');
		for (const file of project.contentValidation.knowledgeFiles) {
			const fullPath = join(project.workspace.content, file.path);
			const markdown = readFileSync(fullPath, 'utf8');
			sections.push(stripFrontmatter(markdown), '');
		}
	}
	return sections.join('\n');
}

function renderActivityReport(report, events) {
	const lines = [
		'# Study Group Activity Report',
		'',
		`Run: ${report.runId}`,
		`Output root: ${report.outputRoot}`,
		`Student: ${report.student.username} <${report.student.email}>`,
		`Team: ${report.team.displayName} (${report.team.id})`,
		'',
		'## Executive Summary',
		'',
		`The scenario created one private university study group, three research projects, a Codex-backed capacity provider with a ${report.capacityProvider.workdayWallMinutes} wall-minute workday cap, and one approved live workday per project. Each workday produced TreeDX-committed content and Core-compatible portable book packages.`,
		'',
		'## Questions Asked',
		'',
	];
	for (const project of report.projects) {
		lines.push(`### ${project.course}`, '');
		for (const question of project.requestContext?.payload?.questions ?? []) lines.push(`- ${question}`);
		lines.push('');
	}
	lines.push('## Objectives Set', '');
	for (const project of report.projects) {
		lines.push(`- ${project.course}: ${project.requestContext?.payload?.coreObjective ?? project.requestContext?.metadata?.coreObjective ?? 'Unknown objective'}`);
	}
	lines.push('', '## Proposals Created', '');
	for (const project of report.projects) {
		lines.push(`- ${project.proposal.id}: ${project.proposal.title}. ${project.proposal.rationale}`);
	}
	lines.push('', '## Decisions Made', '');
	for (const project of report.projects) {
		lines.push(`- ${project.decision.id}: ${project.decision.verdict} by ${project.decision.actor}. ${project.decision.rationale}`);
	}
	lines.push('', '## Notes And Content Produced', '');
	for (const project of report.projects) {
		lines.push(`### ${project.course}`, '');
		lines.push(`Task: ${project.taskId}`);
		lines.push(`Audit: ${project.auditDir}`);
		lines.push(`Content repository mirror: ${project.workspace.content}`);
		lines.push(`TreeDX repo: ${project.treeDxVerification?.treeDx?.repoId}`);
		lines.push(`TreeDX commit: ${project.treeDxVerification?.treeDx?.commit?.commit?.commitSha}`);
		lines.push('');
		for (const file of project.contentValidation.knowledgeFiles) {
			lines.push(`- ${contentTitle(project.workspace.content, file.path)} (${file.path})`);
		}
		lines.push('');
	}
	lines.push('## Exported Assets', '');
	lines.push(`- Combined readable knowledge: ${join(aggregateKnowledgeRoot, 'study-group-readable-knowledge.md')}`);
	lines.push(`- Combined portable package: ${report.studyGroupKnowledgePack.markdownPath}`);
	for (const project of report.projects) {
		for (const book of project.coreKnowledgePack.bookPackages ?? []) lines.push(`- ${project.course} book package: ${book.markdownPath}`);
		lines.push(`- ${project.course} project library package: ${project.coreKnowledgePack.libraryPackage.markdownPath}`);
	}
	lines.push('', '## Activity Timeline', '');
	for (const event of events) {
		lines.push(`- ${event.at} [${event.channel}] ${event.kind}: ${event.title}${event.project ? ` (${event.project})` : ''}`);
	}
	return lines.join('\n');
}

function writeActivityArtifacts(report) {
	ensureDir(reportsRoot);
	const events = buildActivityTimeline(report);
	const jsonlPath = join(reportsRoot, 'activity-log.jsonl');
	const jsonPath = join(reportsRoot, 'activity-log.json');
	const markdownPath = join(reportsRoot, 'activity-log.md');
	const reportMarkdownPath = join(reportsRoot, 'activity-report.md');
	const readableKnowledgePath = join(aggregateKnowledgeRoot, 'study-group-readable-knowledge.md');
	writeText(jsonlPath, events.map((event) => JSON.stringify(redact(event))).join('\n'));
	writeJson(jsonPath, { runId: report.runId, events: redact(events) });
	writeText(markdownPath, renderActivityLogMarkdown(events));
	writeText(reportMarkdownPath, renderActivityReport(report, events));
	writeText(readableKnowledgePath, renderReadableKnowledge(report.projects));
	return {
		activityLogJsonl: jsonlPath,
		activityLogJson: jsonPath,
		activityLogMarkdown: markdownPath,
		activityReportMarkdown: reportMarkdownPath,
		readableKnowledgeMarkdown: readableKnowledgePath,
	};
}

async function resetScenarioState() {
	rmSync(scenarioResultsRoot, { recursive: true, force: true });
	const client = new PgClient({ connectionString: databaseUrl });
	await client.connect();
	const run = async (sql, params = []) => {
		try {
			await client.query(sql, params);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!/does not exist|undefined_table|column .* does not exist/iu.test(message)) throw error;
		}
	};
	const teams = (await client.query(
		`SELECT id FROM teams
		 WHERE slug LIKE 'university-study-group-%'
		    OR name LIKE 'university-study-group-%'
		    OR metadata_json::text LIKE '%"scenario":"university-study-group"%'`,
	)).rows.map((row) => row.id);
	const projects = teams.length
		? (await client.query(`SELECT id FROM projects WHERE team_id::text = ANY($1::text[])`, [teams])).rows.map((row) => row.id)
		: [];
	const providers = teams.length
		? (await client.query(`SELECT id FROM capacity_providers WHERE team_id::text = ANY($1::text[])`, [teams])).rows.map((row) => row.id)
		: [];
	const users = (await client.query(
		`SELECT user_id AS id FROM market_auth_credentials
		 WHERE email LIKE 'student+study-%@university.example'
		    OR username LIKE 'student-study-%'`,
	)).rows.map((row) => row.id);
	if (projects.length) {
		for (const table of [
			'remote_job_events',
			'task_outputs',
			'task_events',
			'tasks',
			'graph_runs',
			'reports',
			'project_workday_summaries',
			'workday_requests',
			'workday_manager_leases',
			'worker_runners',
			'work_days',
			'project_capability_grants',
			'project_connections',
			'project_deployment_events',
			'project_deployments',
			'project_environments',
			'project_hosting',
			'project_infrastructure_resources',
			'project_summary_snapshots',
			'project_update_plans',
			'hub_workspace_links',
			'treedx_project_libraries',
		]) {
			if (table === 'remote_job_events') {
				await run(`DELETE FROM remote_job_events WHERE job_id IN (SELECT id FROM remote_jobs WHERE project_id::text = ANY($1::text[]))`, [projects]);
			} else if (table === 'task_outputs') {
				await run(`DELETE FROM task_outputs WHERE task_id IN (SELECT id FROM tasks WHERE work_day_id IN (SELECT id FROM work_days WHERE project_id::text = ANY($1::text[])))`, [projects]);
			} else if (table === 'task_events') {
				await run(`DELETE FROM task_events WHERE task_id IN (SELECT id FROM tasks WHERE work_day_id IN (SELECT id FROM work_days WHERE project_id::text = ANY($1::text[])))`, [projects]);
			} else if (table === 'tasks') {
				await run(`DELETE FROM tasks WHERE work_day_id IN (SELECT id FROM work_days WHERE project_id::text = ANY($1::text[]))`, [projects]);
			} else if (table === 'graph_runs' || table === 'reports') {
				await run(`DELETE FROM ${table} WHERE work_day_id IN (SELECT id FROM work_days WHERE project_id::text = ANY($1::text[]))`, [projects]);
			} else {
				await run(`DELETE FROM ${table} WHERE project_id::text = ANY($1::text[])`, [projects]);
			}
		}
		await run(`DELETE FROM remote_jobs WHERE project_id::text = ANY($1::text[])`, [projects]);
		await run(`DELETE FROM capacity_grants WHERE project_id::text = ANY($1::text[])`, [projects]);
		await run(`DELETE FROM catalog_items WHERE team_id::text = ANY($1::text[]) AND kind = 'project'`, [teams]);
		await run(`DELETE FROM projects WHERE id::text = ANY($1::text[])`, [projects]);
	}
	if (providers.length) {
		for (const table of [
			'capacity_ledger_entries',
			'capacity_reservations',
			'capacity_routing_decisions',
			'capacity_provider_registrations',
			'capacity_provider_api_keys',
			'capacity_provider_deployments',
			'capacity_provider_hosts',
			'capacity_provider_lanes',
			'capacity_grants',
		]) {
			await run(`DELETE FROM ${table} WHERE capacity_provider_id::text = ANY($1::text[])`, [providers]);
		}
		await run(`DELETE FROM execution_provider_observations WHERE execution_provider_id IN (SELECT id FROM execution_providers WHERE capacity_provider_id::text = ANY($1::text[]))`, [providers]);
		await run(`DELETE FROM execution_provider_native_limits WHERE execution_provider_id IN (SELECT id FROM execution_providers WHERE capacity_provider_id::text = ANY($1::text[]))`, [providers]);
		await run(`DELETE FROM execution_providers WHERE capacity_provider_id::text = ANY($1::text[])`, [providers]);
		await run(`DELETE FROM capacity_providers WHERE id::text = ANY($1::text[])`, [providers]);
	}
	if (teams.length) {
		for (const table of [
			'knowledge_packs',
			'team_inbox_items',
			'team_invites',
			'team_storage_locators',
			'team_web_hosts',
			'repository_hosts',
			'provider_credential_sessions',
			'treedx_shares',
			'treedx_mirrors',
			'treedx_deployments',
			'treedx_instances',
			'team_role_bindings',
			'team_memberships',
			'team_api_keys',
			'capacity_grants',
		]) {
			if (table === 'team_role_bindings') {
				await run(`DELETE FROM team_role_bindings WHERE team_membership_id IN (SELECT id FROM team_memberships WHERE team_id::text = ANY($1::text[]))`, [teams]);
			} else if (table === 'treedx_deployments') {
				await run(`DELETE FROM treedx_deployments WHERE instance_id IN (SELECT id FROM treedx_instances WHERE team_id::text = ANY($1::text[]))`, [teams]);
			} else {
				await run(`DELETE FROM ${table} WHERE team_id::text = ANY($1::text[])`, [teams]);
			}
		}
		await run(`DELETE FROM teams WHERE id::text = ANY($1::text[])`, [teams]);
	}
	if (users.length) {
		for (const table of [
			'auth_sessions',
			'user_role_bindings',
			'user_preferences',
			'user_identities',
			'user_email_addresses',
			'market_auth_password_resets',
			'market_auth_credentials',
			'users',
		]) {
			await run(`DELETE FROM ${table} WHERE user_id::text = ANY($1::text[])`, [users]);
		}
		await run(`DELETE FROM better_auth_session WHERE "userId"::text = ANY($1::text[])`, [users]);
		await run(`DELETE FROM better_auth_account WHERE "userId"::text = ANY($1::text[])`, [users]);
		await run(`DELETE FROM better_auth_user WHERE id::text = ANY($1::text[])`, [users]);
	}
	await run(`DELETE FROM better_auth_verification WHERE identifier LIKE 'market-email-confirmation:%student+study-%@university.example%' OR value LIKE 'confirm_%'`);
	await client.end();
	return { teams: teams.length, projects: projects.length, providers: providers.length, users: users.length };
}

async function waitForApi() {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		const response = await fetch(`${apiBase}/healthz`).catch(() => null);
		if (response?.ok) return;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`Timed out waiting for ${apiBase}/healthz`);
}

async function waitForTreeDx() {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		const response = await fetch(`${treeDxBaseUrl}/api/v1/ready`).catch(() => null);
		if (response?.ok) return;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`Timed out waiting for local TreeDX at ${treeDxBaseUrl}/api/v1/ready`);
}

async function treeDxProxyRequest(client, projectId, method, path, body) {
	return client.request(method, `/v1/dx/projects/${encodeURIComponent(projectId)}${path}`, body);
}

async function createTreeDxContentWorkspace(client, project, team) {
	const repositoryName = slugId(`${team.slug ?? team.name}-${project.course.slug}-${runId}`).slice(0, 72);
	const repoResponse = await treeDxProxyRequest(client, project.id, 'POST', '/repos', {
		repositoryName,
		source: { type: 'empty' },
		placement: { mode: 'local' },
	});
	const repo = repoResponse.repo ?? repoResponse.repository ?? repoResponse;
	const repoId = repo.repoId ?? repo.id;
	if (!repoId) throw new Error(`TreeDX did not return a repo id for ${project.course.name}.`);
	const branchName = `refs/heads/agent/${project.course.slug}-workday-1`;
	const workspace = await treeDxProxyRequest(client, project.id, 'POST', `/repos/${encodeURIComponent(repoId)}/workspaces`, {
		baseRef: 'refs/heads/main',
		branchName,
		mode: 'writable',
		allowedPaths: ['src/content/**'],
		ttlSeconds: 1800,
	});
	if (!workspace.workspaceId) throw new Error(`TreeDX did not return a workspace id for ${project.course.name}.`);
	return {
		apiBaseUrl: apiBase,
		proxyBasePath: `/v1/dx/projects/${project.id}`,
		repo,
		repoId,
		repositoryName,
		workspace,
		workspaceId: workspace.workspaceId,
		branchName,
	};
}

function contextMdxDocument({ title, description, body, course, kind }) {
	return [
		'---',
		`title: ${JSON.stringify(title)}`,
		`description: ${JSON.stringify(description)}`,
		`summary: ${JSON.stringify(description)}`,
		'type: context',
		'status: active',
		'generated_by: treeseed-scenario',
		`context_kind: ${JSON.stringify(kind)}`,
		`course: ${JSON.stringify(course)}`,
		`run_id: ${JSON.stringify(runId)}`,
		'---',
		'',
		`# ${title}`,
		'',
		body.trim(),
		'',
	].join('\n');
}

async function writeTreeDxContextFile(project, relativePath, content) {
	await treeDxProxyRequest(
		project.client,
		project.id,
		'PUT',
		`/workspaces/${encodeURIComponent(project.treeDxContent.workspaceId)}/files?path=${encodeURIComponent(relativePath)}`,
		{ encoding: 'utf8', content },
	);
	const readback = await treeDxProxyRequest(
		project.client,
		project.id,
		'GET',
		`/workspaces/${encodeURIComponent(project.treeDxContent.workspaceId)}/files?path=${encodeURIComponent(relativePath)}`,
		undefined,
	);
	const readbackContent = typeof readback?.content === 'string' ? readback.content : '';
	if (!readbackContent.trim()) {
		throw new Error(`TreeDX context file ${relativePath} did not read back as markdown content.`);
	}
	return { path: relativePath, content: readbackContent, readback };
}

async function buildTreeDxAiContextPack(project, approvedProposal, decision) {
	const contextRoot = `src/content/context/${project.course.slug}/workday-1`;
	const contextFiles = [
		{
			path: `${contextRoot}/core-objective.mdx`,
			title: `${project.course.name} Core Objective`,
			description: 'Human-authored project objective and framing questions for the research workday.',
			kind: 'core_objective',
			body: [
				`Course: ${project.course.name}`,
				'',
				'## Core Objective',
				'',
				project.course.objective,
				'',
				'## Questions',
				'',
				...project.course.questions.map((question) => `- ${question}`),
			].join('\n'),
		},
		{
			path: `${contextRoot}/approval.mdx`,
			title: `${project.course.name} Workday Approval`,
			description: 'Simulated human approval record that authorizes the bounded workday.',
			kind: 'approval',
			body: [
				`Proposal: ${approvedProposal.title}`,
				'',
				approvedProposal.rationale,
				'',
				'## Decision',
				'',
				`Decision ID: ${decision.decisionId}`,
				`Verdict: ${decision.verdict}`,
				`Actor: ${decision.actor}`,
				`Decided at: ${decision.decidedAt}`,
				'',
				decision.rationale,
			].join('\n'),
		},
		{
			path: `${contextRoot}/capacity-and-repositories.mdx`,
			title: `${project.course.name} Capacity And Repository Boundaries`,
			description: 'Capacity envelope and allowed repository surfaces for the workday.',
			kind: 'capacity_repository_boundaries',
			body: [
				`Capacity limit: ${workdayWallMinutes} wall minutes`,
				'Native unit: wall_minute',
				'',
				'## Repository Boundaries',
				'',
				`Content repository: TreeDX repo ${project.treeDxContent.repoId}, workspace ${project.treeDxContent.workspaceId}`,
				`Content path: ${project.repositoryTopology?.contentRepository?.contentPath ?? 'src/content'}`,
				`Visible content mirror: ${project.workspace.paths.content}`,
				`Site repository: ${project.workspace.paths.site}`,
				`Parent workspace repository: ${project.workspace.paths.parent}`,
				'',
				'The agent may create or update Core-compatible markdown/MDX content under src/content. The agent must not treat metadata envelopes as knowledge output.',
			].join('\n'),
		},
	];
	const sources = [];
	for (const file of contextFiles) {
		const content = contextMdxDocument({
			title: file.title,
			description: file.description,
			body: file.body,
			course: project.course.name,
			kind: file.kind,
		});
		sources.push(await writeTreeDxContextFile(project, file.path, content));
	}
	const markdown = [
		'---',
		`title: ${JSON.stringify(`${project.course.name} TreeDX Workday Context Pack`)}`,
		'format: treedx-ai-context-pack',
		'content_type: text/markdown',
		`course: ${JSON.stringify(project.course.name)}`,
		`treeDxRepoId: ${JSON.stringify(project.treeDxContent.repoId)}`,
		`treeDxWorkspaceId: ${JSON.stringify(project.treeDxContent.workspaceId)}`,
		`generatedFrom: ${JSON.stringify('TreeDX workspace file readback')}`,
		'---',
		'',
		`# ${project.course.name} TreeDX Workday Context Pack`,
		'',
		'The following sections are full MDX file contents queried back from TreeDX immediately before the agent task was requested.',
		'',
		...sources.flatMap((source) => [
			`## TreeDX Source File: ${source.path}`,
			'',
			source.content.trim(),
			'',
		]),
	].join('\n');
	if (!/---\n[\s\S]*# /u.test(markdown) || markdown.includes('[object Object]')) {
		throw new Error(`TreeDX context pack for ${project.course.name} was not markdown text.`);
	}
	return {
		format: 'treedx-ai-context-pack',
		contentType: 'text/markdown',
		queriedFrom: 'treedx-workspace-files',
		treeDxRepoId: project.treeDxContent.repoId,
		treeDxWorkspaceId: project.treeDxContent.workspaceId,
		sources: sources.map((source) => ({ path: source.path, bytes: source.content.length })),
		markdown,
	};
}

async function registerStudent(client) {
	const email = `student+${runId}@university.example`;
	const password = `TreeSeed-${runId}-Student-123!`;
	const username = slugId(`student-${runId}`);
	const signUp = await client.post('/v1/auth/web/sign-up', {
		email,
		username,
		password,
		firstName: 'Student',
		lastName: 'Researcher',
		name: 'Student Researcher',
		returnTo: '/app',
	}, serviceHeaders());
	if (signUp?.confirmationToken) {
		await client.post('/v1/auth/web/confirm-email', { token: signUp.confirmationToken });
	} else {
		await client.post('/v1/acceptance/auth/confirm-email', { email }, serviceHeaders());
	}
	await client.post('/v1/auth/web/sign-in', { email, password });
	return { email, username };
}

function runProviderRole(role, env) {
	const args = ['--experimental-transform-types', 'packages/agent/src/provider/entrypoint.ts', role, '--json'];
	if (role === 'runner') args.push('--once');
	const result = spawnSync(process.execPath, args, {
		cwd: root,
		env: {
			...process.env,
			...env,
			TREESEED_PROVIDER_DATA_DIR: providerDataDir,
			TREESEED_PROVIDER_HOST_DATA_DIR: providerDataDir,
			TREESEED_PROVIDER_ENVIRONMENT: 'local',
			TREESEED_AGENT_EXECUTION_PROVIDER: 'codex',
		},
		encoding: 'utf8',
		timeout: role === 'runner' ? 900_000 : 45_000,
	});
	if (result.status !== 0) {
		throw new Error(`${role} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
	}
	return extractJsonPayload(result.stdout) ?? { ok: true, stdout: result.stdout };
}

function projectWorkspace(projectId, slug) {
	const rootDir = join(providerDataDir, 'workspaces', projectId);
	return {
		root: rootDir,
		content: join(rootDir, 'content'),
		site: join(rootDir, 'site'),
		parent: join(rootDir, 'workspace-root'),
		audit: join(auditRoot, slug),
		manifest: join(rootDir, '.treeseed', 'workspace.json'),
	};
}

function createWorkspace(project, treeDxLibrary, topology) {
	const paths = projectWorkspace(project.id, project.course.slug);
	for (const dir of [paths.content, paths.site, paths.parent, dirname(paths.manifest), paths.audit]) {
		ensureDir(dir);
	}
	writeText(join(paths.site, 'README.md'), `# ${project.course.name} Site\n\nVisible site repository placeholder for the auditable demo.\n`);
	writeText(join(paths.parent, 'README.md'), `# ${project.course.name} Parent Workspace\n\nVisible parent/super-project repository placeholder for the auditable demo.\n`);
	const manifest = {
		schemaVersion: 1,
		kind: 'treeseed_composed_workspace',
		projectId: project.id,
		course: project.course.name,
		paths: {
			workspaceRoot: paths.parent,
			site: paths.site,
			content: paths.content,
		},
		contentRepository: {
			accessMode: 'treedx',
			treeDx: topology.contentRepository?.treeDx ?? {},
			library: treeDxLibrary,
			workspace: project.treeDxContent
				? {
						apiBaseUrl: project.treeDxContent.apiBaseUrl,
						proxyBasePath: project.treeDxContent.proxyBasePath,
						observedTreeDxBaseUrl: treeDxBaseUrl,
						repoId: project.treeDxContent.repoId,
						repositoryName: project.treeDxContent.repositoryName,
						workspaceId: project.treeDxContent.workspaceId,
						branchName: project.treeDxContent.branchName,
				  }
				: null,
		},
		siteRepository: { accessMode: 'filesystem', path: paths.site },
		parentRepository: { accessMode: 'filesystem', path: paths.parent },
	};
	writeJson(paths.manifest, manifest);
	return { paths, manifest };
}

function writeCoreProjectManifest(project) {
	const workspaceRoot = project.workspace.paths.root;
	const manifestPath = join(workspaceRoot, 'src', 'manifest.yaml');
	const configPath = join(workspaceRoot, 'src', 'config.yaml');
	ensureDir(dirname(manifestPath));
	writeText(configPath, [
		`title: ${project.course.name}`,
		`description: ${project.course.objective}`,
		'models:',
		'  books:',
		'    page: public_free',
	].join('\n'));
	writeText(manifestPath, [
		`id: ${project.course.slug}-${runId}`,
		'siteConfigPath: ./src/config.yaml',
		'content:',
		'  pages: ./content/src/content/pages',
		'  notes: ./content/src/content/notes',
		'  questions: ./content/src/content/questions',
		'  objectives: ./content/src/content/objectives',
		'  proposals: ./content/src/content/proposals',
		'  decisions: ./content/src/content/decisions',
		'  people: ./content/src/content/people',
		'  agents: ./content/src/content/agents',
		'  books: ./content/src/content/books',
		'  docs: ./content/src/content/knowledge',
		'  knowledge_packs: ./content/src/content/knowledge-packs',
		'features:',
		'  docs: true',
		'  books: true',
		'  proposals: true',
		'  decisions: true',
	].join('\n'));
	return { manifestPath, configPath };
}

function exportCoreKnowledgePacks(project) {
	const projectRoot = project.workspace.paths.root;
	writeCoreProjectManifest(project);
	const script = [
		'(async () => {',
		'  const { pathToFileURL } = await import("node:url");',
		`  const moduleUrl = pathToFileURL(${JSON.stringify(resolve(root, 'packages/sdk/src/platform/book-export.ts'))}).href;`,
		'  const { exportTenantBookPackages } = await import(moduleUrl);',
		`  const result = await exportTenantBookPackages({ projectRoot: ${JSON.stringify(projectRoot)} });`,
		'  console.log(JSON.stringify({',
		'    projectRoot: result.projectRoot,',
		'    bookPackages: result.bookPackages.map((entry) => ({',
		'      packageId: entry.manifest.packageId,',
		'      title: entry.manifest.book.title,',
		'      slug: entry.manifest.book.slug,',
		'      markdownPath: entry.markdownPath,',
		'      indexPath: entry.indexPath,',
		'      sourceFileCount: entry.sourceFileCount,',
		'      includedRoots: entry.includedRoots,',
		'    })),',
		'    libraryPackage: {',
		'      packageId: result.libraryPackage.manifest.packageId,',
		'      markdownPath: result.libraryPackage.markdownPath,',
		'      indexPath: result.libraryPackage.indexPath,',
		'      sourceFileCount: result.libraryPackage.sourceFileCount,',
		'      includedRoots: result.libraryPackage.includedRoots,',
		'      members: result.libraryPackage.manifest.members,',
		'    }',
		'  }));',
		'})().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exit(1); });',
	].join('\n');
	const result = spawnSync(process.execPath, ['--experimental-transform-types', '-e', script], {
		cwd: root,
		env: process.env,
		encoding: 'utf8',
		timeout: 120_000,
	});
	if (result.status !== 0) {
		throw new Error(`Core knowledge pack export failed for ${project.course.name}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
	}
	const payload = extractJsonPayload(result.stdout);
	if (!payload?.libraryPackage?.markdownPath || !existsSync(payload.libraryPackage.markdownPath)) {
		throw new Error(`Core knowledge pack export did not create ${project.course.name} library markdown.`);
	}
	for (const bookPackage of payload.bookPackages ?? []) {
		if (!existsSync(bookPackage.markdownPath)) {
			throw new Error(`Core knowledge pack export did not create book package: ${bookPackage.markdownPath}`);
		}
	}
	return payload;
}

function exportStudyGroupKnowledgePack(projectResults) {
	ensureDir(aggregateKnowledgeRoot);
	const markdownPath = join(aggregateKnowledgeRoot, 'study-group-knowledge.md');
	const indexPath = join(aggregateKnowledgeRoot, 'study-group-knowledge.json');
	const members = projectResults.map((result) => ({
		course: result.course,
		projectId: result.projectId,
		taskId: result.taskId,
		libraryMarkdownPath: result.coreKnowledgePack.libraryPackage.markdownPath,
		sourceFileCount: result.coreKnowledgePack.libraryPackage.sourceFileCount,
	}));
	const content = [
		'# University Study Group Knowledge Pack',
		'',
		'> Auto-generated TreeSeed study-group package. Each member embeds the Core project knowledge-library download generated from agent-produced books.',
		'',
		'<!-- TRESEED_STUDY_GROUP_PACKAGE_HEADER_BEGIN -->',
		'```json',
		JSON.stringify({
			packageKind: 'study-group-library',
			packageVersion: 1,
			packageId: `study-group:${runId}`,
			runId,
			memberCount: members.length,
			members,
		}, null, 2),
		'```',
		'<!-- TRESEED_STUDY_GROUP_PACKAGE_HEADER_END -->',
		'',
		...projectResults.flatMap((result) => [
			`<!-- TRESEED_STUDY_GROUP_MEMBER_BEGIN ${result.course} -->`,
			readFileSync(result.coreKnowledgePack.libraryPackage.markdownPath, 'utf8').trim(),
			`<!-- TRESEED_STUDY_GROUP_MEMBER_END ${result.course} -->`,
			'',
		]),
	].join('\n');
	writeText(markdownPath, content);
	writeJson(indexPath, {
		packageKind: 'study-group-library',
		packageVersion: 1,
		packageId: `study-group:${runId}`,
		markdownPath,
		members,
	});
	return { markdownPath, indexPath, members };
}

function writeProviderPortfolioIndex(team, projects) {
	const indexPath = join(providerDataDir, 'portfolio', 'index.json');
	ensureDir(dirname(indexPath));
	writeJson(indexPath, {
		ok: true,
		generatedAt: new Date().toISOString(),
		team: { id: team.id, slug: team.slug ?? team.name, name: team.displayName ?? team.name },
		dataDir: providerDataDir,
		projects: projects.map((project) => ({
			projectId: project.id,
			slug: project.slug,
			enabled: true,
			repository: {
				ok: true,
				path: root,
				branch: 'main',
				commitSha: null,
			},
			repositoryTopology: project.repositoryTopology,
			workspace: {
				root: project.workspace.paths.root,
				contentRepositoryRoot: project.workspace.paths.content,
				siteRepositoryRoot: project.workspace.paths.site,
				parentRepositoryRoot: project.workspace.paths.parent,
			},
			agents: {
				ok: true,
				count: 1,
				enabledCount: 1,
				handlers: ['researcher'],
				diagnostics: [],
				reportPath: null,
			},
			tests: { ok: true, count: 1, reportPath: null },
			workDay: null,
		})),
		reportPath: join(providerDataDir, 'reports', 'portfolio-processing.json'),
		indexPath,
	});
}

function completedTaskFromRunner(runner) {
	return runner?.result?.result?.task ?? runner?.result?.task ?? null;
}

function taskIdFromRunner(runner) {
	return runner?.taskId ?? runner?.result?.taskId ?? runner?.result?.result?.task?.id ?? null;
}

function providerOutput(completedTask) {
	return completedTask?.output?.metadata ?? completedTask?.output?.output?.metadata ?? {};
}

function assertNoDryRun(output, projectName) {
	const serialized = JSON.stringify(output);
	if (/plan|Plan execution adapter/iu.test(serialized)) {
		throw new Error(`Plan output detected for ${projectName}; refusing to accept the diagnostic.`);
	}
}

function validateContent(project, metadata) {
	const contentRoot = project.workspace.paths.content;
	const files = fileSummaries(contentRoot).filter((file) => /\.(md|mdx)$/iu.test(file.path));
	const bookFiles = files.filter((file) => file.path.startsWith('src/content/books/') && file.path.endsWith('.mdx'));
	const knowledgeFiles = files.filter((file) => file.path.startsWith('src/content/knowledge/') && /\.(md|mdx)$/iu.test(file.path));
	if (!bookFiles.length) throw new Error(`${project.course.name} did not produce a Core book file.`);
	if (!knowledgeFiles.length) throw new Error(`${project.course.name} did not produce a knowledge markdown page.`);
	const contents = files.map((file) => readFileSync(join(contentRoot, file.path), 'utf8')).join('\n');
	if (!contents.includes(project.course.objective)) {
		throw new Error(`${project.course.name} content does not reference the core objective.`);
	}
	for (const file of bookFiles) {
		const body = readFileSync(join(contentRoot, file.path), 'utf8');
		if (!/^---\n[\s\S]*?\n---\n\n# /u.test(body)) {
			throw new Error(`${project.course.name} book file ${file.path} is missing a readable body heading.`);
		}
	}
	const changed = Array.isArray(metadata.changedFiles) ? metadata.changedFiles : [];
	if (!changed.length) throw new Error(`${project.course.name} task metadata did not report changed files.`);
	return { files, bookFiles, knowledgeFiles };
}

function validateContextPack(project, contextPack) {
	if (contextPack?.contentType !== 'text/markdown' || contextPack?.format !== 'treedx-ai-context-pack') {
		throw new Error(`${project.course.name} context pack is not a TreeDX markdown context pack.`);
	}
	if (!String(contextPack.markdown ?? '').startsWith('---\n')) {
		throw new Error(`${project.course.name} context pack is missing markdown frontmatter.`);
	}
	if (!String(contextPack.markdown ?? '').includes('## TreeDX Source File: src/content/context/')) {
		throw new Error(`${project.course.name} context pack does not include TreeDX source file markdown sections.`);
	}
	if (String(contextPack.markdown ?? '').includes('```json')) {
		throw new Error(`${project.course.name} context pack contains JSON instead of injectable markdown.`);
	}
}

function writeAudit(project, taskId, input) {
	const taskAuditRoot = join(project.workspace.paths.audit, taskId);
	ensureDir(taskAuditRoot);
	writeText(join(taskAuditRoot, 'prompt.md'), input.prompt);
	writeText(join(taskAuditRoot, 'response.md'), input.response || '(empty response)');
	writeJson(join(taskAuditRoot, 'config.json'), redact(input.config));
	writeJson(join(taskAuditRoot, 'repository-topology.json'), redact(input.repositoryTopology));
	writeJson(join(taskAuditRoot, 'capacity-envelope.json'), redact(input.capacity));
	writeJson(join(taskAuditRoot, 'changed-files.json'), redact(input.changedFiles));
	writeJson(join(taskAuditRoot, 'treedx-verification.json'), redact(input.treeDxVerification));
	writeText(join(taskAuditRoot, 'actions.jsonl'), '');
	for (const action of input.actions) {
		appendFileSync(join(taskAuditRoot, 'actions.jsonl'), `${JSON.stringify(redact(action))}\n`, 'utf8');
	}
	ensureDir(auditRoot);
	appendFileSync(join(auditRoot, 'events.jsonl'), `${JSON.stringify({
		at: new Date().toISOString(),
		projectId: project.id,
		projectSlug: project.course.slug,
		taskId,
		kind: 'workday_completed',
		auditRoot: taskAuditRoot,
	})}\n`, 'utf8');
	return taskAuditRoot;
}

function packageCandidate(project) {
	const archive = join(outputRoot, `${project.course.slug}.knowledge-pack-candidate.tar.gz`);
	const destination = join(candidatesRoot, project.course.slug);
	rmSync(destination, { recursive: true, force: true });
	ensureDir(dirname(destination));
	const result = spawnSync('cp', ['-a', project.workspace.paths.content, destination], { encoding: 'utf8' });
	if (result.status !== 0) throw new Error(`Failed to copy content candidate: ${result.stderr}`);
	const tar = spawnSync('tar', ['-czf', archive, '-C', candidatesRoot, project.course.slug], { encoding: 'utf8' });
	if (tar.status !== 0) throw new Error(`Failed to archive content candidate: ${tar.stderr}`);
	return { directory: destination, archive };
}

async function main() {
	if (!codexAuthConfigured) {
		throw new Error(`Live Codex auth is required. Expected TREESEED_CODEX_AUTH_FILE, TREESEED_CODEX_AUTH_JSON_B64, or ${defaultCodexAuthFile}.`);
	}
	let resetSummary = null;
	if (shouldReset) resetSummary = await resetScenarioState();
	for (const dir of [outputRoot, providerDataDir, auditRoot, candidatesRoot, aggregateKnowledgeRoot, reportsRoot]) ensureDir(dir);
	await waitForApi();
	await waitForTreeDx();

	const client = new Client();
	const student = await registerStudent(client);
	const team = await client.post('/v1/teams', {
		name: slugId(`university-study-group-${runId}`),
		displayName: 'University Study Group',
		profileSummary: 'A private study group for coordinating course research projects and reusable knowledge packs.',
		metadata: {
			scenario: 'university-study-group',
			privateTreeDx: true,
			studentPersona: student.username,
		},
	});

	const treeDx = await client.get(`/v1/teams/${encodeURIComponent(team.id)}/treedx`);
	if (!treeDx?.id && !treeDx?.instance?.id && !treeDx?.binding?.id) {
		throw new Error('Private TreeDX binding was not created for the private team.');
	}

	const providerResponse = await client.post(`/v1/teams/${encodeURIComponent(team.id)}/capacity-providers`, {
		name: 'Student Codex Subscription Provider',
		launchMode: 'self_hosted',
	});
	const provider = providerResponse.provider;
	const providerEnv = {
		...providerResponse.selfHosting.env,
		TREESEED_MANAGEMENT_API_URL: apiBase,
		TREESEED_MARKET_URL: apiBase,
		TREESEED_MARKET_ID: 'local',
		TREESEED_CAPACITY_PROVIDER_API_KEY: providerResponse.apiKey.plaintext,
	};
	const registration = runProviderRole('register', providerEnv);
	const executionProvider = await client.post(`/v1/teams/${encodeURIComponent(team.id)}/capacity-providers/${encodeURIComponent(provider.id)}/execution-providers`, {
		name: 'Codex subscription workday capacity',
		kind: 'codex_subscription',
		nativeUnit: 'wall_minute',
		maxConcurrentWorkers: 1,
		resetCadence: 'daily',
		metadata: {
			agentArchitecture: 'research-focused',
			workdayWallMinuteCap: workdayWallMinutes,
		},
	});
	const nativeLimit = await client.post(`/v1/teams/${encodeURIComponent(team.id)}/capacity-providers/${encodeURIComponent(provider.id)}/execution-providers/${encodeURIComponent(executionProvider.id)}/native-limits`, {
		scope: 'workday',
		nativeUnit: 'wall_minute',
		limitAmount: workdayWallMinutes,
		resetCadence: 'workday',
		confidence: 'configured',
		source: 'student_workday_cap',
		metadata: {
			workdayWallMinuteCap: workdayWallMinutes,
		},
	});

	const projects = [];
	for (const course of courses) {
		const details = await client.post(`/v1/teams/${encodeURIComponent(team.id)}/projects`, {
			slug: `${course.slug}-${runId}`.slice(0, 58),
			name: course.name,
			description: course.objective,
			metadata: {
				scenario: 'university-study-group',
				sourceKind: 'template',
				sourceRef: 'treeseed/research-template',
				coreObjective: course.objective,
			},
		});
		const project = { ...(details.project ?? details), course };
		const treeDxContent = await createTreeDxContentWorkspace(client, project, team);
		const treeDxLibrary = await client.post(`/v1/projects/${encodeURIComponent(project.id)}/treedx-library`, {
			libraryId: `${team.id}/${course.slug}`,
			repositoryId: treeDxContent.repoId,
			contentPath: 'src/content',
			metadata: {
				scenario: 'university-study-group',
				course: course.name,
				treeDxRepositoryName: treeDxContent.repositoryName,
				treeDxWorkspaceId: treeDxContent.workspaceId,
			},
		});
		let topology = await client.get(`/v1/projects/${encodeURIComponent(project.id)}/repository-topology`);
		const workspacePaths = projectWorkspace(project.id, course.slug);
		topology = await client.put(`/v1/projects/${encodeURIComponent(project.id)}/repository-topology`, {
			topology: {
				siteRepository: {
					checkoutPath: workspacePaths.site,
					volumePath: workspacePaths.site,
				},
				contentRepository: {
					treeDx: {
						repositoryId: treeDxContent.repoId,
						baseUrl: treeDxBaseUrl,
					},
				},
				projectRepository: {
					provider: 'local',
					name: `${course.slug}-parent`,
					checkoutPath: workspacePaths.parent,
					volumePath: workspacePaths.parent,
				},
			},
			metadata: { scenario: 'university-study-group', hostVisible: true },
		}).catch(() => topology);
		const enrichedProject = { ...project, client, treeDxContent };
		const workspace = createWorkspace(enrichedProject, treeDxLibrary, topology);
		projects.push({
			...project,
			client,
			treeDxContent,
			treeDxLibrary,
			repositoryTopology: topology,
			workspace,
		});
	}

	await client.put(`/v1/teams/${encodeURIComponent(team.id)}/capacity-allocation`, {
		capacityProviderId: provider.id,
		environment: 'local',
		allocations: projects.map((project) => ({
			id: project.id,
			name: project.name,
			percentage: 33.3333,
		})),
		metadata: {
			scenario: 'university-study-group',
			nativeUnit: 'wall_minute',
			workdayWallMinuteCap: workdayWallMinutes,
		},
	});
	const portfolioAllocationSavedAt = new Date().toISOString();
	for (const project of projects) {
		await client.put(`/v1/projects/${encodeURIComponent(project.id)}/capacity-allocation`, {
			allocations: [
				{ id: 'research', name: 'Research', percentage: 40 },
				{ id: 'planning', name: 'Planning', percentage: 20 },
				{ id: 'review', name: 'Review', percentage: 20 },
				{ id: 'knowledge', name: 'Knowledge', percentage: 20 },
			],
			metadata: { scenario: 'university-study-group', nativeUnit: 'wall_minute' },
		});
	}
	writeProviderPortfolioIndex(team, projects);

	const projectResults = [];
	for (const [index, project] of projects.entries()) {
		if (index > 0 && projectResults[0]?.ok !== true) {
			throw new Error('First project did not pass; refusing to run remaining projects.');
		}
		const decisionId = `${project.course.slug}:workday-1:student-approval`;
		const approvedProposal = {
			id: `${project.course.slug}:workday-1:proposal`,
			title: `Start ${project.course.name} research book structure`,
			rationale: 'Simulated student approval lets the agent begin the first bounded workday.',
		};
		const decision = {
			proposalId: approvedProposal.id,
			decisionId,
			verdict: 'approved',
			actor: student.username,
			rationale: approvedProposal.rationale,
			decidedAt: new Date().toISOString(),
		};
		const contextPack = await buildTreeDxAiContextPack(project, approvedProposal, decision);
		validateContextPack(project, contextPack);
		const prompt = [
			`Course: ${project.course.name}`,
			`Core objective: ${project.course.objective}`,
			`Workday: 1 of 1`,
			`Capacity limit: ${workdayWallMinutes} wall minutes`,
			'Begin the project by proposing and creating a project-specific book/content structure.',
			'Do not use a generic fixed outline. The output will be judged by the generated repository content and audit trail.',
		].join('\n');
		const workdayRequestBody = {
			environment: 'local',
			type: 'one_off_run',
			capacityProviderId: provider.id,
			reason: approvedProposal.rationale,
			agentSlug: 'researcher-agent',
			executionMode: 'live',
			prompt,
			capacity: {
				workdayWallMinutes,
				nativeUnit: 'wall_minute',
				nativeDailyUsageCapPercent: null,
			},
			payload: {
				course: project.course.name,
				coreObjective: project.course.objective,
				questions: project.course.questions,
				question: {
					id: `${project.course.slug}:workday-1`,
					title: project.course.questions[0],
					course: project.course.name,
					coreObjective: project.course.objective,
				},
				contextPack,
				workspace: {
					root: project.workspace.paths.root,
					contentRepositoryRoot: project.workspace.paths.content,
					siteRepositoryRoot: project.workspace.paths.site,
					parentRepositoryRoot: project.workspace.paths.parent,
					auditRoot: project.workspace.paths.audit,
					treeDx: {
						apiBaseUrl: apiBase,
						proxyBasePath: project.treeDxContent.proxyBasePath,
						projectId: project.id,
						repoId: project.treeDxContent.repoId,
						workspaceId: project.treeDxContent.workspaceId,
						branchName: project.treeDxContent.branchName,
					},
				},
				repositoryTopology: project.repositoryTopology,
				capacity: {
					workdayWallMinutes,
					nativeUnit: 'wall_minute',
					providerId: provider.id,
					executionProviderId: executionProvider.id,
				},
				approval: decision,
			},
			metadata: {
				scenario: 'university-study-group',
				day: 1,
				humanVote: 'approved',
				course: project.course.name,
				coreObjective: project.course.objective,
			},
		};
		const workdayResponse = await client.post(`/v1/projects/${encodeURIComponent(project.id)}/workday-requests`, workdayRequestBody);
		const runner = runProviderRole('runner', providerEnv);
		const runnerClaimed = Number(runner?.claimed ?? runner?.result?.claimed ?? 0);
		if (runnerClaimed <= 0) throw new Error(`Provider did not claim the one workday for ${project.course.name}.`);
		const runnerTaskId = taskIdFromRunner(runner);
		const completedTask = completedTaskFromRunner(runner);
		if (!runnerTaskId || completedTask?.status === 'failed') {
			throw new Error(`Provider did not complete the one workday for ${project.course.name}.`);
		}
		assertNoDryRun(completedTask, project.course.name);
		const metadata = providerOutput(completedTask);
		const contentValidation = validateContent(project, metadata);
		if (!metadata.treeDx?.commit?.commit?.ok && !metadata.treeDx?.commit?.commitSha && !metadata.treeDx?.commit?.commit?.commitSha) {
			throw new Error(`${project.course.name} did not commit generated content through TreeDX.`);
		}
		const treeDxVerification = {
			ok: true,
			mode: 'treedx-workspace-commit-and-api-library-readback',
			library: await client.get(`/v1/projects/${encodeURIComponent(project.id)}/treedx-library`),
			topology: await client.get(`/v1/projects/${encodeURIComponent(project.id)}/repository-topology`),
			treeDx: {
				apiBaseUrl: project.treeDxContent.apiBaseUrl,
				proxyBasePath: project.treeDxContent.proxyBasePath,
				observedTreeDxBaseUrl: treeDxBaseUrl,
				repoId: project.treeDxContent.repoId,
				repositoryName: project.treeDxContent.repositoryName,
				workspaceId: project.treeDxContent.workspaceId,
				branchName: project.treeDxContent.branchName,
				commit: metadata.treeDx?.commit ?? null,
				writes: metadata.treeDx?.writes ?? [],
			},
			contentFiles: contentValidation.files,
		};
		if (treeDxVerification.library?.topology?.contentRepository?.accessMode !== 'treedx') {
			throw new Error(`${project.course.name} content repository is not TreeDX-backed.`);
		}
		const auditDir = writeAudit(project, runnerTaskId, {
			prompt: metadata.prompt ?? prompt,
			response: metadata.response ?? metadata.execution?.stdout ?? completedTask?.output?.summary?.summary ?? '',
			config: {
				agentSlug: 'researcher-agent',
				handler: 'researcher',
				executionMode: 'live',
				provider: 'codex',
				workdayWallMinutes,
				codexAuthFile: process.env.TREESEED_CODEX_AUTH_FILE ?? defaultCodexAuthFile,
			},
			repositoryTopology: project.repositoryTopology,
			capacity: { provider, executionProvider, nativeLimit, workdayWallMinutes },
			changedFiles: metadata.changedFiles ?? metadata.writtenFiles ?? [],
			treeDxVerification,
			actions: [
				{ kind: 'proposal_approved', proposal: approvedProposal, decisionId },
				{ kind: 'provider_task_created', providerTask: workdayResponse.providerTask },
				{ kind: 'provider_task_completed', taskId: runnerTaskId, summary: completedTask?.output?.summary },
				{ kind: 'treedx_workspace_committed', treeDx: treeDxVerification.treeDx },
				{ kind: 'content_written', files: metadata.writtenFiles ?? [] },
			],
		});
		const candidate = packageCandidate(project);
		const coreKnowledgePack = exportCoreKnowledgePacks(project);
		projectResults.push({
			ok: true,
			course: project.course.name,
			projectId: project.id,
			workdayCount: 1,
			proposal: approvedProposal,
			decision: {
				id: decisionId,
				decidedAt: decision.decidedAt,
				verdict: 'approved',
				actor: student.username,
				rationale: approvedProposal.rationale,
			},
			taskId: runnerTaskId,
			runnerClaimed,
			auditDir,
			workspace: project.workspace.paths,
			repositoryTopology: project.repositoryTopology,
			requestContext: redact(workdayRequestBody),
			contextPack: redact(contextPack),
			treeDxVerification,
			contentValidation,
			candidate,
			coreKnowledgePack,
			summary: completedTask?.output?.summary ?? null,
		});
	}
	const studyGroupKnowledgePack = exportStudyGroupKnowledgePack(projectResults);

	const report = {
		ok: true,
		runId,
		apiBase,
		outputRoot,
		reset: resetSummary,
		student,
		team: { id: team.id, slug: team.slug ?? team.name, displayName: team.displayName ?? team.name },
		privateTreeDx: treeDx,
		capacityProvider: {
			id: provider.id,
			name: provider.name,
			registration,
			executionProvider,
			nativeLimit,
			workdayWallMinutes,
		},
		portfolioAllocation: projects.map((project) => ({ projectId: project.id, course: project.course.name, percentage: 33.3333 })),
		projectAgentAllocation: { research: 40, planning: 20, review: 20, knowledge: 20 },
		portfolioAllocationSavedAt,
		workdaysPerProject: 1,
		liveCodexUsed: true,
		studyGroupKnowledgePack,
		projects: projectResults,
	};
	const activityArtifacts = writeActivityArtifacts(report);
	report.activityArtifacts = activityArtifacts;
	writeJson(reportPath, report);
	console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.stack : error);
	process.exitCode = 1;
});
