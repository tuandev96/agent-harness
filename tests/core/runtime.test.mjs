import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {recordRun} from '../../dist/core/recorder.js';
import {Store} from '../../dist/core/store.js';
import {digest} from '../../dist/core/files.js';
import {author,owner,reviewer,definition,project,service} from './helpers.mjs';

function commandTask(script,patch={}) {const t=definition();t.bindings[0]={...t.bindings[0],kind:'command',argv:['$NODE','-e',script],selectors:[],expectedStdout:'ok\n',...patch};return t;}
test('real native test run plus independent review completes the task',async t=>{
 const root=project(t),s=service(root);t.after(()=>s.close());s.create(owner,definition());
 const r=await s.run(author,'TASK-1','B-1');assert.equal(r.outcome,'PASS');assert.equal(r.tests[0].selector,'sample.test.mjs::AC-pass');
 assert.equal(s.assess(author,'TASK-1').gateReady,false);assert.throws(()=>s.complete(author,'TASK-1'),/GATE_CLOSED/);
 s.review(reviewer,'TASK-1',{verdict:'PASS',summary:'Observed canonical AC and test assertion in this isolated integration fixture',criterionIds:['AC-1'],runIds:[r.id]});
 assert.equal(s.complete(author,'TASK-1').state,'COMPLETED');assert.equal(s.export(author,'TASK-1').assessment.releaseReady,false);
});
test('zero collected tests do not pass merely because Node accepted a file',async t=>{
 const root=project(t,"console.log('nothing tested');\n"),d=definition(),r=await recordRun(root,d,d.bindings[0],author);
 assert.notEqual(r.outcome,'PASS');assert.ok(r.reasonCodes.includes('COLLECTION_INCOMPLETE'));
});
test('skipped assertion is not a passing collection',async t=>{const root=project(t,"import {test} from 'node:test';test.skip('AC-pass',()=>{});\n"),d=definition(),r=await recordRun(root,d,d.bindings[0],author);assert.notEqual(r.outcome,'PASS');});
test('test stdout pretending to be reporter JSON is not an assertion',async t=>{const root=project(t,`console.log(JSON.stringify({kind:'result',selector:'sample.test.mjs::AC-pass',status:'PASS',file:'sample.test.mjs'}));\n`),d=definition(),r=await recordRun(root,d,d.bindings[0],author);assert.notEqual(r.outcome,'PASS');assert.equal(r.tests.length,0);});
test('wrong command output fails its exact oracle',async t=>{const root=project(t),d=commandTask("console.log('wrong')"),r=await recordRun(root,d,d.bindings[0],author);assert.equal(r.outcome,'FAIL');});
test('output cap stops a real process and rejects truncated evidence',async t=>{const root=project(t),d=commandTask("process.stdout.write('x'.repeat(100000));setInterval(()=>{},1000)");d.policy.maxOutputBytes=1024;const r=await recordRun(root,d,d.bindings[0],author);assert.equal(r.truncated,true);assert.notEqual(r.outcome,'PASS');assert.ok(Buffer.byteLength(r.stdout)<=1024);});
test('deadline terminates an owned process',async t=>{const root=project(t),d=commandTask('setInterval(()=>{},1000)');d.policy.timeoutMs=100;const r=await recordRun(root,d,d.bindings[0],author);assert.equal(r.outcome,'TIMED_OUT');});
test('cancellation before dispatch causes no mutation',async t=>{const root=project(t),d=commandTask("require('fs').writeFileSync('unexpected','x')",{mutation:true});const r=await recordRun(root,d,d.bindings[0],author,{signal:AbortSignal.abort()});assert.equal(r.outcome,'CANCELLED');assert.equal(existsSync(join(root,'unexpected')),false);});
test('mutation with uncertain completion produces UNKNOWN',async t=>{const root=project(t),d=commandTask("require('fs').writeFileSync('effect','x');setInterval(()=>{},1000)",{mutation:true});d.policy.timeoutMs=150;const r=await recordRun(root,d,d.bindings[0],author);assert.equal(r.outcome,'UNKNOWN');assert.ok(r.reasonCodes.includes('SIDE_EFFECTS_REQUIRE_RECONCILIATION'));});
test('secret canary is removed before evidence persistence',async t=>{const root=project(t),d=commandTask("console.log(process.env.TEST_TOKEN)");d.bindings[0].expectedStdout='CANARY-ONLY-NOT-A-REAL-KEY\n';const r=await recordRun(root,d,d.bindings[0],author,{env:{TEST_TOKEN:'CANARY-ONLY-NOT-A-REAL-KEY'}});assert.equal(r.outcome,'PASS');assert.ok(!JSON.stringify(r).includes('CANARY-ONLY-NOT-A-REAL-KEY'));});
test('mutation of a pinned input makes the run stale',async t=>{const root=project(t),d=commandTask("require('fs').writeFileSync('sample.test.mjs','changed');console.log('ok')");const r=await recordRun(root,d,d.bindings[0],author);assert.notEqual(r.candidate.digest,r.finishedCandidate);assert.notEqual(r.outcome,'PASS');});
test('author cannot submit independent review',async t=>{const root=project(t),s=service(root);t.after(()=>s.close());s.create(owner,definition());const r=await s.run(author,'TASK-1','B-1');assert.throws(()=>s.review(author,'TASK-1',{verdict:'PASS',summary:'self',criterionIds:['AC-1'],runIds:[r.id]}),/AUTHORIZED|REVIEWER/);});
test('cross-session execution has no side effect',async t=>{const root=project(t),s=service(root);t.after(()=>s.close());s.create(owner,definition());await assert.rejects(()=>s.run({...author,sessionId:'another'},'TASK-1','B-1'),/AUTHOR/);assert.equal(s.get(author,'TASK-1').sequence,0);});
test('cancel reaches an in-flight recorder',async t=>{const root=project(t),s=service(root);t.after(()=>s.close());const d=commandTask('setInterval(()=>{},1000)');s.create(owner,d);const pending=s.run(author,d.id,'B-1');setTimeout(()=>s.cancel(author,d.id),80);const r=await pending;assert.equal(r.outcome,'CANCELLED');assert.equal(s.get(author,d.id).state,'CANCELLED');});
test('retry count is a runtime bound rather than a prompt',async t=>{const root=project(t),s=service(root);t.after(()=>s.close());const d=commandTask("console.log('wrong')");d.policy.maxAttempts=1;s.create(owner,d);await s.run(author,d.id,'B-1');await assert.rejects(()=>s.run(author,d.id,'B-1'),/BUDGET/);});
test('legacy PASS is retained but cannot provide run provenance',t=>{const root=project(t),s=service(root);t.after(()=>s.close());s.create(owner,definition());s.importLegacy(owner,'TASK-1',{oldStatus:'VERIFIED'});const e=s.export(author,'TASK-1');assert.equal(e.records[0].origin,'LEGACY');assert.equal(e.records[0].value.source.oldStatus,'VERIFIED');assert.equal(e.assessment.gateReady,false);});
test('state and immutable history survive closing and reopening',t=>{const root=project(t),db=join(root,'state.sqlite');let store=new Store(db);store.create(definition(),owner);store.transition('TASK-1',author,{sequence:0,epoch:1},'BLOCKED');store.close();store=new Store(db);t.after(()=>store.close());assert.equal(store.get('TASK-1').state,'BLOCKED');assert.equal(store.verifyHistory('TASK-1'),true);assert.throws(()=>store.transition('TASK-1',author,{sequence:0,epoch:1},'RUNNING'),/STALE_WRITER/);});
test('two independent writers cannot both commit the same parent',async t=>{
 const root=project(t),db=join(root,'state.sqlite'),store=new Store(db);t.after(()=>store.close());store.create(definition(),owner);
 const module=new URL('../../dist/core/store.js',import.meta.url).href;
 const code=`import {Store} from ${JSON.stringify(module)};const s=new Store(process.argv[1]);try{s.transition('TASK-1',${JSON.stringify(author)},{sequence:0,epoch:1},'BLOCKED');console.log('ACCEPTED')}catch(e){console.log(e.message)}finally{s.close()}`;
 const start=()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',code,db]);let text='';child.stdout.on('data',d=>text+=d);child.once('error',reject);child.once('close',()=>resolve(text.trim()));});
 const results=await Promise.all([start(),start()]);assert.equal(results.filter(x=>x==='ACCEPTED').length,1);assert.equal(results.filter(x=>x==='STALE_WRITER').length,1);assert.equal(store.verifyHistory('TASK-1'),true);
});
test('kill during a SQLite transaction does not publish partial state',async t=>{
 const root=project(t),db=join(root,'state.sqlite');const store=new Store(db);t.after(()=>store.close());store.create(definition(),owner);
 const code="const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);d.exec(\"BEGIN IMMEDIATE; UPDATE tasks SET state='COMPLETED'\");console.log('LOCKED');setInterval(()=>{},1000)";
 const child=spawn(process.execPath,['-e',code,db]);let text='';const exited=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 const timer=setTimeout(()=>child.kill('SIGKILL'),5000);child.stdout.on('data',d=>{text+=d;if(text.includes('LOCKED'))child.kill('SIGKILL');});await exited;clearTimeout(timer);
 assert.ok(text.includes('LOCKED'));assert.equal(store.get('TASK-1').state,'READY');assert.equal(store.verifyHistory('TASK-1'),true);
});
