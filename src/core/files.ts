import {createHash,randomUUID} from 'node:crypto';
import {constants,closeSync,existsSync,fstatSync,fsyncSync,lstatSync,mkdirSync,openSync,readFileSync,realpathSync,renameSync,unlinkSync,writeFileSync} from 'node:fs';
import {dirname,isAbsolute,relative,resolve,sep} from 'node:path';
import type {FileRef,Snapshot} from './types.js';
export function canonical(v:unknown):string {
  if(v===null||typeof v==='string'||typeof v==='boolean') return JSON.stringify(v);
  if(typeof v==='number'&&Number.isFinite(v)) return JSON.stringify(v);
  if(Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
  if(v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype) return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';
  throw new Error('NON_JSON_VALUE');
}
export const sha256=(v:string|Buffer):string=>createHash('sha256').update(v).digest('hex');
export const digest=(v:unknown):string=>sha256(canonical(v));
/** Reject symlink components. A same-user concurrent hostile writer still requires an OS sandbox. */
export function safePath(root:string,path:string,missingLeaf=false):string {
  if(!path||isAbsolute(path)||path.includes('\\')||path.includes('\0')||path.split('/').some(p=>!p||p==='.'||p==='..')) throw new Error('UNSAFE_PATH');
  const base=realpathSync(root);let current=base;const parts=path.split('/');
  parts.forEach((p,i)=>{current=resolve(current,p);try{if(lstatSync(current).isSymbolicLink()) throw new Error('SYMLINK_NOT_ALLOWED');}
    catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT'&&missingLeaf&&i===parts.length-1)return;throw e;}});
  const rel=relative(base,current);if(!rel||rel.startsWith('..'+sep)||isAbsolute(rel))throw new Error('PATH_OUTSIDE_ROOT');
  return current;
}
export function fileRef(root:string,path:string,maxBytes=64*1024*1024):FileRef {
  const fd=openSync(safePath(root,path),constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try{const st=fstatSync(fd);if(!st.isFile()||st.size>maxBytes)throw new Error('FILE_TYPE_OR_SIZE');
    const bytes=readFileSync(fd);if(bytes.length>maxBytes)throw new Error('FILE_SIZE_LIMIT');return {path,sha256:sha256(bytes),bytes:bytes.length};}
  finally{closeSync(fd);}
}
export function snapshot(root:string,paths:string[],environment:Record<string,string>={}):Snapshot {
  if(!paths.length||new Set(paths).size!==paths.length)throw new Error('INVALID_INPUT_INVENTORY');
  const files=[...paths].sort().map(p=>fileRef(root,p));
  const env:Record<string,string>={};
  for(const key of ['PATH','HOME','TMPDIR','TEMP','SystemRoot','WINDIR','LANG'])if(process.env[key])env[key]=process.env[key]!;
  Object.assign(env,environment);delete env.NODE_OPTIONS;delete env.NODE_V8_COVERAGE;
  const controlFiles=['types','schema','contract','files','evaluator','recorder','reporter','store','service'];
  const controls=controlFiles.map(name=>({name,sha256:sha256(readFileSync(new URL(`./${name}.js`,import.meta.url)))}));
  const runtime=`node=${process.version};platform=${process.platform};arch=${process.arch};controls=${digest(controls)};environment=${digest(env)}`;
  return {files,runtime,digest:digest({files,runtime})};
}
export function atomicWrite(path:string,value:string|Buffer):void {
  mkdirSync(dirname(path),{recursive:true,mode:0o700});const tmp=`${path}.${randomUUID()}.tmp`;let fd:number|undefined;
  try{fd=openSync(tmp,'wx',0o600);writeFileSync(fd,value);fsyncSync(fd);closeSync(fd);fd=undefined;renameSync(tmp,path);
    if(process.platform!=='win32'){const d=openSync(dirname(path),'r');try{fsyncSync(d);}finally{closeSync(d);}}}
  finally{if(fd!==undefined)closeSync(fd);if(existsSync(tmp))unlinkSync(tmp);}
}
export function redact(text:string,secrets:string[]=[]):string {
  let clean=text;for(const s of secrets.filter(s=>s.length).sort((a,b)=>b.length-a.length))clean=clean.split(s).join('[REDACTED]');
  return clean.replace(/(Bearer\s+)[^\s"']+/gi,'$1[REDACTED]').replace(/((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,"'}]+/gi,'$1[REDACTED]');
}
