#!/usr/bin/env node
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = process.cwd();
const sdkRoot = resolve(root, 'packages/sdk');
const sdkBuildScript = resolve(sdkRoot, 'scripts/build-dist.ts');

const requiredSdkOutputs = [
	'dist/index.js',
	'dist/api/index.js',
	'dist/workflow-support.js',
	'dist/plugin-default.js',
].map((relativePath) => resolve(sdkRoot, relativePath));

const sdkBuildInputs = [
	resolve(sdkRoot, 'package.json'),
	resolve(sdkRoot, 'scripts/build-dist.ts'),
	resolve(sdkRoot, 'src'),
];

const apiRuntimeTsInputs = [
	'src/lib/market/governance-projection.ts',
	'src/lib/market/infrastructure-projection.ts',
	'src/lib/market/infrastructure-seeds.ts',
	'src/lib/market/knowledge-projection.ts',
	'src/lib/market/operational-artifacts.ts',
	'src/lib/market/workday-projection.ts',
	'src/view-models/knowledge-content.ts',
].map((relativePath) => resolve(root, relativePath));

function walkFiles(path) {
	if (!existsSync(path)) return [];
	const stat = statSync(path);
	if (!stat.isDirectory()) return [path];

	const files = [];
	for (const entry of readdirSync(path, { withFileTypes: true })) {
		const fullPath = join(path, entry.name);
		files.push(...(entry.isDirectory() ? walkFiles(fullPath) : [fullPath]));
	}
	return files;
}

function newestInputMtime(inputs) {
	return inputs
		.flatMap((input) => walkFiles(input))
		.reduce((newest, filePath) => Math.max(newest, statSync(filePath).mtimeMs), 0);
}

function outputsReady(requiredOutputs, inputs) {
	if (!requiredOutputs.every((filePath) => existsSync(filePath))) return false;
	const newestInput = newestInputMtime(inputs);
	const oldestOutput = requiredOutputs.reduce(
		(oldest, filePath) => Math.min(oldest, statSync(filePath).mtimeMs),
		Number.POSITIVE_INFINITY,
	);
	return oldestOutput >= newestInput;
}

function runSdkBuild() {
	const result = spawnSync('npm', ['run', 'build:dist'], {
		cwd: sdkRoot,
		env: process.env,
		stdio: 'inherit',
	});
	if (result.status !== 0) {
		throw new Error(`@treeseed/sdk build command failed with exit code ${result.status ?? 1}.`);
	}
}

function ensureWorkspaceSdkPackage() {
	const packageScopeDir = resolve(root, 'node_modules/@treeseed');
	const packageSdkPath = resolve(packageScopeDir, 'sdk');
	mkdirSync(packageScopeDir, { recursive: true });
	rmSync(packageSdkPath, { recursive: true, force: true });
	mkdirSync(packageSdkPath, { recursive: true });
	copyFileSync(resolve(sdkRoot, 'package.json'), resolve(packageSdkPath, 'package.json'));
	cpSync(resolve(sdkRoot, 'dist'), resolve(packageSdkPath, 'dist'), { recursive: true, force: true });
	mkdirSync(resolve(packageSdkPath, 'scripts'), { recursive: true });
	copyFileSync(resolve(sdkRoot, 'scripts/verify-driver.mjs'), resolve(packageSdkPath, 'scripts/verify-driver.mjs'));
	if (existsSync(resolve(sdkRoot, 'templates'))) {
		cpSync(resolve(sdkRoot, 'templates'), resolve(packageSdkPath, 'templates'), { recursive: true, force: true });
	}
}

function transpileApiRuntimeTs() {
	for (const input of apiRuntimeTsInputs) {
		if (!existsSync(input)) {
			throw new Error(`Missing API runtime TypeScript source: ${input}`);
		}
		const output = input.replace(/\.ts$/u, '.js');
		const source = readFileSync(input, 'utf8');
		const result = ts.transpileModule(source, {
			fileName: input,
			compilerOptions: {
				module: ts.ModuleKind.ESNext,
				target: ts.ScriptTarget.ES2022,
				importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
				sourceMap: false,
			},
		});
		writeFileSync(output, result.outputText, 'utf8');
	}
}

try {
	if (!existsSync(sdkBuildScript)) {
		throw new Error('Unable to resolve workspace @treeseed/sdk build script.');
	}
	if (outputsReady(requiredSdkOutputs, sdkBuildInputs)) {
		console.log('Using existing workspace @treeseed/sdk API build.');
	} else {
		runSdkBuild();
		if (!outputsReady(requiredSdkOutputs, sdkBuildInputs)) {
			throw new Error('@treeseed/sdk build finished without required API dist outputs.');
		}
	}
	ensureWorkspaceSdkPackage();
	transpileApiRuntimeTs();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
