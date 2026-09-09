import {mkdtempSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Harness} from '../../dist/core/service.js';
export const author={id:'worker',sessionId:'session-one'};
export const owner={id:'owner',sessionId:'owner-session'};
export const reviewer={id:'reviewer',sessionId:'review-session'};
export function definition(overrides={}) {
 return {contract:'harness-runtime/1',id:'TASK-1',revision:1,projectId:'demo',authorId:author.id,sessionId:author.sessionId,
 requirementIds:['REQ-1'],inputPaths:['sample.test.mjs'],criteria:[{id:'AC-1',requirementId:'REQ-1',target:true,bindingIds:['B-1']}],
 bindings:[{id:'B-1',profile:'node-local',kind:'node-test',argv:['sample.test.mjs'],selectors:['sample.test.mjs::AC-pass'],expectedExit:0,expectedStdout:null,mutation:false,artifacts:[]}],
 policy:{id:'POLICY-1',reviewerIds:[reviewer.id],requireReview:true,timeoutMs:5000,maxOutputBytes:65536,maxAttempts:3},...overrides};
}
export function project(t,body="import {test} from 'node:test'; test('AC-pass',()=>{});\n") {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'harness-test-')));writeFileSync(join(root,'sample.test.mjs'),body);
 t.after(()=>rmSync(root,{recursive:true,force:true}));return root;
}
export function service(root,database=join(root,'state.sqlite')) {
 return new Harness({root,projectId:'demo',database,authorize:(p,a)=>
 p.id==='owner'&&['create','revise','read','reconcile'].includes(a)||
 p.id==='worker'&&['read','run','complete','cancel','recover'].includes(a)||
 p.id==='reviewer'&&['read','review','reconcile'].includes(a)});
}
