import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export type ProofCommandResult = {
	id:string;args:string[];exitCode:number;payload:Record<string,unknown>;stdout:string;stderr:string;
};

export function runProofCli(workspaceRoot:string,id:string,args:string[]):ProofCommandResult {
	const result=spawnSync(process.execPath,[resolve(workspaceRoot,'packages/cli/dist/cli/main.js'),...args,'--json'],{
		cwd:workspaceRoot,env:process.env,encoding:'utf8',maxBuffer:20*1024*1024,
	});
	let payload:Record<string,unknown>={};
	try { const start=result.stdout.indexOf('{'); payload=JSON.parse(result.stdout.slice(start)) as Record<string,unknown>; } catch { /* raw output remains evidence */ }
	return {id,args,exitCode:result.status??1,payload,stdout:result.stdout,stderr:result.stderr};
}

export function redactProofValue(value:unknown):unknown {
	if(Array.isArray(value)) return value.map(redactProofValue);
	if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,entry])=>[
		key,/secret|token|password|authorization|cookie|private.?key/iu.test(key)?'<redacted>':redactProofValue(entry),
	]));
	if(typeof value==='string') return value.replace(/Bearer\s+[^\s"']+/giu,'Bearer <redacted>');
	return value;
}

export function redactProofArgs(args:string[]) {
	let redactNext=false;
	return args.map((value)=>{
		if(redactNext) { redactNext=false; return '<redacted>'; }
		if(/^--(?:document|password|secret|token|authorization|private-key)$/iu.test(value)) redactNext=true;
		return value;
	});
}
