import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {basename,relative,resolve} from 'node:path';
import {CONTRACT,type Binding,type Principal,type RunEvidence,type TaskDefinition,type TestObservation} from './types.js';
import {digest,fileRef,redact,safePath,snapshot} from './files.js';

export interface RunOptions {signal?:AbortSignal;env?:Record<string,string>;secrets?:string[];invocationId?:string}
/** No shell, bounded output, exact mapping, and cancellation of the owned process group. Not an OS sandbox. */
export async function recordRun(root:string,task:TaskDefinition,binding:Binding,principal:Principal,options:RunOptions={}):Promise<RunEvidence> {
  const candidate=snapshot(root,task.inputPaths,options.env);
  const id=options.invocationId??randomUUID(); const startedAt=new Date().toISOString();
  const output:Buffer[]=[];const errorOutput:Buffer[]=[];
  let bytes=0,truncated=false,cause:string|null=null,dispatched=false,exitCode:number|null=null,spawnError=false;
  const reporter=fileURLToPath(new URL('./reporter.js',import.meta.url));
  let argv:string[];
  if(binding.kind==='node-test') {
    for(const path of binding.argv) {
      safePath(root,path);
      if(!task.inputPaths.includes(path))throw new Error('TEST_INPUT_NOT_PINNED');
    }
    argv=[process.execPath,'--test',`--test-reporter=${reporter}`,...binding.argv];
  } else {
    argv=binding.argv.map((v,i)=>i===0&&v==='$NODE'?process.execPath:v);
    // Script files passed to the command must be in the contributing input inventory.
    for(const arg of argv.slice(1)) if(/\.(?:[cm]?[jt]s|py|sh)$/.test(arg)&&!arg.startsWith('-')) {
      const path=relative(root,resolve(root,arg)).split('\\').join('/');
      safePath(root,path);if(!task.inputPaths.includes(path))throw new Error('SCRIPT_INPUT_NOT_PINNED');
    }
  }
  const env:NodeJS.ProcessEnv={};
  for(const key of ['PATH','HOME','TMPDIR','TEMP','SystemRoot','WINDIR','LANG'])if(process.env[key])env[key]=process.env[key];
  Object.assign(env,options.env??{}); delete env.NODE_OPTIONS; delete env.NODE_V8_COVERAGE;
  const secrets=[...(options.secrets??[]),...Object.entries(options.env??{}).filter(([k])=>/token|password|secret|key/i.test(k)).map(([,v])=>v)];
  if(options.signal?.aborted)cause='CANCELLED';
  else await new Promise<void>(done=>{
    const child=spawn(argv[0]!,argv.slice(1),{cwd:root,env,shell:false,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
    let hardTimer:ReturnType<typeof setTimeout>|undefined;
    const kill=(signal:NodeJS.Signals)=>{
      try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,signal);else child.kill(signal);}catch{/* already exited */}
    };
    const stop=(reason:string)=>{if(cause)return;cause=reason;kill('SIGTERM');hardTimer=setTimeout(()=>kill('SIGKILL'),250);};
    const onCancel=()=>stop('CANCELLED');
    const timer=setTimeout(()=>stop('TIMED_OUT'),task.policy.timeoutMs);
    options.signal?.addEventListener('abort',onCancel,{once:true});
    if(options.signal?.aborted)onCancel();
    child.once('spawn',()=>{dispatched=true;});
    child.once('error',()=>{spawnError=true;});
    const collect=(target:Buffer[])=>(chunk:Buffer)=>{
      const keep=Math.max(0,task.policy.maxOutputBytes-bytes);if(keep)target.push(chunk.subarray(0,keep));
      bytes+=chunk.length;if(bytes>task.policy.maxOutputBytes){truncated=true;stop('OUTPUT_LIMIT');}
    };
    child.stdout.on('data',collect(output));child.stderr.on('data',collect(errorOutput));
    child.once('close',(code)=>{exitCode=code;clearTimeout(timer);if(hardTimer)clearTimeout(hardTimer);options.signal?.removeEventListener('abort',onCancel);done();});
  });
  const raw=Buffer.concat(output).toString('utf8');const rawError=Buffer.concat(errorOutput).toString('utf8');
  if(spawnError)exitCode=null;
  const tests:TestObservation[]=[];const reasons:string[]=[];let stdout=raw,stderr=rawError;
  if(binding.kind==='node-test') {
    const logs:string[]=[];
    for(const line of raw.split('\n').filter(Boolean)) {
      try {
        const item=JSON.parse(line) as Record<string,unknown>;
        if(item.kind==='result'&&typeof item.selector==='string'&&typeof item.file==='string'&&['PASS','FAIL','SKIPPED','CANCELLED'].includes(String(item.status)))
          tests.push({selector:item.selector,status:item.status as TestObservation['status'],file:item.file});
        else if(item.kind==='log'&&typeof item.text==='string')logs.push(item.text);
        else reasons.push('REPORTER_PROTOCOL');
      }catch{reasons.push('REPORTER_PROTOCOL');}
    }
    stdout=logs.join('');
    if(binding.selectors.some(s=>tests.filter(t=>t.selector===s).length!==1))reasons.push('COLLECTION_INCOMPLETE');
    if(tests.some(t=>t.status==='SKIPPED'||t.status==='CANCELLED'))reasons.push('TEST_NOT_EXECUTED');
  }
  let finishedCandidate='0'.repeat(64);
  try{finishedCandidate=snapshot(root,task.inputPaths,options.env).digest;}catch{reasons.push('INPUTS_UNAVAILABLE');}
  if(finishedCandidate!==candidate.digest)reasons.push('INPUTS_CHANGED_DURING_RUN');
  const artifacts=[];
  for(const path of binding.artifacts)try{const ref=fileRef(root,path);if(!ref.bytes)throw new Error('empty');artifacts.push(ref);}catch{reasons.push('ARTIFACT_UNAVAILABLE');}
  if(spawnError)reasons.push('SPAWN_ERROR');if(truncated)reasons.push('OUTPUT_LIMIT');
  if(cause)reasons.push(cause);
  const failed=exitCode!==binding.expectedExit||tests.some(t=>t.status==='FAIL')||
    (binding.kind==='command'&&binding.expectedStdout!==null&&stdout!==binding.expectedStdout);
  let outcome:RunEvidence['outcome']=reasons.length?'BLOCKED':failed?'FAIL':'PASS';
  if(cause==='CANCELLED'||cause==='TIMED_OUT'||cause==='OUTPUT_LIMIT') {
    outcome=binding.mutation&&dispatched?'UNKNOWN':cause==='CANCELLED'?'CANCELLED':cause==='TIMED_OUT'?'TIMED_OUT':'BLOCKED';
    if(outcome==='UNKNOWN')reasons.push('SIDE_EFFECTS_REQUIRE_RECONCILIATION');
  } else if(failed&&!spawnError)outcome='FAIL';
  return {contract:CONTRACT,id,taskId:task.id,taskDigest:digest(task),bindingId:binding.id,profile:binding.profile,candidate,finishedCandidate,
    startedAt,finishedAt:new Date().toISOString(),outcome,exitCode,tests,artifacts,stdout:redact(stdout,secrets),stderr:redact(stderr,secrets),truncated,
    reasonCodes:[...new Set(reasons)],producer:{id:principal.id,sessionId:principal.sessionId,invocationId:id,mode:'ASSISTED'}};
}
