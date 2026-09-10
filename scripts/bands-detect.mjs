#!/usr/bin/env node
/** Deterministic band detector + intent writer. No model calls. */
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,statSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2);
const opt={bands:'bands.yaml',metrics:null,dryRun:true,outDir:'intents'};
for(let i=0;i<args.length;i++){
  const a=args[i];
  if(a==='--bands')opt.bands=args[++i];
  else if(a==='--metrics')opt.metrics=args[++i];
  else if(a==='--apply')opt.dryRun=false;
  else if(a==='--out-dir')opt.outDir=args[++i];
  else if(a==='--value')opt.value=Number(args[++i]);
  else{console.error('Usage: node scripts/bands-detect.mjs [--bands bands.yaml] [--metrics file.json] [--value N] [--apply]');process.exit(2);}
}

function loadYamlLite(text){
  // Minimal subset parser for this repo's bands.yaml (no dependency).
  const out={tiers:{}};
  const lines=text.split(/\r?\n/);
  let section=null,tier=null;
  for(const raw of lines){
    if(!raw.trim()||raw.trim().startsWith('#'))continue;
    const line=raw.replace(/\s+$/,'');
    const mTop=line.match(/^([a-zA-Z_][\w]*):\s*(.*)$/);
    if(mTop && !line.startsWith(' ') && !line.startsWith('\t')){
      const [,k,v]=mTop;
      if(k==='tiers'){section='tiers';tier=null;continue;}
      section=null;tier=null;
      if(v!==undefined && v!=='') out[k]=v.replace(/^["']|["']$/g,'');
      else if(!(k in out)) out[k]={};
      continue;
    }
    if(section==='tiers'){
      const mTier=line.match(/^\s{2}(\w+):\s*$/);
      if(mTier){tier=mTier[1];out.tiers[tier]={};continue;}
      if(tier){
        const mKv=line.match(/^\s{4}([\w]+):\s*(.*)$/);
        if(mKv){
          let v=mKv[2].replace(/^["']|["']$/g,'');
          if(v==='')v=[];
          out.tiers[tier][mKv[1]]=v;
        }
      }
    }
  }
  return out;
}

function collectValues(metricsPath){
  if(metricsPath){
    const data=JSON.parse(readFileSync(metricsPath,'utf8'));
    if(Array.isArray(data.values))return data.values.map(Number);
    if(Array.isArray(data.samples))return data.samples.map(Number);
    throw new Error('METRICS_SHAPE');
  }
  // Offline rehearsal: treat recent test summaries as 0/1 failure series is not meaningful.
  // Require explicit --metrics or --value for real detection.
  return null;
}

function mean(a){return a.reduce((x,y)=>x+y,0)/a.length;}
function stddev(a){
  if(a.length<2)return 0;
  const m=mean(a);
  return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));
}

function detect(values,current){
  const m=mean(values),s=stddev(values);
  if(s===0)return {sigma:0,z:0,baseline:m};
  const z=(current-m)/s;
  return {sigma:Math.abs(z),z,baseline:m,stdev:s};
}

function tierFor(sigma){
  if(sigma>=3)return '3sigma';
  if(sigma>=2)return '2sigma';
  if(sigma>=1)return '1sigma';
  return null;
}

function writeIntent({tier,metric,value,stats,bands}){
  const home=resolve(opt.outDir);
  mkdirSync(home,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const path=join(home,`${stamp}-${metric}-${tier}.md`);
  const body=`# Intent: control-band breach ${metric}

Author: bands-detector (deterministic). Status: draft.
Source: bands.yaml metric ${metric} ${tier}.
Date: ${new Date().toISOString()}.

## Problem
Metric \`${metric}\` breached ${tier} (value=${value}, baseline≈${stats.baseline??'n/a'}).
Deterministic detector only; no model in detection.

## Proposed outcome
Triage the breach: diagnose at 2σ, propose PR/runbook at 3σ. Keep eval coverage for the incident class.

## Affected users and systems
- CI / harness checks
- Service owners for metric: ${metric}

## Constraints
- Do not weaken tests or hooks to silence the band.
- Human triage decides fix / schedule / dismiss.

## Open questions
- Is this flaky, real regression, or instrumentation drift?
- Should this incident become a permanent eval case?
`;
  if(opt.dryRun){
    return path;
  }
  writeFileSync(path,body);
  return path;
}

const bands=loadYamlLite(readFileSync(resolve(opt.bands),'utf8'));
const values=collectValues(opt.metrics);
if(!values && opt.value===undefined){
  console.log(JSON.stringify({
    outcome:'NO_METRICS',
    note:'Provide --metrics <json> or --value N. Detector will not invent a baseline.',
    releaseReady:false
  },null,2));
  process.exit(0);
}
const current=opt.value!==undefined?opt.value:values[values.length-1];
const stats=detect(values||[current],current);
const tier=tierFor(stats.sigma);
const action=tier?bands.tiers[tier]?.action||'log':'none';
const result={
  contract:'harness-bands-detect/1',
  metric:bands.metric||'unknown',
  current,
  stats,
  tier,
  action,
  dryRun:opt.dryRun,
  independentlyVerified:false,
  releaseReady:false
};
if(tier && action!=='log' && bands.tiers[tier]?.output==='intent_draft'){
  result.intent=writeIntent({tier,metric:bands.metric||'metric',value:current,stats,bands});
}
console.log(JSON.stringify(result,null,2));
