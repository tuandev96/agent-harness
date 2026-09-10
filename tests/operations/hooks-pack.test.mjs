import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,chmodSync,statSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {planInstall,install} from '../../dist/core/installer.js';

const hooksDir=join(dirname(fileURLToPath(import.meta.url)),'../../hooks');
function ensureHookMode(script) {
  const path=join(hooksDir,script);
  try{chmodSync(path,0o755);}catch{/* best-effort; bash path still works */}
  return path;
}
function runHook(script,payload,env={}) {
  const path=ensureHookMode(script);
  // Invoke via bash so tests work even if an archive dropped +x.
  return execFileSync('bash',[path],{
    input:JSON.stringify(payload),
    env:{...process.env,...env},
    encoding:'utf8',
    stdio:['pipe','pipe','pipe'],
  });
}
function runHookStatus(script,payload,env={}) {
  try{runHook(script,payload,env);return 0;}
  catch(error){return typeof error.status==='number'?error.status:1;}
}

test('protected-paths allows normal source and blocks .env and generated',()=>{
  assert.equal(runHookStatus('protected-paths.sh',{tool_input:{file_path:'/proj/src/a.ts'}}),0);
  assert.equal(runHookStatus('protected-paths.sh',{tool_input:{file_path:'/proj/.env'}}),2);
  assert.equal(runHookStatus('protected-paths.sh',{tool_input:{file_path:'src/generated/types.ts'}}),2);
  assert.equal(runHookStatus('protected-paths.sh',{tool_input:{file_path:'node_modules/x/index.js'}}),2);
});

test('test-edit-protect blocks tests only during fix tasks',()=>{
  const payload={tool_input:{file_path:'/proj/tests/foo.test.ts'}};
  assert.equal(runHookStatus('test-edit-protect.sh',payload,{HARNESS_TASK_KIND:'fix'}),2);
  assert.equal(runHookStatus('test-edit-protect.sh',{tool_input:{file_path:'/proj/src/foo.ts'}},{HARNESS_TASK_KIND:'fix'}),0);
  assert.equal(runHookStatus('test-edit-protect.sh',payload,{HARNESS_TASK_KIND:'feature'}),0);
  assert.equal(runHookStatus('test-edit-protect.sh',{tool_input:{file_path:'/proj/docs/latest.md'}},{HARNESS_TASK_KIND:'fix'}),0);
});

test('production-gate blocks prod deploy without RELEASE_APPROVAL',()=>{
  const payload={tool_input:{command:'deploy --env production'}};
  assert.equal(runHookStatus('production-gate.sh',payload),2);
  assert.equal(runHookStatus('production-gate.sh',payload,{RELEASE_APPROVAL:'CHG-1'}),0);
  assert.equal(runHookStatus('production-gate.sh',{tool_input:{command:'deploy --env staging'}}),0);
});

test('secret-diff blocks staged and untracked secrets and allows clean add',()=>{
  const base=realpathSync(mkdtempSync(join(tmpdir(),'hooks-secret-')));
  try{
    const repo=join(base,'repo');
    mkdirSync(repo);
    execFileSync('git',['init','-q'],{cwd:repo});
    execFileSync('git',['config','user.email','t@t.local'],{cwd:repo});
    execFileSync('git',['config','user.name','t'],{cwd:repo});
    writeFileSync(join(repo,'a.txt'),'ok\n');
    execFileSync('git',['add','a.txt'],{cwd:repo});
    const fake=`ghp_${'B'.repeat(36)}`;
    writeFileSync(join(repo,'secret.txt'),`password = "${fake}"\n`);
    // Untracked secret blocks on git add; bare commit with empty index is allowed
    assert.equal(runHookStatus('secret-diff.sh',{cwd:repo,tool_input:{command:'git commit -m x'}}),0);
    assert.equal(runHookStatus('secret-diff.sh',{cwd:repo,tool_input:{command:'git add secret.txt'}}),2);
    execFileSync('git',['add','secret.txt'],{cwd:repo});
    assert.equal(runHookStatus('secret-diff.sh',{cwd:repo,tool_input:{command:'git commit -m x'}}),2);
    assert.equal(runHookStatus('secret-diff.sh',{tool_input:{command:`git commit -m 'token ${fake}'`}}),2);
    // Detector source that quotes a pattern must not block adding that source
    const selfRepo=join(base,'self');
    mkdirSync(join(selfRepo,'hooks'),{recursive:true});
    execFileSync('git',['init','-q'],{cwd:selfRepo});
    execFileSync('git',['config','user.email','t@t.local'],{cwd:selfRepo});
    execFileSync('git',['config','user.name','t'],{cwd:selfRepo});
    writeFileSync(join(selfRepo,'hooks/secret-diff.sh'),"secret_re='ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}'\n");
    assert.equal(runHookStatus('secret-diff.sh',{cwd:selfRepo,tool_input:{command:'git add hooks/secret-diff.sh'}}),0);
    const clean=join(base,'clean');
    mkdirSync(clean);
    execFileSync('git',['init','-q'],{cwd:clean});
    execFileSync('git',['config','user.email','t@t.local'],{cwd:clean});
    execFileSync('git',['config','user.name','t'],{cwd:clean});
    writeFileSync(join(clean,'ok.txt'),'ok\n');
    execFileSync('git',['add','ok.txt'],{cwd:clean});
    assert.equal(runHookStatus('secret-diff.sh',{cwd:clean,tool_input:{command:'git commit -m ok'}}),0);
    assert.equal(runHookStatus('secret-diff.sh',{tool_input:{command:'git status'}}),0);
  } finally { rmSync(base,{recursive:true,force:true}); }
});

test('installer writes hook scripts executable on unix',t=>{
  const base=realpathSync(mkdtempSync(join(tmpdir(),'hooks-install-')));
  t.after(()=>rmSync(base,{recursive:true,force:true}));
  const source=join(base,'source'),target=join(base,'target');
  for(const path of [source,target,join(source,'protocol'),join(source,'templates'),join(source,'hooks'),
    join(source,'skills/requirements-spec'),join(source,'skills/capture-intent'),join(source,'skills/plan-mode'),join(source,'skills/review-policy')])mkdirSync(path,{recursive:true});
  writeFileSync(join(source,'package.json'),JSON.stringify({version:'test-1'}));
  writeFileSync(join(source,'protocol/harness-protocol.md'),'protocol\n');
  writeFileSync(join(source,'templates/task.md'),'task\n');
  writeFileSync(join(source,'hooks/protected-paths.sh'),'#!/bin/bash\nexit 0\n');
  chmodSync(join(source,'hooks/protected-paths.sh'),0o755);
  writeFileSync(join(source,'skills/requirements-spec/SKILL.md'),'skill\n');
  writeFileSync(join(source,'skills/capture-intent/SKILL.md'),'intent\n');
  writeFileSync(join(source,'skills/plan-mode/SKILL.md'),'plan\n');
  writeFileSync(join(source,'skills/review-policy/SKILL.md'),'review\n');
  install(planInstall(source,target));
  const installed=join(target,'hooks/protected-paths.sh');
  if(process.platform!=='win32') assert.equal(statSync(installed).mode & 0o111, 0o111);
});
