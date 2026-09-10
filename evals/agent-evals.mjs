#!/usr/bin/env node
/** Offline agent-eval aggregator. Does not call models. IMPORTED_NOT_INDEPENDENTLY_VERIFIED. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2);
const opt={};
for(let i=0;i<args.length;i++){
  if(args[i]==='--input')opt.input=args[++i];
  else if(args[i]==='--output')opt.output=args[++i];
  else if(args[i]==='--suite')opt.suite=args[++i];
  else{console.error('Usage: node evals/agent-evals.mjs --suite <dir> [--output summary.json]');process.exit(2);}
}
if(!opt.suite){console.error('--suite required');process.exit(2);}
const suiteDir=resolve(opt.suite);
const cases=[];
const {readdirSync}=await import('node:fs');
for(const name of readdirSync(suiteDir).filter(n=>n.endsWith('.json')).sort()){
  const raw=JSON.parse(readFileSync(resolve(suiteDir,name),'utf8'));
  cases.push({file:name,...raw});
}
const required=['id','prompt','checks'];
const missing=[];
for(const c of cases){
  for(const k of required) if(c[k]===undefined) missing.push(`${c.file}:${k}`);
}
if(missing.length){console.error('INVALID_EVAL_CASE',missing);process.exit(1);}
const summary={
  contract:'harness-agent-eval-observations/1',
  suite:suiteDir,
  caseCount:cases.length,
  cases:cases.map(c=>({id:c.id,checks:c.checks,promptDigest:createHash('sha256').update(String(c.prompt)).digest('hex').slice(0,16)})),
  status:'FIXTURES_READY',
  liveModelRuns:0,
  independentlyVerified:false,
  releaseReady:false,
  note:'This runner validates suite shape only. Live non-interactive runs belong in CI with a paid key and budget owner approval.'
};
if(cases.length<1){console.error('EMPTY_SUITE');process.exit(1);}
if(opt.output){
  mkdirSync(dirname(resolve(opt.output)),{recursive:true});
  writeFileSync(resolve(opt.output),JSON.stringify(summary,null,2)+'\n');
}
console.log(JSON.stringify({outcome:'AGENT_EVAL_SUITE_OK',caseCount:cases.length,status:summary.status},null,2));
