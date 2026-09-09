import {readdirSync,readFileSync,mkdirSync,writeFileSync,lstatSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=resolve(dir,e.name);if(e.isSymbolicLink())throw Error('SOURCE_SYMLINK');return e.isDirectory()?walk(p):e.isFile()&&p.endsWith('.ts')?[p]:[];});}
const manifest={node:process.version,compiler:'node:module.stripTypeScriptTypes',typechecked:false,files:[]};
if(existsSync(resolve(root,'dist'))&&lstatSync(resolve(root,'dist')).isSymbolicLink())throw Error('DIST_SYMLINK');
for(const file of walk(resolve(root,'src'))){const source=readFileSync(file,'utf8');const output=stripTypeScriptTypes(source);const out=resolve(root,'dist',relative(resolve(root,'src'),file).replace(/\.ts$/,'.js'));
 mkdirSync(dirname(out),{recursive:true});writeFileSync(out,output);manifest.files.push({source:relative(root,file),output:relative(root,out),sourceSha256:hash(source),outputSha256:hash(output)});}
writeFileSync(resolve(root,'dist/build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await import('./export-schemas.mjs');
console.log(`BUILD_OK ${manifest.files.length} modules; typecheck is a separate required check`);
