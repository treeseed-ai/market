#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, '..');
const templatePath = resolve(scriptDir, 'user-team-management-demo.yaml');
const outputPath = resolve(workspaceRoot, '.treeseed/scenes/generated/user-team-management-demo.local.yaml');

function readDevStatus() {
	try {
		return execFileSync('npx', ['trsd', 'dev', 'status', '--json'], {
			cwd: workspaceRoot,
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		const stdout = typeof error?.stdout === 'string' ? error.stdout : error?.stdout?.toString?.() ?? '';
		const stderr = typeof error?.stderr === 'string' ? error.stderr : error?.stderr?.toString?.() ?? '';
		if (stdout.trim()) return stdout;
		if (stderr.trim()) return stderr;
		process.stderr.write('Warning: unable to read trsd dev status; using defaults or TREESEED_SCENE_* overrides.\n');
		return '';
	}
}

function parseJsonOutput(output) {
	const trimmed = output.trim();
	if (!trimmed) return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		const start = trimmed.indexOf('{');
		const end = trimmed.lastIndexOf('}');
		if (start >= 0 && end > start) {
			try {
				return JSON.parse(trimmed.slice(start, end + 1));
			} catch {
				return null;
			}
		}
		return null;
	}
}

function collectUrlCandidates(value, path = [], candidates = []) {
	if (typeof value === 'string') {
		const matches = value.match(/https?:\/\/[^\s"',)\\]+/gu) ?? [];
		for (const url of matches) candidates.push({ url, path: path.join('.') });
		return candidates;
	}
	if (!value || typeof value !== 'object') return candidates;
	if (Array.isArray(value)) {
		value.forEach((entry, index) => collectUrlCandidates(entry, [...path, String(index)], candidates));
		return candidates;
	}
	for (const [key, entry] of Object.entries(value)) collectUrlCandidates(entry, [...path, key], candidates);
	return candidates;
}

function chooseUrl(candidates, kind, fallback) {
	const envValue = kind === 'mailpit' ? process.env.TREESEED_SCENE_MAILPIT_URL : process.env.TREESEED_SCENE_BASE_URL;
	if (envValue) return envValue;
	const scored = candidates
		.map((candidate) => {
			const text = `${candidate.path} ${candidate.url}`.toLowerCase();
			let score = 0;
			if (kind === 'mailpit') {
				if (text.includes('mailpit')) score += 100;
				if (candidate.url.includes(':8025') || candidate.url.includes(':8035')) score += 50;
			} else {
				if (text.includes('localbaseurl')) score += 100;
				if (text.includes('web')) score += 50;
				if (candidate.url.includes(':4321') || candidate.url.includes(':4322') || candidate.url.includes(':4323')) score += 25;
				if (candidate.url.includes(':3000') || candidate.url.includes(':3001')) score -= 50;
				if (text.includes('api')) score -= 50;
			}
			return { ...candidate, score };
		})
		.filter((candidate) => candidate.score > 0)
		.sort((left, right) => right.score - left.score || left.url.localeCompare(right.url));
	return scored[0]?.url ?? fallback;
}

async function responds(url, path = '/') {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 2_000);
	try {
		const response = await fetch(new URL(path, url), { method: 'GET', signal: controller.signal, redirect: 'manual' });
		return response.status < 500;
	} catch {
		return false;
	} finally {
		clearTimeout(timeout);
	}
}

async function chooseLiveWebUrl(candidates, fallback) {
	const envValue = process.env.TREESEED_SCENE_BASE_URL;
	if (envValue) return envValue;
	const candidatesToTry = [
		'http://127.0.0.1:4321',
		'http://127.0.0.1:4322',
		chooseUrl(candidates, 'web', fallback),
		fallback,
	].filter((entry, index, entries) => Boolean(entry) && entries.indexOf(entry) === index);
	for (const candidate of candidatesToTry) {
		if (await responds(candidate, '/auth/register?returnTo=/app')) return candidate;
	}
	return candidatesToTry[0] ?? fallback;
}

async function clearMailpitInbox(mailpitUrl) {
	if (process.env.TREESEED_SCENE_CLEAR_MAILPIT === 'false') {
		return { attempted: false, ok: true, skipped: true };
	}
	const endpoint = new URL('/api/v1/messages', mailpitUrl).toString();
	try {
		const response = await fetch(endpoint, { method: 'DELETE' });
		let remaining = null;
		try {
			const messages = await fetch(endpoint).then((entry) => entry.json());
			remaining = typeof messages?.total === 'number' ? messages.total : typeof messages?.count === 'number' ? messages.count : null;
		} catch {
			remaining = null;
		}
		return { attempted: true, ok: response.ok, status: response.status, endpoint, remaining };
	} catch (error) {
		return {
			attempted: true,
			ok: false,
			endpoint,
			error: error instanceof Error ? error.message : String(error ?? 'Unknown Mailpit cleanup error.'),
		};
	}
}

function yamlQuote(value) {
	return JSON.stringify(value);
}

const devStatus = parseJsonOutput(readDevStatus());
const candidates = collectUrlCandidates(devStatus);
const baseUrl = await chooseLiveWebUrl(candidates, 'http://127.0.0.1:4321');
const mailpitUrl = chooseUrl(candidates, 'mailpit', 'http://127.0.0.1:8025');
const mailpitCleanup = await clearMailpitInbox(mailpitUrl);

let source = readFileSync(templatePath, 'utf8');
source = source
	.replace('baseUrl: auto', `baseUrl: ${yamlQuote(baseUrl)}`)
	.replaceAll('__USER_TEAM_MAILPIT_URL__', mailpitUrl);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, source, 'utf8');

const result = {
	ok: true,
	scene: outputPath,
	baseUrl,
	mailpitUrl,
	mailpitCleanup,
	notes: [
		'This generator clears Mailpit only. It does not delete users, teams, or provider resources.',
		'Use a fresh local app database for the strict fixed-email demo scene.',
	],
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
