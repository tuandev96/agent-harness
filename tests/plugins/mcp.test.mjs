import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {apply} from '../../vendor/dsh-mcp-settings/src/index.js';
import {MountManager} from '../../vendor/dsh-mcp-settings/src/mount-manager.js';
import {guardRequest,readLimitedBody,publicServer,mergePrivateFields} from '../../vendor/dsh-mcp-settings/src/security.js';
import {normalizeServer} from '../../vendor/dsh-mcp-settings/src/schema.js';
import {readStoreFile} from '../../vendor/dsh-mcp-settings/src/store.js';

async function fixture(t,{raw,auth}={}) {
 const home=mkdtempSync(join(tmpdir(),'mcp-settings-test-')),old=process.env.DSH_HOME;process.env.DSH_HOME=home;
 if(raw!==undefined)writeFileSync(join(home,'mcp-servers.json'),raw);
 let handler;const disposers=[],logs=[];
 const ctx={loader:{import:async()=>({apply(){}}),entries:()=>[]},get:name=>name==='mcpAdminAuth'?auth:undefined,
  tools:{schemas:()=>[]},logger:{warn:s=>logs.push(s),error:s=>logs.push(s),info:s=>logs.push(s)},
  plugin:()=>({dispose(){}}),effect(fn){const d=fn();if(typeof d==='function')disposers.push(d);return d;},
  webServer:{register(route){handler=route.handler;return ()=>{};}}};
 await apply(ctx);
 const server=createServer((req,res)=>handler(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/dsh-mcp-settings/api';
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));for(const d of disposers.reverse())await d();if(old===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=old;rmSync(home,{recursive:true,force:true});});
 const post=(path,body,headers={})=>fetch(url+path,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
 return {home,origin,url,post,logs};
}
const serverInput=()=>({id:'sample',serverName:'sample',transport:'streamable-http',enabled:false,url:'https://mcp.invalid/?token=TEST-CANARY',headers:{Authorization:'Bearer HEADER-CANARY'}});

test('HTTP list masks credentials, and editing blanks preserves stored values',async t=>{
 const f=await fixture(t);let res=await f.post('/upsert',{server:serverInput()});assert.equal(res.status,200);
 let body=await res.json();assert.ok(!JSON.stringify(body).includes('TEST-CANARY'));assert.ok(!JSON.stringify(body).includes('HEADER-CANARY'));
 assert.equal(body.servers[0].headersConfigured,true);assert.deepEqual(body.servers[0].headers,{});
 res=await f.post('/upsert',{server:{...body.servers[0],label:'Changed label'}});assert.equal(res.status,200);
 const stored=JSON.parse(readFileSync(join(f.home,'mcp-servers.json'),'utf8'));assert.equal(stored.servers[0].headers.Authorization,'Bearer HEADER-CANARY');assert.ok(stored.servers[0].url.includes('TEST-CANARY'));
 if(process.platform!=='win32')assert.equal(statSync(join(f.home,'mcp-servers.json')).mode&0o777,0o600);
 res=await fetch(f.url+'/list');assert.equal(res.headers.get('cache-control'),'no-store');
});
test('explicit clear does not require exposing previously saved secrets',async t=>{
 const f=await fixture(t);await f.post('/upsert',{server:serverInput()});const list=await (await fetch(f.url+'/list')).json();
 const res=await f.post('/upsert',{server:{...list.servers[0],clearSecrets:true}});assert.equal(res.status,200);
 const stored=readStoreFile(join(f.home,'mcp-servers.json'));assert.equal(Object.keys(stored.servers[0].headers).length,0);assert.ok(!stored.servers[0].url.includes('TEST-CANARY'));
});
test('cross-origin administration is rejected before configuration changes',async t=>{const f=await fixture(t);const res=await f.post('/upsert',{server:serverInput()},{origin:'https://untrusted.invalid'});assert.equal(res.status,403);assert.equal((await(await fetch(f.url+'/list')).json()).servers.length,0);});
test('host authorization denial is honored for read and write',async t=>{const f=await fixture(t,{auth:{authorize:()=>false}});assert.equal((await fetch(f.url+'/list')).status,403);assert.equal((await f.post('/upsert',{server:serverInput()})).status,403);});
test('corrupt store is retained verbatim and mutations are blocked',async t=>{const raw='{ malformed-canary',f=await fixture(t,{raw});const list=await(await fetch(f.url+'/list')).json();assert.equal(list.readOnly,true);assert.equal((await f.post('/upsert',{server:serverInput()})).status,409);assert.equal(readFileSync(join(f.home,'mcp-servers.json'),'utf8'),raw);assert.ok(!f.logs.join('').includes('malformed-canary'));});
test('external store change is not overwritten by stale in-memory state',async t=>{const f=await fixture(t);await f.post('/upsert',{server:serverInput()});const external=JSON.stringify({version:1,servers:[]});writeFileSync(join(f.home,'mcp-servers.json'),external);assert.equal((await f.post('/toggle',{id:'sample',enabled:true})).status,409);assert.equal(readFileSync(join(f.home,'mcp-servers.json'),'utf8'),external);});
test('string booleans and oversized bodies are rejected',async t=>{const f=await fixture(t);await f.post('/upsert',{server:serverInput()});assert.equal((await f.post('/toggle',{id:'sample',enabled:'false'})).status,400);assert.equal((await f.post('/upsert',{padding:'x'.repeat(262145)})).status,413);});
test('invalid JSON and content type return safe client errors',async t=>{const f=await fixture(t);const res=await fetch(f.url+'/upsert',{method:'POST',headers:{origin:f.origin,'content-type':'application/json'},body:'{'});assert.equal(res.status,400);assert.equal((await f.post('/upsert',{}, {'content-type':'text/plain'})).status,415);});
test('transport and reconnect limits are validated',()=>{for(const override of [{transport:'ftp'},{enabled:'false'},{toolCallTimeoutMs:-1},{reconnect:{maxAttempts:0.5}},{reconnect:{initialDelayMs:2000,maxDelayMs:1000}}])assert.throws(()=>normalizeServer({...serverInput(),...override}));});
test('loopback peer plus expected host are both required',()=>{const req={method:'GET',headers:{host:'localhost:1234'},socket:{remoteAddress:'127.0.0.1'}};assert.doesNotThrow(()=>guardRequest(req));assert.throws(()=>guardRequest({...req,socket:{remoteAddress:'192.0.2.1'}}));assert.throws(()=>guardRequest({...req,headers:{host:'untrusted.invalid'}}));});
test('chunked oversized input is bounded without trusting content-length',async()=>{const req=Readable.from([Buffer.alloc(100),Buffer.alloc(100)]);req.headers={};await assert.rejects(()=>readLimitedBody(req,150),/too large/);});
test('mount timeout does not leave subsequent work waiting forever',async()=>{const ctx={plugin:()=>new Promise(()=>{}),logger:{warn(){}},tools:{schemas:()=>[]}},manager=new MountManager(ctx,{},15);const server=normalizeServer({...serverInput(),enabled:true});await manager.enqueue(()=>manager.mount(server));assert.equal(manager.status(server).state,'error');let progressed=false;await manager.enqueue(()=>{progressed=true;});assert.equal(progressed,true);await assert.rejects(()=>manager.disposeAll(),/could not/);});
test('late mount result is disposed rather than silently orphaned',async()=>{let release,disposed=0;const ctx={plugin:()=>new Promise(r=>release=r),logger:{warn(){}},tools:{schemas:()=>[]}},manager=new MountManager(ctx,{},15),server=normalizeServer({...serverInput(),enabled:true});await manager.mount(server);release({dispose(){disposed++;}});await new Promise(r=>setTimeout(r,5));assert.equal(disposed,1);await manager.disposeAll();});
test('failed disposal retains an error instead of claiming disabled',async()=>{const ctx={plugin:()=>({dispose(){throw Error('failure')}}),logger:{warn(){}},tools:{schemas:()=>[]}},manager=new MountManager(ctx,{},15),server=normalizeServer({...serverInput(),enabled:true});await manager.mount(server);await assert.rejects(()=>manager.mount({...server,enabled:false}),/disposal failed/);assert.equal(manager.status({...server,enabled:false}).state,'error');await assert.rejects(()=>manager.disposeAll());});
