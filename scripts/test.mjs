/** Repository checks only; exit zero is not a product/release acceptance. */
import {spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, lstatSync, writeFileSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const args=process.argv.slice(2);
const groupIndex=args.indexOf('--suite');
const requested=groupIndex<0?null:args[groupIndex+1];
if(!(args.length===0 || (args.length===2 && args[0]==='--suite' && requested))) {
  console.error('Usage: node scripts/test.mjs [--suite core|plugins|operations|regression|spec|legacy]');
  process.exit(2);
}
function walk(directory) {
  if(!existsSync(directory))return [];
  const result=[];
  for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    if(['node_modules','__pycache__','.git'].includes(entry.name))continue;
    const path=join(directory,entry.name);
    if(entry.isSymbolicLink())throw new Error(`SYMLINK_IN_CHECK_INPUT: ${relative(root,path)}`);
    if(entry.isDirectory())result.push(...walk(path));
    else if(entry.isFile())result.push(path);
  }
  return result;
}
function fingerprint() {
  const paths=['src','tests','scripts','adapters','contracts','.agent-presets','vendor','skills','protocol']
    .flatMap(name=>walk(join(root,name)));
  for(const name of ['package.json','package-lock.json','tsconfig.json'])if(existsSync(join(root,name)))paths.push(join(root,name));
  const inputs=paths.sort().map(path=>({path:relative(root,path).replaceAll('\\','/'),
    sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
  return {inputs,sha256:createHash('sha256').update(JSON.stringify(inputs)).digest('hex')};
}
const suiteNames=['core','plugins','operations','regression'];
if(requested&&!suiteNames.concat(['spec','legacy']).includes(requested))throw new Error('UNKNOWN_SUITE');
const commands=[];
for(const suite of suiteNames) {
  if(requested&&requested!==suite)continue;
  const files=walk(join(root,'tests',suite)).filter(path=>path.endsWith('.test.mjs'));
  if(!files.length)throw new Error(`NO_TEST_FILES: ${suite}`);
  commands.push({name:suite,argv:[process.execPath,'--test','--test-reporter=tap',...files]});
}
if(!requested||requested==='spec')commands.push(
  {name:'spec-regression',argv:['python3','-B','-m','unittest','discover','-s','tests/spec-authoring','-p','test_*.py','-v']},
  {name:'spec-original',argv:['sh','skills/requirements-spec/tests/run.sh']});
if(!requested||requested==='legacy')for(const [name,path] of [
  ['coerce-original','vendor/dsh-tool-arg-coerce/tests/coerce.test.mjs'],
  ['mcp-normalize-original','vendor/dsh-mcp-settings/tests/normalize.test.mjs'],
  ['router-source-selftest','.agent-presets/router-standard/router-bootstrap-v34.selftest.mjs'],
])commands.push({name,argv:[process.execPath,path]});

const runId=new Date().toISOString().replaceAll(':','-')+'-'+randomUUID();
const directory=join(root,'.harness-checks',runId);
mkdirSync(directory,{recursive:true,mode:0o700});
const before=fingerprint();
const report={kind:'REPOSITORY_CHECK_RUN',runId,startedAt:new Date().toISOString(),
  rootRevision:null,inputDigest:before.sha256,node:process.version,platform:process.platform,
  independentReview:'NOT_PERFORMED',productAcceptance:false,releaseReady:false,commands:[]};
const git=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:10000});
if(git.status===0)report.rootRevision=git.stdout.trim();
let failed=false;
for(const command of commands) {
  console.log(`\n=== ${command.name} ===`);
  const start=Date.now();
  const result=spawnSync(command.argv[0],command.argv.slice(1),{
    cwd:root,encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024,
    env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},windowsHide:true,
  });
  const stdout=result.stdout??'',stderr=result.stderr??'';
  const log=stdout+'\n'+stderr;
  const logfile=join(directory,command.name+'.log');
  writeFileSync(logfile,log,{mode:0o600,flag:'wx'});
  // Raw logs remain local and are excluded from package archives. Never print credentials.
  const ok=result.status===0&&!result.error&&!result.signal;
  const row={name:command.name,argv:command.argv,exitCode:result.status,signal:result.signal??null,
    outcome:ok?'PASS':result.error?.code==='ETIMEDOUT'?'TIMED_OUT':'FAIL',
    durationMs:Date.now()-start,log:relative(root,logfile).replaceAll('\\','/'),
    logSha256:createHash('sha256').update(log).digest('hex')};
  report.commands.push(row);if(!ok)failed=true;
  console.log(`${row.outcome}: ${row.name}, exit=${row.exitCode}, duration=${row.durationMs}ms`);
}
const after=fingerprint();
report.finishedAt=new Date().toISOString();
report.inputsUnchanged=after.sha256===before.sha256;
if(!report.inputsUnchanged)failed=true;
report.outcome=failed?'FAIL':'PASS';
writeFileSync(join(directory,'inputs.json'),JSON.stringify(before,null,2)+'\n',{mode:0o600,flag:'wx'});
writeFileSync(join(directory,'summary.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(`\n${report.outcome}: ${relative(root,join(directory,'summary.json'))}`);
console.log('This report describes checker execution, not independent review or release readiness.');
process.exitCode=failed?1:0;
