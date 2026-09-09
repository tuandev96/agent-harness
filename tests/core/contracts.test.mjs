import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,symlinkSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {parseTask} from '../../dist/core/contract.js';
import {errors} from '../../dist/core/schema.js';
import {digest,safePath,snapshot,redact,canonical} from '../../dist/core/files.js';
import {evaluate} from '../../dist/core/evaluator.js';
import {definition,project} from './helpers.mjs';

for(const [name,mutate] of [
 ['unknown field',t=>{t.verified=true;}],['empty criteria',t=>{t.criteria=[];}],
 ['duplicate criterion',t=>{t.criteria.push(t.criteria[0]);}],['invalid contract',t=>{t.contract='manual/99';}],
 ['bad parent',t=>{t.criteria[0].requirementId='REQ-missing';}],['bad binding',t=>{t.criteria[0].bindingIds=['missing'];}],
 ['unassigned review',t=>{t.policy.reviewerIds=[];}],['self reviewer',t=>{t.policy.reviewerIds=['worker'];}],
 ['zero selectors',t=>{t.bindings[0].selectors=[];}],['runner flags',t=>{t.bindings[0].argv=['--test-only'];}],
 ['zero deadline',t=>{t.policy.timeoutMs=0;}],['excessive attempts',t=>{t.policy.maxAttempts=99;}],
 ['NaN limit',t=>{t.policy.maxOutputBytes=NaN;}],['command without oracle',t=>{t.bindings[0].kind='command';t.bindings[0].selectors=[];}],
])test('schema rejects '+name,()=>{const t=definition();mutate(t);assert.throws(()=>parseTask(t));});
test('valid task and sparse stable IDs are accepted',()=>{const t=definition();t.requirementIds=['REQ-900'];t.criteria[0].requirementId='REQ-900';assert.deepEqual(parseTask(t),t);});
test('unsupported schema keyword fails closed',()=>assert.throws(()=>errors({type:'object',mystery:true},{}),/UNSUPPORTED/));
test('canonical digest ignores object key order but not values',()=>{assert.equal(digest({a:1,b:2}),digest({b:2,a:1}));assert.notEqual(digest([1,2]),digest([2,1]));assert.throws(()=>canonical({a:undefined}));});
for(const bad of ['../x','/tmp/x','a/../x','./x','a\\x','a//x'])test('reject path '+bad,t=>assert.throws(()=>safePath(project(t),bad)));
test('reject symlink escape',t=>{const root=project(t);symlinkSync('/tmp',join(root,'escape'));assert.throws(()=>safePath(root,'escape/x'));});
test('binary bytes and UTF8 boundary are valid inputs',t=>{const root=project(t);writeFileSync(join(root,'binary'),Buffer.from([255,0,123]));writeFileSync(join(root,'utf8'),'a'.repeat(65535)+'ế');assert.equal(snapshot(root,['binary','utf8']).files.length,2);});
test('changing a report outside contributing inputs does not invalidate',t=>{const root=project(t),a=snapshot(root,['sample.test.mjs']);writeFileSync(join(root,'report.md'),'new report');assert.equal(snapshot(root,['sample.test.mjs']).digest,a.digest);writeFileSync(join(root,'sample.test.mjs'),'changed');assert.notEqual(snapshot(root,['sample.test.mjs']).digest,a.digest);});
test('redaction removes explicit secrets across logical chunks',()=>{assert.equal(redact('one-'+ 'SECRET-CANARY',['SECRET-CANARY']),'one-[REDACTED]');assert.ok(!redact('Authorization: Bearer example-value').includes('example-value'));});

function evidence(t,patch={}){return {id:'run1',taskId:t.id,taskDigest:digest(t),bindingId:'B-1',profile:'node-local',candidate:{digest:'a'.repeat(64)},finishedCandidate:'a'.repeat(64),outcome:'PASS',exitCode:0,truncated:false,tests:[{selector:'sample.test.mjs::AC-pass',status:'PASS'}],artifacts:[],reasonCodes:[],...patch};}
function review(t,patch={}){return {id:'review1',taskId:t.id,taskDigest:digest(t),candidateDigest:'a'.repeat(64),reviewerId:'reviewer',reviewerSessionId:'different',summary:'Observed assertion and canonical requirement',criterionIds:['AC-1'],runIds:['run1'],verdict:'PASS',resolvedFailureIds:[],...patch};}
function assess(t,runs,reviews=[]){return evaluate(t,'a'.repeat(64),runs,reviews,{runIds:new Set(runs.map(r=>r.id)),reviewIds:new Set(reviews.map(r=>r.id))});}
test('raw PASS without review is not acceptance',()=>{const t=definition(),a=assess(t,[evidence(t)]);assert.equal(a.criteria[0].outcome,'PASS');assert.equal(a.gateReady,false);assert.ok(a.reasonCodes.includes('REVIEW_MISSING'));});
test('complete current proof with independent review accepts locally, not release',()=>{const t=definition(),a=assess(t,[evidence(t)],[review(t)]);assert.equal(a.gateReady,true);assert.equal(a.releaseReady,false);assert.equal(a.mode,'ASSISTED');});
test('empty target never produces vacuous PASS',()=>{const t=definition();t.criteria[0].target=false;assert.equal(assess(t,[]).gateReady,false);});
test('no evidence retains NOT_RUN despite open finding',()=>{const t=definition(),a=evaluate(t,'a'.repeat(64),[],[],{runIds:new Set(),reviewIds:new Set()},['*']);assert.equal(a.criteria[0].outcome,'NOT_RUN');assert.equal(a.gateReady,false);});
test('current failure dominates an older pass',()=>{const t=definition(),a=assess(t,[evidence(t),evidence(t,{id:'run2',outcome:'FAIL',exitCode:1})],[review(t)]);assert.equal(a.criteria[0].outcome,'FAIL');assert.equal(a.requirements[0].status,'FAILED');});
test('a failure cannot be hidden by a newer PASS without disposition',()=>{const t=definition(),a=assess(t,[evidence(t,{id:'failed',outcome:'FAIL'}),evidence(t)],[review(t)]);assert.equal(a.gateReady,false);});
test('reviewed failure disposition retains history and permits a corrected run',()=>{const t=definition(),a=assess(t,[evidence(t,{id:'failed',outcome:'FAIL'}),evidence(t)],[review(t,{runIds:['failed','run1'],resolvedFailureIds:['failed']})]);assert.equal(a.gateReady,true);});
test('stale result preserves historical PASS without current outcome',()=>{const t=definition(),a=assess(t,[evidence(t,{finishedCandidate:'b'.repeat(64)})]);assert.equal(a.criteria[0].freshness,'STALE');assert.equal(a.criteria[0].outcome,'NOT_RUN');assert.equal(a.criteria[0].lastKnownOutcome,'PASS');});
for(const [name,patch] of [['skipped',{tests:[{selector:'sample.test.mjs::AC-pass',status:'SKIPPED'}]}],['zero tests',{tests:[]}],['duplicate test',{tests:[{selector:'sample.test.mjs::AC-pass',status:'PASS'},{selector:'sample.test.mjs::AC-pass',status:'PASS'}]}],['truncated',{truncated:true}],['wrong profile',{profile:'different'}],['wrong policy',{taskDigest:'b'.repeat(64)}]])test(name+' does not open acceptance',()=>{const t=definition();assert.equal(assess(t,[evidence(t,patch)],[review(t)]).gateReady,false);});
test('forged JSON cannot supply provenance via its own fields',()=>{const t=definition(),a=evaluate(t,'a'.repeat(64),[evidence(t)],[review(t)],{runIds:new Set(),reviewIds:new Set()});assert.equal(a.gateReady,false);assert.ok(a.reasonCodes.includes('PROVENANCE_UNVERIFIED'));});
test('self-review or author session never counts as independent',()=>{const t=definition();for(const p of [{reviewerId:'worker'},{reviewerSessionId:'session-one'}])assert.equal(assess(t,[evidence(t)],[review(t,p)]).gateReady,false);});
test('unverified NFR blocks aggregate acceptance',()=>{const t=definition();t.bindings.push({...t.bindings[0],id:'B-NFR'});t.criteria.push({id:'NFR-1',requirementId:null,target:true,bindingIds:['B-NFR']});assert.equal(assess(t,[evidence(t)],[review(t)]).gateReady,false);});
