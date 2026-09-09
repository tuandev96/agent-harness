import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const script=new URL('../../scripts/package-archive.py',import.meta.url).pathname;
function fixture(t){const root=mkdtempSync(join(tmpdir(),'harness-package-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));writeFileSync(join(root,'source.txt'),'hello');const manifest={files:[{path:'source.txt',bytes:5,sha256:createHash('sha256').update('hello').digest('hex')}]};return {root,manifest};}
function run(x){writeFileSync(join(x.root,'manifest.json'),JSON.stringify(x.manifest));return spawnSync('python3',[script,x.root,join(x.root,'manifest.json'),join(x.root,'out.zip')],{encoding:'utf8',timeout:15000});}
test('archive creation verifies bytes and reports no release authority',t=>{const x=fixture(t),r=run(x);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).releaseReady,false);assert.ok(existsSync(join(x.root,'out.zip')));});
test('stale source cannot be packaged as its earlier digest',t=>{const x=fixture(t);writeFileSync(join(x.root,'source.txt'),'changed');const r=run(x);assert.notEqual(r.status,0);assert.equal(existsSync(join(x.root,'out.zip')),false);});
test('traversing archive entry is rejected',t=>{const x=fixture(t);x.manifest.files[0].path='../outside';assert.notEqual(run(x).status,0);});
test('existing destination is never replaced',t=>{const x=fixture(t);writeFileSync(join(x.root,'out.zip'),'preserve');assert.notEqual(run(x).status,0);assert.equal(readFileSync(join(x.root,'out.zip'),'utf8'),'preserve');});
test('duplicate archive entries are rejected',t=>{const x=fixture(t);x.manifest.files.push({...x.manifest.files[0]});assert.notEqual(run(x).status,0);});
