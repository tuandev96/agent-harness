import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deliveryCheck, autoAdvance } from '../../.agent-presets/router-standard/router-bootstrap-v34.mjs'
import { apply as applyShell } from '../../.agent-presets/router-standard/gitbash-executor.mjs'

test('self-declared PASS is not delivery proof', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'harness-gate-'))
  try {
    const file = join(dir, 'output.html'); writeFileSync(file, '<h1>not verified</h1>')
    const result = await deliveryCheck({}, {file, evidence:{items:[{kind:'run',label:'tests',result:'All tests passed'}]}})
    assert.equal(result.ok, false)
  } finally { rmSync(dir, {recursive:true, force:true}) }
})

test('failed call does not advance a phase', () => {
  assert.equal(autoAdvance(2, [{name:'delivery_check', result:{ok:false}, success:false}], ''), 2)
  assert.equal(autoAdvance(1, [{name:'exit_plan_mode', success:false}], ''), 1)
})

test('call name without outcome is not a completion signal', () => {
  assert.equal(autoAdvance(2, ['delivery_check'], ''), 2)
})

test('Git Bash deadline reaches subprocess even with a caller signal', async () => {
  let shell, observedSignal
  const caller = new AbortController()
  applyShell({ provide(_name, value) { shell=value }, subprocess: { spawn(spec) {
    observedSignal=spec.signal
    return {done:new Promise(resolve=>setTimeout(()=>resolve({exitCode:0}),25)),collected:{}}
  } } })
  const result=await shell.run({command:'true',workdir:tmpdir(),timeoutMs:5,stdoutMaxBytes:100,signal:caller.signal})
  assert.equal(observedSignal.aborted, true)
  assert.equal(result.timedOut,true)
})

test('Git Bash caller cancellation is distinguished from deadline', async () => {
  let shell
  const caller = new AbortController()
  applyShell({provide(_name,value){shell=value},subprocess:{spawn(){
    setTimeout(()=>caller.abort(),1)
    return {done:new Promise(resolve=>setTimeout(()=>resolve({exitCode:-1}),10)),collected:{}}
  }}})
  const result=await shell.run({command:'true',workdir:tmpdir(),timeoutMs:1000,stdoutMaxBytes:100,signal:caller.signal})
  assert.equal(result.aborted,true)
  assert.equal(result.timedOut,false)
})
