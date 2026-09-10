/** Private, offline artifact creation. Does not publish or grant release approval. */
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const args=process.argv.slice(2);
if(!(args.length===1&&args[0]==='--check')&&!(args.length===2&&args[0]==='--out')) {
 console.error('Usage: node scripts/package.mjs --check | --out private-package.zip');process.exit(2);
}
const roots=['src','dist','bin','scripts','adapters','contracts','skills','protocol','templates','hooks','docs','evals','tests','.agent-presets',
 'vendor/dsh-mcp-settings','vendor/dsh-tool-arg-coerce','vendor/dsh-replay-dedup'];
const exclude=new Set(['node_modules','__pycache__','.git','.harness','.harness-checks','sessions','attachments','storages','screenshots']);
const sensitiveName=/^(?:\.env(?:\..*)?|\.credentials.*|settings\.yaml(?:\..*)?|mcp-servers\.json|tokens\.json|guardian-ledger\.jsonl)$/i;
const secretPatterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{30,}\b/,/\bAKIA[0-9A-Z]{16}\b/];
const inventory=[];
function add(path) {
 const stats=lstatSync(path);
 if(stats.isSymbolicLink())throw new Error('SYMLINK_PACKAGE_INPUT: '+relative(root,path));
 if(!stats.isFile())throw new Error('NON_REGULAR_PACKAGE_INPUT');
 if(stats.size>32*1024*1024)throw new Error('PACKAGE_INPUT_TOO_LARGE');
 const rel=relative(root,path).replaceAll('\\','/');
 if(!rel||rel.startsWith('../')||rel.startsWith('/'))throw new Error('UNSAFE_PACKAGE_PATH');
 const bytes=readFileSync(path);
 if(secretPatterns.some(pattern=>pattern.test(bytes.toString('utf8'))))throw new Error('POTENTIAL_SECRET: '+rel);
 inventory.push({path:rel,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
function walk(path) {
 if(!existsSync(path))return;
 if(lstatSync(path).isSymbolicLink())throw new Error('SYMLINK_PACKAGE_ROOT');
 for(const entry of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
  if(exclude.has(entry.name)||/\.(?:pyc|pyo|log|sqlite|sqlite3|db|tgz|zip)(?:-wal|-shm)?$/i.test(entry.name))continue;
  if(sensitiveName.test(entry.name))throw new Error('SENSITIVE_FILE_IN_DISTRIBUTION_SOURCE');
  const child=join(path,entry.name);
  if(entry.isSymbolicLink())throw new Error('SYMLINK_PACKAGE_INPUT: '+relative(root,child));
  if(entry.isDirectory())walk(child);else if(entry.isFile())add(child);
 }
}
for(const name of roots)walk(join(root,name));
for(const name of ['package.json','package-lock.json','tsconfig.json','README.md','CHANGELOG.md','LICENSE'])if(existsSync(join(root,name)))add(join(root,name));
inventory.sort((a,b)=>a.path.localeCompare(b.path));
if(new Set(inventory.map(item=>item.path)).size!==inventory.length)throw new Error('DUPLICATE_PACKAGE_PATH');
for(const name of ['bin/harness.mjs','dist/core/service.js','dist/cli/main.js','skills/requirements-spec/SKILL.md','skills/capture-intent/SKILL.md','skills/plan-mode/SKILL.md','skills/review-policy/SKILL.md','hooks/README.md']) {
 if(!inventory.some(item=>item.path===name))throw new Error('BUILD_OR_SOURCE_MISSING: '+name);
}
const manifest={format:'harness-private-package/1',distribution:'PRIVATE_ONLY',releaseReady:false,
 licenseReview:'REQUIRED_BEFORE_PUBLIC_DISTRIBUTION',buildProvenance:'NOT_ATTESTED_BY_THIS_COMMAND',
 scan:{builtin:'NO_MATCH_ON_CONFIGURED_PATTERNS',independentSecretScan:'NOT_PERFORMED'},files:inventory};
manifest.inventorySha256=createHash('sha256').update(JSON.stringify(inventory)).digest('hex');
if(args[0]==='--check') {
 console.log(JSON.stringify({outcome:'INVENTORY_CHECK_PASS',fileCount:inventory.length,inventorySha256:manifest.inventorySha256,
 distribution:manifest.distribution,releaseReady:false,scan:manifest.scan},null,2));
} else {
 const destination=resolve(root,args[1]);
 if(existsSync(destination))throw new Error('DESTINATION_EXISTS');
 if(!destination.endsWith('.zip'))throw new Error('ZIP_EXTENSION_REQUIRED');
 // Do not traverse an existing symlink in the destination's parent chain.
 let parent=dirname(destination);
 while(parent!==dirname(parent)){if(existsSync(parent)&&lstatSync(parent).isSymbolicLink())throw new Error('SYMLINK_DESTINATION');parent=dirname(parent);}
 mkdirSync(dirname(destination),{recursive:true,mode:0o700});
 const directory=join(root,'.harness-checks','package-'+randomUUID());mkdirSync(directory,{recursive:true,mode:0o700});
 const manifestPath=join(directory,'manifest.json');writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 const result=spawnSync('python3',[join(root,'scripts/package-archive.py'),root,manifestPath,destination],{
  cwd:root,encoding:'utf8',timeout:120000,maxBuffer:1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 if(result.status!==0||result.error)throw new Error('ARCHIVE_CREATION_FAILED: '+(result.stderr??result.error?.message??''));
 console.log(result.stdout.trim());
}
