#!/usr/bin/env node
/**
 * Live agent-eval runner using a local coding-agent CLI (codex or cursor-agent).
 * Does not call Anthropic APIs. Budget: uses already-authenticated local CLIs.
 */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';

const args=process.argv.slice(2);
const opt={suite:'evals/suite',runner:'cursor',model:null,out:'.harness-checks/live-agent-evals.json',limit:5};
for(let i=0;i<args.length;i++){
  const a=args[i];
  if(a==='--suite')opt.suite=args[++i];
  else if(a==='--runner')opt.runner=args[++i];
  else if(a==='--model')opt.model=args[++i];
  else if(a==='--out')opt.out=args[++i];
  else if(a==='--limit')opt.limit=Number(args[++i]);
  else{console.error('Usage: node evals/run-live.mjs [--runner cursor|codex] [--limit N]');process.exit(2);}
}

const suiteDir=resolve(opt.suite);
const cases=readdirSync(suiteDir).filter(n=>n.endsWith('.json')).sort().slice(0,opt.limit)
  .map(n=>({file:n,...JSON.parse(readFileSync(join(suiteDir,n),'utf8'))}));

function runCursor(prompt,model){
  const m=model||'cursor-grok-4.6-high-fast';
  const r=spawnSync('cursor-agent',[
    '-p','--mode','ask','--trust','--force','--model',m,'--output-format','text',prompt
  ],{encoding:'utf8',timeout:90000,maxBuffer:2*1024*1024});
  return {ok:r.status===0,text:(r.stdout||'')+(r.stderr?`\n[stderr] ${r.stderr}`:''),status:r.status};
}

function runCodex(prompt,model){
  const m=model||'gpt-5.5';
  const r=spawnSync('codex',['exec','--sandbox','read-only','-m',m,'-c','model_reasoning_effort=low','-o','/tmp/agent-eval-last.txt'],{
    input:prompt,encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024
  });
  let text='';
  try{text=readFileSync('/tmp/agent-eval-last.txt','utf8');}catch{text=(r.stdout||'')+(r.stderr||'');}
  return {ok:r.status===0,text,status:r.status};
}

function score(caseDef,text){
  const checks=caseDef.checks||[];
  const lower=String(text||'').toLowerCase();
  const hits=[];
  for(const c of checks){
    // Heuristic: check if output addresses the check keywords (not a semantic oracle).
    const words=String(c).toLowerCase().match(/[a-z0-9_]{4,}/g)||[];
    const need=Math.min(3,Math.max(2,Math.floor(words.length/3)));
    const hit=words.slice(0,8).filter(w=>lower.includes(w)).length>=need;
    hits.push({check:c,hit});
  }
  const passed=hits.filter(h=>h.hit).length;
  return {passed,total:checks.length,hits,heuristic:true};
}

const runner=opt.runner==='codex'?runCodex:runCursor;
const results=[];
for(const c of cases){
  process.stderr.write(`RUN ${c.id} via ${opt.runner}\n`);
  const out=runner(c.prompt,opt.model);
  const s=score(c,out.text);
  results.push({
    id:c.id,
    runner:opt.runner,
    model:opt.model||(opt.runner==='codex'?'gpt-5.5':'cursor-grok-4.6-high-fast'),
    exit:out.status,
    heuristicScore:`${s.passed}/${s.total}`,
    checks:s.hits,
    outputChars:(out.text||'').length,
    outputPreview:(out.text||'').slice(0,400),
    independentlyVerified:false
  });
}
const summary={
  contract:'harness-live-agent-evals/1',
  runner:opt.runner,
  model:opt.model||(opt.runner==='codex'?'gpt-5.5':'cursor-grok-4.6-high-fast'),
  ranAt:new Date().toISOString(),
  caseCount:results.length,
  results,
  scoring:'HEURISTIC_KEYWORD_NOT_SEMANTIC_ORACLE',
  independentlyVerified:false,
  releaseReady:false,
  note:'Local CLI runner. Heuristic scoring is a rehearsal signal, not a certified eval oracle.'
};
mkdirSync(dirname(resolve(opt.out)),{recursive:true});
writeFileSync(resolve(opt.out),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({
  outcome:'LIVE_AGENT_EVALS_RAN',
  runner:opt.runner,
  caseCount:results.length,
  scores:results.map(r=>`${r.id}:${r.heuristicScore}`),
  out:opt.out
},null,2));
