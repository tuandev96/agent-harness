#!/usr/bin/env node
/** Collect local check summaries into a bands metrics file. Offline. */
import {readdirSync,readFileSync,writeFileSync,mkdirSync,statSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';

const args=process.argv.slice(2);
const opt={root:'.harness-checks',out:'.harness-checks/bands-metrics.json',metric:'ci_test_failure_rate'};
for(let i=0;i<args.length;i++){
  if(args[i]==='--root')opt.root=args[++i];
  else if(args[i]==='--out')opt.out=args[++i];
  else{console.error('Usage: node scripts/collect-bands-metrics.mjs [--root .harness-checks] [--out file.json]');process.exit(2);}
}
const root=resolve(opt.root);
if(!existsSync(root)){
  console.log(JSON.stringify({outcome:'NO_CHECKS_DIR',root,releaseReady:false},null,2));
  process.exit(0);
}
const values=[];
const runs=[];
for(const name of readdirSync(root).sort()){
  const summary=join(root,name,'summary.json');
  if(!existsSync(summary))continue;
  try{
    const data=JSON.parse(readFileSync(summary,'utf8'));
    const commands=Array.isArray(data.commands)?data.commands:[];
    const failed=commands.filter(c=>String(c.outcome||c.status||'').toUpperCase()==='FAIL').length;
    const total=commands.length||1;
    const rate=failed/total;
    const mtime=statSync(summary).mtime.toISOString();
    values.push(rate);
    runs.push({run:name,failed,total,rate,outcome:data.outcome||null,at:mtime});
  }catch{/* skip unreadable */}
}
const payload={
  contract:'harness-bands-metrics/1',
  metric:opt.metric,
  source:'local_harness_checks',
  collectedAt:new Date().toISOString(),
  sampleCount:values.length,
  values,
  runs:runs.slice(-20),
  releaseReady:false,
  note:'Local rehearsal series from .harness-checks summaries. Not production CI telemetry.'
};
mkdirSync(dirname(resolve(opt.out)),{recursive:true});
writeFileSync(resolve(opt.out),JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({outcome:'METRICS_COLLECTED',sampleCount:values.length,out:opt.out,last:values[values.length-1]??null},null,2));
