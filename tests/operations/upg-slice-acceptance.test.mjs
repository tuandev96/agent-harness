import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync,readFileSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
function run(cmd,args,opts={}){
  return execFileSync(cmd,args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],...opts});
}

// UPG subset for this slice (not full 24-control acceptance).
test('UPG-14/15-adjacent: production-gate blocks without auth and allows with token',()=>{
  const payload=JSON.stringify({tool_input:{command:'deploy --env production'}});
  const status=(env={})=>{
    try{
      execFileSync('bash',[join(root,'hooks/production-gate.sh')],{input:payload,env:{...process.env,...env},stdio:['pipe','pipe','pipe']});
      return 0;
    }catch(e){return e.status;}
  };
  assert.equal(status(),2);
  assert.equal(status({RELEASE_APPROVAL:'CHG-1'}),0);
});

test('UPG-20: installer preserves user AGENTS.md outside managed block',async()=>{
  const {planInstall,install}=await import('../../dist/core/installer.js');
  const base=mkdtempSync(join(tmpdir(),'upg20-'));
  try{
    const source=join(base,'source'),target=join(base,'target');
    for(const p of [source,target,join(source,'protocol'),join(source,'templates'),join(source,'hooks'),
      join(source,'skills/requirements-spec'),join(source,'skills/capture-intent'),join(source,'skills/plan-mode'),join(source,'skills/review-policy')])mkdirSync(p,{recursive:true});
    writeFileSync(join(source,'package.json'),JSON.stringify({version:'upg-1'}));
    writeFileSync(join(source,'protocol/harness-protocol.md'),'p\n');
    writeFileSync(join(source,'templates/task.md'),'t\n');
    writeFileSync(join(source,'hooks/x.sh'),'#!/bin/bash\nexit 0\n');
    for(const s of ['requirements-spec','capture-intent','plan-mode','review-policy'])writeFileSync(join(source,`skills/${s}/SKILL.md`),'s\n');
    writeFileSync(join(target,'AGENTS.md'),'USER RULES KEEP ME\n');
    const plan=planInstall(source,target);
    install(plan);
    const text=readFileSync(join(target,'AGENTS.md'),'utf8');
    assert.ok(text.startsWith('USER RULES KEEP ME\n'));
    assert.ok(text.includes('AGENT-HARNESS:START'));
  } finally { rmSync(base,{recursive:true,force:true}); }
});

test('UPG-22: portable capabilities stay ASSISTED / not native-verified',async()=>{
  const {capabilities}=await import('../../adapters/portable/index.mjs');
  for(const runtime of ['claude-code','codex','grok','cursor','dsh']){
    const c=capabilities(runtime,[{runtime,evidencePath:'x',verified:true}]);
    assert.equal(c.mode,'ASSISTED');
    assert.equal(c.nativeConformanceVerified,false);
    assert.equal(c.skills.captureIntent,'skills/capture-intent/SKILL.md');
  }
});

test('UPG-23-adjacent: agent-eval suite shape validates and rejects empty',()=>{
  const out=run(process.execPath,['evals/agent-evals.mjs','--suite','evals/suite','--output','.harness-checks/agent-eval-summary.json']);
  assert.match(out,/AGENT_EVAL_SUITE_OK/);
  const summary=JSON.parse(readFileSync(join(root,'.harness-checks/agent-eval-summary.json'),'utf8'));
  assert.ok(summary.caseCount>=5);
  assert.equal(summary.independentlyVerified,false);
  assert.equal(summary.releaseReady,false);
  const empty=mkdtempSync(join(tmpdir(),'evals-empty-'));
  try{
    assert.throws(()=>run(process.execPath,['evals/agent-evals.mjs','--suite',empty]));
  } finally { rmSync(empty,{recursive:true,force:true}); }
});

test('bands detector is deterministic and does not invent metrics without input',()=>{
  const out=run(process.execPath,['scripts/bands-detect.mjs','--bands','bands.yaml']);
  assert.match(out,/NO_METRICS/);
});

test('bands detector writes intent at 3sigma when --apply',()=>{
  const base=mkdtempSync(join(tmpdir(),'bands-'));
  try{
    const metrics=join(base,'m.json');
    writeFileSync(metrics,JSON.stringify({values:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,50]}));
    const outDir=join(base,'intents');
    const out=run(process.execPath,['scripts/bands-detect.mjs','--bands','bands.yaml','--metrics',metrics,'--apply','--out-dir',outDir]);
    const result=JSON.parse(out.trim());
    assert.equal(result.tier,'3sigma');
    assert.ok(result.intent);
    assert.ok(existsSync(result.intent));
    const intent=readFileSync(result.intent,'utf8');
    assert.match(intent,/## Problem/);
    assert.match(intent,/## Proposed outcome/);
    assert.match(intent,/## Open questions/);
  } finally { rmSync(base,{recursive:true,force:true}); }
});

test('host observation script records PASS for all cases',()=>{
  const outDir=mkdtempSync(join(tmpdir(),'host-obs-'));
  try{
    const out=join(outDir,'obs.json');
    execFileSync('bash',[join(root,'scripts/observe-host-hooks.sh'),out],{cwd:root,encoding:'utf8',stdio:['pipe','pipe','pipe']});
    const data=JSON.parse(readFileSync(out,'utf8'));
    assert.equal(data.summary.fail,0);
    assert.equal(data.summary.pass,data.summary.total);
    assert.equal(data.enforcementClaim,'NONE');
  } finally { rmSync(outDir,{recursive:true,force:true}); }
});

test('live agent-eval runner and bands metrics collector exist and are offline-safe',()=>{
  assert.ok(existsSync(join(root,'evals/run-live.mjs')));
  assert.ok(existsSync(join(root,'scripts/collect-bands-metrics.mjs')));
  const collected=run(process.execPath,['scripts/collect-bands-metrics.mjs','--out','.harness-checks/bands-metrics-test.json']);
  assert.match(collected,/METRICS_COLLECTED|NO_CHECKS_DIR/);
  const metrics=JSON.parse(readFileSync(join(root,'.harness-checks/bands-metrics-test.json'),'utf8'));
  assert.equal(metrics.releaseReady,false);
  assert.equal(metrics.source,'local_harness_checks');
});

test('Claude settings wire portable hooks for this repo',()=>{
  const settings=JSON.parse(readFileSync(join(root,'.claude/settings.json'),'utf8'));
  const commands=JSON.stringify(settings);
  assert.match(commands,/protected-paths\.sh/);
  assert.match(commands,/production-gate\.sh/);
  assert.match(commands,/secret-diff\.sh/);
  assert.match(commands,/test-edit-protect\.sh/);
});
