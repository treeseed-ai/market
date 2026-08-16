import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdirSync,writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { discoverGuarantees } from '../../packages/sdk/src/guarantees/index/parse-verifier-registry.ts';
import { executeProof } from './agent-catalog/proof-executor.ts';
import { loadProofInput } from './agent-catalog/proof-input.ts';

const workspaceRoot = resolve(process.cwd());
const guaranteeId = process.env.TREESEED_GUARANTEE_ID?.trim() ?? '';
const capabilityId = process.env.TREESEED_GUARANTEE_CAPABILITY_ID?.trim() ?? '';
const sourceGeneration = process.env.TREESEED_GUARANTEE_SOURCE_GENERATION?.trim() ?? '';
const variant = process.env.TREESEED_GUARANTEE_VARIANT?.trim() ?? '';
const registry = discoverGuarantees({ workspaceRoot, filter: { ids: guaranteeId ? [guaranteeId] : [] } });
const guarantee = registry.guarantees.find((entry) => entry.manifest?.id === guaranteeId)?.manifest;
if (!guarantee?.catalogContract || guarantee.catalogContract.capabilityId !== capabilityId) {
	throw new Error('The requested canonical agent capability does not resolve to its exact v2 guarantee contract.');
}

function cli(args:string[]) {
	const result=spawnSync(process.execPath,[resolve(workspaceRoot,'packages/cli/dist/cli/main.js'),...args,'--json'],{cwd:workspaceRoot,env:process.env,encoding:'utf8',maxBuffer:10*1024*1024,timeout:180_000,killSignal:'SIGTERM'});
	let payload:Record<string,unknown>={};
	try { payload=JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))) as Record<string,unknown>; } catch { /* captured below */ }
	return {args,exitCode:result.status??1,payload,stdout:result.stdout,stderr:`${result.stderr}${result.error?`\n${result.error.message}`:''}`,required:true};
}

function contextChecksReady(probe:ReturnType<typeof cli>) {
	return probe.exitCode===0&&/^[a-f0-9]{40}$/u.test(String(probe.payload.definitionCommit??''))
		&&Array.isArray(probe.payload.tests)&&probe.payload.tests.length>0
		&&Array.isArray(probe.payload.definitions)&&probe.payload.definitions.length>0
		&&Array.isArray(probe.payload.unpublishedAuthoring);
}

function stableContextChecks(transcript:Array<Record<string,unknown>>,args:string[],minimumStableMs=0) {
	const startedAt=Date.now(); let consecutive=0; let last:ReturnType<typeof cli>|null=null;
	for(let attempt=0;attempt<40;attempt+=1) {
		const probe=cli(args);
		last=probe; consecutive=contextChecksReady(probe)?consecutive+1:0;
		const stable=Date.now()-startedAt>=minimumStableMs&&consecutive>=3;
		const terminal=stable||attempt===39;
		transcript.push({...probe,required:terminal,recoveryProbe:true,attempt:attempt+1});
		if(stable) return probe;
		Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,750);
	}
	return last!;
}

function containsResultPayload(value:unknown):boolean {
	if(Array.isArray(value)) return value.some(containsResultPayload);
	if(!value||typeof value!=='object') return false;
	return Object.entries(value as Record<string,unknown>).some(([key,entry])=>key==='result'||containsResultPayload(entry));
}

function redact(value:unknown):unknown {
	if(Array.isArray(value)) return value.map(redact);
	if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,entry])=>[/secret|token|password|authorization|cookie/iu.test(key)?key:key,/secret|token|password|authorization|cookie/iu.test(key)?'<redacted>':redact(entry)]));
	if(typeof value==='string') return value.replace(/Bearer\s+[^\s"']+/giu,'Bearer <redacted>');
	return value;
}

function contextReadinessProof() {
	const team=process.env.TREESEED_AGENT_GUARANTEE_TEAM?.trim()||'treeseed';
	const market=process.env.TREESEED_AGENT_GUARANTEE_MARKET?.trim()||'local';
	const projectSelector=process.env.TREESEED_AGENT_GUARANTEE_PROJECT?.trim()||'market';
	const transcript:Array<Record<string,unknown>>=[];
	const projects=cli(['projects','list','--market',market]); transcript.push(projects);
	const projectRows=Array.isArray(projects.payload.projects)?projects.payload.projects.filter((entry):entry is Record<string,unknown>=>Boolean(entry&&typeof entry==='object')):[];
	const selectedProject=projectRows.find((entry)=>entry.id===projectSelector||entry.slug===projectSelector);
	const project=String(selectedProject?.id??'');
	const exactTeam=String(selectedProject?.teamId??team);
	const checksArgs=['capacity','context-query-checks','--market',market,'--team',exactTeam,'--project',project];
	const before=project?stableContextChecks(transcript,checksArgs):{args:['capacity','context-query-checks'],exitCode:1,payload:{},stdout:'',stderr:`Project ${projectSelector} was not found.`,required:true};
	if(!project) transcript.push(before);
	const tests=Array.isArray(before.payload.tests)?before.payload.tests.filter((entry):entry is Record<string,unknown>=>Boolean(entry&&typeof entry==='object'&&Array.isArray((entry as Record<string,unknown>).requiredBy)&&((entry as Record<string,unknown>).requiredBy as unknown[]).length>0)):[];
	for(const [index,test] of tests.entries()) {
		const id=String(test.id??''); if(!id) continue;
		transcript.push(cli(['capacity','context-query-test','--market',market,'--team',exactTeam,'--project',project,'--agent-test',id,'--idempotency-key',`guarantee:${sourceGeneration}:${variant}:${id}`]));
		if(variant==='interruption-resume'&&index===0) {
			transcript.push(cli(['dev','restart','--app','api']));
			stableContextChecks(transcript,checksArgs,15_000);
		}
	}
	const after=project?stableContextChecks(transcript,checksArgs):before;
	const outputRoot=resolve(process.env.TREESEED_GUARANTEE_OUTPUT_ROOT||'.treeseed/guarantees/unscoped');
	mkdirSync(resolve(outputRoot,'agent-catalog'),{recursive:true});
	const transcriptPath=resolve(outputRoot,'agent-catalog','dynamic-context-transcript.json');
	writeFileSync(transcriptPath,`${JSON.stringify(redact(transcript.map(({args,exitCode,payload,stderr,required,recoveryProbe,attempt})=>({command:['trsd',...(args as string[])],exitCode,payload,stderr,required,recoveryProbe,attempt}))),null,2)}\n`);
	const evidencePath=relative(workspaceRoot,transcriptPath).replaceAll('\\','/');
	const requiredTests=Array.isArray(after.payload.tests)?after.payload.tests.filter((entry)=>Array.isArray((entry as Record<string,unknown>)?.requiredBy)&&((entry as {requiredBy:unknown[]}).requiredBy.length>0)):[];
	const passingTests=requiredTests.length>0&&requiredTests.every((entry)=>Boolean((entry as Record<string,unknown>)?.readiness&&((entry as {readiness?:{selectable?:unknown}}).readiness?.selectable===true)));
	const requiredDefinitions=Array.isArray(after.payload.definitions)?after.payload.definitions.filter((entry)=>Array.isArray((entry as Record<string,unknown>)?.requiredBy)&&((entry as {requiredBy:unknown[]}).requiredBy.length>0)):[];
	const selectableDefinitions=requiredDefinitions.length>0&&requiredDefinitions.every((entry)=>((entry as {readiness?:{selectable?:unknown}}).readiness?.selectable===true));
	const commandsPassed=transcript.filter((entry)=>entry.required!==false).every((entry)=>entry.exitCode===0);
	const noResultsPersisted=!transcript.filter((entry)=>entry.args[0]==='capacity'&&String(entry.args[1]).startsWith('context-query')).some((entry)=>containsResultPayload(entry.payload));
	const definitionCommit=String(after.payload.definitionCommit??'');
	const authoringIdentity=(entry:unknown)=>entry&&typeof entry==='object'?`${String((entry as Record<string,unknown>).commitSha??'')}:${String((entry as Record<string,unknown>).ref??'')}`:'';
	const afterAuthoring=Array.isArray(after.payload.unpublishedAuthoring)?after.payload.unpublishedAuthoring.map(authoringIdentity).filter(Boolean):[];
	return {
		schemaVersion:'treeseed.guarantee-verifier-result/v1',guaranteeId,capabilityId,variant,sourceGeneration,
		assertions:[
			{id:'context.current-results',status:commandsPassed&&passingTests&&selectableDefinitions?'passed':'failed',evidence:[evidencePath],entityRefs:{queryRevision:tests.map((test)=>`${String(test.definitionId)}@${String(test.definitionRevision)}`).join(','),observedSourceRef:definitionCommit},diagnostics:commandsPassed?[]:['One or more authenticated CLI query checks failed.']},
			{id:'context.results-not-persisted',status:noResultsPersisted?'passed':'failed',evidence:[evidencePath],entityRefs:{checkRecord:(Array.isArray(after.payload.items)?after.payload.items:[]).map((item)=>String((item as Record<string,unknown>).id??'')).filter(Boolean).join(',')}},
		],repositoryPostconditions:[],
		cleanup:{verified:commandsPassed&&afterAuthoring.length===0,activeAssignments:0,activeLeases:0,activeReservations:0,activeDemands:0,activeWorkspaces:0,activeWorktrees:0,unpublishedBranches:afterAuthoring.length,staleAuthorities:0},
		evidence:[evidencePath],
	};
}

if(capabilityId==='agent.context.dynamic-readiness') {
	process.stdout.write(`${JSON.stringify(contextReadinessProof(),null,2)}\n`);
	process.exit(0);
}

const loaded=loadProofInput({workspaceRoot,contract:guarantee.catalogContract,variant,sourceGeneration});
if(!loaded.ok) {
	process.stdout.write(`${JSON.stringify({schemaVersion:'treeseed.guarantee-verifier-result/v1',guaranteeId,capabilityId,variant,sourceGeneration,assertions:guarantee.catalogContract.outcomes.map((outcome)=>({id:outcome.id,status:'blocked',evidence:[],diagnostics:loaded.issues})),repositoryPostconditions:[],cleanup:{verified:false,activeAssignments:-1,activeLeases:-1,activeReservations:-1,activeDemands:-1,activeWorkspaces:-1,activeWorktrees:-1,unpublishedBranches:-1,staleAuthorities:-1},evidence:[]},null,2)}\n`);
	process.exit(0);
}
process.stdout.write(`${JSON.stringify(executeProof({workspaceRoot,outputRoot:resolve(process.env.TREESEED_GUARANTEE_OUTPUT_ROOT||'.treeseed/guarantees/unscoped'),guaranteeId,sourceGeneration,proof:loaded.proof}),null,2)}\n`);
