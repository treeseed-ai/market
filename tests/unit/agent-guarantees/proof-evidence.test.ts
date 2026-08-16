import { describe,expect,it } from 'vitest';
import { redactProofArgs,redactProofValue,type ProofCommandResult } from '../../../scripts/guarantees/agent-catalog/cli-runtime.ts';
import { evaluatePredicate,scalarEvidence } from '../../../scripts/guarantees/agent-catalog/json-evidence.ts';

const result:ProofCommandResult={id:'assignment',args:[],exitCode:0,stdout:'',stderr:'',payload:{assignment:{id:'assignment-1',activityType:'reviewing',agents:[{id:'actor-1'},{id:'reviewer-1'}],artifacts:[{model:'note',path:'src/content/notes/review.mdx'}]}}};
const results=new Map([[result.id,result]]);

describe('agent guarantee CLI evidence',()=>{
	it('evaluates exact, wildcard, distinct, and semantic path predicates',()=>{
		expect(evaluatePredicate(results,{id:'profile.exact',commandId:'assignment',path:'assignment.activityType',operator:'equals',expected:'reviewing'}).passed).toBe(true);
		expect(evaluatePredicate(results,{id:'profile.exact-agent',commandId:'assignment',path:'assignment.agents[1].id',operator:'equals',expected:'reviewer-1'}).passed).toBe(true);
		expect(evaluatePredicate(results,{id:'identity.distinct',commandId:'assignment',path:'assignment.agents[*].id',operator:'distinct'}).passed).toBe(true);
		expect(evaluatePredicate(results,{id:'artifact.path',commandId:'assignment',path:'assignment.artifacts[*].path',operator:'matches',expected:'^src/content/notes/'}).passed).toBe(true);
		expect(scalarEvidence(results,{commandId:'assignment',path:'assignment.id'})).toBe('assignment-1');
	});

	it('redacts structured credentials and command-line secret values',()=>{
		expect(redactProofValue({accessToken:'secret',nested:{authorization:'Bearer abc'}})).toEqual({accessToken:'<redacted>',nested:{authorization:'<redacted>'}});
		expect(redactProofArgs(['capacity','run','--token','secret','--team','team-1'])).toEqual(['capacity','run','--token','<redacted>','--team','team-1']);
	});
});
